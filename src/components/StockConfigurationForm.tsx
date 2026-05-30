import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Shirt, 
  Tag, 
  Layers, 
  DollarSign, 
  Hash, 
  Plus, 
  X, 
  Check, 
  Sparkles, 
  Package, 
  AlertCircle, 
  Palette, 
  Scissors, 
  Scale
} from 'lucide-react';
import { toast } from 'sonner';

// Type definitions for our dynamic configuration form
export type StockItemCategory = 'Hardware' | 'Apparel';

export interface ColorWay {
  id: string;
  name: string;
}

export interface StockFormState {
  sku: string;
  minReorderPoint: number;
  vendorId: string;
  category: StockItemCategory;
  // Fabrication Hardware exclusive fields
  uom: 'Piece' | 'Box' | 'Pack';
  packQuantity: number;
  unitCost: number;
  // Apparel & Promotional Products exclusive fields
  apparelType: string;
  colorWays: string[];
  sizesSelected: string[];
  decorationMethods: string[];
}

interface StockConfigurationFormProps {
  onSave?: (data: StockFormState) => void;
  onCancel?: () => void;
  initialSku?: string;
}

export default function StockConfigurationForm({ onSave, onCancel, initialSku = '' }: StockConfigurationFormProps) {
  // Category switch
  const [category, setCategory] = useState<StockItemCategory>('Hardware');

  // Shared Core Inventory States
  const [sku, setSku] = useState(initialSku);
  const [minReorderPoint, setMinReorderPoint] = useState<number>(20);
  const [vendorId, setVendorId] = useState('VEN-9102'); // Mock/Pre-populated ERP Vendor Link

  // 1. Fabrication Hardware Specific States
  const [uom, setUom] = useState<'Piece' | 'Box' | 'Pack'>('Box');
  const [packQuantity, setPackQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(45.50);

  // 2. Apparel & Promotional Specific States
  const [apparelType, setApparelType] = useState('Premium Crewneck Hoodie');
  const [colorInput, setColorInput] = useState('');
  const [colorWays, setColorWays] = useState<string[]>(['Black', 'Navy Blue', 'Heather Gray']);
  const [sizesSelected, setSizesSelected] = useState<string[]>(['M', 'L', 'XL']);
  const [decorationMethods, setDecorationMethods] = useState<string[]>(['Screen Print', 'Embroidery']);

  // Error States
  const [skuError, setSkuError] = useState('');
  const [packQuantityError, setPackQuantityError] = useState('');
  const [unitCostError, setUnitCostError] = useState('');

  // Sizing definitions for apparel checkbox grid
  const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

  // Decoration methods checkbox definitions
  const AVAILABLE_DECORATIONS = [
    { name: 'Screen Print', desc: 'Ideal for large solid color runs' },
    { name: 'Embroidery', desc: 'Premium stitched classic logos' },
    { name: 'DTF (Direct To Film)', desc: 'High detail full-color transfers' },
    { name: 'Laser Engraving', desc: 'Perfect for rigid promo accessories' },
    { name: 'Sublimation', desc: 'Over-all coverage polyester print' }
  ];

  // Logic to handle tag/chip creation for color ways
  const handleAddColor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanColor = colorInput.trim();
    if (!cleanColor) return;
    
    if (colorWays.some(c => c.toLowerCase() === cleanColor.toLowerCase())) {
      toast.error(`"${cleanColor}" has already been appended.`);
      return;
    }

    setColorWays([...colorWays, cleanColor]);
    setColorInput('');
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setColorWays(colorWays.filter(c => c !== colorToRemove));
  };

  // Switch size checkbox
  const toggleSize = (size: string) => {
    if (sizesSelected.includes(size)) {
      setSizesSelected(sizesSelected.filter(s => s !== size));
    } else {
      setSizesSelected([...sizesSelected, size]);
    }
  };

  // Switch decoration checkbox
  const toggleDecoration = (methodName: string) => {
    if (decorationMethods.includes(methodName)) {
      setDecorationMethods(decorationMethods.filter(d => d !== methodName));
    } else {
      setDecorationMethods([...decorationMethods, methodName]);
    }
  };

  // Dynamic Validation rules
  const validateForm = (): boolean => {
    let isValid = true;
    
    // SKU name checks
    if (!sku.trim()) {
      setSkuError("SKU code sequence identifier is required.");
      isValid = false;
    } else if (sku.length > 50) {
      setSkuError("SKU references cannot exceed 50 characters.");
      isValid = false;
    } else {
      setSkuError("");
    }

    // Hardware checks
    if (category === 'Hardware') {
      if (packQuantity <= 0) {
        setPackQuantityError("Pack quantity must be a positive integer.");
        isValid = false;
      } else {
        setPackQuantityError("");
      }

      if (unitCost < 0) {
        setUnitCostError("Unit cost cannot possess negative value.");
        isValid = false;
      } else {
         setUnitCostError("");
      }
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please verify validation warnings before publishing inventory items.");
      return;
    }

    const compiledData: StockFormState = {
      sku: sku.trim().toUpperCase(),
      minReorderPoint,
      vendorId,
      category,
      uom,
      packQuantity: category === 'Hardware' ? packQuantity : 0,
      unitCost: category === 'Hardware' ? unitCost : 0,
      apparelType: category === 'Apparel' ? apparelType : '',
      colorWays: category === 'Apparel' ? colorWays : [],
      sizesSelected: category === 'Apparel' ? sizesSelected : [],
      decorationMethods: category === 'Apparel' ? decorationMethods : []
    };

    console.log("ERP Stock Creation Payload Verified:", compiledData);
    toast.success(`Inventory Item [${compiledData.sku}] catalogued successfully!`);
    
    if (onSave) {
      onSave(compiledData);
    }
  };

  return (
    <div id="stock-configuration-form" className="w-full max-w-4xl mx-auto bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 relative overflow-hidden">
      {/* Decorative Brand Accent Overlay */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500" />

      {/* Header section with brand context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-gray-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3">
            <Sparkles size={11} className="text-teal-500 animate-pulse" />
            Sign-Shop ERP Stockroom Control
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
            Dynamic stock catalog
          </h2>
          <p className="text-xs text-text-light font-bold mt-2">
            Configure raw hardware variables, customized garments, or promo stock with live constraints
          </p>
        </div>

        {/* Dynamic Selector for Core Stock category */}
        <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner w-full md:w-auto">
          <button
            type="button"
            id="stock-selector-hardware"
            onClick={() => {
              setCategory('Hardware');
              setSkuError('');
              setPackQuantityError('');
              setUnitCostError('');
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              category === 'Hardware' 
                ? 'bg-white text-emerald-600 shadow-md border border-gray-100' 
                : 'text-text-light hover:text-text-main'
            }`}
          >
            <Wrench size={14} strokeWidth={2.5} />
            Fabrication Hardware
          </button>
          
          <button
            type="button"
            id="stock-selector-apparel"
            onClick={() => {
              setCategory('Apparel');
              setSkuError('');
              setPackQuantityError('');
              setUnitCostError('');
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              category === 'Apparel' 
                ? 'bg-white text-teal-600 shadow-md border border-gray-100' 
                : 'text-text-light hover:text-text-main'
            }`}
          >
            <Shirt size={14} strokeWidth={2.5} />
            Apparel & Promotion
          </button>
        </div>
      </div>

      {/* Main configuration settings */}
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SHARED SECTION: Base ERP inventory variables */}
        <div className="p-6 sm:p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted border-b border-gray-100 pb-3 flex items-center gap-2">
            <Layers size={14} className="text-teal-500" />
            Global Warehouse Metadata
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SKU Input */}
            <div>
              <label htmlFor="stock-sku" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Raw SKU Identifier Key *
              </label>
              <input
                type="text"
                id="stock-sku"
                required
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase());
                  if (skuError) setSkuError('');
                }}
                className={`w-full px-5 py-4 bg-white border rounded-2xl font-black text-sm tracking-widest focus:outline-none focus:ring-4 transition-all ${
                  skuError 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-200 focus:ring-teal-100 focus:border-teal-500'
                }`}
                placeholder="SKU-HW-BOLT-M8"
              />
              {skuError ? (
                <div id="sku-validation-msg" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                  <AlertCircle size={12} />
                  {skuError}
                </div>
              ) : (
                <p className="text-[9px] text-text-muted mt-1.5 ml-1 font-medium">
                  Unique inventory key applied in automated production queues.
                </p>
              )}
            </div>

            {/* Minimum Reorder Point */}
            <div>
              <label htmlFor="stock-reorder-point" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Reorder Threshold point *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="stock-reorder-point"
                  required
                  min="0"
                  value={minReorderPoint}
                  onChange={(e) => setMinReorderPoint(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pr-14 pl-5 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-teal-150"
                  placeholder="20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-text-light uppercase tracking-wider">
                  units
                </span>
              </div>
            </div>

            {/* Vendor List */}
            <div>
              <label htmlFor="stock-vendor-id" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Vendor Relationship link *
              </label>
              <select
                id="stock-vendor-id"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:ring-4 focus:ring-teal-100 transition-all cursor-pointer"
              >
                <option value="VEN-9102">Falcon Sign Supplier SA</option>
                <option value="VEN-7711">Cape Textile Weavers Group</option>
                <option value="VEN-8822">Alum-Bond Plate Distributors</option>
                <option value="VEN-3011">Direct Import Promos Inc.</option>
              </select>
            </div>
          </div>
        </div>

        {/* DYNAMIC SECTION: Subform switching block */}
        <AnimatePresence mode="wait">
          {category === 'Hardware' ? (
            <motion.div
              key="hardware-inputs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="p-6 sm:p-8 rounded-3xl border border-emerald-100 bg-emerald-50/10 flex flex-col gap-6"
            >
              {/* Specialized Hardware Headers */}
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-800 border-b border-emerald-100/40 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench size={14} className="text-emerald-500" />
                  Fabrication Hardware Variables
                </span>
                <span className="text-[9px] font-black tracking-widest bg-emerald-100 px-2 py-0.5 rounded text-emerald-700">Rigid Fasteners</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Unit of Measure (UOM) Dropdown */}
                <div>
                  <label htmlFor="hardware-uom" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Unit of Measure *
                  </label>
                  <select
                    id="hardware-uom"
                    value={uom}
                    onChange={(e) => setUom(e.target.value as any)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all cursor-pointer"
                  >
                    <option value="Piece">Piece (Individual Units)</option>
                    <option value="Box">Box (Internal Batching)</option>
                    <option value="Pack">Pack (Shrink-wrap clusters)</option>
                  </select>
                </div>

                {/* Pack Quantity */}
                <div>
                  <label htmlFor="hardware-pack-qty" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Pack / Box Quantity count *
                  </label>
                  <input
                    type="number"
                    id="hardware-pack-qty"
                    required
                    value={packQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPackQuantity(val);
                      if (packQuantityError) setPackQuantityError('');
                    }}
                    className={`w-full px-5 py-4 bg-white border rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 transition-all ${
                      packQuantityError 
                        ? 'border-red-500 focus:ring-red-100' 
                        : 'border-gray-200 focus:ring-emerald-100'
                    }`}
                  />
                  {packQuantityError && (
                    <div id="hardware-pack-qty-msg" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                      <AlertCircle size={12} />
                      {packQuantityError}
                    </div>
                  )}
                </div>

                {/* Unit Cost */}
                <div>
                  <label htmlFor="hardware-unit-cost" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Direct Unit Cost price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-text-light">
                      R
                    </span>
                    <input
                      type="number"
                      id="hardware-unit-cost"
                      step="0.01"
                      required
                      value={unitCost}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setUnitCost(val);
                        if (unitCostError) setUnitCostError('');
                      }}
                      className={`w-full pl-10 pr-5 py-4 bg-white border rounded-2xl font-bold text-sm tracking-tight focus:outline-none focus:ring-4 transition-all ${
                        unitCostError 
                          ? 'border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:ring-emerald-100'
                      }`}
                    />
                  </div>
                  {unitCostError && (
                    <div id="hardware-unit-cost-msg" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                      <AlertCircle size={12} />
                      {unitCostError}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="apparel-inputs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="p-6 sm:p-8 rounded-3xl border border-teal-100 bg-teal-50/10 flex flex-col gap-8"
            >
              {/* Specialized Apparel Headers */}
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-800 border-b border-teal-100/40 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shirt size={14} className="text-teal-500" />
                  Apparel & Promotional Parameters
                </span>
                <span className="text-[9px] font-black tracking-widest bg-teal-100 px-2 py-0.5 rounded text-teal-700">Custom Garments</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. Apparel Type configuration */}
                <div>
                  <label htmlFor="apparel-type-picker" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Apparel / Blank Product category *
                  </label>
                  <input
                    type="text"
                    id="apparel-type-picker"
                    required
                    value={apparelType}
                    onChange={(e) => setApparelType(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-teal-100"
                    placeholder="Premium Heavyweight Hoodies"
                  />
                </div>

                {/* 2. Brand Color Ways Chip Input */}
                <div>
                  <label htmlFor="colorway-text" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Brand Colorways (Chip Generator)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="colorway-text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                      className="flex-1 px-5 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-teal-100"
                      placeholder="Enter a color (e.g. Emerald Green)"
                    />
                    <button
                      type="button"
                      id="btn-add-colorway"
                      onClick={() => handleAddColor()}
                      className="px-5 bg-teal-800 text-white rounded-2xl flex items-center justify-center hover:bg-teal-700 border border-teal-900 transition-all font-black hover:-translate-y-0.5 active:translate-y-0 shadow-md"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Render color chips */}
                  <div id="colorway-chips-container" className="flex flex-wrap gap-2 mt-3">
                    {colorWays.map((color, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-100 rounded-xl font-bold text-xs text-teal-800 shadow-sm"
                      >
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        {color}
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(color)}
                          className="hover:text-red-500 transition-colors p-0.5 ml-1"
                          title={`Remove ${color}`}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    {colorWays.length === 0 && (
                      <span className="text-[10px] italic text-text-light pl-1 font-bold">
                        No color layers linked yet. Standard white base fallback applies.
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Sizes selection (XS through 3XL Checkbox Matrix) */}
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-3 ml-1">
                    Select Apparel Sizing Matrix Requirements *
                  </label>
                  <div id="size-matrix-container" className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {AVAILABLE_SIZES.map((size) => {
                      const isSelected = sizesSelected.includes(size);
                      return (
                        <button
                          type="button"
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`py-4 rounded-2xl font-black text-sm border transition-all duration-150 flex flex-col items-center justify-center gap-1 shadow-sm ${
                            isSelected 
                              ? 'bg-teal-800 text-white border-teal-950 ring-2 ring-teal-500/35' 
                              : 'bg-white text-text-main border-gray-200 hover:border-teal-400'
                          }`}
                        >
                          <span className="text-xs">{size}</span>
                          {isSelected && <Check size={12} strokeWidth={3} className="text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Decoration Methods Checkbox List */}
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-3" id="decoration-options-label">
                    Allowed Decoration / Branding Workflows *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="decorations-selection-wrapper">
                    {AVAILABLE_DECORATIONS.map((decor) => {
                      const isSelected = decorationMethods.includes(decor.name);
                      return (
                        <div
                          key={decor.name}
                          onClick={() => toggleDecoration(decor.name)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 shadow-xs ${
                            isSelected 
                              ? 'bg-white border-teal-500 ring-2 ring-teal-500/10' 
                              : 'bg-white border-gray-200 hover:border-teal-400'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-teal-800 border-teal-950 text-white' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                          <div>
                            <span className="block text-xs font-black text-gray-800">
                              {decor.name}
                            </span>
                            <span className="text-[10px] font-medium text-text-light mt-0.5 block leading-tight">
                              {decor.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global form configuration controls */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              id="stock-form-cancel"
              onClick={onCancel}
              className="flex-1 px-8 py-4 bg-gray-50 hover:bg-gray-100 text-text-muted font-bold text-[10px] uppercase tracking-widest rounded-2xl border border-gray-200/50 transition-all"
            >
              Cancel Parameters
            </button>
          )}
          <button
            type="submit"
            id="stock-form-submit"
            className="flex-1 px-8 py-4 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            {category === 'Hardware' ? (
              <Wrench size={16} strokeWidth={2.5} className="text-emerald-400 font-bold" />
            ) : (
              <Shirt size={16} strokeWidth={2.5} className="text-teal-400 font-bold" />
            )}
            Build Dynamic Stock item
          </button>
        </div>

      </form>
    </div>
  );
}
