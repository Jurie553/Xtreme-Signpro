import React, { useState } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Material } from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface StockProgressBarProps {
  stockLevel: number;
  minStock: number;
}

function StockProgressBar({ stockLevel, minStock }: StockProgressBarProps) {
  const level = stockLevel || 0;
  const minimum = minStock || 0;

  // Calculate percentage relation
  const ratio = minimum > 0 ? level / minimum : 1;
  const ratioPercentage = minimum > 0 ? Math.round(ratio * 100) : 100;

  // Max value of the bar range: we want minStock to be a reference point (e.g. at 50% of the bar width)
  // Let the bar show up to Max(minimum * 2, level, 10) to allow headroom
  const maxRange = Math.max(minimum * 2, level, 10);
  const fillWidthPercent = Math.min(100, (level / maxRange) * 100);
  const markerPositionPercent = minimum > 0 ? Math.min(95, (minimum / maxRange) * 100) : 0;

  // Determine status color theme
  let barColorClass = "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
  let textColorClass = "text-emerald-650 text-emerald-600";
  let trackColorClass = "bg-emerald-100/30";

  if (ratio <= 1.0) {
    // Below minimum thresholds
    barColorClass = "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]";
    textColorClass = "text-rose-600 font-black";
    trackColorClass = "bg-rose-100/30";
  } else if (ratio <= 1.5) {
    // Approaching threshold warnings
    barColorClass = "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    textColorClass = "text-amber-600 font-extrabold";
    trackColorClass = "bg-amber-100/30";
  }

  return (
    <div className="flex flex-col gap-1.5 w-40">
      {/* Percentage / Status text details */}
      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider">
        <span className={cn("tabular-nums", textColorClass)}>
          {ratioPercentage}% of Min
        </span>
        <span className="text-text-light/60">
          {minimum > 0 ? `Min: ${minimum}` : 'No Min'}
        </span>
      </div>

      {/* Progress track */}
      <div className={cn("h-1.5 w-full rounded-full relative overflow-visible border border-border/10", trackColorClass)}>
        {/* Fill bar */}
        <div 
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barColorClass)}
          style={{ width: `${fillWidthPercent}%` }}
        />

        {/* Dynamic vertical tick/marker for minimum stock threshold limit */}
        {minimum > 0 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-[3px] h-3 bg-slate-900 border border-white rounded-full z-10 hover:scale-125 transition-transform"
            style={{ left: `${markerPositionPercent}%` }}
            title={`Minimum Threshold Limit: ${minimum}`}
          />
        )}
      </div>
    </div>
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const { data: materials, loading } = useCollection<Material>('materials');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'movement'>('stock');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="page-title">Inventory</h2>
        <p className="page-subtitle mt-1">Track substrates, media, stock levels, reorder warnings, and inventory value.</p>
      </header>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex bg-paper p-1 rounded-2xl border border-border/50 shadow-sm w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('stock')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'stock' ? "bg-white text-brand shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Stock Tracking
            </button>
            <button 
              onClick={() => setActiveTab('movement')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'movement' ? "bg-white text-brand shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Movement History
            </button>
          </div>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-colors" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Query Repository..." 
              className="w-full pl-12 pr-4 py-3 bg-paper border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-sm"
            />
          </div>
        </div>
        <button 
          onClick={() => navigate('/materials')}
          className="btn-primary flex items-center justify-center gap-3"
        >
          <Plus size={18} />
          Add Inventory Item
        </button>
      </div>

      <div className="table-shell overflow-x-auto relative">
        <div className="absolute inset-0 grid-structure opacity-[0.012] pointer-events-none" />
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-surface/50 border-b border-border/30">
            <tr>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Substrate Entity</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest">Classification</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Available Yield</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Reservation Peak</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-center">Threshold Gauge</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Valuation</th>
              <th className="px-8 py-6 text-[9px] font-black text-text-light uppercase tracking-widest text-right">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredMaterials.map((item) => {
              const isLow = (item.stockLevel || 0) <= (item.minStock || 0);
              return (
                <tr key={item.id} className="hover:bg-brand/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-text-main uppercase italic">{item.name}</span>
                      <span className="text-[8px] text-text-light font-bold mt-1 uppercase tracking-widest italic">{item.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-surface text-text-muted text-[9px] font-black rounded-lg uppercase tracking-widest border border-border/50">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-text-main text-sm tabular-nums italic">
                    {(item.stockLevel || 0).toLocaleString()} <span className="text-[9px] text-text-light uppercase tracking-widest not-italic ml-1 opacity-40">{item.unit}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-text-light text-[11px] tabular-nums">
                    {(item.minStock || 0).toLocaleString()} <span className="text-[9px] uppercase tracking-widest ml-1 opacity-30">{item.unit}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <StockProgressBar stockLevel={item.stockLevel || 0} minStock={item.minStock || 0} />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-text-main text-sm tabular-nums italic">
                    <span className="text-[10px] mr-1 not-italic opacity-40">R</span>{((item.stockLevel || 0) * (item.costPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      isLow ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {isLow ? 'Critical Low' : 'Optimal'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredMaterials.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-32 text-center">
                   <div className="w-20 h-20 bg-surface/50 text-text-light rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border/30">
                      <Package size={32} />
                   </div>
                   <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">No inventory materials found</p>
                   <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-2">{searchTerm ? 'Broaden your search criteria' : 'Hardware registry has no material assets'}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
