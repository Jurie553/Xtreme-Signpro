import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  collection 
} from 'firebase/firestore';
import { createServer as createViteServer } from 'vite';

// Load environment variables in local dev
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Set up Firebase Admin
let firebaseConfig: any = {};
try {
  const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }
} catch (e) {
  console.warn("Firebase config file load warning:", e);
}

firebaseConfig = {
  ...firebaseConfig,
  apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || '',
  appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || '',
  firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || undefined,
};

if (!firebaseConfig.projectId) {
  console.warn('Firebase server config is missing. Zoho sync endpoints need VITE_FIREBASE_* environment variables.');
}

const appInstance = initializeApp(firebaseConfig);

const firestoreInstance = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(appInstance, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(appInstance, { experimentalForceLongPolling: true });

// Custom lightweight compatibility layer to keep same database API structure
const db = {
  collection(collectionName: string) {
    return {
      async get() {
        const querySnapshot = await getDocs(collection(firestoreInstance, collectionName));
        return {
          docs: querySnapshot.docs.map(d => ({
            id: d.id,
            exists: d.exists(),
            data: () => d.data()
          }))
        };
      },
      async add(data: any) {
        const docRef = await addDoc(collection(firestoreInstance, collectionName), data);
        return { id: docRef.id };
      },
      doc(docPath: string) {
        const docRef = doc(firestoreInstance, collectionName, docPath);
        return {
          async get() {
            const docSnap = await getDoc(docRef);
            return {
              exists: docSnap.exists(),
              data: () => docSnap.data()
            };
          },
          async set(data: any, options: { merge?: boolean } = {}) {
            await setDoc(docRef, data, options);
          },
          async update(data: any) {
            await updateDoc(docRef, data);
          }
        };
      }
    };
  }
};

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Zoho Configuration Helper ---
const REGIONS: Record<string, { accountsDomain: string, booksDomain: string }> = {
  us: { accountsDomain: 'accounts.zoho.com', booksDomain: 'www.zohoapis.com/books/v3' },
  eu: { accountsDomain: 'accounts.zoho.eu', booksDomain: 'www.zohoapis.eu/books/v3' },
  in: { accountsDomain: 'accounts.zoho.in', booksDomain: 'www.zohoapis.in/books/v3' },
  au: { accountsDomain: 'accounts.zoho.com.au', booksDomain: 'www.zohoapis.com.au/books/v3' },
  jp: { accountsDomain: 'accounts.zoho.co.jp', booksDomain: 'www.zohoapis.co.jp/books/v3' },
};

const getZohoConfig = async () => {
  let dbConfig: any = {};
  try {
    const docSnap = await db.collection('settings').doc('zoho').get();
    if (docSnap.exists) {
      dbConfig = docSnap.data();
    }
  } catch (e) {
    console.error("Failed to read settings/zoho from database:", e);
  }

  const region = dbConfig.region || 'us';
  const domainInfo = REGIONS[region] || REGIONS.us;

  return {
    clientId: process.env.ZOHO_CLIENT_ID || dbConfig.clientId || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || dbConfig.clientSecret || '',
    organizationId: process.env.ZOHO_ORGANIZATION_ID || dbConfig.organizationId || '',
    accountsDomain: process.env.ZOHO_ACCOUNTS_URL?.replace(/^https?:\/\//, '') || process.env.ZOHO_ACCOUNTS_DOMAIN || domainInfo.accountsDomain,
    booksApiDomain: process.env.ZOHO_BOOKS_API_URL?.replace(/^https?:\/\//, '') || process.env.ZOHO_BOOKS_API_DOMAIN || domainInfo.booksDomain,
    region
  };
};

// --- Secure Token Storage Helper ---
interface ZohoTokens {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
}

const getZohoTokens = async (): Promise<ZohoTokens | null> => {
  try {
    const docSnap = await db.collection('zoho_private').doc('state').get();
    if (docSnap.exists) {
      return docSnap.data() as ZohoTokens;
    }
  } catch (e) {
    console.error("Failed to read secure Zoho tokens from database:", e);
  }
  return null;
};

const saveZohoTokens = async (tokens: Partial<ZohoTokens>) => {
  try {
    const existing = await getZohoTokens() || { accessToken: '', accessTokenExpiresAt: 0 };
    const updated = {
      accessToken: tokens.accessToken || existing.accessToken,
      refreshToken: tokens.refreshToken || existing.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt || existing.accessTokenExpiresAt,
    };
    await db.collection('zoho_private').doc('state').set(updated, { merge: true });
    
    // sync public connection status
    await db.collection('settings').doc('zoho').set({
      connected: !!updated.refreshToken,
    }, { merge: true });
  } catch (e) {
    console.error("Failed to save secure Zoho tokens to DB:", e);
  }
};

const addSyncLog = async (recordName: string, syncAction: string, success: boolean, errorMessage: string = '', recordType: string = 'Client') => {
  try {
    await db.collection('zoho_sync_logs').add({
      date: Date.now(),
      recordType,
      recordName,
      syncAction,
      success,
      errorMessage: errorMessage || ''
    });
  } catch (e) {
    console.error("Failed to append sync log:", e);
  }
};

// --- Check and Refresh Token Handler ---
const ensureValidAccessToken = async (): Promise<string> => {
  const tokens = await getZohoTokens();
  if (!tokens || !tokens.refreshToken) {
    throw new Error("No refresh token is available in connection state. Please authenticate with Zoho Books.");
  }

  // Refresh if expired or expiring in less than 60 seconds
  const isExpired = Date.now() + 60 * 1000 > tokens.accessTokenExpiresAt;
  if (!isExpired) {
    return tokens.accessToken;
  }

  console.log("Zoho access token expired/expiring. Refreshing token...");
  const config = await getZohoConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Zoho Client ID or Client Secret is not configured in environment or settings layout.");
  }

  const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
  const bodyParams = new URLSearchParams();
  bodyParams.append('refresh_token', tokens.refreshToken.trim());
  bodyParams.append('client_id', config.clientId.trim());
  bodyParams.append('client_secret', config.clientSecret.trim());
  bodyParams.append('grant_type', 'refresh_token');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error("Expected JSON but received HTML/text. This usually means the API route is wrong, missing, or redirecting. First 200 characters: " + text.slice(0, 200));
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Refresh token failed: ${data.error_description || data.error}`);
  }

  const expiresAt = Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000;
  await saveZohoTokens({
    accessToken: data.access_token,
    accessTokenExpiresAt: expiresAt,
  });

  return data.access_token;
};

// --- Base Zoho Books Request Wrapper ---
const makeZohoBooksRequest = async (path: string, options: any = {}) => {
  const config = await getZohoConfig();
  const token = await ensureValidAccessToken();

  let finalUrl = `https://${config.booksApiDomain}${path}`;
  const trimmedOrgId = config.organizationId ? String(config.organizationId).trim() : '';
  if (trimmedOrgId && !path.includes('/organizations')) {
    const separator = path.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}organization_id=${trimmedOrgId}`;
  }

  const headers: Record<string, string> = {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (trimmedOrgId) {
    headers['X-com-zoho-books-organizationid'] = trimmedOrgId;
  }

  const response = await fetch(finalUrl, {
    ...options,
    headers
  });

  // Verify response type
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error("Expected JSON but received HTML/text. This usually means the API route is wrong, missing, or redirecting. First 200 characters: " + text.slice(0, 200));
  }

  const data = await response.json();
  
  // Zoho's code === 0 indicates success. For organizations endpoint, check response status
  if (!response.ok || (data.code !== undefined && data.code !== 0)) {
    throw new Error(data.message || `Zoho Books API error status code: ${data.code || response.status}`);
  }

  return data;
};

// --- Helper to build absolute Redirect URI ---
const getRedirectUri = (req: express.Request) => {
  if (process.env.ZOHO_REDIRECT_URI) {
    return process.env.ZOHO_REDIRECT_URI;
  }
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/api/zoho/callback`;
  }
  const host = req.get('host');
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/api/zoho/callback`;
};

// ==========================================
// ========== 2. API Routes =================
// ==========================================

// Auth URL Route
app.get('/api/zoho/auth-url', async (req, res) => {
  try {
    const config = await getZohoConfig();
    if (!config.clientId) {
      return res.status(200).json({
        success: false,
        error: "Zoho Client ID is missing. Please configure it in the dashboard settings grid."
      });
    }

    const redirectUri = getRedirectUri(req);
    const scopes = [
      'ZohoBooks.fullaccess.all',
      'ZohoBooks.fullaccess.ALL',
      'ZohoBooks.organizations.READ'
    ].join(' ');

    const authUrl = `https://${config.accountsDomain}/oauth/v2/auth?` +
      `scope=${encodeURIComponent(scopes)}` +
      `&client_id=${config.clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return res.json({ success: true, url: authUrl });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: "Could not create Zoho authorization Link.",
      details: err.message
    });
  }
});

// Callback Route (exchanges code for refresh/access tokens and displays HTML success/error screen with postMessage)
app.get('/api/zoho/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error("Zoho auth callback error query:", error);
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #fef2f2;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 1px solid #fee2e2;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      color: #dc2626;
    }
    p {
      font-size: 14px;
      color: #475569;
      margin: 0 0 18px 0;
      line-height: 1.6;
    }
    .error-box {
      background: #fdf2f2;
      border: 1px solid #fde2e2;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-family: monospace;
      font-size: 11px;
      color: #b91c1c;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      background: #64748b;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(100, 116, 139, 0.15);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <h1>Authorization Failed</h1>
    <p>An error occurred working with Zoho Books Identity Services:</p>
    <div class="error-box">
      ${String(error)}
    </div>
    <button onclick="closeOrRedirect()" class="btn">Close This Tab</button>
  </div>

  <script>
    function closeOrRedirect() {
      try {
        window.close();
      } catch (e) {
        window.location.href = '/settings?tab=zoho';
      }
    }
    
    // Send error notice to parent/opener tab
    if (window.opener) {
      window.opener.postMessage({ type: 'ZOHO_AUTH_ERROR', error: ${JSON.stringify(error)} }, '*');
    }
  </script>
</body>
</html>
    `);
  }

  if (!code) {
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #fef2f2;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 1px solid #fee2e2;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      color: #dc2626;
    }
    p {
      font-size: 14px;
      color: #475569;
      margin: 0 0 18px 0;
      line-height: 1.6;
    }
    .error-box {
      background: #fdf2f2;
      border: 1px solid #fde2e2;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-family: monospace;
      font-size: 11px;
      color: #b91c1c;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      background: #64748b;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(100, 116, 139, 0.15);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <h1>Authorization Failed</h1>
    <p>An error occurred working with Zoho Books:</p>
    <div class="error-box">
      No authorization code parameter received from callback.
    </div>
    <button onclick="closeOrRedirect()" class="btn">Close This Tab</button>
  </div>

  <script>
    function closeOrRedirect() {
      try {
        window.close();
      } catch (e) {
        window.location.href = '/settings?tab=zoho';
      }
    }
    
    if (window.opener) {
      window.opener.postMessage({ type: 'ZOHO_AUTH_ERROR', error: 'No authorization code parameter in request' }, '*');
    }
  </script>
</body>
</html>
    `);
  }

  try {
    const config = await getZohoConfig();
    const redirectUri = getRedirectUri(req);

    if (!config.clientId || !config.clientSecret) {
      throw new Error("Zoho Client ID or Client Secret is missing in connection settings.");
    }

    const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
    const bodyParams = new URLSearchParams();
    bodyParams.append('code', String(code));
    bodyParams.append('client_id', config.clientId.trim());
    bodyParams.append('client_secret', config.clientSecret.trim());
    bodyParams.append('redirect_uri', redirectUri);
    bodyParams.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error("Expected JSON but received HTML/text. First 200 characters: " + text.slice(0, 200));
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Token exchange crash: ${data.error_description || data.error}`);
    }

    const expiresAt = Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000;
    await saveZohoTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Consent prompt gives refresh token upon initial handshake
      accessTokenExpiresAt: expiresAt,
    });

    await addSyncLog('System Handshake', 'Test Connection', true, 'Handshake succeeded. Tokens exchanged and cataloged.');

    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Zoho Books Authorized</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #10b981;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 1px solid #d1fae5;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      color: #059669;
    }
    p {
      font-size: 14px;
      color: #475569;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #4338ca;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    </div>
    <h1>Successfully Connected!</h1>
    <p>SignPro ERP has safely authenticated with Zoho Books. This popup can now be closed to continue in your active workspace dashboard.</p>
    <button onclick="closeOrRedirect()" class="btn">Close This Tab</button>
  </div>

  <script>
    function closeOrRedirect() {
      try {
        window.close();
      } catch (e) {
        window.location.href = '/settings?tab=zoho';
      }
    }
    
    // Send success notice to parent/opener tab
    if (window.opener) {
      window.opener.postMessage({ type: 'ZOHO_AUTH_SUCCESS' }, '*');
      setTimeout(function() {
        try { window.close(); } catch(e) {}
      }, 1000);
    }
  </script>
</body>
</html>
    `);
  } catch (err: any) {
    console.error("Zoho code callback redirect exchange failure:", err);
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #fef2f2;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 1px solid #fee2e2;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      color: #dc2626;
    }
    p {
      font-size: 14px;
      color: #475569;
      margin: 0 0 18px 0;
      line-height: 1.6;
    }
    .error-box {
      background: #fdf2f2;
      border: 1px solid #fde2e2;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-family: monospace;
      font-size: 11px;
      color: #b91c1c;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      background: #64748b;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(100, 116, 139, 0.15);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <h1>Authorization Failed</h1>
    <p>An error occurred working with Zoho Books:</p>
    <div class="error-box">
      ${err.message}
    </div>
    <button onclick="closeOrRedirect()" class="btn">Close This Tab</button>
  </div>

  <script>
    function closeOrRedirect() {
      try {
        window.close();
      } catch (e) {
        window.location.href = '/settings?tab=zoho';
      }
    }
    
    // Send error notice to parent/opener tab
    if (window.opener) {
      window.opener.postMessage({ type: 'ZOHO_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
    }
  </script>
</body>
</html>
    `);
  }
});

