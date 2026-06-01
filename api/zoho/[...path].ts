const API_UNAVAILABLE_MESSAGE =
  'This API endpoint is not available on this deployment. Zoho backend routes may need Cloud Run or Vercel serverless functions.';
const ZOHO_OAUTH_NOT_CONFIGURED_MESSAGE =
  'Zoho OAuth is not configured. Missing ZOHO_CLIENT_ID, ZOHO_REDIRECT_URI, or ZOHO_ACCOUNTS_URL.';

const stripTrailingSlash = (value = '') => String(value || '').replace(/\/$/, '');

const getPath = (req: any) => {
  const value = req.query?.path;
  return Array.isArray(value) ? value.join('/') : String(value || '');
};

const buildAuthUrl = () => {
  const clientId = process.env.ZOHO_CLIENT_ID || '';
  const redirectUri = process.env.ZOHO_REDIRECT_URI || '';
  const accountsUrl = stripTrailingSlash(process.env.ZOHO_ACCOUNTS_URL || '');

  if (!clientId || !redirectUri || !accountsUrl) {
    return null;
  }

  const scopes = [
    'ZohoBooks.fullaccess.all',
    'ZohoBooks.fullaccess.ALL',
    'ZohoBooks.organizations.READ'
  ].join(' ');

  const params = new URLSearchParams({
    scope: scopes,
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `${accountsUrl}/oauth/v2/auth?${params.toString()}`;
};

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const path = getPath(req);

  if (path === 'auth-url') {
    const authUrl = buildAuthUrl();
    if (!authUrl) {
      return res.status(200).json({
        success: false,
        backendAvailable: false,
        deployment: 'vercel-frontend-fallback',
        error: ZOHO_OAUTH_NOT_CONFIGURED_MESSAGE
      });
    }

    return res.status(200).json({
      success: true,
      backendAvailable: false,
      deployment: 'vercel-frontend-fallback',
      authUrl,
      url: authUrl
    });
  }

  res.status(503).json({
    success: false,
    overallReady: false,
    backendAvailable: false,
    deployment: 'vercel-frontend-fallback',
    path: `/api/zoho/${path}`,
    method: req.method,
    error: API_UNAVAILABLE_MESSAGE,
    message: API_UNAVAILABLE_MESSAGE
  });
}
