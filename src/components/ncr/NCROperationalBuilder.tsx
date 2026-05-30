import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, ArrowDown, Plus, Trash2, Copy, Layers, 
  Coins, Box, Check, AlertTriangle, AlertCircle, RefreshCw, 
  Settings, BookOpen, Star, Sparkles, Sliders, Hash, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { NCRLayer, NCRCostBreakdown, NCRStockAllocation, Material } from '../../types';

// Supported NCR Colors with CSS hex codes and labels
const NCR_COLORS = {
  White: { name: 'White NCR', bg: 'bg-white', border: 'border-slate-300 shadow-slate-200/50', hex: '#FFFFFF', text: 'text-slate-800' },
  Pink: { name: 'Pink NCR', bg: 'bg-rose-100', border: 'border-rose-200 shadow-rose-100', hex: '#FFE4E6', text: 'text-rose-800' },
  Yellow: { name: 'Yellow NCR', bg: 'bg-amber-100', border: 'border-amber-200 shadow-amber-100', hex: '#FEF3C7', text: 'text-amber-800' },
  Blue: { name: 'Blue NCR', bg: 'bg-sky-100', border: 'border-sky-200 shadow-sky-100', hex: '#E0F2FE', text: 'text-sky-800' },
  Green: { name: 'Green NCR', bg: 'bg-emerald-100', border: 'border-emerald-200 shadow-emerald-100', hex: '#D1FAE5', text: 'text-emerald-800' },
  Custom: { name: 'Custom NCR', bg: 'bg-purple-100', border: 'border-purple-200 shadow-purple-100', hex: '#F3E8FF', text: 'text-purple-800' }
};

interface NCROperationalBuilderProps {
  formData: any;
  setFormData: (data: any) => void;
  materials: Material[];
}

