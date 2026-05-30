import React, { useState } from 'react';
import { 
  Clipboard, Percent, Scale, Warehouse, Sparkles, Plus, Trash2, 
  AlertTriangle, Flame, CloudSun, Beaker, Scissors, ShieldAlert, Badge
} from 'lucide-react';
import { Material, Supplier } from '../../types';
import { computeCostingSummary, calculateRollYields } from './MaterialCalculations';
import { MaterialValidationError } from './MaterialValidation';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface MaterialFormProps {
  formData: Partial<Material>;
  setFormData: (data: Partial<Material>) => void;
  sellPriceInput: number;
  setSellPriceInput: (val: number) => void;
  suppliers: Supplier[];
  errors: MaterialValidationError;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function MaterialForm({
  formData,
  setFormData,
  sellPriceInput,
  setSellPriceInput,
  suppliers,
  errors,
  isSaving,
  onSubmit
}: MaterialFormProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'specs' | 'storage' | 'ai_offcuts'>('overview');
  
  // Offcut adder state
  const [newOffcutW, setNewOffcutW] = useState('');
  const [newOffcutL, setNewOffcutL] = useState('');
  const [newOffcutNotes, setNewOffcutNotes] = useState('');

  const PRINT_METHODS = ['Digital', 'Offset', 'Screen', 'Flexo', 'Litho', 'Dye-Sub'];
  const INK_TYPES = ['UV', 'Solvent', 'Eco-Solvent', 'Water-based', 'Latex', 'Dye-Sub'];
  const WAREHOUSES = ['Warehouse Alpha', 'Warehouse Beta', 'Warehouse Charlie', 'Secondary Yard'];

  const selectedSupplierObj = suppliers.find(s => s.id === formData.supplierId);

  // Financial values
  const cost = Number(formData.costPrice) || 0;
  const sell = Number(sellPriceInput) || 0;
  const { profitAmount, markupPercent, marginPercent, multiplier } = computeCostingSummary(cost, sell);

  // Roll Yields
  const { 
    totalArea, 
    netUsableArea, 
    pullUpYield, 
    posterYield, 
    stickerYield, 
    gazeboYield 
  } = calculateRollYields(formData.width || 1.37, formData.rollLength || 50, formData.wastePercent || 8);

  const addOffcut = () => {
    const w = parseFloat(newOffcutW);
    const l = parseFloat(newOffcutL);
    if (isNaN(w) || w <= 0 || isNaN(l) || l <= 0) {
      toast.error('Please specify valid offcut dimensions.');
      return;
    }
    const newOff = {
      id: Math.random().toString(36).substring(2, 9),
      width: w,
      length: l,
      area: parseFloat((w * l).toFixed(3)),
      notes: newOffcutNotes.trim() || 'Manual production scrap registration',
    };
    setFormData({
      ...formData,
      offcuts: [...(formData.offcuts || []), newOff]
    });
    setNewOffcutW('');
    setNewOffcutL('');
    setNewOffcutNotes('');
    toast.success('Offcut logged under scrap reduction scheme.');
  };

  const removeOffcut = (id: string) => {
    const updated = (formData.offcuts || []).filter(o => o.id !== id);
    setFormData({
      ...formData,
      offcuts: updated
    });
    toast.info('Offcut removed.');
  };

  // Warnings calculations
  const printTypeWarnings: string[] = [];
  if (formData.category === 'Vinyl' && formData.printMethods?.includes('Litho')) {
    printTypeWarnings.push('Standard adhesive vinyl is incompatible with offset sheetfed litho printing without special UV drying inks.');
  }
  if (formData.inkTypes?.includes('UV') && formData.category === 'Consumable') {
    printTypeWarnings.push('UV ink configuration is marked on non-printable auxiliary consumables. Review assignment.');
  }
  if (formData.indoorOutdoor === 'Indoor' && (formData.durabilityYears || 0) >= 5) {
    printTypeWarnings.push('High durability rating selected for Indoor-only medium. Verify UV-resistance characteristics.');
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
      {/* Tab Navigation Menu */}
      <div className="bg-white px-8 py-2.5 border-b border-slate-150/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'overview', label: 'Overview', icon: Clipboard },
          { id: 'pricing', label: 'Costing & Yield', icon: Percent },
          { id: 'specs', label: 'Technical Spec', icon: Scale },
          { id: 'storage', label: 'Storage & Place', icon: Warehouse },
          { id: 'ai_offcuts', label: 'AI Hub & Scrap', icon: Sparkles }
        ].map(tab => {
          const TabIcon = tab.icon;
          const hasError = 
            (tab.id === 'overview' && (errors.name || errors.category || errors.unit)) ||
            (tab.id === 'pricing' && (errors.costPrice || errors.sellPerSqm)) ||
            (tab.id === 'storage' && (errors.stockLevel || errors.minStock));
          
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border border-transparent",
                activeTab === tab.id 
                  ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" 
                  : "text-slate-500 hover:text-slate-950 hover:bg-slate-100",
                hasError && "border-red-500 text-red-600 font-bold"
              )}
            >
              <TabIcon size={14} />
              {tab.label}
              {hasError && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clipboard className="text-brand-accent" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Substrate Classification</h4>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Media/Substrate Name *
                </label>
                <input 
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={cn(
                    "w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/10 focus:border-brand-accent transition-all text-xs",
                    errors.name && "border-red-400 bg-red-50/10 focus:ring-red-100 focus:border-red-400"
                  )}
                  placeholder="e.g. Avery Dennison Gloss White Vinyl 1370mm"
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-1.5 font-bold">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Category *
                  </label>
                  <select 
                    value={formData.category || 'Print Media'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/15 focus:border-brand-accent cursor-pointer text-xs"
                  >
                    <option value="Print Media">Print Media (Rolls)</option>
                    <option value="Board">Rigid Board (Sheets)</option>
                    <option value="Ink">Ink & Dye Fluids</option>
                    <option value="Vinyl">Self-Adhesive Vinyl</option>
                    <option value="Laminate">Protective Laminate</option>
                    <option value="Consumable">Auxiliary Consumables</option>
                    <option value="Other">Other Media</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Billing Metric *
                  </label>
                  <select 
                    value={formData.unit || 'm²'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/15 focus:border-brand-accent cursor-pointer text-xs"
                  >
                    <option value="m²">m² (Area)</option>
                    <option value="kg">kg (Weight)</option>
                    <option value="sheet">sheet (Sheets)</option>
                    <option value="liter">liter (Volume)</option>
                    <option value="unit">unit (Count)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Preferred Vendor
                  </label>
                  <select 
                    value={formData.supplierId || ''}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/15 focus:border-brand-accent cursor-pointer text-xs"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Internal SKU
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={formData.sku || ''}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-brand-accent/15"
                      placeholder="MAT-8942"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, sku: `MAT-${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-[8px] font-black uppercase text-slate-700 rounded-lg transition-colors"
                    >
                      Gen SKU
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    EAN Barcode / Tracking Number
                  </label>
                  <input 
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-brand-accent/15"
                    placeholder="EAN-13 number"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Beaker className="text-indigo-505 text-indigo-600" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Substance Dimensions & Finishing specifications</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Material Substance Type
                  </label>
                  <input 
                    type="text"
                    value={formData.materialType || ''}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-2"
                    placeholder="e.g. Polymeric Calendered PVC"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Thickness Callout
                  </label>
                  <input 
                    type="text"
                    value={formData.thickness || ''}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-2"
                    placeholder="e.g. 75 Microns (3 Mil)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Printshop Warnings & Printing Considerations
                </label>
                <textarea 
                  value={formData.printingConsiderations || ''}
                  onChange={(e) => setFormData({ ...formData, printingConsiderations: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs h-24 resize-none focus:ring-2"
                  placeholder="Special drying timelines, thermal curing parameters, outgassing constraints, etc..."
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COSTING & YIELD */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="text-brand-accent" size={16} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Financial Profitability & Margin Control</h4>
                </div>
                {cost > 0 && sell > 0 && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8.5px] font-black uppercase",
                    marginPercent < 25 ? "bg-red-100 text-red-700" :
                    marginPercent < 45 ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-800"
                  )}>
                    {marginPercent < 25 ? 'Low Margin' : marginPercent < 45 ? 'Standard GP' : 'Premium GP'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Raw Vendor Cost price (R / Per {formData.unit || 'unit'}) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R</div>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.costPrice || ''}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 text-xs focus:ring-2",
                        errors.costPrice && "border-red-400 bg-red-50/15"
                      )}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.costPrice && <p className="text-[10px] text-red-500 mt-1.5 font-bold">{errors.costPrice}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Sell price (R / Per {formData.unit || 'unit'}) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R</div>
                    <input 
                      type="number"
                      step="0.01"
                      value={sellPriceInput || ''}
                      onChange={(e) => setSellPriceInput(parseFloat(e.target.value) || 0)}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 text-xs focus:ring-2",
                        errors.sellPerSqm && "border-red-400 bg-red-50/15"
                      )}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.sellPerSqm && <p className="text-[10px] text-red-500 mt-1.5 font-bold">{errors.sellPerSqm}</p>}
                </div>
              </div>

              {/* Real-time Markup Box */}
              <div className="p-4 bg-slate-50 border border-slate-150/50 rounded-xl grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Raw Margin</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">R{profitAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">GP Margin %</span>
                  <p className={cn("text-sm font-black mt-0.5", marginPercent < 25 ? "text-red-500" : marginPercent < 45 ? "text-amber-500" : "text-emerald-500")}>
                    {marginPercent.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Markup (Multiplier)</span>
                  <p className="text-sm font-black text-slate-700 mt-0.5">{markupPercent.toFixed(1)}% ({multiplier.toFixed(2)}x)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Scale className="text-indigo-600" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Billing Yardage & Conversions</h4>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                Config ratio weights to convert 1 {formData.unit || 'm²'} into quoting units:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['m²', 'kg', 'sheet', 'liter'].map(item => {
                  if (item === formData.unit) return null;
                  return (
                    <div key={item} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">To {item} factor</label>
                      <input 
                        type="number"
                        step="0.0001"
                        value={formData.conversions?.[item] || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            conversions: {
                              ...formData.conversions,
                              [item]: val
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        placeholder="1.0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TECHNICAL SPECS */}
        {activeTab === 'specs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Scale className="text-emerald-500" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Physical Sizing & Media Finishes</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Roll/Sheet Width (meters)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formData.width || ''}
                    onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    placeholder="e.g. 1.37"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Roll/Sheet Length (meters)
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.rollLength || ''}
                    onChange={(e) => setFormData({ ...formData, rollLength: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Grammage Weight (GSM)
                  </label>
                  <input 
                    type="number"
                    value={formData.gsm || ''}
                    onChange={(e) => setFormData({ ...formData, gsm: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    placeholder="e.g. 440"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Environmental Limit
                  </label>
                  <select 
                    value={formData.indoorOutdoor || 'Both'}
                    onChange={(e) => setFormData({ ...formData, indoorOutdoor: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  >
                    <option value="Indoor">Indoor Use Only</option>
                    <option value="Outdoor">Outdoor Rigid/Heavy Duty</option>
                    <option value="Both">Versatile - Indoor & Outdoor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Finish Attribute
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Glossy', 'Matte', 'Frosted', 'Satin', 'Textured'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormData({ ...formData, finish: f as any })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 transition-all",
                        formData.finish === f 
                          ? "bg-slate-850 text-white border-slate-850" 
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CloudSun className="text-amber-500" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Substrate Performance Ratings</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Outdoor Lifespan ({formData.durabilityYears || 3} Years)</span>
                  <input 
                    type="range" min="1" max="10"
                    value={formData.durabilityYears || 3}
                    onChange={(e) => setFormData({ ...formData, durabilityYears: parseInt(e.target.value) })}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Water waterproofRating ({formData.waterproofRating || 5}/5)</span>
                  <input 
                    type="range" min="1" max="5"
                    value={formData.waterproofRating || 5}
                    onChange={(e) => setFormData({ ...formData, waterproofRating: parseInt(e.target.value) })}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Scratch Resistance ({formData.scratchResistance || 4}/5)</span>
                  <input 
                    type="range" min="1" max="5"
                    value={formData.scratchResistance || 4}
                    onChange={(e) => setFormData({ ...formData, scratchResistance: parseInt(e.target.value) })}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fire Spread Certification</span>
                  <select 
                    value={formData.fireRating || 'Class B1'}
                    onChange={(e) => setFormData({ ...formData, fireRating: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Class B1">Class B1 (Flame Retardant)</option>
                    <option value="Class B2">Class B2 (Standard Burn)</option>
                    <option value="Class M1">Class M1 (Non-Combustible)</option>
                    <option value="None">Non-certified</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WAREHOUSING */}
        {activeTab === 'storage' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Warehouse className="text-brand-accent" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">WMS Storage Indexing</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Assigned Warehouse Building
                  </label>
                  <select 
                    value={formData.warehouse || 'Warehouse Alpha'}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  >
                    {WAREHOUSES.map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Storage Rack Location
                  </label>
                  <input 
                    type="text"
                    value={formData.rack || ''}
                    onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs animate-none"
                    placeholder="e.g. 03"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Vertical Shelf Location
                  </label>
                  <input 
                    type="text"
                    value={formData.shelf || ''}
                    onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    placeholder="e.g. B"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Specific Storage Bin
                  </label>
                  <input 
                    type="text"
                    value={formData.bin || ''}
                    onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    placeholder="e.g. 14"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Percent className="text-slate-650 text-slate-700" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Stock Balance Allocation</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Physical Stock *
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.stockLevel ?? ''}
                    onChange={(e) => setFormData({ ...formData, stockLevel: parseFloat(e.target.value) || 0 })}
                    className={cn("w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs", errors.stockLevel && "border-red-400 bg-red-50/10")}
                  />
                  {errors.stockLevel && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.stockLevel}</p>}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Reorder Stock *
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.minStock ?? ''}
                    onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0, reorderLevel: parseFloat(e.target.value) || 0 })}
                    className={cn("w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs", errors.minStock && "border-red-400 bg-red-50/10")}
                  />
                  {errors.minStock && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.minStock}</p>}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Reserved Stock
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.reservedStock ?? ''}
                    onChange={(e) => setFormData({ ...formData, reservedStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Incoming Stock
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.incomingStock ?? ''}
                    onChange={(e) => setFormData({ ...formData, incomingStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-cyan-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI & OFFCUTS */}
        {activeTab === 'ai_offcuts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Beaker className="text-brand-accent" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Digital Printers & Inks Compatibility</h4>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  Compatible Printing Methods
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRINT_METHODS.map(method => {
                    const isSelected = (formData.printMethods || []).includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          const methods = formData.printMethods || [];
                          setFormData({
                            ...formData,
                            printMethods: isSelected 
                              ? methods.filter(m => m !== method)
                              : [...methods, method]
                          });
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                          isSelected
                            ? "bg-brand-accent text-white border-brand-accent"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  Recommended Ink Techs
                </label>
                <div className="flex flex-wrap gap-2">
                  {INK_TYPES.map(ink => {
                    const isSelected = (formData.inkTypes || []).includes(ink);
                    return (
                      <button
                        key={ink}
                        type="button"
                        onClick={() => {
                          const inks = formData.inkTypes || [];
                          setFormData({
                            ...formData,
                            inkTypes: isSelected 
                              ? inks.filter(i => i !== ink)
                              : [...inks, ink]
                          });
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                          isSelected
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {ink}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scrap offcuts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Scissors className="text-zinc-600 animate-pulse" size={16} />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Substrate Offcut Reclamation</h4>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <span className="text-[9px] font-black uppercase text-slate-500 block">Add Reclaimed Scrap Piece</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <input 
                    type="number" step="0.01" value={newOffcutW}
                    onChange={(e) => setNewOffcutW(e.target.value)}
                    placeholder="W (m)"
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input 
                    type="number" step="0.01" value={newOffcutL}
                    onChange={(e) => setNewOffcutL(e.target.value)}
                    placeholder="L (m)"
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input 
                    type="text" value={newOffcutNotes}
                    onChange={(e) => setNewOffcutNotes(e.target.value)}
                    placeholder="Job #/Source"
                    className="p-2 border rounded-lg text-xs col-span-2 sm:col-span-1"
                  />
                </div>
                <button
                  type="button" onClick={addOffcut}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                >
                  Commit Offcut
                </button>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {(formData.offcuts || []).length > 0 ? (
                  (formData.offcuts || []).map(off => (
                    <div key={off.id} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between text-xs border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-800">{off.width}m x {off.length}m ({Number(off.area).toFixed(2)} m²)</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{off.notes}</p>
                      </div>
                      <button
                        type="button" onClick={() => removeOffcut(off.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Offcut"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-slate-405 text-slate-400 font-bold uppercase italic text-center py-2">No active offcuts registered in warehouse.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Warning Display */}
        {printTypeWarnings.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-rose-800">
              <ShieldAlert size={14} className="shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider">Printing Compatibility Warnings</span>
            </div>
            <ul className="list-disc pl-5 text-rose-700 text-[10px] font-bold space-y-1">
              {printTypeWarnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}

        {/* Global Action Footer inside the Form Grid container */}
        <div className="flex gap-4 pt-4 border-t border-slate-100 shrink-0">
          <button 
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3 bg-brand-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {formData.id ? 'Save Specifications' : 'Save To Registered Index'}
          </button>
        </div>
      </form>
    </div>
  );
}
