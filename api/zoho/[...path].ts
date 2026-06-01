import { initializeApp, getApps } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc
} from 'firebase/firestore';

const REGIONS: Record<string, { accountsDomain: string; booksDomain: string }> = {
  us: { accountsDomain: 'accounts.zoho.com', booksDomain: 'www.zohoapis.com/books/v3' },
  eu: { accountsDomain: 'accounts.zoho.eu', booksDomain: 'www.zohoapis.eu/books/v3' },
  in: { accountsDomain: 'accounts.zoho.in', booksDomain: 'www.zohoapis.in/books/v3' },
  au: { accountsDomain: 'accounts.zoho.com.au', booksDomain: 'www.zohoapis.com.au/books/v3' },
  jp: { accountsDomain: 'accounts.zoho.co.jp', booksDomain: 'www.zohoapis.co.jp/books/v3' },
};

const OAUTH_NOT_CONFIGURED =
  'Zoho OAuth is not configured. Missing ZOHO_CLIENT_ID, ZOHO_REDIRECT_URI, or ZOHO_ACCOUNTS_URL.';
const FIREBASE_NOT_CONFIGURED =
  'Firebase server config is missing. Add VITE_FIREBASE_* environment variables to the Vercel deployment.';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

const hasFirebaseConfig = !!firebaseConfig.projectId;
const firebaseApp = hasFirebaseConfig
  ? (getApps()[0] || initializeApp(firebaseConfig))
  : null;
const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

const db = {
  collection(collectionName: string) {
    if (!firestore) throw new Error(FIREBASE_NOT_CONFIGURED);
    return {
      async get() {
        const snap = await getDocs(collection(firestore, collectionName));
        return { docs: snap.docs.map(d => ({ id: d.id, exists: d.exists(), data: () => d.data() })) };
      },
      async add(data: any) {
        const ref = await addDoc(collection(firestore, collectionName), data);
        return { id: ref.id };
      },
      doc(docId: string) {
        const ref = doc(firestore, collectionName, docId);
        return {
          async get() {
            const snap = await getDoc(ref);
            return { id: snap.id, exists: snap.exists(), data: () => snap.data() };
          },
          async set(data: any, options: { merge?: boolean } = {}) {
            await setDoc(ref, data, options);
          },
          async update(data: any) {
            await updateDoc(ref, data);
          },
          async delete() {
            await deleteDoc(ref);
          }
        };
      }
    };
  }
};

const json = (res: any, body: any, status = 200) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

const safeError = (err: any) => err?.message || String(err);
const stripProtocol = (value = '') => String(value || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const getPath = (req: any) => {
  const value = req.query?.path;
  const queryPath = Array.isArray(value) ? value.join('/') : String(value || '');
  if (queryPath) return queryPath.replace(/^\/+|\/+$/g, '');

  const rawUrl = String(req.url || '');
  const pathname = rawUrl.split('?')[0] || '';
  const marker = '/api/zoho/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(pathname.slice(markerIndex + marker.length)).replace(/^\/+|\/+$/g, '');
  }

  return decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ''));
};

const parseBody = (req: any) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
};

const getPrivateState = async () => {
  if (!hasFirebaseConfig) return null;
  const snap = await db.collection('zoho_private').doc('state').get();
  return snap.exists ? snap.data() as any : null;
};

const getZohoConfig = async () => {
  let publicConfig: any = {};
  if (hasFirebaseConfig) {
    try {
      const snap = await db.collection('settings').doc('zoho').get();
      publicConfig = snap.exists ? snap.data() || {} : {};
    } catch {
      publicConfig = {};
    }
  }

  const region = publicConfig.region || 'us';
  const domainInfo = REGIONS[region] || REGIONS.us;
  const privateState = await getPrivateState();

  return {
    clientId: process.env.ZOHO_CLIENT_ID || publicConfig.clientId || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || privateState?.clientSecret || '',
    organizationId: process.env.ZOHO_ORGANIZATION_ID || publicConfig.organizationId || '',
    redirectUri: process.env.ZOHO_REDIRECT_URI || '',
    accountsDomain: stripProtocol(process.env.ZOHO_ACCOUNTS_URL || process.env.ZOHO_ACCOUNTS_DOMAIN || domainInfo.accountsDomain),
    booksApiDomain: stripProtocol(process.env.ZOHO_BOOKS_API_URL || process.env.ZOHO_BOOKS_API_DOMAIN || domainInfo.booksDomain),
    region,
    publicConfig
  };
};

