import React, { useState, useMemo } from 'react';
import { Package as PackageIcon, Star, Edit2, Trash2, X, Plus, Save, FileText } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Package, PackageItem } from '../types';
import QuoteModal from '../components/QuoteModal';

export default function Packages() {
  const { data: packages, loading } = useCollection<Package>('packages');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);

  const handleAddToQuote = (packageId: string) => {
    setPrefilledItem({ type: 'Package', originId: packageId, quantity: 1 });
    setIsQuoteModalOpen(true);
  };

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || pkg.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [packages, searchTerm, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(packages.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [packages]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      await deleteDocument('packages', id);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };
  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <input 
              type="text" 
              placeholder="Search packages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
               <PackageIcon size={18} />
            </div>
          </div>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[120px]"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <button 
          onClick={() => {
            setEditingPackage(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Add Package</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden group border-t-4 border-t-blue-500/10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <PackageIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{pkg.name}</h3>
                      {pkg.featured && <Star size={14} className="fill-orange-400 text-orange-400" />}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed font-medium">{pkg.description}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider",
                  pkg.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                )}>
                  {pkg.status}
                </span>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                {(pkg.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-gray-400 tabular-nums">R {item.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-50">
                <div className="mb-2">
                  <span className="text-[10px] text-gray-300 line-through tabular-nums font-bold">R {pkg.fullPrice.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 tabular-nums leading-none tracking-tighter">
                      <span className="text-sm mr-0.5">R</span>{pkg.packagePrice.toFixed(2).split('.')[0]}
                      <span className="text-sm">,{pkg.packagePrice.toFixed(2).split('.')[1]}</span>
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-emerald-50 rounded flex items-center gap-1">
                    <span className="text-[10px] font-black text-emerald-600">Save R {pkg.savings.toFixed(2).replace('.', ',')} ({pkg.savingsPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-widest">{pkg.category}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAddToQuote(pkg.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors rounded-lg flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                    >
                      <FileText size={14} />
                      Quote
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-100 pl-2">
                      <button 
                        onClick={() => handleEdit(pkg)}
                        className="p-1.5 text-gray-300 hover:text-blue-600 transition-colors rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(pkg.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <PackageModal 
          pkg={editingPackage} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {isQuoteModalOpen && (
        <QuoteModal 
          isOpen={true}
          prefilledItem={prefilledItem}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setPrefilledItem(null);
          }}
        />
      )}
    </div>
  );
}

function PackageModal({ pkg, onClose }: { pkg: Package | null, onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    featured: pkg?.featured || false,
    category: pkg?.category || '',
    leadTime: pkg?.leadTime || '',
    targetAudience: pkg?.targetAudience || '',
    packagePrice: pkg?.packagePrice || 0,
    status: pkg?.status || 'Active',
    items: pkg?.items || [{ label: '', price: 0 }]
  });

  const fullPrice = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [formData.items]);

  const savings = Math.max(0, fullPrice - formData.packagePrice);
  const savingsPercent = fullPrice > 0 ? Math.round((savings / fullPrice) * 100 * 10) / 10 : 0;

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { label: '', price: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index: number, field: keyof PackageItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<Package, 'id'> = {
      ...formData,
      fullPrice,
      savings,
      savingsPercent,
      createdAt: pkg?.createdAt || Date.now()
    };

    if (pkg) {
      await updateDocument('packages', pkg.id, data);
    } else {
      await createDocument('packages', data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{pkg ? 'Edit Package' : 'New Package Bundle'}</h3>
            <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest">Configure value bundles & discounts</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Package Name</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500"
                placeholder="e.g. Small Business Starter Pack"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 min-h-[80px]"
                placeholder="What's included in this value bundle?"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                <input 
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500"
                  placeholder="Stationery, Signage, etc"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Lead Time</label>
                <input 
                  type="text"
                  value={formData.leadTime}
                  onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500"
                  placeholder="e.g. 7-10 Days"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Audience</label>
                <input 
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500"
                  placeholder="e.g. Startups"
                />
              </div>
            </div>

            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">Featured Package</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50">
            <div className="flex justify-between items-center mb-6">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Line Items & Pricing</label>
              <button 
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
              >
                <Plus size={14} />
                Add Line Item
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center group">
                  <div className="flex-1">
                    <input 
                      type="text"
                      required
                      placeholder="Item description"
                      value={item.label}
                      onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium"
                    />
                  </div>
                  <div className="w-32 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-bold">R</span>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-gray-400"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cumulative Value</span>
                <span className="text-xl font-black text-gray-400 tabular-nums tracking-tighter italic">R {fullPrice.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">Bundle Sell Price</span>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-black text-blue-600 italic">R</span>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={formData.packagePrice}
                    onChange={(e) => setFormData({ ...formData, packagePrice: Number(e.target.value) })}
                    className="w-full pl-5 bg-transparent border-none p-0 text-2xl font-black text-blue-600 tabular-nums tracking-tighter italic focus:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 px-4 flex justify-between items-center text-[10px] font-bold">
               <span className="text-gray-400 uppercase tracking-widest">Bundle Saving</span>
               <span className="text-emerald-600 uppercase">Save R {savings.toFixed(2)} ({savingsPercent}%)</span>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors"
            >
              Discard Changes
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              <Save size={16} />
              {pkg ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