// Check Meta Token Status
app.get('/api/zoho/token', async (req, res) => {
  try {
    const tokens = await getZohoTokens();
    const isExpired = tokens ? Date.now() > tokens.accessTokenExpiresAt : true;
    return res.json({
      success: true,
      hasRefreshToken: !!tokens?.refreshToken,
      hasAccessToken: !!tokens?.accessToken,
      accessTokenExpiresAt: tokens?.accessTokenExpiresAt || 0,
      isExpired
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: "Could not read Zoho token details.",
      details: err.message
    });
  }
});

// Refresh Token Route manually
app.post('/api/zoho/refresh-token', async (req, res) => {
  try {
    const token = await ensureValidAccessToken();
    return res.json({
      success: true,
      message: "Access token refreshed successfully."
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: "Failed to process token refresh: " + err.message,
      details: err.stack
    });
  }
});

// Test Connection Diagnostic (checks organization valid)
app.get('/api/zoho/test-connection', async (req, res) => {
  try {
    const config = await getZohoConfig();
    const tokens = await getZohoTokens();

    if (!tokens || !tokens.refreshToken) {
      return res.json({
        success: false,
        error: "Sync Connection failed: Real Refresh Token is missing. Please initiate the Zoho connection OAuth.",
        details: "No refresh token exists."
      });
    }

    let accessToken;
    try {
      accessToken = await ensureValidAccessToken();
    } catch (refreshErr: any) {
      return res.json({
        success: false,
        error: "Failed to establish a valid access token session: " + refreshErr.message,
        details: "Token refresh failed."
      });
    }

    // Attempt Zoho API call to organizations
    const url = `https://${config.booksApiDomain}/organizations`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return res.json({
        success: false,
        error: "Expected JSON from Zoho Organizations endpoint but received HTML. This usually means domains/settings are misconfigured.",
        details: text.slice(0, 200)
      });
    }

    const data = await response.json();
    if (!response.ok || (data.code !== undefined && data.code !== 0)) {
      return res.json({
        success: false,
        error: data.message || `Zoho Org HTTP Error: ${response.status}`,
        details: JSON.stringify(data)
      });
    }

    const orgs = data.organizations || [];
    const matchedOrg = config.organizationId 
      ? orgs.find((o: any) => String(o.organization_id) === String(config.organizationId).trim())
      : orgs[0];

    if (!matchedOrg) {
      return res.json({
        success: true,
        orgNotFound: true,
        error: "Zoho connected, but no valid organization was found. Please select your Zoho Books organization.",
        organizations: orgs.map((o: any) => ({ organization_id: o.organization_id, name: o.name }))
      });
    }

    await addSyncLog('System Diagnostics', 'Test Connection', true, `Diagnostics verified organ: ${matchedOrg.name}`);

    return res.json({
      success: true,
      message: "Zoho Books connected successfully",
      organization: {
        organization_id: matchedOrg.organization_id,
        name: matchedOrg.name
      }
    });
  } catch (err: any) {
    return res.json({
      success: false,
      error: "Diagnostics Error: " + err.message,
      details: err.stack
    });
  }
});