const saveTokens = async (tokens: any) => {
  if (!hasFirebaseConfig) throw new Error(FIREBASE_NOT_CONFIGURED);
  const existing = await getPrivateState() || {};
  const updated = {
    accessToken: tokens.accessToken || existing.accessToken || '',
    refreshToken: tokens.refreshToken || existing.refreshToken || '',
    accessTokenExpiresAt: tokens.accessTokenExpiresAt || existing.accessTokenExpiresAt || 0,
    clientSecret: tokens.clientSecret || existing.clientSecret || '',
  };
  await db.collection('zoho_private').doc('state').set(updated, { merge: true });
  await db.collection('settings').doc('zoho').set({ connected: !!updated.refreshToken }, { merge: true });
};

const addSyncLog = async (recordName: string, syncAction: string, success: boolean, errorMessage = '', recordType = 'Client') => {
  if (!hasFirebaseConfig) return;
  try {
    await db.collection('zoho_sync_logs').add({
      date: Date.now(),
      recordType,
      recordName,
      syncAction,
      success,
      errorMessage
    });
  } catch {
    // Logging must never break a sync response.
  }
};

const buildAuthUrl = async () => {
  const config = await getZohoConfig();
  if (!config.clientId || !config.redirectUri || !config.accountsDomain) return null;
  const scopes = ['ZohoBooks.fullaccess.all', 'ZohoBooks.fullaccess.ALL', 'ZohoBooks.organizations.READ'].join(' ');
  const params = new URLSearchParams({
    scope: scopes,
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    access_type: 'offline',
    prompt: 'consent'
  });
  return `https://${config.accountsDomain}/oauth/v2/auth?${params.toString()}`;
};

const ensureAccessToken = async () => {
  const config = await getZohoConfig();
  const state = await getPrivateState();
  if (!state?.refreshToken) throw new Error('No refresh token is available. Please connect Zoho OAuth first.');
  if (state.accessToken && Date.now() + 60000 < Number(state.accessTokenExpiresAt || 0)) {
    return state.accessToken;
  }
  if (!config.clientId || !config.clientSecret) throw new Error('Zoho Client ID or Client Secret is missing.');

  const params = new URLSearchParams({
    refresh_token: state.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token'
  });
  const response = await fetch(`https://${config.accountsDomain}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString()
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || `Zoho token refresh failed: ${response.status}`);
  const expiresAt = Date.now() + (Number(data.expires_in || 3600) * 1000);
  await saveTokens({ accessToken: data.access_token, accessTokenExpiresAt: expiresAt });
  return data.access_token;
};

const zohoRequest = async (path: string, options: any = {}) => {
  const config = await getZohoConfig();
  const token = await ensureAccessToken();
  let finalUrl = `https://${config.booksApiDomain}${path}`;
  if (config.organizationId && !path.includes('/organizations')) {
    finalUrl += `${path.includes('?') ? '&' : '?'}organization_id=${encodeURIComponent(config.organizationId)}`;
  }
  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(config.organizationId ? { 'X-com-zoho-books-organizationid': config.organizationId } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`Zoho returned non-JSON response: ${text.slice(0, 180)}`);
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || (data.code !== undefined && data.code !== 0)) {
    throw new Error(data.message || `Zoho API error: ${response.status}`);
  }
  return data;
};

const splitName = (name = 'Client') => {
  const parts = String(name || 'Client').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || 'Client', lastName: parts.slice(1).join(' ') || 'ERP' };
};

const buildContactPayload = (client: any) => {
  const { firstName, lastName } = splitName(client.contactPerson || client.name);
  return {
    contact_name: client.companyName || client.name || 'Client',
    company_name: client.companyName || '',
    contact_type: 'customer',
    billing_address: client.billingAddress || client.address ? { address: client.billingAddress || client.address } : undefined,
    contact_persons: [{
      first_name: firstName,
      last_name: lastName,
      email: client.email || '',
      phone: client.phone || '',
      mobile: client.whatsappNumber || client.mobile || '',
      is_primary_contact: true
    }]
  };
};

