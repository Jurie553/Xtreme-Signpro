import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Check, AlertTriangle, Clock, Users, ArrowRight, CornerDownRight, Activity } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRWorkflowTabProps {
  selectedBook: NCRBook | null;
}

interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  operator: string;
  estDuration: string;
  actualDuration: string;
  progress: number;
  status: 'pending' | 'running' | 'paused' | 'completed';
  dependencies?: string[];
}

export default function NCRWorkflowTab({ selectedBook }: NCRWorkflowTabProps) {
  const [stages, setStages] = useState<WorkflowStage[]>([
    { id: 'S1', name: 'Artwork Preflight & Safezones', description: 'Validate ink margins, numbering placement, and perforation pull-off boundaries', operator: 'Sarah (Preflight Eng)', estDuration: '1.5 hrs', actualDuration: '1.2 hrs', progress: 100, status: 'completed' },
    { id: 'S2', name: 'Heidelberg Plate-making', description: 'Output aluminium composite plates for face litho ink layers & reverse T&Cs', operator: 'Guillaume (Lead Litho)', estDuration: '2.0 hrs', actualDuration: '2.1 hrs', progress: 100, status: 'completed' },
    { id: 'S3', name: 'Offset Press Duplication Run', description: 'Main speed run across multi-part carbonless reels (CB/CFB/CF layers)', operator: 'Guillaume (Lead Litho)', estDuration: '3.5 hrs', actualDuration: '1.0 hrs', progress: 35, status: 'running' },
    { id: 'S4', name: 'GTO Heidelberg Rotary Numbering', description: 'Mechanical wheel strike for sequential impact numbering in red ink tint', operator: 'Dimitri (GTO Wheels)', estDuration: '2.5 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S3'] },
    { id: 'S5', name: 'Horizon Sheeting & Collation', description: 'Stack collating sorting of White &gt; Yellow &gt; Pink sheets in chemical receipt sequence', operator: 'Amelia (Collation Sta)', estDuration: '3.0 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S4'] },
    { id: 'S6', name: 'Block Padding & Fan-Apart Gluing', description: 'Clamp sheets and apply proprietary fan-apart carbonless adhesive compound', operator: 'Amelia (Collation Sta)', estDuration: '2.0 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S5'] },
    { id: 'S7', name: 'Guillotine Trimming & Spine Wrap', description: 'Trim blocks down to finished size and wrap staple binding in crocodile board spine tapes', operator: 'Gerrit (Polar Guillotine)', estDuration: '1.5 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S6'] },
    { id: 'S8', name: 'QC Sequence Audit', description: 'Visual pull-tests, continuous sequence audit, and transfer testing', operator: 'Thabo (QC Quality)', estDuration: '1.0 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S7'] },
    { id: 'S9', name: 'Sealing, Boxing & Courier Dispatch', description: 'Shrink wrapping in lots of 5 pads, boxing, and dispatching to delivery', operator: 'Thabo (QC Quality)', estDuration: '0.5 hrs', actualDuration: '0 hrs', progress: 0, status: 'pending', dependencies: ['S8'] }
  ]);

  const [selectedStageId, setSelectedStageId] = useState<string>('S3');
  const [delayReason, setDelayReason] = useState('');
  const [delayLogs, setDelayLogs] = useState<string[]>([
    'Collation clamp station flagged: awaiting adhesive cure compound shipment.',
    'GTO Rotary Wheel adjusted for high humidity paper stretch (+0.2mm).'
  ]);

  const activeStage = useMemo(() => {
    return stages.find(s => s.id === selectedStageId);
  }, [stages, selectedStageId]);

  const triggerStageAction = (stageId: string, action: 'start' | 'pause' | 'complete') => {
    setStages(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;

      let newStatus = stage.status;
      let newProgress = stage.progress;

      if (action === 'start') {
        newStatus = 'running';
        if (newProgress === 0) newProgress = 5;
        toast.success(`Workflow: Started GTO station run for ${stage.name}`);
      } else if (action === 'pause') {
        newStatus = 'paused';
        toast.warning(`Workflow: Paused station run for ${stage.name}`);
      } else if (action === 'complete') {
        newStatus = 'completed';
        newProgress = 100;
        toast.success(`Workflow: Completed manufacturing stage ${stage.name}!`);
      }

      return {
        ...stage,
        status: newStatus,
        progress: newProgress
      };
    }));
  };

  const handleLogDelay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayReason.trim()) return;
    setDelayLogs(prev => [delayReason, ...prev]);
    setDelayReason('');
    
    // Toggle active stage to paused
    if (activeStage) {
      triggerStageAction(activeStage.id, 'pause');
    }
    toast.error('Workflow: Logged bottleneck delay event.');
  };

  const overallProgress = useMemo(() => {
    const totalProgress = stages.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(totalProgress / stages.length);
  }, [stages]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Production Timeline Steps */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-5">
            <div>
              <span className="text-[8px] bg-slate-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                FLOOR PRODUCTION ROUTING
              </span>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
                Dynamic Stage Routing Slip
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Check and monitor current printing, collating, mechanical numbering and binding steps.
              </p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">OVERALL BATCH PROG</span>
              <strong className="text-xl font-black text-slate-800 tracking-tight tabular-nums italic mt-0.5">{overallProgress}%</strong>
            </div>
          </div>

          <div className="space-y-4">
            {stages.map((stage, sIdx) => {
              const isSelected = selectedStageId === stage.id;
              const statusColors = {
                pending: 'border-slate-100 text-slate-400 bg-slate-50/50',
                running: 'border-blue-200 text-blue-700 bg-blue-50/30 ring-1 ring-blue-200 animate-pulse-slow',
                paused: 'border-red-200 text-red-600 bg-red-50/30 ring-1 ring-red-200',
                completed: 'border-slate-300 text-slate-500 bg-slate-50/30'
              };

              return (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-4 relative group",
                    isSelected 
                      ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900" 
                      : "bg-slate-50/40 border-slate-100 hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-3.5 w-full md:w-auto">
                    {/* Index Counter Indicator */}
                    <div className={cn(
                      "w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black italic shadow-inner shrink-0",
                      stage.status === 'completed' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"
                    )}>
                      {stage.status === 'completed' ? <Check size={12} strokeWidth={3} /> : `#${sIdx + 1}`}
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase italic block leading-none">
                        {stage.name}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest block mt-1">
                        Est: {stage.estDuration} • Operator: {stage.operator}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {/* Status badge chip */}
                    <span className={cn(
                      "text-[7px] font-black uppercase px-2 py-0.5 rounded",
                      stage.status === 'completed' && "bg-slate-100 text-slate-600",
                      stage.status === 'running' && "bg-blue-100 text-blue-700",
                      stage.status === 'paused' && "bg-red-105 text-red-600",
                      stage.status === 'pending' && "bg-slate-50 text-slate-400"
                    )}>
                      {stage.status}
                    </span>

                    {/* Progress Slider Pill */}
                    <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 hidden sm:block">
                      <div className="bg-slate-900 h-full rounded-full transition-all duration-500" style={{ width: `${stage.progress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-700 w-8 text-right tabular-nums italic shrink-0">{stage.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Operator station active desk controls */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          {activeStage ? (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                  OPERATOR WORKSTATION ACCESS
                </span>
                <h4 className="text-base font-black uppercase text-slate-800 tracking-tight italic mt-2.5 leading-tight">
                  {activeStage.name}
                </h4>
                <p className="text-[9px] text-slate-455 font-bold uppercase mt-1">
                  Active Station Lead: {activeStage.operator}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] text-slate-600 font-bold leading-relaxed uppercase">
                "{activeStage.description}"
              </div>

              <div className="space-y-3">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Floor Console Trigger Actions</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerStageAction(activeStage.id, 'start')}
                    disabled={activeStage.status === 'running' || activeStage.status === 'completed'}
                    className="py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-1"
                  >
                    <Play size={14} strokeWidth={3} />
                    <span>Run Run</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerStageAction(activeStage.id, 'pause')}
                    disabled={activeStage.status !== 'running'}
                    className="py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-1"
                  >
                    <Pause size={14} strokeWidth={3} />
                    <span>Pause Jam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerStageAction(activeStage.id, 'complete')}
                    disabled={activeStage.status === 'completed'}
                    className="py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-1"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Pass Q.C.</span>
                  </button>
                </div>
              </div>

              {/* Progress Slider details */}
              <div className="space-y-2 border-t border-slate-100 pt-5">
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                  <span>TICKET PRODUCTION PERCENT</span>
                  <span className="tabular-nums font-black italic">{activeStage.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeStage.progress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStages(prev => prev.map(s => s.id === activeStage.id ? { ...s, progress: val } : s));
                  }}
                  className="w-full accent-slate-900 bg-slate-100 rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              Select a step above to load operator controls console
            </div>
          )}
        </div>

        {/* Dynamic Delay / Obstacle Reporting */}
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 block">
            <span className="text-[8px] bg-red-50 text-red-600 border border-red-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              BOTTLENECK EXCEPTION LOGS
            </span>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 mt-2.5">
              Report Operator Line Downtimes
            </h4>
          </div>

          <form onSubmit={handleLogDelay} className="flex gap-2">
            <input
              type="text"
              required
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="e.g. Mechanical rotary sequential ink wheel jam..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
            >
              Log Block
            </button>
          </form>

          <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin border-t border-slate-100 pt-4">
            {delayLogs.map((log, idx) => (
              <div key={idx} className="p-3 bg-red-50/40 border border-red-100/50 rounded-xl flex items-start gap-2">
                <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-[8px] text-red-800 font-extrabold uppercase leading-normal tracking-wide">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