// Fetch Organizations List
app.get('/api/zoho/organizations', async (req, res) => {
  try {
    const data = await makeZohoBooksRequest('/organizations');
    return res.json({
      success: true,
      organizations: data.organizations || []
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: "Failed to retrieve organizations list: " + err.message,
      details: err.stack
    });
  }
});

// Sync Clients Bi-directionally
app.post('/api/zoho/sync-clients', async (req, res) => {
  let pushedCount = 0;
  let pulledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    const zohoData = await makeZohoBooksRequest('/contacts');
    const zohoContacts = zohoData.contacts || [];

    const clientsSnap = await db.collection('clients').get();
    const dbClients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const erpEmailsSet = new Set(dbClients.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean));
    const erpNamesSet = new Set(dbClients.map(c => (c.companyName || c.name || '').trim().toLowerCase()).filter(Boolean));

    // Pull from Zoho
    for (const contact of zohoContacts) {
      const contactEmail = (contact.email || '').trim().toLowerCase();
      const contactName = (contact.company_name || contact.contact_name || '').trim().toLowerCase();

      const matchEmail = contactEmail && erpEmailsSet.has(contactEmail);
      const matchName = contactName && erpNamesSet.has(contactName);

      if (!matchEmail && !matchName) {
        const nameToUse = contact.company_name || contact.contact_name || 'Imported Client';
        const billing = contact.billing_address || {};
        const billingStr = billing.address || billing.city ? `${billing.address || ''}, ${billing.city || ''}, ${billing.state || ''}` : '';

        const newClientData = {
          name: contact.contact_name || nameToUse,
          email: contact.email || `${contact.customer_id}@zoho-import.com`,
          phone: contact.phone || '',
          companyName: contact.company_name || '',
          address: billingStr || '',
          createdAt: Date.now(),
          activeStatus: true,
          notes: 'Imported from Zoho Books Sync',
        };

        await db.collection('clients').add(newClientData);
        pulledCount++;
        await addSyncLog(contact.contact_name || nameToUse, 'Pull', true, 'Synchronized and pulled customer directory from Zoho Books to local client database', 'Client');
      } else {
        skippedCount++;
      }
    }

    // Push local to Zoho
    const zohoEmailsSet = new Set(zohoContacts.map((c: any) => (c.email || '').trim().toLowerCase()).filter(Boolean));
    const zohoNamesSet = new Set(zohoContacts.map((c: any) => (c.company_name || c.contact_name || '').trim().toLowerCase()).filter(Boolean));

    for (const client of dbClients) {
      const clientEmail = (client.email || '').trim().toLowerCase();
      const clientName = (client.companyName || client.name || '').trim().toLowerCase();

      const matchedInZoho = zohoEmailsSet.has(clientEmail) || zohoNamesSet.has(clientName);
      if (!matchedInZoho) {
        try {
          const names = (client.name || 'Client').split(' ');
          const firstName = names[0] || 'Client';
          const lastName = names.slice(1).join(' ') || 'ERP';

          const payload = {
            contact_name: client.companyName || client.name,
            company_name: client.companyName || '',
            contact_persons: [
              {
                first_name: firstName,
                last_name: lastName,
                email: client.email || '',
                phone: client.phone || ''
              }
            ]
          };

          await makeZohoBooksRequest('/contacts', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          pushedCount++;
          await addSyncLog(client.name, 'Push', true, 'Pushed and mapped local client record as Zoho Books Customer Contact', 'Client');
        } catch (itemErr: any) {
          failedCount++;
          console.error(`Failed pushing client ${client.name}`, itemErr);
          await addSyncLog(client.name, 'Push', false, `Failed mapping client parameters: ${itemErr.message}`, 'Client');
        }
      }
    }

    // Save success timestamp
    await db.collection('settings').doc('zoho').set({
      lastSyncClients: Date.now()
    }, { merge: true });

    return res.json({
      success: true,
      pushed: pushedCount,
      pulled: pulledCount,
      skipped: skippedCount,
      failed: failedCount,
      message: `Clients sync complete. Pulled ${pulledCount}, Pushed ${pushedCount}.`
    });
  } catch (err: any) {
    console.error('[Sync Clients Route Error]:', err);
    await addSyncLog('Bulk Clients Sync', 'Sync', false, err.message, 'Client');
    return res.status(200).json({
      success: false,
      error: "Clients sync failed: " + err.message,
      details: err.stack
    });
  }
});

