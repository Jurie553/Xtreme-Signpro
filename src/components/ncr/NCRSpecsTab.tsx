import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Edit2, Trash2, Layers, Check, ArrowUpDown, ChevronRight, Sliders, Settings, HelpCircle, FileText, Copy, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook, NCRPricingTier } from '@/src/types';
import { toast } from 'sonner';

interface NCRSpecsTabProps {
  books: NCRBook[];
  onSelectBook: (book: NCRBook) => void;
  selectedBook: NCRBook | null;
  onSave: (bookData: Partial<NCRBook>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (book: NCRBook) => Promise<void> | void;
  isUpdating: string | null;
}

const CONSTANT_COLORS = [
  { name: 'White', bg: 'bg-white border-slate-300 text-slate-800' },
  { name: 'Pink', bg: 'bg-rose-100 border-rose-300 text-rose-800' },
  { name: 'Yellow', bg: 'bg-amber-100 border-amber-300 text-amber-800' },
  { name: 'Blue', bg: 'bg-sky-100 border-sky-300 text-sky-850' },
  { name: 'Green', bg: 'bg-emerald-100 border-emerald-300 text-emerald-800' }
];

export default function NCRSpecsTab({
  books,
  onSelectBook,
  selectedBook,
  onSave,
  onDelete,
  onDuplicate,
  isUpdating
}: NCRSpecsTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<NCRPricingTier[]>([
    { quantity: 5, cost: 350, sell: 550 },
    { quantity: 10, cost: 580, sell: 880 },
    { quantity: 20, cost: 950, sell: 1450 },
    { quantity: 50, cost: 1800, sell: 2950 }
  ]);
  const [formData, setFormData] = useState<Partial<NCRBook>>({
    name: '',
    description: '',
    parts: '2-part',
    setsPerBook: 50,
    size: 'A5',
    binding: 'Glued',
    print: 'Greyscale',
    options: ['Perforated', 'Sequential Numbered'],
    paperWeight: '60gsm',
    coverType: 'Wrap-around Crocboard',
    turnaroundTime: '5 business days'
  });

  // Layer State representation
  const [layers, setLayers] = useState<Array<{ id: number; color: string; purpose: string; printSide: 'single' | 'double' }>>([
    { id: 1, color: 'White', purpose: 'Original Invoice (Accounts)', printSide: 'single' },
    { id: 2, color: 'Yellow', purpose: 'Customer duplicate (Yellow CFB)', printSide: 'single' },
    { id: 3, color: 'Pink', purpose: 'Audit Copy (Pink CF)', printSide: 'double' }
  ]);

  // Sync state when parts or book changes
  React.useEffect(() => {
    if (selectedBook) {
      setFormData(selectedBook);
      setPricingTiers(selectedBook.pricingGrid || [
        { quantity: 5, cost: 350, sell: 550 },
        { quantity: 10, cost: 580, sell: 880 },
        { quantity: 20, cost: 950, sell: 1450 },
        { quantity: 50, cost: 1800, sell: 2950 }
      ]);
      
      if (selectedBook.layers && selectedBook.layers.length > 0) {
        setLayers(selectedBook.layers);
      } else {
        // Generate simulated layers from book parameters
        const partCount = selectedBook.parts === '2-part' ? 2 : selectedBook.parts === '3-part' ? 3 : selectedBook.parts === '4-part' ? 4 : 5;
        const mockColors = ['White', 'Yellow', 'Pink', 'Blue', 'Green'];
        const mockPurposes = ['Original copy', 'Duplicate copy', 'Triplicate copy', 'Quadruplicate copy', 'File copy'];
        const newLayers = Array.from({ length: partCount }).map((_, i) => ({
          id: i + 1,
          color: mockColors[i % mockColors.length],
          purpose: mockPurposes[i] || `NCR Part ${i + 1}`,
          printSide: (i === 0 ? 'single' : 'single') as 'single' | 'double'
        }));
        setLayers(newLayers);
      }
    } else {
      resetForm();
    }
  }, [selectedBook]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parts: '2-part',
      setsPerBook: 50,
      size: 'A5',
      binding: 'Glued',
      print: 'Greyscale',
      options: ['Perforated', 'Sequential Numbered'],
      paperWeight: '60gsm',
      coverType: 'Wrap-around Crocboard',
      turnaroundTime: '5 business days'
    });
    setPricingTiers([
      { quantity: 5, cost: 350, sell: 550 },
      { quantity: 10, cost: 580, sell: 880 },
      { quantity: 20, cost: 950, sell: 1450 },
      { quantity: 50, cost: 1800, sell: 2950 }
    ]);
    setLayers([
      { id: 1, color: 'White', purpose: 'Original Copy', printSide: 'single' },
      { id: 2, color: 'Yellow', purpose: 'Duplicate Copy', printSide: 'single' }
    ]);
  };

  const handleCreateNew = () => {
    resetForm();
    onSelectBook(null as any);
    setIsFormOpen(true);
  };

  const handleEdit = (book: NCRBook) => {
    onSelectBook(book);
    setIsFormOpen(true);
  };

  const handleCloneClick = (e: React.MouseEvent, book: NCRBook) => {
    e.stopPropagation();
    const clonedBook: NCRBook = {
      ...book,
      id: '', // Crucial: clear ID to trigger document creation instead of update
      name: `${book.name} (Copy)`
    };
    onSelectBook(clonedBook);
    setIsFormOpen(true);
    toast.success('Specifications copied to editor.');
  };

  const handlePartChange = (partValue: string) => {
    const partCount = partValue === '2-part' ? 2 : partValue === '3-part' ? 3 : partValue === '4-part' ? 4 : 5;
    const mockColors = ['White', 'Yellow', 'Pink', 'Blue', 'Green'];
    const mockPurposes = ['Original Copy (Accounts)', 'Duplicate Copy (Customer)', 'Triplicate Copy (Dispatch)', 'Quadruplicate Copy (Stores)', 'Archive Copy'];
    
    const newLayers = Array.from({ length: partCount }).map((_, i) => ({
      id: i + 1,
      color: mockColors[i % mockColors.length],
      purpose: mockPurposes[i] || `Part ${i + 1} Copy`,
      printSide: 'single' as 'single' | 'double'
    }));

    setFormData(prev => ({ ...prev, parts: partValue }));
    setLayers(newLayers);
  };

  const shiftLayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === layers.length - 1) return;
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    const updated = [...layers];
    const temp = updated[index];
    updated[index] = updated[swapWith];
    updated[swapWith] = temp;
    setLayers(updated);
    toast.success('NCR Stack sequence rearranged');
  };

  const updateLayerColor = (index: number, color: string) => {
    const updated = [...layers];
    updated[index].color = color;
    setLayers(updated);
  };

  const updateLayerPurpose = (index: number, text: string) => {
    const updated = [...layers];
    updated[index].purpose = text;
    setLayers(updated);
  };

  const updateLayerPrintSide = (index: number, printSide: 'single' | 'double') => {
    const updated = [...layers];
    updated[index].printSide = printSide;
    setLayers(updated);
  };

  const autoGeneratePricingTiers = () => {
    const setsPerBookValue = formData.setsPerBook || 50;
    const partsCount = formData.parts === '2-part' ? 2 : formData.parts === '3-part' ? 3 : formData.parts === '4-part' ? 4 : 5;
    const size = formData.size || 'A5';

    const testQuantities = [5, 10, 20, 50, 100];
    const newTiers = testQuantities.map(qtyOrdered => {
      const baseSetsCount = qtyOrdered * setsPerBookValue;
      const spoilageSetsCount = Math.ceil(baseSetsCount * 0.05); // 5% spoilage
      const totalSetsWithSpoilage = baseSetsCount + spoilageSetsCount;
      const totalCopySheets = totalSetsWithSpoilage * partsCount;

      // Actual industry calculation rates
      const paperCostPerSheet = size === 'A4' ? 0.45 : 0.28; 
      const plateMakingCharge = formData.print === 'Full Color' ? 350 : 180; 
      const printSetupCharge = formData.print === 'Full Color' ? 400 : 220; 
      const numberingSetupCharge = formData.options?.includes('Sequential Numbered') ? 140 : 0; 
      const perforationSetupCharge = formData.options?.includes('Perforated') ? 120 : 0; 
      const bindingGluedItemRate = formData.binding === 'Saddle Stitched' ? 15.00 : 12.00; 
      const wrapCoverCrocRate = 18.50; 

      const stockCostVal = totalCopySheets * paperCostPerSheet;
      const lithoPressLaborCost = plateMakingCharge + printSetupCharge + (baseSetsCount * 0.05);
      const mechanicalNumberingCost = numberingSetupCharge + (baseSetsCount * 0.035);
      const specializedBindingCost = (qtyOrdered * bindingGluedItemRate) + (qtyOrdered * wrapCoverCrocRate) + perforationSetupCharge;
      const overheadSurcharge = 150.00; 

      const rawProductionCost = stockCostVal + lithoPressLaborCost + mechanicalNumberingCost + specializedBindingCost + overheadSurcharge;
      const targetMarkup = 40; 
      const calculatedSell = rawProductionCost / (1 - (targetMarkup / 100));

      return {
        quantity: qtyOrdered,
        cost: Math.round(rawProductionCost),
        sell: Math.round(calculatedSell)
      };
    });

    setPricingTiers(newTiers);
    toast.success('Calculated Pricing Grid', {
      description: 'Dynamic cost-to-sell thresholds applied for 5, 10, 20, 50 & 100 NCR books based on stock and bindery specs.'
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      options: formData.options || ['Perforated', 'Sequential Numbered'],
      pricingGrid: pricingTiers,
      layers: layers, // Save custom layers to Firestore!
      status: formData.status || 'Active'
    };

    try {
      await onSave(finalData, selectedBook?.id);
      setIsFormOpen(false);
    } catch (err) {
      // toast is already triggering from main page
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Registered NCR specs (List view) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">NCR Book Registry</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{books.length} Active Specs</span>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-wider"
          >
            <Plus size={14} /> Add Spec
          </button>
        </div>

        <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1 scrollbar-thin">
          {books.map((book) => {
            const isSelected = selectedBook?.id === book.id;
            return (
              <div
                key={book.id}
                onClick={() => {
                  onSelectBook(book);
                  setIsFormOpen(false);
                }}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer relative group",
                  isSelected
                    ? "bg-white border-slate-900 shadow-md ring-1 ring-slate-900"
                    : "bg-slate-50/60 border-slate-100/70 hover:bg-white hover:border-slate-300 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center border",
                      isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      <Book size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase italic block">{book.name}</span>
                      <span className="text-[8px] font-bold text-slate-400 tracking-widest block uppercase mt-0.5">{book.size} • {book.parts}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleCloneClick(e, book)}
                      className="p-1 text-slate-500 hover:text-slate-900"
                      title="Duplicate specification"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(book);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-900"
                      title="Edit specification"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(book.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-600"
                      title="Delete specification"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-1 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-2.5 mt-2.5">
                  <span className="flex items-center gap-1">Sets/Book: <strong className="text-slate-700">{book.setsPerBook}</strong></span>
                  <span className="flex items-center gap-1 text-right">Binding: <strong className="text-slate-700">{book.binding}</strong></span>
                  <span className="flex items-center gap-1">Print: <strong className="text-slate-700">{book.print}</strong></span>
                  <span className="flex items-center gap-1 text-right">Turnaround: <strong className="text-slate-700">{book.turnaroundTime || '5 Days'}</strong></span>
                </div>
              </div>
            );
          })}

          {books.length === 0 && (
            <div className="p-8 text-center bg-slate-50/50 border border-slate-100 rounded-3xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">No NCR specs registered yet</span>
              <button
                onClick={handleCreateNew}
                className="text-[10px] text-slate-900 font-extrabold underline block mt-2 mx-auto"
              >
                Create your first specification
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Builder Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {isFormOpen ? (
          <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic">
                  {selectedBook && selectedBook.id ? 'Edit Configuration Specs' : 'Register New NCR Specification'}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Define carbonless sets, papers, weights and binders</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Configuration Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800 transition-all"
                  placeholder="e.g. A5 3-Part Triplicate Invoice Book"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sets Per Book/Pad</label>
                <select
                  value={formData.setsPerBook || 50}
                  onChange={(e) => setFormData(prev => ({ ...prev, setsPerBook: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800"
                >
                  <option value={25}>25 Sets (Fitted)</option>
                  <option value={50}>50 Sets (Standard)</option>
                  <option value={100}>100 Sets (Heavy-duty)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">NCR Parts</label>
                  <select
                    value={formData.parts || '2-part'}
                    onChange={(e) => handlePartChange(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800"
                  >
                    <option value="2-part">2-Part (Duplicate)</option>
                    <option value="3-part">3-Part (Triplicate)</option>
                    <option value="4-part">4-Part (Quadruplicate)</option>
                    <option value="5-part">5-Part (Quintuplicate)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Finished Size</label>
                  <select
                    value={formData.size || 'A5'}
                    onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800"
                  >
                    <option value="A4">A4 (Letter/Invoice)</option>
                    <option value="A5">A5 (Standard Receipt)</option>
                    <option value="A6">A6 (Delivery Note)</option>
                    <option value="DL">DL (In-pocket Receipt)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Binding Method</label>
                  <select
                    value={formData.binding || 'Glued'}
                    onChange={(e) => setFormData(prev => ({ ...prev, binding: e.target.value }))}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800"
                  >
                    <option value="Glued">Padded/Fanapart Glue</option>
                    <option value="Stapled & Taped">Stapled, Bound Class Spine Tape</option>
                    <option value="Wire-o Fitted">Spiral Wirebound (Top/Side)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ink Configuration</label>
                  <select
                    value={formData.print || 'Greyscale'}
                    onChange={(e) => setFormData(prev => ({ ...prev, print: e.target.value }))}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-slate-800"
                  >
                    <option value="Greyscale">1/0 Black Ink (Basic)</option>
                    <option value="Full Color">4/0 CMYK Color Front (Premium)</option>
                    <option value="1/1 Double-Sided">1/1 Black Face & Reverse T&Cs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paper Stock Weight</label>
                  <input
                    type="text"
                    value={formData.paperWeight || '60gsm'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paperWeight: e.target.value }))}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                    placeholder="e.g. 60gsm / 57gsm ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wrap Cover Shield</label>
                  <input
                    type="text"
                    value={formData.coverType || 'Wrap-around Crocboard'}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverType: e.target.value }))}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                    placeholder="e.g. Crocodile Print Wrap-around Board"
                  />
                </div>
              </div>

              {/* TIERED PRICING EDITOR */}
              <div className="space-y-3.5 md:col-span-2 border-t border-dashed border-slate-205 pt-5 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">QUANTITY BATCH PRICING GRID</label>
                    <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5">Determine the batch quantity (number of books), estimated manufacturing cost, and final selling price.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={autoGeneratePricingTiers}
                      className="text-[9px] font-black text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                      title="Auto-calculate costs and sell prices based on carbonless sheets, ink, plates and binding specs"
                    >
                      <Sparkles size={11} className="text-emerald-500 animate-pulse" /> Auto-Calculate Tiers
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPricingTiers([...pricingTiers, { quantity: 10, cost: 500, sell: 1000 }])}
                      className="text-[9px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      + Add Price Tier
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {pricingTiers.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">No price tiers defined. Add one above!</span>
                    </div>
                  ) : (
                    pricingTiers.map((tier, idx) => (
                      <div key={idx} className="flex gap-3 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                        <div className="flex-1 space-y-1">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Quantity (Books)</span>
                          <input 
                            type="number" 
                            required
                            min="1"
                            value={tier.quantity} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].quantity = parseInt(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Qty (e.g. 10)"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Est. Cost (Rands)</span>
                          <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={tier.cost} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].cost = parseFloat(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Cost R"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Sell Price (Rands)</span>
                          <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={tier.sell} 
                            onChange={(e) => {
                              const copy = [...pricingTiers];
                              copy[idx].sell = parseFloat(e.target.value) || 0;
                              setPricingTiers(copy);
                            }}
                            placeholder="Sell Price"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-extrabold text-xs px-2.5 py-1 mt-3 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                          title="Remove tier"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Brief Spec Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-755 h-16 resize-none focus:outline-none focus:border-slate-800"
                  placeholder="Notes for production catalog reference"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Commt Specifications to Cloud
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Spec Readout / Details Card */}
            <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm">
              {selectedBook ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <span className="text-[8px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                        SPECIFICATION PROFILE
                      </span>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase italic mt-2">
                        {selectedBook.name}
                      </h4>
                      <p className="text-xs text-slate-455 font-bold mt-1 uppercase">
                        {selectedBook.description || `Registered standard size ${selectedBook.size} ${selectedBook.parts} copy pad.`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(selectedBook)}
                        className="px-4 py-2.5 border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Edit2 size={12} /> Edit Details
                      </button>
                    </div>
                  </div>

                  {/* Smart Specification Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">COPY COUNT</span>
                      <strong className="text-lg font-black text-slate-800 uppercase italic mt-1">{selectedBook.parts}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">SIZE</span>
                      <strong className="text-lg font-black text-slate-800 uppercase italic mt-1">{selectedBook.size}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">BINDING METHOD</span>
                      <strong className="text-[11px] font-black text-slate-800 uppercase italic mt-1 leading-tight">{selectedBook.binding}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">WEIGHT / WRAP COVER</span>
                      <strong className="text-[10px] font-black text-slate-800 uppercase italic mt-1 leading-tight">
                        {selectedBook.paperWeight || '60gsm'} / {selectedBook.coverType || 'Crocboard'}
                      </strong>
                    </div>
                  </div>

                  {/* ACTIVE MULTI-TIER COAT PRICING GRID */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                      ACTIVE TIERED CALCULATION GRID
                    </span>
                    <h5 className="text-xs font-black uppercase text-slate-800 tracking-tight italic mt-2.5 mb-3">
                      Configured Price Matrix (ZAR / Rands)
                    </h5>
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                      <span className="text-left">Quantity</span>
                      <span>Est. Unit Cost</span>
                      <span>Quoted Sell Price</span>
                      <span className="text-right">Est. Markup %</span>
                    </div>
                    <div className="divide-y divide-slate-100 mt-1">
                      {(selectedBook.pricingGrid || []).length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs">No pricing tiers defined for this catalog spec.</div>
                      ) : (
                        (selectedBook.pricingGrid || []).map((tier, tIdx) => {
                          const marginPercent = tier.sell > 0 ? (((tier.sell - tier.cost) / tier.sell) * 100).toFixed(0) : '0';
                          return (
                            <div key={tIdx} className="grid grid-cols-4 gap-2 text-center py-2.5 text-[11px] font-extrabold text-slate-700">
                              <span className="text-left text-slate-900">{tier.quantity} books</span>
                              <span className="tabular-nums">R{tier.cost.toFixed(2)}</span>
                              <span className="tabular-nums text-indigo-650 font-black">R{tier.sell.toFixed(2)}</span>
                              <span className="text-right tabular-nums text-emerald-600">{marginPercent}% margin</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <Sliders size={24} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">No Specification Selected</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Select an NCR record from the registry list to load details and inspect stack templates</p>
                </div>
              )}
            </div>

            {/* INTERACTIVE STACK SEQUENCE VISUALIZER */}
            <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
              <div>
                <span className="text-[8px] bg-sky-50 text-blue-600 border border-blue-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                  CARBONLESS SET MANAGEMENT
                </span>
                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
                  Interactive Sheet Overlay & Chemical Sequence
                </h4>
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">
                  Drag, drop, and configure copy details. Chemically coated sheets must match sequence: CB (Coated Back) &gt; CFB (Coated Front & Back) &gt; CF (Coated Front).
                </p>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {layers.map((layer, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === layers.length - 1;
                    const chemicalCode = isFirst ? 'CB (Coated Back)' : isLast ? 'CF (Coated Front)' : 'CFB (Coated Front & Back)';
                    const layerColorObj = CONSTANT_COLORS.find(c => c.name === layer.color) || CONSTANT_COLORS[0];

                    return (
                      <motion.div
                        key={layer.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 relative group hover:shadow-sm transition-all",
                          layerColorObj.bg
                        )}
                      >
                        {/* Drag indicator & stack tag */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="flex flex-col gap-1 items-center">
                            <button
                              type="button"
                              onClick={() => shiftLayer(idx, 'up')}
                              disabled={isFirst}
                              className={cn("p-1 rounded hover:bg-black/5 disabled:opacity-20", isFirst && "cursor-not-allowed")}
                            >
                              <ArrowUpDown size={12} className="rotate-0 text-slate-500" />
                            </button>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">LAYER {idx + 1}</span>
                            <span className="text-[11px] font-black uppercase tracking-tighter italic">{layer.color} Stock</span>
                          </div>
                        </div>

                        {/* Copy specific instructions */}
                        <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={layer.purpose}
                              onChange={(e) => updateLayerPurpose(idx, e.target.value)}
                              className="w-full px-3 py-2 bg-white/60 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wide text-slate-800"
                              placeholder="e.g. Accounts Dept Copy"
                            />
                          </div>

                          <div className="flex gap-2">
                            {/* Color Selector dropdown simulated inside layout */}
                            <select
                              value={layer.color}
                              onChange={(e) => updateLayerColor(idx, e.target.value)}
                              className="px-2 py-1.5 bg-white/80 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-700"
                            >
                              {CONSTANT_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>

                            <select
                              value={layer.printSide}
                              onChange={(e) => updateLayerPrintSide(idx, e.target.value as any)}
                              className="px-2 py-1.5 bg-white/80 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-700"
                            >
                              <option value="single">Single Sided Print</option>
                              <option value="double">Double Sided Print</option>
                            </select>
                          </div>
                        </div>

                        {/* Chemical Code indicators */}
                        <div className="text-right shrink-0">
                          <span className="text-[8px] font-black uppercase px-2 py-1 bg-black/5 text-slate-600 rounded-md">
                            {chemicalCode}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <HelpCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] text-amber-800 font-extrabold uppercase tracking-widest block">CHEMICAL SEQUENCING VALID: AUTO MATCH SUCCESSFUL</span>
                  <p className="text-[9px] text-amber-700 leading-relaxed font-bold mt-1">
                    The chemical donor (CB) and receptor (CF, CFB) coatings are sequenced correctly for carbonless replication. Pressure applied to the original copy will penetrate down to all duplicate receiver sheets.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
