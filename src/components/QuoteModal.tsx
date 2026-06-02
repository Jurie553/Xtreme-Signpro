import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Download, Printer, Mail, MessageCircle, Briefcase, ChevronRight, Info, TrendingUp, CheckCircle2, Tag, Sparkles, BookOpen } from 'lucide-react';
import { Quote, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, CompanySettings, Job, LithoProduct, ProductCategory } from '../types';
import { createDocument, updateDocument, useCollection, getNextSequence } from '../lib/firestoreService';
import { calculateQuoteTotals, DEFAULT_PRICING_SETTINGS, getActivePricingSettings } from '../lib/pricingService';
import { cn, sqMmToSqM } from '../lib/utils';
import { generateQuotePDF } from '../lib/pdfService';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Award, Tent, Flag, Sliders, Check, Search } from 'lucide-react';

const CategoryIcon = ({ name, size = 16, className = "" }: { name?: string; size?: number; className?: string }) => {
  const map: Record<string, React.ComponentType<any>> = {
    Printer: Printer,
    Book: Book,
    Award: Award,
    Tent: Tent,
    Flag: Flag,
    Layers: Layers,
    Tag: Tag,
    Sparkles: Sparkles,
    Box: Box,
    Sliders: Sliders,
    Briefcase: Briefcase,
    BookOpen: BookOpen
  };
  const IconComponent = (name && map[name]) || Tag;
  return <IconComponent size={size} className={className} />;
};

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote | null;
  prefilledItem?: { type: string; originId: string; quantity: number } | null;
  initialClientId?: string | null;
}

