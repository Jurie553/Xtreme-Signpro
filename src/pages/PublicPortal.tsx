import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Image as ImageIcon, 
  Send, 
  AlertCircle, 
  Printer, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Truck, 
  ArrowRight, 
  MessageSquare, 
  Signature, 
  FileCheck2, 
  Lock, 
  ShieldCheck, 
  Package, 
  Inbox, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { getDocument, updateDocument, getCollection } from '../lib/firestoreService';
import { resolveAndVerifyToken, PublicToken } from '../lib/sharingService';
import { Job, Quote, Client } from '../types';
import { cn, addBusinessDays } from '../lib/utils';
import { toast } from 'sonner';

// Format ZAR currency
function formatZAR(val: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
}

export default function PublicPortal() {
  const { quoteId, token, jobId, clientId, proofId } = useParams<{ 
    quoteId?: string; 
    token?: string; 
    jobId?: string; 
    clientId?: string; 
    proofId?: string; 
  }>();

  const location = useLocation();
  const navigate = useNavigate();

  // General state
  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resolved entities
  const [resolvedType, setResolvedType] = useState<'quote' | 'quote-approval' | 'job' | 'artwork-approval' | 'portal' | 'proof' | null>(null);
  const [resolvedDocId, setResolvedDocId] = useState<string | null>(null);
  const [tokenRecord, setTokenRecord] = useState<PublicToken | null>(null);

  // Core domain records
  const [quote, setQuote] = useState<Quote | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [associatedQuotes, setAssociatedQuotes] = useState<Quote[]>([]);
  const [associatedJobs, setAssociatedJobs] = useState<Job[]>([]);

  // Interaction states
  const [artworkFeedback, setArtworkFeedback] = useState('');
  const [currentArtIndex, setCurrentArtIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successRecorded, setSuccessRecorded] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // HTML canvas for real ink drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Parse path types to determine intended context
  const pathPrefix = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/quote-approval/')) return 'quote-approval';
    if (p.includes('/quote/')) return 'quote';
    if (p.includes('/job/')) return 'job';
    if (p.includes('/artwork-approval/')) return 'artwork-approval';
    if (p.includes('/client-portal/')) return 'portal';
    if (p.includes('/proof/')) return 'proof';
    return null;
  }, [location.pathname]);

  // Unified lookup routing strategy (Token First -> DB direct fallback)
  useEffect(() => {
    async function resolveAssets() {
      setLoading(true);
      setErrorHeader(null);
      setErrorMessage(null);

      const targetIndicator = token || quoteId || jobId || clientId || proofId;
      if (!targetIndicator) {
        setErrorHeader('Link format error');
        setErrorMessage('This shared URL does not contain a valid security identifier token.');
        setLoading(false);
        return;
      }

      try {
        let actualId: string = targetIndicator;
        let finalType: typeof resolvedType = null;

        // Try to resolve as a secure dynamic token
        const verifiedToken = await resolveAndVerifyToken(targetIndicator);
        if (verifiedToken) {
          if (verifiedToken.status === 'revoked') {
            setErrorHeader('Security token revoked or expired');
            setErrorMessage('This public link has been deactivated for your safety. Please request a new link.');
            setLoading(false);
            return;
          }
          setTokenRecord(verifiedToken);
          actualId = verifiedToken.relatedId;
          finalType = verifiedToken.type;
        } else {
          // Fallback logic: identify type using pathPrefix
          if (pathPrefix) {
            finalType = pathPrefix as any;
          } else if (quoteId) {
            finalType = 'quote';
          } else if (jobId) {
            finalType = 'job';
          } else if (clientId) {
            finalType = 'portal';
          }
        }

        setResolvedDocId(actualId);
        setResolvedType(finalType);

        // Fetch core collection elements
        if (finalType === 'quote' || finalType === 'quote-approval') {
          const fetchedQuote = await getDocument<Quote>('quotes', actualId);
          if (fetchedQuote) {
            setQuote(fetchedQuote);
            const fetchedClient = await getDocument<Client>('clients', fetchedQuote.clientId);
            if (fetchedClient) setClient(fetchedClient);
          } else {
            throw new Error('Quote record could not be found');
          }
        } else if (finalType === 'job' || finalType === 'artwork-approval' || finalType === 'proof') {
          const fetchedJob = await getDocument<Job>('jobs', actualId);
          if (fetchedJob) {
            setJob(fetchedJob);
            const fetchedClient = await getDocument<Client>('clients', fetchedJob.clientId);
            if (fetchedClient) setClient(fetchedClient);
          } else {
            throw new Error('Job record could not be found');
          }
        } else if (finalType === 'portal') {
          const fetchedClient = await getDocument<Client>('clients', actualId);
          if (fetchedClient) {
            setClient(fetchedClient);
            // Fetch associated elements for portal viewing
            const quotes = await getCollection<Quote>('quotes');
            const clientQuotes = quotes.filter(q => q.clientId === actualId);
            setAssociatedQuotes(clientQuotes);

            const jobs = await getCollection<Job>('jobs');
            const clientJobs = jobs.filter(j => j.clientId === actualId);
            setAssociatedJobs(clientJobs);
          } else {
            throw new Error('Client record could not be found');
          }
        }

      } catch (err: any) {
        console.error('Lookup crash:', err);
        setErrorHeader('Data Synchronisation issue');
        setErrorMessage(err.message || 'We could not fetch the requested workspace records. Please check the network.');
      } finally {
        setLoading(false);
      }
    }
    
    resolveAssets();
  }, [quoteId, token, jobId, clientId, proofId, pathPrefix]);

  // Init canvas drawing listeners
  useEffect(() => {
    if (resolvedType === 'artwork-approval' || resolvedType === 'proof' || resolvedType === 'quote-approval') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
        }
      }
    }
  }, [resolvedType, loading, successRecorded]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scroll during signing
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // 1. Submit Quote Approval / Rejection
  const handleQuoteApproveReject = async (status: 'Accepted' | 'Rejected') => {
    if (!quote || !resolvedDocId) return;

    if (status === 'Accepted') {
      if (!signatureName.trim()) {
        toast.error('Please type your legal authorization signature name');
        return;
      }
      if (!hasSigned) {
        toast.error('Please sign on the ink canvas block to verify checkout authentication');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Ink signature source
      const signDataUrl = hasSigned ? canvasRef.current?.toDataURL() : '';

      const updatedFields: any = { 
        status,
        updatedAt: Date.now(),
        clientSignoffName: signatureName,
        clientSignoffImg: signDataUrl,
        clientSignoffAt: Date.now()
      };

      await updateDocument('quotes', resolvedDocId, updatedFields);
      
      // If we have a token, lock/disable the active state
      if (tokenRecord?.id) {
        await updateDocument('public_tokens', tokenRecord.id, { status: 'used' });
      }

      setQuote({ ...quote, status });
      setSuccessRecorded(true);
      toast.success(status === 'Accepted' ? 'Quote terms approved successfully!' : 'Quote rejection recorded');
    } catch (err: any) {
      toast.error(`Authentication crash: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Artwork Proof Approval / Changes requests comment logs
  const handleArtworkDecision = async (status: 'Approved' | 'Changes Requested') => {
    if (!job || !resolvedDocId) return;

    if (status === 'Approved') {
      if (!signatureName.trim()) {
        toast.error('Signee authority name prefix required for processing');
        return;
      }
      if (!hasSigned) {
        toast.error('Please draw your ink mark authorization code inside the portal');
        return;
      }
    } else {
      if (!artworkFeedback.trim()) {
        toast.error('Detail specifications required to request prepress structural alterations');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const artList = job.artwork || [];
      const currentArt = artList[currentArtIndex] || artList[artList.length - 1];
      if (!currentArt) throw new Error('No valid proof item referenced');

      const clientInkMark = hasSigned ? canvasRef.current?.toDataURL() : '';

      const feedbackComment = {
        id: Math.random().toString(36).substring(2, 10),
        text: status === 'Approved' 
          ? `APPROVED digitally signed by authority: ${signatureName}`
          : `CHANGES REQ: ${artworkFeedback}`,
        author: 'Client' as const,
        createdAt: Date.now()
      };

      const systemStatusComment = {
        id: Math.random().toString(36).substring(2, 10),
        text: `Artwork state mutated to [${status}] by portal client terminal`,
        author: 'System' as const,
        createdAt: Date.now()
      };

      const revisedArtwork = artList.map((art, idx) => {
        if (idx === currentArtIndex || art.id === currentArt.id) {
          const currentComments = art.comments || [];
          return {
            ...art,
            status,
            feedback: status === 'Changes Requested' ? artworkFeedback : (art.feedback || ''),
            comments: [...currentComments, feedbackComment, systemStatusComment],
            signoffName: signatureName,
            signoffImg: clientInkMark,
            signoffAt: Date.now()
          };
        }
        return art;
      });

      const updates: Partial<Job> = {
        artwork: revisedArtwork,
        artworkStatus: status,
        updatedAt: Date.now()
      };

      if (status === 'Approved') {
        updates.artworkApprovedAt = Date.now();
        updates.stage = 'Printing'; // Move automatically along workflow pipeline
        updates.dueDate = addBusinessDays(Date.now(), 5);
      } else {
        updates.stage = 'Prepress'; // Return for review cycle
      }

      await updateDocument('jobs', resolvedDocId, updates);
      
      if (tokenRecord?.id && status === 'Approved') {
        await updateDocument('public_tokens', tokenRecord.id, { status: 'used' });
      }

      setJob({ ...job, ...updates });
      setSuccessRecorded(true);
      toast.success(status === 'Approved' ? 'Production blueprints authorized!' : 'Prepress revision request logged');
    } catch (err: any) {
      toast.error(`Portal updates failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic status color maps
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Prepress': return 'bg-cyan-150 text-cyan-800 border-cyan-200';
      case 'Printing': return 'bg-indigo-50 text-indigo-700 border-indigo-150';
      case 'Finishing': return 'bg-purple-50 text-purple-700 border-purple-150';
      case 'Ready': return 'bg-emerald-50 text-emerald-800 border-emerald-250 animate-pulse';
      case 'Delivered': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Loading indicator template
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-white border border-slate-200 shadow-xl rounded-3xl flex flex-col items-center max-w-sm space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-slate-800 block">SignPro Security Handshake</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">Decrypting token link elements...</span>
          </div>
        </div>
      </div>
    );
  }

  // Graceful Error boundary template
  if (errorHeader || !resolvedType) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-250 shadow-2xl space-y-5">
          <AlertCircle size={58} className="mx-auto text-rose-500 animate-bounce" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{errorHeader || 'Page Router Fault'}</h1>
          <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">{errorMessage || 'The requested sharing scheme parameters cannot be parsed.'}</p>
          <div className="border-t pt-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3">Powered by SignPro Solid Routing</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase rounded-xl tracking-wider shadow"
            >
              SignPro Terminal Sign-in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
      
      {/* BRANDING NAV BAR (SECURE PUBLIC PORTAL VIEW) */}
      <nav className="bg-slate-950 text-white px-6 py-3.5 border-b border-indigo-950 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="p-1 px-2.5 bg-indigo-600 text-[11px] font-black uppercase tracking-wider rounded-lg italic">
            SignPro ERP
          </span>
          <span className="text-xs font-bold text-slate-400 tracking-tight block">Secure Portal Terminal</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-300">
            256-Bit SSL Secured
          </span>
        </div>
      </nav>

      {/* RENDER THE RELEVANT INTERACTION COMPONENT */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 lg:py-12 space-y-8">
        
        {/* ========================================================== */}
        {/* INTERFACE 1&2: QUOTE DETAILED VIEW & APPROVAL WORKFLOWS    */}
        {/* ========================================================== */}
        {(resolvedType === 'quote' || resolvedType === 'quote-approval') && quote && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
              {/* Top Banner Accent */}
              <div className="h-2 bg-indigo-600 w-full" />
              
              {/* Header metrics */}
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1 px-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded">
                      Print Estimate
                    </span>
                    <span className="text-xs text-slate-400 font-extrabold uppercase">
                      Created: {new Date(quote.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Quote {quote.quoteNumber}</h1>
                  <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Client target: {client?.name || 'Assigned Accounts'}</p>
                </div>

                <div className="text-left md:text-right">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mb-0.5">Project Gross Total (ZAR)</span>
                  <span className="text-3xl font-black tracking-tighter text-indigo-700 italic">
                    {formatZAR(quote.total)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block bg-white px-2.5 py-1 rounded-lg border border-slate-100 mt-1 uppercase w-max md:ml-auto">
                    Status Code: {quote.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-8 space-y-6">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block border-b pb-1.5">Line level product descriptions</span>
                
                <div className="divide-y divide-slate-100">
                  {quote.items.map((it, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm uppercase">{it.description}</h4>
                        <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500 font-bold uppercase tracking-wider">
                          {it.width && it.length && <span>Dim: {it.width} x {it.length} mm</span>}
                          {it.width && it.length && <span className="opacity-30">•</span>}
                          <span>Units: {it.quantity} items</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Unit pricing</span>
                        <span className="font-black text-slate-800 text-sm italic">{formatZAR(it.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {quote.notes && (
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs space-y-1 mt-4">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-indigo-700 block">Prepress structural instructions</span>
                    <p className="font-medium text-slate-650 whitespace-pre-line">{quote.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* RESPONSE CONTROLS (QUOTES ACQUISITION SIGNATURE) */}
            {!successRecorded && quote.status !== 'Accepted' && quote.status !== 'Rejected' && (
              <div className="bg-white border border-slate-250 p-6 rounded-3xl shadow-xl space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 pb-3 border-b border-dashed">
                  <Signature size={20} className="text-indigo-600" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-800">Auth & Secure Signoff Terminal</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Digital ink drawing signature */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide flex justify-between">
                      <span>Draw secure ink code below *</span>
                      <button type="button" onClick={clearSignature} className="text-indigo-600 font-black hover:underline uppercase">Clear drawpad</button>
                    </span>
                    <div className="relative border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl h-36 overflow-hidden cursor-crosshair">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={144}
                        onMouseDown={startDrawing}
                        onMouseMove={drawSignature}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={drawSignature}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full"
                      />
                      {!hasSigned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-center flex-col p-4">
                          <Signature size={18} className="animate-pulse" />
                          <span className="text-[9px] font-extrabold uppercase tracking-widest mt-1">Sign with mouse, finger or stylus</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signee name & verification text fields */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Authorized Signee Legal Name *</label>
                      <input 
                        type="text"
                        placeholder="e.g. Director J. Smith"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 select-none">
                      <input 
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-250 rounded focus:ring-0 mt-0.5"
                      />
                      <span className="text-[9.5px] font-bold leading-normal uppercase">By checking this, I acknowledge and accept the quote specifications, and authorize SignPro to allocate substrate stock.</span>
                    </label>
                  </div>
                </div>

                {/* Submits */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleQuoteApproveReject('Rejected')}
                    className="px-6 py-3 border border-rose-100 text-[10px] bg-white hover:bg-rose-50 text-rose-600 font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Reject Estimate
                  </button>
                  <button
                    disabled={isSubmitting || !acceptedTerms || !hasSigned || !signatureName.trim()}
                    onClick={() => handleQuoteApproveReject('Accepted')}
                    className={cn(
                      "px-8 py-3 text-[10px] text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-indigo-100",
                      (isSubmitting || !acceptedTerms || !hasSigned || !signatureName.trim())
                        ? "bg-slate-350 cursor-not-allowed text-slate-500 shadow-none"
                        : "bg-indigo-600 hover:-translate-y-0.5 hover:bg-indigo-700"
                    )}
                  >
                    {isSubmitting ? 'Processing...' : 'Approve & Place Order'}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS BUBBLE */}
            {(successRecorded || quote.status === 'Accepted' || quote.status === 'Rejected') && (
              <div className="bg-emerald-50 border border-emerald-150 p-8 rounded-3xl text-center space-y-3">
                <CheckCircle2 size={42} className="mx-auto text-emerald-600" />
                <h3 className="text-xl font-black text-emerald-990 uppercase italic tracking-tight">Handshake complete</h3>
                <p className="text-xs font-extrabold text-emerald-800 uppercase">THE CLIENT RESPONSE (ESTIMATE AS STATE: {quote.status}) HAS BEEN LOGGED ON THE LIVE DEPARTMENT workflow BOARDS.</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">No further action is required from you at this time. Thank you!</p>
              </div>
            )}

          </div>
        )}

        {/* ========================================================== */}
        {/* INTERFACE 3&5: ARTWORK PROOF / WORKFLOW ACCEPTANCE         */}
        {/* ========================================================== */}
        {(resolvedType === 'artwork-approval' || resolvedType === 'proof') && job && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden p-6 lg:p-8 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-md w-max">
                    <Sparkles size={11} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Artwork Prepress Signoff</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{job.productName || 'Order product'}</h1>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Reference identifier: {job.jobNumber}</span>
                </div>
                
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-left sm:text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Approval Status</span>
                  <span className={cn(
                    "text-[10px] font-black border px-2.5 py-1 rounded-full uppercase tracking-wider",
                    job.artworkStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  )}>
                    {job.artworkStatus || 'Awaiting Review'}
                  </span>
                </div>
              </div>

              {/* ARTWORK GALLERY PREVIEW ZONE */}
              {(job.artwork && job.artwork.length > 0) ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col items-center">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-3 align-self-start">Proof version slider index: {currentArtIndex + 1} of {job.artwork.length}</span>
                    
                    <div className="h-64 md:h-80 w-full flex items-center justify-center bg-slate-900 rounded-xl relative overflow-hidden text-white border border-slate-800">
                      <img 
                        src={job.artwork[currentArtIndex]?.url} 
                        alt="Prepress Artwork Proof Mockup" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="w-full flex items-center justify-between mt-3 text-slate-400 text-xs font-bold">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Slug ID: {job.artwork[currentArtIndex]?.id}</span>
                      <a 
                        href={job.artwork[currentArtIndex]?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-all font-extrabold uppercase"
                      >
                        <Download size={13} /> Open high resolution (pdf/raster)
                      </a>
                    </div>
                  </div>

                  {/* Multi proof slider paginator */}
                  {job.artwork.length > 1 && (
                    <div className="flex gap-2 justify-center">
                      {job.artwork.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentArtIndex(index)}
                          className={cn(
                            "w-8 h-8 rounded-lg font-black text-xs transition-all border",
                            currentArtIndex === index 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-100" 
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                          )}
                        >
                          v{index + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Artwork specification fields */}
                  {job.artwork[currentArtIndex]?.technicalNotes && (
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-xs space-y-1">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-800 block">Prepress Pressroom Specs notes</span>
                      <p className="font-medium text-slate-650">{job.artwork[currentArtIndex].technicalNotes}</p>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center p-12 bg-slate-55 shadow-inner border border-dashed rounded-3xl space-y-3">
                  <ImageIcon size={38} className="text-slate-400 mx-auto" />
                  <span className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">No mock previews uploaded</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">The prepress layout engineer is building standard crop schemas. Please reload shortly.</span>
                </div>
              )}

            </div>

            {/* ARTWORK DECISION RESPONSE BAR */}
            {!successRecorded && job.artworkStatus !== 'Approved' && (
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-dashed">
                  <Signature size={20} className="text-indigo-600" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-800">Prepress Signoff Verification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Digital Signature Drawing Canvas */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide flex justify-between">
                      <span>Sign to authorize high dynamic print *</span>
                      <button type="button" onClick={clearSignature} className="text-indigo-600 font-black hover:underline uppercase">Clear drawpad</button>
                    </span>
                    <div className="relative border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl h-36 overflow-hidden cursor-crosshair">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={144}
                        onMouseDown={startDrawing}
                        onMouseMove={drawSignature}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={drawSignature}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full"
                      />
                      {!hasSigned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-center flex-col p-4">
                          <Signature size={18} className="animate-pulse" />
                          <span className="text-[9px] font-extrabold uppercase tracking-widest mt-1">Sign with stylus or touch</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback or signature specs */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Authorized signatory authority name *</label>
                      <input 
                        type="text"
                        placeholder="e.g. Art Director Sarah Williams"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Prepress modifications feedback (If requesting amendments)</label>
                      <textarea 
                        rows={2}
                        placeholder="State any text corrections, logo scaling or color alignments required for the prepress deck..."
                        value={artworkFeedback}
                        onChange={(e) => setArtworkFeedback(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit targets */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    disabled={isSubmitting || !artworkFeedback.trim()}
                    onClick={() => handleArtworkDecision('Changes Requested')}
                    className={cn(
                      "px-6 py-3 border text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md",
                      !artworkFeedback.trim() 
                        ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed" 
                        : "border-rose-100 text-rose-600 hover:bg-rose-50 bg-white"
                    )}
                  >
                    Request Prepress Alterations
                  </button>
                  <button
                    disabled={isSubmitting || !hasSigned || !signatureName.trim()}
                    onClick={() => handleArtworkDecision('Approved')}
                    className={cn(
                      "px-8 py-3 text-[10px] text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-indigo-100",
                      (isSubmitting || !hasSigned || !signatureName.trim())
                        ? "bg-slate-350 cursor-not-allowed text-slate-500 shadow-none"
                        : "bg-indigo-600 hover:-translate-y-0.5 hover:bg-indigo-700"
                    )}
                  >
                    {isSubmitting ? 'Confirming...' : 'Approve for Print Run'}
                  </button>
                </div>
              </div>
            )}

            {/* RESPONSE COMPLETED PANEL */}
            {(successRecorded || job.artworkStatus === 'Approved') && (
              <div className="bg-emerald-50 border border-emerald-150 p-8 rounded-3xl text-center space-y-3">
                <CheckCircle2 size={42} className="mx-auto text-emerald-600 animate-in spin-in duration-500" />
                <h3 className="text-xl font-black text-emerald-990 uppercase italic tracking-tight">Artwork Proof Signoff Successful</h3>
                <p className="text-xs font-extrabold text-emerald-800 uppercase animate-pulse">Your physical signed authorization and high DPI raster targets have been uploaded to our press department schedules.</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">The order queue has scheduled printing allocation. No other action needed.</p>
              </div>
            )}

          </div>
        )}

        {/* ========================================================== */}
        {/* INTERFACE 4: ACTIVE JOB PROGRESS PORTAL TRACKER            */}
        {/* ========================================================== */}
        {resolvedType === 'job' && job && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden p-6 lg:p-8 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 bg-slate-900 text-white px-2 py-0.5 rounded-md w-max">
                    <Truck size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Client Order Tracker</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{job.productName || 'Branded Media Product'}</h1>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Reference order ID: {job.jobNumber}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-left sm:text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Production Status</span>
                  <span className={cn(
                    "px-3 py-1 text-xs font-extrabold uppercase border rounded-xl",
                    getStageColor(job.stage)
                  )}>
                    {job.stage}
                  </span>
                </div>
              </div>

              {/* TIMELINE DECK */}
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block pb-3">SignPro Production Line Progression</span>
                
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
                  {[
                    { name: 'Prepress', label: 'Proofing & Setup' },
                    { name: 'Printing', label: 'Ink Presses' },
                    { name: 'Finishing', label: 'Cutting & Laminates' },
                    { name: 'Quality Check', label: 'Tolerance Auditing' },
                    { name: 'Ready', label: 'Ready for Collection' },
                    { name: 'Delivered', label: 'Order Dispatched' }
                  ].map((step, sIdx) => {
                    const stepsArr = ['Prepress', 'Printing', 'Finishing', 'Quality Check', 'Ready', 'Delivered'];
                    const currentActiveIndex = stepsArr.indexOf(job.stage);
                    const matchingIdx = stepsArr.indexOf(step.name);

                    const completed = matchingIdx < currentActiveIndex;
                    const active = matchingIdx === currentActiveIndex;

                    return (
                      <div 
                        key={step.name}
                        className={cn(
                          "p-4 rounded-2xl border text-center flex flex-col items-center justify-between min-h-[110px] transition-all",
                          completed ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                          active ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100 scale-105" :
                          "bg-slate-50 border-slate-100 text-slate-400"
                        )}
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider block">{step.name}</span>
                        
                        <div className="my-1.5">
                          {completed ? <CheckCircle2 size={16} /> :
                           active ? <Clock className="animate-spin" size={16} /> :
                           <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
                        </div>

                        <span className={cn(
                          "text-[8px] font-black uppercase block leading-tight",
                          active ? "text-indigo-100" : "text-slate-400"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* METADATA SPECIFICATIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-150">
                <div className="space-y-4">
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-450 block border-b pb-1">Order Details</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Client Portal Account</span>
                      <span className="font-extrabold text-slate-800">{client?.name || 'Authorized Client'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Estimated ETA</span>
                      <span className="font-extrabold text-slate-800">{new Date(job.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Priority Class</span>
                      <span className="font-extrabold text-slate-800">{job.priority}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Job Entry Date</span>
                      <span className="font-extrabold text-slate-800">{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-450 block border-b pb-1">Prepress Artwork</span>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-2">
                      Proof Status: {job.artworkStatus || 'Unreviewed by client'}
                    </p>
                  </div>

                  {job.artwork && job.artwork.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/artwork-approval/${token || job.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
                    >
                      <Eye size={14} /> View Artwork Mock Proofs
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* INTERFACE 5: FULL COMPREHENSIVE CLIENT PORTAL VIEW PAGE    */}
        {/* ========================================================== */}
        {resolvedType === 'portal' && client && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Greeting Portal header */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full w-max block mb-2">
                  Active Client Hub
                </span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">{client.name}</h1>
                <p className="text-xs text-slate-500 font-bold mt-1.5 uppercase">Registered Email: {client.email}</p>
                {client.companyName && <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider mt-1">Company: {client.companyName}</p>}
              </div>

              <div className="bg-slate-50/80 border p-4 rounded-2xl text-left md:text-right min-w-[200px]">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Project Records</span>
                <div className="flex justify-between md:justify-end gap-6 mt-1 text-slate-850">
                  <div>
                    <span className="text-lg font-black block">{associatedQuotes.length}</span>
                    <span className="text-[8px] text-slate-450 font-black uppercase">Estimates</span>
                  </div>
                  <div>
                    <span className="text-lg font-black block">{associatedJobs.length}</span>
                    <span className="text-[8px] text-slate-450 font-black uppercase">Active Jobs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TWO COLUMN GRID FOR ESTIMATES & ACTIVE PROGRESS DECK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box A: Quotes & Agreements */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-lg space-y-4">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-450 block border-b pb-1.5 flex items-center gap-1">
                  <FileText size={13} className="text-indigo-600" /> Pending Estimations ({associatedQuotes.filter(q => q.status === 'Sent' || q.status === 'Draft').length})
                </span>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {associatedQuotes.length === 0 ? (
                    <div className="text-center p-8 bg-slate-55 border border-dashed rounded-2xl">
                      <Inbox size={22} className="text-slate-350 mx-auto mb-1" />
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">No estimates loaded</span>
                    </div>
                  ) : (
                    associatedQuotes.map(q => (
                      <div 
                        key={q.id}
                        onClick={() => navigate(`/quote/${q.id}`)}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all"
                      >
                        <div>
                          <span className="text-[10px] font-black text-slate-900 block">{q.quoteNumber}</span>
                          <span className="text-[8px] font-bold text-slate-450 block uppercase">Total: {formatZAR(q.total)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black bg-white border px-1.5 py-0.5 rounded uppercase font-mono text-slate-600">
                            {q.status}
                          </span>
                          <ChevronRight size={12} className="text-slate-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box B: Physical Jobs Trackers */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-lg space-y-4">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-450 block border-b pb-1.5 flex items-center gap-1">
                  <Package size={13} className="text-emerald-600" /> Active Job Cards Status ({associatedJobs.filter(j => j.stage !== 'Delivered').length})
                </span>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {associatedJobs.length === 0 ? (
                    <div className="text-center p-8 bg-slate-55 border border-dashed rounded-2xl">
                      <Inbox size={22} className="text-slate-350 mx-auto mb-1" />
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">No active print runs</span>
                    </div>
                  ) : (
                    associatedJobs.map(j => (
                      <div
                        key={j.id}
                        onClick={() => navigate(`/job/${j.id}`)}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all"
                      >
                        <div>
                          <span className="text-[10px] font-black text-slate-900 block truncate max-w-[180px]">{j.productName || 'Order Product'}</span>
                          <span className="text-[8px] font-bold text-slate-450 block uppercase">Ref ID: {j.jobNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "px-1.5 py-0.5 text-[8px] font-black rounded uppercase border",
                            getStageColor(j.stage)
                          )}>
                            {j.stage}
                          </span>
                          <ChevronRight size={12} className="text-slate-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-950 text-center text-xs mt-auto font-bold uppercase tracking-wider">
        <p className="opacity-60 italic">SignPro Graphics Enterprise ERP Portal Access Endpoint</p>
        <p className="text-[9px] opacity-40 mt-1">Authenticates SSL transaction hashes globally</p>
      </footer>

    </div>
  );
}
