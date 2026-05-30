import React from 'react';
import { X, Calendar, Clock, CheckCircle2, Layers, Wrench, Zap, Info, Scissors, Check, Printer, Edit2, Box, Book, ExternalLink, FileText, Settings, MessageCircle, Mail, Share2, Upload, Camera, Trash2, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Job, Client, Department, Machine, Material, CompanySettings, Product } from '../types';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { useCollection, updateDocument } from '../lib/firestoreService';
import { toast } from 'sonner';

interface JobDetailsModalProps {
  job: Job;
  clientId: string;
  clients: Client[];
  departments: Department[];
  machines: Machine[];
  materials: Material[];
  onClose: () => void;
  onEdit?: (job: Job) => void;
}

const stageStyles = {
  Prepress: "bg-purple-50 text-purple-600",
  Printing: "bg-blue-50 text-brand",
  Laminating: "bg-cyan-50 text-cyan-600",
  Finishing: "bg-indigo-50 text-indigo-600",
  'Quality Check': "bg-amber-50 text-amber-600",
  Ready: "bg-emerald-50 text-emerald-600",
  Delivered: "bg-emerald-500 text-white",
  Cancelled: "bg-gray-100 text-gray-500",
  Embroidery: "bg-pink-50 text-pink-600",
  Screenprinting: "bg-orange-50 text-orange-600",
};