// Push Quote (Estimate) to Zoho
app.post('/api/zoho/push-quote', async (req, res) => {
  const { quoteId } = req.body;
  if (!quoteId) {
    return res.status(200).json({ success: false, error: "Missing required parameter: quoteId" });
  }

  try {
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    if (!quoteDoc.exists) {
      return res.status(200).json({ success: false, error: "Quote record was not found in SignPro ERP." });
    }
    const quote = quoteDoc.data() as any;

    const clientDoc = await db.collection('clients').doc(quote.clientId).get();
    if (!clientDoc.exists) {
      return res.status(200).json({ success: false, error: "Client attached to quote was not found." });
    }
    const client = clientDoc.data() as any;

    const zohoContactsData = await makeZohoBooksRequest('/contacts');
    const zohoContacts = zohoContactsData.contacts || [];

    let zohoContact = zohoContacts.find((c: any) => 
      (client.email && (c.email || '').trim().toLowerCase() === client.email.trim().toLowerCase()) ||
      (c.company_name || '').trim().toLowerCase() === (client.companyName || client.name).trim().toLowerCase()
    );

    let zohoContactId = zohoContact?.contact_id;

    if (!zohoContactId) {
      const names = (client.name || 'Client').split(' ');
      const fName = names[0] || 'Client';
      const lName = names.slice(1).join(' ') || 'ERP';

      const cPayload = {
        contact_name: client.companyName || client.name,
        company_name: client.companyName || '',
        contact_persons: [{ first_name: fName, last_name: lName, email: client.email || '', phone: client.phone || '' }]
      };

      const resContact = await makeZohoBooksRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(cPayload)
      });
      zohoContactId = resContact.contact?.contact_id;
      await addSyncLog(client.name, 'Push', true, 'On-the-fly created Zoho Books contact while preparing estimate', 'Client');
    }

    if (!zohoContactId) throw new Error('Could not associate client with a valid Zoho Books Customer Contact ID.');

    const lineItems = (quote.items || []).map((item: any) => ({
      name: item.productName || item.description || 'Custom print job',
      rate: item.unitCost || item.totalPrice / (item.quantity || 1),
      quantity: item.quantity || 1,
      description: item.description || 'Corporate print design and delivery spec'
    }));

    const estimatePayload = {
      customer_id: zohoContactId,
      estimate_number: `EST-${quote.quoteNumber}`,
      reference_number: quoteId,
      line_items: lineItems,
      notes: quote.notes || 'Generated securely from SignPro ERP.'
    };

    const resEstimate = await makeZohoBooksRequest('/estimates', {
      method: 'POST',
      body: JSON.stringify(estimatePayload)
    });

    const zohoEstId = resEstimate.estimate?.estimate_id;

    // Save Sync Data to Db
    await db.collection('quotes').doc(quoteId).set({
      zohoEstimateId: zohoEstId,
      zohoSynced: true,
      zohoSyncDate: Date.now()
    }, { merge: true });

    await addSyncLog(quote.quoteNumber, 'Push', true, `Pushed Quote: Mapped as Estimate ${zohoEstId}`, 'Quote');

    return res.json({
      success: true,
      message: `Success! Quote ${quote.quoteNumber} transferred as Estimate: ${resEstimate.estimate?.estimate_number}`,
      estimateId: zohoEstId
    });
  } catch (err: any) {
    console.error('[Push Quote Route Error]:', err);
    await addSyncLog(req.body.quoteNumber || 'Quote', 'Push', false, `Quote Transfer anomaly: ${err.message}`, 'Quote');
    return res.status(200).json({
      success: false,
      error: "Quote export failed: " + err.message,
      details: err.stack
    });
  }
});

