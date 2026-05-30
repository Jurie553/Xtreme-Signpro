import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Printer, Copy, Sparkles, AlertCircle, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { LithoProduct, LithoPricingTier } from '../../types';
import { toast } from 'sonner';

interface LithoSpecsTabProps {
  products: LithoProduct[];
  isUpdating: string | null;
  onEdit: (product: LithoProduct) => void;
  onDelete: (id: string) => void;
  onDuplicate: (product: LithoProduct) => void;
  onAddToQuote: (productId: string, qty: number) => void;
  onSave: (productData: Partial<LithoProduct>, id?: string) => Promise<void>;
}

const CATEGORIES = ['All', 'Business Cards', 'Flyers', 'Folders', 'Postcards', 'Brochures', 'Letterheads', 'Other'];

const PRESET_TEMPLATES = [
  {
    name: "Corporate Brochure A4",
    category: "Brochures",
    description: "Multi-page gatefolded high-finish brochure",
    size: "A4 (210x297mm)",
    finishedSize: "A4",
    flatSize: "A4",
    openSize: "A3",
    orientation: "Portrait" as const,
    sidesPrinted: "Double Sided" as const,
    paperType: "150gsm Gloss Art",
    paperGsm: 150,
    paperFinish: "Gloss",
    colorProfile: "CMYK Fogra39",
    bleedRequirement: "3mm all around",
    turnaroundTime: "5 business days",
    bindingType: "Saddle Stitch",
    foldType: "Half Fold",
    laminationType: "None" as const,
    pricingGrid: [
      { quantity: 500, cost: 2500, sell: 4200 },
      { quantity: 1000, cost: 3800, sell: 6500 },
      { quantity: 2500, cost: 7200, sell: 12500 }
    ]
  },
  {
    name: "Luxury Silk Business Cards",
    category: "Business Cards",
    description: "Premium double-sided silk cards with Matt Lamination and Spot UV finish",
    size: "90x50mm",
    finishedSize: "90x50mm",
    flatSize: "90x50mm",
    openSize: "90x50mm",
    orientation: "Landscape" as const,
    sidesPrinted: "Double Sided" as const,
    paperType: "350gsm Silk Coated",
    paperGsm: 350,
    paperFinish: "Satin",
    colorProfile: "CMYK Fogra39",
    bleedRequirement: "2mm",
    turnaroundTime: "3 business days",
    laminationType: "Matt" as const,
    spotUv: true,
    pricingGrid: [
      { quantity: 250, cost: 450, sell: 890 },
      { quantity: 500, cost: 620, sell: 1250 },
      { quantity: 1000, cost: 950, sell: 1950 }
    ]
  },
  {
    name: "Promotional A5 Flyers",
    category: "Flyers",
    description: "Gloss finish promotional offset handouts",
    size: "A5 (148x210mm)",
    finishedSize: "A5",
    flatSize: "A5",
    openSize: "A5",
    orientation: "Portrait" as const,
    sidesPrinted: "Double Sided" as const,
    paperType: "135gsm Gloss Artpaper",
    paperGsm: 135,
    paperFinish: "Gloss",
    colorProfile: "CMYK Fogra39",
    bleedRequirement: "3mm",
    turnaroundTime: "4 business days",
    pricingGrid: [
      { quantity: 1000, cost: 850, sell: 1650 },
      { quantity: 2500, cost: 1550, sell: 2950 },
      { quantity: 5000, cost: 2400, sell: 4800 }
    ]
  }
];

