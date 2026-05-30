import React, { useState, useEffect } from 'react';
import { 
  Calculator, ArrowLeftRight, Weight, Layers, Sparkles, 
  Info, DollarSign, RefreshCw, Disc, Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Standard Paper Bulk Presets (Caliper or bulk factor = Thickness in microns / GSM)
interface BulkPreset {
  name: string;
  factor: number;
  description: string;
}

const BULK_PRESETS: BulkPreset[] = [
  { name: 'Coated Gloss Art', factor: 0.85, description: 'Super-calendared double-coated glossy paper' },
  { name: 'Coated Matt / Silk', factor: 0.95, description: 'Matt clay coated heavy card & flyer page stocks' },
  { name: 'Uncoated Wordfree / Offset / Bond', factor: 1.25, description: 'Standard high-bright bond & letterheads' },
  { name: 'Folding Box Board (FBB)', factor: 1.50, description: 'High bulk ivory mechanical pulp packaging board' },
  { name: 'Kraft Liner / Chipboard', factor: 1.40, description: 'Rugged unbleached packaging paperboards' },
  { name: 'Uncoated Bulky Novel Book', factor: 1.65, description: 'Fluffy light cream book text paper' }
];

export default function MaterialConversionPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'gsm_to_micron' | 'sheet_weight' | 'roll_pricing'>('gsm_to_micron');
  const [isExpanded, setIsExpanded] = useState(true);

  // --- TAB 1: GSM & MICRON ---
  const [inputGsm, setInputGsm] = useState<number>(250);
  const [inputMicron, setInputMicron] = useState<number>(212.5);
  const [selectedBulkPreset, setSelectedBulkPreset] = useState<number>(0.85); // Default: Coated Gloss Art
  const [customBulk, setCustomBulk] = useState<number>(1.0);
  const [isCustomBulk, setIsCustomBulk] = useState<boolean>(false);

  // Active bulk factor used in computations
  const currentBulk = isCustomBulk ? customBulk : selectedBulkPreset;

  // React to updates on GSM
  const handleGsmChange = (gsmVal: number) => {
    setInputGsm(gsmVal);
    const calculatedMicron = gsmVal * currentBulk;
    setInputMicron(Number(calculatedMicron.toFixed(2)));
  };

  // React to updates on Micron
  const handleMicronChange = (micronVal: number) => {
    setInputMicron(micronVal);
    if (currentBulk > 0) {
      const calculatedGsm = micronVal / currentBulk;
      setInputGsm(Number(calculatedGsm.toFixed(1)));
    }
  };

  // Sync calculation when preset bulk changes
  useEffect(() => {
    const calcMicron = inputGsm * currentBulk;
    setInputMicron(Number(calcMicron.toFixed(2)));
  }, [selectedBulkPreset, customBulk, isCustomBulk, inputGsm]);


  // --- TAB 2: SHEET WEIGHT & PACKS ---
  const [sheetWidth, setSheetWidth] = useState<number>(450); // mm
  const [sheetHeight, setSheetHeight] = useState<number>(640); // mm
  const [pkgGsm, setPkgGsm] = useState<number>(300);
  const [pkgQuantity, setPkgQuantity] = useState<number>(500); // Standard parent sheet packaging index

  // Sheet Area in sqm
  const sheetAreaSqm = (sheetWidth * sheetHeight) / 1000000;
  // Single Sheet Weight in grams
  const singleSheetWeightG = sheetAreaSqm * pkgGsm;
  // Total pack weight in kg
  const totalPackWeightKg = (singleSheetWeightG * pkgQuantity) / 1000;


  // --- TAB 3: ROLL & RUNNING METERS PRICING ---
  const [rollWidth, setRollWidth] = useState<number>(1370); // mm
  const [rollLength, setRollLength] = useState<number>(50); // m
  const [rollGsm, setRollGsm] = useState<number>(160); // e.g., PVC adhesive
  
  // Dynamic Cost bindings
  const [pricePerSqm, setPricePerSqm] = useState<number>(45.00); // R per m²
  const [pricePerLinMeter, setPricePerLinMeter] = useState<number>(61.65); // R per running meter
  const [pricePerFullRoll, setPricePerFullRoll] = useState<number>(3082.50); // R for total roll

  // Roll Area
  const rollAreaSqm = (rollWidth / 1000) * rollLength;
  const estimatedRollWeightKg = (rollAreaSqm * rollGsm) / 1000;

  // Handles updating Sqm price, then updating run meter and roll total
  const handleSqmPriceChange = (val: number) => {
    setPricePerSqm(val);
    const linCost = val * (rollWidth / 1000);
    setPricePerLinMeter(Number(linCost.toFixed(2)));
    setPricePerFullRoll(Number((linCost * rollLength).toFixed(2)));
  };

  // Handles updating Linear meter price, then updating Sqm price and roll total
  const handleLinearPriceChange = (val: number) => {
    setPricePerLinMeter(val);
    const widthMeters = rollWidth / 1000;
    if (widthMeters > 0) {
      setPricePerSqm(Number((val / widthMeters).toFixed(2)));
    }
    setPricePerFullRoll(Number((val * rollLength).toFixed(2)));
  };

  // Handles updating entire roll price, then updating Running meter and Sqm costs
  const handleFullRollPriceChange = (val: number) => {
    setPricePerFullRoll(val);
    if (rollLength > 0) {
      const linCost = val / rollLength;
      setPricePerLinMeter(Number(linCost.toFixed(2)));
      const widthMeters = rollWidth / 1000;
      if (widthMeters > 0) {
        setPricePerSqm(Number((linCost / widthMeters).toFixed(2)));
      }
    }
  };

  // Re-sync pricing calculations if Width or Length changes
  useEffect(() => {
    const linCost = pricePerSqm * (rollWidth / 1000);
    setPricePerLinMeter(Number(linCost.toFixed(2)));
    setPricePerFullRoll(Number((linCost * rollLength).toFixed(2)));
  }, [rollWidth, rollLength]);

  return (
    <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 border border-slate-800 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl" />

      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Calculator size={18} className="text-teal-400" />
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>Substrate Unit & Dynamic Pricing Converter</span>
              <Sparkles size={11} className="text-teal-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Convert between paper weight, sheet caliper microns & wide-format roll dimensions/pricing models
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-200 hover:text-white font-extrabold text-[8px] uppercase tracking-wider rounded-lg transition-colors"
        >
          {isExpanded ? 'Minimize Widget' : 'Open Converter'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-top-1 duration-205">
          {/* CALCULATOR TABS */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('gsm_to_micron')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                activeSubTab === 'gsm_to_micron' 
                  ? "bg-slate-900 text-teal-400 border border-slate-800 shadow-inner" 
                  : "text-slate-400 hover:text-slate-205"
              )}
            >
              <Layers size={11} />
              <span>GSM & Micron</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sheet_weight')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                activeSubTab === 'sheet_weight' 
                  ? "bg-slate-900 text-teal-400 border border-slate-800 shadow-inner" 
                  : "text-slate-400 hover:text-slate-205"
              )}
            >
              <Weight size={11} />
              <span>Weight & Pack Yield</span>
            </button>
            <button
              onClick={() => setActiveSubTab('roll_pricing')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                activeSubTab === 'roll_pricing' 
                  ? "bg-slate-900 text-teal-400 border border-slate-800 shadow-inner" 
                  : "text-slate-400 hover:text-slate-205"
              )}
            >
              <Disc size={11} />
              <span>Roll Pricing & Yield</span>
            </button>
          </div>

          {/* TAB 1 CONTENT: GSM & MICRON DENSE CALCULATOR */}
          {activeSubTab === 'gsm_to_micron' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="md:col-span-5 space-y-4">
                <span className="text-[8px] font-black text-teal-450 uppercase tracking-widest text-teal-400 block">Preset Substrates & Bulk Densities</span>
                <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {BULK_PRESETS.map((preset) => {
                    const isSelected = !isCustomBulk && selectedBulkPreset === preset.factor;
                    return (
                      <div
                        key={preset.name}
                        onClick={() => {
                          setIsCustomBulk(false);
                          setSelectedBulkPreset(preset.factor);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                          isSelected 
                            ? "bg-teal-500/10 border-teal-555 ring-1 ring-teal-500/30" 
                            : "bg-slate-950/30 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[10px] font-black leading-snug", isSelected ? "text-teal-350" : "text-slate-200")}>
                            {preset.name}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-slate-400">Bulk: {preset.factor.toFixed(2)}</span>
                        </div>
                        <p className="text-[8.5px] text-slate-500 mt-0.5 leading-tight">{preset.description}</p>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => setIsCustomBulk(true)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                      isCustomBulk 
                        ? "bg-teal-500/10 border-teal-555 ring-1 ring-teal-500/30" 
                        : "bg-slate-950/30 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] font-black", isCustomBulk ? "text-teal-350" : "text-slate-200")}>
                        Custom Density Factor
                      </span>
                      <span className="font-mono text-[9px] font-bold text-slate-400">Manual slider</span>
                    </div>
                    <p className="text-[8.5px] text-slate-500 mt-0.5 leading-tight">Specify a unique bulk index manually</p>
                  </div>
                </div>

                {/* Custom factor control input screen */}
                {isCustomBulk && (
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-slate-400">
                      <span>Manual Bulk Volume Factor</span>
                      <span className="text-teal-400">{customBulk.toFixed(2)} cc/g</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.01"
                      value={customBulk}
                      onChange={(e) => setCustomBulk(parseFloat(e.target.value) || 1.0)}
                      className="w-full accent-teal-400 min-h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Conversion calculator screen */}
              <div className="md:col-span-7 flex flex-col justify-between bg-slate-950/40 border border-slate-800 p-5 rounded-[2rem]">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 mb-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowLeftRight size={12} className="text-teal-400" /> Two-Way Dynamic Caliper Sync
                  </span>
                  <span className="text-[8px] bg-slate-800/80 text-teal-400 font-mono px-2 py-0.5 rounded uppercase">
                    Factor: {currentBulk.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Material Weight (GSM)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inputGsm}
                        onChange={(e) => handleGsmChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400/20 text-center font-mono"
                      />
                      <span className="absolute right-3.5 top-3.5 text-[8.5px] text-slate-500 uppercase font-bold">g/m²</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Thickness / Caliper (Microns)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inputMicron}
                        onChange={(e) => handleMicronChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400/20 text-center font-mono"
                      />
                      <span className="absolute right-3.5 top-3.5 text-[8.5px] text-slate-500 uppercase font-bold">μm</span>
                    </div>
                  </div>
                </div>

                {/* Formula display helper card */}
                <div className="mt-5 p-4 bg-slate-900/50 rounded-2xl border border-slate-850/80 flex items-start gap-3">
                  <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                  <div className="text-left">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Standard Conversion Formula:</span>
                    <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">
                      Thickness in Microns (<span className="text-slate-300">μm</span>) = Weight in GSM (<span className="text-slate-300">g/m²</span>) × Paper Bulk Factor (<span className="text-slate-300">cm³/g</span>).
                      Est. Density: <span className="text-teal-400 font-mono">{(1 / currentBulk).toFixed(2)} g/cm³</span> (Water displacement index).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 CONTENT: SHEET WEIGHT & PACKS CO-YIELD */}
          {activeSubTab === 'sheet_weight' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="md:col-span-6 space-y-4">
                <span className="text-[8px] font-black text-teal-455 text-teal-400 uppercase tracking-widest block">Flat Sheet Variables</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Sheet Width (mm)</label>
                    <input
                      type="number"
                      value={sheetWidth}
                      onChange={(e) => setSheetWidth(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Sheet Height (mm)</label>
                    <input
                      type="number"
                      value={sheetHeight}
                      onChange={(e) => setSheetHeight(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Substrate Weight (GSM)</label>
                    <input
                      type="number"
                      value={pkgGsm}
                      onChange={(e) => setPkgGsm(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Packs / Sheets Quantity</label>
                    <input
                      type="number"
                      value={pkgQuantity}
                      step="100"
                      onChange={(e) => setPkgQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Pack yield metrics dashboard screen */}
              <div className="md:col-span-6 bg-slate-950/45 p-5 border border-slate-800 rounded-[2rem] flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-slate-850 pb-2 text-left">Calculated Pack & Shipping Yields</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500">Flat Sheet Area</span>
                      <p className="font-mono text-sm font-black text-white mt-1">
                        {sheetAreaSqm.toFixed(4)} <span className="font-sans text-[10px] text-slate-400">m²</span>
                      </p>
                      <span className="text-[8px] text-slate-500 block mt-0.5">Area index per flat unit</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500">Unit Sheet Weight</span>
                      <p className="font-mono text-sm font-black text-teal-400 mt-1">
                        {singleSheetWeightG.toFixed(2)} <span className="font-sans text-[10px] text-slate-400">grams</span>
                      </p>
                      <span className="text-[8px] text-slate-500 block mt-0.5">Weight of single flat page</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[8px] text-slate-450 uppercase font-black text-slate-400 tracking-widest block">Total Consolidated Mass</span>
                    <p className="font-mono text-xl font-black text-white tracking-tight flex items-baseline gap-1 mt-1">
                      <span className="text-teal-400 font-black">{totalPackWeightKg.toFixed(3)}</span>
                      <span className="font-sans text-[10.5px] text-slate-400">Kilograms</span>
                    </p>
                  </div>
                  <span className="text-[8px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-2 py-1 rounded font-black max-w-[150px] text-center leading-tight">
                    EST SHIPPING WEIGHT EXCLUDING PALLET CORE
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 CONTENT: ROLL & RUNNING METERS PRICING */}
          {activeSubTab === 'roll_pricing' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
              <div className="md:col-span-5 space-y-4">
                <span className="text-[8px] font-black text-teal-450 uppercase tracking-widest text-teal-400 block">Wide-Format Roll Parameters</span>
                
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="block text-[8px] font-black uppercase text-slate-400">Roll Width (mm)</label>
                      <input
                        type="number"
                        value={rollWidth}
                        onChange={(e) => setRollWidth(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="block text-[8px] font-black uppercase text-slate-400">Roll Length (meters)</label>
                      <input
                        type="number"
                        value={rollLength}
                        onChange={(e) => setRollLength(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="block text-[8px] font-black uppercase text-slate-400">Material Density / GSM (g/m²)</label>
                    <input
                      type="number"
                      value={rollGsm}
                      onChange={(e) => setRollGsm(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-black text-white focus:border-teal-400 focus:outline-none font-mono"
                    />
                    <span className="text-[7.5px] text-slate-500 block">Used to approximate total shipping weight of wide rolls</span>
                  </div>
                </div>

                {/* Derived Area Roll stats block */}
                <div className="p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl flex justify-between text-left font-semibold">
                  <div>
                    <span className="text-[7.5px] text-slate-500 block uppercase font-black">Roll Surface Area</span>
                    <span className="font-mono text-xs font-black text-white mt-1 block">
                      {rollAreaSqm.toFixed(2)} <span className="font-sans text-[10px] text-slate-400">m²</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[7.5px] text-slate-500 block uppercase font-black">Estimated Net Mass</span>
                    <span className="font-mono text-xs font-black text-teal-400 mt-1 block">
                      {estimatedRollWeightKg.toFixed(2)} <span className="font-sans text-[10px] text-slate-400">kg</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost matrix syncing blocks (dynamic formulas in action) */}
              <div className="md:col-span-7 bg-slate-950/45 p-5 border border-slate-800 rounded-[2rem] flex flex-col justify-between">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-slate-850 pb-2 text-left">
                  Dynamic Multi-Input Cost Synchronization
                </span>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Unit 1: Per Square Meter */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Price per Square Meter</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-500">R</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pricePerSqm}
                          onChange={(e) => handleSqmPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 pr-2.5 py-2 rounded-xl bg-slate-900 border border-teal-500/20 text-xs font-black text-teal-350 focus:border-teal-400 focus:outline-none font-mono text-center shadow-xs"
                        />
                      </div>
                      <span className="text-[7.5px] text-slate-500 text-center block">R / m² index rate</span>
                    </div>

                    {/* Unit 2: Per Linear Meter */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[8px] font-black uppercase text-slate-455 tracking-widest text-slate-400">Price per Linear Metres</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-500">R</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pricePerLinMeter}
                          onChange={(e) => handleLinearPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 pr-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-100 focus:border-teal-400 focus:outline-none font-mono text-center"
                        />
                      </div>
                      <span className="text-[7.5px] text-slate-500 text-center block">R / running meter</span>
                    </div>

                    {/* Unit 3: Total Roll Price */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest text-slate-400">Contract Cost / Full Roll</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-500">R</span>
                        <input
                          type="number"
                          step="1"
                          value={pricePerFullRoll}
                          onChange={(e) => handleFullRollPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 pr-2.5 py-2 rounded-xl bg-slate-900 border border-indigo-500/20 text-xs font-black text-indigo-300 focus:border-teal-400 focus:outline-none font-mono text-center"
                        />
                      </div>
                      <span className="text-[7.5px] text-slate-500 text-center block">Total cost / roll</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3.5 bg-slate-900/40 rounded-xl border border-slate-850 text-left text-[9px] font-medium leading-relaxed text-slate-500">
                  <span className="font-extrabold text-slate-400 block mb-0.5">Linear to Area Conversion Logic:</span>
                  1 Running Meter = <span className="text-slate-350">{(rollWidth / 1000).toFixed(3)} m²</span> of substrate material. 
                  Price per linear running meter computed as: <span className="text-teal-400 font-mono">Price/m² × Width (m)</span>. Price per roll is: <span className="text-teal-400 font-mono">Price/m × Length (m)</span>. 
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