// Push Job (Invoice) to Zoho
app.post('/api/zoho/push-invoice', async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    return res.status(200).json({ success: false, error: "Missing required parameter: jobId" });
  }

  try {
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(200).json({ success: false, error: "Job record card was not found in SignPro ERP." });
    }
    const job = jobDoc.data() as any;

    const clientDoc = await db.collection('clients').doc(job.clientId).get();
    if (!clientDoc.exists) {
      return res.status(200).json({ success: false, error: "No client profile linked with this job card." });
    }
    const client = clientDoc.data() as any;

    const zohoContactsData = await makeZohoBooksRequest('/contacts');
    const zohoContacts = zohoContactsData.contacts || [];

    let zohoContact = zohoContacts.find((c: any) => 
      (client.email && (c.email || '').trim().toLowerCase() === client.email.trim().toLowerCase()) ||
      (c.company_name || '').trim().toLowerCase() === (client.companyName || client.name).trim().toLowerCase()
    );

    let zohoContactId = zohoContact?.contact_id;

    if (!zohoContactId) {
      const names = (client.name || 'Client').split(' ');
      const fName = names[0] || 'Client';
      const lName = names.slice(1).join(' ') || 'ERP';

      const cPayload = {
        contact_name: client.companyName || client.name,
        company_name: client.companyName || '',
        contact_persons: [{ first_name: fName, last_name: lName, email: client.email || '', phone: client.phone || '' }]
      };

      const resContact = await makeZohoBooksRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(cPayload)
      });
      zohoContactId = resContact.contact?.contact_id;
      await addSyncLog(client.name, 'Push', true, 'On-the-fly created Zoho contact while preparing invoice context', 'Client');
    }

    if (!zohoContactId) throw new Error('Could not associate client with any Zoho customer ID.');

    let lineItems: any[] = [];
    if (job.items && job.items.length > 0) {
      lineItems = job.items.map((item: any) => ({
        name: item.productName || item.description || job.productName,
        rate: item.unitCost || item.totalPrice / (item.quantity || 1),
        quantity: item.quantity || 1,
        description: item.description || `Job Production Specifications -- ${job.jobNumber}`
      }));
    } else {
      lineItems = [{
        name: job.productName || 'Signature Corporate Production',
        rate: job.total || 0,
        quantity: 1,
        description: `Custom Signage / Print Order Card -- ${job.jobNumber}`
      }];
    }

    const invoicePayload = {
      customer_id: zohoContactId,
      invoice_number: `INV-${String(job.jobNumber).replace(/[^A-Za-z0-9]/g, '')}`,
      reference_number: jobId,
      line_items: lineItems,
      notes: job.notes || 'Converted seamlessly from completed ERP job cards.'
    };

    const resInvoice = await makeZohoBooksRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoicePayload)
    });

    const zohoInvoiceId = resInvoice.invoice?.invoice_id;
    const invoiceNumber = resInvoice.invoice?.invoice_number;

    await db.collection('jobs').doc(jobId).set({
      zohoInvoiceId,
      zohoInvoiceNumber: invoiceNumber,
      zohoSynced: true,
      zohoSyncDate: Date.now()
    }, { merge: true });

    await addSyncLog(job.jobNumber, 'Push', true, `Generated Zoho Books Invoice ${invoiceNumber} from completed Job Card`, 'Invoice');

    return res.json({
      success: true,
      message: `Invoice active in Zoho! Invoice ID: ${invoiceNumber}`,
      invoiceId: zohoInvoiceId,
      invoiceNumber
    });
  } catch (err: any) {
    console.error('[Push Invoice Route Error]:', err);
    await addSyncLog(req.body.jobNumber || 'Invoice', 'Push', false, `Invoice Transfer failed: ${err.message}`, 'Invoice');
    return res.status(200).json({
      success: false,
      error: "Invoice export failed: " + err.message,
      details: err.stack
    });
  }
});

