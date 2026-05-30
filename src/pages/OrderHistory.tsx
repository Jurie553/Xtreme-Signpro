import React, { useState } from 'react';
import { Search, Calendar, FileText, Briefcase, Filter, ChevronRight, X, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Quote, Job, Client, Department, Machine, Material } from '../types';
import JobDetailsModal from '../components/JobDetailsModal';
import { AnimatePresence } from 'motion/react';

export default function OrderHistory() {
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: clients } = useCollection<Client>('clients');
  const { data: departments } = useCollection<Department>('departments');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: materials } = useCollection<Material>('materials');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingJobDetails, setViewingJobDetails] = useState<Job | null>(null);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.companyName || client?.contactName || 'Unknown Client';
  };

  const getJobForQuote = (quoteId: string) => {
    return jobs.find(j => j.quoteId === quoteId);
  };

  // Only show accepted quotes in history
  const historyData = quotes
    .filter(quote => quote.status === 'Accepted')
    .map(quote => ({
      ...quote,
      clientName: getClientName(quote.clientId),
      job: getJobForQuote(quote.id)
    }))
    .filter(item => {
      const matchesSearch = item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const quoteDate = item.createdAt;
      const matchesDate = (!startDate || quoteDate >= new Date(startDate).getTime()) &&
                         (!endDate || quoteDate <= new Date(endDate).setHours(23, 59, 59, 999));

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (quotesLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Order History</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Historical archive of accepted quotes & fulfilled production</p>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group w-full max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client or quote number..." 
              className="w-full pl-14 pr-6 py-4 bg-paper border border-border/80 rounded-3xl text-[11px] font-black uppercase tracking-[0.05em] focus:outline-none focus:ring-[8px] focus:ring-brand-accent/5 focus:border-brand-accent/40 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSearchTerm('');
            }}
            className="px-6 py-4 bg-surface text-text-light hover:text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all active:scale-95 flex items-center gap-2"
          >
            <X size={14} strokeWidth={3} />
            Reset
          </button>
        </div>

        <div className="p-8 bg-surface/50 rounded-[2.5rem] border border-border/30 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} className="text-brand-accent" />
            <h3 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">Filter by Quote Date</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>
            <span className="text-text-light font-black">→</span>
            <div className="flex-1">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-5 py-3 bg-paper border border-border rounded-2xl text-[10px] font-black uppercase focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {historyData.map((item, idx) => (
          <div 
            key={item.id}
            className="card-minimal p-0 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="flex flex-col lg:flex-row">
              {/* Quote Side */}
              <div className="lg:w-2/3 p-8 border-r border-border/30 relative">
                <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em]">{item.quoteNumber}</span>
                    <h3 className="text-xl font-black text-text-main tracking-tighter italic uppercase">{item.clientName}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 italic">
                      <CheckCircle2 size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Quote Finalized</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Gross Value</span>
                    <span className="text-lg font-black text-text-main tabular-nums tracking-tighter">R {item.total.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Items</span>
                    <span className="text-lg font-black text-text-main tabular-nums tracking-tighter">{item.items.length} units</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Net Profit</span>
                    <span className="text-lg font-black text-emerald-500 tabular-nums tracking-tighter">R {item.profit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2 relative z-10">
                  <span className="text-[8px] font-black text-text-light uppercase tracking-[0.2em]">Product Scope</span>
                  <div className="flex flex-wrap gap-2">
                    {item.items.map((it, i) => (
                      <span key={i} className="px-3 py-1 bg-surface border border-border/50 rounded-lg text-[9px] font-bold text-text-muted">
                        {it.description}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Job Side */}
              <div className={cn(
                "lg:w-1/3 p-8 flex flex-col justify-center",
                item.job ? "bg-brand text-white" : "bg-surface text-text-muted"
              )}>
                {item.job ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Briefcase size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Job Identity</span>
                        <span className="text-lg font-black tracking-tighter italic">#{item.job.jobNumber}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-[9px] font-black uppercase opacity-60">Status</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.job.stage}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-[9px] font-black uppercase opacity-60">Created</span>
                        <span className="text-[10px] font-black">{new Date(item.job.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase opacity-60">Due Date</span>
                        <span className="text-[10px] font-black">{new Date(item.job.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setViewingJobDetails(item.job!);
                        setIsDetailsOpen(true);
                      }}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Access Job File
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <Clock size={32} strokeWidth={1} className="mb-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center">No Job Record Associated</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {historyData.length === 0 && !quotesLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-24 h-24 bg-surface text-text-light rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/50">
              <FileText size={40} />
            </div>
            <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">Registry Empty</p>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">No finalized orders fit current parameters</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDetailsOpen && viewingJobDetails && (
          <JobDetailsModal 
            job={viewingJobDetails}
            clientId={viewingJobDetails.clientId}
            clients={clients}
            departments={departments}
            machines={machines}
            materials={materials}
            onClose={() => setIsDetailsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