export default function LithoSpecsTab({
  products,
  isUpdating,
  onEdit,
  onDelete,
  onDuplicate,
  onAddToQuote,
  onSave
}: LithoSpecsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  
  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Business Cards');
  const [formDesc, setFormDesc] = useState('');
  const [formSize, setFormSize] = useState('90x50mm');
  const [formPaper, setFormPaper] = useState('350gsm Silk');
  const [formGSM, setFormGSM] = useState(350);
  const [formOrientation, setFormOrientation] = useState<'Portrait' | 'Landscape' | 'Square'>('Landscape');
  const [formSides, setFormSides] = useState<'Single Sided' | 'Double Sided'>('Double Sided');
  const [formLamination, setFormLamination] = useState<'Gloss' | 'Matt' | 'Soft Touch' | 'None'>('None');
  const [formSpotUv, setFormSpotUv] = useState(false);
  const [formFoiling, setFormFoiling] = useState(false);
  const [formFoilingColor, setFormFoilingColor] = useState('Gold');
  const [formDiecutting, setFormDiecutting] = useState(false);
  const [formBinding, setFormBinding] = useState('None');
  const [formFinishing, setFormFinishing] = useState('');
  const [pricingTiers, setPricingTiers] = useState<LithoPricingTier[]>([{ quantity: 250, cost: 150, sell: 350 }]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Heuristic Smart Print AI Spec Parser
  const handleAiParse = () => {
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    
    setTimeout(() => {
      const text = aiPrompt.toLowerCase();
      let qty = 1000;
      let size = 'A5 (148x210mm)';
      let name = 'Smart Promotional Handouts';
      let category = 'Flyers';
      let gsm = 135;
      let paper = '135gsm Gloss Art';
      let sides: 'Single Sided' | 'Double Sided' = 'Double Sided';
      let finishing = '';
      let lamination: 'Gloss' | 'Matt' | 'Soft Touch' | 'None' = 'None';
      let baseCost = 650;
      let sellPrice = 1350;

      // Extract quantities
      const qtyMatch = text.match(/(\d+)\s*(qty|quantity|units|pcs|copies|cards|flyers|books)/);
      if (qtyMatch) {
         qty = parseInt(qtyMatch[1]);
      } else {
        const directNumber = text.match(/^\s*(\d+)/);
        if (directNumber) qty = parseInt(directNumber[1]);
      }

      // Check size
      if (text.includes('a4')) {
        size = 'A4 (210x297mm)';
        name = 'A4 Corporate Prints';
        category = 'Brochures';
        baseCost = 1500;
        sellPrice = 2800;
      } else if (text.includes('a5')) {
        size = 'A5 (148x210mm)';
        name = 'A5 Promotional Flyers';
        category = 'Flyers';
        baseCost = 820;
        sellPrice = 1550;
      } else if (text.includes('a6')) {
        size = 'A6 (105x148mm)';
        name = 'A6 Promo Postcards';
        category = 'Postcards';
        baseCost = 450;
        sellPrice = 900;
      } else if (text.includes('business card') || text.includes('cards') || text.includes('bc')) {
        size = '90x50mm';
        name = 'Professional Business Cards';
        category = 'Business Cards';
        paper = '350gsm Premium Board';
        gsm = 350;
        baseCost = 350;
        sellPrice = 750;
      } else if (text.includes('folder') || text.includes('presentation')) {
        size = 'A4 Folders';
        name = 'Presentation Folders A4';
        category = 'Folders';
        paper = '350gsm Silk Coated';
        gsm = 350;
        baseCost = 3800;
        sellPrice = 6800;
      }

      // Paper types & gsm
      if (text.includes('350gsm') || text.includes('350 gsm') || text.includes('thick')) {
        gsm = 350;
        paper = '350gsm High-bulk Board';
      } else if (text.includes('250gsm') || text.includes('250 gsm')) {
        gsm = 250;
        paper = '250gsm Silk Cover';
      } else if (text.includes('150gsm') || text.includes('150 gsm')) {
        gsm = 150;
        paper = '150gsm Fine Gloss';
      }

      if (text.includes('gloss')) {
        paper += ' (Gloss Finish)';
      } else if (text.includes('matt') || text.includes('matte')) {
        paper += ' (Matt Finish)';
      }

      // Work sides
      if (text.includes('single sided') || text.includes('one side') || text.includes('single-sided') || text.includes('4/0')) {
        sides = 'Single Sided';
      }

      // Finishing details
      if (text.includes('matt lam') || text.includes('matt lamination') || text.includes('matte lamination')) {
        lamination = 'Matt';
        finishing = 'Matt Laminated';
      } else if (text.includes('gloss lam') || text.includes('gloss lamination')) {
        lamination = 'Gloss';
        finishing = 'Gloss Laminated';
      } else if (text.includes('soft touch')) {
        lamination = 'Soft Touch';
        finishing = 'Soft-coat finish';
      }

      // Check premium upgrades
      const uv = text.includes('spot uv') || text.includes('spec uv');
      const foils = text.includes('foiling') || text.includes('gold foil') || text.includes('silver foil');

      // Update Form Parameters
      setFormName(name.toUpperCase());
      setFormCategory(category);
      setFormDesc(`AI-generated preset for: "${aiPrompt}"`);
      setFormSize(size);
      setFormPaper(paper);
      setFormGSM(gsm);
      setFormSides(sides);
      setFormLamination(lamination);
      setFormSpotUv(uv);
      setFormFoiling(foils);
      setFormFoilingColor(text.includes('silver') ? 'Silver' : 'Gold');
      setFormFinishing(finishing || (uv ? 'Spot UV Coat' : 'Standard Trim'));
      
      // Setup dynamic costing batch grid
      const halfQty = Math.max(50, Math.floor(qty / 2));
      const doubleQty = qty * 2.5;

      setPricingTiers([
        { quantity: halfQty, cost: Math.round(baseCost * 0.7), sell: Math.round(sellPrice * 0.75) },
        { quantity: qty, cost: baseCost, sell: sellPrice },
        { quantity: doubleQty, cost: Math.round(baseCost * 1.8), sell: Math.round(sellPrice * 1.9) }
      ]);

      setIsAiProcessing(false);
      toast.success("AI successfully generated printing specs!");
      setIsFormOpen(true);
    }, 800);
  };

  const handleApplyPreset = (preset: any) => {
    setFormName(preset.name.toUpperCase());
    setFormCategory(preset.category);
    setFormDesc(preset.description);
    setFormSize(preset.size);
    setFormPaper(preset.paperType);
    setFormGSM(preset.paperGsm);
    setFormSides(preset.sidesPrinted);
    setFormLamination(preset.laminationType);
    setFormSpotUv(!!preset.spotUv);
    setFormFoiling(!!preset.foiling);
    setFormFoilingColor(preset.foilingColor || 'Gold');
    setFormDiecutting(!!preset.dieCutting);
    setFormBinding(preset.bindingType || 'None');
    setFormFinishing(preset.finishing || '');
    setPricingTiers(preset.pricingGrid);
    
    setEditingId(undefined);
    setIsFormOpen(true);
    toast.success(`Preset applied: ${preset.name}`);
  };

  const openEditForm = (p: LithoProduct) => {
    setFormName(p.name);
    setFormCategory(p.category);
    setFormDesc(p.description || '');
    setFormSize(p.size);
    setFormPaper(p.paperType);
    setFormGSM(p.paperGsm || 350);
    setFormOrientation(p.orientation || 'Landscape');
    setFormSides(p.sidesPrinted || 'Double Sided');
    setFormLamination(p.laminationType || 'None');
    setFormSpotUv(!!p.spotUv);
    setFormFoiling(!!p.foiling);
    setFormFoilingColor(p.foilingColor || 'Gold');
    setFormDiecutting(!!p.dieCutting);
    setFormBinding(p.bindingType || 'None');
    setFormFinishing(p.finishing || '');
    setPricingTiers(p.pricingGrid || []);
    
    setEditingId(p.id);
    setIsFormOpen(true);
  };

  const handleCloneClick = (p: LithoProduct) => {
    setFormName(`${p.name} (Copy)`);
    setFormCategory(p.category);
    setFormDesc(p.description || '');
    setFormSize(p.size);
    setFormPaper(p.paperType);
    setFormGSM(p.paperGsm || 350);
    setFormOrientation(p.orientation || 'Landscape');
    setFormSides(p.sidesPrinted || 'Double Sided');
    setFormLamination(p.laminationType || 'None');
    setFormSpotUv(!!p.spotUv);
    setFormFoiling(!!p.foiling);
    setFormFoilingColor(p.foilingColor || 'Gold');
    setFormDiecutting(!!p.dieCutting);
    setFormBinding(p.bindingType || 'None');
    setFormFinishing(p.finishing || '');
    setPricingTiers(p.pricingGrid || []);
    
    setEditingId(undefined); // Sets as a new registration
    setIsFormOpen(true);
    toast.success('Specifications loaded into builder as clone.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Product title is required');
      return;
    }

    const payload: Partial<LithoProduct> = {
      name: formName,
      category: formCategory,
      description: formDesc,
      size: formSize,
      paperType: formPaper,
      paperGsm: formGSM,
      orientation: formOrientation,
      sidesPrinted: formSides,
      laminationType: formLamination,
      spotUv: formSpotUv,
      foiling: formFoiling,
      foilingColor: formFoilingColor,
      dieCutting: formDiecutting,
      bindingType: formBinding,
      finishing: formFinishing,
      pricingGrid: pricingTiers,
      status: 'Active'
    };

    try {
      await onSave(payload, editingId);
      setIsFormOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Panel with Built-in Print AI Assistant */}
      <div className="card-minimal p-6 border-slate-100 relative overflow-hidden bg-slate-900 text-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-accent/15 rounded-full blur-[80px]" />
        
        <div className="space-y-2 flex-1 w-full relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-brand-accent text-white text-[8px] font-bold rounded-md uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-sm">
              <Sparkles size={10} /> Copilot AI
            </span>
          </div>
          <h3 className="text-lg font-bold tracking-tight">AI Print-Spec Parser</h3>
          <p className="text-[11px] text-slate-300">Type dynamic print specifications to auto-build full product pricing structures & materials models.</p>
          
          <div className="flex gap-2 w-full mt-4">
            <input 
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 500 business cards, double sided matte laminated, spot uv finish"
              className="flex-1 px-4 py-2.5 bg-slate-850 border border-slate-700/60 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-accent font-medium leading-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAiParse()}
            />
            <button 
              onClick={handleAiParse}
              disabled={isAiProcessing || !aiPrompt.trim()}
              className="px-5 py-2.5 bg-brand-accent hover:bg-indigo-500 rounded-xl text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-60 shrink-0"
            >
              {isAiProcessing ? 'Parsing...' : 'Build Spec'}
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        <div className="w-full md:w-auto self-stretch md:self-auto flex flex-col md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-700/55 pt-4 md:pt-0 md:pl-6 shrink-0 z-10 gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block md:text-right">Quick Presets</span>
          <div className="flex flex-wrap md:flex-col gap-1.5 self-start md:self-auto">
            {PRESET_TEMPLATES.map((p, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 border border-slate-700/40 hover:border-brand-accent rounded-lg text-slate-300 transition-all uppercase tracking-wider"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Registry Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative group w-full max-w-sm">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Registry..." 
            className="w-full pl-5 pr-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 transition-all duration-300 shadow-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                  selectedCategory === cat 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <button 
            type="button"
            onClick={() => {
              setEditingId(undefined);
              setFormName('');
              setFormDesc('');
              setFormFinishing('');
              setPricingTiers([{ quantity: 500, cost: 250, sell: 650 }]);
              setIsFormOpen(true);
            }}
            className="bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-850 shadow-md shadow-brand/5 active:scale-[0.98] flex items-center gap-1.5 hover:shadow-lg hover:shadow-brand-accent/5"
          >
            <Plus size={15} strokeWidth={2.4} /> Product
          </button>
        </div>
      </div>

      {/* Registry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, idx) => (
            <motion.div
              layout
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "card-minimal p-6 border-slate-100 flex flex-col relative overflow-hidden group hover:border-brand-accent/25 transition-all duration-300",
                isUpdating === product.id && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center font-bold border border-slate-100 group-hover:bg-brand-accent/5 group-hover:text-brand-accent transition-all duration-300 shadow-sm">
                    <Printer size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-main group-hover:text-brand-accent duration-300 tracking-tight leading-tight uppercase">
                      {product.name}
                    </span>
                    <span className="text-[8px] font-bold text-text-light uppercase tracking-wider block mt-0.5">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => handleCloneClick(product)}
                    className="p-1 px-1.5 bg-slate-55 border border-slate-100 text-slate-400 hover:text-brand-accent rounded-lg transition-all"
                    title="Duplicate spec"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => openEditForm(product)}
                    className="p-1 px-1.5 bg-slate-55 border border-slate-100 text-slate-400 hover:text-brand-accent rounded-lg transition-all"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => onDelete(product.id)}
                    className="p-1 px-1.5 bg-slate-55 border border-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-[10px] font-medium text-slate-400/90 italic line-clamp-1 mb-4">
                  {product.description}
                </p>
              )}

              {/* Technical Spec Chips */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/40 mb-4 text-[10px]">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block mb-0.5">Finish Size</span>
                  <span className="font-bold text-slate-700">{product.size}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block mb-0.5">GSM Stock</span>
                  <span className="font-bold text-slate-700">{product.paperType}</span>
                </div>
                {product.laminationType && product.laminationType !== 'None' && (
                  <div className="col-span-2 pt-1 border-t border-slate-100/60 flex justify-between items-center">
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Ennoblement</span>
                    <span className="font-bold text-slate-600 capitalize text-[9px]">{product.laminationType} Lam {product.spotUv ? '+ SpotUV' : ''}</span>
                  </div>
                )}
              </div>

              {/* Pricing Grid Trigger Buttons */}
              <div className="mt-auto space-y-1.5 pt-3 border-t border-slate-100/60">
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-2">Configure Tier Pricing</span>
                {product.pricingGrid?.slice(0, 3).map((tier, tIdx) => (
                  <button 
                    key={tIdx}
                    onClick={() => onAddToQuote(product.id, tier.quantity)}
                    className="w-full flex items-center justify-between p-2 px-3 bg-white hover:bg-brand-accent hover:border-transparent group/pricing border border-slate-100 rounded-xl transition-all duration-300 text-[10px] shadow-sm select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 bg-slate-50 group-hover/pricing:bg-white/20 p-1 px-1.5 rounded-md group-hover/pricing:text-white">{tier.quantity} Qty</span>
                      <span className="text-slate-400 text-[9px] font-medium tracking-wider group-hover/pricing:text-slate-200">R{(tier.sell / tier.quantity).toFixed(2)}/unit</span>
                    </div>
                    <span className="font-bold text-brand-accent group-hover/pricing:text-white">R{tier.sell.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Advanced Product Builder Drawer / Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-10"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFormOpen(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden relative border border-slate-100"
            >
              <div className="p-6 px-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                    {editingId ? 'Modify Print Spec' : 'New Litho Spec'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure advanced lithographic specs</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 border border-slate-100 transition-all"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 max-h-[70vh]">
                {/* Form Specs Sections */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Product Title</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-accent"
                      placeholder="e.g. PREMIUM DOUBLE-SIDED A5 LEAFLETS"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Division Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Dimensions size</label>
                    <input 
                      type="text" 
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                      placeholder="e.g. A5 (148x210mm)"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">GSM Board Weight</label>
                    <input 
                      type="number" 
                      value={formGSM}
                      onChange={(e) => setFormGSM(parseInt(e.target.value) || 150)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Paper stock finish</label>
                    <input 
                      type="text" 
                      value={formPaper}
                      onChange={(e) => setFormPaper(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Work Sides</label>
                    <select
                      value={formSides}
                      onChange={(e) => setFormSides(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Single Sided">Single Sided</option>
                      <option value="Double Sided">Double Sided</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Post-Press Lamination</label>
                    <select
                      value={formLamination}
                      onChange={(e) => setFormLamination(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Gloss">Gloss</option>
                      <option value="Matt">Matt</option>
                      <option value="Soft Touch">Soft Touch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Binding Finish</label>
                    <input 
                      type="text" 
                      value={formBinding}
                      onChange={(e) => setFormBinding(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                      placeholder="e.g. Saddle Stitch"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Additional finishing</label>
                    <input 
                      type="text" 
                      value={formFinishing}
                      onChange={(e) => setFormFinishing(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
                      placeholder="e.g. Creasing / Boxed"
                    />
                  </div>

                  <div className="col-span-2 space-y-2 border-t border-slate-50 pt-3">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Ennoblements Details</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input type="checkbox" checked={formSpotUv} onChange={(e) => setFormSpotUv(e.target.checked)} className="rounded" />
                        Spot UV Coating
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input type="checkbox" checked={formFoiling} onChange={(e) => setFormFoiling(e.target.checked)} className="rounded" />
                        Hot Foiling Accents
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input type="checkbox" checked={formDiecutting} onChange={(e) => setFormDiecutting(e.target.checked)} className="rounded" />
                        Die-Cut Finish
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity Batch Grid pricing</span>
                    <button 
                      type="button" 
                      onClick={() => setPricingTiers([...pricingTiers, { quantity: 1000, cost: 400, sell: 1200 }])}
                      className="text-[9px] font-bold text-brand-accent"
                    >
                      + Add Tier Row
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    {pricingTiers.map((tier, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <div className="flex-1">
                          <input 
                            type="number" 
                            value={tier.quantity} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].quantity = parseInt(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Qty (e.g. 500)"
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="number" 
                            value={tier.cost} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].cost = parseFloat(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Cost R"
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="number" 
                            value={tier.sell} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].sell = parseFloat(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Sell Price"
                            className="w-full px-3 py-2 bg-slate-55 border-brand-accent/25 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== idx))}
                          className="text-red-500 text-xs px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>

              <div className="p-6 bg-slate-50 flex gap-4 shrink-0 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn-secondary"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  onClick={handleSubmit}
                  className="btn-primary"
                >
                  Save Specification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