const findOrCreateContact = async (clientId: string, client: any) => {
  if (client.zohoCustomerId) return client.zohoCustomerId;
  const data = await zohoRequest('/contacts');
  const contacts = data.contacts || [];
  const email = String(client.email || '').trim().toLowerCase();
  const name = String(client.companyName || client.name || '').trim().toLowerCase();
  const matched = contacts.find((c: any) => {
    const cEmail = String(c.email || c.primary_contact_email || '').trim().toLowerCase();
    const cName = String(c.company_name || c.contact_name || '').trim().toLowerCase();
    return (email && cEmail === email) || (name && cName === name);
  });
  if (matched?.contact_id) {
    await db.collection('clients').doc(clientId).set({ zohoCustomerId: matched.contact_id, zohoSyncStatus: 'Synced' }, { merge: true });
    return matched.contact_id;
  }
  const created = await zohoRequest('/contacts', { method: 'POST', body: JSON.stringify(buildContactPayload(client)) });
  const id = created.contact?.contact_id;
  if (!id) throw new Error('Zoho contact creation did not return a contact_id.');
  await db.collection('clients').doc(clientId).set({ zohoCustomerId: id, zohoSyncStatus: 'Synced' }, { merge: true });
  return id;
};

const buildLineItems = (items: any[] = [], fallbackName = 'Custom print job', fallbackTotal = 0) => {
  const source = items.length ? items : [{ productName: fallbackName, description: fallbackName, quantity: 1, totalPrice: fallbackTotal }];
  return source.map((item: any) => {
    const quantity = Math.max(Number(item.quantity || 1), 1);
    const total = Number(item.totalPrice ?? item.basePrice ?? 0);
    const rate = total > 0 ? total / quantity : Number(item.unitPrice ?? item.sellPrice ?? item.unitCost ?? 0);
    return {
      name: String(item.productName || item.description || fallbackName).slice(0, 100),
      rate: Number(rate.toFixed(2)),
      quantity,
      description: String(item.description || fallbackName).slice(0, 500)
    };
  });
};

const checkFirestore = async () => {
  const names = ['clients', 'products', 'quotes', 'jobs'];
  const checks: Record<string, any> = {};
  if (!hasFirebaseConfig) {
    for (const name of [...names, 'settings/zoho', 'zoho_private/state', 'zoho_sync_logs']) {
      checks[name] = { read: false, write: false, error: FIREBASE_NOT_CONFIGURED };
    }
    return checks;
  }
  const now = Date.now();
  for (const name of names) {
    const id = `__zoho_readiness_${now}`;
    try {
      await db.collection(name).get();
      await db.collection(name).doc(id).set({ temporary: true, createdAt: now });
      await db.collection(name).doc(id).delete();
      checks[name] = { read: true, write: true };
    } catch (err) {
      checks[name] = { read: false, write: false, error: safeError(err) };
    }
  }
  for (const item of [['settings', 'zoho'], ['zoho_private', 'state']] as const) {
    const key = `${item[0]}/${item[1]}`;
    try {
      await db.collection(item[0]).doc(item[1]).get();
      await db.collection(item[0]).doc(item[1]).set({ readinessLastCheckedAt: now }, { merge: true });
      checks[key] = { read: true, write: true };
    } catch (err) {
      checks[key] = { read: false, write: false, error: safeError(err) };
    }
  }
  try {
    await db.collection('zoho_sync_logs').get();
    await addSyncLog('Zoho Readiness Check', 'Test Connection', true, 'Vercel Firestore readiness check completed.', 'Client');
    checks.zoho_sync_logs = { read: true, write: true };
  } catch (err) {
    checks.zoho_sync_logs = { read: false, write: false, error: safeError(err) };
  }
  return checks;
};

