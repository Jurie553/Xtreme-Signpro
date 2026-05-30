import React, { useState } from 'react';
import { Play, Pause, CheckSquare, Camera, AlertCircle, Clock, User, ArrowRight, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface Stage {
  id: string;
  name: string;
  department: 'Prepress' | 'CTP Plates' | 'Press Floor' | 'Finishing' | 'Logistics';
  status: 'Pending' | 'Active' | 'Completed' | 'Blocked';
  durationMins: number;
  operator: string;
  machine?: string;
  photoUploaded?: boolean;
  notes?: string;
}

const INITIAL_STAGES: Stage[] = [
  { id: '1', name: 'File Preflight validation', department: 'Prepress', status: 'Completed', durationMins: 15, operator: 'Sarah Williams', notes: 'All items scaled correctly to trim size.' },
  { id: '2', name: 'CTP Cyan/Magenta/Yellow/Black Plates output', department: 'CTP Plates', status: 'Completed', durationMins: 30, operator: 'Dave Miller', machine: 'Fujifilm Trendsetter 800' },
  { id: '3', name: 'Ink duct calibration & paper alignment', department: 'Press Floor', status: 'Active', durationMins: 20, operator: 'Muzi Ndlovu', machine: 'Heidelberg Speedmaster SM 74 V' },
  { id: '4', name: 'High-speed Lithographic Offset printing run', department: 'Press Floor', status: 'Pending', durationMins: 45, operator: 'Muzi Ndlovu', machine: 'Heidelberg Speedmaster SM 74 V' },
  { id: '5', name: 'Thermostatic Pile air-drying', department: 'Press Floor', status: 'Pending', durationMins: 120, operator: 'Automatic Floor system', machine: 'Drying Rack B4' },
  { id: '6', name: 'Matt lamination surface coating', department: 'Finishing', status: 'Pending', durationMins: 35, operator: 'Chloe van Wyk', machine: 'Matrix Pneumatic 530' },
  { id: '7', name: 'Guillotine cutting & margins trim', department: 'Finishing', status: 'Pending', durationMins: 25, operator: 'Brandon Cox', machine: 'Polar 115 High-Speed Cutter' },
  { id: '8', name: 'Saddle Stitch bindery setup', department: 'Finishing', status: 'Pending', durationMins: 30, operator: 'Chloe van Wyk', machine: 'Horizon Stitchliner' },
  { id: '9', name: 'Kraftwrapping & pallets loading', department: 'Logistics', status: 'Pending', durationMins: 15, operator: 'Sam Peterson' }
];

export default function LithoWorkflowTab() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [selectedStageId, setSelectedStageId] = useState('3'); // Default active Heidelberg calibration

  // Operator Actions Hooks
  const [isPhotoSimOpen, setIsPhotoSimOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [delayWarning, setDelayWarning] = useState(false);

  const activeStage = stages.find(s => s.id === selectedStageId) || stages[0];

  const handleStageStatusChange = (stageId: string, newStatus: 'Pending' | 'Active' | 'Completed' | 'Blocked') => {
    setStages(prev => prev.map(s => {
      if (s.id === stageId) {
        return { ...s, status: newStatus };
      }
      return s;
    }));
    toast.success(`Stage "${stages.find(s => s.id === stageId)?.name}" status updated to ${newStatus}`);
  };

  const handleActionClick = (actionType: 'start' | 'pause' | 'complete' | 'flag_delay') => {
    if (actionType === 'start') {
      handleStageStatusChange(selectedStageId, 'Active');
    } else if (actionType === 'pause') {
      handleStageStatusChange(selectedStageId, 'Pending');
    } else if (actionType === 'complete') {
      // Auto advance to next stage if possible
      setStages(prev => {
        const copy = prev.map(s => s.id === selectedStageId ? { ...s, status: 'Completed' as const, photoUploaded: s.photoUploaded || false } : s);
        const currentIndex = prev.findIndex(s => s.id === selectedStageId);
        if (currentIndex !== -1 && currentIndex < prev.length - 1) {
          const nextStageId = prev[currentIndex + 1].id;
          setSelectedStageId(nextStageId);
          copy[currentIndex + 1].status = 'Active';
          toast.success(`Stage "${prev[currentIndex].name}" marked complete! Spooling next stage: ${prev[currentIndex + 1].name}`);
        } else {
          toast.success("All stages successfully finalized! Product is ready for dispatch!");
        }
        return copy;
      });
    } else if (actionType === 'flag_delay') {
      setStages(prev => prev.map(s => s.id === selectedStageId ? { ...s, status: 'Blocked' as const } : s));
      toast.error(`Production floor bottleneck reported on stage "${activeStage.name}"! Maintenance crew notified.`);
    }
  };

  const handleUploadPhotoMock = () => {
    setIsPhotoSimOpen(true);
    setTimeout(() => {
      setStages(prev => prev.map(s => s.id === selectedStageId ? { ...s, photoUploaded: true } : s));
      setIsPhotoSimOpen(false);
      toast.success("Quality control check photograph uploaded & cataloged!");
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* Workflow Stepper Navigation Sidebar */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="card-minimal p-6 border-slate-100 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-50 pb-2">
            Production Stage Flow
          </span>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {stages.map((stage, idx) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={cn(
                  "w-full text-left p-3 border rounded-xl flex items-center justify-between gap-4 transition-all duration-300 shadow-sm",
                  selectedStageId === stage.id 
                    ? "bg-slate-900 text-white border-slate-900 scale-[1.01]" 
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-55"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Color coded status indicators */}
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    stage.status === 'Completed' && "bg-emerald-500",
                    stage.status === 'Active' && "bg-blue-500 animate-pulse",
                    stage.status === 'Pending' && "bg-slate-300/80",
                    stage.status === 'Blocked' && "bg-red-500"
                  )} />
                  
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold tracking-tight block truncate leading-none mb-1">
                      {idx + 1}. {stage.name}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                      {stage.department} • Est: {stage.durationMins}m
                    </span>
                  </div>
                </div>

                {stage.status === 'Completed' && (
                  <span className="text-[8px] text-emerald-500 font-bold bg-emerald-50/10 px-1.5 py-0.5 rounded uppercase">Done</span>
                )}
                {stage.status === 'Active' && (
                  <span className="text-[8px] text-blue-500 font-bold bg-blue-50/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Run</span>
                )}
                {stage.status === 'Blocked' && (
                  <span className="text-[8px] text-red-500 font-bold bg-red-50/10 px-1.5 py-0.5 rounded uppercase">Delay</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Floor operator details and action simulator drawer */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-4 border-b border-slate-50 mb-6">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Active Operator Console</span>
                <h3 className="text-base font-black text-slate-800 mt-1 uppercase italic tracking-tight">{activeStage.name}</h3>
              </div>
              <span className={cn(
                "p-1 px-3 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                activeStage.status === 'Completed' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                activeStage.status === 'Active' && "bg-blue-50 text-blue-600 border-blue-100 animate-pulse",
                activeStage.status === 'Pending' && "bg-slate-50 text-slate-500 border-slate-100",
                activeStage.status === 'Blocked' && "bg-red-50 text-red-600 border-red-100"
              )}>
                {activeStage.status}
              </span>
            </div>

            {/* Stage Attributes */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100/40 mb-6 text-[11px]">
              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block mb-0.5">Assigned Lead Operator</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <User size={12} className="text-slate-400" />
                  {activeStage.operator}
                </div>
              </div>

              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block mb-0.5">Assigned Machine</span>
                <span className="font-bold text-slate-700">{activeStage.machine || 'Manual Station'}</span>
              </div>

              <div>
                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block mb-0.5">Targets Setup Slot</span>
                <span className="font-bold text-slate-700">{activeStage.durationMins} Minutes Run</span>
              </div>
            </div>

            {/* Quality control image review preview block */}
            <div className="mb-6 p-4 border border-slate-100 rounded-xl">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-2.5">Quality check and diagnostics</span>
              {activeStage.photoUploaded ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold flex items-center justify-between">
                  <span>📷 QC Photo approved: [Registered with Firestore job sequence log]</span>
                  <span className="text-[9px] font-bold uppercase py-0.5 px-2 bg-emerald-600 text-white rounded">PASS</span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 text-slate-500 rounded-lg text-center text-xs">
                  No Quality photo cataloged yet for this stage. Camera uploads are required as a release flag.
                </div>
              )}
            </div>
          </div>

          {/* Operator trigger and buttons simulator tools */}
          <div className="pt-6 border-t border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Operator Actions Simulator</span>
            
            <div className="flex flex-wrap gap-3">
              {activeStage.status !== 'Active' ? (
                <button 
                  type="button" 
                  onClick={() => handleActionClick('start')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Play size={13} fill="white" /> Start Job
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleActionClick('pause')}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Pause size={13} fill="white" /> Pause Job
                </button>
              )}

              <button 
                type="button" 
                onClick={handleUploadPhotoMock}
                disabled={isPhotoSimOpen}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-slate-200"
              >
                <Camera size={13} /> {isPhotoSimOpen ? 'Uploading...' : 'Log QC Photo'}
              </button>

              <button 
                type="button" 
                onClick={() => handleActionClick('flag_delay')}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <AlertCircle size={13} /> Log Bottleneck
              </button>

              <button 
                type="button" 
                onClick={() => handleActionClick('complete')}
                disabled={activeStage.status !== 'Active'}
                className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                Stage Done <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic workflow status warnings */}
        {stages.some(s => s.status === 'Blocked') && (
          <div className="card-minimal p-4 border-red-100 bg-red-50 text-[10px] text-red-800 flex items-start gap-2.5">
            <AlertCircle size={14} className="shrink-0" />
            <div>
              <span className="font-bold uppercase block mb-0.5">Floor Alert: Bottlenecks Detected</span>
              <span>One or more production stages are currently blocked. Technical maintenance crews have been notified.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
