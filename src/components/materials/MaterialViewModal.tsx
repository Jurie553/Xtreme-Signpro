import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Eye, ShieldCheck, Scissors, Scale, Flame, CloudSun, TrendingUp, 
  UserCheck, Printer, MapPin, QrCode 
} from 'lucide-react';
import { Material, Supplier } from '../../types';
import { calculateRollYields, computeCostingSummary, getStockHealth } from './MaterialCalculations';
import { cn } from '@/src/lib/utils';

interface MaterialViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  suppliers: Supplier[];
}

export default function MaterialViewModal({
  isOpen,
  onClose,
  material,
  suppliers
}: MaterialViewModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'offcuts'>('info');
  const [showPrintLabel, setShowPrintLabel] = useState(false);

  if (!material) return null;

  const supplier = suppliers.find(s => s.id === material.supplierId);

  // Specs & Conversions Calculations
  const cost = Number(material.costPrice) || 0;
  const sell = Number(material.sellPerSqm) || 0;
  const { profitAmount, marginPercent, multiplier, markupPercent } = computeCostingSummary(cost, sell);

  const { 
    totalArea, 
    netUsableArea, 
    pullUpYield, 
    posterYield, 
    stickerYield, 
    gazeboYield 
  } = calculateRollYields(material.width || 1.37, material.rollLength || 50, material.wastePercent || 8);

  const minStockVal = material.minStock || 10;
  const { label: statusLabel, color: statusColor } = getStockHealth(material.stockLevel || 0, minStockVal, material.reservedStock || 0);

  const triggerLabelPrint = () => {
    setShowPrintLabel(true);
    setTimeout(() => {
      setShowPrintLabel(false);
    }, 2500);
  };

  // Render texture styles for previewing
  const getTextureStyle = () => {
    const fin = (material.finish || 'Glossy').toLowerCase();
    if (fin === 'glossy') {
      return 'bg-gradient-to-tr from-sky-400 via-indigo-500 to-sky-300 shadow-inner overflow-hidden';
    } else if (fin === 'matte') {
      return 'bg-slate-300 border border-slate-400/30 shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)]';
    } else if (fin === 'frosted') {
      return 'bg-slate-100/50 backdrop-blur-md border border-white/40 shadow-sm';
    } else if (fin === 'satin') {
      return 'bg-gradient-to-b from-indigo-300 via-rose-200 to-amber-200 saturate-50';
    } else { // textured
      return 'bg-amber-100 border-2 border-stone-300/40 shadow-[inset_0_4px_8px_rgba(0,0,0,0.1)]';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-6xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden z-10 border border-slate-200/50 mx-4"
          >
            {/* LEFT COMPREHENSIVE DETAIL PANE */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
              
              {/* Header */}
              <div className="px-10 py-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                      Substrate Blueprint Analysis
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Real-time material blueprint, yield telemetry & scrap tracking
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={onClose} 
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation tab strip */}
              <div className="bg-white px-8 py-2 border-b border-slate-100 flex items-center gap-1 shrink-0">
                {[
                  { id: 'info', label: 'Tech Specifications', icon: ShieldCheck },
                  { id: 'offcuts', label: 'Reusable Offcuts Bin', icon: Scissors }
                ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === tab.id 
                          ? "bg-slate-850 text-white shadow-md shadow-slate-900/10" 
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <TabIcon size={12} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 min-h-0">
                
                {activeTab === 'info' && (
                  <div className="space-y-8 animate-in fade-in duration-200">
                    
                    {/* Physical metrics breakdown */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Scale className="text-brand-accent" size={16} />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Substrate Dimensional Blueprint</h4>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Width (m)</span>
                          <p className="text-base font-black text-slate-800 mt-1">{material.width?.toFixed(2) || '1.37'}m</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Roll Length</span>
                          <p className="text-base font-black text-slate-800 mt-1">{material.rollLength?.toFixed(1) || '50'}m</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Weight GSM</span>
                          <p className="text-base font-black text-slate-800 mt-1">{material.gsm || '120'} GSM</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest">Class Finish</span>
                          <p className="text-base font-black text-brand-accent mt-1">{material.finish || 'Glossy'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-stone-50 border border-stone-200/50 rounded-2xl flex justify-between items-center">
                          <div>
                            <span className="text-[7px] font-black text-stone-400 uppercase tracking-widest block">Flame retardancy category</span>
                            <p className="text-xs font-black text-slate-800 mt-1">{material.fireRating || 'Class B1 (Flame Retardant)'}</p>
                          </div>
                          <Flame size={18} className="text-amber-600 animate-pulse" />
                        </div>

                        <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex justify-between items-center">
                          <div>
                            <span className="text-[7px] font-black text-sky-400 uppercase tracking-widest block">Weather limit</span>
                            <p className="text-xs font-black text-slate-850 mt-1">Indoor & Outdoor durability: {material.durabilityYears || 3} Years</p>
                          </div>
                          <CloudSun size={18} className="text-sky-650" />
                        </div>
                      </div>
                    </div>

                    {/* Yield calculations banner */}
                    <div className="bg-emerald-50 border border-emerald-100/80 p-6 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[11px] uppercase tracking-widest">
                        <TrendingUp size={16} />
                        <span>Optimal Manufacturing Yield Telemetry</span>
                      </div>
                      <p className="text-[10px] text-emerald-700/85 font-semibold leading-relaxed">
                        Automatic production breakdown modeling for {totalArea.toFixed(1)} m² of raw material ({netUsableArea.toFixed(1)} m² usable with {material.wastePercent || 8}% scrap variance):
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">Pull-up Banners</span>
                          <p className="text-sm font-black text-slate-800 mt-1">{pullUpYield} units</p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">A1 Posters</span>
                          <p className="text-sm font-black text-slate-800 mt-1">{posterYield} units</p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">Sticker Sheets</span>
                          <p className="text-sm font-black text-slate-800 mt-1">{stickerYield} units</p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">Gazebo Walls</span>
                          <p className="text-sm font-black text-slate-800 mt-1">{gazeboYield} units</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor details */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <UserCheck className="text-brand-accent" size={16} />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Preferred Procurement Vendor</h4>
                        </div>
                        {supplier && (
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                            Lead time: {supplier.leadTime || '3-5 Business Days'}
                          </span>
                        )}
                      </div>

                      {supplier ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[8px] text-slate-400 uppercase font-black block">Company Name</span>
                            <p className="text-xs font-bold text-slate-800 mt-1">{supplier.name}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[8px] text-slate-400 uppercase font-black block">Primary Contact</span>
                            <p className="text-xs font-bold text-slate-800 mt-1">{supplier.contactPerson || 'Vendor Rep'}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[8px] text-slate-400 uppercase font-black block">Vendor Rating</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wider">{supplier.status || 'Active'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 italic">No supplier registered. Double check assignment under materials list.</p>
                      )}
                    </div>

                    {/* Compatibility Checklist */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Printer className="text-indigo-500" size={16} />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Digital Printers & Inks Compliance Log</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Compatible print methods</span>
                          <div className="flex flex-wrap gap-1.5">
                            {material.printMethods?.length ? (
                              material.printMethods.map(m => (
                                <span key={m} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  {m}
                                </span>
                              ))
                            ) : <span className="text-xs font-bold text-slate-400 italic">Legacy general methods only</span>}
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Recommended inks</span>
                          <div className="flex flex-wrap gap-1.5">
                            {material.inkTypes?.length ? (
                              material.inkTypes.map(ink => (
                                <span key={ink} className="px-2.5 py-1 bg-emerald-55 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                  {ink}
                                </span>
                              ))
                            ) : <span className="text-xs font-bold text-slate-400 italic">No restrictions logged</span>}
                          </div>
                        </div>
                      </div>

                      {material.printingConsiderations && (
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mt-2">
                          <p className="text-[11px] font-bold text-indigo-700 leading-relaxed italic whitespace-pre-wrap">
                            &quot;{material.printingConsiderations}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {activeTab === 'offcuts' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Scissors className="text-brand-accent/80" size={16} />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Active Scrap Reclamation Index</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        The scrap reclamation system registers leftover sizing cuts so pricing estimators can automatically utilize offsets during nest computations.
                      </p>

                      <div className="space-y-3">
                        {material.offcuts && material.offcuts.length > 0 ? (
                          material.offcuts.map((off, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-black text-slate-800">{off.width}m Width &times; {off.length}m Length</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Area: <span className="text-emerald-600 font-black">{Number(off.area).toFixed(2)} m²</span> &bull; {off.notes}</p>
                              </div>
                              <span className="bg-brand-accent/5 text-brand-accent border border-brand-accent/10 px-3 py-0.5 text-[8px] font-black tracking-widest uppercase rounded-lg">
                                Ready for Nesting
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-10 border border-dashed border-slate-200 text-center rounded-2xl">
                            <Scissors className="text-slate-400 mx-auto mb-2 animate-bounce" size={24} />
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">No active reclaimed offcuts available in warehouse currently.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT PREMIUM BARCODE & WMS TELEMETRY PANEL */}
            <div className="w-full lg:w-[350px] bg-slate-900 p-8 flex flex-col justify-between shrink-0 text-slate-300 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto max-h-full">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-[0.25em]">Substrate Blueprint</span>
                  <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-extrabold uppercase", statusColor)}>
                    {statusLabel}
                  </span>
                </div>

                {/* Swatch rendering */}
                <div className="h-44 rounded-3xl overflow-hidden relative shadow-lg flex flex-col justify-end p-5 bg-slate-800">
                  <div className={cn("absolute inset-0 transition-all duration-300", getTextureStyle())} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 font-bold font-sans">
                    <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest block">Physical Swatch Spectrogram</span>
                    <h4 className="text-sm font-extrabold text-white tracking-tight truncate">{material.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-extrabold bg-white/20 px-2 py-0.5 rounded text-white tracking-widest">{material.category}</span>
                      <span className="text-[9px] font-bold text-slate-350 font-mono italic">{material.finish || 'Glossy'} Finish</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block mb-1">Index Tracking Code</span>
                    <p className="text-xs font-bold font-mono text-slate-100 tracking-widerCopy">{material.sku || 'MAT-GEN'}</p>
                  </div>

                  <div>
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block mb-1">WMS Allocated Index Room</span>
                    <div className="p-3 bg-slate-800/80 border border-slate-750/50 rounded-xl flex items-center justify-between text-xs font-bold text-slate-250">
                      <span>{material.location || 'Warehouse Alpha (Row 03 Rack B)'}</span>
                      <MapPin size={12} className="text-brand-accent" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5 animate-pulse">
                      <span>Usage Depletion Gauge</span>
                      <span>{material.stockLevel} / {minStockVal * 2} {material.unit}</span>
                    </div>
                    {/* Progress tracking */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                      <div 
                        style={{ width: `${Math.min(100, Math.max(5, (material.stockLevel / (minStockVal * 3)) * 100))}%` }} 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          material.stockLevel <= minStockVal ? "bg-rose-500" :
                          material.stockLevel <= minStockVal * 1.8 ? "bg-amber-500" : "bg-emerald-400"
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-400">
                      <div className="p-2.5 bg-slate-850 rounded-lg">
                        <span>Physical Stock</span>
                        <p className="text-slate-100 font-extrabold mt-0.5">{material.stockLevel} {material.unit}</p>
                      </div>
                      <div className="p-2.5 bg-slate-850 rounded-lg">
                        <span>Reserved Jobs</span>
                        <p className="text-slate-100 font-extrabold mt-0.5">{material.reservedStock || 0} {material.unit}</p>
                      </div>
                    </div>
                  </div>

                  {/* Print Labels Spooler block */}
                  <div 
                    onClick={triggerLabelPrint}
                    className="bg-white p-3.5 rounded-2xl border border-slate-800/10 flex flex-col items-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-stretch justify-center h-8 w-full bg-slate-905 px-3 py-1 mb-1.5 rounded gap-[1px]">
                      {[2, 1, 3, 1, 4, 1, 3, 2, 2, 4, 1, 3, 2, 1, 4, 2].map((w, idx) => (
                        <div key={idx} style={{ width: `${w}px` }} className="bg-slate-900 h-full" />
                      ))}
                    </div>
                    <p className="text-[8px] font-black text-slate-800 font-mono tracking-widest">{material.barcode || '930058284105'}</p>
                    {showPrintLabel ? (
                      <span className="text-[7px] text-emerald-600 font-black uppercase mt-1 animate-pulse">LABEL DISPATCHED TO WMS SYSTEM!</span>
                    ) : (
                      <span className="text-[7px] text-slate-400 font-black uppercase mt-1 tracking-wider flex items-center gap-1 font-semibold">
                        <Printer size={10} /> Click to issue zebra barcode label print
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/80">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                >
                  Terminate Blueprint Hologram
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
