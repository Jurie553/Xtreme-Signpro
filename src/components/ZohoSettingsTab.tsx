import React, { useState, useEffect } from 'react';
import { 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Database, 
  ArrowUpRight, 
  Link2, 
  Unlink, 
  UserCheck, 
  PackageCheck, 
  FileSpreadsheet, 
  Receipt, 
  History, 
  Calendar, 
  DollarSign, 
  Globe, 
  Settings, 
  Play, 
  ExternalLink, 
  Eye, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Terminal 
} from 'lucide-react';
import { 
  useCollection, 
  updateDocument, 
  setDocument, 
  createDocument, 
  getCollection 
} from '../lib/firestoreService';
import { Client, Quote, Job, Product } from '../types';
import { toast } from 'sonner';

interface ZohoSettings {
  id: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  organizationId: string;
  region: 'us' | 'eu' | 'in' | 'au' | 'jp';
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  connected: boolean;
  lastSyncClients: number;
  lastSyncProducts: number;
  lastSyncPayments: number;
}

interface SyncLog {
  id?: string;
  date: number;
  recordType: 'Client' | 'Quote' | 'Invoice' | 'Product' | 'Payment';
  recordName: string;
  syncAction: 'Push' | 'Pull' | 'Sync' | 'Test Connection';
  success: boolean;
  errorMessage?: string;
}

const REGIONS = [
  { code: 'us', name: 'United States (.com)', booksDomain: 'books.zoho.com', accountsDomain: 'accounts.zoho.com' },
  { code: 'eu', name: 'Europe (.eu)', booksDomain: 'books.zoho.eu', accountsDomain: 'accounts.zoho.eu' },
  { code: 'in', name: 'India (.in)', booksDomain: 'books.zoho.in', accountsDomain: 'accounts.zoho.in' },
  { code: 'au', name: 'Australia (.com.au)', booksDomain: 'books.zoho.com.au', accountsDomain: 'accounts.zoho.com.au' },
  { code: 'jp', name: 'Japan (.co.jp)', booksDomain: 'books.zoho.co.jp', accountsDomain: 'accounts.zoho.co.jp' },
];

const DEFAULT_ZOHO_SETTINGS: ZohoSettings = {
  id: 'zoho',
  clientId: '',
  clientSecret: '',
  redirectUri: window.location.origin + '/api/zoho/callback',
  organizationId: '',
  region: 'us',
  accessToken: '',
  refreshToken: '',
  accessTokenExpiresAt: 0,
  connected: false,
  lastSyncClients: 0,
  lastSyncProducts: 0,
  lastSyncPayments: 0,
};

const ZOHO_API_UNAVAILABLE_MESSAGE =
  'This API endpoint is not available on this deployment. Zoho backend routes may need Cloud Run or Vercel serverless functions.';

