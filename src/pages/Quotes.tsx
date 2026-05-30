import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, Edit2, Share2, Trash2, Clock, AlertCircle, Briefcase, Mail, MessageCircle, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, deleteDocument, updateDocument, createDocument, getNextSequence } from '../lib/firestoreService';
import { Quote, Client, Job, CompanySettings, QuoteItem } from '../types';
import QuoteModal from '../components/QuoteModal';
import JobModal from '../components/JobModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const statusStyles = {
  Accepted: "bg-emerald-50 text-emerald-600",
  Sent: "bg-blue-50 text-brand",
  Draft: "bg-gray-100 text-text-light",
  Viewed: "bg-orange-50 text-orange-600",
  Rejected: "bg-red-50 text-red-600",
  Expired: "bg-gray-200 text-gray-500",
};

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobToCreate, setJobToCreate] = useState<Partial<Job> | null>(null);

  const initialClientId = searchParams.get('clientId');

  useEffect(() => {
    if (initialClientId) {
      setIsModalOpen(true);
    }
  }, [initialClientId]);

  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: clients } = useCollection<Client>('clients');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: companyList } = useCollection<CompanySettings>('company_settings');

  const company = companyList.find(c => c.id === 'company') || companyList[0];

  const loading = quotesLoading || jobsLoading;

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((acc, q) => acc + q.total, 0);
    const acceptedValue = quotes.filter(q => q.status === 'Accepted').reduce((acc, q) => acc + q.total, 0);
    const pendingCount = quotes.filter(q => q.status === 'Sent' || q.status === 'Draft').length;
    
    return {
      total: totalValue,
      accepted: acceptedValue,
      pending: pendingCount
    };
  }, [quotes]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.companyName || client.name) : 'Unknown Client';
  };

  const filteredQuotes = useMemo(() => {
    console.log('Quotes:', quotes);
    console.log('Clients:', clients);
    
    return quotes.filter(quote => {
      const clientName = getClientName(quote.clientId).toLowerCase();
      const quoteNumber = quote.quoteNumber.toLowerCase();
      const status = quote.status.toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = clientName.includes(query) || quoteNumber.includes(query) || status.includes(query);
      const matchesFilter = !statusFilter || quote.status === statusFilter;
      
      return matchesSearch && matchesFilter;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [quotes, searchQuery, clients, statusFilter]);

  const handleEdit = (quote: Quote) => {
    console.log('Button Click: Edit Quote', { id: quote.id });
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Quote', { id });
    setQuoteToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    setIsUpdating(quoteToDelete);
    try {
      await deleteDocument('quotes', quoteToDelete);
      toast.success('Quote registry entry purged.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to purge quote.');
    } finally {
      setIsUpdating(null);
      setQuoteToDelete(null);
    }
  };

  const handleStatusChange = async (id: string, status: Quote['status']) => {
    console.log('Button Click: Quote Status Change', { id, status });
    setIsUpdating(id);
    try {
      await updateDocument('quotes', id, { status });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateJob = (quote: Quote) => {
    console.log('Button Click: Initiate Quote to Job Conversion', { id: quote.id });
    const clientName = getClientName(quote.clientId);
    const productsSummary = quote.items.map(item => item.description).join(', ') || 'Custom Production';
    
    const initialJobData: Partial<Job> = {
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName,
      productName: productsSummary,
      stage: 'Prepress',
      priority: 'Normal',
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
      artworkStatus: 'Pending',
      items: quote.items as QuoteItem[],
      total: quote.total,
      profit: quote.profit,
      createdAt: Date.now(),
    };
    
    setJobToCreate(initialJobData);
    setIsJobModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-minimal p-8 flex items-center justify-between overflow-hidden group relative"
        >
          <div className="absolute inset-0 grid-structure opacity-[0.03] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-2">Total Pipeline</p>
            <h3 className="text-3xl font-black text-text-main tracking-tighter tabular-nums italic font-serif">R{stats.total.toLocaleString()}</h3>
          </div>
          <div className="w-14 h-14 bg-brand-accent/5 rounded-[1.5rem] flex items-center justify-center text-brand-accent group-hover:scale-110 transition-all relative z-10 shadow-sm border border-brand-accent/10">
            <DollarSign size={24} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-minimal p-8 flex items-center justify-between overflow-hidden group relative"
        >
          <div className="absolute inset-0 grid-structure opacity-[0.03] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-2">Revenue Realized</p>
            <h3 className="text-3xl font-black text-emerald-500 tracking-tighter tabular-nums italic font-serif">R{stats.accepted.toLocaleString()}</h3>
          </div>
          <div className="w-14 h-14 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-all relative z-10 shadow-sm border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-minimal p-8 flex items-center justify-between overflow-hidden group relative"
        >
          <div className="absolute inset-0 grid-structure opacity-[0.03] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-2">Active Proposals</p>
            <h3 className="text-3xl font-black text-brand tracking-tighter tabular-nums italic font-serif">{stats.pending} Units</h3>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-brand group-hover:scale-110 transition-all relative z-10 shadow-sm border border-blue-100">
            <TrendingUp size={24} />
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative group w-full max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sale pipeline..." 
              className="w-full pl-14 pr-6 py-4 bg-paper border border-border/80 rounded-3xl text-[11px] font-black uppercase tracking-[0.05em] focus:outline-none focus:ring-[8px] focus:ring-brand-accent/5 focus:border-brand-accent/40 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => {
                const statuses = ['Draft', 'Sent', 'Accepted', 'Rejected'];
                const currentIndex = statusFilter ? statuses.indexOf(statusFilter) : -1;
                const nextIndex = currentIndex + 1;
                const nextStatus = nextIndex >= statuses.length ? null : statuses[nextIndex];
                setStatusFilter(nextStatus);
                console.log('Button Click: Cycle Matrix Filter', { filter: nextStatus || 'All' });
              }}
              className={cn(
                "flex items-center gap-2 px-8 py-4 border rounded-3xl text-[10px] font-black transition-all shadow-sm uppercase tracking-widest whitespace-nowrap",
                statusFilter 
                  ? "bg-brand text-white border-brand shadow-brand/20" 
                  : "bg-paper border-border/80 text-text-muted hover:border-brand-accent hover:text-brand-accent"
              )}
            >
              <Filter size={18} />
              {statusFilter ? `Status: ${statusFilter}` : 'Matrix Filter'}
            </button>
            {statusFilter && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusFilter(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-lg border-2 border-white"
                title="Clear Filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedQuote(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-3 px-10 py-5 rounded-3xl shadow-2xl shadow-brand/20 active:scale-95 group transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center transition-transform group-hover:rotate-90">
            <Plus size={16} strokeWidth={3} />
          </div>
          <span className="uppercase tracking-[0.2em] text-xs font-black">Generate Quote</span>
        </button>
      </div>

      <div className="card-minimal p-0 overflow-hidden relative border-border/40">
        <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="bg-surface/50 border-b border-border/50">
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Registry ID</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Entity Detail</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Scope</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Priority</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Log Date</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Gross Val</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Yield</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.3em]">State</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredQuotes.map((quote, idx) => (
                  <motion.tr 
                    key={quote.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "hover:bg-brand-accent/[0.02] transition-colors group relative",
                      isUpdating === quote.id && "opacity-50 pointer-events-none"
                    )}
                  >
                  {isUpdating === quote.id && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                    </div>
                  )}
                  <td className="px-10 py-8">
                    <span className="text-xs font-black text-brand-accent tracking-tighter tabular-nums px-3 py-1 bg-blue-50 rounded-lg">#{quote.quoteNumber.split('-')[2]}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-text-main font-black tracking-tighter group-hover:text-brand-accent transition-colors italic">{getClientName(quote.clientId)}</span>
                      <span className="text-[9px] text-text-light font-bold uppercase tracking-widest opacity-60">REF-{quote.id.substring(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-[11px] text-text-muted font-bold uppercase tracking-widest tabular-nums">
                    {quote.items.length} units
                  </td>
                  <td className="px-10 py-8">
                    {quote.isExpress ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-accent/5 text-brand-accent rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-accent/10">
                        <Clock size={10} strokeWidth={3} className="animate-pulse" />
                        SLA: Express
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] opacity-40">Standard</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-[10px] text-text-muted font-black tabular-nums tracking-widest">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-sm font-black text-text-main tabular-nums tracking-tighter">R{quote.total.toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">R{quote.profit.toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-2 items-center">
                      <span className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm w-full text-center",
                        quote.status === 'Accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        quote.status === 'Sent' ? "bg-blue-50 text-brand-accent border-blue-100" :
                        quote.status === 'Viewed' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        quote.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-surface text-text-muted border-border"
                      )}>
                        {quote.status}
                      </span>
                      {quote.status === 'Accepted' && (
                        <>
                          {jobs.some(j => j.quoteId === quote.id) ? (
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                              <Briefcase size={10} /> In Production
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleCreateJob(quote)}
                              className="w-full py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Plus size={10} /> Convert to Order
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      {quote.status === 'Accepted' && !jobs.some(j => j.quoteId === quote.id) && (
                        <button 
                          onClick={() => handleCreateJob(quote)}
                          title="Generate Production Job"
                          className="w-10 h-10 flex items-center justify-center text-emerald-500 hover:bg-emerald-50/50 rounded-2xl transition-all"
                        >
                          <Briefcase size={16} strokeWidth={2.5} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(quote)}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-blue-50/50 rounded-2xl transition-all"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            const client = clients.find(c => c.id === quote.clientId);
                            if (client) shareViaWhatsApp('quote', quote, client, company);
                          }}
                          title="Share via WhatsApp"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-emerald-50/50 rounded-2xl transition-all"
                        >
                          <MessageCircle size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => {
                            const client = clients.find(c => c.id === quote.clientId);
                            if (client) shareViaEmail('quote', quote, client, company);
                          }}
                          title="Send via Email"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-amber-50/50 rounded-2xl transition-all"
                        >
                          <Mail size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(quote.id)}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              </AnimatePresence>
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-10 py-32 text-center relative z-10">
                    <div className="w-24 h-24 bg-surface text-text-light rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/50 group hover:scale-110 transition-transform duration-700">
                      <AlertCircle size={40} className="group-hover:rotate-12 transition-transform" />
                    </div>
                    <p className="text-xl font-black text-text-main tracking-tighter uppercase italic font-serif">Registry Empty</p>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Awaiting system initialization or user input</p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-8 px-8 py-4 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all"
                    >
                      Initialize First Record
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedQuote(null);
          // Clear the search param when closing the modal
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('clientId');
          setSearchParams(newParams);
        }} 
        quote={selectedQuote} 
        initialClientId={initialClientId}
      />

      {isJobModalOpen && (
        <JobModal 
          isOpen={isJobModalOpen}
          onClose={() => {
            setIsJobModalOpen(false);
            setJobToCreate(null);
          }}
          job={jobToCreate as Job}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Purge Active Quote?"
        message="This will permanently delete this quote from the system. Linked analytics will be recalculated. This action is irreversible."
        confirmText="Purge Quote"
        variant="danger"
        isLoading={!!isUpdating}
      />
    </div>
  );
}
