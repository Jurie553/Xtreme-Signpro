import React, { useState } from 'react';
import { CheckCircle2, XCircle, FileText, Send, Download, Clipboard, AlignLeft, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ApprovalLog {
  id: string;
  version: string;
  event: string;
  user: string;
  timestamp: string;
  notes?: string;
}

const INITIAL_LOGS: ApprovalLog[] = [
  { id: '1', version: 'V1.0', event: 'Artwork Proof generated and exported from Adobe CC', user: 'Sarah Williams (Operator)', timestamp: '2026-05-22 14:10' },
  { id: '2', version: 'V1.0', event: 'Proof sent to client via secure share link', user: 'Sarah Williams (Operator)', timestamp: '2026-05-22 14:15' },
  { id: '3', version: 'V1.0', event: 'Proof Rejected - Alterations requested', user: 'James Apex Corp (Client)', timestamp: '2026-05-23 09:40', notes: 'Logo color looks slightly off. Needs to match Pantone 293C exactly.' },
  { id: '4', version: 'V2.0', event: 'Color recalibrated and updated artwork uploaded', user: 'Sarah Williams (Operator)', timestamp: '2026-05-24 11:30' }
];

export default function LithoClientPortalTab() {
  const [approvalStatus, setApprovalStatus] = useState<'Pending' | 'Approved' | 'Changes Requested'>('Pending');
  const [digitalSign, setDigitalSign] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [logs, setLogs] = useState<ApprovalLog[]>(INITIAL_LOGS);
  const [isSigningOpen, setIsSigningOpen] = useState(false);

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalSign.trim()) {
      toast.error('Signature name is required for digital sign-off.');
      return;
    }

    const newLog: ApprovalLog = {
      id: String(logs.length + 1),
      version: 'V2.0-FINAL',
      event: 'Digital Proof signed off & approved for offset press printing',
      user: `${digitalSign} (Authorized Client Signature)`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setLogs([...logs, newLog]);
    setApprovalStatus('Approved');
    setIsSigningOpen(false);
    toast.success("Artwork officially approved! Job status updated. Production cycle set to 5 business days.");
  };

  const handleReject = () => {
    if (!clientFeedback.trim()) {
      toast.warning('Please outline comments or adjustments requested to reject this version.');
      return;
    }

    const newLog: ApprovalLog = {
      id: String(logs.length + 1),
      version: 'V2.0',
      event: 'Alterations requested by client',
      user: 'James Apex Corp (Client)',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: clientFeedback
    };

    setLogs([...logs, newLog]);
    setApprovalStatus('Changes Requested');
    setClientFeedback('');
    toast.info("Alteration feedback saved. Prepress operator team notified to adjust plates.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* Client approval panel and mock proof preview image */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-50 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-850 uppercase tracking-widest block">Authorized Sign-off Hub</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">High-end mock client proof checkout</p>
              </div>

              <span className={cn(
                "p-1 px-3 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                approvalStatus === 'Approved' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                approvalStatus === 'Pending' && "bg-amber-50 text-amber-600 border-amber-100",
                approvalStatus === 'Changes Requested' && "bg-red-50 text-red-600 border-red-100"
              )}>
                {approvalStatus}
              </span>
            </div>

            {/* High fidelity image preview mockup card */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-8 relative min-h-[220px] flex flex-col items-center justify-center text-center select-none mb-6">
              <div className="absolute top-3 left-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Digital Soft Proof (RGB Overlay)</div>
              
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-brand-accent shadow-sm mb-3">
                <FileText size={28} />
              </div>

              <span className="text-xs font-bold text-slate-700 block mb-0.5">APEX_CATALOG_SRA3_V2.PDF</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-4">SRA3 Layout Imposed • Multi-page composite proof</span>

              <button 
                type="button" 
                onClick={() => toast.success("Mock Proof downloaded successfully! (PDF/X standard)")}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={12} /> Download Proof
              </button>
            </div>

            {/* Approvals Feedback Text box */}
            {approvalStatus !== 'Approved' && (
              <div className="space-y-2 mb-6">
                <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest">Alterations and request feedback details</label>
                <textarea 
                  value={clientFeedback}
                  onChange={(e) => setClientFeedback(e.target.value)}
                  placeholder="Need shifts or Pantone adjustments? Outline them clearly..." 
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Interactive Trigger actions */}
          <div className="pt-6 border-t border-slate-100">
            {approvalStatus === 'Approved' ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-start gap-3 text-[11px] font-semibold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Approved & Checked out</span>
                  <span>This artwork has been digitally signed off. Plates exposed and sent to Heidelberg press slot automatically.</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsSigningOpen(true)}
                  className="flex-1 px-5 py-3 bg-brand-accent hover:bg-brand text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-brand-accent/5 transition-all"
                >
                  <UserCheck size={14} /> Approve Proof
                </button>
                <button 
                  type="button" 
                  onClick={handleReject}
                  className="flex-1 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  <XCircle size={14} /> Request Alterations
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit log workflow history bar wrapper */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex-1">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50 mb-4">
            <Clipboard size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Proofing Audit History</span>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {logs.slice().reverse().map((log) => (
              <div key={log.id} className="text-[11px] border-b border-slate-50 pb-3 last:border-0 relative">
                <div className="flex justify-between items-start mb-1">
                  <span className="p-0.5 px-2 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase">{log.version}</span>
                  <span className="text-[9px] text-slate-450 font-medium">{log.timestamp}</span>
                </div>
                <span className="font-bold text-slate-700 block mb-0.5 leading-snug">{log.event}</span>
                <span className="text-[9.5px] text-slate-450 block font-medium">Logged by: {log.user}</span>
                {log.notes && (
                  <div className="mt-1.5 p-2 bg-red-55 border border-red-100/30 rounded text-red-800 text-[10px] italic">
                    📍 Feedback: "{log.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Digital Hand Signature Modal Overlay */}
      <AnimatePresence>
        {isSigningOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 border border-slate-100 text-left"
            >
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Digital Consent signature</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">By typing your authorized name, you agree that proofs are verified and ready for commercial high-speed offset runs.</p>

              <form onSubmit={handleApprove} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Signatory Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={digitalSign}
                    onChange={(e) => setDigitalSign(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold leading-none focus:outline-none"
                    placeholder="e.g. James Peterson Apex Corp"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                  <button 
                    type="button" 
                    onClick={() => setIsSigningOpen(false)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-brand-accent hover:bg-brand text-white rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  >
                    Sign & Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
