import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ListFilter, Trash2, Edit2, Mail, Phone, Building2, Upload, Loader2, History, FileText, Briefcase, Clock, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { cn } from '@/src/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Client, Quote, Job } from '../types';
import QuoteModal from '../components/QuoteModal';
import { motion, AnimatePresence } from 'motion/react';
import JobModal from '../components/JobModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';
import CSVImportWizard from '../components/CSVImportWizard';

export default function Clients() {
  const { data: clients, loading } = useCollection<Client>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import States
  const [csvRawData, setCsvRawData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    console.log('Button Click: Edit Client', { id: client.id });
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Client', { id });
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    setIsUpdating(clientToDelete);
    try {
      await deleteDocument('clients', clientToDelete);
      toast.success('Client registry entry removed.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to remove client.');
    } finally {
      setIsUpdating(null);
      setClientToDelete(null);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Button Click: Import CSV');
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setCsvFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        try {
          const parsedData = results.data as any[];
          const detectedHeaders = results.meta.fields || [];

          if (parsedData.length === 0) {
            toast.error('The selected CSV file contains no data rows.');
            setIsImporting(false);
            return;
          }

          setCsvRawData(parsedData);
          setCsvHeaders(detectedHeaders);
          setIsImportWizardOpen(true);
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to parse CSV client file.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Error parsing CSV file content.');
        setIsImporting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-6">
        <div className="relative group w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-border rounded-xl text-sm font-bold text-text-muted hover:border-brand hover:text-brand transition-all shadow-sm disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button 
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>
      </div>

      <div className="card-minimal p-0 overflow-hidden">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-border">
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Client Identity</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Contact Details</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Company / Brand</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">VAT #</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredClients.map((client) => (
              <tr 
                key={client.id} 
                className={cn(
                  "hover:bg-blue-50/10 transition-colors group relative",
                  isUpdating === client.id && "opacity-50 pointer-events-none"
                )}
              >
                {isUpdating === client.id && (
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                  </div>
                )}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center font-black text-xs uppercase shadow-sm">
                      {client.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-text-main tracking-tight">{client.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-between group/contact">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                        <Mail size={12} className="text-brand" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-text-light uppercase tracking-widest">
                        <Phone size={12} className="text-brand" />
                        {client.phone}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setHistoryClient(client);
                        setIsHistoryOpen(true);
                      }} 
                      title="View Client History"
                      className="flex items-center gap-2 p-2 px-3 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-all border border-amber-100 shadow-sm"
                    >
                      <History size={14} strokeWidth={3} />
                      History
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-sm text-text-main font-bold">
                    <Building2 size={16} className="text-text-light" />
                    {client.companyName || 'N/A'}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-xs font-bold text-text-light tabular-nums tracking-widest">{client.vatNumber || '—'}</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setHistoryClient(client);
                          setIsHistoryOpen(true);
                        }} 
                        title="View Client History"
                        className="p-2 text-text-light hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      >
                        <History size={16} strokeWidth={2.5} />
                      </button>
                    <button onClick={() => handleEdit(client)} className="p-2 text-text-light hover:text-brand hover:bg-white rounded-lg transition-all"><Edit2 size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => handleDelete(client.id)} className="p-2 text-text-light hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-text-muted font-medium italic">
                  No clients found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ClientModal 
          client={editingClient} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {isHistoryOpen && historyClient && (
        <ClientHistoryModal 
          client={historyClient} 
          onViewQuote={(q) => setViewingQuote(q)}
          onViewJob={(j) => setViewingJob(j)}
          onClose={() => setIsHistoryOpen(false)} 
        />
      )}

      {viewingQuote && (
        <QuoteModal 
          isOpen={true}
          quote={viewingQuote} 
          onClose={() => setViewingQuote(null)} 
        />
      )}

      {viewingJob && (
        <JobModal 
          isOpen={true}
          job={viewingJob} 
          onClose={() => setViewingJob(null)} 
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Purge Client Record?"
        message="This will permanently remove the client from the central registry. Existing quotes and jobs associated with this client will remain in the database but may lose their linked identity."
        confirmText="Purge Record"
        variant="danger"
        isLoading={!!isUpdating}
      />

      <CSVImportWizard
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
        rawData={csvRawData}
        headers={csvHeaders}
        fileName={csvFileName}
        existingClients={clients}
        onComplete={() => {
          // No-op or extra logic if we want, clients from useCollection will automatically sync on changes
        }}
      />
    </div>
  );
}

