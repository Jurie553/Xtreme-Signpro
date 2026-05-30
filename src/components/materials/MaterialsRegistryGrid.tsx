import React, { useState } from 'react';
import { 
  Eye, Edit3, Trash2, ShieldAlert, Plus, Minus, Check, MapPin, Tag 
} from 'lucide-react';
import { Material, Supplier } from '../../types';
import { getStockHealth, computeCostingSummary } from './MaterialCalculations';
import { updateDocument } from '../../lib/firestoreService';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface MaterialsRegistryGridProps {
  materials: Material[];
  suppliers: Supplier[];
  onEdit: (material: Material) => void;
  onView: (material: Material) => void;
  onDelete: (material: Material) => void;
}

export default function MaterialsRegistryGrid({
  materials,
  suppliers,
  onEdit,
  onView,
  onDelete
}: MaterialsRegistryGridProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const incrementStock = async (material: Material, amount: number) => {
    setUpdatingId(material.id);
    const newStock = Math.max(0, material.stockLevel + amount);
    try {
      const success = await updateDocument('materials', material.id, { stockLevel: newStock });
      if (success) {
        toast.success(`Adjusted stock of "${material.name}" to ${newStock} ${material.unit}.`);
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Failed to update stock Level.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getTexturePreviewClass = (finish: string) => {
    const fin = (finish || 'Glossy').toLowerCase();
    if (fin === 'glossy') {
      return 'bg-gradient-to-tr from-sky-300 via-indigo-550 via-indigo-500 to-sky-200 border-b border-indigo-600/10';
    } else if (fin === 'matte') {
      return 'bg-slate-350 border-b border-slate-200';
    } else if (fin === 'frosted') {
      return 'bg-slate-100 border-b border-slate-200';
    } else if (fin === 'satin') {
      return 'bg-gradient-to-b from-indigo-200 via-rose-100 to-amber-100 border-b border-slate-100';
    } else {
      return 'bg-stone-100 border-b border-stone-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {materials.length > 0 ? (
        materials.map((m) => {
          const supplierObj = suppliers.find((s) => s.id === m.supplierId);
          const threshold = m.minStock || 10;
          const { label: healthLabel, color: healthColor } = getStockHealth(m.stockLevel, threshold, m.reservedStock || 0);

          const cost = Number(m.costPrice) || 0;
          const sell = Number(m.sellPerSqm) || cost * 1.45;
          const { marginPercent, multiplier } = computeCostingSummary(cost, sell);

          return (
            <div 
              key={m.id} 
              className="bg-white rounded-3xl border border-slate-150/60 overflow-hidden shadow-sm flex flex-col justify-between group hover:border-brand-accent/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div>
                {/* Header Swatch */}
                <div className={cn("h-16 relative flex items-center justify-between px-6 transition-all", getTexturePreviewClass(m.finish || ''))}>
                  <span className="text-[9px] font-black text-slate-800 tracking-wider font-mono italic uppercase bg-white/40 px-2 py-0.5 rounded backdrop-blur">
                    {m.sku || 'MAT-CAT'}
                  </span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider", healthColor)}>
                    {healthLabel}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Title */}
                  <div>
                    <h4 className="text-xs font-black text-slate-950 truncate" title={m.name}>{m.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{m.category}</span>
                      <span className="text-[9px] text-slate-400 font-semibold italic">{m.finish || 'Standard'} finish</span>
                    </div>
                  </div>

                  {/* Pricing brief */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Cost Price</span>
                      <p className="text-xs font-black text-slate-900 mt-0.5">R{cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">GP Margin</span>
                      <p className={cn("text-xs font-black mt-0.5", marginPercent < 25 ? "text-red-500" : marginPercent < 45 ? "text-amber-500" : "text-emerald-500")}>
                        {marginPercent.toFixed(1)}% <span className="text-[9px] text-slate-400 font-bold">({multiplier.toFixed(2)}x)</span>
                      </p>
                    </div>
                  </div>

                  {/* Location & supplier */}
                  <div className="space-y-1 text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{m.location || 'Warehouse Alpha (Rack 03 Shelf B)'}</span>
                    </div>
                    {supplierObj && (
                      <div className="flex items-center gap-1">
                        <Tag size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">Supplier: {supplierObj.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stock actions & standard actions footer */}
              <div className="px-6 pb-6 pt-0 space-y-4">
                {/* WMS stock tracker with Quick adjustments */}
                <div className="flex items-center justify-between p-2 rounded-2xl border border-slate-150/60 bg-slate-500/5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WMS Inventory</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updatingId === m.id}
                      onClick={() => incrementStock(m, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all font-bold group"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-black text-slate-900 min-w-[50px] text-center font-mono">
                      {m.stockLevel} {m.unit}
                    </span>
                    <button
                      type="button"
                      disabled={updatingId === m.id}
                      onClick={() => incrementStock(m, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all font-bold group"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                {/* Operations Actions bar */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onView(m)}
                    className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-red-650 text-red-600 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-full py-16 text-center text-slate-400 font-bold uppercase italic text-[10px] tracking-widest border border-dashed border-slate-200 rounded-3xl">
          No substrates matching criteria found.
        </div>
      )}
    </div>
  );
}
