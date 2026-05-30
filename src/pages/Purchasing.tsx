import React, { useState } from 'react';
import { Search, Plus, Eye, CheckCircle2, X, Package, Ruler, Hash, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument } from '../lib/firestoreService';
import { Material, Supplier, PurchaseOrder, CompanySettings } from '../types';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { toast } from 'sonner';

export default function Purchasing() {
  const { data: pos, loading: posLoading } = useCollection<PurchaseOrder>('purchase_orders');
  const { data: materials } = useCollection<Material>('materials');
  const { data: suppliers } = useCollection<Supplier>('suppliers');
  const { data: companyList } = useCollection<CompanySettings>('company_settings');

  const company = companyList.find(c => c.id === 'company') || companyList[0];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown Supplier';
  const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || 'Unknown Material';

  const handleReceive = async (po: PurchaseOrder) => {
    if (po.status === 'Received') return;
    
    console.log('Button Click: Receive PO', { id: po.id });
    const material = materials.find(m => m.id === po.materialId);
    if (!material) return;

    setIsUpdating(po.id);
    try {
      // Update PO status
      await updateDocument('purchase_orders', po.id, { status: 'Received' });
      
      // Calculate stock increment
      const increment = material.unit === 'm²' ? (po.totalM2 || (po.quantity * (po.rollWidth || 0) * (po.rollLength || 0)) || 0) : po.quantity;
      
      // Update material stock
      await updateDocument('materials', material.id, { 
        stockLevel: (material.stockLevel || 0) + increment 
      });
    } catch (error) {
      console.error('Error receiving PO:', error);
      toast.error('Failed to update inventory during PO reception.');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredPos = pos.filter(po => 
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getSupplierName(po.supplierId).toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.orderDate - a.orderDate);

  if (posLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Inventory Procurement</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Manage purchase orders & automated stock intake</p>
      </header>

      <div className="flex items-center justify-between">
        <div className="relative group w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-colors" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search POs..." 
            className="w-full pl-12 pr-4 py-3 bg-paper border border-border rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Gen Purchase Order
        </button>
      </div>

      <div className="card-minimal p-0 overflow-hidden relative">
        <div className="absolute inset-0 grid-structure opacity-[0.01] pointer-events-none" />
        <table className="w-full text-left">
          <thead className="bg-surface/50 border-b border-border/30">
            <tr>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Document</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Target Supplier</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Media Detail</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Stock Yield</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Commitment</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredPos.map((po) => (
              <tr 
                key={po.id} 
                className={cn(
                  "hover:bg-brand-accent/[0.02] transition-colors group relative",
                  isUpdating === po.id && "opacity-50 pointer-events-none"
                )}
              >
                {isUpdating === po.id && (
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                  </div>
                )}
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-brand-accent tracking-tighter italic">{po.poNumber}</span>
                    <span className="text-[9px] text-text-light font-bold mt-1 uppercase tracking-widest">{new Date(po.orderDate).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-xs font-black text-text-main uppercase italic">{getSupplierName(po.supplierId)}</span>
                </td>
                <td className="px-8 py-6 text-xs text-text-muted font-bold uppercase tracking-tight">
                  {getMaterialName(po.materialId)}
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-text-main tabular-nums italic">
                      {po.rollWidth && po.rollLength ? `${po.totalM2?.toFixed(1)} m²` : `${po.quantity} units`}
                    </span>
                    {po.rollWidth && (
                      <span className="text-[8px] text-text-light font-black uppercase tracking-widest opacity-60">
                        {po.quantity} Rolls • {po.rollWidth}m x {po.rollLength}m
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    po.status === 'Received' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-brand-accent border-blue-100"
                  )}>
                    {po.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right text-xs font-black text-text-main tabular-nums italic">
                  <span className="text-[10px] mr-1 not-italic opacity-40">R</span>{po.totalCost.toLocaleString()}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        if (supplier) shareViaWhatsApp('po', po, supplier, company);
                      }}
                      title="Share PO via WhatsApp"
                      className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-emerald-50/50 rounded-xl transition-all"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        if (supplier) shareViaEmail('po', po, supplier, company);
                      }}
                      title="Send PO via Email"
                      className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-amber-50/50 rounded-xl transition-all"
                    >
                      <Mail size={16} />
                    </button>
                    {po.status !== 'Received' && (
                      <button 
                        onClick={() => handleReceive(po)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                      >
                        <CheckCircle2 size={12} strokeWidth={3} />
                        Receive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-32 text-center">
                   <div className="w-20 h-20 bg-surface/50 text-text-light rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border/30">
                      <Package size={32} />
                   </div>
                   <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">No procurement records</p>
                   <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-2">Initialize a purchase order to begin tracking intake</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <PurchaseModal 
          onClose={() => setIsModalOpen(false)} 
          materials={materials}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}

function PurchaseModal({ onClose, materials, suppliers }: { onClose: () => void, materials: Material[], suppliers: Supplier[] }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: '',
    materialId: '',
    quantity: 1,
    rollWidth: 0,
    rollLength: 0,
    totalCost: 0,
  });

  const selectedMaterial = materials.find(m => m.id === formData.materialId);
  const isM2 = selectedMaterial?.unit === 'm²';
  
  const totalArea = isM2 ? formData.quantity * formData.rollWidth * formData.rollLength : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Initialize Procurement');
    setIsSaving(true);
    try {
      await createDocument('purchase_orders', {
        ...formData,
        totalM2: totalArea,
        orderDate: Date.now(),
        expectedDate: Date.now() + (5 * 24 * 60 * 60 * 1000),
        status: 'Sent'
      });
      onClose();
    } catch (error) {
      console.error('Error creating PO:', error);
      toast.error('Failed to generate purchase order.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="px-10 py-8 bg-paper border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Generate PO</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">{formData.poNumber}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface rounded-2xl transition-all">
            <X size={20} className="text-text-light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Procurement Source</label>
                <select 
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent appearance-none cursor-pointer"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Target Substrate</label>
                <select 
                  required
                  value={formData.materialId}
                  onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent appearance-none cursor-pointer"
                >
                  <option value="">Select Material...</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Procurement Cost (Ex VAT)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light font-black">R</span>
                  <input 
                    type="number"
                    required
                    value={formData.totalCost}
                    onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) })}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold tabular-nums"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface/50 border border-border/30 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest italic">Intake Parameters</h4>
                <Hash size={14} className="text-brand-accent" />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-text-light uppercase tracking-widest mb-3">{isM2 ? 'Number of Rolls' : 'Total Quantity'}</label>
                  <input 
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold tabular-nums"
                  />
                </div>

                {isM2 && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div>
                      <label className="block text-[9px] font-black text-text-light uppercase tracking-widest mb-3">Roll Width (m)</label>
                      <input 
                        type="number"
                        step="0.01"
                        required={isM2}
                        value={formData.rollWidth}
                        onChange={(e) => setFormData({ ...formData, rollWidth: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold tabular-nums"
                        placeholder="1.37"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-text-light uppercase tracking-widest mb-3">Roll Length (m)</label>
                      <input 
                        type="number"
                        step="0.1"
                        required={isM2}
                        value={formData.rollLength}
                        onChange={(e) => setFormData({ ...formData, rollLength: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold tabular-nums"
                        placeholder="50"
                      />
                    </div>
                  </div>
                )}

                {isM2 && (
                  <div className="pt-6 border-t border-border/30 flex flex-col items-center">
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2">Total Calculated Area</span>
                    <span className="text-3xl font-black text-brand-accent tracking-tighter italic tabular-nums">{totalArea.toFixed(1)} m²</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border/30">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-8 py-4 bg-surface text-text-light font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-100 transition-all flex-1 font-bold disabled:opacity-50"
            >
              Abort Order
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-brand-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-95 flex-1 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Processing...' : 'Initialize Procurement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