function ClientHistoryModal({ 
  client, 
  onClose,
  onViewQuote,
  onViewJob 
}: { 
  client: Client, 
  onClose: () => void,
  onViewQuote: (q: Quote) => void,
  onViewJob: (j: Job) => void
}) {
  const { data: quotes } = useCollection<Quote>('quotes');
  const { data: jobs } = useCollection<Job>('jobs');

  const clientQuotes = quotes
    .filter(q => q.clientId === client.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const clientJobs = jobs
    .filter(j => j.clientId === client.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-text-main/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b border-border flex items-center justify-between bg-blue-50/30">
          <div>
            <h2 className="text-2xl font-black text-text-main tracking-tighter uppercase italic font-serif">{client.name}</h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Client History Explorer</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm group">
            <X className="group-hover:rotate-90 transition-transform" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 space-y-12 no-scrollbar">
          {/* Quotes Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-amber-500 rounded-full" />
              <h3 className="text-xl font-black text-text-main italic uppercase tracking-tight font-serif">Quotations ({clientQuotes.length})</h3>
            </div>
            <div className="space-y-4">
              {clientQuotes.map(quote => (
                <div key={quote.id} className="bg-white p-6 rounded-[2rem] border border-border hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-main tracking-tight italic uppercase">{quote.quoteNumber}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-black text-text-light uppercase tracking-widest">Created:</span>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        quote.status === 'Accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        quote.status === 'Draft' ? "bg-gray-50 text-gray-600 border-gray-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {quote.status}
                      </div>
                      <button 
                        onClick={() => onViewQuote(quote)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-brand hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                      >
                        <ExternalLink size={12} />
                        View Detail
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-text-light uppercase tracking-widest">
                      {quote.items.length} Line Items
                    </div>
                    <div className="text-sm font-black text-amber-600 tracking-tight">
                      R {quote.total.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {clientQuotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-[2rem] border border-dashed border-border text-text-light opacity-40">
                  <FileText size={40} strokeWidth={1} className="mb-3" />
                  <p className="text-[9px] font-black uppercase tracking-widest italic">No quotes found for this client</p>
                </div>
              )}
            </div>
          </section>

          {/* Jobs Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-brand rounded-full" />
              <h3 className="text-xl font-black text-text-main italic uppercase tracking-tight font-serif">Jobcards ({clientJobs.length})</h3>
            </div>
            <div className="space-y-4">
              {clientJobs.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-[2rem] border border-border hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand/5 rounded-xl flex items-center justify-center text-brand">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-main tracking-tight italic uppercase">{job.jobNumber}</h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">{job.productName}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-text-light uppercase tracking-widest">Started:</span>
                           <span className="text-[9px] font-bold text-text-muted uppercase">{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        job.stage === 'Delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        job.stage === 'Ready' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-blue-50 text-brand border-blue-100"
                      )}>
                        {job.stage}
                      </div>
                      <button 
                        onClick={() => onViewJob(job)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-brand hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                      >
                        <ExternalLink size={12} />
                        Job Card
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-light uppercase tracking-widest">
                      <Clock size={12} className="text-brand" />
                      Due: {new Date(job.dueDate).toLocaleDateString()}
                    </div>
                    {job.total && (
                      <div className="text-sm font-black text-brand tracking-tight">
                        R {job.total.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {clientJobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-[2rem] border border-dashed border-border text-text-light opacity-40">
                  <Briefcase size={40} strokeWidth={1} className="mb-3" />
                  <p className="text-[9px] font-black uppercase tracking-widest italic">No jobcards found for this client</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ClientModal({ client, onClose }: { client: Client | null, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    whatsappNumber: client?.whatsappNumber || '',
    companyName: client?.companyName || '',
    address: client?.address || '',
    vatNumber: client?.vatNumber || '',
    zohoCustomerId: client?.zohoCustomerId || '',
    zohoSyncStatus: client?.zohoSyncStatus || 'Not Synced'
  });

  const [showGuidedNextStep, setShowGuidedNextStep] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Client Details', { isEdit: !!client });
    setIsSaving(true);
    try {
      // Auto-populate company name if empty
      const finalCompanyName = formData.companyName || formData.name;
      const data = { 
        ...formData, 
        companyName: finalCompanyName,
        createdAt: client?.createdAt || Date.now() 
      };
      let newClientId = client?.id;
      if (client) {
        await updateDocument('clients', client.id, data);
      } else {
        const docId = await createDocument('clients', data as any);
        if (docId) {
          newClientId = docId;
          setShowGuidedNextStep(newClientId);
        }
      }
      if (!newClientId || client) onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{client ? 'Edit Client' : 'Add New Client'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors leading-none text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Full Name / Contact Person</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => {
                  if (formData.name && !formData.companyName) {
                    setFormData(prev => ({ ...prev, companyName: prev.name }));
                  }
                }}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Email Address</label>
              <input 
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Phone Number</label>
              <input 
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">WhatsApp Number</label>
              <input
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Company Name (Optional)</label>
              <input 
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Address</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand h-24"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">VAT Number</label>
              <input
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Zoho Customer ID</label>
              <input
                value={formData.zohoCustomerId}
                onChange={(e) => setFormData({ ...formData, zohoCustomerId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 font-bold text-text-muted hover:bg-gray-100 rounded-xl disabled:opacity-50">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Client Details'}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showGuidedNextStep && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center"
            >
               <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-6 border border-emerald-100">
                  <CheckCircle2 size={32} />
               </div>
               <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Client Logged</h3>
               <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-3">The entity has been recorded. What is the next command?</p>
               
               <div className="grid grid-cols-1 gap-3 w-full mt-10">
                  <button 
                    onClick={() => {
                       navigate(`/quotes?clientId=${showGuidedNextStep}`);
                    }}
                    className="w-full flex items-center justify-center gap-4 py-5 bg-brand text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:-translate-y-1 transition-all"
                  >
                     Generate First Quote
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <FileText size={16} />
                     </div>
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 text-[9px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-text-main transition-colors"
                  >
                     Dismiss & Return to Registry
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
