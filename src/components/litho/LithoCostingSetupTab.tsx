import React, { useState, useEffect } from 'react';
import { 
  Paperclip, 
  Printer, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  RotateCcw, 
  Percent, 
  Truck, 
  Sparkles,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../../lib/firestoreService';
import { toast } from 'sonner';

// TS Contracts
export interface PaperStock {
  id?: string;
  name: string;
  type: string;
  gsm: number;
  sheetSize: string;
  costPerSheet: number;
  costPerPack?: number;
  sheetsPerPack?: number;
  stockQuantity?: number;
  vatSettings?: string;
  supplier: string;
  markupPercent: number;
  active: boolean;
}

export interface CostingMachine {
  id?: string;
  name: string;
  printType: string;
  maxSheetSize: string;
  costPerImpression: number;
  setupCost: number;
  minimumCharge: number;
  speedPerHour: number;
  active: boolean;
}

export interface FinishingOption {
  id?: string;
  name: string;
  type: string;
  costType: 'per job' | 'per page' | 'per sheet' | 'per book' | 'per 1000';
  costAmount: number;
  setupCost: number;
  markupPercent: number;
  active: boolean;
}

const DEFAULT_PAPER_STOCKS: PaperStock[] = [
  { name: 'Nupack Gloss Art 115gsm', type: 'Gloss Art', gsm: 115, sheetSize: 'SRA3 (450x320)', costPerSheet: 1.25, costPerPack: 625, sheetsPerPack: 500, stockQuantity: 2500, vatSettings: '15% Standard', supplier: 'Antalis', markupPercent: 30, active: true },
  { name: 'Titan Double Gloss Art 150gsm', type: 'Gloss Art', gsm: 150, sheetSize: 'SRA3 (450x320)', costPerSheet: 1.85, costPerPack: 925, sheetsPerPack: 500, stockQuantity: 1500, vatSettings: '15% Standard', supplier: 'Falcon', markupPercent: 30, active: true },
  { name: 'Saturn Uncoated Bond 80gsm', type: 'Uncoated Bond', gsm: 80, sheetSize: 'SRA3 (450x320)', costPerSheet: 0.75, costPerPack: 375, sheetsPerPack: 500, stockQuantity: 4000, vatSettings: '15% Standard', supplier: 'Antalis', markupPercent: 25, active: true },
  { name: 'Kromecote Cover Board 350gsm', type: 'Cover Board', gsm: 350, sheetSize: 'SRA3 (450x320)', costPerSheet: 4.80, costPerPack: 1200, sheetsPerPack: 250, stockQuantity: 800, vatSettings: '15% Standard', supplier: 'Falcon', markupPercent: 35, active: true },
  { name: 'Heavy Gloss Art 250gsm', type: 'Gloss Art', gsm: 250, sheetSize: 'SRA3 (450x320)', costPerSheet: 2.95, costPerPack: 737.5, sheetsPerPack: 250, stockQuantity: 1200, vatSettings: '15% Standard', supplier: 'Falcon', markupPercent: 30, active: true },
  { name: 'Fedrigoni Textured Cream 120gsm', type: 'Uncoated Bond', gsm: 120, sheetSize: 'SRA3 (450x320)', costPerSheet: 3.50, costPerPack: 875, sheetsPerPack: 250, stockQuantity: 500, vatSettings: '15% Standard', supplier: 'Antalis', markupPercent: 40, active: true }
];

const DEFAULT_COSTING_MACHINES: CostingMachine[] = [
  { name: 'Heidelberg Speedmaster XL 106 4-Colour', printType: 'Litho Press', maxSheetSize: '700x1000 (A1)', costPerImpression: 0.12, setupCost: 1500, minimumCharge: 2000, speedPerHour: 18000, active: true },
  { name: 'Komori Lithrone G40 High Speed Offset', printType: 'Litho Press', maxSheetSize: '700x1000 (A1)', costPerImpression: 0.15, setupCost: 1100, minimumCharge: 1500, speedPerHour: 15000, active: true },
  { name: 'Ryobi 522 2-Colour Compact Offset', printType: 'Litho Press', maxSheetSize: '520x375 (A3+)', costPerImpression: 0.22, setupCost: 650, minimumCharge: 950, speedPerHour: 13000, active: true },
  { name: 'HP Indigo 12000 HD HD Digital Offset', printType: 'Digital Press', maxSheetSize: 'SRA3 (450x320)', costPerImpression: 1.45, setupCost: 150, minimumCharge: 350, speedPerHour: 4600, active: true }
];

const DEFAULT_FINISHING_OPTIONS: FinishingOption[] = [
  { name: 'Guillotine Gutter Crop Trim', type: 'cutting', costType: 'per sheet', costAmount: 0.08, setupCost: 120, markupPercent: 25, active: true },
  { name: 'Stahl Folder Mechanical Buckle', type: 'folding', costType: 'per sheet', costAmount: 0.12, setupCost: 280, markupPercent: 25, active: true },
  { name: 'Heavy Saddle Stitcher Booklet Stitch', type: 'stitching', costType: 'per book', costAmount: 5.50, setupCost: 450, markupPercent: 30, active: true },
  { name: 'Perfect Binder PUR Spine Adhesive', type: 'perfect binding', costType: 'per book', costAmount: 24.50, setupCost: 950, markupPercent: 35, active: true },
  { name: 'Thermal Double Matte Lamination', type: 'lamination', costType: 'per sheet', costAmount: 2.80, setupCost: 250, markupPercent: 30, active: true },
  { name: 'Multi-Spindle Pneumatic Drill', type: 'drilling', costType: 'per book', costAmount: 1.50, setupCost: 100, markupPercent: 20, active: true },
  { name: 'Sequential Letterpress Mechanical Numberer', type: 'numbering', costType: 'per 1000', costAmount: 45.00, setupCost: 350, markupPercent: 25, active: true },
  { name: 'Rotary Gutter Slit Perforator', type: 'perforation', costType: 'per sheet', costAmount: 0.15, setupCost: 180, markupPercent: 20, active: true }
];

type ConfigSection = 'paper' | 'printer' | 'finishing';

export default function LithoCostingSetupTab() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('paper');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // UseCollection bindings
  const { data: rawPapers, loading: loadingPapers } = useCollection<PaperStock>('litho_paper_stock');
  const { data: rawPrinters, loading: loadingPrinters } = useCollection<CostingMachine>('litho_costing_machines');
  const { data: rawFinishings, loading: loadingFinishings } = useCollection<FinishingOption>('litho_finishing_options');

  // Edit / Input State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paperForm, setPaperForm] = useState<Omit<PaperStock, 'id'>>({
    name: '',
    type: 'Gloss Art',
    gsm: 115,
    sheetSize: 'SRA3 (450x320)',
    costPerSheet: 0.50,
    costPerPack: 250,
    sheetsPerPack: 500,
    stockQuantity: 1000,
    vatSettings: '15% Standard',
    supplier: '',
    markupPercent: 30,
    active: true
  });
  const [printerForm, setPrinterForm] = useState<Omit<CostingMachine, 'id'>>({
    name: '', printType: 'Litho Press', maxSheetSize: 'SRA3 (450x320)', costPerImpression: 0.10, setupCost: 500, minimumCharge: 1000, speedPerHour: 10000, active: true
  });
  const [finishingForm, setFinishingForm] = useState<Omit<FinishingOption, 'id'>>({
    name: '', type: 'cutting', costType: 'per sheet', costAmount: 0.10, setupCost: 100, markupPercent: 30, active: true
  });

  const papers = rawPapers || [];
  const printers = rawPrinters || [];
  const finishings = rawFinishings || [];

  // Seeding support
  const handleSeedData = async () => {
    setIsUpdating('seeding');
    try {
      if (papers.length === 0) {
        for (const p of DEFAULT_PAPER_STOCKS) {
          await createDocument('litho_paper_stock', p);
        }
      }
      if (printers.length === 0) {
        for (const m of DEFAULT_COSTING_MACHINES) {
          await createDocument('litho_costing_machines', m);
        }
      }
      if (finishings.length === 0) {
        for (const f of DEFAULT_FINISHING_OPTIONS) {
          await createDocument('litho_finishing_options', f);
        }
      }
      toast.success('Enterprise Litho print costing baseline seed completed successfully.');
    } catch (error) {
      console.error('Seed error:', error);
      toast.error('Failed to seed cost inputs database.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Create or Update Operations
  const handleSavePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperForm.name) {
      toast.error('Please enter a descriptive paper stock name');
      return;
    }
    const safeGsm = Number(paperForm.gsm) || 80;
    const safeCost = Number(paperForm.costPerSheet) || 0.10;
    const safeMarkup = Number(paperForm.markupPercent) || 0;
    const safeSheetsPerPack = Number(paperForm.sheetsPerPack) || 500;
    const safeCostPerPack = Number(paperForm.costPerPack) || (safeCost * safeSheetsPerPack);
    const safeStockQuantity = Number(paperForm.stockQuantity) || 0;
    const safeVat = paperForm.vatSettings || '15% Standard';

    const payload = {
      ...paperForm,
      gsm: safeGsm,
      costPerSheet: safeCost,
      markupPercent: safeMarkup,
      costPerPack: safeCostPerPack,
      sheetsPerPack: safeSheetsPerPack,
      stockQuantity: safeStockQuantity,
      vatSettings: safeVat
    };

    try {
      if (editingId) {
        await updateDocument('litho_paper_stock', editingId, payload);
        toast.success('Paper stock pricing entry updated.');
      } else {
        await createDocument('litho_paper_stock', payload);
        toast.success('New paper stock pricing entry registered.');
      }
      resetForm('paper');
    } catch (error) {
      toast.error('Error saving paper stock.');
    }
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerForm.name) {
      toast.error('Machine model designation required.');
      return;
    }
    const safeImp = Number(printerForm.costPerImpression) || 0.01;
    const safeSetup = Number(printerForm.setupCost) || 0;
    const safeMin = Number(printerForm.minimumCharge) || 0;
    const safeSpeed = Number(printerForm.speedPerHour) || 1000;

    const payload = {
      ...printerForm,
      costPerImpression: safeImp,
      setupCost: safeSetup,
      minimumCharge: safeMin,
      speedPerHour: safeSpeed
    };

    try {
      if (editingId) {
        await updateDocument('litho_costing_machines', editingId, payload);
        toast.success('Machine costing mechanics updated.');
      } else {
        await createDocument('litho_costing_machines', payload);
        toast.success('New machine costing engine registered.');
      }
      resetForm('printer');
    } catch (error) {
      toast.error('Error saving machine.');
    }
  };

  const handleSaveFinishing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingForm.name) {
      toast.error('Descriptive line action name required.');
      return;
    }
    const safeAmt = Number(finishingForm.costAmount) || 0;
    const safeSetup = Number(finishingForm.setupCost) || 0;
    const safeMarkup = Number(finishingForm.markupPercent) || 0;

    const payload = {
      ...finishingForm,
      costAmount: safeAmt,
      setupCost: safeSetup,
      markupPercent: safeMarkup
    };

    try {
      if (editingId) {
        await updateDocument('litho_finishing_options', editingId, payload);
        toast.success('Finishing operational cost updated.');
      } else {
        await createDocument('litho_finishing_options', payload);
        toast.success('New finishing operation registered.');
      }
      resetForm('finishing');
    } catch (error) {
      toast.error('Error saving finishing option.');
    }
  };

  // Toggle Active Status Directly
  const handleToggleActive = async (collectionName: string, id: string, currentVal: boolean) => {
    try {
      await updateDocument(collectionName, id, { active: !currentVal });
      toast.success('Record active status toggled.');
    } catch (error) {
      toast.error('Failed to toggle active status.');
    }
  };

  // Delete Direct Support 
  const handleDeleteItem = async (collectionName: string, id: string) => {
    if (window.confirm('Are you select-convinced you want to delete this cost benchmark? All operations rely on these.')) {
      try {
        await deleteDocument(collectionName, id);
        toast.success('Item wiped from cost registry.');
      } catch (error) {
        toast.error('Failed to delete registry item.');
      }
    }
  };

  const handleStartEdit = (item: any, section: ConfigSection) => {
    setEditingId(item.id);
    if (section === 'paper') {
      setPaperForm({
        name: item.name,
        type: item.type,
        gsm: item.gsm,
        sheetSize: item.sheetSize,
        costPerSheet: item.costPerSheet,
        costPerPack: item.costPerPack || (item.costPerSheet * (item.sheetsPerPack || 500)),
        sheetsPerPack: item.sheetsPerPack || 500,
        stockQuantity: item.stockQuantity || 0,
        vatSettings: item.vatSettings || '15% Standard',
        supplier: item.supplier || '',
        markupPercent: item.markupPercent || 30,
        active: item.active !== false
      });
    } else if (section === 'printer') {
      setPrinterForm({
        name: item.name,
        printType: item.printType,
        maxSheetSize: item.maxSheetSize,
        costPerImpression: item.costPerImpression,
        setupCost: item.setupCost,
        minimumCharge: item.minimumCharge,
        speedPerHour: item.speedPerHour,
        active: item.active !== false
      });
    } else {
      setFinishingForm({
        name: item.name,
        type: item.type,
        costType: item.costType,
        costAmount: item.costAmount,
        setupCost: item.setupCost,
        markupPercent: item.markupPercent || 30,
        active: item.active !== false
      });
    }
  };

  const resetForm = (section: ConfigSection) => {
    setEditingId(null);
    if (section === 'paper') {
      setPaperForm({
        name: '',
        type: 'Gloss Art',
        gsm: 115,
        sheetSize: 'SRA3 (450x320)',
        costPerSheet: 0.50,
        costPerPack: 250,
        sheetsPerPack: 500,
        stockQuantity: 1000,
        vatSettings: '15% Standard',
        supplier: '',
        markupPercent: 30,
        active: true
      });
    } else if (section === 'printer') {
      setPrinterForm({ name: '', printType: 'Litho Press', maxSheetSize: 'SRA3 (450x320)', costPerImpression: 0.10, setupCost: 500, minimumCharge: 1000, speedPerHour: 10000, active: true });
    } else {
      setFinishingForm({ name: '', type: 'cutting', costType: 'per sheet', costAmount: 0.10, setupCost: 100, markupPercent: 30, active: true });
    }
  };

  // Searching logic
  const filteredPapers = papers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.type.toLowerCase().includes(searchQuery.toLowerCase()) || p.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPrinters = printers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.printType.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFinishings = finishings.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.type.toLowerCase().includes(searchQuery.toLowerCase()));

  const loadingAny = loadingPapers || loadingPrinters || loadingFinishings;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Upper informational bar */}
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <span className="text-brand-accent text-[9px] font-black uppercase tracking-widest block mb-1">Pricing Configuration & Master Controls</span>
          <h3 className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-2">
            Costing Variables Registry
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Register and update critical Litho substrate unit prices, machine make-ready rates, and finishing matrix benchmarks. All Custom Book Calculator formulas automatically inherit these live values instantly.
          </p>
        </div>

        {papers.length === 0 && printers.length === 0 && finishings.length === 0 ? (
          <button
            onClick={handleSeedData}
            disabled={isUpdating === 'seeding'}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 select-none shrink-0"
          >
            <Sparkles size={14} />
            <span>Seed Standard Print Costs</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (window.confirm('Resetting will overwrite base rates with standard defaults if missing. Proceed?')) {
                handleSeedData();
              }
            }}
            disabled={isUpdating === 'seeding'}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all select-none"
          >
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>
        )}
      </div>

      {loadingAny ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-900/10 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT PANEL: Form Inputs */}
          <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex flex-col justify-between h-fit top-8 sticky">
            <div>
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                <Settings size={16} className="text-brand-accent" />
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">
                  {editingId ? 'Modify Rate Benchmark' : 'Register New Variable'}
                </h4>
              </div>

              {activeSection === 'paper' && (
                <form onSubmit={handleSavePaper} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Paper Descriptive Name</label>
                    <input
                      type="text"
                      value={paperForm.name}
                      onChange={e => setPaperForm({ ...paperForm, name: e.target.value })}
                      placeholder="e.g. Titan Gloss Art 150gsm"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Paper Type Category</label>
                      <select
                        value={paperForm.type}
                        onChange={e => setPaperForm({ ...paperForm, type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white"
                      >
                        <option value="Gloss Art">Gloss Art</option>
                        <option value="Matt Art">Matt Art</option>
                        <option value="Uncoated Bond">Uncoated Bond</option>
                        <option value="Cover Board">Cover Board</option>
                        <option value="Coated Offset">Coated Offset</option>
                        <option value="Carbonless">Carbonless</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Substrate GSM</label>
                      <input
                        type="number"
                        value={paperForm.gsm}
                        onChange={e => setPaperForm({ ...paperForm, gsm: parseInt(e.target.value) || 80 })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Supplier Sheet Size</label>
                      <select
                        value={paperForm.sheetSize}
                        onChange={e => setPaperForm({ ...paperForm, sheetSize: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white"
                      >
                        <option value="SRA3 (450x320)">SRA3 (450x320)</option>
                        <option value="SRA2 (640x450)">SRA2 (640x450)</option>
                        <option value="SRA1 (900x640)">SRA1 (900x640)</option>
                        <option value="A2 (594x420)">A2 (594x420)</option>
                        <option value="A1 (841x594)">A1 (841x594)</option>
                        <option value="A4 (297x210)">A4 (297x210)</option>
                        <option value="700x1000">700x1000</option>
                        <option value="610x430">610x430</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Supplier Net Cost (Sheet)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-black">R</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={paperForm.costPerSheet}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const packQty = Number(paperForm.sheetsPerPack) || 500;
                            setPaperForm({
                              ...paperForm,
                              costPerSheet: val,
                              costPerPack: parseFloat((val * packQty).toFixed(2))
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Cost Per Pack</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-black">R</span>
                        <input
                          type="number"
                          step="0.01"
                          value={paperForm.costPerPack || 0}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const packQty = Number(paperForm.sheetsPerPack) || 500;
                            setPaperForm({
                              ...paperForm,
                              costPerPack: val,
                              costPerSheet: parseFloat((packQty ? val / packQty : 0).toFixed(4))
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Sheets Per Pack</label>
                      <input
                        type="number"
                        value={paperForm.sheetsPerPack || 500}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 500;
                          const sheetCost = Number(paperForm.costPerSheet) || 0;
                          setPaperForm({
                            ...paperForm,
                            sheetsPerPack: val,
                            costPerPack: parseFloat((sheetCost * val).toFixed(2))
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Stock Quantity (Sheets)</label>
                      <input
                        type="number"
                        value={paperForm.stockQuantity || 0}
                        onChange={e => setPaperForm({ ...paperForm, stockQuantity: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">VAT Configuration</label>
                      <select
                        value={paperForm.vatSettings || '15% Standard'}
                        onChange={e => setPaperForm({ ...paperForm, vatSettings: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white font-medium"
                      >
                        <option value="15% Standard">15% Standard VAT</option>
                        <option value="0% Exempt">0% Exempt</option>
                        <option value="0% Zero-Rated">0% Zero-Rated</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Trade Supplier</label>
                      <input
                        type="text"
                        value={paperForm.supplier}
                        onChange={e => setPaperForm({ ...paperForm, supplier: e.target.value })}
                        placeholder="e.g. Antalis"
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Default Sheet Markup</label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={paperForm.markupPercent}
                          onChange={e => setPaperForm({ ...paperForm, markupPercent: parseInt(e.target.value) || 0 })}
                          className="w-full pr-7 pl-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                        <span className="absolute right-3 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all text-center"
                    >
                      {editingId ? 'Modify Record' : 'Add Paper'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => resetForm('paper')}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </form>
              )}

              {activeSection === 'printer' && (
                <form onSubmit={handleSavePrinter} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Machine Model & Name</label>
                    <input
                      type="text"
                      value={printerForm.name}
                      onChange={e => setPrinterForm({ ...printerForm, name: e.target.value })}
                      placeholder="e.g. Heidelberg Speedmaster SM 74"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Press print Type</label>
                      <select
                        value={printerForm.printType}
                        onChange={e => setPrinterForm({ ...printerForm, printType: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white font-medium"
                      >
                        <option value="Litho Press">Litho Press</option>
                        <option value="Digital Press">Digital Press</option>
                        <option value="Web Offset">Web Offset</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Max Sheet Sizing</label>
                      <input
                        type="text"
                        value={printerForm.maxSheetSize}
                        onChange={e => setPrinterForm({ ...printerForm, maxSheetSize: e.target.value })}
                        placeholder="e.g. 520x740 (A2)"
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Cost Per Plate/Pass</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-bold">R</span>
                        <input
                          type="number"
                          step="0.001"
                          value={printerForm.costPerImpression}
                          onChange={e => setPrinterForm({ ...printerForm, costPerImpression: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Base Setup / Pre-MakeReady</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-bold">R</span>
                        <input
                          type="number"
                          value={printerForm.setupCost}
                          onChange={e => setPrinterForm({ ...printerForm, setupCost: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Minimum Charge Limit</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-bold">R</span>
                        <input
                          type="number"
                          value={printerForm.minimumCharge}
                          onChange={e => setPrinterForm({ ...printerForm, minimumCharge: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Speed / impressions hr</label>
                      <input
                        type="number"
                        value={printerForm.speedPerHour}
                        onChange={e => setPrinterForm({ ...printerForm, speedPerHour: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all text-center"
                    >
                      {editingId ? 'Modify Record' : 'Add Machine'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => resetForm('printer')}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </form>
              )}

              {activeSection === 'finishing' && (
                <form onSubmit={handleSaveFinishing} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Finishing Descriptive name</label>
                    <input
                      type="text"
                      value={finishingForm.name}
                      onChange={e => setFinishingForm({ ...finishingForm, name: e.target.value })}
                      placeholder="e.g. Perfect Spine Hot Glue Binding"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Finishing Operation Type</label>
                      <select
                        value={finishingForm.type}
                        onChange={e => setFinishingForm({ ...finishingForm, type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white font-medium"
                      >
                        <option value="cutting">cutting</option>
                        <option value="folding">folding</option>
                        <option value="stitching">stitching</option>
                        <option value="perfect binding">perfect binding</option>
                        <option value="lamination">lamination</option>
                        <option value="scoring">scoring</option>
                        <option value="drilling">drilling</option>
                        <option value="numbering">numbering</option>
                        <option value="perforation">perforation</option>
                        <option value="varnish">varnish</option>
                        <option value="embossing">embossing</option>
                        <option value="die-cutting">die-cutting</option>
                        <option value="foiling">foiling</option>
                        <option value="other">other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Finishing Costing Format</label>
                      <select
                        value={finishingForm.costType}
                        onChange={e => setFinishingForm({ ...finishingForm, costType: e.target.value as any })}
                        className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none bg-white font-medium"
                      >
                        <option value="per job">per job</option>
                        <option value="per page">per page</option>
                        <option value="per sheet">per sheet</option>
                        <option value="per book">per book</option>
                        <option value="per 1000">per 1000</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Rate / Cost Amount</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-bold">R</span>
                        <input
                          type="number"
                          step="0.01"
                          value={finishingForm.costAmount}
                          onChange={e => setFinishingForm({ ...finishingForm, costAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Base Pre-Setup Fee</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[10px] text-slate-400 font-bold">R</span>
                        <input
                          type="number"
                          value={finishingForm.setupCost}
                          onChange={e => setFinishingForm({ ...finishingForm, setupCost: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Profit Markup / Cover rate</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={finishingForm.markupPercent}
                        onChange={e => setFinishingForm({ ...finishingForm, markupPercent: parseInt(e.target.value) || 0 })}
                        className="w-full pr-7 pl-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
                      />
                      <span className="absolute right-3 text-[10px] text-slate-400 font-black">%</span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all text-center"
                    >
                      {editingId ? 'Modify Record' : 'Add Option'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => resetForm('finishing')}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-normal font-medium">
              Update these unit prices at any time. All future quote calculations trigger real-time updates instantly.
            </div>
          </div>

          {/* RIGHT PANEL: Custom Cost Tables */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Nav Filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-2">
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 w-full sm:w-auto">
                {[
                  { id: 'paper', label: 'Paper stock', icon: Paperclip },
                  { id: 'printer', label: 'Printers & machines', icon: Printer },
                  { id: 'finishing', label: 'Finishing Operations', icon: Settings }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as ConfigSection);
                        resetForm(item.id as ConfigSection);
                        setSearchQuery('');
                      }}
                      className={cn(
                        "flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 select-none transition-all",
                        isSelected 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-250/20" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Icon size={12} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live search query bar */}
              <div className="relative w-full sm:w-64 flex items-center">
                <Search size={14} className="absolute left-3.5 text-slate-450" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Live Config Rows */}
            <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm">
              <AnimatePresence mode="wait">
                {activeSection === 'paper' && (
                  <motion.div
                    key="paper-table"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">Stock Designation</th>
                          <th className="py-4 px-4">Size & Weight</th>
                          <th className="py-4 px-4 text-right">(Net) Sheet & Pack Cost</th>
                          <th className="py-4 px-4 text-center">Markup</th>
                          <th className="py-4 px-4">Supplier & Inventory</th>
                          <th className="py-4 px-4 text-center">State</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPapers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                              No paper stock records found matching.
                            </td>
                          </tr>
                        ) : (
                          filteredPapers.map(p => (
                            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-bold text-slate-800 block truncate max-w-[180px]">{p.name}</span>
                                <div className="flex gap-2 mt-0.5 text-[9px] text-slate-400 font-medium">
                                  <span className="uppercase tracking-wider">{p.type}</span>
                                  <span>•</span>
                                  <span>VAT: {p.vatSettings || '15% Standard'}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-bold block w-fit mb-0.5">{p.sheetSize}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">{p.gsm} gsm</span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="font-black text-slate-800">R {p.costPerSheet.toFixed(3)} /sh</div>
                                {p.costPerPack && (
                                  <div className="text-[9px] text-slate-400 font-semibold">
                                    R {p.costPerPack.toFixed(2)} / pack of {p.sheetsPerPack || 500}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-slate-600">
                                {p.markupPercent}%
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-600 font-semibold">{p.supplier || '—'}</div>
                                <div className="text-[9px] text-slate-400 font-medium font-mono">
                                  Qty: {(p.stockQuantity !== undefined ? p.stockQuantity : 1000).toLocaleString()} sh
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  onClick={() => handleToggleActive('litho_paper_stock', p.id!, p.active)}
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                    p.active 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-250/30" 
                                      : "bg-slate-55 text-slate-400 border-slate-200"
                                  )}
                                >
                                  {p.active ? 'Active' : 'Halted'}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => handleStartEdit(p, 'paper')}
                                    className="p-1 px-2.5 bg-slate-50 border border-slate-205 text-slate-600 hover:text-slate-850 hover:border-slate-350 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('litho_paper_stock', p.id!)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </motion.div>
                )}

                {activeSection === 'printer' && (
                  <motion.div
                    key="printer-table"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">Press designation</th>
                          <th className="py-4 px-4">Imposition size</th>
                          <th className="py-4 px-4 text-right">Plate/Pass (Imp)</th>
                          <th className="py-4 px-4 text-right">Make-Ready</th>
                          <th className="py-4 px-4 text-right">Min Job Fee</th>
                          <th className="py-4 px-4 text-center">Active</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrinters.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                              No printing press records found matching.
                            </td>
                          </tr>
                        ) : (
                          filteredPrinters.map(m => (
                            <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-black text-slate-800 block truncate max-w-[200px]">{m.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{m.printType}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-bold block w-fit mb-0.5">{m.maxSheetSize}</span>
                                <span className="text-[10px] text-slate-450 font-bold">{m.speedPerHour.toLocaleString()} iph</span>
                              </td>
                              <td className="py-4 px-4 text-right font-black text-slate-800">
                                R {m.costPerImpression.toFixed(2)}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-slate-600">
                                R {m.setupCost}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-slate-650">
                                R {m.minimumCharge}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  onClick={() => handleToggleActive('litho_costing_machines', m.id!, m.active)}
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                    m.active 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-250/30" 
                                      : "bg-slate-55 text-slate-400 border-slate-200"
                                  )}
                                >
                                  {m.active ? 'Active' : 'Offline'}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => handleStartEdit(m, 'printer')}
                                    className="p-1 px-2.5 bg-slate-50 border border-slate-205 text-slate-600 hover:text-slate-850 hover:border-slate-350 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('litho_costing_machines', m.id!)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </motion.div>
                )}

                {activeSection === 'finishing' && (
                  <motion.div
                    key="finishing-table"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">Finishing action name</th>
                          <th className="py-4 px-4">Pricing Form</th>
                          <th className="py-4 px-4 text-right">Cost Rate</th>
                          <th className="py-4 px-4 text-right">Pre-Setup Setup</th>
                          <th className="py-4 px-4 text-center">Markup</th>
                          <th className="py-4 px-4 text-center">Active</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFinishings.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                              No finishing operations registered yet.
                            </td>
                          </tr>
                        ) : (
                          filteredFinishings.map(f => (
                            <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-bold text-slate-800 block truncate max-w-[200px]">{f.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 block">{f.type}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-150/10 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block">
                                  {f.costType}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-slate-800">
                                R {f.costAmount.toFixed(2)}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-slate-600">
                                R {f.setupCost}
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-slate-650">
                                {f.markupPercent}%
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  onClick={() => handleToggleActive('litho_finishing_options', f.id!, f.active)}
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                    f.active 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-250/30" 
                                      : "bg-slate-55 text-slate-400 border-slate-200"
                                  )}
                                >
                                  {f.active ? 'Active' : 'Unused'}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => handleStartEdit(f, 'finishing')}
                                    className="p-1 px-2.5 bg-slate-50 border border-slate-205 text-slate-600 hover:text-slate-850 hover:border-slate-350 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('litho_finishing_options', f.id!)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