const handlers: Record<string, (req: any, res: any) => Promise<any>> = {
  async config(req, res) {
    if (req.method === 'POST') {
      if (!hasFirebaseConfig) return json(res, { success: false, error: FIREBASE_NOT_CONFIGURED });
      const body = parseBody(req);
      await db.collection('settings').doc('zoho').set({
        clientId: String(body.clientId || '').trim(),
        organizationId: String(body.organizationId || '').trim(),
        region: REGIONS[body.region] ? body.region : 'us',
        updatedAt: Date.now()
      }, { merge: true });
      if (body.clientSecret) await db.collection('zoho_private').doc('state').set({ clientSecret: String(body.clientSecret).trim() }, { merge: true });
      return json(res, { success: true, message: 'Zoho configuration saved safely.' });
    }
    const config = await getZohoConfig();
    const state = await getPrivateState();
    return json(res, {
      success: true,
      config: {
        clientId: config.clientId,
        organizationId: config.organizationId,
        region: config.region,
        redirectUri: config.redirectUri,
        connected: !!state?.refreshToken || !!config.publicConfig?.connected,
        lastSyncClients: config.publicConfig?.lastSyncClients || 0,
        lastSyncProducts: config.publicConfig?.lastSyncProducts || 0,
        lastSyncPayments: config.publicConfig?.lastSyncPayments || 0,
        hasClientSecret: !!config.clientSecret,
        hasRefreshToken: !!state?.refreshToken,
        hasAccessToken: !!state?.accessToken,
        accessTokenExpiresAt: state?.accessTokenExpiresAt || 0
      }
    });
  },

  async 'auth-url'(_req, res) {
    const authUrl = await buildAuthUrl();
    if (!authUrl) return json(res, { success: false, error: OAUTH_NOT_CONFIGURED });
    return json(res, { success: true, authUrl, url: authUrl });
  },

  async callback(req, res) {
    try {
      if (req.query?.error) return json(res, { success: false, error: String(req.query.error) });
      const code = String(req.query?.code || '');
      if (!code) return json(res, { success: false, error: 'Zoho callback did not include an authorization code.' });
      const config = await getZohoConfig();
      if (!config.clientId || !config.clientSecret || !config.redirectUri) return json(res, { success: false, error: OAUTH_NOT_CONFIGURED });
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code
      });
      const response = await fetch(`https://${config.accountsDomain}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: params.toString()
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok || data.error) throw new Error(data.error_description || data.error || `Zoho token exchange failed: ${response.status}`);
      await saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
      });
      return json(res, { success: true, message: 'Zoho Books authorized successfully. You can close this tab and return to Settings.' });
    } catch (err) {
      return json(res, { success: false, error: 'Zoho callback failed: ' + safeError(err) });
    }
  },

  async readiness(_req, res) {
    const config = await getZohoConfig();
    const state = await getPrivateState();
    const authUrl = await buildAuthUrl();
    const firestoreChecks = await checkFirestore();
    const checks = {
      zohoClientId: { passed: !!config.clientId, message: config.clientId ? 'Zoho Client ID is configured.' : 'Zoho Client ID is missing.' },
      zohoClientSecret: { passed: !!config.clientSecret, message: config.clientSecret ? 'Zoho Client Secret is available server-side.' : 'Zoho Client Secret is missing.' },
      zohoOrganizationId: { passed: !!config.organizationId, message: config.organizationId ? 'Zoho Organization ID is configured.' : 'Zoho Organization ID is missing.' },
      oauthConnectUrl: { passed: !!authUrl, message: authUrl ? 'OAuth URL can be generated.' : OAUTH_NOT_CONFIGURED },
      secureTokenStorage: { passed: hasFirebaseConfig, message: 'Tokens are stored in zoho_private/state.', hasRefreshToken: !!state?.refreshToken },
      zohoRegionDomains: { passed: config.accountsDomain.includes('zoho.') && config.booksApiDomain.includes('zohoapis.'), accountsDomain: config.accountsDomain, booksApiDomain: config.booksApiDomain }
    };
    const allFirestoreOk = Object.values(firestoreChecks).every((c: any) => c.read && c.write);
    return json(res, {
      success: true,
      overallReady: Object.values(checks).every((c: any) => c.passed) && allFirestoreOk && !!state?.refreshToken,
      liveTestingNeeded: !state?.refreshToken,
      config: {
        clientIdPresent: !!config.clientId,
        clientSecretPresent: !!config.clientSecret,
        organizationIdPresent: !!config.organizationId,
        redirectUri: config.redirectUri,
        accountsDomain: config.accountsDomain,
        booksApiDomain: config.booksApiDomain,
        region: config.region
      },
      tokens: { hasRefreshToken: !!state?.refreshToken, hasAccessToken: !!state?.accessToken, accessTokenExpiresAt: state?.accessTokenExpiresAt || 0, storagePath: 'zoho_private/state' },
      checks,
      firestoreChecks
    });
  },

  async 'test-connection'(_req, res) {
    try {
      const config = await getZohoConfig();
      const data = await zohoRequest('/organizations');
      const orgs = data.organizations || [];
      const matched = config.organizationId ? orgs.find((o: any) => String(o.organization_id) === String(config.organizationId)) : orgs[0];
      if (!matched) return json(res, { success: true, orgNotFound: true, error: 'Zoho connected, but no configured organization was found.', organizations: orgs });
      await addSyncLog('System Diagnostics', 'Test Connection', true, `Verified Zoho organization: ${matched.name}`);
      return json(res, { success: true, message: 'Zoho Books connected successfully', organization: { organization_id: matched.organization_id, name: matched.name } });
    } catch (err) {
      return json(res, { success: false, error: 'Diagnostics Error: ' + safeError(err) });
    }
  },

  async 'sync-clients'(_req, res) {
    try {
      const zohoContacts = (await zohoRequest('/contacts')).contacts || [];
      const snap = await db.collection('clients').get();
      const clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      let pulled = 0, pushed = 0, skipped = 0, failed = 0;
      const localEmails = new Set(clients.map(c => String(c.email || '').toLowerCase()).filter(Boolean));
      const localNames = new Set(clients.map(c => String(c.companyName || c.name || '').toLowerCase()).filter(Boolean));
      for (const contact of zohoContacts) {
        const email = String(contact.email || contact.primary_contact_email || '').toLowerCase();
        const name = String(contact.company_name || contact.contact_name || '').toLowerCase();
        const matched = (email && localEmails.has(email)) || (name && localNames.has(name));
        if (!matched) {
          await db.collection('clients').add({
            name: contact.contact_name || contact.company_name || 'Imported Client',
            email: contact.email || contact.primary_contact_email || `${contact.contact_id}@zoho-import.com`,
            phone: contact.phone || '',
            companyName: contact.company_name || '',
            zohoCustomerId: contact.contact_id || '',
            zohoSyncStatus: 'Synced',
            activeStatus: true,
            notes: 'Imported from Zoho Books Sync',
            createdAt: Date.now()
          });
          pulled++;
        } else {
          skipped++;
        }
      }
      const zohoEmails = new Set(zohoContacts.map((c: any) => String(c.email || c.primary_contact_email || '').toLowerCase()).filter(Boolean));
      const zohoNames = new Set(zohoContacts.map((c: any) => String(c.company_name || c.contact_name || '').toLowerCase()).filter(Boolean));
      for (const client of clients) {
        const email = String(client.email || '').toLowerCase();
        const name = String(client.companyName || client.name || '').toLowerCase();
        if ((email && zohoEmails.has(email)) || (name && zohoNames.has(name))) continue;
        try {
          const created = await zohoRequest('/contacts', { method: 'POST', body: JSON.stringify(buildContactPayload(client)) });
          if (created.contact?.contact_id) await db.collection('clients').doc(client.id).set({ zohoCustomerId: created.contact.contact_id, zohoSyncStatus: 'Synced' }, { merge: true });
          pushed++;
        } catch (err) {
          failed++;
          await addSyncLog(client.name || client.id, 'Push', false, safeError(err), 'Client');
        }
      }
      await db.collection('settings').doc('zoho').set({ lastSyncClients: Date.now() }, { merge: true });
      return json(res, { success: true, pushed, pulled, skipped, failed, message: `Clients sync complete. Pulled ${pulled}, Pushed ${pushed}.` });
    } catch (err) {
      await addSyncLog('Bulk Clients Sync', 'Sync', false, safeError(err), 'Client');
      return json(res, { success: false, error: 'Clients sync failed: ' + safeError(err) });
    }
  },

  async 'sync-products'(_req, res) {
    try {
      const items = (await zohoRequest('/items')).items || [];
      const byName = new Map(items.map((i: any) => [String(i.name || '').trim().toLowerCase(), i]));
      const snap = await db.collection('products').get();
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      let pushed = 0, mapped = 0, failed = 0;
      for (const product of products) {
        const match = byName.get(String(product.name || '').trim().toLowerCase()) as any;
        if (match?.item_id) {
          await db.collection('products').doc(product.id).set({ zohoItemId: match.item_id, zohoSynced: true, zohoSyncDate: Date.now() }, { merge: true });
          mapped++;
          continue;
        }
        try {
          const base = Number(product.baseCost || product.minimumCharge || 100);
          const markup = Number(product.markupPercentage ?? product.markupPercent ?? 0);
          const created = await zohoRequest('/items', {
            method: 'POST',
            body: JSON.stringify({ name: product.name, rate: Number((base * (1 + markup / 100)).toFixed(2)), description: product.description || `${product.category || 'ERP'} Product`, product_type: 'goods' })
          });
          await db.collection('products').doc(product.id).set({ zohoItemId: created.item?.item_id, zohoSynced: true, zohoSyncDate: Date.now() }, { merge: true });
          pushed++;
        } catch (err) {
          failed++;
          await addSyncLog(product.name || product.id, 'Push', false, safeError(err), 'Product');
        }
      }
      await db.collection('settings').doc('zoho').set({ lastSyncProducts: Date.now() }, { merge: true });
      return json(res, { success: true, pushed, mapped, failed, message: `Products sync complete. Pushed ${pushed}, Matched ${mapped}.` });
    } catch (err) {
      await addSyncLog('Bulk Products Sync', 'Sync', false, safeError(err), 'Product');
      return json(res, { success: false, error: 'Products sync failed: ' + safeError(err) });
    }
  },

  async 'push-quote'(req, res) {
    const { quoteId } = parseBody(req);
    if (!quoteId) return json(res, { success: false, error: 'Missing required parameter: quoteId' });
    try {
      const quoteDoc = await db.collection('quotes').doc(quoteId).get();
      if (!quoteDoc.exists) return json(res, { success: false, error: 'Quote record was not found.' });
      const quote = quoteDoc.data() as any;
      const clientDoc = await db.collection('clients').doc(quote.clientId).get();
      if (!clientDoc.exists) return json(res, { success: false, error: 'Client attached to quote was not found.' });
      const contactId = await findOrCreateContact(quote.clientId, clientDoc.data());
      const existing = quote.zohoEstimateId;
      const result = await zohoRequest(existing ? `/estimates/${existing}` : '/estimates', {
        method: existing ? 'PUT' : 'POST',
        body: JSON.stringify({ customer_id: contactId, estimate_number: `EST-${quote.quoteNumber}`, reference_number: quoteId, line_items: buildLineItems(quote.items || [], 'Custom print job', quote.subtotal || quote.total || 0), notes: quote.notes || 'Generated from SignPro ERP.' })
      });
      const estimateId = result.estimate?.estimate_id || existing;
      await db.collection('quotes').doc(quoteId).set({ zohoEstimateId: estimateId, zohoSynced: true, zohoSyncDate: Date.now() }, { merge: true });
      await addSyncLog(quote.quoteNumber || quoteId, 'Push', true, `Pushed quote as Zoho Estimate ${estimateId}`, 'Quote');
      return json(res, { success: true, message: `Quote exported to Zoho Books as Estimate ${result.estimate?.estimate_number || estimateId}`, estimateId });
    } catch (err) {
      await addSyncLog('Quote', 'Push', false, safeError(err), 'Quote');
      return json(res, { success: false, error: 'Quote export failed: ' + safeError(err) });
    }
  },

  async 'push-invoice'(req, res) {
    const { jobId } = parseBody(req);
    if (!jobId) return json(res, { success: false, error: 'Missing required parameter: jobId' });
    try {
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) return json(res, { success: false, error: 'Job record was not found.' });
      const job = jobDoc.data() as any;
      const clientDoc = await db.collection('clients').doc(job.clientId).get();
      if (!clientDoc.exists) return json(res, { success: false, error: 'No client profile linked with this job card.' });
      const contactId = await findOrCreateContact(job.clientId, clientDoc.data());
      const existing = job.zohoInvoiceId;
      const result = await zohoRequest(existing ? `/invoices/${existing}` : '/invoices', {
        method: existing ? 'PUT' : 'POST',
        body: JSON.stringify({ customer_id: contactId, invoice_number: `INV-${String(job.jobNumber).replace(/[^A-Za-z0-9]/g, '')}`, reference_number: jobId, line_items: buildLineItems(job.items || [], job.productName || `Custom Job ${job.jobNumber}`, job.total || 0), notes: job.notes || 'Converted from SignPro job card.' })
      });
      const invoiceId = result.invoice?.invoice_id || existing;
      const invoiceNumber = result.invoice?.invoice_number || job.zohoInvoiceNumber;
      await db.collection('jobs').doc(jobId).set({ zohoInvoiceId: invoiceId, zohoInvoiceNumber: invoiceNumber, zohoSynced: true, zohoSyncDate: Date.now() }, { merge: true });
      await addSyncLog(job.jobNumber || jobId, 'Push', true, `Generated Zoho Invoice ${invoiceNumber || invoiceId}`, 'Invoice');
      return json(res, { success: true, message: `Invoice created in Zoho Books. Invoice ID: ${invoiceNumber || invoiceId}`, invoiceId, invoiceNumber });
    } catch (err) {
      await addSyncLog('Invoice', 'Push', false, safeError(err), 'Invoice');
      return json(res, { success: false, error: 'Invoice export failed: ' + safeError(err) });
    }
  },

  async 'pull-payments'(_req, res) {
    try {
      const snap = await db.collection('jobs').get();
      const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(j => j.zohoInvoiceId);
      let checked = 0, updated = 0;
      for (const job of jobs) {
        checked++;
        const data = await zohoRequest(`/invoices/${job.zohoInvoiceId}`);
        const status = data.invoice?.status;
        const fields: any = status === 'paid' ? { paymentStatus: 'Paid', status: 'Completed' } : status === 'partially_paid' ? { paymentStatus: 'Partially Paid' } : status === 'void' ? { paymentStatus: 'Void', stage: 'Cancelled' } : { paymentStatus: 'Unpaid' };
        if (job.paymentStatus !== fields.paymentStatus || (fields.stage && job.stage !== fields.stage)) {
          await db.collection('jobs').doc(job.id).update(fields);
          updated++;
        }
      }
      await db.collection('settings').doc('zoho').set({ lastSyncPayments: Date.now() }, { merge: true });
      return json(res, { success: true, checked, updated, message: `Payment reconcile complete. Checked ${checked}, updated ${updated} records.` });
    } catch (err) {
      await addSyncLog('Bulk Payments Pull', 'Pull', false, safeError(err), 'Payment');
      return json(res, { success: false, error: 'Payments sync failed: ' + safeError(err) });
    }
  },

  async token(_req, res) {
    const state = await getPrivateState();
    return json(res, { success: true, hasRefreshToken: !!state?.refreshToken, hasAccessToken: !!state?.accessToken, accessTokenExpiresAt: state?.accessTokenExpiresAt || 0, isExpired: state ? Date.now() > Number(state.accessTokenExpiresAt || 0) : true });
  },

  async disconnect(_req, res) {
    if (!hasFirebaseConfig) return json(res, { success: false, error: FIREBASE_NOT_CONFIGURED });
    await db.collection('zoho_private').doc('state').set({ accessToken: '', refreshToken: '', accessTokenExpiresAt: 0 }, { merge: true });
    await db.collection('settings').doc('zoho').set({ connected: false, updatedAt: Date.now() }, { merge: true });
    return json(res, { success: true, message: 'Zoho Books disconnected.' });
  }
};

export async function handleZohoRequest(req: any, res: any, pathOverride?: string) {
  try {
    const path = pathOverride || getPath(req);
    const route = handlers[path];
    if (!route) return json(res, { success: false, error: `Zoho API route not found: /api/zoho/${path}` }, 404);
    return await route(req, res);
  } catch (err) {
    return json(res, { success: false, error: safeError(err) });
  }
}

export default async function handler(req: any, res: any) {
  return handleZohoRequest(req, res);
}
