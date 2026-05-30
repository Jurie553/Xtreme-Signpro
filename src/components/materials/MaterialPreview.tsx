import React, { useState } from 'react';
import { Tag, QrCode, MapPin, Printer, ShieldCheck } from 'lucide-react';
import { Material, Supplier } from '../../types';
import { computeCostingSummary, getStockHealth } from './MaterialCalculations';
import { cn } from '@/src/lib/utils';

interface MaterialPreviewProps {
  data: Partial<Material>;
  suppliers: Supplier[];
}

export default function MaterialPreview({ data, suppliers }: MaterialPreviewProps) {
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const selectedSupplierObj = suppliers.find(s => s.id === data.supplierId);
  
  const cost = Number(data.costPrice) || 0;
  const sell = Number(data.sellPerSqm) || 0;
  
  const { profitAmount, marginPercent } = computeCostingSummary(cost, sell);
  const stockThreshold = data.minStock || 10;
  const { label: statusLabel, color: statusColor } = getStockHealth(data.stockLevel || 0, stockThreshold, data.reservedStock || 0);

  const getTextureStyle = () => {
    const fin = (data.finish || 'Glossy').toLowerCase();
    if (fin === 'glossy') {
      return 'bg-gradient-to-tr from-sky-500 via-indigo-600 to-sky-400 shadow-inner overflow-hidden';
    } else if (fin === 'matte') {
      return 'bg-slate-400 border border-slate-500/30';
    } else if (fin === 'frosted') {
      return 'bg-slate-200/50 backdrop-blur-md border border-white/40 shadow-sm';
    } else if (fin === 'satin') {
      return 'bg-gradient-to-b from-indigo-400 via-rose-300 to-amber-200';
    } else {
      return 'bg-amber-100 border-2 border-stone-300';
    }
  };

  const triggerLabelPrint = () => {
    setShowPrintLabel(true);
    setTimeout(() => setShowPrintLabel(false), 2500);
  };

  return (
    <div className="w-full lg:w-[320px] bg-slate-900 p-6 flex flex-col justify-between shrink-0 text-slate-300 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto max-h-full">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-[0.2em]">Live Spectrogram</span>
          <span className={cn("px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase", statusColor)}>
            {statusLabel}
          </span>
        </div>

        {/* Physical Swatch Asset */}
        <div className="h-36 rounded-2xl overflow-hidden relative shadow-md flex flex-col justify-end p-4 bg-slate-800">
          <div className={cn("absolute inset-0 transition-all duration-300", getTextureStyle())} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider block">Material Swatch Render</span>
            <h4 className="text-xs font-bold text-white tracking-tight truncate">{data.name || 'Substrate Material Name'}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-extrabold bg-white/20 px-1.5 py-0.5 rounded text-white tracking-wider">{data.category || 'Print Media'}</span>
              <span className="text-[8px] font-bold text-slate-200 font-mono italic">{data.finish || 'Glossy'} Finish</span>
            </div>
          </div>
        </div>

        {/* Stock ID Register */}
        <div className="space-y-4 pt-2">
          <div>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block mb-1">Stock ID Registry</span>
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono font-bold text-slate-100 tracking-wider">{data.sku || 'SKU-PENDING'}</p>
              <p className="text-[9px] text-slate-400 font-semibold italic truncate max-w-[120px]">{selectedSupplierObj?.name || 'No Vendor Linked'}</p>
            </div>
          </div>

          {/* Usage depletion progress */}
          <div>
            <div className="flex justify-between text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">
              <span>Usage Depletion Gauge</span>
              <span className="text-white">{data.stockLevel || 0} / {stockThreshold * 2} {data.unit}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(100, Math.max(0, ((data.stockLevel || 0) / (stockThreshold * 3)) * 100))}%` }} 
                className={cn(
                  "h-full rounded-full transition-all duration-350",
                  (data.stockLevel || 0) <= stockThreshold ? "bg-rose-500" :
                  (data.stockLevel || 0) <= stockThreshold * 1.8 ? "bg-amber-500" : "bg-emerald-400"
                )}
              />
            </div>
          </div>

          {/* Custom Zebra Label Barcode Trigger */}
          <div 
            className="bg-white p-3 rounded-xl border border-slate-800/10 flex flex-col items-center cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={triggerLabelPrint}
          >
            <div className="flex items-stretch justify-center h-8 w-full bg-slate-900 px-3 py-1 mb-1.5 rounded gap-[1px]">
              {[2, 1, 3, 1, 4, 1, 3, 2, 2, 4, 1, 3, 2, 1, 4, 2].map((w, idx) => (
                <div key={idx} style={{ width: `${w}px` }} className="bg-white h-full" />
              ))}
            </div>
            <p className="text-[8px] font-black text-slate-800 font-mono tracking-widest">{data.barcode || '930058284105'}</p>
            {showPrintLabel && (
              <span className="text-[7px] text-emerald-600 font-black uppercase mt-1 animate-pulse">Barcode sticker sent to spool!</span>
            )}
          </div>

          {/* Costing overview */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block">Net Financial Margins</span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">Cost Price / {data.unit}</span>
              <span className="font-bold text-slate-200">R{cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">GP Margin %</span>
              <span className={cn(
                "font-bold",
                marginPercent < 25 ? "text-red-400" : marginPercent < 45 ? "text-amber-400" : "text-emerald-400"
              )}>
                {marginPercent.toFixed(1)}% (R{profitAmount.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">Warehouse Slot</span>
              <span className="font-mono text-[10px] text-brand-accent truncate max-w-[150px]">
                {data.warehouse?.slice(-12) || 'Alpha'} (Rack {data.rack || '03'})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-850 p-3.5 border border-slate-800/80 rounded-xl mt-4 text-center flex items-center justify-center gap-2">
        <QrCode size={14} className="text-slate-500 animate-pulse" />
        <span className="text-[8px] font-black text-slate-400 font-mono uppercase">WMS QR System Connected</span>
      </div>
    </div>
  );
}
