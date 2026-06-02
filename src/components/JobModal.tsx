import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Calendar, Clock, CheckCircle2, Image as ImageIcon, Share2, Send, MessageCircle, ExternalLink, Download, Printer, Mail, Upload, FileText, Camera, GripVertical, Loader2, Award, Tent, Flag, Sliders, Check, Search, Tag, Sparkles, BookOpen, ChevronRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { Job, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, JobStage, JobPriority, Department, CompanySettings, LithoProduct, Quote, JobTemplate, ProductCategory } from '../types';
import { createDocument, updateDocument, useCollection, getNextSequence } from '../lib/firestoreService';
import { calculateQuoteTotals, DEFAULT_PRICING_SETTINGS, getActivePricingSettings } from '../lib/pricingService';
import { cn, sqMmToSqM, addBusinessDays } from '../lib/utils';
import { generateJobCardPDF } from '../lib/pdfService';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { generateWorkflowStages, calculateItemCostDetails, checkMaterialAllocation, WorkflowStage } from '../lib/jobWorkflowEngine';
import { toast } from 'sonner';
import NCROperationalBuilder from './ncr/NCROperationalBuilder';
import { getAppBaseUrl, createSecureToken, getExistingArtworkToken, PublicToken } from '../lib/sharingService';

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
    Briefcase: Box,
    BookOpen: BookOpen
  };
  const IconComponent = (name && map[name]) || Tag;
  return <IconComponent size={size} className={className} />;
};

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job | null;
}

const priorityStyles = {
  Urgent: "bg-red-50 text-red-600 border border-red-100",
  High: "bg-orange-50 text-orange-600 border border-orange-100",
  Normal: "bg-blue-50 text-brand border border-blue-100",
};

const stageStyles = {
  Prepress: "bg-purple-50 text-purple-600",
  Printing: "bg-blue-50 text-brand",
  Laminating: "bg-cyan-50 text-cyan-600",
  Finishing: "bg-indigo-50 text-indigo-600",
  'Quality Check': "bg-amber-50 text-amber-600",
  Ready: "bg-emerald-50 text-emerald-600",
  Delivered: "bg-emerald-500 text-white",
  Cancelled: "bg-gray-100 text-gray-500",
  Embroidery: "bg-pink-50 text-pink-600",
  Screenprinting: "bg-orange-50 text-orange-600",
};

