import React, { useState } from 'react';
import { Search, Filter, Edit2, Share2, Trash2, CheckCircle2, Clock, AlertTriangle, Calendar, X, ChevronUp, ChevronDown, Plus, Mail, MessageCircle, FileText, ExternalLink, Printer, Settings, Wrench, Layers, Scissors, Check, Zap, Info, Book, Box } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Job, Client, Department, CompanySettings, Machine, Material } from '../types';
import JobModal from '../components/JobModal';
import JobDetailsModal from '../components/JobDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const priorityStyles = {
  Urgent: "bg-red-50 text-red-600 border border-red-100",
  High: "bg-orange-50 text-orange-600 border border-orange-100",
  Normal: "bg-blue-50 text-brand border border-blue-100",
};

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

export default function Jobs() {
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: departments, loading: deptsLoading } = useCollection<Department>('departments');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: materials } = useCollection<Material>('materials');
  const { data: companyList } = useCollection<CompanySettings>('company_settings');

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const company = companyList.find(c => c.id === 'company') || companyList[0];
  
  const loading = jobsLoading || clientsLoading || deptsLoading;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [createdStart, setCreatedStart] = useState('');
  const [createdEnd, setCreatedEnd] = useState('');
  const [dueStart, setDueStart] = useState('');
  const [dueEnd, setDueEnd] = useState('');
  const [sortField, setSortField] = useState<keyof Job | 'clientName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJobDetails, setViewingJobDetails] = useState<Job | null>(null);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.companyName || client.name) : 'Unknown';
  };

  const filteredJobs = jobs.filter(job => {
    const clientName = (job.clientName || getClientName(job.clientId)).toLowerCase();
    const jobNum = job.jobNumber.toLowerCase();
    const matchesSearch = clientName.includes(searchTerm.toLowerCase()) || 
                          jobNum.includes(searchTerm.toLowerCase()) || 
                          (job.productName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const createdAt = job.createdAt || 0;
    const dueDate = job.dueDate || 0;

    const matchesCreated = (!createdStart || createdAt >= new Date(createdStart).getTime()) &&
                           (!createdEnd || createdAt <= new Date(createdEnd).setHours(23, 59, 59, 999));

    const matchesDue = (!dueStart || dueDate >= new Date(dueStart).getTime()) &&
                       (!dueEnd || dueDate <= new Date(dueEnd).setHours(23, 59, 59, 999));

    return matchesSearch && matchesCreated && matchesDue;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let valA: any = sortField === 'clientName' ? (a.clientName || getClientName(a.clientId)) : a[sortField as keyof Job];
    let valB: any = sortField === 'clientName' ? (b.clientName || getClientName(b.clientId)) : b[sortField as keyof Job];

    if (valA === valB) return 0;
    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    const comparison = valA < valB ? -1 : 1;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: keyof Job | 'clientName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof Job | 'clientName' }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />;
  };

  const handleStageChange = async (id: string, stage: Job['stage']) => {
    console.log('Button Click: Change Job Stage', { id, stage });
    setIsUpdating(id);
    try {
      await updateDocument('jobs', id, { stage });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Job', { id });
    setJobToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    setIsUpdating(jobToDelete);
    try {
      await deleteDocument('jobs', jobToDelete);
      toast.success('Production job cancelled and archived.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to cancel job.');
    } finally {
      setIsUpdating(null);
      setJobToDelete(null);
    }
  };

  const handleEdit = (job: Job) => {
    console.log('Button Click: Edit Job', { id: job.id });
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const liveEditingJob = editingJob ? jobs.find(j => j.id === editingJob.id) : null;
  const liveViewingJob = viewingJobDetails ? jobs.find(j => j.id === viewingJobDetails.id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Jobcards</h2>
          <p className="page-subtitle mt-1">Track production details, deadlines, artwork approvals, and job status.</p>
        </div>
        <button 
          onClick={() => { setEditingJob(null); setIsModalOpen(true); }}
          className="px-8 py-4 bg-brand text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center gap-3"
        >
          <Plus size={18} strokeWidth={3} />
          New Jobcard
        </button>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group w-full max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client, job # or product..." 
              className="w-full pl-14 pr-6 py-4 bg-paper border border-border/80 rounded-3xl text-[11px] font-black uppercase tracking-[0.05em] focus:outline-none focus:ring-[8px] focus:ring-brand-accent/5 focus:border-brand-accent/40 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setCreatedStart(''); setCreatedEnd('');
                setDueStart(''); setDueEnd('');
                setSearchTerm('');
              }}
              className="px-6 py-4 bg-surface text-text-light hover:text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all active:scale-95 flex items-center gap-2"
            >
              <X size={14} strokeWidth={3} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-surface/50 rounded-[2.5rem] border border-border/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-brand-accent" />
              <h3 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">Created Date Range</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input 
                  type="date" 
                  value={createdStart}
                  onChange={(e) => setCreatedStart(e.target.value)}
                  className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
                />
              </div>
              <span className="text-text-light font-black">to</span>
              <div className="flex-1">
                <input 
                  type="date" 
                  value={createdEnd}
                  onChange={(e) => setCreatedEnd(e.target.value)}
                  className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-brand-accent" />
              <h3 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">Due Date Range</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input 
                  type="date" 
                  value={dueStart}
                  onChange={(e) => setDueStart(e.target.value)}
                  className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
                />
              </div>
              <span className="text-text-light font-black">to</span>
              <div className="flex-1">
                <input 
                  type="date" 
                  value={dueEnd}
                  onChange={(e) => setDueEnd(e.target.value)}
                  className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-minimal p-0 overflow-hidden border-border/40 relative">
        <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="bg-surface/50 border-b border-border/50">
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('jobNumber')}
                >
                  <div className="flex items-center">Job # <SortIcon field="jobNumber" /></div>
                </th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('clientName')}
                >
                  <div className="flex items-center">Client & Product <SortIcon field="clientName" /></div>
                </th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Dept</th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('createdAt')}
                >
                  <div className="flex items-center">Created <SortIcon field="createdAt" /></div>
                </th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('dueDate')}
                >
                  <div className="flex items-center">Deadline <SortIcon field="dueDate" /></div>
                </th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] text-center cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('priority')}
                >
                  <div className="flex items-center justify-center">Priority <SortIcon field="priority" /></div>
                </th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] text-center cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('stage')}
                >
                  <div className="flex items-center justify-center">Stage <SortIcon field="stage" /></div>
                </th>
                <th 
                  className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.3em] text-center cursor-pointer hover:text-brand-accent transition-colors"
                  onClick={() => toggleSort('artworkStatus')}
                >
                  <div className="flex items-center justify-center">Artwork <SortIcon field="artworkStatus" /></div>
                </th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedJobs.map((job, idx) => (
                <tr 
                  key={job.id} 
                  onClick={() => {
                    setViewingJobDetails(job);
                    setIsDetailsOpen(true);
                  }}
                  className={cn(
                    "hover:bg-brand-accent/[0.02] transition-colors group animate-in fade-in slide-in-from-left-2 fill-mode-both relative cursor-pointer",
                    isUpdating === job.id && "opacity-50 pointer-events-none"
                  )}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {isUpdating === job.id && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                    </div>
                  )}
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-black text-brand-accent tracking-tighter tabular-nums px-3 py-1 bg-blue-50 rounded-lg w-fit">#{job.jobNumber}</span>
                      <span className="text-[9px] text-text-light font-bold uppercase tracking-widest opacity-60">ID: {job.id.substring(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-text-main font-black tracking-tighter group-hover:text-brand-accent transition-colors italic">{getClientName(job.clientId)}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none">{job.productName || 'Custom Fabrication'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    {job.departmentId ? (
                      <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-lg">
                        {departments.find(d => d.id === job.departmentId)?.name || 'Unknown'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-30">Unassigned</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-[10px] text-text-muted font-black tabular-nums tracking-widest uppercase">
                    {new Date(job.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-2">
                      <div className={cn(
                        "flex items-center gap-2 text-[10px] font-black tabular-nums tracking-widest uppercase transition-colors",
                        job.dueDate < Date.now() && job.stage !== 'Delivered' && job.stage !== 'Cancelled' ? "text-red-500" : "text-text-muted"
                      )}>
                        <Clock size={12} className={cn(
                          job.dueDate < Date.now() && job.stage !== 'Delivered' && job.stage !== 'Cancelled' ? "text-red-500" : "text-text-light opacity-50"
                        )} />
                        {new Date(job.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {job.dueDate < Date.now() && job.stage !== 'Delivered' && job.stage !== 'Cancelled' && (
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1 w-fit">
                          <AlertTriangle size={8} /> OVERDUE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm inline-block min-w-24",
                      priorityStyles[job.priority as keyof typeof priorityStyles]
                    )}>
                      {job.priority}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="relative group/sel inline-block">
                      <select 
                        value={job.stage}
                        onChange={(e) => handleStageChange(job.id, e.target.value as any)}
                        className={cn(
                          "appearance-none px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-center focus:outline-none cursor-pointer border shadow-sm transition-all hover:scale-105 active:scale-95 min-w-32",
                          stageStyles[job.stage as keyof typeof stageStyles]
                        )}
                      >
                        {Object.keys(stageStyles).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center" onClick={(e) => e.stopPropagation()}>
                    {job.artworkStatus === 'Approved' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-emerald-500 font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 size={12} strokeWidth={3} />
                          </div>
                          Verified
                        </span>
                        {job.artworkApprovedAt && (
                          <span className="text-[9px] font-bold text-text-light uppercase tracking-wider">
                            Appr: {new Date(job.artworkApprovedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ) : job.artworkStatus === 'Pending' ? (
                      <div className="flex flex-col items-center gap-2 mx-auto w-fit">
                        <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em] bg-amber-50 px-3 py-1.5 rounded-full flex items-center justify-center gap-2 border border-amber-100/50 shadow-sm">
                          <Clock size={10} strokeWidth={3} className="animate-pulse" />
                          In-Review
                        </span>
                        
                        {(() => {
                          const deadline = job.artworkDeadline || (job.createdAt + 3 * 24 * 60 * 60 * 1000);
                          const isOverdue = deadline < Date.now();
                          const daysLeft = Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000));
                          return (
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                              isOverdue 
                                ? "text-red-500 bg-red-50 border border-red-100" 
                                : "text-slate-500 bg-slate-50"
                            )}>
                              {isOverdue 
                                ? `Overdue by ${Math.abs(daysLeft)}d` 
                                : `${daysLeft} days left`
                              }
                            </span>
                          );
                        })()}

                        <div className="flex items-center gap-1 mt-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const client = clients.find(c => c.id === job.clientId);
                              if (client) shareViaWhatsApp('artwork', job, client, company);
                            }}
                            title="Share Artwork Proof via WhatsApp"
                            className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          >
                            <MessageCircle size={12} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const client = clients.find(c => c.id === job.clientId);
                              if (client) shareViaEmail('artwork', job, client, company);
                            }}
                            title="Share Artwork Proof via Email"
                            className="p-2 bg-brand/5 text-brand border border-brand/10 rounded-lg hover:bg-brand hover:text-white transition-all shadow-sm"
                          >
                            <Mail size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-text-light font-black opacity-30">—</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(job); }}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-blue-50/50 rounded-2xl transition-all"
                        title="Edit Job"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setViewingJobDetails(job);
                          setIsDetailsOpen(true);
                          setTimeout(() => window.print(), 500);
                        }}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-blue-50/50 rounded-2xl transition-all"
                        title="Print Job Card"
                      >
                        <Printer size={16} strokeWidth={2.5} />
                      </button>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const client = clients.find(c => c.id === job.clientId);
                            if (client) shareViaWhatsApp('job', job, client, company);
                          }}
                          title="Share update via WhatsApp"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-emerald-50/50 rounded-2xl transition-all"
                        >
                          <MessageCircle size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const client = clients.find(c => c.id === job.clientId);
                            if (client) shareViaEmail('job', job, client, company);
                          }}
                          title="Send update via Email"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-amber-50/50 rounded-2xl transition-all"
                        >
                          <Mail size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }} 
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-10 py-32 text-center relative z-10">
                    <div className="w-24 h-24 bg-surface text-text-light rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/50 group hover:scale-110 transition-transform duration-700">
                      <AlertTriangle size={40} className="group-hover:rotate-12 transition-transform" />
                    </div>
                    <p className="text-xl font-black text-text-main tracking-tighter">No jobcards found</p>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Adjust filters or create a new jobcard</p>
                    <button 
                      onClick={() => {
                        setCreatedStart(''); setCreatedEnd('');
                        setDueStart(''); setDueEnd('');
                        setSearchTerm('');
                      }}
                      className="mt-8 px-8 py-4 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JobModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={liveEditingJob}
      />

      {isDetailsOpen && liveViewingJob && (
        <JobDetailsModal 
          job={liveViewingJob}
          clientId={liveViewingJob.clientId}
          clients={clients}
          departments={departments}
          machines={machines}
          materials={materials}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={(job) => {
            setIsDetailsOpen(false);
            setEditingJob(job);
            setIsModalOpen(true);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Cease Production?"
        message="This will immediately halt and cancel this production job. Historical logs for this job will be archived, but it will be removed from active workflows."
        confirmText="Cancel Job"
        variant="danger"
        isLoading={!!isUpdating}
      />
    </div>
  );
}
