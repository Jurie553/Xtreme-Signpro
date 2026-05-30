import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  AlertCircle, 
  Signature, 
  ShieldCheck, 
  ChevronRight,
  Eye,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getDocument, updateDocument } from '../lib/firestoreService';
import { resolveAndVerifyToken, PublicToken } from '../lib/sharingService';
import { Job, Quote, Client } from '../types';
import { cn, addBusinessDays } from '../lib/utils';
import { toast } from 'sonner';

// Format ZAR currency
function formatZAR(val: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
}

export default function PublicApproval() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Route path state for identifying type
  const pathPrefix = React.useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/artwork-approval/')) return 'artwork-approval';
    if (p.includes('/quote-approval/')) return 'quote-approval';
    if (p.includes('/job-approval/')) return 'job-approval';
    if (p.includes('/proof/')) return 'proof';
    return null;
  }, [location.pathname]);

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [tokenRecord, setTokenRecord] = useState<PublicToken | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorDesc, setErrorDesc] = useState<string | null>(null);

  // Core Data State (Client Safe Fields Only)
  const [quoteData, setQuoteData] = useState<Partial<Quote> | null>(null);
  const [jobData, setJobData] = useState<Partial<Job> | null>(null);
  
  // Custom Interaction States
  const [clientComment, setClientComment] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [successRecorded, setSuccessRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentArtIndex, setCurrentArtIndex] = useState(0);

  // Digital Signature Pad Ref & States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Token Resolution & Data Fetching Effect
  useEffect(() => {
    async function resolveSecurityToken() {
      if (!token) {
        setErrorTitle('Missing Token');
        setErrorDesc('This shared URL does not contain a valid security identifier token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorTitle(null);
        setErrorDesc(null);

        // Resolve and verify the secure token from public_tokens
        const verifiedToken = await resolveAndVerifyToken(token);
        
        if (!verifiedToken) {
          setErrorTitle('Invalid Link');
          setErrorDesc('The approval link is invalid, expired, or has been deactivated.');
          setLoading(false);
          return;
        }

        if (verifiedToken.status === 'revoked') {
          setErrorTitle('Token Revoked');
          setErrorDesc('This secure link has been deactivated for security or content revisions.');
          setLoading(false);
          return;
        }

        if (verifiedToken.status === 'used') {
          setErrorTitle('Already Responded');
          setErrorDesc('An approval or change request has already been logged for this token link.');
          setLoading(false);
          return;
        }

        setTokenRecord(verifiedToken);
        const docId = verifiedToken.relatedId;

        // Fetch exact core document with ONLY needed attributes
        if (verifiedToken.type === 'quote-approval' || verifiedToken.type === 'quote') {
          const rawQuote = await getDocument<Quote>('quotes', docId);
          if (rawQuote) {
            // Store client-safe values only
            setQuoteData({
              id: rawQuote.id,
              quoteNumber: rawQuote.quoteNumber,
              createdAt: rawQuote.createdAt,
              total: rawQuote.total,
              items: rawQuote.items,
              notes: rawQuote.notes,
              status: rawQuote.status
            });
          } else {
            throw new Error('Associated Quote record could not be found.');
          }
        } else if (
          verifiedToken.type === 'artwork-approval' || 
          verifiedToken.type === 'proof' || 
          verifiedToken.type === 'job-approval' ||
          verifiedToken.type === 'job'
        ) {
          const rawJob = await getDocument<Job>('jobs', docId);
          if (rawJob) {
            // Store client-safe values only
            setJobData({
              id: rawJob.id,
              jobNumber: rawJob.jobNumber,
              productName: rawJob.productName,
              stage: rawJob.stage,
              dueDate: rawJob.dueDate,
              priority: rawJob.priority,
              artwork: rawJob.artwork || [],
              artworkStatus: rawJob.artworkStatus || 'Pending',
              status: rawJob.status || 'active'
            });
            if (rawJob.artwork && rawJob.artwork.length > 0) {
              setCurrentArtIndex(rawJob.artwork.length - 1);
            }
          } else {
            throw new Error('Associated Job record could not be found.');
          }
        } else {
          throw new Error('Unsupported sharing token classification.');
        }

      } catch (err: any) {
        console.error('Handshake Error:', err);
        setErrorTitle('Verification Issue');
        setErrorDesc(err.message || 'We could not fetch the document linked to this token. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    resolveSecurityToken();
  }, [token]);

  // Canvas drawing canvas sizing/listeners
  useEffect(() => {
    if (!loading && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [loading, successRecorded, tokenRecord]);

  // Canvas Drawing Handlers
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
      e.preventDefault(); // Stop mobile dragging scrolling
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

  // Main Submit Processing handler (Updates Firestore documents & sets Token as Used)
  const handleApprovalAction = async (status: 'Approved' | 'Rejected' | 'Changes Requested') => {
    if (!tokenRecord) return;
    
    // Validations
    if (status === 'Approved') {
      if (!signatureName.trim()) {
        toast.error('Please enter your full authorization legal name.');
        return;
      }
      if (!hasSigned) {
        toast.error('Please draw your ink signature on the drawpad to authenticate.');
        return;
      }
      if (!acceptedTerms) {
        toast.error('Please accept the service specs signoff terms checkbox.');
        return;
      }
    } else {
      if (!clientComment.trim()) {
        toast.error('Please enter detail explanations into the comment/feedback field.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const inkMarkUrl = hasSigned ? canvasRef.current?.toDataURL() : '';
      const docId = tokenRecord.relatedId;

      if (tokenRecord.type === 'quote-approval') {
        const uppercaseStatus = status === 'Approved' ? 'Accepted' : 'Rejected';
        
        await updateDocument('quotes', docId, {
          status: uppercaseStatus,
          approvedAt: status === 'Approved' ? Date.now() : null,
          rejectedAt: status === 'Rejected' ? Date.now() : null,
          clientComment: clientComment,
          approvedBy: signatureName,
          clientSignoffName: signatureName,
          clientSignoffImg: inkMarkUrl,
          clientSignoffAt: Date.now(),
          updatedAt: Date.now()
        });

        if (quoteData) {
          setQuoteData({ ...quoteData, status: uppercaseStatus as any });
        }

      } else {
        // Handle job-approval, artwork-approval, or proof
        const currentArtList = jobData?.artwork || [];
        const activeArt = currentArtList[currentArtIndex] || currentArtList[currentArtList.length - 1];

        // System update timeline comments matching existing structures
        const feedbackComment = {
          id: Math.random().toString(36).substring(2, 10),
          text: status === 'Approved' 
            ? `APPROVED digitally signed by authority: ${signatureName}`
            : `CHANGES REQ: ${clientComment}`,
          author: 'Client' as const,
          createdAt: Date.now()
        };

        const systemStatusComment = {
          id: Math.random().toString(36).substring(2, 10),
          text: `Artwork state mutated to [${status}] by public approval layout`,
          author: 'System' as const,
          createdAt: Date.now()
        };

        // If artwork proof list exists, update the specific index
        const updatedArtwork = currentArtList.map((art, idx) => {
          if (idx === currentArtIndex || (activeArt && art.id === activeArt.id)) {
            const commentsList = art.comments || [];
            return {
              ...art,
              status: status === 'Approved' ? 'Approved' : 'Changes Requested',
              feedback: status !== 'Approved' ? clientComment : (art.feedback || ''),
              comments: [...commentsList, feedbackComment, systemStatusComment],
              signoffName: signatureName,
              signoffImg: inkMarkUrl,
              signoffAt: Date.now()
            };
          }
          return art;
        });

        const updates: any = {
          status: status === 'Approved' ? 'approved' : 'changes_requested',
          artworkStatus: status === 'Approved' ? 'Approved' : 'Changes Requested',
          approvedAt: status === 'Approved' ? Date.now() : null,
          rejectedAt: status !== 'Approved' ? Date.now() : null,
          clientComment: clientComment,
          approvedBy: signatureName,
          updatedAt: Date.now()
        };

        if (currentArtList.length > 0) {
          updates.artwork = updatedArtwork;
        }

        if (status === 'Approved') {
          updates.artworkApprovedAt = Date.now();
          updates.stage = 'Printing'; 
          updates.dueDate = addBusinessDays(Date.now(), 5);
        } else {
          updates.stage = 'Prepress'; 
        }

        await updateDocument('jobs', docId, updates);

        if (jobData) {
          setJobData({
            ...jobData,
            status: updates.status,
            stage: updates.stage,
            artworkStatus: updates.artworkStatus,
            artwork: updatedArtwork
          });
        }
      }

      // Mark the Single-use Token as USED to prevent double submissions
      await updateDocument('public_tokens', tokenRecord.id!, { status: 'used' });

      setSuccessRecorded(true);
      toast.success(status === 'Approved' ? 'Form submission successfully approved!' : 'Your change request feedback has been recorded.');
    } catch (err: any) {
      toast.error(`Error updating document: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status mapping colors helper
  const getStageColorBadge = (stage?: string) => {
    switch (stage) {
      case 'Prepress': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Printing': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Finishing': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse';
      case 'Delivered': return 'bg-slate-150 text-slate-700 border-slate-300';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // 1. Loading Screen View
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 bg-white border border-slate-200 shadow-2xl rounded-3xl flex flex-col items-center max-w-sm space-y-4">
          <div className="w-14 h-14 border-4 border-blue-100 border-t-brand-accent rounded-full animate-spin" />
          <div>
            <span className="text-xs font-black tracking-widest uppercase text-text-main block">Xtreme SignPro approval portal</span>
            <span className="text-[10px] font-bold text-text-muted uppercase mt-1 block">Checking your secure approval link...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Custom Branded Public Message View (For invalid, expired, revoked, or used tokens)
  if (errorTitle || !tokenRecord) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight">{errorTitle || 'Approval Link Issue'}</h1>
          <p className="text-sm font-medium text-text-muted leading-relaxed">{errorDesc || 'This approval link could not be verified. Please ask our team to send a fresh link.'}</p>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pb-3">Xtreme SignPro secure client approval</p>
            <span className="inline-block px-5 py-2 bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase rounded-lg">
              Protected link
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Determine current active document title
  const activeDocTitle = tokenRecord.type === 'quote-approval' 
    ? `Commercial estimate approval` 
    : `Artwork and proof layout approval`;

  return (
    <div className="min-h-screen bg-surface text-text-main antialiased flex flex-col font-sans">
      
      {/* BRANDING NAV BAR (SECURE CLIENT PORTAL VIEW - NO SIDEBAR, NO INTERNAL ACCESSIBLE TABS) */}
      <nav className="bg-white text-text-main px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-1.5 px-3 bg-brand text-white text-[11px] font-black uppercase tracking-wider rounded-lg">
            Xtreme SignPro
          </span>
          <span className="text-xs font-bold text-text-muted tracking-tight block">Secure Client Approval</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[9px] font-black tracking-widest uppercase text-text-muted">
            Secure link
          </span>
        </div>
      </nav>

      {/* RENDER THE RELEVANT MINIMAL PAGE */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 lg:py-12 space-y-8">
        
        {/* ========================================================== */}
        {/* 1. SECTION: QUOTE DETAILED APPROVAL VIEW ONLY              */}
        {/* ========================================================== */}
        {tokenRecord.type === 'quote-approval' && quoteData && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
              <div className="h-1.5 bg-brand-accent w-full" />
              
              {/* Header metadata */}
              <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                      <span className="p-1 px-2.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-md">
                      Official Quote
                    </span>
                    <span className="text-xs text-text-muted font-extrabold uppercase">
                      Issued: {quoteData.createdAt ? new Date(quoteData.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-text-main tracking-tight leading-none">Quote {quoteData.quoteNumber}</h1>
                  <p className="text-sm text-text-muted font-semibold mt-1.5">Prepared for your approval.</p>
                </div>

                <div className="text-left md:text-right">
                  <span className="text-[9px] font-black text-text-muted block uppercase tracking-wider mb-0.5">Quote total</span>
                  <span className="text-3xl font-black tracking-tighter text-brand-accent">
                    {quoteData.total ? formatZAR(quoteData.total) : 'R 0.00'}
                  </span>
                  <div className="mt-1.5">
                    <span className="text-[9px] text-text-muted font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                      Status: {quoteData.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Summary Table (Client Safe Fields Only) */}
              <div className="p-8 space-y-6">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block border-b border-slate-800 pb-2">Line level product descriptions</span>
                
                <div className="divide-y divide-slate-800">
                  {quoteData.items?.map((it, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-sm uppercase">{it.description}</h4>
                        <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {it.width && it.length && <span>Dim: {it.width} x {it.length} mm</span>}
                          {it.width && it.length && <span className="opacity-30">•</span>}
                          <span>Volume: {it.quantity} items</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Consolidated pricing</span>
                        <span className="font-black text-slate-100 text-sm italic">{formatZAR(it.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {quoteData.notes && (
                  <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl text-xs space-y-1 mt-4">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-indigo-400 block font-mono">Design layout specifications</span>
                    <p className="font-medium text-slate-300 whitespace-pre-line">{quoteData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 2. SECTION: ARTWORK / PROOF / JOB approval VIEW ONLY       */}
        {/* ========================================================== */}
        {(tokenRecord.type === 'artwork-approval' || tokenRecord.type === 'proof' || tokenRecord.type === 'job-approval') && jobData && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-slate-840 rounded-3xl shadow-xl overflow-hidden p-6 lg:p-8 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 bg-indigo-950/50 text-indigo-400 border border-indigo-800 px-2.5 py-1 rounded-md w-max">
                    <Sparkles size={11} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">SignPro Proof Review</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-100 tracking-tight uppercase italic">{jobData.productName || 'Order product'}</h1>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Reference identifier: {jobData.jobNumber}</span>
                </div>
                
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-left sm:text-right">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Approval Status</span>
                  <span className={cn(
                    "text-[10px] font-black border px-2.5 py-1 rounded-full uppercase tracking-wider",
                    jobData.artworkStatus === 'Approved' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-amber-950/50 text-amber-300 border-amber-800'
                  )}>
                    {jobData.artworkStatus || 'Awaiting Review'}
                  </span>
                </div>
              </div>

              {/* ARTWORK GALLERY PREVIEW ZONE */}
              {(jobData.artwork && jobData.artwork!.length > 0) ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col items-center">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-3 align-self-start">Proof version index: {currentArtIndex + 1} of {jobData.artwork!.length}</span>
                    
                    <div className="h-64 md:h-80 w-full flex items-center justify-center bg-slate-900 rounded-xl relative overflow-hidden text-white border border-slate-800">
                      <img 
                        src={jobData.artwork![currentArtIndex]?.url} 
                        alt="Prepress Artwork Proof Mockup" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="w-full flex items-center justify-between mt-3 text-slate-400 text-xs font-bold">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Slug ID: {jobData.artwork![currentArtIndex]?.id}</span>
                      <a 
                        href={jobData.artwork![currentArtIndex]?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-all font-extrabold uppercase bg-slate-905 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-indigo-805"
                      >
                        <Download size={13} /> Open High-Resolution File
                      </a>
                    </div>
                  </div>

                  {/* Multi proof slider paginator */}
                  {jobData.artwork!.length > 1 && (
                    <div className="flex gap-2 justify-center">
                      {jobData.artwork!.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentArtIndex(index)}
                          className={cn(
                            "w-8 h-8 rounded-lg font-black text-xs transition-all border",
                            currentArtIndex === index 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-150" 
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                          )}
                        >
                          v{index + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Artwork specifications */}
                  {jobData.artwork![currentArtIndex]?.technicalNotes && (
                    <div className="p-4 bg-amber-955/20 border border-amber-900/60 rounded-2xl text-xs space-y-1">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-300 block">Prepress technical notes</span>
                      <p className="font-medium text-slate-300">{jobData.artwork![currentArtIndex].technicalNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-12 bg-slate-900/30 shadow-inner border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <Eye size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">No layout mockups uploaded</span>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">Our pre-press design team is constructing visual vector cards. Please reload shortly.</span>
                </div>
              )}

              {/* Physical Job production timeline (For Job-Approval specific path) */}
              {tokenRecord.type === 'job-approval' && (
                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">SignPro Job Pipeline Tracker</span>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                      { name: 'Prepress', label: 'Setup Proofs' },
                      { name: 'Printing', label: 'Ink Presses' },
                      { name: 'Finishing', label: 'Cut & Laminates' },
                      { name: 'Quality Check', label: 'Defect Audit' },
                      { name: 'Ready', label: 'Packaged Stock' },
                      { name: 'Delivered', label: 'Delivered' }
                    ].map((step, sIdx) => {
                      const stepsArr = ['Prepress', 'Printing', 'Finishing', 'Quality Check', 'Ready', 'Delivered'];
                      const currentActiveIndex = stepsArr.indexOf(jobData.stage || 'Prepress');
                      const matchingIdx = stepsArr.indexOf(step.name);

                      const completed = matchingIdx < currentActiveIndex;
                      const active = matchingIdx === currentActiveIndex;

                      return (
                        <div 
                          key={step.name}
                          className={cn(
                            "p-3 rounded-xl border text-center flex flex-col items-center justify-between min-h-[95px] transition-all",
                            completed ? "bg-emerald-950/25 border-emerald-990 text-emerald-300" :
                            active ? "bg-indigo-600 border-indigo-500 text-white scale-105 shadow-lg shadow-indigo-950" :
                            "bg-slate-900 border-slate-850 text-slate-500"
                          )}
                        >
                          <span className="text-[8.5px] font-black uppercase block">{step.name}</span>
                          <div>
                            {completed ? <CheckCircle2 size={13} className="text-emerald-400" /> :
                             active ? <Clock className="animate-spin text-white" size={13} /> :
                             <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />}
                          </div>
                          <span className={cn(
                            "text-[7.5px] font-bold uppercase block leading-tight",
                            active ? "text-indigo-150" : "text-slate-500"
                          )}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* ACTION CONTROLS: COMMONS TO BOTH VIEW SCHEMES              */}
        {/* ========================================================== */}
        {!successRecorded && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6 animate-in hover:border-slate-750 transition-all">
            <div className="flex items-center gap-2 pb-3 border-b border-dashed border-slate-800">
              <Signature size={18} className="text-indigo-400" />
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-100">Auth & Secure Response Signature</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Digital ink drawing signature */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide flex justify-between">
                  <span>Draw secure ink signature *</span>
                  <button type="button" onClick={clearSignature} className="text-indigo-400 font-extrabold hover:underline uppercase text-[8.5px]">Clear drawpad</button>
                </span>
                <div className="relative border-2 border-dashed border-slate-700 bg-slate-900 rounded-2xl h-36 overflow-hidden cursor-crosshair">
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
                    className="w-full h-full bg-slate-900"
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-center flex-col p-4">
                      <Signature size={18} className="animate-pulse mb-1" />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">Draw signature on screen</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Text validations */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Authorized signatory full name *</label>
                  <input 
                    type="text"
                    placeholder="e.g. Director Janet Smith"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 focus:bg-slate-950 focus:border-indigo-805 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Comments or revision instructions (If requesting changes or modifications)</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide details on structural adjustments, proof reviews, text corrections or specs updates if rejecting or requesting revisions..."
                    value={clientComment}
                    onChange={(e) => setClientComment(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 focus:bg-slate-950 focus:border-indigo-805 outline-none resize-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-slate-400 select-none">
                  <input 
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-800 bg-slate-900 rounded focus:ring-0 mt-0.5"
                  />
                  <span className="text-[9.2px] font-bold leading-normal uppercase">
                    I acknowledge that clicking submit constitutes a legal signoff on layout dimensions, substrates list materials, and quoted price.
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons trigger */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                disabled={isSubmitting}
                onClick={() => handleApprovalAction(tokenRecord.type === 'quote-approval' ? 'Rejected' : 'Changes Requested')}
                className="px-6 py-3 border border-slate-800 text-[10px] bg-slate-900 hover:bg-slate-850 text-rose-400 font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                {tokenRecord.type === 'quote-approval' ? 'Reject Quote' : 'Request Alterations'}
              </button>
              
              <button
                disabled={isSubmitting || !acceptedTerms || !hasSigned || !signatureName.trim()}
                onClick={() => handleApprovalAction('Approved')}
                className={cn(
                  "px-8 py-3 text-[10px] text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-xl",
                  (isSubmitting || !acceptedTerms || !hasSigned || !signatureName.trim())
                    ? "bg-slate-800 border-none cursor-not-allowed text-slate-600 shadow-none"
                    : "bg-indigo-650 hover:-translate-y-0.5 hover:bg-indigo-700 shadow-indigo-950"
                )}
              >
                {isSubmitting ? 'Verifying Gateway...' : 'Approve & Finalise'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* SUCCESS TRANSACTION HUB                                    */}
        {/* ========================================================== */}
        {successRecorded && (
          <div className="bg-emerald-950/20 border border-emerald-900 p-8 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in duration-300">
            <CheckCircle2 size={42} className="mx-auto text-emerald-400 animate-bounce" />
            <h3 className="text-xl font-black text-emerald-300 uppercase italic tracking-tight">Transaction Handshake Secure</h3>
            <p className="text-xs font-extrabold text-emerald-400 uppercase">
              THE RESPONSE TO THIS {tokenRecord.type.replace('-approval', '').toUpperCase()} RECORD HAS BEEN RECORDED SUCCESSFULLY.
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Our active workflow pipeline on the boards has been synchronized immediately.</p>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 py-6 border-t border-indigo-955/20 text-center text-xs mt-auto font-bold uppercase tracking-wider shadow-inner">
        <p className="opacity-60 italic">SignPro Graphics ERP Network portal Gateway</p>
        <p className="text-[9px] opacity-40 mt-1">Transaction Handshake fully signed and verified</p>
      </footer>

    </div>
  );
}