export default function ZohoSettingsTab() {
  const { data: zohoSettingsList, loading: loadingSettings } = useCollection<ZohoSettings>('settings');
  const { data: syncLogsRaw } = useCollection<SyncLog>('zoho_sync_logs');
  const { data: erpClients } = useCollection<Client>('clients');
  const { data: erpQuotes } = useCollection<Quote>('quotes');
  const { data: erpJobs } = useCollection<Job>('jobs');
  const { data: erpProducts } = useCollection<Product>('products');

  const [settings, setSettings] = useState<ZohoSettings>(DEFAULT_ZOHO_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [pullingPayments, setPullingPayments] = useState(false);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [readinessResult, setReadinessResult] = useState<any | null>(null);
  const [zohoApiAvailable, setZohoApiAvailable] = useState(true);
  const [zohoApiWarning, setZohoApiWarning] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'operations' | 'transactions' | 'logs'>('config');

  const [authStatus, setAuthStatus] = useState<'idle' | 'authorizing' | 'success' | 'error'>('idle');
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [pendingAuthorizeUrl, setPendingAuthorizeUrl] = useState<string>('');
  
  const [tokenStatus, setTokenStatus] = useState<{
    hasRefreshToken: boolean;
    hasAccessToken: boolean;
    accessTokenExpiresAt: number;
    isExpired: boolean;
    hasClientSecret?: boolean;
  } | null>(null);

  // Debug Panel metrics
  const [debugLog, setDebugLog] = useState<{
    frontendRoute: string;
    backendStatus: string;
    hasRefreshToken: string;
    accessTokenRefreshSuccess: string;
    orgIdFound: string;
    lastResponseStatus: string;
    lastError: string;
  }>({
    frontendRoute: 'Waiting for actions...',
    backendStatus: 'Verifying...',
    hasRefreshToken: 'Unknown',
    accessTokenRefreshSuccess: 'Unknown',
    orgIdFound: 'Unknown',
    lastResponseStatus: 'Unknown',
    lastError: 'None'
  });

  // Logs state
  const syncLogs = [...(syncLogsRaw || [])].sort((a, b) => b.date - a.date);

  const fetchZohoJson = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    if (!response.ok) {
      const message = response.status === 404 || response.status === 405 || response.status === 503
        ? ZOHO_API_UNAVAILABLE_MESSAGE
        : `Zoho API request failed with status ${response.status}.`;
      setZohoApiAvailable(false);
      setZohoApiWarning(message);
      throw new Error(message);
    }

    if (!isJson) {
      setZohoApiAvailable(false);
      setZohoApiWarning(ZOHO_API_UNAVAILABLE_MESSAGE);
      throw new Error(ZOHO_API_UNAVAILABLE_MESSAGE);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('The Zoho API returned an empty response. Please try again.');
    }

    try {
      const data = JSON.parse(text);
      setZohoApiAvailable(true);
      setZohoApiWarning('');
      return data;
    } catch {
      throw new Error('The Zoho API returned invalid JSON. Please try again or check the backend logs.');
    }
  };

  // Initialize and check code on search query
  useEffect(() => {
    if (zohoSettingsList.length > 0) {
      const zS = zohoSettingsList.find(s => s.id === 'zoho');
      if (zS) {
        setSettings(prev => ({ ...prev, ...zS, clientSecret: '', redirectUri: window.location.origin + '/api/zoho/callback' }));
      }
    }
  }, [zohoSettingsList]);

  const loadServerConfig = async () => {
    try {
      const data = await fetchZohoJson('/api/zoho/config');
      if (data.success && data.config) {
        setSettings(prev => ({
          ...prev,
          clientId: data.config.clientId || prev.clientId,
          clientSecret: '',
          organizationId: data.config.organizationId || prev.organizationId,
          region: data.config.region || prev.region,
          redirectUri: data.config.redirectUri || prev.redirectUri,
          connected: !!data.config.connected,
          lastSyncClients: data.config.lastSyncClients || 0,
          lastSyncProducts: data.config.lastSyncProducts || 0,
          lastSyncPayments: data.config.lastSyncPayments || 0,
        }));
        setTokenStatus({
          hasRefreshToken: !!data.config.hasRefreshToken,
          hasAccessToken: !!data.config.hasAccessToken,
          accessTokenExpiresAt: data.config.accessTokenExpiresAt || 0,
          isExpired: data.config.accessTokenExpiresAt ? Date.now() > data.config.accessTokenExpiresAt : true,
          hasClientSecret: !!data.config.hasClientSecret,
        });
      }
    } catch (e) {
      console.error('Failed to load Zoho server config', e);
    }
  };

  useEffect(() => {
    loadServerConfig();
  }, []);

  // Check token status on mount and when tab shifts
  const checkTokenStatus = async () => {
    try {
      const data = await fetchZohoJson('/api/zoho/token');
      if (data.success) {
        setTokenStatus(prev => ({ ...(prev || {}), ...data }));
        setSettings(prev => ({ ...prev, connected: data.hasRefreshToken }));
        setDebugLog(prev => ({
          ...prev,
          backendStatus: 'Online / Healthy',
          hasRefreshToken: data.hasRefreshToken ? 'Yes (stored securely on the server)' : 'Missing',
          accessTokenRefreshSuccess: data.hasRefreshToken ? (data.isExpired ? 'Needs Refresh' : 'Verified Sessions Active') : 'N/A',
          orgIdFound: settings.organizationId ? `Yes (${settings.organizationId})` : 'Missing'
        }));
      } else {
        setDebugLog(prev => ({
          ...prev,
          backendStatus: 'Error response',
          lastError: data.error || 'Unknown token fail'
        }));
      }
    } catch (e: any) {
      console.error("Failed to check token status", e);
      setDebugLog(prev => ({
        ...prev,
        backendStatus: 'Offline / Failed to connect',
        lastError: e.message
      }));
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, [activeSubTab, settings.organizationId]);

  // Handle URL callback cues from backend redirect and postMessage notifications
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'ZOHO_AUTH_SUCCESS') {
        setAuthStatus('success');
        toast.success('Successfully connected and authorized Zoho Books!');
        checkTokenStatus();
      } else if (event.data?.type === 'ZOHO_AUTH_ERROR') {
        setAuthErrorMessage(event.data.error || 'Identity exchange aborted.');
        setAuthStatus('error');
        toast.error(`Authorization failed: ${event.data.error || 'Identity exchange aborted.'}`);
        checkTokenStatus();
      }
    };

    window.addEventListener('message', handleMessage);

    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');
    if (authSuccess === 'true') {
      setAuthStatus('success');
      toast.success('Successfully connected and authorized Zoho Books!');
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=zoho');
      checkTokenStatus();
    } else if (authError) {
      setAuthErrorMessage(decodeURIComponent(authError));
      setAuthStatus('error');
      toast.error(`Authorization failed: ${decodeURIComponent(authError)}`);
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=zoho');
      checkTokenStatus();
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Launch OAuth redirection
  const handleConnect = async () => {
    setIsSaving(true);
    setPendingAuthorizeUrl('');
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/auth-url',
      lastResponseStatus: 'Pending...'
    }));

    try {
      const sanitizedSettings = {
        ...settings,
        clientId: settings.clientId.trim(),
        clientSecret: settings.clientSecret.trim(),
        organizationId: settings.organizationId.trim(),
      };
      const saveData = await fetchZohoJson('/api/zoho/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: sanitizedSettings.clientId,
          clientSecret: sanitizedSettings.clientSecret,
          organizationId: sanitizedSettings.organizationId,
          region: sanitizedSettings.region
        })
      });
      if (!saveData.success) {
        throw new Error(saveData.error || 'Zoho configuration could not be saved.');
      }
      setSettings(sanitizedSettings);

      const data = await fetchZohoJson('/api/zoho/auth-url');
      if (!data.success) {
        throw new Error(data.error || 'Server rejected authorization url payload');
      }

      setPendingAuthorizeUrl(data.url);
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200 OK',
        lastError: 'None'
      }));

      const newWin = window.open(data.url, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        toast.warning('Popup blocker detected. Please click the "Authorize Manually" button that has appeared, or allow popups for this site.');
      } else {
        toast.success('Zoho authorization page opened securely in a new tab.');
      }
    } catch (error: any) {
      toast.error('Could not initiate OAuth redirect: ' + error.message);
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: 'Error',
        lastError: error.message
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // Disconnect from Zoho Books
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Zoho Books? This will wipe authorization tokens from SignPro.')) return;
    
    setTesting(true);
    try {
      const data = await fetchZohoJson('/api/zoho/disconnect', { method: 'POST' });
      if (!data.success) {
        throw new Error(data.error || 'Disconnect failed.');
      }

      setSettings(prev => ({
        ...prev,
        clientSecret: '',
        connected: false
      }));

      toast.success('Disconnected from Zoho Books successfully.');
      checkTokenStatus();
    } catch (e: any) {
      toast.error('Failure disconnecting: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  // Save config inputs
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const sanitizedSettings = {
        ...settings,
        clientId: settings.clientId.trim(),
        clientSecret: settings.clientSecret.trim(),
        organizationId: settings.organizationId.trim(),
      };
      const data = await fetchZohoJson('/api/zoho/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: sanitizedSettings.clientId,
          clientSecret: sanitizedSettings.clientSecret,
          organizationId: sanitizedSettings.organizationId,
          region: sanitizedSettings.region
        })
      });
      if (!data.success) {
        throw new Error(data.error || 'Configuration could not be saved.');
      }
      setSettings({ ...sanitizedSettings, clientSecret: '' });
      toast.success('Zoho configuration saved. Secret values are kept server-side.');
      loadServerConfig();
      checkTokenStatus();
    } catch (err: any) {
      toast.error('Failed to store configuration: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Run secure server connection check
  const handleTestConnection = async () => {
    setTesting(true);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/test-connection',
      lastResponseStatus: 'Checking...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/test-connection');
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Verification Failed')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Server backend returned unsuccessful verification.');
      }

      if (data.orgNotFound) {
        toast.warning(data.error);
      } else {
        toast.success(data.message);
      }
      checkTokenStatus();
    } catch (err: any) {
      console.error(err);
      toast.error(`Connection Test Failed: ${err.message}`);
      setDebugLog(prev => ({
        ...prev,
        lastError: err.message
      }));
    } finally {
      setTesting(false);
    }
  };

  const handleCheckConfig = async () => {
    setCheckingReadiness(true);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/readiness',
      lastResponseStatus: 'Checking...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/readiness');
      setReadinessResult(data);
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        hasRefreshToken: data.tokens?.hasRefreshToken ? 'Yes (stored securely on the server)' : 'Missing',
        orgIdFound: data.config?.organizationIdPresent ? 'Yes' : 'Missing',
        lastError: data.success ? 'None' : (data.error || 'Readiness check failed')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Readiness check failed.');
      }

      if (data.overallReady) {
        toast.success('Zoho readiness check passed. OAuth token, config, domains, and Firestore checks look ready.');
      } else {
        toast.warning('Zoho readiness check completed. Some items still need live setup or attention.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Zoho readiness check failed: ' + err.message);
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: 'Error',
        lastError: err.message
      }));
    } finally {
      setCheckingReadiness(false);
    }
  };

  // Sync clients with Zoho Books
  const handleSyncClients = async () => {
    setSyncingClients(true);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/sync-clients',
      lastResponseStatus: 'Processing...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/sync-clients', { method: 'POST' });
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Sync operations failure')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Sync operations failed.');
      }

      toast.success(data.message);
      setSettings(prev => ({ ...prev, lastSyncClients: Date.now() }));
    } catch (err: any) {
      console.error(err);
      toast.error('Sync clients failed: ' + err.message);
    } finally {
      setSyncingClients(false);
    }
  };

  // Sync products catalog with Zoho Books items
  const handleSyncProducts = async () => {
    setSyncingProducts(true);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/sync-products',
      lastResponseStatus: 'Processing...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/sync-products', { method: 'POST' });
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Products sync failure')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Catalog sync failed.');
      }

      toast.success(data.message);
      setSettings(prev => ({ ...prev, lastSyncProducts: Date.now() }));
    } catch (err: any) {
      console.error(err);
      toast.error('Products sync failed: ' + err.message);
    } finally {
      setSyncingProducts(false);
    }
  };

  // Export quote to Zoho Books estimate
  const handlePushQuoteToZoho = async (quote: Quote) => {
    setExportingId(quote.id);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/push-quote',
      lastResponseStatus: 'Exporting...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/push-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id })
      });
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Quote transfer fail')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Could not map Quote parameters safely to Zoho.');
      }

      toast.success(data.message);
    } catch (err: any) {
      console.error(err);
      toast.error(`Transfer error: ${err.message}`);
    } finally {
      setExportingId(null);
    }
  };

  // Export finished job to invoice
  const handleCreateZohoInvoice = async (job: Job) => {
    setExportingId(job.id);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/push-invoice',
      lastResponseStatus: 'Exporting...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/push-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Invoice transfer fail')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Could not map completed Job Card spec to Zoho Invoice.');
      }

      toast.success(data.message);
    } catch (err: any) {
      console.error(err);
      toast.error(`Invoice creation failed: ${err.message}`);
    } finally {
      setExportingId(null);
    }
  };

  // Reconcile open invoice payment statuses
  const handlePullPaymentStatuses = async () => {
    setPullingPayments(true);
    setDebugLog(prev => ({
      ...prev,
      frontendRoute: '/api/zoho/pull-payments',
      lastResponseStatus: 'Reconciling...'
    }));

    try {
      const data = await fetchZohoJson('/api/zoho/pull-payments', { method: 'POST' });
      setDebugLog(prev => ({
        ...prev,
        lastResponseStatus: '200',
        lastError: data.success ? 'None' : (data.error || 'Payments Sync failure')
      }));

      if (!data.success) {
        throw new Error(data.error || 'Failed to complete payments checking reconcile loop.');
      }

      toast.success(data.message);
      setSettings(prev => ({ ...prev, lastSyncPayments: Date.now() }));
    } catch (err: any) {
      console.error(err);
      toast.error('Payment pull sequence failed: ' + err.message);
    } finally {
      setPullingPayments(false);
    }
  };

  const handleExportOneTestEstimate = async () => {
    const quote = erpQuotes.find(q => String((q as any).status || '').toLowerCase() === 'accepted');
    if (!quote) {
      toast.warning('No accepted quote is available to export. Accept a quote first, then run this test.');
      return;
    }
    await handlePushQuoteToZoho(quote);
  };

  const handleExportOneTestInvoice = async () => {
    const job = erpJobs.find(j => {
      const status = String((j as any).status || '').toLowerCase();
      const stage = String((j as any).stage || '').toLowerCase();
      return status === 'completed' || stage === 'completed' || stage === 'delivered' || stage === 'ready';
    });
    if (!job) {
      toast.warning('No completed jobcard is available to export. Complete a jobcard first, then run this test.');
      return;
    }
    await handleCreateZohoInvoice(job);
  };

  if (loadingSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-xs text-text-light font-black uppercase tracking-wider">Syncing Secure Zoho Interface...</p>
      </div>
    );
  }

  if (authStatus === 'authorizing') {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-6 min-h-[405px]">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-black uppercase tracking-tight italic text-text-main">Authorizing with Zoho Books</h3>
          <p className="text-xs text-text-light font-bold uppercase tracking-wider animate-pulse">Running secure credentials exchange handshake...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-6 min-h-[405px] text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
          <CheckCircle2 size={36} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-emerald-600 uppercase tracking-tight italic">Successfully Authorized!</h3>
          <p className="text-sm text-text-light font-medium max-w-md">
            SignPro ERP has successfully connected and authenticated with your Zoho Books instance.
          </p>
          <p className="text-xs text-text-muted uppercase tracking-wider font-extrabold bg-slate-100 px-4 py-2.5 rounded-xl inline-block mt-2">
            You can now safely close this window to return to your workspace
          </p>
        </div>
        <button
          onClick={() => {
            try {
              window.close();
            } catch (err) {
              console.warn(err);
              toast.error("Browser blocked automatic closing. Please close this tab manually.");
            }
          }}
          className="mt-4 px-8 py-3.5 bg-brand hover:brightness-110 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/10 transition-all cursor-pointer"
        >
          Close Window
        </button>
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-6 min-h-[405px] text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <AlertCircle size={36} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-rose-600 uppercase tracking-tight italic">Authorization Failed</h3>
          <p className="text-sm text-text-light font-medium">
            We suffered a credentials exchange failure while attempting to secure access tokens.
          </p>
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-left font-mono text-[10px] text-rose-700 max-w-md break-all">
            <strong>Error details:</strong> {authErrorMessage || "Unknown protocol failure"}
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => setAuthStatus('idle')}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              try {
                window.close();
              } catch (err) {
                window.location.search = "";
              }
            }}
            className="px-6 py-3 bg-brand text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all font-black"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      {/* Sub menu Navigation bar */}
      <div className="xl:col-span-1 space-y-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
          <button 
            onClick={() => setActiveSubTab('config')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeSubTab === 'config' ? 'bg-white text-brand shadow-sm border border-slate-200/50' : 'text-text-light hover:text-text-main'}`}
          >
            <span className="flex items-center gap-2">
              <Settings size={14} /> Connect Configuration
            </span>
            <ChevronRightIcon size={12} />
          </button>
          <button 
            onClick={() => setActiveSubTab('operations')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeSubTab === 'operations' ? 'bg-white text-brand shadow-sm border border-slate-200/50' : 'text-text-light hover:text-text-main'}`}
          >
            <span className="flex items-center gap-2">
              <Database size={14} /> Operations Centre
            </span>
            <ChevronRightIcon size={12} />
          </button>
          <button 
            onClick={() => setActiveSubTab('transactions')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeSubTab === 'transactions' ? 'bg-white text-brand shadow-sm border border-slate-200/50' : 'text-text-light hover:text-text-main'}`}
          >
            <span className="flex items-center gap-2">
              <Receipt size={14} /> Documents Exporter
            </span>
            <ChevronRightIcon size={12} />
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeSubTab === 'logs' ? 'bg-white text-brand shadow-sm border border-slate-200/50' : 'text-text-light hover:text-text-main'}`}
          >
            <span className="flex items-center gap-2">
              <History size={14} /> Sync Logs
              {syncLogs.filter(l => !l.success).length > 0 && (
                <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </span>
            <ChevronRightIcon size={12} />
          </button>
        </div>

        {/* Dynamic Status Panel on left column */}
        <div className="card-minimal h-fit">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest">Connection Status</h4>
            <div className={`p-1 rounded-full ${settings.connected ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
              <Globe size={13} />
            </div>
          </div>
          <p className="text-xl font-black italic uppercase text-text-main tracking-tight mt-1 flex items-center gap-2">
            {settings.connected ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Connected
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertCircle size={16} /> Offline
              </span>
            )}
          </p>
          <div className="border-t border-border mt-4 pt-4 space-y-2.5 text-[9px] font-bold text-text-light uppercase tracking-wider">
            <div className="flex justify-between">
              <span>Selected Region:</span>
              <span className="text-text-main font-black">{settings.region.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Clients Last Sync:</span>
              <span className="text-text-main font-black">
                {settings.lastSyncClients ? new Date(settings.lastSyncClients).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Products Last Sync:</span>
              <span className="text-text-main font-black">
                {settings.lastSyncProducts ? new Date(settings.lastSyncProducts).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payments Last Sync:</span>
              <span className="text-text-main font-black">
                {settings.lastSyncPayments ? new Date(settings.lastSyncPayments).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main configuration settings box views */}
      <div className="xl:col-span-3 space-y-6">
        {!zohoApiAvailable && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-600" />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest">Zoho backend unavailable</h4>
              <p className="text-xs font-semibold leading-relaxed">
                {zohoApiWarning || ZOHO_API_UNAVAILABLE_MESSAGE}
              </p>
            </div>
          </div>
        )}

        {activeSubTab === 'config' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            <div className="card-minimal">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-text-main tracking-tight">Zoho OAuth 2.0 Client Profile</h3>
                  <p className="text-[9px] text-text-light uppercase tracking-widest">Provide active client credentials from Zoho Developer Console</p>
                </div>
              </div>

              {/* Secure setup warning instructions */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 border-l-4 border-l-amber-500 mb-6 flex gap-4">
                <AlertTriangle size={24} className="shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-800">Beginner Setup Instructions:</h5>
                  <ol className="list-decimal pl-4 text-[9px] font-bold space-y-1 mt-1 text-amber-700 uppercase tracking-wide leading-relaxed">
                    <li>Go to Zoho Developer Console (<a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 flex-inline items-center">api-console.zoho.com <ExternalLink size={8} className="inline ml-0.5" /></a>).</li>
                    <li>Add a <strong>"Server-Based Applications"</strong> Client registry.</li>
                    <li>Set your homepage URL and paste redirect URI: <code>{settings.redirectUri}</code></li>
                    <li>Copy Client ID, Client Secret, and Organization ID into the fields below and select your correct region. The secret is stored server-side only.</li>
                    <li>Click <strong>Connect To Zoho Books</strong> to authorize the system.</li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Client ID</label>
                  <input 
                    type="text" 
                    value={settings.clientId}
                    onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                    placeholder="1000.XXXXXXXXXX"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-border rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">
                    Client Secret {tokenStatus?.hasClientSecret ? '(saved server-side)' : ''}
                  </label>
                  <input 
                    type="password" 
                    value={settings.clientSecret}
                    onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                    placeholder={tokenStatus?.hasClientSecret ? 'Leave blank to keep existing saved secret' : 'Paste Zoho client secret'}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-border rounded-xl font-bold text-xs"
                  />
                  <p className="text-[8px] font-bold text-text-muted uppercase tracking-wide">
                    For safety this field never reloads the saved secret into the browser.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Organization ID</label>
                  <input 
                    type="text" 
                    value={settings.organizationId}
                    onChange={(e) => setSettings({ ...settings, organizationId: e.target.value })}
                    placeholder="700100234"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-border rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Zoho Region Web Domain</label>
                  <select
                    value={settings.region}
                    onChange={(e) => setSettings({ ...settings, region: e.target.value as any })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-border rounded-xl font-bold text-xs focus:ring-4 focus:ring-brand/5 focus:border-brand"
                  >
                    {REGIONS.map(r => (
                      <option key={r.code} value={r.code}>{r.name} ({r.booksDomain})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Redirect Callback URI (Secure Authorization Callback)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={settings.redirectUri}
                    className="w-full px-5 py-3.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed select-all"
                  />
                  <p className="text-[8px] italic font-semibold text-text-muted mt-0.5 uppercase tracking-wide">Must EXACTLY match Redirect URL parameter set inside Zoho accounts dashboard</p>
                </div>
              </div>

              <div className="border-t border-border mt-8 pt-6 flex flex-wrap gap-4 justify-between">
                <div>
                  <button 
                    onClick={handleSaveConfig}
                    disabled={isSaving || !zohoApiAvailable}
                    className="px-6 py-3.5 bg-surface border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                  >
                    Save Inputs
                  </button>
                </div>
                <div className="flex gap-3">
                  {settings.connected ? (
                    <>
                      <button 
                        onClick={handleTestConnection}
                        disabled={testing || !zohoApiAvailable}
                        className="px-6 py-3.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-amber-100 transition-all flex items-center gap-2"
                      >
                        {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw size={13} />}
                        Test Active Handshake
                      </button>
                      <button 
                        onClick={handleDisconnect}
                        disabled={testing || !zohoApiAvailable}
                        className="px-6 py-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center gap-2"
                      >
                        <Unlink size={13} />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button 
                        onClick={handleConnect}
                        disabled={isSaving || !zohoApiAvailable}
                        className="px-8 py-4 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-md shadow-brand/10"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 size={13} />}
                        Connect To Zoho Books
                      </button>

                      {pendingAuthorizeUrl && (
                        <a 
                          href={pendingAuthorizeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 shadow-md shadow-amber-500/15 animate-pulse"
                        >
                          <ExternalLink size={13} />
                          Authorize Manually
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Technical Integration Debug Panel */}
            <div id="zoho-debug-panel" className="card-minimal border border-slate-200 bg-slate-50/35">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <Terminal size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">Integration Debug Center</h3>
                  <p className="text-[9px] text-text-light uppercase tracking-widest font-semibold">Real-time status diagnostics for backend API connections</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[10px]">
                <div id="debug-frontend-route" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Frontend API Route</span>
                  <p className="font-mono font-bold text-slate-800 break-all">{debugLog.frontendRoute}</p>
                </div>
                <div id="debug-backend-status" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Backend Server Link</span>
                  <p className="font-mono font-bold text-emerald-600">{debugLog.backendStatus}</p>
                </div>
                <div id="debug-refresh-token" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Secret Refresh Token Existence</span>
                  <p className="font-mono font-bold text-indigo-600">{debugLog.hasRefreshToken}</p>
                </div>
                <div id="debug-access-token" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Access Token Refresh Handshake</span>
                  <p className="font-mono font-bold text-amber-600">{debugLog.accessTokenRefreshSuccess}</p>
                </div>
                <div id="debug-org-id" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Organization Identifier Status</span>
                  <p className="font-mono font-bold text-slate-700">{debugLog.orgIdFound}</p>
                </div>
                <div id="debug-response-status" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1 font-mono">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Last API Response Status</span>
                  <p className="font-bold text-slate-800">{debugLog.lastResponseStatus}</p>
                </div>
                <div id="debug-error-log" className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-1 md:col-span-2 lg:col-span-3">
                  <span className="text-[8px] uppercase tracking-widest font-bold text-text-light">Last Detected Error Log</span>
                  <p className="font-mono text-rose-600 font-semibold break-words">{debugLog.lastError || 'None'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'operations' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            <div className="card-minimal border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-text-main tracking-tight">Zoho Admin Test Panel</h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest max-w-2xl">
                      Run the full readiness checklist before live syncing customers, items, estimates, invoices, and payment states.
                    </p>
                  </div>
                </div>
                {readinessResult && (
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    readinessResult.overallReady
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {readinessResult.overallReady ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {readinessResult.overallReady ? 'Ready' : 'Needs Live Check'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={handleCheckConfig}
                  disabled={checkingReadiness}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {checkingReadiness ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye size={13} />}
                  Check Config
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isSaving || !zohoApiAvailable}
                  className="btn-primary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 size={13} />}
                  Connect OAuth
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe size={13} />}
                  Test Connection
                </button>
                <button
                  onClick={handleSyncClients}
                  disabled={syncingClients || !settings.connected || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {syncingClients ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck size={13} />}
                  Sync Clients
                </button>
                <button
                  onClick={handleSyncProducts}
                  disabled={syncingProducts || !settings.connected || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {syncingProducts ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck size={13} />}
                  Sync Products
                </button>
                <button
                  onClick={handleExportOneTestEstimate}
                  disabled={exportingId !== null || !settings.connected || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {exportingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet size={13} />}
                  Export One Test Estimate
                </button>
                <button
                  onClick={handleExportOneTestInvoice}
                  disabled={exportingId !== null || !settings.connected || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {exportingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt size={13} />}
                  Export One Test Invoice
                </button>
                <button
                  onClick={handlePullPaymentStatuses}
                  disabled={pullingPayments || !settings.connected || !zohoApiAvailable}
                  className="btn-secondary justify-center text-[10px] uppercase tracking-widest font-black"
                >
                  {pullingPayments ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign size={13} />}
                  Pull Payment Status
                </button>
              </div>

              {readinessResult && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[8px] uppercase tracking-widest font-black text-text-light mb-1">Redirect URI</p>
                    <p className="font-mono text-[10px] text-slate-700 break-all">{readinessResult.config?.redirectUri || 'Not available'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[8px] uppercase tracking-widest font-black text-text-light mb-1">Zoho Domains</p>
                    <p className="font-mono text-[10px] text-slate-700 break-all">
                      {readinessResult.config?.accountsDomain || 'accounts missing'} / {readinessResult.config?.booksApiDomain || 'api missing'}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[8px] uppercase tracking-widest font-black text-text-light mb-1">Token Store</p>
                    <p className="font-mono text-[10px] text-slate-700">
                      {readinessResult.tokens?.storagePath || 'zoho_private/state'} - {readinessResult.tokens?.hasRefreshToken ? 'Refresh token present' : 'OAuth not connected'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-text-main tracking-tight">Bulk Synchronization Hub</h3>
                  <p className="text-[9px] text-text-light uppercase tracking-widest">Perform wide bidirectional customer database syncing and reconciliation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Operations Block: Sync Clients */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-border/80 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <UserCheck size={18} />
                    </div>
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">Clients / Customer Sync</h5>
                    <p className="text-[10px] leading-relaxed font-bold text-text-light tracking-wide">
                      Transfers non-existent ERP clients directly as Zoho Contacts, and imports fresh Zoho entities. Automatically maps matching emails and names to avoid duplication.
                    </p>
                  </div>
                  <button 
                    onClick={handleSyncClients}
                    disabled={syncingClients || !settings.connected || !zohoApiAvailable}
                    className="mt-6 w-full py-3 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    {syncingClients ? <Loader2 className="w-3 h-3 animate-spin text-slate-500" /> : <Play size={10} />}
                    Sync Clients
                  </button>
                </div>

                {/* Operations Block: Sync Catalog */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-border/80 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <PackageCheck size={18} />
                    </div>
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">Products Catalog Export</h5>
                    <p className="text-[10px] leading-relaxed font-bold text-text-light tracking-wide">
                      Maps ERP custom prints and specifications directly to Zoho Books Goods items. Syncs baseline catalog standard specifications, category lines, and descriptions.
                    </p>
                  </div>
                  <button 
                    onClick={handleSyncProducts}
                    disabled={syncingProducts || !settings.connected || !zohoApiAvailable}
                    className="mt-6 w-full py-3 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    {syncingProducts ? <Loader2 className="w-3 h-3 animate-spin text-slate-500" /> : <Play size={10} />}
                    Sync Products
                  </button>
                </div>

                {/* Operations Block: Reconcile Payments */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-border/80 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <DollarSign size={18} />
                    </div>
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">Reconcile Invoice Payments</h5>
                    <p className="text-[10px] leading-relaxed font-bold text-text-light tracking-wide">
                      Queries Zoho Books for mapped outstanding invoice states. Automatically reconciles ERP jobs with payments (Paid, Unpaid, Partially Paid) dynamically.
                    </p>
                  </div>
                  <button 
                    onClick={handlePullPaymentStatuses}
                    disabled={pullingPayments || !settings.connected || !zohoApiAvailable}
                    className="mt-6 w-full py-3 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    {pullingPayments ? <Loader2 className="w-3 h-3 animate-spin text-slate-500" /> : <Play size={10} />}
                    Pull Payment Statuses
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'transactions' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Box: Quotes awaiting Zoho Sync export */}
            <div className="card-minimal">
              <div className="flex items-center gap-3 mb-6 justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-text-main tracking-tight">Accepted Quotes Exporter</h3>
                    <p className="text-[9px] text-text-light uppercase tracking-widest">Transfer ERP Accepted Quotes as dynamic Zoho Books Estimates</p>
                  </div>
                </div>
                <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  Real Line Items Kept
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[9px] text-text-light font-black uppercase tracking-widest">
                      <th className="py-3 px-1">Quote No.</th>
                      <th className="py-3 px-2">Client Details</th>
                      <th className="py-3 px-2">Total Amount</th>
                      <th className="py-3 px-2">Zoho Estimate Status</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {erpQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[10px] text-text-light uppercase tracking-wider font-bold">
                          No active quotes found in ERP Database.
                        </td>
                      </tr>
                    ) : (
                      erpQuotes.map(quote => (
                        <tr key={quote.id} className="border-b border-border text-xs font-bold hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-1">{quote.quoteNumber}</td>
                          <td className="py-4 px-2">
                            <div className="flex flex-col">
                              <span>{quote.clientId || 'Unknown'}</span>
                              <span className="text-[9px] font-semibold text-text-light uppercase tracking-wide">ERP Client ID</span>
                            </div>
                          </td>
                          <td className="py-4 px-2 font-mono">
                            ZAR {(quote.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-2">
                            {(quote as any).zohoSynced ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-widest">
                                <CheckCircle2 size={10} /> Mapped (ID: {(quote as any).zohoEstimateId})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest">
                                <AlertCircle size={10} /> Not Synced
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <button
                              onClick={() => handlePushQuoteToZoho(quote)}
                              disabled={exportingId !== null || !settings.connected || !zohoApiAvailable}
                              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 ml-auto"
                            >
                              {exportingId === quote.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ArrowUpRight size={11} />
                              )}
                              {(quote as any).zohoSynced ? 'Re-push Estimate' : 'Export Estimate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Box: Production Jobs waiting Zoho Invoice conversion */}
            <div className="card-minimal">
              <div className="flex items-center gap-3 mb-6 justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-text-main tracking-tight">ERP Job Invoices Exporter</h3>
                    <p className="text-[9px] text-text-light uppercase tracking-widest">Generate compliant corporate invoices in Zoho Books from active job cards</p>
                  </div>
                </div>
                <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  Auto-Calculated Rates
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[9px] text-text-light font-black uppercase tracking-widest">
                      <th className="py-3 px-1">Job No.</th>
                      <th className="py-3 px-2">Job Card Product</th>
                      <th className="py-3 px-2">Value Amount</th>
                      <th className="py-3 px-2">Zoho Invoice ID</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {erpJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[10px] text-text-light uppercase tracking-wider font-bold">
                          No active job workflows registered.
                        </td>
                      </tr>
                    ) : (
                      erpJobs.map(job => (
                        <tr key={job.id} className="border-b border-border text-xs font-bold hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-1">{job.jobNumber}</td>
                          <td className="py-4 px-2">
                            <div className="flex flex-col">
                              <span>{job.productName}</span>
                              <span className="text-[9px] font-semibold text-text-light uppercase tracking-wide">{job.clientName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2 font-mono">
                            ZAR {(job.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-2">
                            {job.zohoSynced ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-widest">
                                <CheckCircle2 size={10} /> {job.zohoInvoiceNumber || 'INV-Done'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest">
                                <AlertCircle size={10} /> Unlinked
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <button
                              onClick={() => handleCreateZohoInvoice(job)}
                              disabled={exportingId !== null || !settings.connected || !zohoApiAvailable}
                              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 ml-auto"
                            >
                              {exportingId === job.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ArrowUpRight size={11} />
                              )}
                              {job.zohoSynced ? 'Generate Duplicate INV' : 'Export Invoice'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            <div className="card-minimal">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase text-text-main tracking-tight">Active Operation Audit Trail</h3>
                  <p className="text-[9px] text-text-light uppercase tracking-widest font-bold">Synchronisation histories for client audits</p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-wide">Automated Logs</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[9px] text-text-light font-black uppercase tracking-widest">
                      <th className="py-3 px-1">Date Logged</th>
                      <th className="py-3 px-2">Module Type</th>
                      <th className="py-3 px-2">Target Item Name</th>
                      <th className="py-3 px-2">Operation Action</th>
                      <th className="py-3 px-2">Sync Code Details</th>
                      <th className="py-3 px-2 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[10px] text-text-light uppercase tracking-wider font-bold">
                          No logging items currently recorded. Runs are recorded upon synchronisations.
                        </td>
                      </tr>
                    ) : (
                      syncLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border text-xs hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-1 font-mono text-slate-500 text-[10px]">
                            {new Date(log.date).toLocaleString()}
                          </td>
                          <td className="py-4 px-2 font-black uppercase tracking-wider text-[10px]">
                            {log.recordType || 'System'}
                          </td>
                          <td className="py-4 px-2 font-bold text-slate-800">
                            {log.recordName}
                          </td>
                          <td className="py-4 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {log.syncAction}
                          </td>
                          <td className="py-4 px-2 text-[10px] text-slate-500 font-medium">
                            {log.errorMessage || 'Synchronization completed successfully. Mapped parameters align perfectly.'}
                          </td>
                          <td className="py-4 px-2 text-right whitespace-nowrap">
                            {log.success ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-wider" title={log.errorMessage}>
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" /> Failure
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Small helper component to look like ChevronRight but cleaner
function ChevronRightIcon({ size = 16, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