export default function JobDetailsModal({ 
  job: initialJob, 
  clients,
  departments,
  machines,
  materials,
  onClose,
  onEdit 
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'details' | 'items' | 'artwork' | 'completion'>('details');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [job, setJob] = React.useState(initialJob);
  const [staffFeedback, setStaffFeedback] = React.useState<Record<string, string>>({});
  const completionFileRef = React.useRef<HTMLInputElement>(null);

  const handleAddStaffComment = async (artId: string) => {
    const feedbackText = staffFeedback[artId]?.trim();
    if (!feedbackText) return;

    setIsProcessing(true);
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      text: feedbackText,
      author: 'Staff' as const,
      createdAt: Date.now()
    };

    const updatedArtwork = job.artwork?.map(art => 
      art.id === artId 
        ? { ...art, comments: [...(art.comments || []), newComment] }
        : art
    );

    try {
      await updateDocument('jobs', job.id, { artwork: updatedArtwork });
      setStaffFeedback(prev => ({ ...prev, [artId]: '' }));
      setJob(prev => ({ ...prev, artwork: updatedArtwork }));
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  const { data: companySettingsList } = useCollection<CompanySettings>('company_settings');
  const company = companySettingsList[0];
  const { data: products } = useCollection<Product>('products');

  const client = clients.find(c => c.id === job.clientId);
  const dept = departments.find(d => d.id === job.departmentId);
  const machine = machines.find(m => m.id === job.assignedMachineId);

  const handleWhatsAppShare = async () => {
    if (!client || !company) return;
    setIsProcessing(true);
    try {
      await shareViaWhatsApp('artwork', job, client, company);
      toast.success('Approval link sent via WhatsApp');
    } catch (error) {
      toast.error('Failed to share via WhatsApp');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailShare = async () => {
    if (!client || !company) return;
    setIsProcessing(true);
    try {
      await shareViaEmail('artwork', job, client, company);
      toast.success('Approval link sent via Email');
    } catch (error) {
      toast.error('Failed to share via Email');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const newPhotos = await Promise.all(Array.from(files).map(async (file) => {
        return new Promise<{ id: string; url: string; uploadedAt: number; notes: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              url: event.target?.result as string,
              uploadedAt: Date.now(),
              notes: ''
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file as File);
        });
      }));

      const updatedPhotos = [...(job.completionPhotos || []), ...newPhotos];
      await updateDocument('jobs', job.id, { completionPhotos: updatedPhotos });
      setJob(prev => ({ ...prev, completionPhotos: updatedPhotos }));
      toast.success(`${files.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsProcessing(false);
      if (completionFileRef.current) completionFileRef.current.value = '';
    }
  };

  const removePhoto = async (photoId: string) => {
    const updatedPhotos = (job.completionPhotos || []).filter(p => p.id !== photoId);
    try {
      await updateDocument('jobs', job.id, { completionPhotos: updatedPhotos });
      setJob(prev => ({ ...prev, completionPhotos: updatedPhotos }));
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    }
  };

  const stages = [
    { id: 'Prepress', icon: Layers, label: 'Pre-Press' },
    { id: 'Printing', icon: Printer, label: 'Printing' },
    { id: 'Laminating', icon: Layers, label: 'Laminating' },
    { id: 'Finishing', icon: Scissors, label: 'Finishing' },
    { id: 'Embroidery', icon: Zap, label: 'Embroidery' },
    { id: 'Screenprinting', icon: Wrench, label: 'Screenprint' },
    { id: 'Quality Check', icon: Info, label: 'QA Check' },
    { id: 'Ready', icon: Check, label: 'Ready' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === job.stage);
  
  const calculateTimeProgress = () => {
    const total = job.dueDate - job.createdAt;
    const elapsed = Date.now() - job.createdAt;
    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    return Math.round(progress);
  };

  const timeProgress = calculateTimeProgress();
  const daysRemaining = Math.max(0, Math.ceil((job.dueDate - Date.now()) / (1000 * 60 * 60 * 24)));
  const isOverdue = Date.now() > job.dueDate;

  const tabs = [
    { id: 'details', label: 'Overview', icon: Info },
    { id: 'items', label: 'Production & Items', icon: Box },
    { id: 'artwork', label: 'Artwork Proofs', icon: Printer },
    { id: 'completion', label: 'Completion Vault', icon: Camera },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-text-main/20 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col relative printable-content"
      >
        <div className="p-8 border-b border-border bg-white relative z-10 no-print">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-brand/5 border border-brand/10 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none mb-1">Job #</span>
                <span className="text-xl font-black text-text-main italic leading-none">{job.jobNumber}</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-text-main tracking-tighter uppercase italic leading-none">{job.productName}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                    Live Production Board
                  </p>
                  <div className={cn(
                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                    job.priority === 'Urgent' ? "bg-red-500 text-white" : 
                    job.priority === 'High' ? "bg-orange-500 text-white" : 
                    "bg-blue-500 text-white"
                  )}>
                    {job.priority} Priority
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 mr-2 pr-4 border-r border-border">
                 <button 
                    disabled={isProcessing}
                    onClick={handleWhatsAppShare}
                    className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Share Proof via WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button 
                    disabled={isProcessing}
                    onClick={handleEmailShare}
                    className="p-3 bg-brand/5 border border-brand/10 rounded-xl text-brand hover:bg-brand hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Share Proof via Email"
                  >
                    <Mail size={20} />
                  </button>
               </div>
               <button 
                  onClick={() => window.print()}
                  className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand-accent transition-all shadow-sm group"
                  title="Print Job Card"
                >
                  <Printer size={20} />
                </button>
               {onEdit && (
                 <button 
                    onClick={() => onEdit(job)}
                    className="p-3 bg-white border border-border rounded-xl text-brand hover:bg-blue-50 transition-all shadow-sm group"
                  >
                    <Edit2 size={20} />
                  </button>
               )}
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all shadow-sm group">
                <X className="group-hover:rotate-90 transition-transform text-text-light" size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-border/50">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                    isActive ? "bg-white text-brand shadow-sm shadow-blue-100/50" : "text-text-muted hover:bg-white/50"
                  )}
                >
                  <TabIcon size={14} className={cn(isActive ? "text-brand" : "text-text-light opacity-50")} />
                  {tab.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-8 space-y-8 print:p-0">
            {activeTab === 'details' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Stage Progress Tracker */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-border relative overflow-hidden shadow-sm">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Operational Timeline</h3>
                        <p className="text-xs font-bold text-text-main mt-1">Stage {currentStageIndex + 1} of {stages.length}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm mb-2",
                          stageStyles[job.stage as keyof typeof stageStyles]
                        )}>
                          {job.stage}
                        </span>
                        <div className="flex items-center gap-2">
                           <div className="h-1.5 w-32 bg-surface rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
                                className="h-full bg-brand"
                              />
                           </div>
                           <span className="text-[10px] font-black text-brand tracking-tighter italic">
                              {Math.round(((currentStageIndex + 1) / stages.length) * 100)}%
                           </span>
                        </div>
                      </div>
                   </div>

                   <div className="relative flex justify-between px-2">
                      <div className="absolute top-5 left-0 w-full h-[2px] bg-border/20 z-0" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                        className="absolute top-5 left-0 h-[2px] bg-brand-accent z-0 transition-all duration-1000" 
                      />
                      
                      {stages.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isActive = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const isCompleted = idx < currentStageIndex;
                        
                        return (
                          <div key={stage.id} className="relative z-10 flex flex-col items-center">
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                              isCurrent ? "bg-brand text-white border-brand scale-125 shadow-xl shadow-brand/20 z-20" :
                              isCompleted ? "bg-emerald-500 text-white border-emerald-500" :
                              "bg-white text-text-light border-border/60 hover:border-brand/30"
                            )}>
                              {isCompleted ? <Check size={18} /> : <Icon size={16} />}
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-tighter mt-4 whitespace-nowrap",
                              isCurrent ? "text-brand" : isCompleted ? "text-emerald-600" : "text-text-light opacity-50"
                            )}>
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <motion.div 
                                layoutId="current-marker"
                                className="absolute -top-1 w-2 h-2 bg-brand rounded-full border-2 border-white animate-ping" 
                              />
                            )}
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Estimated Completion Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Completion Forecast</h3>
                        <p className="text-xs font-black text-text-main mt-1 italic">
                          {isOverdue ? 'PROJECT OVERDUE' : `Estimated completion in ${daysRemaining} days`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-xl font-black tabular-nums tracking-tighter italic",
                        isOverdue ? "text-red-500" : "text-brand"
                      )}>
                        {timeProgress}% <span className="text-[10px] uppercase not-italic opacity-40 ml-1">Elapsed</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-4 w-full bg-surface rounded-full overflow-hidden p-1 border border-border/30">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${timeProgress}%` }}
                        className={cn(
                          "h-full rounded-full shadow-lg relative overflow-hidden",
                          isOverdue ? "bg-red-500" : "bg-gradient-to-r from-brand to-brand-accent"
                        )}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </motion.div>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-[8px] font-black text-text-light uppercase tracking-widest">Started {new Date(job.createdAt).toLocaleDateString()}</span>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        isOverdue ? "text-red-500" : "text-text-light"
                      )}>Deadline {new Date(job.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-brand">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Fulfillment Recipient</p>
                        <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">{client?.companyName || client?.name || 'Unknown'}</h4>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-border/40">
                        <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Contact Identity</span>
                        <span className="text-[11px] font-black text-text-main tracking-tight italic">{client?.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-border/40">
                        <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Digital Channel</span>
                        <span className="text-[11px] font-black text-brand tracking-tight italic">{client?.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm hover:border-brand-accent/30 transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-amber-50/50 rounded-2xl flex items-center justify-center text-amber-600">
                        <Settings size={24} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Operational Cell</p>
                        <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">{dept?.name || 'Unallocated'}</h4>
                      </div>
                    </div>
                    <div className="bg-surface/40 p-4 rounded-2xl border border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Assigned Machine</span>
                          <span className="text-xs font-black text-text-main uppercase tracking-tight">{machine?.name || 'Automatic Allocation'}</span>
                        </div>
                        {machine && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black uppercase tracking-widest">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Configuration linked from Primary Product */}
                {job.items && job.items[0]?.type === 'Product' && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-brand border-dashed shadow-sm group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-brand">
                        <Wrench size={24} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Production Spec</p>
                        <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">Standard Configuration</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                       {(() => {
                         const firstItem = job.items[0];
                         const product = products.find(p => p.id === firstItem.originId);
                         if (!product) return null;
                         const defMachine = machines.find(m => m.id === product.defaultMachineId);
                         const defMaterial = materials.find(m => m.id === product.defaultMaterialId);
                         
                         return (
                           <>
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Default Machine</span>
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-brand">
                                   <Printer size={16} />
                                 </div>
                                 <span className="text-[13px] font-black text-text-main uppercase tracking-tight">{defMachine?.name || 'Manual Assign'}</span>
                               </div>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Primary Substrate</span>
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-brand">
                                   <Box size={16} />
                                 </div>
                                 <span className="text-[13px] font-black text-text-main uppercase tracking-tight">{defMaterial?.name || 'Custom Stock'}</span>
                               </div>
                             </div>
                           </>
                         );
                       })()}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Creation Log</p>
                        <p className="text-base font-black text-text-main italic tracking-tighter uppercase">{new Date(job.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-red-50/50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <Clock size={22} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Hard Deadline</p>
                        <p className="text-base font-black text-red-500 italic tracking-tighter uppercase">{new Date(job.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                   </div>
                </div>

                {job.ncrDetails && Object.values(job.ncrDetails).some(v => !!v) && (() => {
                  const layers = job.ncrDetails.layers || [];
                  const paperColorsVal = job.ncrDetails.paperColors || '';
                  const parsedColors = paperColorsVal.split('/').map(s => s.trim()).filter(Boolean);
                  
                  const fallbackLayers = parsedColors.map((color, idx) => {
                    let paperType: 'CB' | 'CFB' | 'CF' = 'CFB';
                    if (idx === 0) paperType = 'CB';
                    else if (idx === parsedColors.length - 1) paperType = 'CF';
                    
                    return {
                      id: `fallback-${idx}`,
                      name: `Part ${idx + 1}`,
                      purpose: idx === 0 ? 'Original Copy' : idx === parsedColors.length - 1 ? 'Client Copy' : 'Office Copy',
                      color: (['White', 'Pink', 'Yellow', 'Blue', 'Green'].includes(color) ? color : 'Custom') as any,
                      paperType: paperType,
                      gsm: 60,
                      printSides: 'Front Only' as any,
                      inkConfig: 'Single Color Black' as any,
                      numberingReq: (idx === 0 ? 'Sequential' : 'Shared') as any,
                      startNumber: job.ncrDetails.startNumber,
                      endNumber: job.ncrDetails.endNumber,
                      perforationReq: idx < parsedColors.length - 1,
                      variableDataReq: false
                    };
                  });

                  const activeLayers = layers.length > 0 ? layers : fallbackLayers;
                  
                  // Style details helper
                  const colorMap = {
                    White: { name: 'White NCR', bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-300' },
                    Pink: { name: 'Pink NCR', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
                    Yellow: { name: 'Yellow NCR', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
                    Blue: { name: 'Blue NCR', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
                    Green: { name: 'Green NCR', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
                    Custom: { name: 'Custom NCR', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' }
                  };

                  return (
                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-150 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                          <div className="flex items-center gap-3">
                            <Book className="text-indigo-500" size={20} />
                            <div>
                              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">NCR Manufacturing Blueprint</h3>
                              <p className="text-[9px] text-text-light uppercase tracking-wider mt-0.5">Multi-part chemical transfer carbonless sequences</p>
                            </div>
                          </div>

                          {/* Top Level specs highlights */}
                          <div className="flex gap-2.5 flex-wrap">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded-xl">
                              Edge: {job.ncrDetails.bindingEdge || job.ncrDetails.bindingPosition || 'Left side'}
                            </span>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[8px] font-black uppercase tracking-widest rounded-xl">
                              Wrap: {job.ncrDetails.coverType || job.ncrDetails.bindingType || 'Softback leather'}
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-xl">
                              {activeLayers.length} Dynamic Parts
                            </span>
                          </div>
                        </div>

                        {/* SPLIT PREVIEW AND SPEC MATRIX */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 text-left">
                          
                          {/* Left: Spec Table */}
                          <div className="lg:col-span-8 space-y-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Paper Set Layer Sequences</span>
                            <div className="space-y-3">
                              {activeLayers.map((layer, idx) => {
                                const cDat = colorMap[layer.color as keyof typeof colorMap] || colorMap.Custom;
                                return (
                                  <div 
                                    key={layer.id || idx}
                                    className={cn("p-4 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm", cDat.bg, cDat.border)}
                                  >
                                    <div className="flex items-start md:items-center gap-3">
                                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                        {idx + 1}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                                          {layer.name || `Layer ${idx + 1}`} 
                                          <span className="px-1.5 py-0.5 bg-slate-900/15 text-slate-800 font-mono text-[8px] rounded uppercase font-extrabold">{layer.paperType}</span>
                                          <span className="text-[10px] font-bold opacity-60 normal-case">({layer.gsm}gsm)</span>
                                        </p>
                                        <p className="text-[9px] font-bold uppercase tracking-normal text-slate-400 mt-0.5">
                                          Purpose: {layer.purpose} • Ink: {layer.inkConfig || 'Single Color Black'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Layer level properties */}
                                    <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest select-none">
                                      {layer.numberingReq !== 'None' && (
                                        <span className="px-2 py-0.5 bg-red-650 text-white rounded font-mono">
                                          Sequence: {layer.prefix || ''}{layer.startNumber || job.ncrDetails.startNumber || '001'}
                                        </span>
                                      )}
                                      {layer.perforationReq && (
                                        <span className="px-2 py-0.5 bg-slate-950/10 text-slate-850 rounded">
                                          Perforated
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right: Isometric Tilted Stack Visual */}
                          <div className="lg:col-span-4 bg-slate-50 border p-6 rounded-[2rem] flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-4">Isometric Stack Pre-View</span>
                            
                            <div className="relative h-44 w-full flex items-center justify-center mb-6">
                              <div className="relative w-36 h-36 flex flex-col-reverse justify-center items-center">
                                {activeLayers.map((layer, index) => {
                                  const cDat = colorMap[layer.color as keyof typeof colorMap] || colorMap.Custom;
                                  const offsetZ = index * 10;
                                  
                                  return (
                                    <div
                                      key={layer.id || index}
                                      className={cn(
                                        "absolute w-32 h-20 rounded-xl border shadow-md flex flex-col justify-between p-2.5 transition-transform",
                                        cDat.bg,
                                        cDat.border
                                      )}
                                      style={{
                                        transform: `rotateX(55deg) rotateZ(-22deg) translateY(${-offsetZ}px)`,
                                        zIndex: index + 10,
                                      }}
                                    >
                                      <div className="flex justify-between leading-none">
                                        <span className="text-[6px] px-1 bg-slate-900/10 text-slate-800 font-black rounded uppercase">{layer.paperType}</span>
                                        <span className="text-[5px] text-slate-400 font-bold">{layer.gsm}gsm</span>
                                      </div>
                                      <p className="text-[7px] font-black uppercase text-slate-850 truncate text-center">{layer.purpose}</p>
                                      <div className="flex justify-between items-end leading-none text-[5px] text-slate-450 font-black">
                                        <span>Part {index + 1}</span>
                                        {layer.numberingReq !== 'None' && <span className="text-red-650 font-mono">#NUM</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="w-full text-xs font-semibold space-y-1 text-slate-500 border-t pt-3">
                              <div className="flex justify-between">
                                <span className="text-[8px] uppercase font-black text-slate-400">Binding edge</span>
                                <span className="font-bold text-slate-700 uppercase tracking-tight text-[10px]">{job.ncrDetails.bindingEdge || 'Left Side'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[8px] uppercase font-black text-slate-400">Total Run Sets</span>
                                <span className="font-mono font-bold text-slate-700 text-[10px]">{((parseInt(job.ncrDetails.booksCount as any) || 10) * (parseInt(job.ncrDetails.setsPerBook as any) || 50))} Sets</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* OPERATOR BINDERY CARD */}
                      <div className="bg-slate-900 text-white p-7 rounded-[2.5rem] border border-slate-850 shadow-lg text-left">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded">Floor Protocol</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Manual GTO Collation</span>
                        </div>
                        
                        <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight italic mb-4">Production Floor Bindery Guide</h4>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-750">
                              <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1">Collation Assembly Order</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {activeLayers.map((l, i) => (
                                  <span 
                                    key={l.id || i}
                                    className={cn(
                                      "px-2 py-1 rounded text-[8px] font-black uppercase font-mono tracking-wider",
                                      l.color === 'White' ? 'bg-white text-slate-900' :
                                      l.color === 'Pink' ? 'bg-rose-500 text-white' :
                                      l.color === 'Yellow' ? 'bg-amber-500 text-slate-950' :
                                      l.color === 'Blue' ? 'bg-sky-500 text-white' :
                                      l.color === 'Green' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                                    )}
                                  >
                                    {i+1}. {l.paperType}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-750">
                              <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1">Sequential Number Ranges</span>
                              <p className="font-mono text-[11px] font-bold text-brand-accent tracking-tighter leading-none tabular-nums mt-0.5">
                                {job.ncrDetails.startNumber} <span className="text-slate-500">→</span> {job.ncrDetails.endNumber}
                              </p>
                              <span className="text-[7px] text-slate-500 uppercase block mt-1">Verify zero skipped ranges before stitch</span>
                            </div>

                            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-750">
                              <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1 font-mono">Quality Assurance Check</span>
                              <p className="text-[10px] font-bold text-slate-300 tracking-tight leading-relaxed">
                                Ensure first sheet is CB, middle sheets are CFB, bottom page is CF. Check perforation line creasing.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {activeTab === 'items' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Technical Blueprint Section (Moved to Items) */}
                {job.items && job.items.some(item => item.type === 'Product' && item.originId) && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm group">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-indigo-50/50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Wrench size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Infrastructure Blueprint</p>
                        <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">Default Production Parameters</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {Array.from(new Set(job.items.filter(item => item.type === 'Product' && item.originId).map(item => item.originId))).map(productId => {
                         const product = products.find(p => p.id === productId);
                         if (!product) return null;
                         const defMachine = machines.find(m => m.id === product.defaultMachineId);
                         const defMaterial = materials.find(m => m.id === product.defaultMaterialId);
                         
                         return (
                           <div key={productId} className="p-6 bg-surface/30 rounded-3xl border border-border/40 hover:border-brand/30 transition-colors">
                              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/20">
                                <h5 className="text-[11px] font-black text-text-main uppercase tracking-tight italic">{product.name}</h5>
                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded">System Defaults</span>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-60">Primary Machine</span>
                                    <div className="flex items-center gap-2">
                                      <Printer size={12} className="text-brand opacity-40" />
                                      <span className="text-[10px] font-black text-text-main uppercase tracking-tight">{defMachine?.name || 'Non-Standard'}</span>
                                    </div>
                                 </div>
                                 <div>
                                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-60">Base Material</span>
                                    <div className="flex items-center gap-2">
                                      <Box size={12} className="text-brand opacity-40" />
                                      <span className="text-[10px] font-black text-text-main uppercase tracking-tight">{defMaterial?.name || 'Manual Assign'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}
                {/* Materials Card */}
                {job.items?.some(item => item.materialId) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                      <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Raw Material Inventory</h3>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {job.items.filter(item => item.materialId).map((item, idx) => {
                        const mat = materials.find(m => m.id === item.materialId);
                        return (
                          <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6 shadow-sm group">
                             <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <Box size={24} />
                             </div>
                             <div className="flex-1">
                                <h5 className="text-sm font-black text-text-main uppercase tracking-tight">{mat?.name || 'Unknown Material'}</h5>
                                <div className="flex items-center gap-4 mt-2">
                                   <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{mat?.category || 'General'}</span>
                                   <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Qty: {item.quantity} {mat?.unit || 'Units'}</span>
                                </div>
                             </div>
                             {mat?.location && (
                               <div className="text-right">
                                  <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Storage Loc</p>
                                  <p className="text-xs font-black text-text-main uppercase">{mat.location}</p>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Product Items Bento */}
                {job.items && job.items.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                      <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Engineering Components</h3>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {job.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm group hover:border-brand/40 transition-all">
                           <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-text-light group-hover:bg-brand/5 group-hover:text-brand transition-all">
                                    <Layers size={24} />
                                 </div>
                                 <div>
                                    <h5 className="text-base font-black text-text-main uppercase tracking-tight leading-none mb-1">{item.description}</h5>
                                    <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{item.type} Component</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50">Volume Allocation</p>
                                 <p className="text-xl font-black text-text-main tracking-tighter italic tabular-nums">{item.quantity} <span className="text-[10px] opacity-40 not-italic">Units</span></p>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-12 py-6 border-t border-border/40">
                              {item.width && item.length && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Physical Dim</span>
                                  <span className="text-[11px] font-black text-text-main tabular-nums italic">{item.width}mm <span className="text-text-light mx-1">x</span> {item.length}mm</span>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Component Value</span>
                                <span className="text-[11px] font-black text-text-main tabular-nums italic">R {item.totalPrice.toLocaleString()}
                                  {item.discountValue ? (
                                    <span className="ml-2 text-[9px] text-red-500 line-through">
                                      R {item.basePrice?.toLocaleString()}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              {item.startNumber && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 pointer-events-none">Sequence Control</span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[11px] font-black text-blue-600 tabular-nums italic bg-blue-50/50 px-3 py-1 rounded-lg border border-blue-100/50">
                                       {item.startNumber} <span className="mx-1 opacity-40">→</span> {item.endNumber || 'END'}
                                     </span>
                                  </div>
                                </div>
                              )}
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 bg-brand p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Total Project Value</p>
                          <h4 className="text-3xl font-black tabular-nums tracking-tighter italic">R {job.total.toLocaleString()}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Tax Calculation</p>
                          <p className="text-sm font-black opacity-80 italic">Incl. 15% VAT</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'artwork' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Artwork Pipeline */}
                {job.artwork && job.artwork.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-4">
                          <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Visual Proof Protocol</h3>
                          <div className="h-px w-24 bg-border/50" />
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                            disabled={isProcessing}
                            onClick={handleWhatsAppShare}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={handleEmailShare}
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand/5 text-brand border border-brand/10 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all disabled:opacity-50"
                          >
                            <Mail size={12} /> Email
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                       {job.artwork.slice().reverse().map(art => (
                         <div key={art.id} className="bg-white p-6 rounded-[2.5rem] border border-border flex items-center gap-6 group hover:border-brand-accent/40 transition-all shadow-sm relative overflow-hidden">
                            <div 
                              onClick={() => window.open(art.url, '_blank')}
                              className="w-24 h-24 bg-surface rounded-[1.8rem] overflow-hidden flex-shrink-0 border border-border/40 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all relative"
                            >
                               {art.url.startsWith('data:application/pdf') ? (
                                 <div className="flex flex-col items-center">
                                   <FileText size={28} className="text-red-500" />
                                   <span className="text-[8px] font-black uppercase mt-1 tracking-widest">PDF Ready</span>
                                 </div>
                               ) : <img src={art.url} className="w-full h-full object-cover" />}
                               <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[7px] font-black text-white uppercase tracking-widest">
                                  v{art.version}.0
                               </div>
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-3 mb-2">
                                  <h6 className="text-[13px] font-black text-text-main uppercase tracking-tight truncate border-b-2 border-brand/10 italic">{art.name}</h6>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "text-[9px] font-black uppercase px-3 py-1 rounded-lg border tracking-widest flex items-center gap-2",
                                    art.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                    art.status === 'Changes Requested' ? "bg-red-50 text-red-600 border-red-100" :
                                    "bg-amber-50 text-amber-600 border-amber-100"
                                  )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                                      art.status === 'Approved' ? "bg-emerald-600" : 
                                      art.status === 'Changes Requested' ? "bg-red-600" :
                                      "bg-amber-600"
                                    )} />
                                {art.status}
                                   </span>
                                   <p className="text-[9px] text-text-light font-black uppercase tracking-widest opacity-40">Uploaded {new Date(art.uploadedAt).toLocaleDateString()}</p>
                                </div>

                                {/* Enhanced Feedback Thread */}
                                <div className="mt-4 border-t border-border/40 pt-4">
                                   <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                                      {(art.comments?.length || 0) === 0 ? (
                                        <p className="text-[9px] font-bold text-text-light uppercase tracking-widest opacity-50 italic">No feedback history collected</p>
                                      ) : (
                                        art.comments?.map((comment) => (
                                          <div 
                                            key={comment.id}
                                            className={cn(
                                              "p-3 rounded-xl text-[10px]",
                                              comment.author === 'Staff' ? "bg-brand/5 border border-brand/10 ml-4" : 
                                              comment.author === 'Client' ? "bg-emerald-50 border border-emerald-100 mr-4" :
                                              "bg-gray-50 border border-gray-100 italic"
                                            )}
                                          >
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="font-black uppercase tracking-widest text-[8px] opacity-70">
                                                {comment.author === 'Staff' ? 'Internal Response' : 
                                                 comment.author === 'Client' ? 'Client Feedback' : 'System Log'}
                                              </span>
                                              <span className="text-[8px] opacity-40">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="font-bold text-text-main leading-relaxed">{comment.text}</p>
                                          </div>
                                        ))
                                      )}
                                   </div>

                                   <div className="flex gap-2">
                                      <input 
                                        type="text"
                                        value={staffFeedback[art.id] || ''}
                                        onChange={(e) => setStaffFeedback(prev => ({ ...prev, [art.id]: e.target.value }))}
                                        placeholder="Add internal response..."
                                        className="flex-1 bg-surface border border-border/60 rounded-xl px-4 py-2 text-[11px] font-bold focus:outline-none focus:border-brand transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStaffComment(art.id)}
                                      />
                                      <button 
                                        onClick={() => handleAddStaffComment(art.id)}
                                        disabled={isProcessing || !staffFeedback[art.id]?.trim()}
                                        className="p-2 bg-brand text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                      >
                                        <Send size={14} />
                                      </button>
                                   </div>
                                </div>
                             </div>
                             <div className="flex flex-col gap-2">
                               <button 
                                 onClick={() => window.open(art.url, '_blank')}
                                 className="w-10 h-10 flex items-center justify-center text-brand bg-brand/5 hover:bg-brand/10 rounded-xl transition-all shadow-sm"
                               >
                                 <ExternalLink size={18} />
                               </button>
                               <button 
                                 onClick={async () => {
                                   if (!confirm('Permanently remove this artwork version?')) return;
                                   const updatedArtwork = job.artwork?.filter(a => a.id !== art.id);
                                   await updateDocument('jobs', job.id, { artwork: updatedArtwork });
                                   setJob(prev => ({ ...prev, artwork: updatedArtwork }));
                                   toast.success('Artwork removed');
                                 }}
                                 className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                               >
                                 <Trash2 size={18} />
                               </button>
                             </div>

                            {art.status === 'Approved' && (
                              <div className="absolute top-0 right-0 py-1 px-4 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-[0.2em] -rotate-12 translate-x-4 -translate-y-1 shadow-md">
                                Approved
                              </div>
                            )}
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-surface rounded-[2rem] flex items-center justify-center text-text-light/20 mb-6 border border-border/20">
                      <Layers size={40} />
                    </div>
                    <h4 className="text-xl font-black text-text-main tracking-tighter uppercase italic mb-2">No Artwork Uploaded</h4>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest max-w-[240px]">The visual proofing protocol has not been initiated for this production cycle.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'completion' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Completion & Delivery Evidence</h3>
                        <p className="text-xs font-bold text-text-main mt-1">Upload photos of the finished product(s)</p>
                      </div>
                      <button 
                        onClick={() => completionFileRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                      >
                        <Upload size={14} /> Upload Photos
                      </button>
                      <input 
                        type="file"
                        ref={completionFileRef}
                        accept="image/*"
                        multiple
                        onChange={handleCompletionFileUpload}
                        className="hidden"
                      />
                   </div>

                   {job.completionPhotos && job.completionPhotos.length > 0 ? (
                     <div className="grid grid-cols-2 gap-4">
                        {job.completionPhotos.map((photo) => (
                          <div key={photo.id} className="group relative aspect-square bg-surface rounded-3xl overflow-hidden border border-border/50">
                             <img 
                               src={photo.url} 
                               alt="Completed Work" 
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                             />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                               <button 
                                 onClick={() => window.open(photo.url, '_blank')}
                                 className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all"
                               >
                                 <ExternalLink size={20} />
                               </button>
                               <button 
                                 onClick={() => removePhoto(photo.id)}
                                 className="p-3 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500/40 transition-all border border-red-500/30"
                               >
                                 <Trash2 size={20} />
                               </button>
                             </div>
                             <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20">
                                   <p className="text-[8px] font-black text-white uppercase tracking-widest">{new Date(photo.uploadedAt).toLocaleString()}</p>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                        <Camera size={48} strokeWidth={1} className="mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest">No completion photos</h4>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-1">Capture the quality of your finished work</p>
                     </div>
                   )}
                </div>
              </motion.div>
            )}

            <div className="h-20" /> {/* Bottom Spacing */}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