export default function NCROperationalBuilder({ formData, setFormData, materials }: NCROperationalBuilderProps) {
  // Read existing ncrDetails or initialize standard default structure
  const ncrDetails = formData.ncrDetails || {
    paperColors: '',
    startNumber: '',
    endNumber: '',
    perforationPosition: '',
    bindingType: '',
    bindingPosition: '',
    layers: [],
    setsCount: 3,
    booksCount: 10,
    setsPerBook: 50,
    bindingEdge: 'Left',
    coverType: 'Softback'
  };

  const layers: NCRLayer[] = ncrDetails.layers || [];
  const [activeTab, setActiveTab] = useState<'blueprint' | 'costing' | 'materials' | 'qa'>('blueprint');
  
  // Imposition visualizer states
  const [showImpositionModal, setShowImpositionModal] = useState(false);
  const [explosionOffset, setExplosionOffset] = useState(65);
  const [showBleed, setShowBleed] = useState(true);
  const [showSafeMargins, setShowSafeMargins] = useState(true);
  const [showTrimMarks, setShowTrimMarks] = useState(true);
  const [showRegMarks, setShowRegMarks] = useState(true);
  const [selectedLIndex, setSelectedLIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
  
  // Suggested color sequence presets
  const colorPresets = {
    duplicate: ['White', 'Pink'],
    triplicate: ['White', 'Yellow', 'Pink'],
    quadruplicate: ['White', 'Yellow', 'Pink', 'Blue'],
    custom: ['White', 'Pink', 'Yellow', 'Blue', 'Green']
  };

  // Setup default layers when presets are selected
  const applyPreset = (presetType: 'duplicate' | 'triplicate' | 'quadruplicate') => {
    let size = 2;
    let purposes = ['Original copy', 'Office copy'];
    let paperTypes: ('CB' | 'CFB' | 'CF')[] = ['CB', 'CF'];
    let defaultColors = colorPresets.duplicate;

    if (presetType === 'triplicate') {
      size = 3;
      purposes = ['Original copy', 'Office copy', 'Client copy'];
      paperTypes = ['CB', 'CFB', 'CF'];
      defaultColors = colorPresets.triplicate;
    } else if (presetType === 'quadruplicate') {
      size = 4;
      purposes = ['Original copy', 'Accounts copy', 'Office copy', 'Client copy'];
      paperTypes = ['CB', 'CFB', 'CFB', 'CF'];
      defaultColors = colorPresets.quadruplicate;
    }

    const newLayers: NCRLayer[] = Array.from({ length: size }).map((_, i) => ({
      id: `layer-${Math.random().toString(36).substr(2, 9)}`,
      name: `Part ${i + 1}`,
      purpose: purposes[i] || 'Copy',
      color: (defaultColors[i] || 'White') as any,
      paperType: paperTypes[i] || 'CFB',
      gsm: 60,
      printSides: 'Front Only',
      inkConfig: 'Single Color Black',
      numberingReq: i === 0 ? 'Sequential' : 'Shared',
      startNumber: ncrDetails.startNumber || '0001',
      endNumber: ncrDetails.endNumber || '0500',
      prefix: '',
      suffix: '',
      numberColor: 'Red',
      numberPosition: 'Top Right',
      perforationReq: i < size - 1, // Usually and typically CB/CFB upper layers perforate, client copy CF stays as anchor in book!
      perforationNotes: 'Perforated for neat tear-out',
      bindingInstructions: 'Stitch and tape bound on top spine',
      variableDataReq: false,
      specialInstructions: ''
    }));

    updateNCRDetails({
      ...ncrDetails,
      setsCount: size,
      layers: newLayers,
      paperColors: defaultColors.join(' / ')
    });
  };

  // Helper to deep dispatch changes
  const updateNCRDetails = (updatedFields: any) => {
    // Generate combined quick strings to keep backward compatibility
    const paperColorsStr = updatedFields.layers?.map((l: NCRLayer) => l.color).join(' / ') || '';
    const firstLayer = updatedFields.layers?.[0];
    const firstStart = firstLayer?.startNumber || updatedFields.startNumber || '';
    const firstEnd = firstLayer?.endNumber || updatedFields.endNumber || '';

    const nextDetails = {
      ...ncrDetails,
      ...updatedFields,
      paperColors: paperColorsStr || ncrDetails.paperColors,
      startNumber: firstStart || ncrDetails.startNumber,
      endNumber: firstEnd || ncrDetails.endNumber
    };

    setFormData({
      ...formData,
      ncrDetails: nextDetails
    });
  };

  // Synchronize initial layer arrays if empty
  useEffect(() => {
    if (layers.length === 0) {
      applyPreset('triplicate');
    }
  }, []);

  // Modify individual layer values
  const modifyLayer = (layerId: string, updates: Partial<NCRLayer>) => {
    const nextLayers = layers.map(l => {
      if (l.id === layerId) {
        return { ...l, ...updates };
      }
      return l;
    });
    updateNCRDetails({ ...ncrDetails, layers: nextLayers });
  };

  // Add a layer
  const addLayer = () => {
    const i = layers.length;
    const newLayer: NCRLayer = {
      id: `layer-${Math.random().toString(36).substr(2, 9)}`,
      name: `Part ${i + 1}`,
      purpose: 'Additional Office Copy',
      color: 'Yellow',
      paperType: 'CFB',
      gsm: 60,
      printSides: 'Front Only',
      inkConfig: 'Single Color Black',
      numberingReq: 'Shared',
      startNumber: ncrDetails.startNumber || '0001',
      endNumber: ncrDetails.endNumber || '0500',
      prefix: '',
      suffix: '',
      numberColor: 'Red',
      numberPosition: 'Top Right',
      perforationReq: true,
      perforationNotes: 'Perforated',
      variableDataReq: false
    };
    updateNCRDetails({
      ...ncrDetails,
      setsCount: layers.length + 1,
      layers: [...layers, newLayer]
    });
  };

  // Remove a layer
  const removeLayer = (layerId: string) => {
    const nextLayers = layers.filter(l => l.id !== layerId);
    updateNCRDetails({
      ...ncrDetails,
      setsCount: nextLayers.length,
      layers: nextLayers
    });
  };

  // Duplicate a layer
  const duplicateLayer = (layer: NCRLayer) => {
    const newLayer: NCRLayer = {
      ...layer,
      id: `layer-${Math.random().toString(36).substr(2, 9)}`,
      name: `${layer.name} (Copy)`
    };
    updateNCRDetails({
      ...ncrDetails,
      setsCount: layers.length + 1,
      layers: [...layers, newLayer]
    });
  };

  // Move layer order
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === layers.length - 1) return;

    const nextLayers = [...layers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = nextLayers[index];
    nextLayers[index] = nextLayers[targetIndex];
    nextLayers[targetIndex] = temp;

    // Auto update names & paper sequence type safely
    const updatedLayers = nextLayers.map((l, i) => {
      let paperType: 'CB' | 'CFB' | 'CF' = 'CFB';
      if (i === 0) paperType = 'CB';
      else if (i === nextLayers.length - 1) paperType = 'CF';

      return {
        ...l,
        name: `Part ${i + 1}`,
        paperType
      };
    });

    updateNCRDetails({ ...ncrDetails, layers: updatedLayers });
  };

  // Inventory Stocks Lookup & Suggestions
  const getCarbonlessPapers = (): Material[] => {
    return materials.filter(m => 
      (m.category || '').toLowerCase().includes('paper') ||
      (m.name || '').toLowerCase().includes('ncr') ||
      (m.name || '').toLowerCase().includes('carbonless')
    );
  };

  const carbonlessStock = getCarbonlessPapers();

  // Dynamic Stock Reservation & Substitutions
  const bookCount = parseInt(ncrDetails.booksCount) || 10;
  const setsPerBookNum = parseInt(ncrDetails.setsPerBook) || 50;
  const totalSetsExpected = bookCount * setsPerBookNum;
  const wastageMultiplier = 1.10; // 10% process wastage allowance

  const getStockReservation = (): NCRStockAllocation[] => {
    return layers.map(layer => {
      // Find exact or best matching raw paper from registry
      const regexMatch = new RegExp(`${layer.color}`, 'i');
      const typeMatch = new RegExp(`${layer.paperType}`, 'i');
      
      let matchedMaterial = carbonlessStock.find(m => 
        regexMatch.test(m.name) && typeMatch.test(m.name)
      );

      // Slower fallback if color sequence didn't map
      if (!matchedMaterial) {
        matchedMaterial = carbonlessStock.find(m => typeMatch.test(m.name));
      }

      // Final fallback - generic first item or placeholder
      const matId = matchedMaterial?.id || 'placeholder-id';
      const matName = matchedMaterial?.name || `${layer.color} Carbonless ${layer.paperType} (${layer.gsm}gsm)`;
      const physicalStock = matchedMaterial?.stockLevel ?? 0;
      const neededSheets = Math.ceil(totalSetsExpected * wastageMultiplier);
      const isAvailable = physicalStock >= neededSheets;

      // Filter alternatives if stock is empty
      const alternatives = carbonlessStock.filter(m => 
        m.id !== matId && 
        typeMatch.test(m.name) && 
        (m.stockLevel ?? 0) >= neededSheets
      );

      return {
        materialId: matId,
        materialName: matName,
        reservedQty: neededSheets,
        available: isAvailable,
        substituteName: alternatives.length > 0 ? alternatives[0].name : 'SRA3 Bond Substitute (Local Sheets)'
      };
    });
  };

  const allocatedStocks = getStockReservation();

  // Dynamic Live Costing Algorithm
  const calculateNCRAccurateCosts = (): NCRCostBreakdown => {
    let paperSum = 0;
    let printingSum = 0;
    let sequenceAssemblySum = 0;
    let numberingSum = 0;
    let perforationSum = 0;

    const totalImpressions = totalSetsExpected * wastageMultiplier;

    layers.forEach((layer) => {
      // 1. Carbonless Sheet Pricing (Estimate average R0.45 - R1.20 per SRA3 cut depending on CB/CFB/CF)
      let customSheetPrice = 0.65; // CB Default
      if (layer.paperType === 'CFB') customSheetPrice = 0.85;
      if (layer.paperType === 'CF') customSheetPrice = 0.75;
      
      const layerPaperMaterials = carbonlessStock.find(m => 
        new RegExp(layer.color, 'i').test(m.name) && new RegExp(layer.paperType, 'i').test(m.name)
      );
      if (layerPaperMaterials?.costPrice) {
        customSheetPrice = layerPaperMaterials.costPrice;
      }

      const totalLayerSheets = Math.ceil(totalSetsExpected * wastageMultiplier);
      paperSum += totalLayerSheets * customSheetPrice;

      // 2. Ink & Print plates costing (R250 makeready plate + clicked rate R0.12 per impressions)
      const isDoubleSided = layer.printSides === 'Front + Back';
      const countPlates = isDoubleSided ? 2 : (layer.printSides === 'None' ? 0 : 1);
      
      printingSum += (countPlates * 150); // plate setup fee
      printingSum += totalImpressions * (countPlates * 0.15); // printing impression ink usage cost

      // 3. Collation and manual sheet gathering handling
      // R0.08 per collation pass sheet
      sequenceAssemblySum += totalSetsExpected * 0.08;

      // 4. Multi-Position numbering heads calibration (R0.10 setup fee per number sheet)
      if (layer.numberingReq !== 'None') {
        numberingSum += 120; // numbering unit mechanical setup
        numberingSum += totalSetsExpected * 0.12; // run rate
      }

      // 5. Specialty mechanical cross perforating line setup
      if (layer.perforationReq) {
        perforationSum += 80;
        perforationSum += totalSetsExpected * 0.06;
      }
    });

    // 6. Bindery finishing and thick leatherette wrap (Softback wrap vs Hardback spine board)
    let bindingBaseRate = 45; // R45 per book bindery
    if (ncrDetails.coverType === 'Hardback') bindingBaseRate = 95;
    if (ncrDetails.coverType === 'Board') bindingBaseRate = 60;
    const finishingAndBindingCost = bookCount * bindingBaseRate;

    const totalProductionCost = paperSum + printingSum + sequenceAssemblySum + numberingSum + perforationSum + finishingAndBindingCost;
    
    // Auto margin and target pricing calculation (Standard premium markup 65%)
    const standardMarkup = 1.65;
    const suggestedSellPrice = totalProductionCost * standardMarkup;

    return {
      paperCost: Math.round(paperSum),
      printCost: Math.round(printingSum),
      numberingCost: Math.round(numberingSum),
      collationCost: Math.round(sequenceAssemblySum),
      bindingCost: Math.round(finishingAndBindingCost),
      perforationCost: Math.round(perforationSum),
      finishingCost: Math.round(sequenceAssemblySum * 0.25),
      totalProductionCost: Math.round(totalProductionCost),
      marginPercent: 40,
      suggestedSellPrice: Math.round(suggestedSellPrice)
    };
  };

  const costingBreakdown = calculateNCRAccurateCosts();

  // Push final computed breakdown into form object if mismatch
  const layersStr = JSON.stringify(layers);
  useEffect(() => {
    const currentBreakdownStr = JSON.stringify(ncrDetails.costBreakdown || {});
    const nextBreakdownStr = JSON.stringify(costingBreakdown);
    const currentAllocationStr = JSON.stringify(ncrDetails.stockAllocation || []);
    const nextAllocationStr = JSON.stringify(allocatedStocks);

    if (currentBreakdownStr !== nextBreakdownStr || currentAllocationStr !== nextAllocationStr) {
      updateNCRDetails({
        ...ncrDetails,
        costBreakdown: costingBreakdown,
        stockAllocation: allocatedStocks
      });
    }
  }, [layersStr, bookCount, setsPerBookNum, ncrDetails.coverType]);

  // QA Auditing Checklist Engine
  const runQAAudit = () => {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (layers.length === 0) {
      issues.push('Production stack has 0 registered layers. Ensure sheets are created.');
      return { issues, warnings };
    }

    // 1. Sequenced layout bounds CFB vs CB vs CF validation
    const topLayer = layers[0];
    const bottomLayer = layers[layers.length - 1];

    if (topLayer && topLayer.paperType !== 'CB') {
      warnings.push(`Layer 1 is '${topLayer.paperType}' instead of 'CB' (Coated Back). Ink transfers might not propagate correctly!`);
    }

    if (bottomLayer && bottomLayer.paperType !== 'CF') {
      warnings.push(`Bottom Layer (${layers.length}) is '${bottomLayer.paperType}' instead of 'CF' (Coated Front). Sequenced stack may trigger missing back-transfers!`);
    }

    // Checking middle pages are CFB (Coated Front & Back)
    for (let index = 1; index < layers.length - 1; index++) {
      const mid = layers[index];
      if (mid.paperType !== 'CFB') {
        warnings.push(`Layer ${index + 1} ('${mid.paperType}') should ideally be 'CFB' (Coated Front & Back) to guarantee through-transfer.`);
      }
    }

    // 2. Sequential Numbering audit check
    const hasNumPrefixes = layers.map(l => l.prefix || '');
    const numTypes = layers.map(l => l.numberingReq);
    if (numTypes.includes('Sequential')) {
      // Ensure starting number exists and is numeric
      layers.forEach((l, idx) => {
        if (l.numberingReq === 'Sequential' && (!l.startNumber || isNaN(Number(l.startNumber)))) {
          issues.push(`Layer ${idx + 1} claims sequential numbering, but Start Number is absent or non-numeric.`);
        }
      });
    }

    // Duplicated prefixes alerts
    const hasDuplicates = new Set(layers.map(l => `${l.prefix}-${l.startNumber}`)).size < layers.filter(l => l.numberingReq === 'Sequential').length;
    if (hasDuplicates) {
      warnings.push('Sequential settings indicate duplicated prefixes/ranges. Verify shared numbering values.');
    }

    // 3. Inventory low sheets
    const criticalSheets = allocatedStocks.filter(s => !s.available);
    if (criticalSheets.length > 0) {
      warnings.push(`${criticalSheets.length} layer sheets do not have enough physical stock level. Review Materials registry.`);
    }

    return { issues, warnings };
  };

  const { issues: qaIssues, warnings: qaWarnings } = runQAAudit();

  // Dynamic Thickness Calculation (average micron thickness 80 microns per SRA3 carbonless sheet)
  const calcStackThicknessMm = () => {
    const totalSheetsInUnit = layers.length * setsPerBookNum;
    return (totalSheetsInUnit * 0.082).toFixed(1); // 0.082mm average paper thickness
  };

  return (
    <div id="ncr-production-module-container" className="bg-slate-50/50 rounded-[2rem] border border-slate-150 p-6 md:p-8 shadow-inner relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-300/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      
      {/* Upper Module Badge Grid */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 bgi bg-slate-200 text-slate-800 text-[8px] font-black uppercase tracking-widest rounded-md">ERP Core</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#6366F1]">Carbonless Stack Specialist</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <BookOpen size={20} className="text-slate-600" /> Operational NCR Builder
          </h3>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
            Configure multi-part layer sequence, numbering arrays, and bindery specs
          </p>
        </div>

        {/* Dynamic Quantity Controller */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm relative z-10 w-full lg:w-auto">
          <div className="flex flex-col px-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order Books</span>
            <input 
              type="number"
              value={ncrDetails.booksCount || ''}
              onChange={(e) => updateNCRDetails({ booksCount: parseInt(e.target.value) || 0 })}
              className="w-16 font-mono font-black text-[12px] text-slate-800 p-0.5 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-slate-800"
              min={1}
            />
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex flex-col px-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sets / Book</span>
            <select
              value={ncrDetails.setsPerBook || 50}
              onChange={(e) => updateNCRDetails({ setsPerBook: parseInt(e.target.value) || 50 })}
              className="w-20 font-mono font-black text-[12px] text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value={25}>25 Sets</option>
              <option value={50}>50 Sets</option>
              <option value={100}>100 Sets</option>
              <option value={150}>150 Sets</option>
            </select>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex flex-col px-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Binding Edge</span>
            <select
              value={ncrDetails.bindingEdge || 'Left'}
              onChange={(e) => updateNCRDetails({ bindingEdge: e.target.value as any })}
              className="w-20 font-mono font-black text-[12px] text-slate-850 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="Left">Left Side</option>
              <option value="Top">Top Spine</option>
              <option value="Right">Right Side</option>
              <option value="Bottom">Bottom</option>
            </select>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex flex-col px-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cover Wrapping</span>
            <select
              value={ncrDetails.coverType || 'Softback'}
              onChange={(e) => updateNCRDetails({ coverType: e.target.value as any })}
              className="w-24 font-mono font-black text-[12px] text-slate-850 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="Softback">Soft Leather</option>
              <option value="Hardback">Hard Spine</option>
              <option value="Board">Manilla Board</option>
              <option value="None">None (Pads)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Internal Subtabs Menu */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 mb-6 gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('blueprint')}
            className={cn(
              "pb-3 text-[10px] font-black tracking-widest uppercase relative px-2 transition-all flex items-center gap-2",
              activeTab === 'blueprint' ? "text-slate-800 font-extrabold border-b-2 border-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Sliders size={13} />
            <span>Layer Configuration</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('costing')}
            className={cn(
              "pb-3 text-[10px] font-black tracking-widest uppercase relative px-2 transition-all flex items-center gap-2",
              activeTab === 'costing' ? "text-slate-800 font-extrabold border-b-2 border-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Coins size={13} />
            <span>Costing & Margin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={cn(
              "pb-3 text-[10px] font-black tracking-widest uppercase relative px-2 transition-all flex items-center gap-2",
              activeTab === 'materials' ? "text-slate-800 font-extrabold border-b-2 border-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Box size={13} />
            <span>Substrate Allocation</span>
            {allocatedStocks.some(s => !s.available) && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={cn(
              "pb-3 text-[10px] font-black tracking-widest uppercase relative px-2 transition-all flex items-center gap-2",
              activeTab === 'qa' ? "text-slate-800 font-extrabold border-b-2 border-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ShieldAlert size={13} />
            <span>QC Validation ({qaIssues.length + qaWarnings.length})</span>
            {qaIssues.length > 0 ? (
              <span className="px-1.5 py-0.5 text-[8px] bg-red-100 text-red-700 font-black rounded" >ERR</span>
            ) : qaWarnings.length > 0 ? (
              <span className="px-1.5 py-0.5 text-[8px] bg-amber-100 text-amber-700 font-black rounded" >WARN</span>
            ) : (
              <span className="px-1.5 py-0.5 text-[8px] bg-green-100 text-green-700 font-black rounded" >OK</span>
            )}
          </button>
        </div>

        <button
          id="btn-visualize-imposition"
          type="button"
          onClick={() => {
            setSelectedLIndex(layers.length - 1); // Select a valid layer
            setShowImpositionModal(true);
          }}
          className="pb-2 text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:shadow-indigo-100 text-white rounded-xl shadow-md transform hover:-translate-y-0.5 active:translate-y-0 mb-3"
        >
          <Layers size={13} className="animate-pulse" />
          <span>Visualize Imposition</span>
        </button>
      </div>

      {/* Main Container Multi-Grid Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT - Configuration Forms */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'blueprint' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* PRESETS HEADER BAR */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Stack Form Presets</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-normal">Instantly assign duplicate, triplicate or quadruplicate configurations</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset('duplicate')}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-700 border border-slate-200 transition-all shadow-sm"
                    >
                      Duplicate Set
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('triplicate')}
                      className="px-3 py-1.5 bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10 text-[9px] font-black uppercase tracking-widest rounded-xl text-[#4F46E5] border border-[#4F46E5]/10 transition-all shadow-sm"
                    >
                      Triplicate Set
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('quadruplicate')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-xl text-emerald-700 border border-emerald-200 transition-all shadow-sm"
                    >
                      Quad Set
                    </button>
                  </div>
                </div>

                {/* DYNAMIC LAYERS list wrapper */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Layer Matrix Sequence ({layers.length} Layers)
                    </span>
                    <button
                      type="button"
                      onClick={addLayer}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all"
                    >
                      <Plus size={11} strokeWidth={3} /> Add Layer
                    </button>
                  </div>

                  {layers.map((layer, index) => {
                    const colorData = NCR_COLORS[layer.color as keyof typeof NCR_COLORS] || NCR_COLORS.Custom;
                    
                    return (
                      <motion.div
                        key={layer.id}
                        layoutId={layer.id}
                        className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        {/* Layer Title Row */}
                        <div className={cn("px-5 py-3.5 flex flex-wrap items-center justify-between border-b border-slate-150 gap-2", colorData.bg)}>
                          <div className="flex items-center gap-3">
                            {/* UP / DOWN ARROWS FOR PRECISE PRODUCTION ORDER HANDLING */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveLayer(index, 'up')}
                                className="p-0.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                                title="Move Layer Up"
                              >
                                <ArrowUp size={11} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                disabled={index === layers.length - 1}
                                onClick={() => moveLayer(index, 'down')}
                                className="p-0.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                                title="Move Layer Down"
                              >
                                <ArrowDown size={11} strokeWidth={3} />
                              </button>
                            </div>

                            {/* Circular Index Tracker */}
                            <div className="w-6 h-6 rounded-full bg-white text-slate-900 border border-slate-300 flex items-center justify-center font-black text-[10px]">
                              {index + 1}
                            </div>
                            
                            {/* Core Specs Snapshot */}
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase tracking-tight text-slate-850 flex items-center gap-1.5">
                                {layer.name} — <span className="opacity-75">{layer.gsm}gsm {layer.paperType}</span>
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-normal text-slate-400">
                                {layer.purpose || 'Not specified purpose'} • {layer.printSides}
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => duplicateLayer(layer)}
                              className="p-1.5 bg-white/70 hover:bg-white text-slate-600 rounded-xl border border-slate-200"
                              title="Duplicate Layer"
                            >
                              <Copy size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={layers.length <= 1}
                              onClick={() => removeLayer(layer.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 disabled:opacity-50"
                              title="Delete Layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Extended Spec Grid Form per Layer */}
                        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-left">
                          
                          {/* 1. LAYER COPY PURPOSE */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Copy Purpose / Office</label>
                            <input 
                              type="text"
                              value={layer.purpose}
                              onChange={(e) => modifyLayer(layer.id, { purpose: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                              placeholder="e.g. Finance Copy, Admin Store"
                            />
                          </div>

                          {/* 2. PAPER COATING (CB/CFB/CF) */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Chemical Coating Type</label>
                            <select 
                              value={layer.paperType}
                              onChange={(e) => modifyLayer(layer.id, { paperType: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
                            >
                              <option value="CB">CB (Coated Back - Top Original)</option>
                              <option value="CFB">CFB (Coated Front & Back - Middle Page)</option>
                              <option value="CF">CF (Coated Front - Bottom Anchor)</option>
                            </select>
                          </div>

                          {/* 3. COLOR SELECTION */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sheet Colour Swatch</label>
                            <div className="flex items-center gap-1.5">
                              {Object.keys(NCR_COLORS).map(color => {
                                const cDat = NCR_COLORS[color as keyof typeof NCR_COLORS];
                                const isSelected = layer.color === color;
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => modifyLayer(layer.id, { color: color as any })}
                                    className={cn(
                                      "w-6 h-6 rounded-full border shadow-sm transition-all hover:scale-110",
                                      cDat.bg,
                                      isSelected ? "ring-2 ring-[#4F46E5] scale-105 border-[#4F46E5]" : "border-slate-300"
                                    )}
                                    title={cDat.name}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* 4. GRAMMAGE (GSM) */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Paper Weight (GSM)</label>
                            <select 
                              value={layer.gsm}
                              onChange={(e) => modifyLayer(layer.id, { gsm: parseInt(e.target.value) || 60 })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800"
                            >
                              <option value={53}>53gsm (Extra Thin Transfer)</option>
                              <option value={57}>57gsm (Standard Japanese)</option>
                              <option value={60}>60gsm (Standard Premium Carbonless)</option>
                              <option value={80}>80gsm (Heavyweight NCR)</option>
                            </select>
                          </div>

                          {/* 5. PRINT SIDES */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Print Sided Configuration</label>
                            <select 
                              value={layer.printSides}
                              onChange={(e) => modifyLayer(layer.id, { printSides: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800 focus:bg-white focus:outline-none"
                            >
                              <option value="Front Only">Front Printing Only</option>
                              <option value="Front + Back">Front + Back Double Printing (e.g. Terms & Conds)</option>
                              <option value="Back Only">Back Face printing only</option>
                              <option value="None">None (Blank sheets sequence)</option>
                            </select>
                          </div>

                          {/* 6. INK CONFIGURATION */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ink Ink-jet / Litho Settings</label>
                            <select 
                              value={layer.inkConfig}
                              onChange={(e) => modifyLayer(layer.id, { inkConfig: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800"
                            >
                              <option value="Single Color Black">Process Solid Black (K)</option>
                              <option value="Single Color Blue">Process Cyan (C) or Reflex Blue</option>
                              <option value="Double Sided K/K">Double Sided Carbon-copy K/K</option>
                              <option value="Full Colour">CYAN+MAG+YEL+BLK Process</option>
                              <option value="Custom">Custom Spot / Reflex Surcharges</option>
                            </select>
                          </div>

                          {/* 7. NESTED LAYER NUMBERING ARRAY */}
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Red Tool Mechanical Numbering</label>
                            <select 
                              value={layer.numberingReq}
                              onChange={(e) => modifyLayer(layer.id, { numberingReq: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-800"
                            >
                              <option value="Sequential">Active Sequential Series (Prefix code + Start)</option>
                              <option value="Shared">Shared Index / Same value as Upper sheet</option>
                              <option value="Unique">Unique Segmented Code</option>
                              <option value="None">No print numbering required</option>
                            </select>
                          </div>

                          {/* 8. START / END SERIAL NUMBERING INPUTS */}
                          {layer.numberingReq !== 'None' && (
                            <>
                              <div>
                                <label className="block text-[8px] font-black text-[#5046e5] uppercase tracking-widest mb-1 font-mono">Serial Start Index</label>
                                <input 
                                  type="text"
                                  value={layer.startNumber || ''}
                                  onChange={(e) => modifyLayer(layer.id, { startNumber: e.target.value })}
                                  className="w-full px-3 py-2 bg-indigo-50/40 border border-[#5046e5]/20 rounded-xl font-black font-mono text-[10px] text-slate-800 focus:bg-white"
                                  placeholder="0001"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-[#6366f1] uppercase tracking-widest mb-1 font-mono">Number Code Prefix / Suffix</label>
                                <div className="flex gap-1">
                                  <input 
                                    type="text"
                                    value={layer.prefix || ''}
                                    onChange={(e) => modifyLayer(layer.id, { prefix: e.target.value })}
                                    className="w-1/2 px-2 py-2 bg-indigo-50/40 border border-[#5046e5]/20 rounded-xl font-black font-mono text-[10px] text-slate-850"
                                    placeholder="Prefix"
                                  />
                                  <input 
                                    type="text"
                                    value={layer.suffix || ''}
                                    onChange={(e) => modifyLayer(layer.id, { suffix: e.target.value })}
                                    className="w-1/2 px-2 py-2 bg-indigo-50/40 border border-[#5046e5]/20 rounded-xl font-black font-mono text-[10px] text-slate-850"
                                    placeholder="Suffix"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* 9. CRITICAL INDIVIDUAL PERFORATION SETTING */}
                          <div className="md:col-span-3 pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-dashed border-slate-150 gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <input 
                                id={`perf-toggle-${layer.id}`}
                                type="checkbox"
                                checked={layer.perforationReq}
                                onChange={(e) => modifyLayer(layer.id, { perforationReq: e.target.checked })}
                                className="w-4 h-4 text-[#4F46E5] bg-slate-100 border-slate-300 rounded focus:ring-[#4F46E5]"
                              />
                              <label htmlFor={`perf-toggle-${layer.id}`} className="text-[10px] font-black text-slate-700 uppercase tracking-wide cursor-pointer select-none">
                                Require Tear-out Sheet Perforation
                              </label>
                            </div>
                            
                            {layer.perforationReq && (
                              <input 
                                type="text"
                                value={layer.perforationNotes || ''}
                                onChange={(e) => modifyLayer(layer.id, { perforationNotes: e.target.value })}
                                className="flex-1 max-w-md px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[9px] text-slate-600 focus:bg-white focus:outline-none"
                                placeholder="Perforation notes (e.g., Left side 15mm crease margin)"
                              />
                            )}
                          </div>

                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* COSTING & EXTRA PRODUCTION LABELS TAB */}
            {activeTab === 'costing' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Manufacturing Costing Engine</span>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic pl-1 mb-6 border-l-4 border-emerald-500 pl-4">Live Multi-layer Costing Breakdowns</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 text-left">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Carbonless Medium Stocks</span>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">R {costingBreakdown.paperCost.toFixed(2)}</p>
                      <span className="text-[8px] text-slate-400 uppercase block mt-0.5">Quantity-wastage compensated</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Litho Setup / Plate costs</span>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">R {costingBreakdown.printCost.toFixed(2)}</p>
                      <span className="text-[8px] text-slate-400 uppercase block mt-0.5">Makeready plate + clicked surcharge</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Numbering Setup / Tooling</span>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">R {costingBreakdown.numberingCost.toFixed(2)}</p>
                      <span className="text-[8px] text-slate-400 uppercase block mt-0.5">Machine head alignment calibrations</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Bindery Spine stitching</span>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">R {costingBreakdown.bindingCost.toFixed(2)}</p>
                      <span className="text-[8px] text-slate-400 uppercase block mt-0.5">{ncrDetails.coverType} spine stitching</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Crease Perforation cuts</span>
                      <p className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">R {costingBreakdown.perforationCost.toFixed(2)}</p>
                      <span className="text-[8px] text-slate-400 uppercase block mt-0.5">Individual page perforation run</span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Total Production Cost</span>
                      <p className="text-xl font-bold font-mono text-emerald-900 mt-1 tabular-nums">R {costingBreakdown.totalProductionCost.toFixed(2)}</p>
                      <span className="text-[8px] text-emerald-500 uppercase block mt-0.5">Aggregated manufacturing cost</span>
                    </div>
                  </div>

                  {/* Pricing controls and Gross Margin calculator */}
                  <div className="p-5 bg-[#4F46E5]/5 rounded-3xl border border-[#4F46E5]/10 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
                    <div>
                      <span className="px-2 py-0.5 bg-[#4F46E5] text-white text-[8px] font-black uppercase tracking-widest rounded">Target GP Calculator</span>
                      <h5 className="text-sm font-black text-slate-800 uppercase mt-2">Signpro Standard 65% Markup Suggestion</h5>
                      <p className="text-[9px] text-slate-500 uppercase">Suggested Base Retail Price which yields R {Math.round(costingBreakdown.suggestedSellPrice - costingBreakdown.totalProductionCost)} profit</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Suggested Sell Price</span>
                        <span className="text-2xl font-black text-[#4F46E5] font-mono tracking-tight tabular-nums">R {costingBreakdown.suggestedSellPrice.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PHYSICAL STOCK ALLOCATION INVENTORY CHECKS */}
            {activeTab === 'materials' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-5">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Stock Reservation Audit</span>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic">Materials Integration Registry Link</h4>
                    </div>
                    <span className="px-2.5 py-1 text-[8px] bg-slate-100 border font-mono font-bold uppercase rounded-xl tracking-wider text-slate-600">
                      Calculated wastage allowance: +10%
                    </span>
                  </div>

                  {allocatedStocks.map((alloc, idx) => {
                    return (
                      <div 
                        key={idx}
                        className="py-4 border-b border-dashed border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 last:border-0 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center font-black font-mono text-xs",
                            alloc.available ? "bg-green-50 text-green-700 border-green-200 animate-in fade-in" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          )}>
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Mapped layer Part {idx + 1} Paper</span>
                            <p className="text-xs font-black text-slate-800 uppercase italic mt-0.5">{alloc.materialName}</p>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-normal">
                              Allocated stock volume required: <span className="text-slate-700 font-black tabular-nums">{alloc.reservedQty} SRA3 Sheets</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                          {alloc.available ? (
                            <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1">
                              <Check size={11} strokeWidth={3} /> Stock Secured
                            </span>
                          ) : (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="px-3 py-1.5 bg-red-50 border border-red-150 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1 animate-pulse">
                                <AlertCircle size={11} /> Stock Insufficient
                              </span>
                              <span className="text-[8px] text-amber-600 font-bold uppercase block text-right max-w-[180px]">
                                Alternative suggestion: {alloc.substituteName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* QA VALIDATION AND PRE-PRINT CHECKS */}
            {activeTab === 'qa' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Production Integrity Check</span>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic mb-6">Printer GTO Mechanical Constraints Analysis</h4>

                  {/* Serious Issue Check */}
                  {qaIssues.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-3xl mb-5 space-y-2">
                      <div className="flex items-center gap-2 text-red-700 mb-1">
                        <AlertCircle size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Critical Production Flaws ({qaIssues.length})</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {qaIssues.map((issue, idx) => (
                          <li key={idx} className="text-[10px] font-bold text-red-650 uppercase tracking-tight leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings and alerts */}
                  {qaWarnings.length > 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 mb-1">
                        <AlertTriangle size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Quality Warnings / Sequence Warnings ({qaWarnings.length})</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {qaWarnings.map((warn, idx) => (
                          <li key={idx} className="text-[10px] font-bold text-amber-700 uppercase tracking-tight leading-relaxed">{warn}</li>
                        ))}
                      </ul>
                    </div>
                  ) : qaIssues.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed">
                      <Check className="text-emerald-500 mb-2" size={32} strokeWidth={2.5} />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sequence & Numbering Integrity Clear</span>
                      <p className="text-[9px] text-slate-400 uppercase mt-0.5">Chemically sequenced CB to CF hierarchy fully validated for GTO press collation</p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COMPONENT - Interactive Real Time Stack Preview & Checklist */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* LIVE 3D STYLE COLOR STACK PREVIEW CARD */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-1 block">Live Visual Preview</span>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic mb-8">Layer Stack Preview</h4>
            
            {/* STACK REPRESENTATION AREA */}
            <div className="relative h-64 flex items-center justify-center p-4 select-none mb-6">
              
              {/* Stack Sheets tilted in isometric 3D representation */}
              <div className="relative w-48 h-44 flex flex-col-reverse justify-center items-center">
                <AnimatePresence>
                  {layers.map((layer, index) => {
                    const colorData = NCR_COLORS[layer.color as keyof typeof NCR_COLORS] || NCR_COLORS.Custom;
                    // Tilted isometric style offsets
                    const offsetZ = index * 12;
                    const rotateX = 55;
                    const rotateY = 0;
                    const rotateZ = -22;
                    
                    return (
                      <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          y: -offsetZ,
                        }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 15 }}
                        className={cn(
                          "absolute w-40 h-28 rounded-xl border shadow-md flex flex-col justify-between p-3.5 transition-all duration-300",
                          colorData.bg,
                          colorData.border
                        )}
                        style={{
                          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                          zIndex: index + 10,
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        {/* Upper watermark layer descriptor */}
                        <div className="flex justify-between items-start">
                          <span className="px-1.5 py-0.5 text-[7px] bg-slate-900/10 text-slate-800 uppercase font-black tracking-widest rounded leading-none">
                            {layer.paperType}
                          </span>
                          <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">
                            {layer.gsm}gsm
                          </span>
                        </div>

                        {/* Middle purpose / naming label */}
                        <div className="text-center">
                          <p className="text-[8px] font-black uppercase text-slate-800 truncate tracking-tight">{layer.purpose || 'Not Spec Purpose'}</p>
                          <p className="text-[6px] font-bold text-slate-400 uppercase tracking-normal mt-0.5 whitespace-nowrap">{colorData.name}</p>
                        </div>

                        {/* Lower index tracking */}
                        <div className="flex justify-between items-end">
                          <span className="text-[7px] font-bold text-slate-450 uppercase tracking-tight">
                            {index + 1}/{layers.length}
                          </span>
                          {/* Sequential Numbering Marker Spot */}
                          {layer.numberingReq !== 'None' && (
                            <div className="text-[6px] font-black text-red-650 uppercase font-mono px-1 bg-red-50 rounded select-none shadow-sm flex items-center gap-0.5">
                              <Hash size={6} strokeWidth={3} /> {layer.prefix || ''}{layer.startNumber || '0001'}
                            </div>
                          )}
                        </div>

                        {/* Top spines or side thick binding edge overlay */}
                        {ncrDetails.bindingEdge === 'Left' && (
                          <div className="absolute left-0 top-0 bottom-0 w-3 bg-red-950/20 rounded-l-xl border-r border-red-950/10" style={{ transform: 'translateZ(1px)' }} />
                        )}
                        {ncrDetails.bindingEdge === 'Top' && (
                          <div className="absolute left-0 right-0 top-0 h-3 bg-red-950/20 rounded-t-xl border-b border-red-950/10" style={{ transform: 'translateZ(1px)' }} />
                        )}
                        {ncrDetails.bindingEdge === 'Right' && (
                          <div className="absolute right-0 top-0 bottom-0 w-3 bg-red-950/20 rounded-r-xl border-l border-red-950/10" style={{ transform: 'translateZ(1px)' }} />
                        )}
                        {ncrDetails.bindingEdge === 'Bottom' && (
                          <div className="absolute left-0 right-0 bottom-0 h-3 bg-red-950/20 rounded-b-xl border-t border-red-950/10" style={{ transform: 'translateZ(1px)' }} />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

            </div>

            {/* Quick stats grid below preview */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-left">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Finished Book Thickness</span>
                <span className="text-sm font-black font-mono text-slate-700">{calcStackThicknessMm()} mm</span>
                <span className="text-[7px] text-slate-400 block mt-0.5">Calculated spine width</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Press Sets Run</span>
                <span className="text-sm font-black font-mono text-slate-700 tabular-nums">{totalSetsExpected} Sets</span>
                <span className="text-[7px] text-slate-400 block mt-0.5">Books x sets per book</span>
              </div>
            </div>
          </div>

          {/* QUICK OPERATOR ACTION MANUAL DETAILS */}
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-850 shadow-lg text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded">Floor Card</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Binder Instructions</span>
            </div>
            
            <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight italic mb-4">Quick Operator Bindery Guide</h4>
            
            <div className="space-y-4 text-xs font-semibold pl-1">
              <div>
                <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1">Set Collation Flow</span>
                <div className="p-2.5 bg-slate-800 rounded-xl flex flex-wrap gap-1.5 items-center">
                  {layers.map((l, i) => (
                    <span 
                      key={l.id}
                      className={cn(
                        "px-1.5 py-1 rounded text-[8px] font-black uppercase tracking-tight",
                        l.color === 'White' ? 'bg-white text-slate-900' :
                        l.color === 'Pink' ? 'bg-rose-500 text-white' :
                        l.color === 'Yellow' ? 'bg-amber-500 text-slate-950' :
                        l.color === 'Blue' ? 'bg-sky-500 text-white' :
                        l.color === 'Green' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                      )}
                    >
                      {l.paperType}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1">Number Sequence</span>
                  <p className="font-mono text-[11px] font-black text-emerald-400 tracking-tight leading-none tabular-nums">
                    {ncrDetails.startNumber ? `# ${ncrDetails.startNumber}` : 'No sequential'}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider mb-1 font-mono">End Number Target</span>
                  <p className="font-mono text-[11px] font-black text-slate-300 tracking-tight leading-none tabular-nums">
                    {ncrDetails.endNumber ? `# ${ncrDetails.endNumber}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Visualize Imposition Modal */}
      <AnimatePresence>
        {showImpositionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 font-sans">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImpositionModal(false)}
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
            />

            {/* Modal Panel container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col xl:flex-row h-[90vh] max-h-[820px] z-10 text-slate-800"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowImpositionModal(false)}
                className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all z-20"
              >
                <Plus className="rotate-45" size={20} strokeWidth={2.5} />
              </button>

              {/* LEFT SECTION: INTERACTIVE SVG PREVIEW */}
              <div className="flex-1 bg-slate-50 p-6 md:p-8 flex flex-col h-full border-r border-[#e2e8f0] overflow-hidden">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-indigo-150 text-[#4F46E5] text-[8px] font-black uppercase tracking-widest rounded">Press Imposition Proof</span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">SVG Isometric Render Mode</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">NCR Stack Mechanical Imposition</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Inspect 3D sequenced trim lines, bleed margins, perforation rules, and sequential positions.
                  </p>
                </div>

                {/* SVG STAGE SCREEN */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-inner relative flex items-center justify-center overflow-hidden min-h-[300px]">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 600 480"
                    className="w-full h-full select-none"
                    style={{ background: '#f8fafc' }}
                  >
                    {/* Visual grid pattern background */}
                    <defs>
                      <pattern id="imposition-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#imposition-grid)" />

                    {/* Draw actual isometric sheets */}
                    {(() => {
                      const w = 220; // isometric sheet width
                      const l = 150; // isometric sheet length
                      
                      return layers.map((layer, idx) => {
                        const colorData = NCR_COLORS[layer.color as keyof typeof NCR_COLORS] || NCR_COLORS.Custom;
                        
                        let cx = 300;
                        let cy = 250;
                        let H = 0;

                        if (viewMode === 'stack') {
                          cx = 300;
                          cy = 340;
                          H = (layers.length - 1 - idx) * explosionOffset;
                        } else {
                          // Grid layout side by side
                          const cols = layers.length > 3 ? 3 : 2;
                          const col = idx % cols;
                          const row = Math.floor(idx / cols);

                          cx = (layers.length > 3) 
                            ? (120 + col * 180) 
                            : (180 + col * 240);
                            
                          cy = (layers.length > 3)
                            ? (150 + row * 170)
                            : (220 + row * 180);
                          H = 0; // Flat grid lay flat
                        }

                        // Projection formulas
                        const project = (x3d: number, y3d: number, z3d: number) => {
                          return {
                            x: cx + (x3d - z3d) * 0.866,
                            y: cy + (x3d + z3d) * 0.5 - y3d
                          };
                        };

                        // Coordinates for the 4 corners
                        const p1 = project(-w / 2, H, -l / 2); // Back
                        const p2 = project(w / 2, H, -l / 2);  // Right
                        const p3 = project(w / 2, H, l / 2);   // Front
                        const p4 = project(-w / 2, H, l / 2);  // Left

                        // Bleed Size
                        const bSize = 10;
                        const pb1 = project(-(w / 2 + bSize), H, -(l / 2 + bSize));
                        const pb2 = project(w / 2 + bSize, H, -(l / 2 + bSize));
                        const pb3 = project(w / 2 + bSize, H, l / 2 + bSize);
                        const pb4 = project(-(w / 2 + bSize), H, l / 2 + bSize);

                        // Safe Area Offset Margin
                        const sSize = -10;
                        const ps1 = project(-(w / 2 + sSize), H, -(l / 2 + sSize));
                        const ps2 = project(w / 2 + sSize, H, -(l / 2 + sSize));
                        const ps3 = project(w / 2 + sSize, H, l / 2 + sSize);
                        const ps4 = project(-(w / 2 + sSize), H, l / 2 + sSize);

                        const isLayerHighlighted = selectedLIndex === null || selectedLIndex === idx;
                        const isAnySelected = selectedLIndex !== null;
                        const layerOpacity = isLayerHighlighted ? 1.0 : 0.22;

                        return (
                          <g 
                            key={layer.id} 
                            opacity={layerOpacity} 
                            className="transition-all duration-300 cursor-pointer"
                            onClick={() => setSelectedLIndex(idx)}
                          >
                            {/* 1. Bleed Outer Region Shading and dashed trim outline */}
                            {showBleed && (
                              <g>
                                <path
                                  d={`M ${pb1.x} ${pb1.y} L ${pb2.x} ${pb2.y} L ${pb3.x} ${pb3.y} L ${pb4.x} ${pb4.y} Z`}
                                  fill="#f43f5e"
                                  fillOpacity="0.03"
                                  stroke="#f43f5e"
                                  strokeWidth="0.8"
                                  strokeDasharray="3 3"
                                />
                                <text 
                                  x={pb2.x + 8} 
                                  y={pb2.y - 4} 
                                  fill="#ef4444" 
                                  fontSize="6.5" 
                                  fontWeight="bold" 
                                  fontFamily="monospace"
                                >
                                  +3mm Bleed
                                </text>
                              </g>
                            )}

                            {/* 2. 3D extruded edge thickness */}
                            <path
                              d={`M ${p4.x} ${p4.y} L ${p3.x} ${p3.y} L ${p3.x} ${p3.y + 2.5} L ${p4.x} ${p4.y + 2.5} Z`}
                              fill={layer.color === 'White' ? '#cbd5e1' : '#b45309'}
                              fillOpacity={layer.color === 'White' ? 0.35 : 0.25}
                            />
                            <path
                              d={`M ${p3.x} ${p3.y} L ${p2.x} ${p2.y} L ${p2.x} ${p2.y + 2.5} L ${p3.x} ${p3.y + 2.5} Z`}
                              fill={layer.color === 'White' ? '#94a3b8' : '#78350f'}
                              fillOpacity={layer.color === 'White' ? 0.45 : 0.35}
                            />

                            {/* 3. Main cut sheet representing trimmed finish boundary */}
                            <path
                              d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`}
                              fill={colorData.hex}
                              stroke={isLayerHighlighted && isAnySelected ? '#4f46e5' : '#475569'}
                              strokeWidth={isLayerHighlighted && isAnySelected ? '1.8' : '1'}
                              className="transition-colors duration-300"
                            />

                            {/* 4. Safe Margin guides */}
                            {showSafeMargins && (
                              <path
                                d={`M ${ps1.x} ${ps1.y} L ${ps2.x} ${ps2.y} L ${ps3.x} ${ps3.y} L ${ps4.x} ${ps4.y} Z`}
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="0.8"
                                strokeDasharray="2 2"
                                opacity="0.65"
                              />
                            )}

                            {/* 5. Binding Tape edge representation */}
                            {(() => {
                              const baseEdge = ncrDetails.bindingEdge || 'Left';
                              let tapePath = '';
                              
                              if (baseEdge === 'Left') {
                                const p_in1 = project(-w / 2 + 12, H, -l / 2);
                                const p_in4 = project(-w / 2 + 12, H, l / 2);
                                tapePath = `M ${p1.x} ${p1.y} L ${p_in1.x} ${p_in1.y} L ${p_in4.x} ${p_in4.y} L ${p4.x} ${p4.y} Z`;
                              } else if (baseEdge === 'Top') {
                                const p_in1 = project(-w / 2, H, -l / 2 + 12);
                                const p_in2 = project(w / 2, H, -l / 2 + 12);
                                tapePath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p_in2.x} ${p_in2.y} L ${p_in1.x} ${p_in1.y} Z`;
                              } else if (baseEdge === 'Right') {
                                const p_in2 = project(w / 2 - 12, H, -l / 2);
                                const p_in3 = project(w / 2 - 12, H, l / 2);
                                tapePath = `M ${p2.x} ${p2.y} L ${p_in2.x} ${p_in2.y} L ${p_in3.x} ${p_in3.y} L ${p3.x} ${p3.y} Z`;
                              } else if (baseEdge === 'Bottom') {
                                const p_in4 = project(-w / 2, H, l / 2 - 12);
                                const p_in3 = project(w / 2, H, l / 2 - 12);
                                tapePath = `M ${p4.x} ${p4.y} L ${p3.x} ${p3.y} L ${p_in3.x} ${p_in3.y} L ${p_in4.x} ${p_in4.y} Z`;
                              }

                              return (
                                <g>
                                  <path
                                    d={tapePath}
                                    fill="#1e293b"
                                    fillOpacity="0.22"
                                    stroke="#0f172a"
                                    strokeWidth="0.5"
                                    strokeDasharray="4,2"
                                  />

                                  {/* Small mechanical staples on left-bound */}
                                  {baseEdge === 'Left' && (
                                    <g>
                                      <line
                                        x1={project(-w / 2 + 4, H, -l / 4).x}
                                        y1={project(-w / 2 + 4, H, -l / 4).y}
                                        x2={project(-w / 2 + 8, H, -l / 4).x}
                                        y2={project(-w / 2 + 8, H, -l / 4).y}
                                        stroke="#475569"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                      />
                                      <line
                                        x1={project(-w / 2 + 4, H, l / 4).x}
                                        y1={project(-w / 2 + 4, H, l / 4).y}
                                        x2={project(-w / 2 + 8, H, l / 4).x}
                                        y2={project(-w / 2 + 8, H, l / 4).y}
                                        stroke="#475569"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                      />
                                    </g>
                                  )}

                                  {baseEdge === 'Top' && (
                                    <g>
                                      <line
                                        x1={project(-w / 4, H, -l / 2 + 4).x}
                                        y1={project(-w / 4, H, -l / 2 + 4).y}
                                        x2={project(-w / 4, H, -l / 2 + 8).x}
                                        y2={project(-w / 4, H, -l / 2 + 8).y}
                                        stroke="#475569"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                      />
                                      <line
                                        x1={project(w / 4, H, -l / 2 + 4).x}
                                        y1={project(w / 4, H, -l / 2 + 4).y}
                                        x2={project(w / 4, H, -l / 2 + 8).x}
                                        y2={project(w / 4, H, -l / 2 + 8).y}
                                        stroke="#475569"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                      />
                                    </g>
                                  )}
                                </g>
                              );
                            })()}

                            {/* 6. Perforation lines */}
                            {layer.perforationReq && (
                              <g>
                                {(() => {
                                  const baseEdge = ncrDetails.bindingEdge || 'Left';
                                  let pLineStart = { x: 0, y: 0 };
                                  let pLineEnd = { x: 0, y: 0 };

                                  if (baseEdge === 'Left') {
                                    pLineStart = project(-w / 2 + 25, H, -l / 2);
                                    pLineEnd = project(-w / 2 + 25, H, l / 2);
                                  } else if (baseEdge === 'Top') {
                                    pLineStart = project(-w / 2, H, -l / 2 + 25);
                                    pLineEnd = project(w / 2, H, -l / 2 + 25);
                                  } else if (baseEdge === 'Right') {
                                    pLineStart = project(w / 2 - 25, H, -l / 2);
                                    pLineEnd = project(w / 2 - 25, H, l / 2);
                                  } else if (baseEdge === 'Bottom') {
                                    pLineStart = project(-w / 2, H, l / 2 - 25);
                                    pLineEnd = project(w / 2, H, l / 2 - 25);
                                  }

                                  return (
                                    <g>
                                      <line
                                        x1={pLineStart.x}
                                        y1={pLineStart.y}
                                        x2={pLineEnd.x}
                                        y2={pLineEnd.y}
                                        stroke="#EA580C"
                                        strokeWidth="1.2"
                                        strokeDasharray="3,2"
                                      />
                                      <text
                                        x={pLineEnd.x + 3}
                                        y={pLineEnd.y + 6}
                                        fill="#EA580C"
                                        fontSize="6"
                                        fontWeight="black"
                                        fontFamily="sans-serif"
                                      >
                                        Perf Cut
                                      </text>
                                    </g>
                                  );
                                })()}
                              </g>
                            )}

                            {/* 7. Trim Crop Marks */}
                            {showTrimMarks && (
                              <g stroke="#94a3b8" strokeWidth="0.8">
                                <line x1={project(-w / 2, H, -(l / 2 + 3)).x} y1={project(-w / 2, H, -(l / 2 + 3)).y} x2={project(-w / 2, H, -(l / 2 + 15)).x} y2={project(-w / 2, H, -(l / 2 + 15)).y} />
                                <line x1={project(-(w / 2 + 3), H, -l / 2).x} y1={project(-(w / 2 + 3), H, -l / 2).y} x2={project(-(w / 2 + 15), H, -l / 2).x} y2={project(-(w / 2 + 15), H, -l / 2).y} />
                                
                                <line x1={project(w / 2, H, -(l / 2 + 3)).x} y1={project(w / 2, H, -(l / 2 + 3)).y} x2={project(w / 2, H, -(l / 2 + 15)).x} y2={project(w / 2, H, -(l / 2 + 15)).y} />
                                <line x1={project(w / 2 + 3, H, -l / 2).x} y1={project(w / 2 + 3, H, -l / 2).y} x2={project(w / 2 + 15, H, -l / 2).x} y2={project(w / 2 + 15, H, -l / 2).y} />

                                <line x1={project(w / 2, H, l / 2 + 3).x} y1={project(w / 2, H, l / 2 + 3).y} x2={project(w / 2, H, l / 2 + 15).x} y2={project(w / 2, H, l / 2 + 15).y} />
                                <line x1={project(w / 2 + 3, H, l / 2).x} y1={project(w / 2 + 3, H, l / 2).y} x2={project(w / 2 + 15, H, l / 2).x} y2={project(w / 2 + 15, H, l / 2).y} />

                                <line x1={project(-w / 2, H, l / 2 + 3).x} y1={project(-w / 2, H, l / 2 + 3).y} x2={project(-w / 2, H, l / 2 + 15).x} y2={project(-w / 2, H, l / 2 + 15).y} />
                                <line x1={project(-(w / 2 + 3), H, l / 2).x} y1={project(-(w / 2 + 3), H, l / 2).y} x2={project(-(w / 2 + 15), H, l / 2).x} y2={project(-(w / 2 + 15), H, l / 2).y} />
                              </g>
                            )}

                            {/* 8. Sequential Number Stamp */}
                            {layer.numberingReq !== 'None' && (
                              <g>
                                {(() => {
                                  const pos = layer.numberPosition || 'Top Right';
                                  let nX = w / 2 - 25;
                                  let nZ = -l / 2 + 25;

                                  if (pos === 'Top Left') {
                                    nX = -w / 2 + 25;
                                    nZ = -l / 2 + 25;
                                  } else if (pos === 'Bottom Right') {
                                    nX = w / 2 - 25;
                                    nZ = l / 2 - 25;
                                  } else if (pos === 'Custom') {
                                    nX = -w / 2 + 25;
                                    nZ = l / 2 - 25;
                                  }

                                  const pNum = project(nX, H, nZ);
                                  const stampColor = layer.numberColor === 'Red' ? '#ef4444' : '#1e293b';
                                  const stampBg = layer.numberColor === 'Red' ? '#fee2e2' : '#f1f5f9';

                                  return (
                                    <g>
                                      <rect
                                        x={pNum.x - 22}
                                        y={pNum.y - 7}
                                        width="44"
                                        height="14"
                                        fill={stampBg}
                                        stroke={stampColor}
                                        strokeWidth="0.8"
                                        rx="2.5"
                                      />
                                      <text
                                        x={pNum.x}
                                        y={pNum.y + 3}
                                        fill={stampColor}
                                        fontSize="7.5"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                        textAnchor="middle"
                                      >
                                        {layer.prefix || ''}{layer.startNumber || '0001'}
                                      </text>
                                    </g>
                                  );
                                })()}
                              </g>
                            )}

                            {/* 9. Registration Crosshair Target Marks */}
                            {showRegMarks && (
                              <g>
                                {(() => {
                                  const pReg1 = project(-w / 2 - 32, H, 0);
                                  const pReg2 = project(w / 2 + 32, H, 0);

                                  return (
                                    <g stroke="#64748b" strokeWidth="0.8" fill="none">
                                      <circle cx={pReg1.x} cy={pReg1.y} r="5" />
                                      <line x1={pReg1.x - 9} y1={pReg1.y} x2={pReg1.x + 9} y2={pReg1.y} />
                                      <line x1={pReg1.x} y1={pReg1.y - 9} x2={pReg1.x} y2={pReg1.y + 9} />

                                      <circle cx={pReg2.x} cy={pReg2.y} r="5" />
                                      <line x1={pReg2.x - 9} y1={pReg2.y} x2={pReg2.x + 9} y2={pReg2.y} />
                                      <line x1={pReg2.x} y1={pReg2.y - 9} x2={pReg2.x} y2={pReg2.y + 9} />
                                    </g>
                                  );
                                })()}
                              </g>
                            )}
                          </g>
                        );
                      });
                    })()}

                    {/* CMYK color bars */}
                    {showRegMarks && (
                      <g opacity="0.8">
                        {(() => {
                          const p_cmyk = { x: 30, y: 440 };
                          return (
                            <g>
                              <text x={p_cmyk.x} y={p_cmyk.y - 6} fill="#94a3b8" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                                PRESS CONTROL STRIP
                              </text>
                              <rect x={p_cmyk.x} y={p_cmyk.y} width="16" height="12" fill="#06b6d4" rx="2" />
                              <rect x={p_cmyk.x + 20} y={p_cmyk.y} width="16" height="12" fill="#ec4899" rx="2" />
                              <rect x={p_cmyk.x + 40} y={p_cmyk.y} width="16" height="12" fill="#eab308" rx="2" />
                              <rect x={p_cmyk.x + 60} y={p_cmyk.y} width="16" height="12" fill="#0f172a" rx="2" />
                            </g>
                          );
                        })()}
                      </g>
                    )}
                  </svg>

                  {/* Inspected layer details panel inside screen */}
                  {selectedLIndex !== null && layers[selectedLIndex] && (
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-slate-800 text-left flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shadow"
                          style={{
                            backgroundColor: NCR_COLORS[layers[selectedLIndex].color as keyof typeof NCR_COLORS]?.hex || '#fff'
                          }}
                        />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                            Inspected: Layer {selectedLIndex + 1} ({layers[selectedLIndex].paperType})
                          </p>
                          <p className="text-[12px] font-black tracking-tight mt-0.5">
                            {layers[selectedLIndex].purpose || 'Duplicate Record Copy'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLIndex(layers.length - 1)}
                        className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-300 rounded-lg transition-all"
                      >
                        Reset Highlight
                      </button>
                    </div>
                  )}
                </div>

                {/* SVG controls bar */}
                <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sliders size={11} /> 3D Explosion Distance
                      </label>
                      <span className="text-[10px] font-mono font-black text-indigo-600">{explosionOffset} px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      value={explosionOffset}
                      disabled={viewMode === 'grid'}
                      onChange={(e) => setExplosionOffset(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
                    />
                    
                    <div className="flex gap-2 pt-1 font-sans">
                      <button
                        type="button"
                        onClick={() => setViewMode('stack')}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-center transition-all",
                          viewMode === 'stack' ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-150 text-slate-500"
                        )}
                      >
                        Isometric Stack
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-center transition-all",
                          viewMode === 'grid' ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-150 text-slate-500"
                        )}
                      >
                        Plate Lay Flat
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showBleed}
                        onChange={(e) => setShowBleed(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded focus:ring-indigo-550"
                      />
                      <span className="text-[9px] font-black uppercase text-slate-650 tracking-wider">Show Bleed Box</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showSafeMargins}
                        onChange={(e) => setShowSafeMargins(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded focus:ring-indigo-550"
                      />
                      <span className="text-[9px] font-black uppercase text-slate-650 tracking-wider">Safe Margins</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showTrimMarks}
                        onChange={(e) => setShowTrimMarks(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-655 border-slate-350 rounded focus:ring-indigo-550"
                      />
                      <span className="text-[9px] font-black uppercase text-slate-655 tracking-wider">Crop Trim Marks</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showRegMarks}
                        onChange={(e) => setShowRegMarks(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-655 border-slate-355 rounded focus:ring-indigo-550"
                      />
                      <span className="text-[9px] font-black uppercase text-slate-655 tracking-wider">Colors & Targets</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RIGHT INTROSPECTIVE SIDEBAR */}
              <div className="w-full xl:w-[360px] p-6 md:p-8 flex flex-col h-full overflow-y-auto border-t xl:border-t-0 xl:border-l border-slate-150">
                <span className="text-[10px] font-black text-[#5046e5] uppercase tracking-widest block mb-1">Interactive Index</span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic mb-6">Select Layer To Inspect</h4>

                <div className="space-y-4 mb-6 flex-1">
                  {layers.map((layer, index) => {
                    const colorData = NCR_COLORS[layer.color as keyof typeof NCR_COLORS] || NCR_COLORS.Custom;
                    const isSelected = selectedLIndex === index;
                    const isTop = index === 0;
                    const isBottom = index === layers.length - 1;

                    return (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLIndex(index)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden",
                          isSelected 
                            ? "bg-slate-50 border-indigo-600 shadow-sm" 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-800 tracking-tight">
                              Part {index + 1}
                            </span>
                            <span className={cn("px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider rounded border", colorData.bg, colorData.border)}>
                              {layer.color} • {layer.paperType}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono text-slate-400 font-extrabold">
                            {isTop ? 'COATED BACK (CB)' : isBottom ? 'COATED FRONT (CF)' : 'CFB MID'}
                          </span>
                        </div>

                        <p className="text-xs font-black text-slate-700 tracking-tight block">
                          {layer.purpose || 'Client Record Copy'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-dashed border-slate-100/80 text-[10px] font-semibold text-slate-450 uppercase">
                          <div>
                            <span className="text-[7px] text-slate-400 font-black block leading-none mb-0.5">GSM Weight</span>
                            <span className="font-mono text-slate-700 font-bold">{layer.gsm || 60} gsm</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-slate-400 font-black block leading-none mb-0.5">Perforated</span>
                            <span className={layer.perforationReq ? "text-orange-600 font-bold" : "text-slate-400 font-bold"}>
                              {layer.perforationReq ? "YES (Orange Line)" : "NO"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PRESS REPORT */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 text-left space-y-3.5 mt-auto text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-400" strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#818CF8]">Press Mechanical Report</span>
                  </div>
                  
                  <div className="space-y-1.5 text-[10px] font-bold uppercase tracking-tight text-slate-450">
                    <div className="flex justify-between">
                      <span>Imposition Layout:</span>
                      <span className="font-black text-slate-200 animate-pulse">1-Up Portrait</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gripper Margin:</span>
                      <span className="font-black text-slate-200">8mm Standard</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Binding Spine:</span>
                      <span className="font-black text-emerald-400">{ncrDetails.bindingEdge || 'Left'} Edge</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sequenced Chemistry:</span>
                      <span className={qaIssues.length > 0 ? "text-red-400 font-black" : "text-green-400 font-black"}>
                        {qaIssues.length > 0 ? "FLAW DETECTED" : "VERIFIED CLEAR"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
