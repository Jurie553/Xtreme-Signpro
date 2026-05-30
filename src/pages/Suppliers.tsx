import React, { useState, useRef } from 'react';
import { Phone, Mail, Clock, Edit2, Search, Plus, Trash2, AlertTriangle, Upload, Loader2, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Supplier } from '../types';
import Papa from 'papaparse';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function Suppliers() {
  const { data: suppliers, loading } = useCollection<Supplier>('suppliers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Action: Import Suppliers CSV');
    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newSuppliers = results.data as any[];
          let importedCount = 0;

          for (const row of newSuppliers) {
            const name = row.Name || row.name || row.Company || row.company || row['Company Name'];
            const email = row.Email || row.email || row['Email Address'];
            const phone = row.Phone || row.phone || row['Phone Number'];
            const contact = row.Contact || row.contact || row['Contact Person'] || row['Contact Name'] || 'Primary Contact';
            
            if (name && email) {
              await createDocument('suppliers', {
                name,
                email,
                phone: phone || '',
                contactPerson: contact,
                address: row.Address || row.address || '',
                leadTime: row['Lead Time'] || row.leadTime || '3-5 Days',
                categories: row.Categories ? row.Categories.split(',').map((c: string) => c.trim()) : ['General'],
                status: 'Active',
                createdAt: Date.now()
              });
              importedCount++;
            }
          }
          toast.success(`Successfully imported ${importedCount} suppliers.`);
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to import suppliers. Please check your CSV format.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Error parsing CSV file.');
        setIsImporting(false);
      }
    });
  };

  const handleExportCSV = () => {
    console.log('Action: Export Suppliers CSV');
    const csv = Papa.unparse(suppliers.map(s => ({
      Name: s.name,
      Email: s.email,
      Phone: s.phone,
      'Contact Person': s.contactPerson,
      Address: s.address,
      'Lead Time': s.leadTime,
      Categories: s.categories.join(', '),
      Status: s.status
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suppliers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Suppliers exported successfully.');
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (supplier: Supplier) => {
    console.log('Button Click: Edit Supplier', { id: supplier.id });
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Supplier', { id });
    setSupplierToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsUpdating(supplierToDelete);
    try {
      await deleteDocument('suppliers', supplierToDelete);
      toast.success('Supplier decommissioned from network.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to remove supplier.');
    } finally {
      setIsUpdating(null);
      setSupplierToDelete(null);
    }
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
            placeholder="Search our network of suppliers..." 
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
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-border rounded-xl text-sm font-bold text-text-muted hover:border-brand hover:text-brand transition-all shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredSuppliers.map((supplier) => (
          <div 
            key={supplier.id} 
            className={cn(
              "card-minimal group relative flex flex-col hover:border-brand/40 transition-all",
              isUpdating === supplier.id && "opacity-50 pointer-events-none"
            )}
          >
            {isUpdating === supplier.id && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-main tracking-tight group-hover:text-brand transition-colors">{supplier.name}</h3>
                <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-1">{supplier.contactPerson}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-2 tracking-widest uppercase",
                  supplier.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-text-light"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", supplier.status === 'Active' ? "bg-emerald-500" : "bg-gray-400")} />
                  {supplier.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-3 mb-8 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-border group-hover:bg-white group-hover:border-brand/20 transition-all">
              <div className="flex items-center gap-3 text-xs text-text-muted font-bold">
                <Phone size={14} className="text-brand/60" strokeWidth={2.5} />
                <span className="truncate">{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted font-bold">
                <Mail size={14} className="text-brand/60" strokeWidth={2.5} />
                <span className="truncate font-medium">{supplier.email}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 min-h-[32px]">
              {supplier.categories.map((cat) => (
                <span key={cat} className="px-3 py-1 bg-white border border-border text-brand text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm">
                  {cat}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-5 border-t border-dashed border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black text-text-light uppercase tracking-[0.15em]">
                <Clock size={14} className="text-brand/50" />
                LT: {supplier.leadTime || 'N/A'}
              </div>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(supplier)} className="p-2 text-text-light hover:text-brand hover:bg-white rounded-lg transition-all"><Edit2 size={16} strokeWidth={2.5} /></button>
                <button onClick={() => handleDelete(supplier.id)} className="p-2 text-text-light hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-20 text-center card-minimal border-dashed">
             <AlertTriangle className="mx-auto text-text-light mb-4" size={32} />
             <p className="font-bold text-text-muted italic">No suppliers found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <SupplierModal 
          supplier={editingSupplier} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Blacklist Supplier?"
        message="Decommissioning this supplier will remove them from the procurement registry. Active orders from this vendor should be fulfilled before removal."
        confirmText="Decommission"
        variant="danger"
        isLoading={!!isUpdating}
      />
    </div>
  );
}

function SupplierModal({ supplier, onClose }: { supplier: Supplier | null, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    leadTime: supplier?.leadTime || '',
    categories: supplier?.categories || [],
    status: supplier?.status || 'Active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Supplier Details', { isEdit: !!supplier });
    setIsSaving(true);
    try {
      if (supplier) {
        await updateDocument('suppliers', supplier.id, formData);
      } else {
        await createDocument('suppliers', { ...formData, createdAt: Date.now() } as any);
      }
      onClose();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier details.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    const cats = formData.categories || [];
    if (cats.includes(cat)) {
      setFormData({ ...formData, categories: cats.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, categories: [...cats, cat] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Supplier Company Name</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Contact Person</label>
                <input required value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Email Address</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Phone Number</label>
                <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Lead Time</label>
                <input value={formData.leadTime} onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" placeholder="e.g. 2-3 Days" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand h-20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {['Print Media', 'Board', 'Ink', 'Garment', 'Finishing'].map(cat => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all", formData.categories?.includes(cat) ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-gray-50 text-text-light hover:bg-gray-100")}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 font-bold text-text-muted hover:bg-gray-100 rounded-xl disabled:opacity-50">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
