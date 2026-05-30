import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, MessageSquare, AlertCircle, Clock, Download, Image as ImageIcon, Send } from 'lucide-react';
import { getDocument, updateDocument } from '../lib/firestoreService';
import { Job, Quote } from '../types';
import { cn, addBusinessDays } from '../lib/utils';
import { toast } from 'sonner';

export default function ClientApproval() {
  const { jobId, quoteId } = useParams<{ jobId?: string, quoteId?: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('[DEBUG] ClientApproval component mounted');
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        if (jobId) {
          const data = await getDocument('jobs', jobId);
          if (data) {
            const jobData = data as Job;
            setJob(jobData);
            if (jobData.artwork && jobData.artwork.length > 0) {
              setSelectedArtworkId(jobData.artwork[jobData.artwork.length - 1].id);
              setFeedback(jobData.artwork[jobData.artwork.length - 1].feedback || '');
            }
          }
        } else if (quoteId) {
          const data = await getDocument('quotes', quoteId);
          if (data) {
            setQuote(data as Quote);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [jobId, quoteId]);

  useEffect(() => {
    if (job && selectedArtworkId) {
      const art = job.artwork?.find(a => a.id === selectedArtworkId);
      if (art) {
        setFeedback(art.feedback || '');
      }
    }
  }, [selectedArtworkId, job]);

  const handleQuoteAction = async (status: 'Accepted' | 'Rejected') => {
    if (!quoteId || !quote) return;
    setIsSubmitting(true);
    try {
      await updateDocument('quotes', quoteId, { status });
      setSuccess(true);
      setQuote({ ...quote, status });
    } catch (error) {
      console.error("Error updating quote:", error);
      toast.error("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Handle Quote View
  if (quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 lg:p-12 animate-in fade-in duration-700">
        <div className="w-full max-w-4xl flex flex-col gap-8">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-2xl border border-border flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="text-brand" size={24} />
                </div>
                <div className="px-4 py-1.5 bg-brand/5 border border-brand/10 rounded-full text-[10px] font-black text-brand uppercase tracking-widest">
                  Quote Review
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-text-main tracking-tighter uppercase italic leading-none">Quote {quote.quoteNumber}</h1>
              <p className="text-xs font-bold text-text-muted mt-3 uppercase tracking-widest">Status: {quote.status}</p>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Amount</span>
              <span className="text-4xl font-black text-brand italic tracking-tighter">
                {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(quote.total)}
              </span>
            </div>
          </header>

          <div className="bg-white rounded-[2.5rem] border border-border shadow-xl shadow-gray-200/50 overflow-hidden">
            <div className="p-8 border-b border-border bg-surface/50">
              <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Order Items</h3>
            </div>
            <div className="divide-y divide-border">
              {quote.items.map((item, idx) => (
                <div key={idx} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-text-main uppercase text-lg">{item.description}</h4>
                    {item.width && item.length && (
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">
                        {item.width}mm x {item.length}mm • Size
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">Qty</span>
                      <span className="font-black text-text-main">{item.quantity}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-1">Subtotal</span>
                      <span className="font-black text-text-main">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(item.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!success && quote.status !== 'Accepted' && quote.status !== 'Rejected' && (
            <div className="flex items-center justify-center gap-6">
              <button 
                onClick={() => handleQuoteAction('Rejected')}
                disabled={isSubmitting}
                className="px-12 py-5 bg-white text-red-600 border border-red-100 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all shadow-lg active:scale-95"
              >
                Reject Quote
              </button>
              <button 
                onClick={() => handleQuoteAction('Accepted')}
                disabled={isSubmitting}
                className="px-12 py-5 bg-emerald-500 text-white border border-emerald-400 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:-translate-y-1 transition-all active:scale-95"
              >
                Approve & Process
              </button>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 text-center animate-in fade-in zoom-in duration-500">
               <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
               <h3 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">Response Recorded</h3>
               <p className="text-emerald-700 font-bold mt-2">Thank you! Your response to this quote has been received.</p>
            </div>
          )}

          <footer className="flex items-center justify-center pt-8 border-t border-border mt-10">
            <p className="text-[9px] font-black text-text-light uppercase tracking-[0.4em] opacity-40 italic">Powered by Dynamic Print Hub Portal</p>
          </footer>
        </div>
      </div>
    );
  }

  if (!loading && !quote && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
          <h1 className="text-3xl font-black text-text-main tracking-tighter uppercase italic mb-4">Record Not Found</h1>
          <p className="text-text-muted font-bold">The link you followed is invalid or the document has been removed. Please contact us for a new link.</p>
        </div>
      </div>
    );
  }

  const artworks = job?.artwork || [];
  const currentArtwork = artworks.find(a => a.id === selectedArtworkId) || artworks[artworks.length - 1];

  if (jobId && (!job || artworks.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
          <h1 className="text-3xl font-black text-text-main tracking-tighter uppercase italic mb-4">Artwork Not Found</h1>
          <p className="text-text-muted font-bold">No artwork proofs have been uploaded for this job yet. Please check back later or contact production.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (status: 'Approved' | 'Changes Requested') => {
    if (!jobId || !job || !currentArtwork) return;
    setIsSubmitting(true);
    
    const newComment = feedback.trim() ? {
      id: Math.random().toString(36).substr(2, 9),
      text: feedback.trim(),
      author: 'Client' as const,
      createdAt: Date.now()
    } : null;

    const updatedArtwork = job.artwork?.map(art => {
      if (art.id === currentArtwork.id) {
        const existingComments = art.comments || [];
        const newComments = newComment ? [...existingComments, newComment] : existingComments;
        
        // Also add a system comment for status change if it's different
        const finalComments = art.status !== status ? [
          ...newComments,
          {
            id: Math.random().toString(36).substr(2, 9),
            text: `Artwork ${status === 'Approved' ? 'approved' : 'changes requested'} by client.`,
            author: 'System' as const,
            createdAt: Date.now()
          }
        ] : newComments;

        return { 
          ...art, 
          status, 
          feedback: feedback || art.feedback, // Keep legacy field updated too
          comments: finalComments
        };
      }
      return art;
    });

    try {
      const isApproved = status === 'Approved';
      const jobUpdates: Partial<Job> = { artwork: updatedArtwork };
      if (isApproved) {
        jobUpdates.artworkStatus = 'Approved';
        jobUpdates.artworkApprovedAt = Date.now();
        jobUpdates.dueDate = addBusinessDays(Date.now(), 5);
      }
      await updateDocument('jobs', jobId, jobUpdates);
      setSuccess(true);
      setFeedback(''); // Clear feedback after successful submit
      // Update local state
      if (updatedArtwork) {
        setJob({ 
          ...job, 
          artwork: updatedArtwork, 
          ...(isApproved ? { 
            artworkStatus: 'Approved', 
            artworkApprovedAt: jobUpdates.artworkApprovedAt, 
            dueDate: jobUpdates.dueDate 
          } : {}) 
        });
      }
    } catch (error) {
      console.error("Error updating artwork:", error);
      toast.error("Failed to submit appraisal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCommentOnly = async () => {
    if (!jobId || !job || !currentArtwork || !feedback.trim()) return;
    setIsSubmitting(true);
    
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      text: feedback.trim(),
      author: 'Client' as const,
      createdAt: Date.now()
    };

    const updatedArtwork = job.artwork?.map(art => 
      art.id === currentArtwork.id 
        ? { ...art, comments: [...(art.comments || []), newComment] }
        : art
    );

    try {
      await updateDocument('jobs', jobId, { artwork: updatedArtwork });
      setFeedback('');
      if (updatedArtwork) setJob({ ...job, artwork: updatedArtwork });
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="max-w-md bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-emerald-200/50">
          <CheckCircle2 size={80} className="mx-auto text-emerald-500 mb-8" />
          <h1 className="text-3xl font-black text-text-main tracking-tighter uppercase italic mb-4">Response Received</h1>
          <p className="text-text-muted font-bold mb-8">Thank you for your feedback! Our production team has been notified and will proceed accordingly.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:-translate-y-1 transition-all"
          >
            Review Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 lg:p-12 animate-in fade-in duration-700">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white rounded-2xl border border-border flex items-center justify-center shadow-sm">
                <ImageIcon className="text-brand" size={24} />
              </div>
              <div className="px-4 py-1.5 bg-brand/5 border border-brand/10 rounded-full text-[10px] font-black text-brand uppercase tracking-widest">
                Artwork Proofing
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-text-main tracking-tighter uppercase italic leading-none">{job.productName}</h1>
            <p className="text-xs font-bold text-text-muted mt-3 uppercase tracking-widest">Job #{job.jobNumber} • Prototype Review v{currentArtwork.version}</p>
            
            {job.ncrDetails && (job.ncrDetails.paperColors || job.ncrDetails.startNumber) && (
              <div className="mt-6 flex flex-wrap gap-4">
                {job.ncrDetails.paperColors && (
                  <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-[7px] font-black text-brand uppercase tracking-widest block mb-1">Color Sequence</span>
                    <span className="text-[10px] font-black text-text-main uppercase">{job.ncrDetails.paperColors}</span>
                  </div>
                )}
                {(job.ncrDetails.startNumber || job.ncrDetails.endNumber) && (
                  <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-[7px] font-black text-brand uppercase tracking-widest block mb-1">Numbering</span>
                    <span className="text-[10px] font-black text-text-main uppercase">{job.ncrDetails.startNumber} {job.ncrDetails.endNumber ? `— ${job.ncrDetails.endNumber}` : ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <div className={cn(
               "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
               currentArtwork.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
               currentArtwork.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
               "bg-red-50 text-red-600 border-red-100"
             )}>
               Status: {currentArtwork.status}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded-[2.5rem] border border-border shadow-xl shadow-gray-200/50 relative overflow-hidden group">
              <div className="aspect-[4/3] bg-gray-100 rounded-[2rem] overflow-hidden flex items-center justify-center relative">
                <img 
                  src={currentArtwork.url} 
                  alt={currentArtwork.name}
                  className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-xl shadow-gray-200/50 flex flex-col h-[700px]">
              <h3 className="text-lg font-black text-text-main uppercase tracking-tight mb-6 flex items-center gap-2">
                <MessageSquare className="text-brand" size={20} />
                Feedback Thread
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-thin">
                {(currentArtwork.comments?.length || 0) === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <MessageSquare size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No feedback yet</p>
                  </div>
                ) : (
                  currentArtwork.comments?.map((comment) => (
                    <div 
                      key={comment.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        comment.author === 'Client' ? "ml-auto items-end" : "mr-auto items-start",
                        comment.author === 'System' && "mx-auto w-full items-center opacity-60"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-[11px] font-bold",
                        comment.author === 'Client' ? "bg-brand text-white rounded-tr-none" : 
                        comment.author === 'Staff' ? "bg-surface border border-border rounded-tl-none text-text-main" :
                        "bg-gray-100 text-text-light italic text-[10px] text-center"
                      )}>
                        {comment.text}
                      </div>
                      <span className="text-[8px] font-black uppercase text-text-light mt-1 opacity-50 px-1">
                        {comment.author === 'System' ? 'System Notification' : comment.author} • {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter corrections or approval notes here..."
                    className="w-full h-24 px-6 py-4 bg-gray-50 border border-border rounded-3xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                  />
                  {feedback.trim() && (
                    <button 
                      onClick={handleAddCommentOnly}
                      disabled={isSubmitting}
                      className="absolute right-4 bottom-4 p-2 bg-brand text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                      title="Post message only"
                    >
                      <Send size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleAction('Changes Requested')}
                    disabled={isSubmitting}
                    className="py-4 bg-white text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={18} />
                    Request Changes
                  </button>
                  <button 
                    onClick={() => handleAction('Approved')}
                    disabled={isSubmitting}
                    className="py-4 bg-emerald-500 text-white border border-emerald-400 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Approve Version
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-brand text-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-200">
               <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                 <Clock size={20} />
                 Proof Gallery
               </h3>
               <div className="space-y-4">
                 {job.artwork?.map((art) => (
                   <button 
                     key={art.id} 
                     onClick={() => setSelectedArtworkId(art.id)}
                     className={cn(
                       "w-full text-left flex items-center justify-between p-4 rounded-2xl border transition-all",
                       selectedArtworkId === art.id 
                        ? "bg-white text-brand shadow-lg border-white" 
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                     )}
                   >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{art.name}</span>
                        <span className="text-[8px] font-bold opacity-60">Version {art.version} • {new Date(art.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                        art.status === 'Approved' ? "bg-emerald-500/20 border-emerald-400 text-emerald-100" :
                        art.status === 'Changes Requested' ? "bg-red-500/20 border-red-400 text-red-100" :
                        "bg-white/10 border-white/20 text-white"
                      )}>
                        {art.status}
                      </div>
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-center pt-8 border-t border-border mt-10">
          <p className="text-[9px] font-black text-text-light uppercase tracking-[0.4em] opacity-40 italic">Powered by Dynamic Print Hub Portal</p>
        </footer>
      </div>
    </div>
  );
}