export default function JobModal({ isOpen, onClose, job }: JobModalProps) {
  const { data: clients } = useCollection<Client>('clients');
  const { data: dbCategories, loading: catLoading } = useCollection<ProductCategory>('product_categories');
  const { data: products } = useCollection<Product>('products');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: ncrBooks } = useCollection<NCRBook>('ncr_books');
  const { data: packages } = useCollection<Package>('packages');
  const { data: lithoProducts } = useCollection<LithoProduct>('litho_products');
  const { data: departments } = useCollection<Department>('departments');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  const { data: companySettingsList } = useCollection<CompanySettings>('company_settings');
  const { data: quotes } = useCollection<Quote>('quotes');
  const { data: templates } = useCollection<JobTemplate>('job_templates');
  
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
      const stored = localStorage.getItem('erp_jobs_recent_products');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const addToRecent = (productId: string) => {
    setRecentlyUsed(prev => {
      const next = [productId, ...prev.filter(id => id !== productId)].slice(0, 5);
      localStorage.setItem('erp_jobs_recent_products', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    console.log(`[Developer Diagnostics] Job card builder loaded ${dbCategories.length} product categories, ${products.length} products.`);
    if (dbCategories.length === 0 && !catLoading) {
      console.warn(`[Developer Diagnostics] Warning: Job card builder received 0 active categories.`);
    }
  }, [dbCategories, products, catLoading]);
  
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    try {
      await createDocument('job_templates', {
        name: templateName,
        productName: formData.productName || 'Untitled Job',
        departmentId: formData.departmentId || '',
        items: items || [],
        ncrDetails: formData.ncrDetails,
        notes: formData.notes,
        createdAt: Date.now()
      });
      toast.success('Template saved successfully');
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template');
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setFormData(prev => ({
      ...prev,
      productName: template.productName,
      departmentId: template.departmentId || prev.departmentId,
      ncrDetails: template.ncrDetails || prev.ncrDetails,
      notes: template.notes || prev.notes,
    }));
    if (template.items && template.items.length > 0) {
      setItems(template.items.map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9)
      })));
    }
    toast.success('Template applied');
  };

  const [formData, setFormData] = useState<Partial<Job>>({
    jobNumber: 'Pending...',
    clientId: '',
    clientName: '',
    productName: '',
    departmentId: '',
    stage: 'Prepress',
    priority: 'Normal',
    dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    artworkStatus: 'Pending',
    artworkDeadline: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days for artwork approval
    ncrDetails: {
      paperColors: '',
      startNumber: '',
      endNumber: '',
      perforationPosition: '',
      bindingType: '',
      bindingPosition: '',
    },
    productionSteps: [],
    designReferenceImageUrl: '',
    items: [],
    createdAt: Date.now()
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const steps = [
    { id: 'source', label: '1. Source & Client' },
    { id: 'components', label: '2. Component Fabrication' },
    { id: 'workflow', label: '3. Production Workflow' },
    { id: 'artwork', label: '4. Artwork & Media' },
    { id: 'costing', label: '5. Cost & Reconciliation' }
  ];
  const [currentStep, setCurrentStep] = useState<string>('source');
  const [activeTab, setActiveTab] = useState<'details' | 'artwork' | 'items'>('details');
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const artworkFileRef = React.useRef<HTMLInputElement>(null);

  const [artworkToken, setArtworkToken] = useState<PublicToken | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      const jobId = job?.id || formData.id;
      if (!jobId || jobId === 'Pending...' || jobId === '') {
        setArtworkToken(null);
        return;
      }
      setLoadingToken(true);
      try {
        const token = await getExistingArtworkToken(jobId);
        if (active) {
          setArtworkToken(token);
        }
      } catch (err) {
        console.error('Error fetching artwork token:', err);
      } finally {
        if (active) {
          setLoadingToken(false);
        }
      }
    };

    if (currentStep === 'artwork') {
      fetchToken();
    }

    return () => {
      active = false;
    };
  }, [currentStep, job?.id, formData.id]);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('pdf') && !file.type.includes('png')) {
        toast.error(`${file.name} is not a supported format. Please upload JPEG, PNG or PDF.`);
        return;
      }

      const uploadId = Math.random().toString(36).substr(2, 9);
      setUploadingFiles(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);

      const reader = new FileReader();
      
      // Simulate progress for Base64 reading (which is usually fast, but we want visual feedback)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 90) {
          clearInterval(progressInterval);
          progress = 90;
        }
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress } : f));
      }, 200);

      reader.onload = (event) => {
        clearInterval(progressInterval);
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 100 } : f));
        
        setTimeout(() => {
          const base64String = event.target?.result as string;
          const artwork = formData.artwork || [];
          const newArt = {
            id: Math.random().toString(36).substr(2, 9),
            url: base64String,
            name: file.name.split('.')[0].replace(/[-_]/g, ' '),
            status: 'Pending' as const,
            version: (artwork.length + 1),
            uploadedAt: Date.now(),
            comments: [
              {
                id: Math.random().toString(36).substr(2, 9),
                text: `Artwork version ${artwork.length + 1} uploaded by staff.`,
                author: 'System' as const,
                createdAt: Date.now()
              }
            ]
          };
          
          setFormData(prev => ({
            ...prev,
            artwork: [...(prev.artwork || []), newArt]
          }));
          
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 500);
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        toast.error(`Failed to read ${file.name}`);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleArtworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    const initJob = async () => {
      if (job) {
        setFormData({
          ...job,
          ncrDetails: job.ncrDetails || { 
            paperColors: '', 
            startNumber: '', 
            endNumber: '',
            perforationPosition: '',
            bindingType: '',
            bindingPosition: '',
          },
          productionSteps: job.productionSteps || [],
          designReferenceImageUrl: job.designReferenceImageUrl || ''
        });
        setItems(job.items || []);
      } else {
        const designingDept = departments.find(d => d.name.toLowerCase() === 'designing') || departments[0];
        setFormData({
          jobNumber: 'Pending...',
          clientId: '',
          clientName: '',
          productName: '',
          departmentId: designingDept?.id || '',
          stage: 'Prepress',
          status: 'Active',
          priority: 'Normal',
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          artworkStatus: 'Pending',
          artworkDeadline: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days for artwork approval
          ncrDetails: {
            paperColors: '',
            startNumber: '',
            endNumber: '',
            perforationPosition: '',
            bindingType: '',
            bindingPosition: '',
          },
          productionSteps: [],
          designReferenceImageUrl: '',
          items: [],
          createdAt: Date.now()
        });
        setItems([]);
      }
    };

    if (isOpen) {
      initJob();
    }
  }, [job, isOpen]);

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

    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
      updates.description = '';
      updates.unitCost = 0;
      updates.machineId = '';
    }

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
            console.warn(`[Developer Diagnostics] Product with name '${product.name}' in Job Modal has no categoryId assigned.`);
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

    if (updates.materialId && updates.materialId !== currentItem.materialId && type === 'Product') {
      const material = materials.find(m => m.id === updates.materialId);
      if (material) unitCost = material.costPrice;
      updates.unitCost = unitCost;
    }

    newItems[index] = { ...newItems[index], ...updates };
    const item = newItems[index];

    // Find relevant entities for dimension checking
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
      let machinePrice = 0;

      if (machine) {
        const costRate = machine.costPerHour || machine.hourlyRate || 0;
        const sellRate = machine.hourlyRate || 0;

        if (machine.costUnit === 'm²') {
          machineCost = sqMmToSqM(w * l) * costRate * q;
          machinePrice = sqMmToSqM(w * l) * sellRate * q;
        } else if (machine.costUnit === 'page' || machine.costUnit === 'copy') {
          machineCost = q * costRate;
          machinePrice = q * sellRate;
        } else if (machine.costUnit === 'hr') {
          const hours = (product?.setupTime || 0) / 60;
          machineCost = hours * costRate;
          machinePrice = hours * sellRate;
        } else {
          machineCost = q * costRate;
          machinePrice = q * sellRate;
        }
      }

      if (isArea) {
        computedCost = (sqMmToSqM(w * l) * matCost * q) + machineCost;
        computedPrice = (sqMmToSqM(w * l) * matCost * activeMarkup * q) + machinePrice;
      } else {
        computedCost = (matCost * q) + machineCost;
        computedPrice = (matCost * q * activeMarkup) + machinePrice;
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
      computedPrice = computedCost * materialMarkup;
    } else {
      computedCost = q * u;
      computedPrice = computedCost * materialMarkup;
    }

    if ('totalCost' in updates && !('basePrice' in updates) && !('totalPrice' in updates)) {
      item.totalCost = updates.totalCost!;
    } else {
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
    }
    
    setItems(newItems);

    // Auto-fill productName if it's the first item
    if (index === 0 && updates.description) {
      setFormData(prev => ({ ...prev, productName: updates.description }));
    }
  };

  const totals = calculateQuoteTotals(items as any, false, settings);
  const totalCostVal = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalExclVatVal = totals.total / 1.15;
  const aggregateGpPercentVal = totalExclVatVal > 0 
    ? ((totalExclVatVal - totalCostVal) / totalExclVatVal * 100)
    : 0;
  const hasNCRItems = items.some(item => item.type === 'NCR');

  const getApprovalLink = () => {
    return `${getAppBaseUrl()}/approval/${job?.id || 'save-job-first'}`;
  };

  const getCombinedJob = (): Job => {
    const client = clients.find(c => c.id === formData.clientId);
    return {
      ...formData,
      clientName: client ? (client.companyName || client.name) : (formData.clientName || 'Unknown'),
      items: (items || []) as QuoteItem[],
      total: Number(totals.total) || 0,
    } as Job;
  };

  const handleWhatsAppShare = async () => {
    console.log('Button Click: WhatsApp Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaWhatsApp('job', getCombinedJob(), client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleEmailShare = async () => {
    console.log('Button Click: Email Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaEmail('job', getCombinedJob(), client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleDownloadPDF = async () => {
    console.log('Button Click: Download PDF', { jobId: job?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const combinedJob = getCombinedJob();
      const jobcardConfig = settingsList?.find(s => s.id === 'jobcard_config');
      const doc = generateJobCardPDF(combinedJob, client, company, jobcardConfig);
      doc.save(`JobCard_${combinedJob.jobNumber || 'Pending'}.pdf`);
      toast.success('Job Card PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF Download Error:', err);
      toast.error(`Download failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPDF = async () => {
    console.log('Button Click: Print PDF', { jobId: job?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const combinedJob = getCombinedJob();
      const jobcardConfig = settingsList?.find(s => s.id === 'jobcard_config');
      const doc = generateJobCardPDF(combinedJob, client, company, jobcardConfig);
      const blob = doc.output('blob');
      const blobURL = URL.createObjectURL(blob);
      const win = window.open(blobURL, '_blank');
      if (!win) {
        toast.error('Popup blocked. Please allow popups to print/preview.');
      }
    } catch (err: any) {
      console.error('PDF Print Error:', err);
      toast.error(`Print failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArtworkWhatsAppShare = async () => {
    console.log('Button Click: Artwork WhatsApp Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) {
      toast.error('Validation Error: Please select a client first.');
      return;
    }
    
    const artworkList = formData.artwork || [];
    if (artworkList.length === 0) {
      toast.error('Please upload an artwork proof before sending approval.');
      return;
    }

    if (!client.phone) {
      toast.error('Client WhatsApp number missing.');
      return;
    }

    setIsProcessing(true);
    try {
      const currentJobId = job?.id || formData.id;
      if (!currentJobId || currentJobId === 'Pending...') {
        toast.error('Please commit the Job Card to the Registry first to obtain a valid Job ID.');
        return;
      }

      // Silent-save the artwork in Firestore so it's committed when they share
      await updateDocument('jobs', currentJobId, { artwork: artworkList });

      await shareViaWhatsApp('artwork', getCombinedJob(), client, company);
      
      // Refresh token local state
      const token = await getExistingArtworkToken(currentJobId);
      setArtworkToken(token);
      toast.success('WhatsApp link generated and opened successfully!');
    } catch (err: any) {
      console.error('WhatsApp Share Error:', err);
      toast.error(`WhatsApp link failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArtworkEmailShare = async () => {
    console.log('Button Click: Artwork Email Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) {
      toast.error('Validation Error: Please select a client first.');
      return;
    }
    
    const artworkList = formData.artwork || [];
    if (artworkList.length === 0) {
      toast.error('Please upload an artwork proof before sending approval.');
      return;
    }

    if (!client.email) {
      toast.error('Client email missing.');
      return;
    }

    setIsProcessing(true);
    try {
      const currentJobId = job?.id || formData.id;
      if (!currentJobId || currentJobId === 'Pending...') {
        toast.error('Please commit the Job Card to the Registry first to obtain a valid Job ID.');
        return;
      }

      // Silent-save the artwork in Firestore so it's committed when they share
      await updateDocument('jobs', currentJobId, { artwork: artworkList });

      await shareViaEmail('artwork', getCombinedJob(), client, company);
      
      // Refresh token local state
      const token = await getExistingArtworkToken(currentJobId);
      setArtworkToken(token);
      toast.success('Email mailto generated and opened successfully!');
    } catch (err: any) {
      console.error('Email Share Error:', err);
      toast.error(`Email generation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyArtworkLink = async () => {
    console.log('Button Click: Copy Artwork Approval Link', { jobId: job?.id });
    const currentJobId = job?.id || formData.id;
    if (!currentJobId || currentJobId === 'Pending...') {
      toast.error('Please create or commit the Job Card to the Registry first.');
      return;
    }

    const artworkList = formData.artwork || [];
    if (artworkList.length === 0) {
      toast.error('Please upload an artwork proof before copying approval link.');
      return;
    }

    const client = clients.find(c => c.id === formData.clientId);
    if (!client) {
      toast.error('Please select a client first.');
      return;
    }

    setIsProcessing(true);
    try {
      const lastProof = artworkList[artworkList.length - 1];
      const proofUrl = lastProof ? lastProof.url : '';
      
      const token = await createSecureToken(currentJobId, 'artwork-approval', 30, {
        jobId: currentJobId,
        clientId: client.id,
        proofUrl: proofUrl,
        createdBy: 'user',
      });
      
      const baseUrl = getAppBaseUrl();
      const approvalUrl = `${baseUrl}/artwork-approval/${token}`;
      
      await navigator.clipboard.writeText(approvalUrl);
      toast.success('Artwork approval link copied to clipboard!');
      
      // Refresh token local state
      const refreshedToken = await getExistingArtworkToken(currentJobId);
      setArtworkToken(refreshedToken);
    } catch (err: any) {
      console.error('Copy Link Error:', err);
      toast.error(`Failed to copy approval link: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailPDF = async () => {
    console.log('Button Click: Email PDF', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaEmail('job', getCombinedJob(), client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleAddComment = (artId: string) => {
    const text = newComments[artId];
    if (!text?.trim()) return;

    const newArt = [...(formData.artwork || [])];
    const artIdx = newArt.findIndex(a => a.id === artId);
    if (artIdx !== -1) {
      const art = newArt[artIdx];
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        text: text.trim(),
        author: 'Staff' as const,
        createdAt: Date.now()
      };
      
      // Update artwork status to Pending if it was Changes Requested
      const newStatus = art.status === 'Changes Requested' ? 'Pending' as const : art.status;
      
      newArt[artIdx] = {
        ...art,
        status: newStatus,
        comments: [...(art.comments || []), newComment]
      };
      setFormData({ ...formData, artwork: newArt });
      setNewComments(prev => ({ ...prev, [artId]: '' }));
      toast.success('Comment added to artwork history');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    console.log('Button Click: Commit Job to Registry', { isEdit: !!job?.id });
    
    // Enterprise Field Validations
    if (!formData.clientId) {
      toast.error('Validation Error: A Client must be selected to proceed.');
      return;
    }
    if (!items || items.length === 0) {
      toast.error('Validation Error: A Job must contain at least 1 production item/component.');
      return;
    }
    if (!formData.dueDate) {
      toast.error('Validation Error: Please select a valid Due Date for production scheduling.');
      return;
    }

    setIsSaving(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalData: Partial<Job> = {
        ...formData,
        clientName: client ? (client.companyName || client.name) : 'Unknown',
        items: (items || []) as QuoteItem[],
        total: Number(totals.total) || 0,
        clientId: formData.clientId || '',
        stage: formData.stage || 'Prepress',
        priority: formData.priority || 'Normal',
        dueDate: Number(formData.dueDate) || (Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: formData.notes || '',
        createdAt: Number(formData.createdAt) || Date.now(),
        productName: formData.productName || (items.length > 0 ? items[0].description : 'Custom Production'),
        quoteId: formData.quoteId || '',
        productionSteps: formData.productionSteps || [],
        designReferenceImageUrl: formData.designReferenceImageUrl || '',
      };

      if (job?.id) {
        await updateDocument('jobs', job.id, finalData);
      } else {
        const year = new Date().getFullYear();
        const sequence = await getNextSequence(`jobs_${year}`);
        const prefix = company?.jobCardPrefix || 'Jobcard';
        finalData.jobNumber = `${prefix}-${year}-${(sequence || 1).toString().padStart(3, '0')}`;
        const newJobId = await createDocument('jobs', finalData as any);
        if (!newJobId) throw new Error('Firestore did not return a new job ID.');
      }
      setShowSuccess(true);
      toast.success('Job saved successfully.');
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Could not save. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative printable-content">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0 no-print">
          <div>
            <h2 className="text-2xl font-bold text-text-main tracking-tight">{job ? 'Edit Job Card' : 'Direct Job Entry'}</h2>
            <p className="text-xs font-black text-brand-accent uppercase tracking-widest mt-1">Manual workflow bypass — #{formData.jobNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Stepper Wizard Navigation Bar */}
        <div className="px-8 py-4 bg-slate-50 border-b border-border/80 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center min-h-[40px] whitespace-nowrap active:scale-95 duration-150",
                    isActive 
                      ? "bg-brand text-white border-brand shadow-sm shadow-blue-100 font-extrabold" 
                      : "bg-white text-text-muted hover:bg-white border-border hover:border-text-muted/30"
                  )}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={currentStep === 'source'}
              onClick={() => {
                const idx = steps.findIndex(s => s.id === currentStep);
                if (idx > 0) setCurrentStep(steps[idx - 1].id);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-bold text-text-muted disabled:opacity-50 min-h-[40px] flex items-center"
            >
              Back
            </button>
            <button
              type="button"
              disabled={currentStep === 'costing'}
              onClick={() => {
                const idx = steps.findIndex(s => s.id === currentStep);
                if (idx < steps.length - 1) setCurrentStep(steps[idx + 1].id);
              }}
              className="px-4 py-2 bg-brand text-white hover:bg-brand/90 rounded-xl text-xs font-bold shadow-sm min-h-[40px] flex items-center font-black"
            >
              Next
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {currentStep === 'source' && (
            <div className="grid grid-cols-4 gap-6 animate-in fade-in duration-200">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Load Configuration</label>
              <select 
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="w-full px-5 py-3 bg-purple-50/50 border border-purple-200 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-purple-700"
              >
                <option value="">Select a template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Base on Quote (Optional)</label>
              <select 
                value={formData.quoteId || ''}
                onChange={(e) => {
                  const quoteId = e.target.value;
                  const quote = quotes.find(q => q.id === quoteId);
                  if (quote) {
                    setFormData({
                      ...formData,
                      quoteId,
                      clientId: quote.clientId,
                      productName: quote.items.map(i => i.description).join(', ').substring(0, 50) || 'Custom Order',
                    });
                    setItems(quote.items);
                  } else {
                    setFormData({ ...formData, quoteId: '' });
                  }
                }}
                className="w-full px-5 py-3 bg-blue-50/50 border border-brand/20 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all text-brand"
              >
                <option value="">Manual Entry (No Quote)</option>
                {quotes.filter(q => q.status === 'Accepted').map(q => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} - {clients.find(c => c.id === q.clientId)?.companyName || 'Unknown'}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Select Client</label>
              <select 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
              </select>
            </div>
            
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Department</label>
              <select 
                value={formData.departmentId || ''}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="">Unassigned</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Production Stage</label>
              <select 
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as JobStage })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                {Object.keys(stageStyles).map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Priority Level</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as JobPriority })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" size={16} />
                <input 
                  type="date"
                  value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value).getTime() })}
                  className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Artwork Status</label>
              <select 
                value={formData.artworkStatus}
                onChange={(e) => {
                  const status = e.target.value as any;
                  const updates: Partial<Job> = { artworkStatus: status };
                  if (status === 'Approved') {
                    updates.artworkApprovedAt = Date.now();
                    updates.dueDate = addBusinessDays(Date.now(), 5);
                    toast.success('Artwork approved! Production due date automatically set to 5 business days from today.');
                  } else {
                    updates.artworkApprovedAt = undefined;
                  }
                  setFormData({ ...formData, ...updates });
                }}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Product Reference</label>
              <input 
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                placeholder="Product summary name..."
              />
            </div>
            
            <div className="col-span-3 grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Internal Production Notes</label>
                <textarea 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-border rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-24 resize-none"
                  placeholder="Specific instructions for machines, finishing, or internal staff..."
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Customer / Client Notes</label>
                <textarea 
                  value={(formData as any).customerNotes || ''}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-border rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-24 resize-none"
                  placeholder="Client specific instructions, shipping requests, delivery details..."
                />
              </div>
            </div>
          </div>
          )}
            
          {currentStep === 'workflow' && (
            <div className="grid grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in fade-in duration-200">
              <div className="col-span-3">
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Simple Production Steps Checklist</label>
                {formData.productionSteps?.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input 
                          value={step}
                          onChange={(e) => {
                              const newSteps = [...(formData.productionSteps || [])];
                              newSteps[index] = e.target.value;
                              setFormData({...formData, productionSteps: newSteps});
                          }}
                          className="flex-1 px-5 py-3 bg-white border border-border rounded-xl font-bold"
                      />
                      <button onClick={() => setFormData({...formData, productionSteps: formData.productionSteps?.filter((_, i) => i !== index)})}>
                          <X size={16}/>
                      </button>
                    </div>
                ))}
                <button type="button" onClick={() => setFormData({...formData, productionSteps: [...(formData.productionSteps || []), '']})} className="mt-2 text-xs font-black text-brand uppercase tracking-widest flex items-center gap-2 transition-all hover:opacity-80">
                    <Plus size={14}/> Add Checklist Step
                </button>
              </div>
            </div>
          )}

          {currentStep === 'artwork' && (
            <div className="grid grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 mt-6 animate-in fade-in duration-200">
              <div className="col-span-3">
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Design Reference Image</label>
                  <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                  setFormData({...formData, designReferenceImageUrl: ev.target?.result as string});
                              }
                              reader.readAsDataURL(e.target.files[0]);
                          }
                      }}
                      className="w-full px-5 py-3 bg-white border border-border rounded-xl font-bold font-mono text-[10px]"
                  />
                  {formData.designReferenceImageUrl && (
                      <img src={formData.designReferenceImageUrl} alt="Reference" className="mt-4 max-h-32 rounded-xl border border-border" />
                  )}
              </div>
            </div>
          )}

          {currentStep === 'components' && hasNCRItems && (
            <div className="pt-6 border-t border-border">
              <NCROperationalBuilder formData={formData} setFormData={setFormData} materials={materials} />
            </div>
          )}

          {currentStep === 'artwork' && (
            <>
              <div className="pt-6 border-t border-border">
                {/* Visual Approval Control Board */}
                <div className="bg-slate-50 border border-border rounded-3xl p-6 mb-8 shadow-sm">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-border">
                    <div>
                      <h3 className="text-[11px] font-black text-text-light uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles size={14} className="text-brand" /> Visual Proofing Protocol
                      </h3>
                      <p className="text-sm font-black text-text-main mt-1 italic">Visual Approval Control Board</p>
                    </div>

                    {/* Metadata Badges Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Upload Status */}
                      {formData.artwork && formData.artwork.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Proof Up (v{formData.artwork.length}.0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse">
                          <AlertCircle size={12} className="text-rose-500" /> Missing Artwork Proof
                        </span>
                      )}

                      {/* Link Indicator */}
                      {artworkToken ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-brand border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                          <ShieldCheck size={12} className="text-brand" /> Approval Link Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-text-light border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                          <Clock size={12} className="text-text-muted" /> Link Undefined
                        </span>
                      )}

                      {/* Approval Status Indicator */}
                      {formData.artwork && formData.artwork.length > 0 ? (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                          formData.artworkStatus === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          formData.artworkStatus === 'Changes Requested' ? "bg-red-50 text-red-700 border-red-100" :
                          "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          Status: {formData.artworkStatus || 'Pending'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Errors / Warnings and Actions Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Val warnings left */}
                    <div className="md:col-span-6 space-y-2">
                      {(() => {
                        const clientObj = clients.find(c => c.id === formData.clientId);
                        if (!clientObj) {
                          return (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-[11px] font-bold">
                              <AlertCircle size={16} className="text-rose-500" />
                              <span>Validation Error: Please select a client first to proof.</span>
                            </div>
                          );
                        }

                        // Clean phone
                        const cleanPhone = clientObj.phone ? clientObj.phone.replace(/\D/g, '') : '';
                        const SouthAfricaPhone = cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone;

                        return (
                          <div className="space-y-2">
                            <div className="text-xs font-black text-text-main mb-1">
                              Client Contacts: <span className="font-bold underline text-brand">{clientObj.companyName || clientObj.name}</span>
                            </div>

                            <div className="flex flex-col gap-2.5">
                              {/* Email Check */}
                              {clientObj.email ? (
                                <div className="flex items-center gap-2 text-[11px] text-text-main font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Email ready: <span className="font-mono text-text-light">{clientObj.email}</span></span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[11px] font-bold">
                                  <AlertCircle size={14} className="text-rose-500" />
                                  <span>Client email missing.</span>
                                </div>
                              )}

                              {/* phone check */}
                              {clientObj.phone ? (
                                <div className="flex items-center gap-2 text-[11px] text-text-main font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>WhatsApp ready: <span className="font-mono text-text-light">+{SouthAfricaPhone}</span></span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[11px] font-bold">
                                  <AlertCircle size={14} className="text-rose-500" />
                                  <span>Client WhatsApp number missing.</span>
                                </div>
                              )}

                              {/* Missing Job Card Check */}
                              {(!job?.id || job.id === 'Pending...' || job.id === '') && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                                  <AlertCircle size={14} className="text-amber-500" />
                                  <span>Commit to registry first before sending approval links</span>
                                </div>
                              )}

                              {/* Missing artwork notification */}
                              {(!formData.artwork || formData.artwork.length === 0) && (
                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-[11px] font-bold">
                                  <AlertCircle size={14} className="text-amber-500" />
                                  <span>Please upload an artwork proof before sending approval.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Button actions right */}
                    <div className="md:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                      {(() => {
                        const clientObj = clients.find(c => c.id === formData.clientId);
                        const hasArts = formData.artwork && formData.artwork.length > 0;
                        const hasJobId = job?.id && job.id !== 'Pending...' && job.id !== '';

                        return (
                          <>
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={handleArtworkWhatsAppShare}
                              disabled={isProcessing || !clientObj || !clientObj.phone || !hasArts || !hasJobId}
                              className={cn(
                                "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all text-white",
                                (!clientObj || !clientObj.phone || !hasArts || !hasJobId)
                                  ? "bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed opacity-60"
                                  : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100 text-white"
                              )}
                              title={
                                !hasArts ? "Please upload an artwork proof before sending approval." :
                                !clientObj?.phone ? "Client WhatsApp number missing." :
                                !hasJobId ? "Commit to the registry first" : "Send Visual approval via WhatsApp"
                              }
                            >
                              <MessageCircle size={16} /> WhatsApp Approval
                            </button>

                            {/* Email Link Button */}
                            <button
                              type="button"
                              onClick={handleArtworkEmailShare}
                              disabled={isProcessing || !clientObj || !clientObj.email || !hasArts || !hasJobId}
                              className={cn(
                                "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all text-white",
                                (!clientObj || !clientObj.email || !hasArts || !hasJobId)
                                  ? "bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed opacity-60"
                                  : "bg-amber-600 hover:bg-amber-700 hover:shadow-orange-100 text-white"
                              )}
                              title={
                                !hasArts ? "Please upload an artwork proof before sending approval." :
                                !clientObj?.email ? "Client email missing." :
                                !hasJobId ? "Commit to the registry first" : "Send Visual approval via Email"
                              }
                            >
                              <Mail size={16} /> Email Link
                            </button>

                            {/* Copy Link Button */}
                            <button
                              type="button"
                              onClick={handleCopyArtworkLink}
                              disabled={isProcessing || !hasArts || !hasJobId}
                              className={cn(
                                "flex items-center justify-center gap-2 px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all",
                                (!hasArts || !hasJobId)
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-white text-text-main border-border hover:bg-slate-50 hover:text-brand hover:border-brand"
                              )}
                            >
                              <Share2 size={16} /> Copy Link
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Last sent and loading state indicators footer */}
                  <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-text-light font-bold">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>
                        Last Sent Timestamp:{' '}
                        <span className="font-mono font-bold text-text-main italic">
                          {artworkToken?.lastSentAt
                            ? new Date(artworkToken.lastSentAt).toLocaleString()
                            : 'Never shared yet'}
                        </span>
                      </span>
                    </div>

                    {loadingToken && (
                      <div className="flex items-center gap-1 text-brand tracking-widest uppercase font-black">
                        <Loader2 size={12} className="animate-spin" /> Fetching Metadata...
                      </div>
                    )}
                  </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => artworkFileRef.current?.click()}
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px]",
                    isDragging ? "bg-brand/10 border-brand scale-[0.98]" : "bg-brand/5 border-brand/10 hover:bg-brand/[0.07] hover:border-brand/20"
                  )}
                >
                  <input 
                    type="file"
                    ref={artworkFileRef}
                    onChange={handleArtworkFileUpload}
                    accept=".jpg,.jpeg,image/jpeg,.png,image/png,.pdf,application/pdf"
                    multiple
                    className="hidden"
                  />
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-brand/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                    <Upload className="text-brand" size={32} />
                  </div>
                  <h4 className="text-base font-black text-text-main tracking-tighter uppercase italic leading-tight">Drop proofs here</h4>
                  <p className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-2 max-w-[180px]">Accepts high-res JPEG, PNG or PDF formats</p>
                  
                  <div className="mt-8 px-6 py-2.5 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand/20 group-hover:bg-brand-accent transition-colors">
                    Click to Browse
                  </div>

                  {isDragging && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-brand/40 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <Plus className="text-brand animate-spin" size={20} />
                        <span className="text-xs font-black text-brand uppercase tracking-widest">Release to Upload</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col">
                <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border/40 pb-10">
                  {/* Uploading Progress */}
                  <AnimatePresence>
                    {uploadingFiles.map(file => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-brand/5 border border-brand/20 rounded-2xl p-4 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Loader2 className="text-brand animate-spin" size={16} />
                            <span className="text-[10px] font-black text-text-main uppercase tracking-widest truncate max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-brand tabular-nums">{Math.round(file.progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-brand/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-brand"
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Reorder.Group 
                    axis="y" 
                    values={formData.artwork || []} 
                    onReorder={(newOrder) => setFormData({ ...formData, artwork: newOrder })}
                    className="space-y-4"
                  >
                    {formData.artwork?.map((art, idx) => (
                      <Reorder.Item 
                        key={art.id} 
                        value={art}
                        className="bg-white p-6 rounded-3xl border border-border group relative overflow-hidden shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex gap-6">
                          <div className="flex flex-col items-center justify-center text-text-light opacity-20 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                            <GripVertical size={20} />
                          </div>

                          <div 
                            className="w-32 h-32 bg-surface rounded-[2rem] overflow-hidden flex-shrink-0 border-2 border-border/50 flex items-center justify-center cursor-pointer hover:brightness-95 hover:border-brand/30 transition-all relative group/img shadow-inner"
                            onClick={(e) => { e.stopPropagation(); window.open(art.url, '_blank'); }}
                          >
                            {art.url.startsWith('data:application/pdf') ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileText size={40} className="text-red-500" />
                                <span className="text-[9px] font-black text-text-light uppercase tracking-tighter">PDF PROOF</span>
                              </div>
                            ) : (
                              <img src={art.url} alt={art.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm">
                              <ExternalLink size={24} className="text-white drop-shadow-md" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-xl text-[9px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-black/20">
                              v{art.version}.0
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 pr-6">
                                <label className="block text-[8px] font-black text-text-light uppercase tracking-widest mb-1">File Name</label>
                                <input 
                                  type="text"
                                  value={art.name}
                                  onChange={(e) => {
                                    const newArt = [...(formData.artwork || [])];
                                    const artIdx = newArt.findIndex(a => a.id === art.id);
                                    if (artIdx !== -1) {
                                      newArt[artIdx] = { ...art, name: e.target.value };
                                      setFormData({ ...formData, artwork: newArt });
                                    }
                                  }}
                                  className="text-base font-black text-text-main truncate uppercase tracking-tight bg-transparent border-b-2 border-transparent hover:border-border focus:border-brand p-0 pb-1 focus:ring-0 w-full italic transition-colors"
                                />
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1">
                                    <Clock size={10} className="text-text-muted" />
                                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{new Date(art.uploadedAt).toLocaleString()}</p>
                                  </div>
                                  <div className="w-1 h-1 bg-border rounded-full" />
                                  <p className="text-[8px] font-black text-text-light uppercase tracking-[0.2em] bg-surface px-2 py-0.5 rounded-md">ID: {art.id}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <label className="block text-[8px] font-black text-text-light uppercase tracking-widest">Client Decision</label>
                                <div className="flex bg-surface p-1 rounded-2xl border border-border/50">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newArt = [...(formData.artwork || [])];
                                      const artIdx = newArt.findIndex(a => a.id === art.id);
                                      if (artIdx !== -1) {
                                        newArt[artIdx] = { ...art, status: 'Pending' };
                                        setFormData({ ...formData, artwork: newArt });
                                      }
                                    }}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                      art.status === 'Pending' ? "bg-amber-100 text-amber-700 shadow-sm" : "text-text-light hover:text-text-main hover:bg-gray-100"
                                    )}
                                  >
                                    Pending
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newArt = [...(formData.artwork || [])];
                                      const artIdx = newArt.findIndex(a => a.id === art.id);
                                      if (artIdx !== -1) {
                                        newArt[artIdx] = { ...art, status: 'Changes Requested' };
                                        setFormData({ ...formData, artwork: newArt });
                                      }
                                    }}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                      art.status === 'Changes Requested' ? "bg-red-500 text-white shadow-sm shadow-red-200" : "text-text-light hover:text-text-main hover:bg-gray-100"
                                    )}
                                  >
                                    Revisions
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newArt = [...(formData.artwork || [])];
                                      const artIdx = newArt.findIndex(a => a.id === art.id);
                                      if (artIdx !== -1) {
                                        newArt[artIdx] = { ...art, status: 'Approved' };
                                        setFormData({ ...formData, artwork: newArt });
                                      }
                                    }}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all gap-1 flex items-center",
                                      art.status === 'Approved' ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200" : "text-text-light hover:text-text-main hover:bg-gray-100"
                                    )}
                                  >
                                    <CheckCircle2 size={12} className={art.status === 'Approved' ? 'text-white' : 'hidden'}/>
                                    Approved
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="relative">
                                <MessageCircle size={14} className="absolute left-4 top-4 text-text-light opacity-40" />
                                <textarea 
                                  value={art.feedback || ''}
                                  onChange={(e) => {
                                    const newArt = [...(formData.artwork || [])];
                                    const artIdx = newArt.findIndex(a => a.id === art.id);
                                    if (artIdx !== -1) {
                                      newArt[artIdx] = { ...art, feedback: e.target.value };
                                      setFormData({ ...formData, artwork: newArt });
                                    }
                                  }}
                                  placeholder="Internal design notes or client summary..."
                                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-border/60 rounded-2xl text-[10px] font-bold text-text-main placeholder:text-text-light/60 focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none h-14 hover:h-20 focus:h-20 focus:bg-white delay-75"
                                />
                              </div>

                              {/* Comment Thread Display */}
                              {(art.comments?.length || 0) > 0 && (
                                <div className="bg-surface/50 rounded-2xl border border-border/50 p-4 space-y-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageCircle size={10} className="text-brand" />
                                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest">Feedback History</span>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                    {art.comments?.map((comment) => (
                                      <div 
                                        key={comment.id}
                                        className={cn(
                                          "p-2.5 rounded-xl text-[10px] font-bold",
                                          comment.author === 'Client' ? "bg-emerald-50 border border-emerald-100 mr-4" : 
                                          comment.author === 'Staff' ? "bg-brand/5 border border-brand/10 ml-4" :
                                          "bg-gray-50 border border-gray-100 italic opacity-60 text-center mx-4"
                                        )}
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[7px] font-black uppercase tracking-widest opacity-60">
                                            {comment.author} &bull; {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="text-text-main leading-relaxed">{comment.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* New Comment Input for Staff */}
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Send size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                                  <input 
                                    type="text"
                                    value={newComments[art.id] || ''}
                                    onChange={(e) => setNewComments(prev => ({ ...prev, [art.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddComment(art.id);
                                      }
                                    }}
                                    placeholder="Add a feedback comment..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-border shadow-sm rounded-xl text-[10px] font-bold text-text-main placeholder:text-text-light/40 focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddComment(art.id)}
                                  className="px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-all active:scale-95"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedArtwork = (formData.artwork || []).filter(a => a.id !== art.id);
                              setFormData({ ...formData, artwork: updatedArtwork });
                            }}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-text-light hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-lg border border-border rounded-[1rem] z-10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {art.status === 'Approved' && (
                          <div className="absolute top-0 right-0 py-1.5 px-6 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] -rotate-12 translate-x-5 -translate-y-1 shadow-lg shadow-emerald-500/20 z-0 border border-emerald-400">
                            Production Ready
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {(!formData.artwork || formData.artwork.length === 0) && uploadingFiles.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-text-light py-20 border-2 border-dashed border-border/20 rounded-[2.5rem] bg-gray-50/30">
                      <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-20" />
                      <h5 className="text-sm font-black uppercase tracking-widest opacity-30 italic">Pipeline Empty</h5>
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-20 mt-2">Upload initial proofs to begin client review</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-border/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Post-Production Gallery</h3>
                <p className="text-xs font-bold text-text-main mt-1">Archive photographic evidence of completed production value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <div 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (!files) return;
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64String = event.target?.result as string;
                          const newPhoto = {
                            id: Math.random().toString(36).substr(2, 9),
                            url: base64String,
                            uploadedAt: Date.now(),
                            notes: ''
                          };
                          setFormData(prev => ({
                            ...prev,
                            completionPhotos: [...(prev.completionPhotos || []), newPhoto]
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    };
                    input.click();
                  }}
                  className="bg-emerald-50/30 border-2 border-dashed border-emerald-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer min-h-[250px] group/upload"
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-emerald-500/5 border border-emerald-100 flex items-center justify-center mb-6 text-emerald-500 group-hover/upload:scale-110 transition-transform">
                    <Camera size={36} />
                  </div>
                  <h4 className="text-base font-black text-emerald-600 uppercase tracking-tighter italic leading-none">Upload Media</h4>
                  <p className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-3 max-w-[160px]">Capture final quality check photos</p>
                </div>
              </div>

              <div className="md:col-span-8">
                <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border/40">
                  {formData.completionPhotos?.slice().reverse().map((photo) => (
                    <div key={photo.id} className="relative group aspect-sqaure bg-surface rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all">
                      <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => window.open(photo.url, '_blank')}
                          className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all"
                        >
                          <ExternalLink size={20} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              completionPhotos: (prev.completionPhotos || []).filter(p => p.id !== photo.id)
                            }));
                          }}
                          className="p-3 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500/40 transition-all border border-red-500/30"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                         <p className="text-[7px] font-black text-white uppercase tracking-widest">{new Date(photo.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!formData.completionPhotos || formData.completionPhotos.length === 0) && (
                    <div className="col-span-3 h-60 flex flex-col items-center justify-center text-text-light/20 border-2 border-dashed border-border/10 rounded-[2.5rem] bg-gray-50/20">
                      <Camera size={48} strokeWidth={1} className="mb-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Vault Ready</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {currentStep === 'components' && (
            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Workflow Line Items</h3>
              <button onClick={addItem} className="flex items-center gap-2 text-xs font-black text-brand-accent hover:bg-blue-50 px-5 py-2.5 rounded-xl border border-brand-accent/20 transition-all">
                <Plus size={16} /> Add Component
              </button>
            </div>
            
            <div className="border border-border/50 rounded-2xl overflow-hidden bg-surface shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-paper border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-32">Origin</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em]">Spec & Substrate</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-20 text-center">Qty</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Dim (mm)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Prod Cost (R)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Sell Price (R)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-24">Markup</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-white">
                  {items.map((item, idx) => {
                    const product = products.find(p => p.id === item.originId);
                    const material = materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId));
                    const isArea = (item.type === 'Product' && product?.costingMethod === 'Area') || 
                                   (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));
                    const itemQuantity = item.quantity || 1;
                    const itemArea = sqMmToSqM((item.width || 0) * (item.length || 0));
                    const totalArea = itemArea * itemQuantity;
                    const lineItemGpPercent = item.totalCost 
                      ? (((item.totalPrice || 0) - item.totalCost) / item.totalCost * 100)
                      : 0;
                    
                    const itemRateVal = ((item.basePrice ?? item.totalPrice ?? 0) / (isArea ? sqMmToSqM((item.width || 0) * (item.length || 0)) * itemQuantity : itemQuantity)) || 0;
                    
                    const materialMarkup = 1 + ((settings.materialMarkupPercent ?? 40) / 100);
                    const productMarkup = 1 + ((product?.markupPercent ?? 40) / 100);
                    const activeMarkup = item.type === 'Material' ? materialMarkup : productMarkup;

                    let unitSellPrice = 0;
                    if (isArea) {
                      unitSellPrice = totalArea > 0 ? ((item.totalPrice || 0) / totalArea) : ((item.unitCost || 0) * activeMarkup);
                    } else {
                      unitSellPrice = item.totalPrice ? (item.totalPrice / itemQuantity) : 0;
                    }

                    return (
                      <tr key={item.id} className="hover:bg-brand-accent/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <select 
                            value={item.type || 'Product'}
                            onChange={(e) => updateItem(idx, { type: e.target.value as any, originId: '' })}
                            className="w-full bg-surface border border-border/40 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-accent/10"
                          >
                            <option value="Product">Product</option>
                            <option value="Material">Material</option>
                            <option value="NCR">NCR Book</option>
                            <option value="Litho">Litho Print</option>
                            <option value="Package">Package</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
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
                              <div className="space-y-3 min-w-[220px]">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenSelectorIdx(openSelectorIdx === idx ? null : idx);
                                      setSelectorSearch('');
                                      setSelectedSelectorGroup('All');
                                    }}
                                    className="w-full bg-white border border-border/50 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-tight text-left text-brand flex justify-between items-center focus:ring-4 focus:ring-brand/5 shadow-sm"
                                  >
                                    <span className="truncate">
                                      {selectedItemName || "Choose Item & Category..."}
                                    </span>
                                    <ChevronRight size={14} className={cn("transition-transform text-slate-400 shrink-0 ml-2", openSelectorIdx === idx && "rotate-90")} />
                                  </button>

                                  {openSelectorIdx === idx && (
                                    <div className="absolute left-0 mt-2 w-[350px] bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200">
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
                                      <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1">
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
                                                return (
                                                  <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                      updateItem(idx, { type: 'Product', originId: p.id });
                                                      addToRecent(p.id);
                                                      setOpenSelectorIdx(null);
                                                    }}
                                                    className="w-full text-left text-xs px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-bold flex items-center justify-between animate-in duration-100"
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
                                                      className="w-full text-left font-bold transition-all p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl flex items-center justify-between text-[10px]"
                                                    >
                                                      <div className="truncate pr-2">
                                                        <p className="truncate text-[10px] font-black">{m.name}</p>
                                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded block w-fit mt-0.5">{m.category || 'Substrate'}</span>
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

                                {item.type !== 'Material' && (
                                  <div className="flex flex-col gap-1.5 mt-1.5">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select 
                                        value={item.materialId || ''}
                                        onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                                        className="w-full bg-surface border border-border/40 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-tight focus:ring-2 focus:ring-brand/10 outline-none transition-all"
                                      >
                                        <option value="">Substrate...</option>
                                        {materials.map(m => (
                                          <option key={m.id} value={m.id}>{m.name} (Qty: {m.stockLevel})</option>
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
                                    
                                    {/* Stock Reservation & Shortage Indicators */}
                                    {(() => {
                                      const material = materials.find(m => m.id === item.materialId);
                                      if (!material) return null;
                                      const alloc = checkMaterialAllocation(item as any, material);
                                      if (!alloc) return null;
                                      return (
                                        <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[8px] space-y-1 text-left">
                                          <div className="flex justify-between items-center font-black uppercase">
                                            <span className="text-text-light">Substrate Allocation</span>
                                            <span className={cn(alloc.isShortage ? "text-red-600 animate-pulse font-extrabold" : "text-emerald-600")}>
                                              {alloc.isShortage ? "Stock Shortage" : "Stock Reserved"}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center font-bold text-text-muted">
                                            <span>Required: {alloc.requiredAmount.toFixed(1)} {alloc.unit}</span>
                                            <span>Available: {alloc.stockLevel.toFixed(1)} {alloc.unit}</span>
                                          </div>
                                          {alloc.isShortage && (
                                            <div className="pt-1.5 border-t border-red-100 mt-1">
                                              <p className="font-bold text-red-500 uppercase tracking-wide leading-none mb-1">Stock substitute suggestion:</p>
                                              {materials.filter(m => m.category === material.category && m.id !== material.id && m.stockLevel >= alloc.requiredAmount).slice(0, 1).map(sub => (
                                                <button
                                                  key={sub.id}
                                                  type="button"
                                                  onClick={() => {
                                                    updateItem(idx, { materialId: sub.id });
                                                    toast.success(`Substituted with ${sub.name} successfully.`);
                                                  }}
                                                  className="w-full bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1 flex items-center justify-between font-black uppercase transition-all mt-1"
                                                >
                                                  <span>Use {sub.name}</span>
                                                  <span>Stock: {sub.stockLevel}</span>
                                                </button>
                                              ))}
                                              {materials.filter(m => m.category === material.category && m.id !== material.id && m.stockLevel >= alloc.requiredAmount).length === 0 && (
                                                <span className="text-text-light italic">No matching alternative stock.</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Dynamic templates spec forms container */}
                                {categoryGroup === 'Litho Printing' && (
                                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Printer size={12} /> Litho Printing Specs
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Finished Size</label>
                                      <select 
                                        value={item.specsSnapshot?.finishedSize || 'A4'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), finishedSize: e.target.value } })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Book size={12} /> NCR Specifications
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">NCR Sets</label>
                                      <select 
                                        value={item.specsSnapshot?.parts || 'Duplicate'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), parts: e.target.value } })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Duplicate">Duplicate (2 Part)</option>
                                        <option value="Triplicate">Triplicate (3 Part)</option>
                                        <option value="Quadruplicate">Quadruplicate (4 Part)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Sets/Book</label>
                                      <input 
                                        type="number" 
                                        value={item.specsSnapshot?.setsPerBook || 50}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), setsPerBook: Number(e.target.value) } })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Start Seq No</label>
                                      <input 
                                        type="text" 
                                        value={item.startNumber || ''}
                                        onChange={(e) => updateItem(idx, { startNumber: e.target.value })}
                                        placeholder="e.g. 0501"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">End Seq No</label>
                                      <input 
                                        type="text" 
                                        value={item.endNumber || ''}
                                        onChange={(e) => updateItem(idx, { endNumber: e.target.value })}
                                        placeholder="e.g. 1000"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] text-left animate-in duration-200">
                                    <div className="col-span-2 font-black uppercase text-slate-400 text-[9px] flex items-center gap-1.5 border-b pb-1.5 mb-1.5">
                                      <Award size={12} /> Exhibition/Display Specs
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold uppercase text-slate-400 mb-0.5">Frame mechanicals</label>
                                      <select 
                                        value={item.specsSnapshot?.frameGrade || 'Standard'}
                                        onChange={(e) => updateItem(idx, { specsSnapshot: { ...(item.specsSnapshot || {}), frameGrade: e.target.value } })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="Sale">Direct purchase</option>
                                        <option value="Rental">Temporary Rental</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {categoryGroup === 'Custom Products' && (
                                  <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl text-[10px] text-left animate-in duration-200">
                                    <div className="col-span-2 font-black uppercase text-emerald-800 text-[9px] flex items-center gap-1.5 border-b border-emerald-100 pb-1.5 mb-1.5">
                                      <Sliders size={12} className="text-emerald-600" /> Custom Flat Adjustment
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-[8px] text-emerald-700 font-medium leading-relaxed">No substrate constraints. Direct cost override pricing.</p>
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
                            className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-[10px] text-text-light italic"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            value={(item.quantity === null || item.quantity === undefined || isNaN(item.quantity)) ? '' : item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-base text-text-main tabular-nums text-center"
                          />
                        </td>
                        <td className="px-4 py-4">
                          {isArea ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                  onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                  className="w-full bg-surface/50 border border-border/20 px-1 py-1 text-center text-[10px] font-black tabular-nums rounded"
                                  placeholder="W"
                                />
                                <span className="text-[8px] font-black text-text-light opacity-30">×</span>
                                <input 
                                  type="number" 
                                  value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                  onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                  className="w-full bg-surface/50 border border-border/20 px-1 py-1 text-center text-[10px] font-black tabular-nums rounded"
                                  placeholder="L"
                                />
                              </div>
                              <span className="text-[8px] font-black text-text-light uppercase tracking-widest opacity-40 text-center">
                                {sqMmToSqM((item.width || 0) * (item.length || 0) * itemQuantity).toFixed(2)}m²
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-text-light opacity-30 tracking-widest flex justify-center">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col border border-border/40 rounded-lg p-2 bg-gray-50/50">
                            <div className="flex items-center gap-1 mb-1 border-b border-border/10 pb-1">
                               <span className="text-[8px] font-black text-text-light italic">UNIT</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.unitCost || 0}
                                  onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-text-main tabular-nums text-right"
                               />
                            </div>
                            <div className="flex items-center gap-1">
                               <span className="text-[9px] font-black text-red-500">R</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.totalCost || 0}
                                  onChange={(e) => updateItem(idx, { totalCost: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs font-black text-red-500 tabular-nums text-right"
                               />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[140px]">
                          <div className="flex flex-col border border-brand/20 rounded-lg p-2 bg-brand/5 gap-1.5">
                             <div className="flex items-center gap-1 mb-1 border-b border-brand/10 pb-1">
                               <span className="text-[8px] font-black text-brand italic">RATE</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={itemRateVal}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const factor = isArea ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * itemQuantity) : itemQuantity;
                                    updateItem(idx, { basePrice: val * factor });
                                  }}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-brand tabular-nums text-right"
                               />
                            </div>
                            
                            <div className="flex items-center gap-1">
                               <span className="text-[8px] font-black text-brand opacity-60">BASE:</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.basePrice ?? item.totalPrice ?? 0}
                                  onChange={(e) => updateItem(idx, { basePrice: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] font-black text-brand opacity-80 tabular-nums text-right"
                               />
                            </div>
                            
                            <div className="flex items-center gap-1 mt-0.5 bg-white/50 border border-brand/10 rounded px-1 w-full">
                              <select 
                                value={item.discountType || 'percentage'}
                                onChange={(e) => updateItem(idx, { discountType: e.target.value as any })}
                                className="bg-transparent text-[8px] font-bold text-text-light uppercase border-none p-0 focus:ring-0 shrink-0 outline-none w-10"
                              >
                                <option value="percentage">%</option>
                                <option value="amount">R-</option>
                              </select>
                              <input
                                type="number"
                                placeholder="Disc"
                                value={item.discountValue || ''}
                                onChange={(e) => updateItem(idx, { discountValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] text-right text-amber-600 font-bold placeholder:text-text-light/30 tabular-nums"
                              />
                            </div>

                            <div className="flex items-center gap-1 mt-1 pt-1 border-t border-brand/20">
                               <span className="text-[10px] font-black text-brand">R</span>
                               <div className="w-full text-xs font-black text-brand tabular-nums text-right">
                                 {item.totalPrice?.toFixed(2) || '0.00'}
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border",
                            ((item.totalPrice || 0) - (item.totalCost || 0)) >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
                          )}>
                             <span className="text-[10px] font-black italic tracking-tighter">
                               R {((item.totalPrice || 0) - (item.totalCost || 0)).toFixed(2)}
                             </span>
                             <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">
                               {lineItemGpPercent.toFixed(0)}% GP
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeItem(idx)} className="text-text-light hover:text-red-500 transition-colors opacity-30 hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-text-muted font-bold italic opacity-40 text-[10px] uppercase tracking-widest">
                        Workflow is empty. Add components to begin fabrication job.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {currentStep === 'workflow' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-4 text-left">
                <div>
                  <h3 className="text-sm font-black text-text-main tracking-widest uppercase">Factory Production Sequence</h3>
                  <p className="text-xs text-text-light">Milestones generated from dynamic specifications triggers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newStages = [...(formData.workflowStages || [])];
                    newStages.push({
                      id: 'Finishing',
                      name: 'Custom Process Step',
                      status: 'Pending',
                      estimatedDurationMinutes: 30,
                      notes: ''
                    });
                    setFormData({ ...formData, workflowStages: newStages });
                    toast.success('Added customized production step');
                  }}
                  className="px-4 py-2 text-xs font-bold text-brand hover:bg-blue-50 border border-brand/20 rounded-xl flex items-center gap-1.5 transition-all min-h-[40px]"
                >
                  <Plus size={14} /> Add Custom Step
                </button>
              </div>

              {(!formData.workflowStages || formData.workflowStages.length === 0) ? (
                <div className="py-12 text-center text-text-light border-2 border-dashed border-border/60 rounded-3xl">
                  <Layers className="mx-auto mb-3 opacity-35" size={24} />
                  <p className="text-xs font-black uppercase tracking-widest text-text-muted">No sequenced workflow generated yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const stages = generateWorkflowStages(formData.productName);
                      setFormData(prev => ({ ...prev, workflowStages: stages }));
                      toast.success(`Generated standard ${stages.length}-stage sequence.`);
                    }}
                    className="mt-4 px-4 py-2 bg-brand text-white border border-brand rounded-xl font-bold text-[10px] uppercase tracking-wider min-h-[40px]"
                  >
                    Auto-Generate Stages
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {formData.workflowStages.map((stage, idx) => {
                    return (
                      <div key={idx} className="bg-white border border-border/50 hover:border-brand/30 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                              <h4 className="text-xs font-black text-text-main uppercase tracking-tight">{stage.name}</h4>
                            </div>
                            <p className="text-[10px] text-text-light font-bold mt-1 uppercase tracking-widest">{stage.id} Section</p>
                          </div>
                          
                          <div className="flex bg-surface p-0.5 rounded-xl border border-border/40 shrink-0">
                            {['Pending', 'In Progress', 'Completed', 'Delayed'].map((st) => {
                              const isSel = stage.status === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.workflowStages || [])];
                                    const stageUpdate: any = { ...stage, status: st };
                                    if (st === 'In Progress') stageUpdate.startedAt = Date.now();
                                    if (st === 'Completed') stageUpdate.completedAt = Date.now();
                                    updated[idx] = stageUpdate;
                                    setFormData({ ...formData, workflowStages: updated });
                                    toast.success(`Stage "${stage.name}" updated to ${st}`);
                                  }}
                                  className={cn(
                                    "px-1.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                    isSel 
                                      ? st === 'Completed' ? "bg-emerald-500 text-white shadow-sm"
                                        : st === 'In Progress' ? "bg-blue-500 text-white shadow-sm"
                                        : st === 'Delayed' ? "bg-red-500 text-white shadow-sm"
                                        : "bg-amber-500 text-white shadow-sm"
                                      : "text-text-light hover:text-text-main hover:bg-gray-100"
                                  )}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-dashed border-border/60">
                          <div>
                            <label className="block text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Operator Name</label>
                            <input
                              type="text"
                              value={stage.operator || ''}
                              onChange={(e) => {
                                const updated = [...(formData.workflowStages || [])];
                                updated[idx] = { ...stage, operator: e.target.value };
                                setFormData({ ...formData, workflowStages: updated });
                              }}
                              placeholder="Name..."
                              className="w-full bg-surface border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-black tracking-tight"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Duration (Mins)</label>
                            <input
                              type="number"
                              value={stage.estimatedDurationMinutes || 15}
                              onChange={(e) => {
                                const updated = [...(formData.workflowStages || [])];
                                updated[idx] = { ...stage, estimatedDurationMinutes: Number(e.target.value) };
                                setFormData({ ...formData, workflowStages: updated });
                              }}
                              className="w-full bg-surface border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-black tracking-tight"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Operational Comments</label>
                          <input
                            type="text"
                            value={stage.notes || ''}
                            onChange={(e) => {
                              const updated = [...(formData.workflowStages || [])];
                              updated[idx] = { ...stage, notes: e.target.value };
                              setFormData({ ...formData, workflowStages: updated });
                            }}
                            placeholder="Add notes..."
                            className="w-full bg-surface border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-text-main"
                          />
                        </div>

                        {stage.status === 'Completed' && stage.completedAt && (
                          <div className="mt-3 text-right">
                            <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                              Done at {new Date(stage.completedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.workflowStages || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, workflowStages: updated });
                              toast.success('Removed workflow stage');
                            }}
                            className="text-[8px] font-black tracking-wider uppercase text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                          >
                            Delete Step
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep === 'costing' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div>
                <h3 className="text-sm font-black text-text-main tracking-widest uppercase mb-1">Raw Job Costing Breakdown</h3>
                <p className="text-xs text-text-light">Real estimated business pricing allocations across materials, presses, and finishing overheads.</p>
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center text-text-light border-2 border-dashed border-border/60 rounded-3xl">
                  <PackageIcon className="mx-auto mb-3 opacity-30" size={24} />
                  <p className="text-xs font-bold uppercase tracking-widest">Add components first to estimate production overheads.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId || p.id === item.originId);
                    const material = materials.find(m => m.id === item.materialId);
                    const machine = machines.find(m => m.id === item.machineId);
                    
                    const details = calculateItemCostDetails(item as QuoteItem, product, material, machine, settings);
                    return (
                      <div key={idx} className="bg-white border border-border hover:border-brand/40 hover:shadow-md rounded-2xl p-6 transition-all space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <h4 className="text-xs font-black text-text-main uppercase tracking-tight">Component #{idx + 1}: {item.description || 'Custom Item'}</h4>
                            <p className="text-[9px] text-text-light font-bold uppercase tracking-widest mt-0.5">Quantity: {item.quantity} | Dimensions: {item.width || 0} x {item.length || 0} mm</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[9px] text-text-light font-black uppercase tracking-widest">Recommended Sell Price</p>
                            <p className="text-sm font-black text-brand italic">R {details.recommendedPrice.toFixed(2)}</p>
                          </div>
                        </div>

                        {details.warningState === 'negative-margin' && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                            <AlertCircle size={16} />
                            <span>CRITICAL MARGIN DEFICIT: FINAL SELL PRICE (R {item.totalPrice?.toFixed(2)}) IS BELOW MANUFACTURING COST (R {details.totalProductionCost.toFixed(2)})!</span>
                          </div>
                        )}

                        {details.warningState === 'low-margin' && (
                          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>WARNING: Gross profit margin ({details.marginPercent.toFixed(1)}%) is under the recommended limit.</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Material Cost</span>
                            <span className="text-xs font-bold text-text-main block mt-1">R {details.materialCost.toFixed(2)}</span>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Machine Oper. Run</span>
                            <span className="text-xs font-bold text-text-main block mt-1">R {details.machineCost.toFixed(2)}</span>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Finishing & Setup Labor</span>
                            <span className="text-xs font-bold text-text-main block mt-1">R {details.laborFinishingCost.toFixed(2)}</span>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Overheads Buffer (10%)</span>
                            <span className="text-xs font-bold text-text-main block mt-1">R {details.overheadCost.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Total Raw Cost Price</span>
                            <span className="text-sm font-black text-text-main block">R {details.totalProductionCost.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest block">Calculated GP Margin</span>
                            <span className={cn(
                              "text-sm font-black block",
                              details.marginPercent < 0 ? "text-red-600" :
                              details.marginPercent < 20 ? "text-orange-600" : "text-emerald-600"
                            )}>
                              {details.marginPercent.toFixed(1)}% (R {details.marginAmount.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border bg-slate-50 p-6 rounded-3xl flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-text-light uppercase tracking-widest">Aggregate Costs Summary</h4>
                      <p className="text-lg font-black text-text-main mt-1">Production cost: R {items.reduce((acc, item) => {
                        const product = products.find(p => p.id === item.productId || p.id === item.originId);
                        const material = materials.find(m => m.id === item.materialId);
                        const machine = machines.find(m => m.id === item.machineId);
                        return acc + (calculateItemCostDetails(item as QuoteItem, product, material, machine, settings).totalProductionCost);
                      }, 0).toFixed(2)}</p>
                    </div>

                    <div className="text-right">
                      <h4 className="text-xs font-black text-text-light uppercase tracking-widest">Client Final Value (Excl VAT)</h4>
                      <p className="text-2xl font-black text-brand italic">R {totalExclVatVal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 bg-paper border-t border-border no-print">
          <div className="grid grid-cols-4 gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 leading-none">Total Production Cost</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-3xl font-black text-red-500 tracking-tighter italic tabular-nums">
                  {items.reduce((sum, item) => sum + (item.totalCost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-2 leading-none">Gross Profit (GP)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tighter italic tabular-nums">
                  {totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 leading-none">GP Margin</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-text-main tracking-tighter italic tabular-nums">
                  {aggregateGpPercentVal.toFixed(1)}
                </span>
                <span className="text-xs font-black text-text-light">%</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2 leading-none">Invoiced Value (Incl. VAT)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-4xl font-black text-brand tracking-tighter italic tabular-nums">
                  {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-border">
            <div className="flex items-center gap-4">
               {/* Metadata / Logs */}
               <div className="px-4 py-2 bg-gray-50 rounded-xl border border-border/50">
                  <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-0.5">Automated Calculation</span>
                  <span className="text-[10px] font-black text-text-main uppercase tracking-tighter italic">Precision Grade-A Logic Applied</span>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              {job && (
                <div className="flex items-center gap-2 mr-6 border-r border-border pr-6">
                  <button 
                    onClick={handleDownloadPDF}
                    title="Download Job Card PDF"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handlePrintPDF}
                    title="Print Job Card"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleEmailPDF}
                    title="Send via Email"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-amber-500 hover:border-amber-500 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleArtworkWhatsAppShare}
                    title="Send Artwork for Approval (WhatsApp)"
                    disabled={isProcessing}
                    className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleWhatsAppShare}
                    title="Share via WhatsApp"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                </div>
              )}
              <button 
                onClick={() => setShowSaveTemplate(true)} 
                type="button"
                className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-purple-600 hover:bg-purple-50 border border-purple-200 transition-all mr-auto"
              >
                Save as Template
              </button>
              <button onClick={onClose} disabled={isSaving || isProcessing} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-text-muted hover:bg-surface border border-border/50 transition-all disabled:opacity-50">Abort Entry</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isProcessing}
                className="px-10 py-4 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-70 disabled:translate-y-0"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={18} strokeWidth={3} />
                )}
                {isSaving ? 'Synchronizing...' : 'Commit to Registry'}
              </button>
            </div>
          </div>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-200 animate-in zoom-in duration-500 delay-100">
              <CheckCircle2 size={40} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Registry Updated</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Production flow has been recalculated</p>
          </div>
        )}

        {showSaveTemplate && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-border p-8 max-w-md w-full">
              <h3 className="text-2xl font-black text-text-main tracking-tighter mb-2">Save as Template</h3>
              <p className="text-xs text-text-light mb-6">Create a reusable template from this job configuration.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Standard Business Cards"
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setShowSaveTemplate(false)}
                    className="px-6 py-3 rounded-xl font-bold text-xs text-text-light hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-200 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