export default function QuoteModal({ isOpen, onClose, quote, prefilledItem, initialClientId }: QuoteModalProps) {
  const { data: clients } = useCollection<Client>('clients');
  const { data: dbCategories, loading: catLoading } = useCollection<ProductCategory>('product_categories');
  const { data: products } = useCollection<Product>('products');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: ncrBooks } = useCollection<NCRBook>('ncr_books');
  const { data: packages } = useCollection<Package>('packages');
  const { data: lithoProducts } = useCollection<LithoProduct>('litho_products');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  const { data: companySettingsList } = useCollection<CompanySettings>('company_settings');
  const { data: jobs } = useCollection<Job>('jobs');
  
  const settings = getActivePricingSettings(settingsList);
  const company = companySettingsList[0];

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [openSelectorIdx, setOpenSelectorIdx] = useState<number | null>(null);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectedSelectorGroup, setSelectedSelectorGroup] = useState<string>('All');

  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('erp_quotes_recent_products');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const addToRecent = (productId: string) => {
    setRecentlyUsed(prev => {
      const next = [productId, ...prev.filter(id => id !== productId)].slice(0, 5);
      localStorage.setItem('erp_quotes_recent_products', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    console.log(`[Developer Diagnostics] Quote builder loaded ${dbCategories.length} product categories, ${products.length} products.`);
    if (dbCategories.length === 0 && !catLoading) {
      console.warn(`[Developer Diagnostics] Warning: Quote builder received 0 active categories.`);
    }
  }, [dbCategories, products, catLoading]);

  const [formData, setFormData] = useState<Partial<Quote>>({
    quoteNumber: 'Auto-generating...',
    clientId: initialClientId || '',
    items: [],
    isExpress: false,
    notes: '',
    status: 'Draft',
    createdAt: Date.now(),
    expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);

  useEffect(() => {
    if (quote) {
      console.log('QuoteModal: Loading existing quote:', quote);
      setFormData(quote);
      setItems(quote.items);
    } else {
      console.log('QuoteModal: Creating new quote');
      setFormData({
        quoteNumber: 'Auto-generating...',
        clientId: initialClientId || '',
        items: [],
        isExpress: false,
        status: 'Draft',
        createdAt: Date.now(),
        expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
      });
      
      if (prefilledItem) {
        // ... (truncated)
      } else {
        setItems([]);
      }
    }
  }, [quote, isOpen, prefilledItem]);

  // Helper functions for item management
  const addItem = () => {
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'Product',
      originId: '',
      description: '', 
      quantity: 1, 
      unitCost: 0, 
      totalPrice: 0, 
      totalCost: 0,
      width: 0,
      length: 0,
      productId: '',
      materialId: '',
      machineId: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    
    let materialId = updates.materialId ?? currentItem.materialId;
    let machineId = updates.machineId ?? currentItem.machineId;
    let unitCost = updates.unitCost ?? currentItem.unitCost;
    let description = updates.description ?? currentItem.description;
    let type = updates.type ?? currentItem.type;
    let originId = updates.originId ?? currentItem.originId;

    // Reset originId if type changes
    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
      updates.description = '';
      updates.unitCost = 0;
      updates.machineId = '';
    }

    // Logic based on type and originId
    if (updates.originId && (updates.originId !== currentItem.originId || updates.type !== currentItem.type)) {
      if (type === 'Product') {
        const product = products.find(p => p.id === updates.originId);
        if (product) {
          materialId = product.defaultMaterialId;
          machineId = product.defaultMachineId;
          description = product.name;
          const material = materials.find(m => m.id === materialId);
          if (material) unitCost = material.costPrice;
          
          // Centralized categories mappings
          const matchedCategory = dbCategories.find(c => c.name === product.categoryName || c.name === product.category);
          updates.productId = product.id;
          updates.productName = product.name;
          updates.categoryId = matchedCategory?.id || product.categoryId || '';
          updates.categoryName = matchedCategory?.name || product.categoryName || product.category || 'Large Format Print';
          updates.productType = matchedCategory?.type || 'Product';
          updates.specsSnapshot = product.specs || {};
          updates.costingSnapshot = {
            setupTime: product.setupTime,
            markupPercent: product.markupPercent,
            costingMethod: product.costingMethod
          };
          
          if (!updates.categoryId) {
            console.warn(`[Developer Diagnostics] Product with name '${product.name}' has no categoryId assigned.`);
          }
        }
      } else if (type === 'Material') {
        const material = materials.find(m => m.id === updates.originId);
        if (material) {
          description = material.name;
          unitCost = material.costPrice;
          materialId = material.id;
          machineId = '';
          
          const matchedCategory = dbCategories.find(c => c.name === 'Materials' || c.slug === 'materials');
          updates.productId = material.id;
          updates.productName = material.name;
          updates.categoryId = matchedCategory?.id || '';
          updates.categoryName = matchedCategory?.name || 'Materials';
          updates.productType = 'Product';
          updates.specsSnapshot = {};
          updates.costingSnapshot = {};
        }
      } else if (type === 'NCR') {
        const ncr = ncrBooks.find(b => b.id === updates.originId);
        if (ncr) {
          description = ncr.name;
          unitCost = ncr.pricingGrid?.[0]?.sell || 0;
          machineId = '';
          
          const matchedCategory = dbCategories.find(c => c.slug === 'ncr-books' || c.name === 'NCR Books');
          updates.productId = ncr.id;
          updates.productName = ncr.name;
          updates.categoryId = matchedCategory?.id || '';
          updates.categoryName = matchedCategory?.name || 'NCR Books';
          updates.productType = 'NCR';
          updates.specsSnapshot = {
            parts: 'Duplicate',
            printingColor: 'Full Color Flat',
            setsPerBook: 50
          };
          updates.costingSnapshot = {
            hasGrid: true
          };
        }
      } else if (type === 'Package') {
        const pkg = packages.find(p => p.id === updates.originId);
        if (pkg) {
          description = pkg.name;
          unitCost = pkg.packagePrice;
          machineId = '';
          
          const matchedCategory = dbCategories.find(c => c.name === 'General Products' || c.slug === 'general-products');
          updates.productId = pkg.id;
          updates.productName = pkg.name;
          updates.categoryId = matchedCategory?.id || '';
          updates.categoryName = matchedCategory?.name || 'General Products';
          updates.productType = 'Product';
          updates.specsSnapshot = {};
          updates.costingSnapshot = {};
        }
      } else if (type === 'Litho') {
        const litho = lithoProducts.find(p => p.id === updates.originId);
        if (litho) {
          description = litho.name;
          unitCost = litho.pricingGrid?.[0]?.sell || 0;
          machineId = '';
          
          const matchedCategory = dbCategories.find(c => c.slug === 'litho-printing' || c.name === 'Litho Printing');
          updates.productId = litho.id;
          updates.productName = litho.name;
          updates.categoryId = matchedCategory?.id || '';
          updates.categoryName = matchedCategory?.name || 'Litho Printing';
          updates.productType = 'Litho';
          updates.specsSnapshot = {
            finishedSize: 'A4',
            paperGsm: '135',
            sidesPrinted: 'Double Sided'
          };
          updates.costingSnapshot = {
            hasGrid: true
          };
        }
      }
      updates.description = description;
      updates.unitCost = unitCost;
      updates.materialId = materialId;
      updates.machineId = machineId;
    }

    // If material changed (only relevant for Product type usually)
    if (updates.materialId && updates.materialId !== currentItem.materialId && type === 'Product') {
      const material = materials.find(m => m.id === updates.materialId);
      if (material) unitCost = material.costPrice;
      updates.unitCost = unitCost;
    }

    newItems[index] = { ...newItems[index], ...updates };
    const item = newItems[index];

    const product = products.find(p => p.id === item.originId);
    const material = materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId));
    const isArea = (item.type === 'Product' && product?.costingMethod === 'Area') || 
                   (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));

    // Recalculate totals
    const q = item.quantity ?? 1;
    const w = item.width ?? 0;
    const l = item.length ?? 0;
    const u = item.unitCost ?? 0;

    const materialMarkup = 1 + ((settings.materialMarkupPercent ?? 40) / 100);
    const productMarkup = 1 + ((product?.markupPercent ?? 40) / 100);
    const activeMarkup = item.type === 'Material' ? materialMarkup : productMarkup;

    let computedPrice = 0;
    let computedCost = 0;

    if (item.type === 'Product') {
      const machine = machines.find(m => m.id === (item.machineId || product?.defaultMachineId));
      const matCost = material?.costPrice || u;
      let machineCost = 0;

      if (machine) {
        if (machine.costUnit === 'm²') {
          machineCost = sqMmToSqM(w * l) * (machine.hourlyRate || 0) * q;
        } else if (machine.costUnit === 'page' || machine.costUnit === 'copy') {
          machineCost = q * (machine.hourlyRate || 0);
        } else if (machine.costUnit === 'hr') {
          machineCost = ((product?.setupTime || 0) / 60) * (machine.hourlyRate || 0);
        } else {
          machineCost = q * (machine.hourlyRate || 0);
        }
      }

      if (isArea) {
        computedCost = (sqMmToSqM(w * l) * matCost * q) + machineCost;
        computedPrice = computedCost * activeMarkup;
      } else {
        computedCost = (matCost * q) + machineCost;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'NCR') {
      const ncr = ncrBooks.find(b => b.id === item.originId);
      if (ncr && ncr.pricingGrid) {
        const matchingTier = [...ncr.pricingGrid].sort((a,b) => b.quantity - a.quantity).find(t => q >= t.quantity);
        const tierPrice = matchingTier ? matchingTier.sell : (ncr.pricingGrid[0]?.sell || 0);
        computedPrice = tierPrice * q;
        computedCost = computedPrice / activeMarkup;
        item.unitCost = computedCost / q;
      } else {
        computedCost = q * u;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'Package') {
      const pkg = packages.find(p => p.id === item.originId);
      const pkgPrice = pkg?.packagePrice || u * activeMarkup;
      computedPrice = pkgPrice * q;
      computedCost = computedPrice / activeMarkup;
      item.unitCost = computedCost / q;
    } else if (item.type === 'Litho') {
      const litho = lithoProducts.find(p => p.id === item.originId);
      if (litho && litho.pricingGrid) {
        const matchingTier = [...litho.pricingGrid].sort((a,b) => b.quantity - a.quantity).find(t => q >= t.quantity);
        const tierPrice = matchingTier ? matchingTier.sell : (litho.pricingGrid[0]?.sell || 0);
        computedPrice = tierPrice; 
        computedCost = computedPrice / activeMarkup;
        item.unitCost = computedCost / q;
      } else {
        computedCost = q * u;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'Material' && isArea) {
      computedCost = q * sqMmToSqM(w * l) * u;
      const sellPrice = (material && typeof material.sellPerSqm === 'number' && material.sellPerSqm > 0) ? material.sellPerSqm : (u * materialMarkup);
      computedPrice = q * sqMmToSqM(w * l) * sellPrice;
    } else {
      computedCost = q * u;
      const sellPrice = (material && typeof material.sellPerSqm === 'number' && material.sellPerSqm > 0) ? material.sellPerSqm : (u * materialMarkup);
      computedPrice = q * sellPrice;
    }

    if ('basePrice' in updates) {
      item.basePrice = updates.basePrice!;
      item.totalCost = item.basePrice / activeMarkup;
    } else if (!('discountValue' in updates || 'discountType' in updates)) {
      const isPricingFieldChanged = 
        ('quantity' in updates && updates.quantity !== currentItem.quantity) ||
        ('originId' in updates && updates.originId !== currentItem.originId) ||
        ('type' in updates && updates.type !== currentItem.type) ||
        ('width' in updates && updates.width !== currentItem.width) ||
        ('length' in updates && updates.length !== currentItem.length) ||
        ('materialId' in updates && updates.materialId !== currentItem.materialId) ||
        ('machineId' in updates && updates.machineId !== currentItem.machineId);

      if (isPricingFieldChanged || currentItem.basePrice === undefined) {
        item.basePrice = computedPrice;
        item.totalCost = computedCost;
      } else {
        item.basePrice = currentItem.basePrice;
        item.totalCost = currentItem.totalCost ?? (currentItem.basePrice / activeMarkup);
      }
    }
    
    if ('totalPrice' in updates && !('basePrice' in updates)) {
      item.basePrice = updates.totalPrice!;
      item.totalCost = item.basePrice / activeMarkup;
    }

    if (item.basePrice === undefined) {
      item.basePrice = item.totalPrice ?? computedPrice;
    }

    let discountAmount = 0;
    const base = item.basePrice;
    if (item.discountValue) {
      if (item.discountType === 'amount') {
        discountAmount = item.discountValue;
      } else {
        discountAmount = base * (item.discountValue / 100);
      }
    }
    
    item.totalPrice = Math.max(0, base - discountAmount);
    
    setItems(newItems);
  };

  const totals = calculateQuoteTotals(items as any, formData.isExpress || false, settings);

  const handleDownloadPDF = async () => {
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalQuote = { ...formData, items, ...totals } as Quote;
      const doc = generateQuotePDF(finalQuote, client, company);
      doc.save(`Quote_${formData.quoteNumber}.pdf`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPDF = async () => {
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalQuote = { ...formData, items, ...totals } as Quote;
      const doc = generateQuotePDF(finalQuote, client, company);
      const blob = doc.output('blob');
      const blobURL = URL.createObjectURL(blob);
      const win = window.open(blobURL, '_blank');
      if (!win) {
        toast.error('Popup blocked. Please allow popups to print/preview.');
      }
    } catch (err: any) {
      console.error('Quote Print Error:', err);
      toast.error(`Print failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailPDF = async () => {
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        const finalQuote = { ...formData, items, ...totals } as Quote;
        await shareViaEmail('quote', finalQuote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleWhatsAppShare = async () => {
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        const finalQuote = { ...formData, items, ...totals } as Quote;
        await shareViaWhatsApp('quote', finalQuote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleConvertToJob = async () => {
    if (!quote?.id) return;
    
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const clientName = client ? (client.companyName || client.name) : 'Unknown Client';
      const productsSummary = items.map(item => item.description).join(', ') || 'Custom Production';
      
      const year = new Date().getFullYear();
      const sequence = await getNextSequence(`jobs_${year}`);
      if (sequence === null) throw new Error("Failed to generate sequence");
      
      const prefix = company?.jobCardPrefix || 'Jobcard';
      const jobNumber = `${prefix}-${year}-${sequence.toString()}`;
      
      const jobData: Omit<Job, 'id'> = {
        jobNumber,
        quoteId: quote.id,
        clientId: formData.clientId || '',
        clientName,
        productName: productsSummary,
        stage: 'Prepress',
        priority: 'Normal',
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // Default 1 week
        artworkStatus: 'Pending',
        artworkDeadline: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days for artwork approval
        items: items as QuoteItem[],
        total: totals.total,
        profit: totals.profit || 0,
        createdAt: Date.now(),
      };
      
      await createDocument('jobs', jobData);
      
      if (quote.status !== 'Accepted') {
        await updateDocument('quotes', quote.id, { status: 'Accepted' });
      }
      
      toast.success(`Production Job ${jobNumber} created successfully.`);
      onClose();
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    console.log('Button Click: Finalize Quote', { isEdit: !!quote?.id, formData });
    if (!formData.clientId) {
      toast.error('Please select a client before saving the quote.');
      return;
    }
    if (!items || items.length === 0) {
      toast.error('Please add at least one quote line item before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const finalData: Partial<Quote> = {
        ...formData,
        items: items as QuoteItem[],
        ...totals
      };

      if (quote?.id) {
        console.log('Updating existing quote:', quote.id, 'with data:', finalData);
        await updateDocument('quotes', quote.id, finalData);
      } else {
        const year = new Date().getFullYear();
        const sequence = await getNextSequence(`quotes_${year}`);
        if (!sequence) throw new Error("Failed to generate quote number sequence");
        
        finalData.quoteNumber = `Quote-${year}-${(sequence || 1).toString().padStart(3, '0')}`;
        console.log('Creating new quote with number:', finalData.quoteNumber);
        
        // Ensure state is updated with the real number immediately
        setFormData(prev => ({ ...prev, quoteNumber: finalData.quoteNumber }));
        
        const newDocId = await createDocument('quotes', finalData as any);
        if (!newDocId) throw new Error("Failed to create quote document in Firestore");
        setFormData({ ...finalData, id: newDocId });
      }
      setShowSuccess(true);
      toast.success('Quote saved successfully.');
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Could not save. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getItemTypeIcon = (type: QuoteItem['type']) => {
    switch (type) {
      case 'Product': return <Box size={14} />;
      case 'Material': return <Layers size={14} />;
      case 'NCR': return <Book size={14} />;
      case 'Package': return <PackageIcon size={14} />;
      case 'Litho': return <Printer size={14} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/40 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-7xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20 printable-content"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-border/50 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-20 no-print">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-main tracking-tighter uppercase italic">{quote ? 'Adjust Quote' : 'New Quote System'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-accent px-2 py-0.5 bg-blue-50 rounded-lg tabular-nums uppercase tracking-widest">{formData.quoteNumber}</span>
                <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest">•</span>
                <span className="text-[10px] font-bold text-text-light/60 uppercase tracking-widest italic">Inversion v2.4</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quote && (
              <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-2xl border border-border/50">
                <button 
                  onClick={handleDownloadPDF}
                  title="Download PDF"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={handlePrintPDF}
                  title="Print"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Printer size={18} />
                </button>
                <div className="w-px h-6 bg-border/50 mx-1" />
                <button 
                  onClick={handleEmailPDF}
                  title="Email"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Mail size={18} />
                </button>
                <button 
                  onClick={handleWhatsAppShare}
                  title="WhatsApp"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all group active:scale-95">
              <X size={20} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-10 py-10 space-y-12">
            {/* Client and Config Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Entity Identity</label>
                  {formData.clientId && (
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <ChevronRight size={10} strokeWidth={3} /> Verified Account
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Box className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-all" size={18} />
                  <select 
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full pl-14 pr-6 py-4.5 bg-paper border border-border/80 rounded-2xl text-sm font-black uppercase tracking-tight focus:outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand/40 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Select Target Client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Priority Matrix</label>
                  <button 
                    onClick={() => setFormData({ ...formData, isExpress: !formData.isExpress })}
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4.5 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest",
                      formData.isExpress 
                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                        : "bg-paper border-border text-text-muted hover:border-amber-200"
                    )}
                  >
                    <span>Express SLA</span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      formData.isExpress ? "border-amber-500 bg-amber-500" : "border-border"
                    )}>
                      {formData.isExpress && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Current State</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-6 py-4.5 bg-paper border border-border/80 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand/40 transition-all shadow-sm"
                  >
                    <option value="Draft">Draft Mode</option>
                    <option value="Sent">Sent to Client</option>
                    <option value="Accepted">Accepted Order</option>
                    <option value="Rejected">Voided/Rejected</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Items Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-text-main uppercase tracking-[0.1em] italic">Product Inventory Items</h3>
                  <span className="px-2 py-0.5 bg-surface text-[9px] font-black text-text-light rounded-lg border border-border/50 tabular-nums uppercase tracking-widest">{items.length} units listed</span>
                </div>
                <button 
                  onClick={addItem} 
                  className="flex items-center gap-2 px-6 py-3.5 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
                >
                  <Plus size={16} strokeWidth={3} />
                  Add New Line Item
                </button>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="group relative bg-surface/50 border border-border/60 hover:border-brand/30 rounded-3xl p-6 transition-all"
                    >
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all z-10"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Selector Column */}
                        <div className="lg:col-span-2 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Revenue Stream</label>
                          <select 
                            value={item.type || 'Product'}
                            onChange={(e) => updateItem(idx, { type: e.target.value as any, originId: '' })}
                            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-brand/5"
                          >
                            <option value="Product">Product</option>
                            <option value="Material">Material</option>
                            <option value="NCR">NCR Book</option>
                            <option value="Litho">Litho Print</option>
                            <option value="Package">Standard Pkg</option>
                          </select>
                        </div>

                        {/* Detail Column */}
                        <div className="lg:col-span-3 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Selection & Specifications</label>
                          
                          {(() => {
                            let selectedItemName = '';
                            if (item.originId) {
                              if (item.type === 'Product') selectedItemName = products.find(p => p.id === item.originId)?.name || '';
                              else if (item.type === 'Material') selectedItemName = materials.find(m => m.id === item.originId)?.name || '';
                              else if (item.type === 'NCR') selectedItemName = ncrBooks.find(b => b.id === item.originId)?.name || '';
                              else if (item.type === 'Litho') selectedItemName = lithoProducts.find(p => p.id === item.originId)?.name || '';
                              else if (item.type === 'Package') selectedItemName = packages.find(p => p.id === item.originId)?.name || '';
                            }
                            
                            const categoryGroup = (() => {
                              if (item.categoryName) return item.categoryName;
                              if (item.type === 'NCR') return 'NCR Books';
                              if (item.type === 'Litho') return 'Litho Printing';
                              if (item.type === 'Package') return 'General Products';
                              if (item.type === 'Material') return 'Materials';
                              if (item.type === 'Product') {
                                const p = products.find(p => p.id === item.originId);
                                if (p) return p.categoryName || p.category;
                              }
                              return '';
                            })();

                            return (
                              <div className="space-y-3">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenSelectorIdx(openSelectorIdx === idx ? null : idx);
                                      setSelectorSearch('');
                                      setSelectedSelectorGroup('All');
                                    }}
                                    className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-tight text-left text-brand flex justify-between items-center focus:ring-4 focus:ring-brand/5 shadow-sm"
                                  >
                                    <span className="truncate">
                                      {selectedItemName || "Choose Item & Category..."}
                                    </span>
                                    <ChevronRight size={14} className={cn("transition-transform text-slate-400 shrink-0 ml-2", openSelectorIdx === idx && "rotate-90")} />
                                  </button>

                                  {openSelectorIdx === idx && (
                                    <div className="absolute left-0 mt-2 w-[350px] bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                                      {/* Search box */}
                                      <div className="relative mb-3">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input 
                                          type="text"
                                          value={selectorSearch}
                                          onChange={(e) => setSelectorSearch(e.target.value)}
                                          placeholder="Search categories or items..."
                                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand"
                                        />
                                      </div>

                                      {/* Dynamic categories & product filtering groups */}
                                      <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1 text-left">
                                        {/* Section: Recently Used */}
                                        {recentlyUsed.length > 0 && !selectorSearch && (
                                          <div>
                                            <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1.5 px-1.5 flex items-center gap-1">
                                              <TrendingUp size={10} /> Recently Selected
                                            </div>
                                            <div className="space-y-1">
                                              {recentlyUsed.map(productId => {
                                                const p = products.find(prod => prod.id === productId);
                                                if (!p) return null;
                                                const cat = dbCategories.find(c => c.name === p.categoryName || c.name === p.category);
                                                return (
                                                  <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                      updateItem(idx, { type: 'Product', originId: p.id });
                                                      addToRecent(p.id);
                                                      setOpenSelectorIdx(null);
                                                    }}
                                                    className="w-full text-left text-xs px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-bold flex items-center justify-between"
                                                  >
                                                    <span className="truncate">{p.name}</span>
                                                    <span className="text-[8px] font-mono text-slate-400 truncate max-w-[100px]">{p.category}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {/* Section: Product Categories from unified database */}
                                        <div>
                                          <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1.5">
                                            {item.type === 'Material' ? 'Available Materials & Substrates' : 'Product Collections'}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            {item.type === 'Material' ? (
                                              <div className="col-span-2 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                                {materials
                                                  .filter(m => (m.name || '').toLowerCase().includes(selectorSearch.toLowerCase()) || (m.category || '').toLowerCase().includes(selectorSearch.toLowerCase()))
                                                  .map(m => (
                                                    <button
                                                      key={m.id}
                                                      type="button"
                                                      onClick={() => {
                                                        updateItem(idx, { type: 'Material', originId: m.id });
                                                        setOpenSelectorIdx(null);
                                                      }}
                                                      className="w-full text-left text-xs px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between transition-all"
                                                    >
                                                      <div className="truncate pr-2">
                                                        <p className="truncate text-[10px] font-black">{m.name}</p>
                                                        <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded block w-fit mt-0.5">{m.category || 'Substrate'}</span>
                                                      </div>
                                                      <div className="text-right shrink-0">
                                                        <span className="text-[9px] font-mono text-brand font-extrabold block">R{(m.costPrice || 0).toFixed(2)}</span>
                                                        <span className="text-[7px] text-slate-400 font-medium block">per {m.unit || 'unit'}</span>
                                                      </div>
                                                    </button>
                                                  ))}
                                                {materials.filter(m => (m.name || '').toLowerCase().includes(selectorSearch.toLowerCase()) || (m.category || '').toLowerCase().includes(selectorSearch.toLowerCase())).length === 0 && (
                                                  <span className="text-[9px] text-slate-400 italic block p-4 text-center">No materials found in registry</span>
                                                )}
                                              </div>
                                            ) : (
                                              <>
                                                {/* Custom Product Flat Option */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const customCat = dbCategories.find(c => c.slug === 'custom-products') || { id: 'custom', name: 'Custom Products', type: 'Product' };
                                                updateItem(idx, { 
                                                  type: 'Product', 
                                                  originId: 'custom', 
                                                  description: 'Custom Production Item', 
                                                  categoryId: customCat.id,
                                                  categoryName: customCat.name,
                                                  productType: 'Product',
                                                  specsSnapshot: {},
                                                  costingSnapshot: {}
                                                });
                                                setOpenSelectorIdx(null);
                                              }}
                                              className="text-left font-bold transition-all p-2 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/60 hover:border-emerald-300 rounded-xl flex flex-col gap-1 text-[10px]"
                                            >
                                              <div className="flex items-center gap-1 text-emerald-700">
                                                <Sliders size={12} />
                                                <span>Custom Entry</span>
                                              </div>
                                              <p className="text-[8px] text-emerald-600/80 font-medium leading-tight">Manual pricing spec model</p>
                                            </button>

                                            {/* Render dynamically loaded Categories */}
                                            {dbCategories.filter(c => c.active && c.slug !== 'custom-products').map(c => {
                                              let count = 0;
                                              if (c.type === 'NCR') count = ncrBooks.length;
                                              else if (c.type === 'Litho') count = lithoProducts.length;
                                              else count = products.filter(p => p.categoryName === c.name || p.category === c.name).length;

                                              return (
                                                <div key={c.id} className="border border-slate-100 hover:border-slate-200/80 rounded-xl p-2 bg-slate-50/30 hover:bg-slate-50 transition-all flex flex-col gap-1.5">
                                                  <div className="flex items-center gap-1.5 text-slate-700 font-black tracking-tight text-[10px] truncate">
                                                    <CategoryIcon name={c.icon} size={12} className="text-slate-500 shrink-0" />
                                                    <span className="truncate">{c.name}</span>
                                                  </div>
                                                  
                                                  <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                                                    {c.type === 'NCR' && ncrBooks.filter(item => item.name.toLowerCase().includes(selectorSearch.toLowerCase())).map(b => (
                                                      <button
                                                        key={b.id}
                                                        type="button"
                                                        onClick={() => {
                                                          updateItem(idx, { type: 'NCR', originId: b.id });
                                                          setOpenSelectorIdx(null);
                                                        }}
                                                        className="w-full text-left text-[9px] font-bold text-slate-600 hover:text-brand bg-white/70 hover:bg-white border border-slate-100 px-1.5 py-1 rounded-md block truncate animate-in duration-100"
                                                      >
                                                        {b.name}
                                                      </button>
                                                    ))}

                                                    {c.type === 'Litho' && lithoProducts.filter(item => item.name.toLowerCase().includes(selectorSearch.toLowerCase())).map(p => (
                                                      <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                          updateItem(idx, { type: 'Litho', originId: p.id });
                                                          setOpenSelectorIdx(null);
                                                        }}
                                                        className="w-full text-left text-[9px] font-bold text-slate-600 hover:text-brand bg-white/70 hover:bg-white border border-slate-100 px-1.5 py-1 rounded-md block truncate animate-in duration-100"
                                                      >
                                                        {p.name}
                                                      </button>
                                                    ))}

                                                    {c.type === 'Product' && products.filter(p => (p.categoryName === c.name || p.category === c.name) && p.name.toLowerCase().includes(selectorSearch.toLowerCase())).map(p => (
                                                      <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                          updateItem(idx, { type: 'Product', originId: p.id });
                                                          addToRecent(p.id);
                                                          setOpenSelectorIdx(null);
                                                        }}
                                                        className="w-full text-left text-[9px] font-bold text-slate-600 hover:text-brand bg-white/70 hover:bg-white border border-slate-100 px-1.5 py-1 rounded-md block truncate animate-in duration-100"
                                                      >
                                                        {p.name}
                                                      </button>
                                                    ))}

                                                    {count === 0 && (
                                                      <span className="text-[8px] text-slate-400 italic block px-1.5 py-1">No blueprints</span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {item.type === 'Product' && item.originId !== 'custom' && (
                                  <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                                    <select 
                                      value={item.materialId || ''}
                                      onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                                      className="w-full bg-surface border border-border/40 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-tight focus:ring-2 focus:ring-brand/10 outline-none transition-all"
                                    >
                                      <option value="">Substrate...</option>
                                      {materials.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                      ))}
                                    </select>
                                    <select 
                                      value={item.machineId || (products.find(p => p.id === item.originId)?.defaultMachineId) || ''}
                                      onChange={(e) => updateItem(idx, { machineId: e.target.value })}
                                      className="w-full bg-surface border border-border/40 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-tight focus:ring-2 focus:ring-brand/10 outline-none transition-all"
                                    >
                                      <option value="">Machine...</option>
                                      {machines.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Dynamic templates spec forms container */}
                                {categoryGroup === 'Litho Printing' && (
                                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-white border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200 slide-in-from-top-1">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Printer size={12} /> Litho Printing Specs
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Finished Size</label>
                                      <select 
                                        value={item.specsSnapshot?.finishedSize || 'A4'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), finishedSize: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="A6">A6 Size</option>
                                        <option value="A5">A5 Size</option>
                                        <option value="A4">A4 Size</option>
                                        <option value="A3">A3 Size</option>
                                        <option value="Custom">Custom Size</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Substrate Weight</label>
                                      <select 
                                        value={item.specsSnapshot?.paperGsm || '135'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), paperGsm: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="80">80 GSM BOND</option>
                                        <option value="115">115 GSM GLOSS</option>
                                        <option value="135">135 GSM GLOSS</option>
                                        <option value="250">250 GSM ART</option>
                                        <option value="350">350 GSM ART</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Sides Printed</label>
                                      <select 
                                        value={item.specsSnapshot?.sidesPrinted || 'Double Sided'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), sidesPrinted: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Single Sided">Single Sided</option>
                                        <option value="Double Sided">Double Sided</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Finishing/Lam</label>
                                      <select 
                                        value={item.specsSnapshot?.laminationType || 'None'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), laminationType: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="None">None</option>
                                        <option value="Gloss">Gloss</option>
                                        <option value="Matt">Matt</option>
                                        <option value="Soft Touch">Soft Touch</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {categoryGroup === 'NCR Books' && (
                                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-white border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200 slide-in-from-top-1">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Book size={12} /> NCR Specifications
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">NCR Sets</label>
                                      <select 
                                        value={item.specsSnapshot?.parts || 'Duplicate'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), parts: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Duplicate">Duplicate (2 Part)</option>
                                        <option value="Triplicate">Triplicate (3 Part)</option>
                                        <option value="Quadruplicate">Quadruplicate (4 Part)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Sets Per Book</label>
                                      <input 
                                        type="number" 
                                        value={item.specsSnapshot?.setsPerBook || 50}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), setsPerBook: Number(e.target.value) } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Start Sequence No</label>
                                      <input 
                                        type="text" 
                                        value={item.startNumber || ''}
                                        onChange={(e) => updateItem(idx, { startNumber: e.target.value })}
                                        placeholder="e.g. 0501"
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">End Sequence No</label>
                                      <input 
                                        type="text" 
                                        value={item.endNumber || ''}
                                        onChange={(e) => updateItem(idx, { endNumber: e.target.value })}
                                        placeholder="e.g. 1000"
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                {(categoryGroup === 'Exhibition Branding' || 
                                  categoryGroup === 'Gazebos' || 
                                  categoryGroup === 'Flags' || 
                                  categoryGroup === 'Pull-up Banners' || 
                                  categoryGroup === 'Pop-up Banners' || 
                                  categoryGroup === 'PVC Banners' || 
                                  categoryGroup === 'Fabric Backdrops' || 
                                  categoryGroup === 'Media Walls') && (
                                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-white border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200 slide-in-from-top-1">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Award size={12} /> Exhibition/Display Specifiers
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Frame mechanicals</label>
                                      <select 
                                        value={item.specsSnapshot?.frameGrade || 'Standard'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), frameGrade: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Budget-Light">Budget Light</option>
                                        <option value="Standard">Standard Steel Matte</option>
                                        <option value="Deluxe">Deluxe Hex Octagon</option>
                                        <option value="Executive">Executive Heavy Duty</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Substrate/Media</label>
                                      <select 
                                        value={item.specsSnapshot?.fabricType || '240g Polyester'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), fabricType: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="240g Polyester">240g Woven Canvas</option>
                                        <option value="PVC Vinyl">500g Smooth Flat Lay</option>
                                        <option value="Airtex Mesh">Airtex Breeze mesh</option>
                                        <option value="Polyester Satin">Polyester Satin Sheen</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Mounting Anchors</label>
                                      <select 
                                        value={item.specsSnapshot?.baseType || 'Spike'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), baseType: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Spike">Ground Spike hook</option>
                                        <option value="Cross Base">Cross base stand</option>
                                        <option value="Cross Base + Water Bag">Cross base with ring water bag</option>
                                        <option value="Executive Plate">Heavy solid core plate</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Usage Type</label>
                                      <select 
                                        value={item.specsSnapshot?.contractMode || 'Sale'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), contractMode: e.target.value } })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Sale">Direct purchase</option>
                                        <option value="Rental">Temporary Rental</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {categoryGroup === 'Custom Products' && (
                                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl text-[10px] text-left animate-in duration-200 slide-in-from-top-1">
                                    <div className="col-span-2 font-black uppercase text-emerald-800 text-[9px] flex items-center gap-1.5 border-b border-emerald-100 pb-1.5 mb-1.5">
                                      <Sliders size={12} className="text-emerald-600" /> Custom Flat Quote Adjustment
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-[8px] text-emerald-700 font-medium leading-relaxed">Allows manual quote entry without substrate presets. Adjust base unit cost directly to calculate values.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                          <input 
                            type="text" 
                            value={item.description || ''}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Custom adjustments or spec details..."
                            className="w-full bg-transparent border-none px-1 focus:ring-0 text-[10px] font-medium text-text-light placeholder:italic"
                          />
                          {item.type === 'NCR' && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <input 
                                value={item.perforationPosition || ''}
                                onChange={(e) => updateItem(idx, { perforationPosition: e.target.value })}
                                placeholder="Perf."
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                              <input 
                                value={item.bindingType || ''}
                                onChange={(e) => updateItem(idx, { bindingType: e.target.value })}
                                placeholder="Binding"
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                              <input 
                                value={item.bindingPosition || ''}
                                onChange={(e) => updateItem(idx, { bindingPosition: e.target.value })}
                                placeholder="Pos."
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                              <input 
                                value={item.firstPageColor || ''}
                                onChange={(e) => updateItem(idx, { firstPageColor: e.target.value })}
                                placeholder="1st Page"
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                              <input 
                                value={item.secondPageColor || ''}
                                onChange={(e) => updateItem(idx, { secondPageColor: e.target.value })}
                                placeholder="2nd Page"
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                              <input 
                                value={item.lastPageColor || ''}
                                onChange={(e) => updateItem(idx, { lastPageColor: e.target.value })}
                                placeholder="Last Page"
                                className="bg-white border border-border/50 rounded-lg px-2 py-1 text-[9px] font-bold"
                              />
                            </div>
                          )}
                        </div>

                        {/* Dynamics Column */}
                        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Logistics Qty</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={(item.quantity === null || item.quantity === undefined || isNaN(item.quantity)) ? '' : item.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm font-black tabular-nums focus:ring-4 focus:ring-brand/5"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-light/40 uppercase tracking-widest">Units</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Dimensions (mm)</label>
                            {((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                              (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) ? (
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                  onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                  placeholder="W"
                                  className="w-full bg-white border border-border/50 rounded-xl px-2.5 py-3 text-[11px] font-black tabular-nums focus:ring-4 focus:ring-brand/5 text-center"
                                />
                                <span className="text-[8px] font-black text-text-light opacity-30">×</span>
                                <input 
                                  type="number" 
                                  value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                  onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                  placeholder="L"
                                  className="w-full bg-white border border-border/50 rounded-xl px-2.5 py-3 text-[11px] font-black tabular-nums focus:ring-4 focus:ring-brand/5 text-center"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-[46px] rounded-xl border border-border/30 flex items-center justify-center text-[8px] font-black text-text-light/40 uppercase tracking-[0.2em] italic">Fixed Sizing</div>
                            )}
                          </div>
                        </div>

                        {/* Revenue Calculation Column */}
                        <div className="lg:col-span-3 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60 text-right">Revenue Calculation</label>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2 group/rate">
                              <span className="text-[10px] font-bold text-text-light">R</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                       (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) 
                                        ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1) > 0 ? ((item.basePrice || item.totalPrice || 0) / (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1))) : 0)
                                        : (item.quantity ? (item.basePrice || item.totalPrice || 0) / item.quantity : 0)
                                }
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  const factor = ((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                                 (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) 
                                                  ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1)) 
                                                  : (item.quantity || 1);
                                  updateItem(idx, { basePrice: val * factor });
                                }}
                                className="w-24 bg-transparent border-none p-0 focus:ring-0 font-black text-base text-right text-text-main tabular-nums"
                              />
                              <span className="text-[8px] font-black text-text-light/40 uppercase tracking-widest whitespace-nowrap">
                                / {((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                   (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) ? 'm²' : 'unit'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 w-full justify-end">
                              <span className="text-[9px] font-bold text-text-light italic">Base Subtotal:</span>
                              <input 
                                type="number"
                                step="0.01"
                                value={item.basePrice ?? item.totalPrice ?? ''}
                                onChange={(e) => updateItem(idx, { basePrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                                className="w-24 bg-surface border border-border/50 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand/20 font-bold text-[11px] text-right text-text-muted tabular-nums"
                              />
                            </div>
                            
                            <div className="flex items-center gap-1 mt-1 bg-surface border border-border/50 rounded-lg p-1 w-32 justify-end">
                              <select 
                                value={item.discountType || 'percentage'}
                                onChange={(e) => updateItem(idx, { discountType: e.target.value as any })}
                                className="bg-transparent text-[9px] font-bold text-text-light uppercase border-r border-border/50 px-1 focus:outline-none shrink-0"
                              >
                                <option value="percentage">% OFF</option>
                                <option value="amount">R OFF</option>
                              </select>
                              <input
                                type="number"
                                placeholder="Disc"
                                value={item.discountValue || ''}
                                onChange={(e) => updateItem(idx, { discountValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                                className="w-full bg-transparent px-1 text-[11px] text-right text-amber-600 font-bold focus:outline-none placeholder:text-text-light/30 tabular-nums"
                              />
                            </div>

                            <div className="flex items-center gap-2 mt-1 w-full justify-end">
                              <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
                                <input 
                                  type="text"
                                  placeholder="Start #"
                                  value={item.startNumber || ''}
                                  onChange={(e) => updateItem(idx, { startNumber: e.target.value })}
                                  className="w-14 bg-transparent text-[9px] font-bold text-blue-600 text-center focus:outline-none placeholder:text-blue-300"
                                />
                                <span className="text-[8px] text-blue-300">→</span>
                                <input 
                                  type="text"
                                  placeholder="End #"
                                  value={item.endNumber || ''}
                                  onChange={(e) => updateItem(idx, { endNumber: e.target.value })}
                                  className="w-14 bg-transparent text-[9px] font-bold text-blue-600 text-center focus:outline-none placeholder:text-blue-300"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30 w-full justify-end">
                              <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">Final:</span>
                              <span className="text-lg font-black text-brand-accent tabular-nums tracking-tight">
                                R{item.totalPrice?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {items.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-surface flex items-center justify-center border border-border/50 text-text-light/30">
                      <Plus size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-main uppercase tracking-widest italic">Awaiting Payload</p>
                      <p className="text-[9px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Initialize the sales sequence by adding items</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar: Totals & Actions */}
          <aside className="w-[320px] bg-gray-50 border-l border-border/50 flex flex-col shrink-0 no-print">
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] border-b border-border/50 pb-4 italic">Financial Synopsis</h3>
                <div className="space-y-5">
                  {(totals as any).totalDiscount > 0 ? (
                    <>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Base Sub-total</span>
                        <span className="text-sm font-black text-text-main tabular-nums">R{(totals as any).baseSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Total Discount</span>
                        <span className="text-sm font-black text-red-500 tabular-nums">- R{(totals as any).totalDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Discounted Sub-total</span>
                        <span className="text-sm font-black text-text-main tabular-nums">R{totals.subtotal.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Base Sub-total</span>
                      <span className="text-sm font-black text-text-main tabular-nums">R{totals.subtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.isExpress && (
                    <div 
                      className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl"
                    >
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Rush Uplift</span>
                      <span className="text-sm font-black text-amber-600 tabular-nums">+ R{totals.expressSurcharge.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between group">
                    <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">VAT Accrual ({settings.vatRate}%)</span>
                    <span className="text-sm font-black text-text-main tabular-nums">R{totals.vat.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-6 border-t border-dashed border-border/60">
                    <div className="bg-brand text-white p-6 rounded-[2rem] shadow-xl shadow-brand/20 space-y-1 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/10 transition-colors" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest relative z-10">Total Aggregate Value</span>
                      <div className="text-3xl font-black tabular-nums tracking-tighter relative z-10">R{Math.round(totals.total).toLocaleString()}</div>
                      <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2 relative z-10 italic">Quote ID: {formData.quoteNumber?.split('-')[2] || '...' }</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 border border-border/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                  <TrendingUp size={12} /> Projected Yield
                </div>
                <div className="text-xl font-black text-text-main tabular-nums tracking-tight">R{totals.profit.toLocaleString()}</div>
                <div className="w-full bg-border/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((totals.profit / (totals.subtotal || 1)) * 100, 100) || 0}%` }} />
                </div>
                <p className="text-[8px] font-bold text-text-light/60 uppercase tracking-widest italic">{((totals.profit / (totals.subtotal || 1)) * 100 || 0).toFixed(1)}% Operating Margin</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Internal Directives</label>
                <textarea 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Legal disclaimers, production nuances, or logistics notes..."
                  className="w-full h-32 bg-white/50 border border-border/40 rounded-2xl p-4 text-[10px] font-medium placeholder:italic focus:ring-4 focus:ring-brand/5 transition-all resize-none"
                />
              </div>

              <div className="space-y-4 pt-10">
                <div className="flex items-center gap-2 text-[9px] font-black text-text-light uppercase tracking-widest italic">
                  <Info size={12} strokeWidth={3} /> System Notice
                </div>
                <p className="text-[9px] leading-relaxed text-text-muted font-medium opacity-60">Quotes expire automatically after 30 days. Converting to an order will transfer all items to the active production queue.</p>
              </div>
            </div>

            <div className="p-8 border-t border-border/50 bg-white/50 space-y-4">
              {formData.status === 'Accepted' && !jobs.some(j => j.quoteId === quote?.id) && (
                <button 
                  onClick={handleConvertToJob}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Briefcase size={18} strokeWidth={2.5} />
                  Process & Dispatch Order
                </button>
              )}
              <button 
                onClick={handleSave} 
                disabled={isSaving || isProcessing}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-text-main text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-text-main/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-70"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Calculator size={18} strokeWidth={2.5} />
                )}
                {isSaving ? 'Syncing Ledger...' : 'Commit & Finalize'}
              </button>
              <button 
                onClick={onClose} 
                className="w-full py-4 text-[9px] font-black text-text-light uppercase tracking-[0.3em] hover:text-text-main transition-colors"
              >
                Abort Sequence
              </button>
            </div>
          </aside>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-12 text-center"
            >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-brand text-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-brand/20 border border-brand/10"
              >
                <CheckCircle2 size={40} strokeWidth={3} />
              </motion.div>
              <h3 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Quote Finalized</h3>
              <p className="text-[11px] font-black text-text-light uppercase tracking-[0.4em] mt-3 mb-12">The document is registered. Select dispatch method:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                 <button 
                   onClick={handleDownloadPDF}
                   disabled={isProcessing}
                   className="flex col-span-2 items-center justify-center gap-4 py-6 bg-brand text-white rounded-[2.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:-translate-y-1 transition-all"
                 >
                    <Download size={20} />
                    Download Official PDF
                 </button>
                 <button 
                   onClick={handleWhatsAppShare}
                   disabled={isProcessing}
                   className="flex items-center justify-center gap-4 py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:-translate-y-1 transition-all"
                 >
                    <MessageCircle size={18} />
                    WhatsApp
                 </button>
                 <button 
                   onClick={handleEmailPDF}
                   disabled={isProcessing}
                   className="flex items-center justify-center gap-4 py-5 bg-amber-50 text-amber-600 border border-amber-100 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:-translate-y-1 transition-all"
                 >
                    <Mail size={18} />
                    Email
                 </button>
              </div>
              
              <button 
                onClick={onClose}
                className="mt-12 py-4 px-12 text-[10px] font-black text-text-light uppercase tracking-[0.3em] hover:text-text-main transition-colors border border-transparent hover:border-border rounded-full"
              >
                Finish & Close Registry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