// Sync Catalog Products manually
app.post('/api/zoho/sync-products', async (req, res) => {
  let pushedCount = 0;
  let mappedCount = 0;
  let errorCount = 0;

  try {
    const zohoItemsData = await makeZohoBooksRequest('/items');
    const zohoItems = zohoItemsData.items || [];
    const zohoItemNamesSet = new Set(zohoItems.map((i: any) => i.name.trim().toLowerCase()));

    const productsSnap = await db.collection('products').get();
    const dbProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    for (const p of dbProducts) {
      const prodName = (p.name || '').trim().toLowerCase();
      
      if (!zohoItemNamesSet.has(prodName)) {
        try {
          const payload = {
            name: p.name,
            rate: p.markupPercent ? 100 * (1 + p.markupPercent / 100) : 100.0,
            description: p.description || `${p.category || 'ERP'} Product - costed via ${p.costingMethod}`,
            product_type: 'goods',
          };

          await makeZohoBooksRequest('/items', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          pushedCount++;
          await addSyncLog(p.name, 'Push', true, 'Exported catalog product to Zoho Books inventory items', 'Product');
        } catch (iErr: any) {
          errorCount++;
          console.error(`Error exporting product ${p.name}:`, iErr);
          await addSyncLog(p.name, 'Push', false, `Catalog sync anomaly: ${iErr.message}`, 'Product');
        }
      } else {
        mappedCount++;
      }
    }

    await db.collection('settings').doc('zoho').set({
      lastSyncProducts: Date.now()
    }, { merge: true });

    return res.json({
      success: true,
      pushed: pushedCount,
      mapped: mappedCount,
      failed: errorCount,
      message: `Products sync complete. Pushed ${pushedCount}, Matched ${mappedCount}.`
    });
  } catch (err: any) {
    console.error('[Sync Products Route Error]:', err);
    await addSyncLog('Bulk Products Sync', 'Sync', false, err.message, 'Product');
    return res.status(200).json({
      success: false,
      error: "Products sync failed: " + err.message,
      details: err.stack
    });
  }
});

// Reconcile / pull payment statuses from Zoho
app.post('/api/zoho/pull-payments', async (req, res) => {
  let updatedCount = 0;
  let checkedCount = 0;

  try {
    const jobsSnap = await db.collection('jobs').get();
    const syncedJobs = jobsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(j => j.zohoInvoiceId);

    for (const job of syncedJobs) {
      checkedCount++;
      try {
        const zohoInvData = await makeZohoBooksRequest(`/invoices/${job.zohoInvoiceId}`);
        const invoiceStatus = zohoInvData.invoice?.status;

        let updatedFields: any = {};
        if (invoiceStatus === 'paid') {
          updatedFields = { paymentStatus: 'Paid', status: 'Completed' };
        } else if (invoiceStatus === 'partially_paid') {
          updatedFields = { paymentStatus: 'Partially Paid' };
        } else if (invoiceStatus === 'void') {
          updatedFields = { paymentStatus: 'Void', stage: 'Cancelled' };
        } else {
          updatedFields = { paymentStatus: 'Unpaid' };
        }

        if (job.stage !== updatedFields.stage || job.paymentStatus !== updatedFields.paymentStatus) {
          await db.collection('jobs').doc(job.id).update(updatedFields);
          updatedCount++;
          await addSyncLog(job.jobNumber, 'Pull', true, `Updated status to ${updatedFields.paymentStatus} via automatic Zoho reconcile`, 'Payment');
        }
      } catch (jobErr: any) {
        console.error(`Error reconciling Job Invoice ${job.jobNumber}:`, jobErr);
      }
    }

    await db.collection('settings').doc('zoho').set({
      lastSyncPayments: Date.now()
    }, { merge: true });

    return res.json({
      success: true,
      checked: checkedCount,
      updated: updatedCount,
      message: `Payment reconcile complete. Checked ${checkedCount}, updated ${updatedCount} records.`
    });
  } catch (err: any) {
    console.error('[Pull Payments Route Error]:', err);
    await addSyncLog('Bulk Payments Pull', 'Pull', false, err.message, 'Payment');
    return res.status(200).json({
      success: false,
      error: "Payments sync failed: " + err.message,
      details: err.stack
    });
  }
});

// General catch-all Zoho Request proxy to capture regional fallback requests securely
app.all('/api/zoho-books/:region/*', async (req, res) => {
  try {
    const { region } = req.params;
    const originalPathPath = req.params[0] || '';
    
    // Auto translate search queries if any
    let searchString = '';
    const queryKeys = Object.keys(req.query);
    if (queryKeys.length > 0) {
      const qParams = new URLSearchParams();
      for (const k of queryKeys) {
        qParams.append(k, String(req.query[k]));
      }
      searchString = '?' + qParams.toString();
    }

    const translatePath = `/${originalPathPath}${searchString}`
      .replace(/^\/api\/v3/, '') // Clean up nested v3 from older client calls
      .replace(/^\/v3/, '');

    const resolvedPath = translatePath.startsWith('/') ? translatePath : `/${translatePath}`;
    
    const requestOptions: any = {
      method: req.method
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestOptions.body = JSON.stringify(req.body);
    }

    const responseData = await makeZohoBooksRequest(resolvedPath, requestOptions);
    return res.json(responseData);
  } catch (err: any) {
    console.error('[Base Zoho proxy fallback warning]:', err.message);
    return res.status(200).json({
      success: false,
      error: err.message
    });
  }
});

app.all('/api/zoho-accounts/:region/*', async (req, res) => {
  try {
    const config = await getZohoConfig();
    const { region } = req.params;
    const subRoute = req.params[0] || '';
    
    if (subRoute.includes('/v2/token')) {
      const bodyParams = new URLSearchParams();
      // Forward body parameters and append secure client secret from env/settings
      const originBody = req.body || {};
      for (const k of Object.keys(originBody)) {
        bodyParams.append(k, originBody[k]);
      }
      if (!bodyParams.has('client_id')) bodyParams.append('client_id', config.clientId);
      if (!bodyParams.has('client_secret')) bodyParams.append('client_secret', config.clientSecret);

      const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error("Expected JSON from Zoho Accounts token endpoint. HTML received: " + text.slice(0, 200));
      }

      const data = await response.json();
      if (data.access_token) {
        const expiresAt = Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000;
        await saveZohoTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          accessTokenExpiresAt: expiresAt,
        });
      }
      return res.json(data);
    }

    return res.status(200).json({ success: false, error: "Only token exchange proxying is allowed." });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err.message });
  }
});


// ==========================================
// ====== 3. Static/Vite Middleware ========
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
