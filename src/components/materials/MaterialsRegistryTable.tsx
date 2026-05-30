import React, { useState } from 'react';
import { 
  Eye, Edit3, Trash2, ShieldAlert, Plus, Minus, Check, Scale, RefreshCw
} from 'lucide-react';
import { Material, Supplier } from '../../types';
import { getStockHealth } from './MaterialCalculations';
import { updateDocument } from '../../lib/firestoreService';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface MaterialsRegistryTableProps {
  materials: Material[];
  suppliers: Supplier[];
  onEdit: (material: Material) => void;
  onView: (material: Material) => void;
  onDelete: (material: Material) => void;
}

export default function MaterialsRegistryTable({
  materials,
  suppliers,
  onEdit,
  onView,
  onDelete
}: MaterialsRegistryTableProps) {
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const startStockAdjustment = (material: Material) => {
    setAdjustingStockId(material.id);
    setTempStockValue(material.stockLevel);
  };

  const saveStockAdjustment = async (materialId: string, currentName: string) => {
    setIsUpdatingStock(true);
    try {
      if (isNaN(tempStockValue) || tempStockValue < 0) {
        toast.error('Stock level cannot be negative.');
        setIsUpdatingStock(false);
        return;
      }
      const success = await updateDocument('materials', materialId, { stockLevel: tempStockValue });
      if (success) {
        toast.success(`Stock level for "${currentName}" updated to ${tempStockValue} units.`);
        setAdjustingStockId(null);
      } else {
        throw new Error('Database denied update.');
      }
    } catch (err) {
      toast.error('Failed to perform quick stock adjustment.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-150/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-mono uppercase text-[9px] tracking-[0.2em] border-b border-slate-750 font-bold">
              <th className="py-4.5 px-6 font-black">SKU / Code</th>
              <th className="py-4.5 px-6 font-black">Material / Category</th>
              <th className="py-4.5 px-6 font-black">Procurement Supplier</th>
              <th className="py-4.5 px-6 font-black">WMS Index Rack</th>
              <th className="py-4.5 px-6 font-black text-right">Raw Cost</th>
              <th className="py-4.5 px-6 font-black text-right">Selling Price</th>
              <th className="py-4.5 px-6 font-black text-center">WMS Stock Balance</th>
              <th className="py-4.5 px-6 font-black text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {materials.length > 0 ? (
              materials.map((m) => {
                const supplierObj = suppliers.find((s) => s.id === m.supplierId);
                const threshold = m.minStock || 10;
                const { label: healthLabel, color: healthColor } = getStockHealth(m.stockLevel, threshold, m.reservedStock || 0);
                const isThisAdjusting = adjustingStockId === m.id;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-all font-sans text-xs group">
                    {/* SKU */}
                    <td className="py-4.5 px-6 font-mono text-[10px] text-slate-500 font-extrabold">
                      {m.sku || 'MAT-LEGACY'}
                    </td>
                    
                    {/* Material & category */}
                    <td className="py-4.5 px-6">
                      <div>
                        <p className="font-extrabold text-slate-950 group-hover:text-brand-accent transition-colors">
                          {m.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-widest">{m.category}</span>
                          <span className="text-[8.5px] text-slate-400 font-semibold italic">{m.finish || 'Standard'} finish</span>
                        </div>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-4.5 px-6 text-[11px] font-semibold text-slate-500">
                      {supplierObj ? supplierObj.name : <span className="text-slate-400 italic font-medium">Unlinked vendor</span>}
                    </td>

                    {/* Location */}
                    <td className="py-4.5 px-6 text-[10px] font-mono text-slate-500 font-black">
                      {m.warehouse ? `${m.warehouse.split(' ')[1] || 'Alpha'} R-${m.rack || '03'}` : (m.location?.split(' (')[0] || 'Alpha Room')}
                    </td>

                    {/* Cost */}
                    <td className="py-4.5 px-6 text-right font-black text-slate-900">
                      R{(Number(m.costPrice) || 0).toFixed(2)}
                    </td>

                    {/* Sell */}
                    <td className="py-4.5 px-6 text-right font-black text-slate-800">
                      R{(Number(m.sellPerSqm) || Number(m.costPrice) * 1.45).toFixed(2)}
                    </td>

                    {/* Stock balance with Adjustment */}
                    <td className="py-4.5 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {isThisAdjusting ? (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setTempStockValue(prev => Math.max(0, prev - 1))}
                              className="w-5 h-5 bg-white text-slate-800 font-extrabold rounded flex items-center justify-center hover:bg-slate-50 active:scale-90"
                            >
                              <Minus size={10} />
                            </button>
                            <input
                              type="number"
                              value={tempStockValue}
                              onChange={(e) => setTempStockValue(parseFloat(e.target.value) || 0)}
                              className="w-12 bg-white text-center font-black text-xs p-0.5 border-0 focus:ring-0 select-all"
                            />
                            <button
                              type="button"
                              onClick={() => setTempStockValue(prev => prev + 1)}
                              className="w-5 h-5 bg-white text-slate-800 font-extrabold rounded flex items-center justify-center hover:bg-slate-50 active:scale-90"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingStock}
                              onClick={() => saveStockAdjustment(m.id, m.name)}
                              className="w-5 h-5 bg-emerald-500 text-white rounded flex items-center justify-center hover:bg-emerald-600 active:scale-90"
                            >
                              {isUpdatingStock ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-dotted border-slate-200"
                            onClick={() => startStockAdjustment(m)}
                            title="Click to quickly adjust physical stock level"
                          >
                            <span className="font-extrabold text-slate-950 block">{m.stockLevel} {m.unit}</span>
                          </div>
                        )}
                        <span className={cn("px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider block", healthColor)}>
                          {healthLabel}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4.5 px-6">
                      <div className="flex justify-center items-center gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onView(m)}
                          className="w-8 h-8 rounded-xl hover:bg-slate-105 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:text-brand-accent active:scale-90"
                          title="Review Specs"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => onEdit(m)}
                          className="w-8 h-8 rounded-xl hover:bg-slate-105 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:text-blue-600 active:scale-90"
                          title="Edit Blueprint"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(m)}
                          className="w-8 h-8 rounded-xl hover:bg-slate-105 hover:bg-red-50 text-red-500 flex items-center justify-center transition-all active:scale-90"
                          title="Delete Spec"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-bold uppercase italic text-[10px] tracking-wider">
                  No substrates matching criteria found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
