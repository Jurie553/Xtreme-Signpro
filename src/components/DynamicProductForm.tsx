import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Printer, 
  Layers, 
  Hash, 
  DollarSign, 
  Activity, 
  FileText, 
  Maximize2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Define the exact TypeScript interface for the validation errors
interface ProductFormErrors {
  name?: string;
  sheetQuantity?: string;
  runSpeed?: string;
  pricing?: string;
  basePlateFee?: string;
  startingNumber?: string;
  setsPerBook?: string;
  partsCount?: string;
}

interface DynamicProductFormProps {
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export default function DynamicProductForm({ onSuccess, onCancel }: DynamicProductFormProps) {
  // Category state (switching between NCR Books and Litho Printing)
  const [category, setCategory] = useState<'NCR' | 'Litho'>('NCR');

  // Input states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // NCR Specific fields
  const [partsCount, setPartsCount] = useState<number>(2); // Duplicate (2), Triplicate (3), etc.
  const [setsPerBook, setSetsPerBook] = useState<number>(50);
  const [bindingType, setBindingType] = useState('Padded / Glued');
  const [sequentialNumbering, setSequentialNumbering] = useState(false);
  const [startingNumber, setStartingNumber] = useState<number>(1001);

  // Litho Specific fields
  const [frontInk, setFrontInk] = useState('4'); // 4-Color, 1-Color, etc.
  const [backInk, setBackInk] = useState('4'); // 4-Color, 0-Color (single-sided), etc.
  const [basePlateFee, setBasePlateFee] = useState<number>(150);
  const [parentSheetSize, setParentSheetSize] = useState('640x450mm');
  const [pressSpeed, setPressSpeed] = useState<number>(8000); // Impressions Per Hour (IPH)
  const [upPerSheet, setUpPerSheet] = useState<number>(8); // Nesting layout variable: how many up on a sheet
  const [sheetQuantity, setSheetQuantity] = useState<number>(500); // Standard starting sheet quantity
  const [basePrice, setBasePrice] = useState<number>(450); // Selling/Cost Base pricing

  // Inline Validation Error State
  const [errors, setErrors] = useState<ProductFormErrors>({});

  // Real-time inline validation logic
  const validateForm = (): boolean => {
    const tempErrors: ProductFormErrors = {};
    let isValid = true;

    // 1. Name constraint (Max 100 characters and non-empty)
    if (!name.trim()) {
      tempErrors.name = "Product name is required.";
      isValid = false;
    } else if (name.length > 100) {
      tempErrors.name = `Product SKU name exceeds 100 characters (Current: ${name.length}).`;
      isValid = false;
    }

    // 2. Pricing Validation: Cannot be negative
    if (basePrice < 0) {
      tempErrors.pricing = "Price cannot be a negative value.";
      isValid = false;
    }

    // 3. NCR starting number and sets validations
    if (category === 'NCR') {
      if (setsPerBook <= 0) {
        tempErrors.setsPerBook = "Sets per book must be a positive integer.";
        isValid = false;
      }
      if (partsCount < 2 || partsCount > 5) {
        tempErrors.partsCount = "Parts Count must be between 2 (Duplicate) and 5.";
        isValid = false;
      }
      if (sequentialNumbering && (!startingNumber || startingNumber < 0)) {
        tempErrors.startingNumber = "Starting receipt number cannot be negative.";
        isValid = false;
      }
    }

    // 4. Litho numeric validations: sheet quantity, run speed (pressSpeed), plate fee cannot be negative
    if (category === 'Litho') {
      if (sheetQuantity < 0) {
        tempErrors.sheetQuantity = "Sheet quantity cannot be negative.";
        isValid = false;
      }
      if (pressSpeed < 0) {
        tempErrors.runSpeed = "Press speed (IPH) cannot be negative.";
        isValid = false;
      }
      if (basePlateFee < 0) {
        tempErrors.basePlateFee = "Base plate fee cannot be negative.";
        isValid = false;
      }
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleInputChange = (field: string, val: any) => {
    // Clear specific error as user types
    if (errors[field as keyof ProductFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const payload = {
        name,
        description,
        category: category === 'NCR' ? 'NCR Books' : 'Litho Printing',
        basePrice,
        createdAt: Date.now(),
        // Category detailed specifications
        ...(category === 'NCR' ? {
          partsCount,
          setsPerBook,
          bindingType,
          sequentialNumbering,
          startingNumber: sequentialNumbering ? startingNumber : null,
        } : {
          frontInk,
          backInk,
          basePlateFee,
          parentSheetSize,
          pressSpeed,
          upPerSheet,
          sheetQuantity
        })
      };

      console.log('Publish-ready Product Data Normalized Payload:', payload);
      toast.success(`${payload.category} custom specifications validated and saved!`);
      if (onSuccess) {
        onSuccess(payload);
      }
    } else {
      toast.error("Please resolve the inline validation alerts in the specifications sheet.");
    }
  };

  return (
    <div id="dynamic-product-form-container" className="w-full max-w-4xl mx-auto bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-12 relative">
      {/* Decorative Brand Accent Overlay */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-gray-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-accent/5 text-brand text-[10px] font-black uppercase tracking-widest rounded-lg mb-3">
            <Sparkles size={11} className="text-brand-accent" />
            Sign & Print ERP Engine
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
            Product Specification Lab
          </h2>
          <p className="text-xs text-text-light font-bold mt-2">
            Configure carbonless copies or heavy litho press operations with active validation
          </p>
        </div>

        {/* Global Category Selector */}
        <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner w-full md:w-auto">
          <button
            type="button"
            id="category-selector-ncr"
            onClick={() => {
              setCategory('NCR');
              setErrors({});
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              category === 'NCR' 
                ? 'bg-white text-blue-600 shadow-md border border-gray-100' 
                : 'text-text-light hover:text-text-main'
            }`}
          >
            <BookOpen size={14} strokeWidth={2.5} />
            NCR Books
          </button>
          
          <button
            type="button"
            id="category-selector-litho"
            onClick={() => {
              setCategory('Litho');
              setErrors({});
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              category === 'Litho' 
                ? 'bg-white text-indigo-600 shadow-md border border-gray-100' 
                : 'text-text-light hover:text-text-main'
            }`}
          >
            <Printer size={14} strokeWidth={2.5} />
            Litho Printing
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: Standard Shared Details */}
        <div className="p-6 sm:p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted border-b border-gray-100 pb-3 flex items-center gap-2">
            <FileText size={14} className="text-blue-500" />
            Shared SKUs & Base Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Product Name with Max 100 char limit */}
            <div>
              <label htmlFor="base-product-name" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Product Title / Unique SKU Name *
              </label>
              <input
                type="text"
                id="base-product-name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  handleInputChange('name', e.target.value);
                }}
                maxLength={200} // Over-capped to let custom Zod/JS alert test the limit beautifully
                className={`w-full px-5 py-4 bg-white border rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 transition-all ${
                  errors.name 
                    ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                    : 'border-gray-200 focus:ring-blue-100 focus:border-blue-500'
                }`}
                placeholder="PRO-LINE SERIES A4 COPIERS"
              />
              {/* Name Validation Error Message */}
              {errors.name ? (
                <div id="error-message-name" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                  <AlertCircle size={12} />
                  {errors.name}
                </div>
              ) : (
                <p className="text-[9px] text-text-muted mt-1.5 ml-1 font-medium">
                  {name.length}/100 max safe characters. Unique designation for estimates.
                </p>
              )}
            </div>

            {/* Base Price Variable (Pricing must not be negative) */}
            <div>
              <label htmlFor="base-pricing-value" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Base Commercial Price (ZAR) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-text-light">
                  R
                </span>
                <input
                  type="number"
                  id="base-pricing-value"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setBasePrice(val);
                    handleInputChange('pricing', val);
                  }}
                  className={`w-full pl-10 pr-5 py-4 bg-white border rounded-2xl font-bold text-sm tracking-tight focus:outline-none focus:ring-4 transition-all ${
                    errors.pricing 
                      ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                      : 'border-gray-200 focus:ring-blue-100 focus:border-blue-500'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.pricing && (
                <div id="error-message-pricing" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                  <AlertCircle size={12} />
                  {errors.pricing}
                </div>
              )}
            </div>

            {/* General SKU Description */}
            <div className="col-span-full">
              <label htmlFor="product-skus-description" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                Description / Internal Manufacturing Checklist
              </label>
              <textarea
                id="product-skus-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all h-24"
                placeholder="Add special paper stocks, carbon copy sequence rules, bind positions or plate density adjustments."
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Dynamic Specialized Sub-Forms */}
        <AnimatePresence mode="wait">
          {category === 'NCR' ? (
            <motion.div
              key="ncr-subform"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="p-6 sm:p-8 rounded-3xl border border-blue-100/50 bg-blue-50/10 flex flex-col gap-6"
            >
              {/* Header Badge */}
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-800 border-b border-blue-100/40 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-500" />
                  NCR Book-binding Configurations
                </span>
                <span className="text-[9px] font-black tracking-widest bg-blue-100/60 px-2 py-0.5 rounded text-blue-700">Carbonless Specs</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Parts Count */}
                <div>
                  <label htmlFor="ncr-parts-count" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Parts Count *
                  </label>
                  <select
                    id="ncr-parts-count"
                    value={partsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 2;
                      setPartsCount(val);
                      handleInputChange('partsCount', val);
                    }}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value={2}>Duplicate (2 Parts)</option>
                    <option value={3}>Triplicate (3 Parts)</option>
                    <option value={4}>Quadruplicate (4 Parts)</option>
                    <option value={5}>Quintuplicate (5 Parts)</option>
                  </select>
                </div>

                {/* 2. Sets Per Book */}
                <div>
                  <label htmlFor="ncr-sets-limit" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Sets Per Book *
                  </label>
                  <input
                    type="number"
                    id="ncr-sets-limit"
                    required
                    value={setsPerBook}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSetsPerBook(val);
                      handleInputChange('setsPerBook', val);
                    }}
                    className={`w-full px-5 py-4 bg-white border rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 transition-all ${
                      errors.setsPerBook 
                        ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                        : 'border-gray-200 focus:ring-blue-100 focus:border-blue-500'
                    }`}
                  />
                  {errors.setsPerBook && (
                    <div id="error-message-sets-per-book" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                      <AlertCircle size={12} />
                      {errors.setsPerBook}
                    </div>
                  )}
                </div>

                {/* 3. Binding Type */}
                <div>
                  <label htmlFor="ncr-binding-type" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Binding Configuration *
                  </label>
                  <select
                    id="ncr-binding-type"
                    value={bindingType}
                    onChange={(e) => setBindingType(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  >
                    <option value="Padded / Glued">Padded / Glued (Tear-away)</option>
                    <option value="Perforated & Wirebound">Perforated & Wirebound (Coiled)</option>
                    <option value="Quarterbound Book">Quarterbound Book (Spine Stitching)</option>
                  </select>
                </div>

                {/* 4. Sequential Numbering Toggle */}
                <div className="col-span-full pt-4 border-t border-blue-500/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100/50">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-white border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Hash size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="block text-xs font-black uppercase text-blue-900 tracking-tight">
                          Active Sequential Numbering
                        </span>
                        <span className="text-[10px] font-bold text-text-light">
                          Apply consecutive receipts/invoice tracking codes per carbon set
                        </span>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      type="button"
                      id="ncr-numbering-toggle"
                      onClick={() => setSequentialNumbering(!sequentialNumbering)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        sequentialNumbering ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          sequentialNumbering ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 5. Starting Number field (Smoothly appears with AnimatePresence) */}
                  <AnimatePresence>
                    {sequentialNumbering && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white p-5 rounded-2xl border border-blue-100/40 grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                          <div>
                            <label htmlFor="ncr-starting-index" className="block text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-2 ml-1">
                              Starting Serial Number *
                            </label>
                            <input
                              type="number"
                              id="ncr-starting-index"
                              required={sequentialNumbering}
                              value={startingNumber}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setStartingNumber(val);
                                handleInputChange('startingNumber', val);
                              }}
                              className={`w-full px-5 py-4 bg-gray-50 border rounded-xl font-black text-sm focus:outline-none focus:ring-4 transition-all ${
                                errors.startingNumber 
                                  ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                                  : 'border-blue-100 focus:ring-blue-500/15 focus:border-blue-500'
                              }`}
                            />
                            {errors.startingNumber && (
                              <div id="error-message-starting-number" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                                <AlertCircle size={12} />
                                {errors.startingNumber}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center bg-gray-50/50 p-4 rounded-xl text-[10px] font-bold text-text-light leading-relaxed">
                            Starting prefix codes will generate incrementally (e.g. {startingNumber}, {startingNumber + 1}, {startingNumber + 2}...). Ensure client registration boundaries matches print history.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="litho-subform"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="p-6 sm:p-8 rounded-3xl border border-indigo-100/50 bg-indigo-50/10 flex flex-col gap-6"
            >
              {/* Header Badge */}
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-800 border-b border-indigo-100/40 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer size={14} className="text-indigo-500" />
                  Heavy Impression Lithographic Press Operations
                </span>
                <span className="text-[9px] font-black tracking-widest bg-indigo-100/60 px-2 py-0.5 rounded text-indigo-700">Offset Specs</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Ink configuration front */}
                <div>
                  <label htmlFor="litho-color-front" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Front Ink Configuration *
                  </label>
                  <select
                    id="litho-color-front"
                    value={frontInk}
                    onChange={(e) => setFrontInk(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    <option value="4">4 Colors (CMYK Process)</option>
                    <option value="1">1 Color (Spot/Pantone)</option>
                    <option value="2">2 Colors (Spot/Duotone)</option>
                    <option value="0">0 Colors (Blank)</option>
                  </select>
                </div>

                {/* 2. Ink configuration back */}
                <div>
                  <label htmlFor="litho-color-back" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Back Ink Configuration *
                  </label>
                  <select
                    id="litho-color-back"
                    value={backInk}
                    onChange={(e) => setBackInk(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    <option value="4">4 Colors (CMYK Process)</option>
                    <option value="1">1 Color (Spot/Pantone)</option>
                    <option value="2">2 Colors (Spot/Duotone)</option>
                    <option value="0">0 Colors (Blank/Single-sided)</option>
                  </select>
                </div>

                {/* 3. Base Plate Fee */}
                <div>
                  <label htmlFor="litho-plate-fee" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Base Plate Fee (ZAR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-light">
                      R
                    </span>
                    <input
                      type="number"
                      id="litho-plate-fee"
                      required
                      value={basePlateFee}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBasePlateFee(val);
                        handleInputChange('basePlateFee', val);
                      }}
                      className={`w-full pl-9 pr-4 py-4 bg-white border rounded-2xl font-black text-sm text-gray-800 focus:outline-none focus:ring-4 transition-all ${
                        errors.basePlateFee 
                          ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                          : 'border-gray-200 focus:ring-indigo-100'
                      }`}
                    />
                  </div>
                  {errors.basePlateFee && (
                    <div id="error-message-base-plate-fee" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                      <AlertCircle size={12} />
                      {errors.basePlateFee}
                    </div>
                  )}
                </div>

                {/* 4. Parent Sheet Size */}
                <div>
                  <label htmlFor="litho-parent-dimensions" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Parent Sheet Size *
                  </label>
                  <input
                    type="text"
                    id="litho-parent-dimensions"
                    required
                    value={parentSheetSize}
                    onChange={(e) => setParentSheetSize(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                    placeholder="640 x 450mm"
                  />
                </div>

                {/* 5. Impressions Per Hour (Press speed) can't be negative */}
                <div>
                  <label htmlFor="litho-press-speed" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Press Speed (IPH) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="litho-press-speed"
                      required
                      value={pressSpeed}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPressSpeed(val);
                        handleInputChange('runSpeed', val);
                      }}
                      className={`w-full pr-14 pl-5 py-4 bg-white border rounded-2xl font-black text-sm focus:outline-none focus:ring-4 transition-all ${
                        errors.runSpeed 
                          ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                          : 'border-gray-200 focus:ring-indigo-100'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-text-light uppercase tracking-wider">
                      imp/hr
                    </span>
                  </div>
                  {errors.runSpeed && (
                    <div id="error-message-run-speed" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                      <AlertCircle size={12} />
                      {errors.runSpeed}
                    </div>
                  )}
                </div>

                {/* 6. Up per Sheet */}
                <div>
                  <label htmlFor="litho-up-count" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                    Nesting Variables (Up-Per-Sheet) *
                  </label>
                  <input
                    type="number"
                    id="litho-up-count"
                    required
                    value={upPerSheet}
                    onChange={(e) => setUpPerSheet(parseInt(e.target.value) || 1)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl font-black text-sm focus:outline-none-ring focus:ring-4 focus:ring-indigo-150"
                  />
                </div>

                {/* 7. Sheet Quantity cannot be negative */}
                <div className="col-span-full pt-4 border-t border-indigo-500/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="litho-sheet-count" className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2 ml-1">
                      Committed Sheet Stock Quantity *
                    </label>
                    <input
                      type="number"
                      id="litho-sheet-count"
                      required
                      value={sheetQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSheetQuantity(val);
                        handleInputChange('sheetQuantity', val);
                      }}
                      className={`w-full px-5 py-4 bg-white border rounded-2xl font-black text-sm focus:outline-none focus:ring-4 transition-all ${
                        errors.sheetQuantity 
                          ? 'border-red-500 focus:ring-red-100 focus:border-red-500 text-red-900' 
                          : 'border-gray-200 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.sheetQuantity && (
                      <div id="error-message-sheet-quantity" className="flex items-center gap-1 text-red-600 text-[10px] font-bold mt-2 ml-1">
                        <AlertCircle size={12} />
                        {errors.sheetQuantity}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center bg-indigo-50/50 p-4 rounded-2xl text-[10px] font-bold text-text-light leading-relaxed border border-indigo-100/30">
                    Defines physical sheet volume requirements. The nesting engine auto-divides overall run counts using this variable to generate correct material pricing.
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              id="dynamic-form-cancel"
              onClick={onCancel}
              className="flex-1 px-8 py-4 bg-gray-50 hover:bg-gray-100 text-text-muted font-bold text-[10px] uppercase tracking-widest rounded-2xl border border-gray-200/50 transition-all"
            >
              Cancel Setup
            </button>
          )}
          <button
            type="submit"
            id="dynamic-form-submit"
            className="flex-1 px-8 py-4 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            {category === 'NCR' ? (
              <CheckCircle2 size={16} strokeWidth={2.5} className="text-emerald-400" />
            ) : (
              <Printer size={16} strokeWidth={2.5} className="text-indigo-400" />
            )}
            Build Custom Product specifications
          </button>
        </div>

      </form>
    </div>
  );
}
