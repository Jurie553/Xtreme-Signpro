import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Tag, Edit2, Trash2, X, Eye, Layers, Settings,
  ArrowRight, Cpu, Sparkles, Scale, Info, BookOpen, Clock, Copy, Shield,
  Database, RefreshCw, Check, CheckSquare, Square, ToggleLeft, ToggleRight, Trash, RotateCcw,
  FileText, ArrowDown, ArrowUp, Zap, HelpCircle, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Product, Material, Machine, Department, PricingSettings, ProductCategory } from '../types';
import { getActivePricingSettings } from '../lib/pricingService';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';
import QuoteModal from '../components/QuoteModal';

// Help helper for linking category -> calculator
const getCalculatorInfo = (categoryName: string) => {
  const norm = categoryName?.toLowerCase() || '';
  if (norm.includes('ncr') || norm.includes('duplicate') || norm.includes('triplicate')) {
    return { name: 'NCR Books Calculator', path: '/ncr-books', code: 'NCR' };
  }
  if (norm.includes('litho') || norm.includes('offset') || norm.includes('booklet') || norm.includes('brochure') || norm.includes('flyer') || norm.includes('business card') || norm.includes('letterhead') || norm.includes('digital')) {
    return { name: 'Litho & Book Calculator', path: '/litho-products', code: 'Litho' };
  }
  if (norm.includes('banner') || norm.includes('poster') || norm.includes('correx') || norm.includes('sign') || norm.includes('gazebo') || norm.includes('canvas') || norm.includes('sticker') || norm.includes('label') || norm.includes('large format') || norm.includes('backdrop') || norm.includes('wall')) {
    return { name: 'Large Format Substrates Calculator', path: '/quotes', code: 'LF' };
  }
  return { name: 'Standard General Pricing', path: '/quotes', code: 'General' };
};

export default function Products() {
  const { data: products, loading: pLoading } = useCollection<Product>('products');
  const { data: dbCategories, loading: catLoading } = useCollection<ProductCategory>('product_categories');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: departments } = useCollection<Department>('departments');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  
  // Costing setup tables
  const { data: rawPapers } = useCollection<any>('litho_paper_stock');
  const { data: rawFinishings } = useCollection<any>('litho_finishing_options');
  const { data: rawCostingMachines } = useCollection<any>('litho_costing_machines');

  const pricingSettings = getActivePricingSettings(settingsList);
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'categories' | 'archive'>('catalog');
  
  // Role simulation state (for Permission-based features: Req #12)
  const [isAdmin, setIsAdmin] = useState(true);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // Active / Inactive
  const [selectedType, setSelectedType] = useState('All'); // Product / NCR / Litho
  
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'category' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Product Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToProcess, setProductToProcess] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Category Modals & State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<Partial<ProductCategory>>({
    name: '',
    description: '',
    type: 'Product',
    productGroup: 'Small Format',
    active: true
  });

  // Quote items prefill modal trigger
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);

  // Sorting Handler
  const toggleSort = (field: 'name' | 'date' | 'category' | 'price') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // 1. Process Active Product Catalog (Only non-archived items)
  const activeProducts = useMemo(() => {
    return products.filter(p => !p.isArchived);
  }, [products]);

  // 2. Process Archived Product Catalog
  const archivedProducts = useMemo(() => {
    return products.filter(p => p.isArchived);
  }, [products]);

  // Filters application
  const filteredProducts = useMemo(() => {
    const list = activeTab === 'archive' ? archivedProducts : activeProducts;
    return list.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.defaultSize && p.defaultSize.toLowerCase().includes(searchTerm.toLowerCase()));
                          
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory || p.categoryName === selectedCategory;
      const matchDepartment = selectedDepartment === 'All' || p.department === selectedDepartment || p.defaultDepartmentId === selectedDepartment;
      
      const statusBool = selectedStatus === 'Active';
      const matchStatus = selectedStatus === 'All' || (p.isActive !== false && p.active !== false) === statusBool;
      const matchType = selectedType === 'All' || p.productType === selectedType;
      
      return matchSearch && matchCategory && matchDepartment && matchStatus && matchType;
    }).sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'date') {
        valA = a.createdAt || 0;
        valB = b.createdAt || 0;
      } else if (sortBy === 'category') {
        valA = (a.category || '').toLowerCase();
        valB = (b.category || '').toLowerCase();
      } else if (sortBy === 'price') {
        valA = a.baseCost || 0;
        valB = b.baseCost || 0;
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeProducts, archivedProducts, activeTab, searchTerm, selectedCategory, selectedDepartment, selectedStatus, selectedType, sortBy, sortOrder]);

  // Product Actions
  const handleEdit = (product: Product) => {
    if (!isAdmin) {
      toast.error('Admin role required to edit product parameters.');
      return;
    }
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleClone = (product: Product) => {
    if (!isAdmin) {
      toast.error('Admin role required to clone products.');
      return;
    }
    const { id, ...cleanData } = product;
    const cloned: Product = {
      ...cleanData,
      id: '',
      name: `${product.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setEditingProduct(cloned);
    setIsModalOpen(true);
    toast.success('Specifications copied to draft.');
  };

  const triggerArchive = (id: string) => {
    if (!isAdmin) {
      toast.error('Admin permission is demanded to archive specifications.');
      return;
    }
    setProductToProcess(id);
    setIsArchiveConfirmOpen(true);
  };

  const confirmArchive = async () => {
    if (!productToProcess) return;
    setIsProcessingAction(true);
    try {
      await updateDocument('products', productToProcess, { isArchived: true, updatedAt: Date.now() });
      toast.success('Product cataloged in historical archives.');
      setIsArchiveConfirmOpen(false);
    } catch {
      toast.error('Error shifting product to archives.');
    } finally {
      setIsProcessingAction(false);
      setProductToProcess(null);
    }
  };

  const triggerRestore = async (id: string) => {
    if (!isAdmin) {
      toast.error('Admin permission needed to restore catalog items.');
      return;
    }
    try {
      await updateDocument('products', id, { isArchived: false, updatedAt: Date.now() });
      toast.success('Product restored back into active catalogs.');
    } catch {
      toast.error('Error restoring active catalog specifications.');
    }
  };

  const triggerDeletePermanent = (id: string) => {
    if (!isAdmin) {
      toast.error('Admin permission required for permanent elimination.');
      return;
    }
    setProductToProcess(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeletePermanent = async () => {
    if (!productToProcess) return;
    setIsProcessingAction(true);
    try {
      await deleteDocument('products', productToProcess);
      toast.success('Product completely removed from database indexes.');
      setIsDeleteConfirmOpen(false);
    } catch {
      toast.error('Failed to permanently erase product data.');
    } finally {
      setIsProcessingAction(false);
      setProductToProcess(null);
    }
  };

  // Category Actions
  const handleOpenNewCategory = () => {
    if (!isAdmin) {
      toast.error('Admin credentials required to create product classes.');
      return;
    }
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      description: '',
      type: 'Product',
      productGroup: 'Small Format',
      active: true
    });
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: ProductCategory) => {
    if (!isAdmin) {
      toast.error('Admin permission needed to edit categories.');
      return;
    }
    setEditingCategory(cat);
    setCategoryFormData({ ...cat });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name?.trim()) {
      toast.error('Category name is mandatory.');
      return;
    }
    
    const slug = categoryFormData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const payload = {
      ...categoryFormData,
      slug,
      updatedAt: Date.now()
    };

    try {
      if (editingCategory) {
        await updateDocument('product_categories', editingCategory.id, payload);
        toast.success(`Category '${categoryFormData.name}' revised.`);
      } else {
        await createDocument('product_categories', {
          ...payload,
          createdAt: Date.now()
        });
        toast.success(`New Category '${categoryFormData.name}' registered.`);
      }
      setIsCategoryModalOpen(false);
    } catch {
      toast.error('Writing category metadata failed.');
    }
  };

  const handleToggleCategoryActive = async (cat: ProductCategory) => {
    if (!isAdmin) return;
    try {
      await updateDocument('product_categories', cat.id, { active: !cat.active, updatedAt: Date.now() });
      toast.success(`Category visibility updated.`);
    } catch {
      toast.error('Error toggling category status.');
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 animate-in fade-in duration-500">
      
      {/* Simulation Privilege Strip */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-accent/20 rounded-2xl text-brand-accent">
            <Shield size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-white tracking-tight uppercase italic font-serif">Workspace Role Security Simulation</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Current state: <span className={cn("text-xs font-black px-2 py-0.5 rounded-md", isAdmin ? "bg-emerald-500/20 text-emerald-400" : "bg-teal-500/20 text-teal-400")}>{isAdmin ? 'Administrator Mode' : 'Standard User Mode'}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-3 transition-all active:scale-95",
            isAdmin ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          )}
        >
          {isAdmin ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          <span>{isAdmin ? 'Simulate Standard User' : 'Simulate Administrator'}</span>
        </button>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic text-brand-accent font-serif leading-none">Standard Specs Matrix</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Product specifications & database-driven costing setup</p>
        </div>
        
        {/* Module Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeTab === 'catalog' ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Layers size={14} />
            Active Catalog ({activeProducts.length})
          </button>
          
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('categories')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                  activeTab === 'categories' ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <Settings size={14} />
                Categories Setup ({dbCategories.length})
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                  activeTab === 'archive' ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <BookOpen size={14} />
                Archived ({archivedProducts.length})
              </button>
            </>
          )}
        </div>
      </header>

      {/* Primary Workspace Tab Panel */}
      {activeTab === 'catalog' || activeTab === 'archive' ? (
        <div className="space-y-6">
          
          {/* Controls Belt */}
          <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Query catalog by name, category, dimensions..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-inner"
                />
              </div>

              {/* Responsive Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {dbCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>

                <select 
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider focus:outline-none"
                >
                  <option value="All">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>

                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>

                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider focus:outline-none"
                >
                  <option value="All">All Types</option>
                  <option value="Product">Standard Product</option>
                  <option value="Litho">Litho Print</option>
                  <option value="NCR">Carbonless NCR</option>
                </select>

                {/* Grid vs Table Mode */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/30">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn("p-1.5 rounded-md text-xs", viewMode === 'grid' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                  >
                    Grid
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={cn("p-1.5 rounded-md text-xs", viewMode === 'table' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                  >
                    Table
                  </button>
                </div>

                {isAdmin && activeTab === 'catalog' && (
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setIsModalOpen(true);
                    }}
                    className="ml-auto bg-brand-accent text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Add Product
                  </button>
                )}
              </div>
            </div>

            {/* Sorters Bar */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Sort results:</span>
              <button 
                onClick={() => toggleSort('name')}
                className={cn("flex items-center gap-1", sortBy === 'name' ? "text-brand-accent font-black" : "")}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
              <button 
                onClick={() => toggleSort('date')}
                className={cn("flex items-center gap-1", sortBy === 'date' ? "text-brand-accent font-black" : "")}
              >
                Date Created {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
              <button 
                onClick={() => toggleSort('category')}
                className={cn("flex items-center gap-1", sortBy === 'category' ? "text-brand-accent font-black" : "")}
              >
                Category {sortBy === 'category' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
              <button 
                onClick={() => toggleSort('price')}
                className={cn("flex items-center gap-1", sortBy === 'price' ? "text-brand-accent font-black" : "")}
              >
                Base Cost {sortBy === 'price' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </button>
            </div>
          </div>

          {/* Product Data List Area */}
          {pLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading active digital catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center bg-white border border-slate-150 rounded-[3rem] gap-4 p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                <Tag size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-700 tracking-tight uppercase italic font-serif">No products have been added yet...</h3>
              <p className="text-xs text-slate-400 max-w-md uppercase tracking-wider leading-relaxed">
                {activeTab === 'archive' 
                  ? 'There are no historical specifications matches' 
                  : 'No active catalog profiles found. Standard specs matrix catalog is currently unpopulated.'}
              </p>
              {isAdmin && activeTab === 'catalog' && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand-accent text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:opacity-95 transition-all active:scale-95"
                >
                  Add Product
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(p => {
                const isItemActive = p.isActive !== false && p.active !== false;
                const calcInfo = getCalculatorInfo(p.category || '');
                const machineObj = machines.find(m => m.id === p.defaultMachineId);
                const substrateObj = materials.find(m => m.id === p.defaultMaterialId);
                
                return (
                  <div key={p.id} className={cn(
                    "bg-white border border-slate-200/70 p-6 rounded-[2.5rem] flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 relative group",
                    !isItemActive && "opacity-75"
                  )}>
                    
                    {/* Floating image / default placeholder */}
                    <div className="w-full h-32 bg-slate-50 border border-slate-100 rounded-[1.8rem] mb-4 flex items-center justify-center overflow-hidden relative">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-350">
                          <ImageIcon size={28} />
                          <span className="text-[8px] font-black uppercase tracking-widest">{p.productType || 'Standard'} Profile</span>
                        </div>
                      )}
                      
                      {/* Live Calculator Tag */}
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900 border border-slate-800 text-[8px] font-black tracking-widest text-white uppercase rounded-lg shadow-sm">
                        {p.productType || 'Product'}
                      </span>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-[8px] font-black tracking-widest text-slate-500 uppercase rounded border border-slate-200/40">
                        {p.category}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-[7.5px] font-black rounded uppercase tracking-wider",
                        isItemActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200/30" : "bg-red-50 text-red-600 border border-red-200/30"
                      )}>
                        {isItemActive ? 'Active' : 'Draft/Offline'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 line-clamp-1 uppercase tracking-tight italic font-serif mt-1">
                      {p.name}
                    </h4>
                    
                    <p className="text-[10px] font-semibold text-slate-400 line-clamp-2 mt-1 leading-relaxed min-h-[2.5rem]">
                      {p.description || "No specifications description compiled."}
                    </p>

                    {/* Operational costing indicators */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-450">
                      <div>
                        <span className="block text-[7px] text-slate-350 tracking-normal mb-0.5">Base cost</span>
                        <span className="text-slate-700 font-extrabold">R {p.baseCost?.toFixed(2) || '0,00'}</span>
                      </div>
                      <div>
                        <span className="block text-[7px] text-slate-350 tracking-normal mb-0.5">Markup profit</span>
                        <span className="text-emerald-600 font-extrabold">+{p.markupPercentage ?? p.markupPercent ?? 40}%</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[7px] text-slate-350 tracking-normal mb-0.5">Assigned substrate</span>
                        <span className="text-slate-700 font-extrabold line-clamp-1">{substrateObj?.name || p.dimensions || 'Manual sizing matrix'}</span>
                      </div>
                    </div>

                    {/* Dynamic paired calculator note */}
                    <div className="mt-4 p-3 bg-slate-55 rounded-2xl border border-slate-100/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                          <Cpu size={11} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-650 line-clamp-1">{calcInfo.name}</span>
                      </div>
                    </div>

                    {/* Interactive workflow tools (Req #7) */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setPrefilledItem({ type: p.productType === 'NCR' ? 'NCR' : p.productType === 'Litho' ? 'Litho' : 'Product', originId: p.id, quantity: p.minimumOrderQuantity || 1 });
                            setIsQuoteModalOpen(true);
                          }}
                          className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-xl text-[8.5px] font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12} />
                          Quote Builder
                        </button>
                        
                        <a 
                          href={calcInfo.path}
                          className="px-3 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 shrink-0"
                          title="Jump directly to linked pricing Calculator"
                        >
                          <Zap size={12} />
                          Calculator
                        </a>
                      </div>

                      {/* Administrative overlays */}
                      <div className="flex justify-end gap-1 pt-2">
                        <button 
                          onClick={() => setViewingProduct(p)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                          title="View Parameters"
                        >
                          <Eye size={13} />
                        </button>
                        
                        {isAdmin && activeTab === 'catalog' && (
                          <>
                            <button 
                              onClick={() => handleClone(p)}
                              className="p-2 bg-slate-5/50 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-slate-700"
                              title="Clone"
                            >
                              <Copy size={13} />
                            </button>
                            <button 
                              onClick={() => handleEdit(p)}
                              className="p-2 bg-slate-5/50 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-brand-accent"
                              title="Edit specifications"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => triggerArchive(p.id)}
                              className="p-2 bg-slate-5/50 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-red-500"
                              title="Archive specs"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}

                        {isAdmin && activeTab === 'archive' && (
                          <>
                            <button 
                              onClick={() => triggerRestore(p.id)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                              title="Restore specifications"
                            >
                              <RotateCcw size={12} />
                              Restore
                            </button>
                            <button 
                              onClick={() => triggerDeletePermanent(p.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
                              title="Delete permanently"
                            >
                              <Trash size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                      <th className="px-8 py-5">Product Spec Matrix</th>
                      <th className="px-8 py-5">Operational Class</th>
                      <th className="px-8 py-5">Pairing Machine</th>
                      <th className="px-8 py-5">Substrate</th>
                      <th className="px-8 py-5">Base rate</th>
                      <th className="px-8 py-5">Markup</th>
                      <th className="px-8 py-5 text-right">Interactive actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProducts.map(p => {
                      const isItemActive = p.isActive !== false && p.active !== false;
                      const machineName = machines.find(m => m.id === p.defaultMachineId)?.name || 'N/A';
                      const materialName = materials.find(m => m.id === p.defaultMaterialId)?.name || 'Manual Selection';
                      const calcInfo = getCalculatorInfo(p.category || '');
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-brand-accent shrink-0 overflow-hidden">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Tag size={16} />
                                )}
                              </div>
                              <div>
                                <h5 className="font-extrabold text-slate-800 uppercase italic font-serif leading-none">{p.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{p.productType || 'Standard'} / {p.dimensions || 'Any dimension'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-[8px] font-black uppercase rounded-lg text-slate-500">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-semibold text-slate-650">{machineName}</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-semibold text-slate-650">{materialName}</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-black text-slate-800">R {p.baseCost?.toFixed(2) || '0,00'}</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-black text-emerald-600">{p.markupPercentage ?? p.markupPercent ?? 40}%</span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => {
                                  setPrefilledItem({ type: p.productType === 'NCR' ? 'NCR' : p.productType === 'Litho' ? 'Litho' : 'Product', originId: p.id, quantity: p.minimumOrderQuantity || 1 });
                                  setIsQuoteModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest"
                              >
                                Quote
                              </button>
                              
                              <button onClick={() => setViewingProduct(p)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg"><Eye size={14} /></button>
                              
                              {isAdmin && activeTab === 'catalog' && (
                                <>
                                  <button onClick={() => handleClone(p)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg" title="Duplicate spec"><Copy size={14} /></button>
                                  <button onClick={() => handleEdit(p)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-brand-accent rounded-lg" title="Edit specifications"><Edit2 size={14} /></button>
                                  <button onClick={() => triggerArchive(p.id)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg" title="Archive"><Trash2 size={14} /></button>
                                </>
                              )}

                              {isAdmin && activeTab === 'archive' && (
                                <>
                                  <button onClick={() => triggerRestore(p.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><RotateCcw size={12} />Restore</button>
                                  <button onClick={() => triggerDeletePermanent(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash size={12} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Category Manager Tab Workspace (Req #5) */}
      {activeTab === 'categories' && isAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic font-serif">Category Administrator</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Setup classification divisions for quote calculators pairing</p>
            </div>
            <button
              onClick={handleOpenNewCategory}
              className="bg-brand-accent text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-brand-accent/20"
            >
              <Plus size={16} />
              Add Category
            </button>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-[3rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Category Name</th>
                  <th className="px-8 py-5">Slug</th>
                  <th className="px-8 py-5">Calc Type Assignment</th>
                  <th className="px-8 py-5">Group Line</th>
                  <th className="px-8 py-5">Assigned Products</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dbCategories.map(cat => {
                  const assignedCount = products.filter(p => !p.isArchived && (p.categoryId === cat.id || p.category === cat.name || p.categoryName === cat.name)).length;
                  const calcInfo = getCalculatorInfo(cat.name);
                  
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-8 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                            <Tag size={14} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 uppercase italic font-serif text-sm">{cat.name}</span>
                            <span className="block text-[9px] font-semibold text-slate-400 line-clamp-1 max-w-sm">{cat.description || 'No description provided.'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4.5">
                        <span className="font-mono text-xs text-slate-400">/{cat.slug}</span>
                      </td>
                      <td className="px-8 py-4.5">
                        <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                          {cat.type || 'Product'} ({calcInfo.code})
                        </span>
                      </td>
                      <td className="px-8 py-4.5 font-bold text-slate-500">
                        {cat.productGroup || 'Small Format'}
                      </td>
                      <td className="px-8 py-4.5">
                        <span className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent rounded-lg font-black text-[10px]">
                          {assignedCount} Specs
                        </span>
                      </td>
                      <td className="px-8 py-4.5">
                        <button
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={cn(
                            "px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider border",
                            cat.active 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-red-50 text-red-600 border-red-100"
                          )}
                        >
                          {cat.active ? 'Visible' : 'Hidden'}
                        </button>
                      </td>
                      <td className="px-8 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleEditCategory(cat)}
                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Erase category '${cat.name}'? This doesn't remove products but will unlink them.`)) {
                                await deleteDocument('product_categories', cat.id);
                                toast.success(`Category '${cat.name}' deleted.`);
                              }
                            }}
                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main product specification modal */}
      {isModalOpen && (
        <ProductFormModal 
          product={editingProduct} 
          materials={materials}
          machines={machines}
          departments={departments}
          categories={dbCategories}
          rawPapers={rawPapers}
          rawFinishings={rawFinishings}
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {/* View specification details and connected parameters */}
      {viewingProduct && (
        <ProductViewModal 
          product={viewingProduct} 
          materials={materials}
          machines={machines}
          departments={departments}
          categories={dbCategories}
          rawPapers={rawPapers}
          rawFinishings={rawFinishings}
          onClose={() => setViewingProduct(null)} 
        />
      )}

      {/* Category CRUD Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase italic font-serif">
                {editingCategory ? 'Modify Category' : 'Register Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-white hover:bg-slate-100 rounded-xl transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-8 space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Title</label>
                <input 
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g. Vinyl Banners"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Detailed description</label>
                <textarea 
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Summary of default sizing constraints, print substrates pairing, and workflow line..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pricing model type</label>
                  <select 
                    value={categoryFormData.type}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    <option value="Product">Standard Substrate (Product)</option>
                    <option value="Litho">High-Volume Offset (Litho)</option>
                    <option value="NCR">Carbonless Copies (NCR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Product grouping</label>
                  <select 
                    value={categoryFormData.productGroup}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, productGroup: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    <option value="Small Format">Small Format Media</option>
                    <option value="Large Format">Large Format Media</option>
                    <option value="Rigid Media">Rigid Boards / Media</option>
                    <option value="Exhibition/Display">Exhibition / Display</option>
                    <option value="Commercial Print">Commercial Office Print</option>
                    <option value="Labels">Labels & Stickers</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Promo">Promotional Products</option>
                    <option value="Other">Unassigned / Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="catActive"
                  checked={categoryFormData.active}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, active: e.target.checked })}
                  className="w-4 h-4 text-brand-accent rounded"
                />
                <label htmlFor="catActive" className="text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Category is visible to estimators</label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-650 font-black text-[10px] uppercase tracking-wider rounded-xl">Discard changes</button>
                <button type="submit" className="flex-1 py-3.5 bg-brand-accent text-white font-black text-[10px] uppercase tracking-wider rounded-xl">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Overlay for Archiving */}
      <ConfirmationModal
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={confirmArchive}
        title="Archive Standard Spec Template?"
        message="This will hide the standard product from the active quoting catalog inventory. You can restore it anytime in the Admin History Archive safely."
        confirmText="Archive Spec"
        variant="danger"
        isLoading={isProcessingAction}
      />

      {/* Confirmation Overlay for Permanent Erase */}
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeletePermanent}
        title="Irreversibly Eliminate Spec?"
        message="Warning: This action is permanent! The specification template will be completely deleted from Firestore. This cannot be undone."
        confirmText="Erase Permanently"
        variant="danger"
        isLoading={isProcessingAction}
      />

      {/* Dynamic Pop-up Quote Form with Prefills (Req #7) */}
      {isQuoteModalOpen && prefilledItem && (
        <QuoteModal 
          isOpen={isQuoteModalOpen}
          initialClientId=""
          prefilledItem={prefilledItem}
          quote={null}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setPrefilledItem(null);
          }}
        />
      )}
    </div>
  );
}

// 20 Fields Complete Interactive Product Spec Form (Req #2)
function ProductFormModal({
  product,
  materials,
  machines,
  departments,
  categories,
  rawPapers,
  rawFinishings,
  onClose
}: {
  product: Product | null;
  materials: Material[];
  machines: Machine[];
  departments: Department[];
  categories: ProductCategory[];
  rawPapers: any[];
  rawFinishings: any[];
  onClose: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'costing' | 'media'>('details');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || categories[0]?.name || 'Business Cards',
    categoryId: product?.categoryId || categories[0]?.id || '',
    department: product?.department || departments[0]?.name || 'Prepress',
    defaultDepartmentId: product?.defaultDepartmentId || departments[0]?.id || '',
    productType: product?.productType || 'Product',
    defaultSize: product?.defaultSize || product?.dimensions || 'A4',
    allowCustomSize: product?.allowCustomSize !== false,
    defaultQuantities: product?.defaultQuantities || '100, 250, 500, 1000',
    materialIds: product?.materialIds || [],
    paperStockIds: product?.paperStockIds || [],
    finishingOptionIds: product?.finishingOptionIds || [],
    machineIds: product?.machineIds || [],
    defaultMachineId: product?.defaultMachineId || '',
    baseCost: product?.baseCost || 0,
    markupPercentage: product?.markupPercentage || product?.markupPercent || 40,
    vatApplicable: product?.vatApplicable !== false,
    minimumCharge: product?.minimumCharge || 0,
    active: product?.active !== false,
    isActive: product?.isActive !== false,
    imageUrl: product?.imageUrl || '',
    notes: product?.notes || '',
    costingMethod: product?.costingMethod || 'Area',
    setupTime: product?.setupTime || 15
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Product catalog title is mandatory.');
      return;
    }

    setIsSaving(true);
    
    // Auto sync category parameters
    const foundCat = categories.find(c => c.name === formData.category || c.id === formData.categoryId);
    const resolvedCategoryId = foundCat?.id || formData.categoryId || '';
    const resolvedCategoryName = foundCat?.name || formData.category || 'Other';
    const resolvedType = foundCat?.type || formData.productType || 'Product';

    const payload = {
      ...formData,
      categoryId: resolvedCategoryId,
      categoryName: resolvedCategoryName,
      category: resolvedCategoryName,
      productType: resolvedType,
      baseCost: Number(formData.baseCost) || 0,
      markupPercentage: Number(formData.markupPercentage) || Number(formData.markupPercent) || 40,
      markupPercent: Number(formData.markupPercentage) || Number(formData.markupPercent) || 40,
      minimumCharge: Number(formData.minimumCharge) || 0,
      setupTime: Number(formData.setupTime) || 0,
      allowCustomSize: formData.allowCustomSize === true,
      vatApplicable: formData.vatApplicable === true,
      active: formData.active !== false && formData.isActive !== false,
      isActive: formData.isActive !== false && formData.active !== false,
      updatedAt: Date.now(),
      createdAt: product?.createdAt || Date.now()
    };

    try {
      if (product?.id) {
        await updateDocument('products', product.id, payload);
        toast.success('Product configurations updated safely.');
      } else {
        await createDocument('products', {
          ...payload,
          isArchived: false,
          createdAt: Date.now()
        });
        toast.success('New standard print product cataloged.');
      }
      onClose();
    } catch {
      toast.error('Firestore operation failed. Please check parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper selectors togglers
  const toggleArrayItem = (key: 'materialIds' | 'paperStockIds' | 'finishingOptionIds' | 'machineIds', value: string) => {
    const list = (formData[key] as string[]) || [];
    if (list.includes(value)) {
      setFormData({ ...formData, [key]: list.filter(v => v !== value) });
    } else {
      setFormData({ ...formData, [key]: [...list, value] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic font-serif leading-none">
                {product ? 'Modify Core Specifications' : 'Catalog New Specification'}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Configure 20 parameters aligned to pricing calculators</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-sm">
            <X size={16} />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-8 py-2.5 border-b border-slate-100 flex gap-2 bg-slate-50/20 shrink-0 text-[10px] font-black uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn("px-4 py-2.5 rounded-xl transition-all flex items-center gap-2", activeTab === 'details' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
          >
            1. Core Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('costing')}
            className={cn("px-4 py-2.5 rounded-xl transition-all flex items-center gap-2", activeTab === 'costing' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
          >
            2. Costing Rules ({formData.baseCost ? `R ${formData.baseCost}` : 'R 0'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={cn("px-4 py-2.5 rounded-xl transition-all flex items-center gap-2", activeTab === 'media' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
          >
            3. Linked Costing Setup ({((formData.materialIds?.length || 0) + (formData.paperStockIds?.length || 0) + (formData.finishingOptionIds?.length || 0))} connected)
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 min-h-0 text-slate-800">
          
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
              
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name/SKU</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard Pull Up Banner (850x2000mm) - Custom Base"
                  className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/5 focus:bg-white transition-all text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specifications Booklet Description</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide brief detailing of finished size orientation folding lamination options and lead metrics..."
                  className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-accent focus:bg-white transition-all text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Standard Category Clapping</label>
                <select 
                  value={formData.category}
                  onChange={(e) => {
                    const matchedCat = categories.find(c => c.name === e.target.value);
                    setFormData({ 
                      ...formData, 
                      category: e.target.value,
                      categoryId: matchedCat?.id || '',
                      productType: matchedCat?.type || 'Product'
                    });
                  }}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none text-xs cursor-pointer"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Calculator Type Assignment</label>
                <select 
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="Product">Standard Substrate (Product / Large Format)</option>
                  <option value="Litho">High-Volume Offset Printing (Litho)</option>
                  <option value="NCR">Carbonless Invoices (NCR)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Operational Routing Department</label>
                <select 
                  value={formData.defaultDepartmentId}
                  onChange={(e) => {
                    const matchedD = departments.find(d => d.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      defaultDepartmentId: e.target.value,
                      department: matchedD?.name || 'Prepress'
                    });
                  }}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none text-xs cursor-pointer"
                >
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Finished Size (Width x Length mm / Standard Size)</label>
                <input 
                  type="text"
                  value={formData.defaultSize}
                  onChange={(e) => setFormData({ ...formData, defaultSize: e.target.value, dimensions: e.target.value })}
                  placeholder="e.g. 850 x 2000 mm or A4"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="customSize"
                  checked={formData.allowCustomSize} 
                  onChange={(e) => setFormData({ ...formData, allowCustomSize: e.target.checked })} 
                  className="w-4 h-4 text-brand-accent rounded cursor-pointer"
                />
                <label htmlFor="customSize" className="text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Allow Custom Size in Estimators</label>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Volume Options (Comma Separated)</label>
                <input 
                  type="text"
                  value={formData.defaultQuantities}
                  onChange={(e) => setFormData({ ...formData, defaultQuantities: e.target.value })}
                  placeholder="e.g. 50, 100, 250, 500"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Banner Image URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="Paste absolute https:// image URL for catalog visual representation..."
                    className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:outline-none"
                  />
                  {formData.imageUrl && (
                    <div className="w-12 h-12 border border-slate-200 rounded-xl overflow-hidden shrink-0 bg-slate-50">
                      <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal Production Remarks/Notes</label>
                <textarea 
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal operator guides, substrate grain direction preference..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'costing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pricing Calculation Algorithm</label>
                <select 
                  value={formData.costingMethod}
                  onChange={(e) => setFormData({ ...formData, costingMethod: e.target.value as any })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                >
                  <option value="Area">Area Basis (R / m²)</option>
                  <option value="Per Item">Per Item Flat (Flat product configuration)</option>
                  <option value="Hourly">Hourly Basis (Labour rate linked)</option>
                  <option value="Page">Page Impress Rate (Single side click cost)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Standard Preparation Setup Time (minutes)</label>
                <input 
                  type="number"
                  value={formData.setupTime}
                  onChange={(e) => setFormData({ ...formData, setupTime: parseInt(e.target.value) || 0 })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Base Cost (R / ZAR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.baseCost}
                  onChange={(e) => setFormData({ ...formData, baseCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Profit Markup Percentage (%)</label>
                <input 
                  type="number"
                  required
                  value={formData.markupPercentage ?? formData.markupPercent}
                  onChange={(e) => setFormData({ ...formData, markupPercentage: parseInt(e.target.value) || 0, markupPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overhead Surcharge Minimum Charge (ZAR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.minimumCharge}
                  onChange={(e) => setFormData({ ...formData, minimumCharge: parseFloat(e.target.value) || 0 })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                />
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="vatApplicable"
                    checked={formData.vatApplicable}
                    onChange={(e) => setFormData({ ...formData, vatApplicable: e.target.checked })}
                    className="w-4 h-4 text-brand-accent rounded cursor-pointer"
                  />
                  <label htmlFor="vatApplicable" className="text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">15% Standard VAT Applicable</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="productActive"
                    checked={formData.isActive !== false && formData.active !== false}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked, isActive: e.target.checked })}
                    className="w-4 h-4 text-brand-accent rounded cursor-pointer"
                  />
                  <label htmlFor="productActive" className="text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Specification is active for estimates creation</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Materials Media Connection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-brand-accent" />
                  <span className="block text-[10px] font-black uppercase text-slate-450 tracking-widest">Connect Premium Substrates / Materials</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] max-h-48 overflow-y-auto">
                  {materials.map(m => {
                    const selected = formData.materialIds?.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleArrayItem('materialIds', m.id)}
                        className={cn(
                          "p-3.5 rounded-xl text-left border text-[10px] font-extrabold uppercase tracking-tight flex items-center justify-between transition-colors",
                          selected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        <span className="line-clamp-1">{m.name}</span>
                        {selected ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 ml-2" /> : <Tag size={13} className="text-slate-300 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Offset Costing Papers Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-500" />
                  <span className="block text-[10px] font-black uppercase text-slate-450 tracking-widest">Connect Offset Print Paper Stock (From Pricing Tables)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] max-h-48 overflow-y-auto">
                  {(rawPapers || []).map(p => {
                    const selected = formData.paperStockIds?.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleArrayItem('paperStockIds', p.id)}
                        className={cn(
                          "p-3.5 rounded-xl text-left border text-[10px] font-extrabold uppercase tracking-tight flex items-center justify-between transition-colors",
                          selected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        <span className="line-clamp-1">{p.brand || 'Paper'} - {p.gsm || 80}gsm</span>
                        {selected ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 ml-2" /> : <Layers size={13} className="text-slate-300 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Finishing rules connection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-slate-500" />
                  <span className="block text-[10px] font-black uppercase text-slate-450 tracking-widest">Bindery Finishing Options Required</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] max-h-48 overflow-y-auto">
                  {(rawFinishings || []).map(f => {
                    const selected = formData.finishingOptionIds?.includes(f.id);
                    return (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => toggleArrayItem('finishingOptionIds', f.id)}
                        className={cn(
                          "p-3.5 rounded-xl text-left border text-[10px] font-extrabold uppercase tracking-tight flex items-center justify-between transition-colors",
                          selected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        <span className="line-clamp-1">{f.name}</span>
                        {selected ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 ml-2" /> : <Settings size={13} className="text-slate-300 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Machinery connection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-slate-500" />
                  <span className="block text-[10px] font-black uppercase text-slate-450 tracking-widest">Associate Printers / Production Machinery</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] max-h-48 overflow-y-auto">
                  {machines.map(m => {
                    const selected = formData.machineIds?.includes(m.id) || formData.defaultMachineId === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          toggleArrayItem('machineIds', m.id);
                          if (!formData.defaultMachineId) {
                            setFormData(prev => ({ ...prev, defaultMachineId: m.id }));
                          }
                        }}
                        className={cn(
                          "p-3.5 rounded-xl text-left border text-[10px] font-extrabold uppercase tracking-tight flex items-center justify-between transition-colors",
                          selected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        <span className="line-clamp-1">{m.name}</span>
                        {selected ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 ml-2" /> : <Cpu size={13} className="text-slate-300 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Modal Buttons Footer */}
          <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-650 font-black text-[10px] uppercase tracking-wider rounded-2xl hover:bg-slate-200 transition-all font-serif italic"
            >
              Discard product specifications
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-brand-accent text-white font-black text-[10px] uppercase tracking-wider rounded-2xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-serif italic"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {product ? 'Commit Specification Changes' : 'Catalog New Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Visual Specification detail pane and connected costing parameter rules preview (Req #6 & #7)
function ProductViewModal({
  product,
  materials,
  machines,
  departments,
  categories,
  rawPapers,
  rawFinishings,
  onClose
}: {
  product: Product;
  materials: Material[];
  machines: Machine[];
  departments: Department[];
  categories: ProductCategory[];
  rawPapers: any[];
  rawFinishings: any[];
  onClose: () => void;
}) {
  const departmentObj = departments.find(d => d.id === product.defaultDepartmentId || d.name === product.department);
  const matchedCalculator = getCalculatorInfo(product.category || '');
  
  // Real pricing linkages resolver
  const linkedMaterials = materials.filter(m => product.materialIds?.includes(m.id));
  const linkedPapers = (rawPapers || []).filter(p => product.paperStockIds?.includes(p.id));
  const linkedFinishings = (rawFinishings || []).filter(f => product.finishingOptionIds?.includes(f.id));
  const linkedMachines = machines.filter(m => product.machineIds?.includes(m.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200/50 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner header visual */}
        <div className="relative h-44 bg-slate-100 flex items-end p-8 border-b border-slate-150">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
          
          <div className="relative z-10 text-white flex justify-between items-end w-full">
            <div>
              <span className="px-2.5 py-1 bg-brand-accent text-white font-black text-[8px] uppercase tracking-widest rounded-md">{product.category}</span>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase italic font-serif mt-2 leading-none">{product.name}</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-300 tracking-wider">SKU: {product.id.slice(0, 8).toUpperCase()}</span>
          </div>
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm transition-all shadow-sm">
            <X size={16} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto text-slate-700">
          
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Description</span>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">{product.description || 'No custom description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[8px] text-slate-400 mb-1">Pricing Logic</span>
              <span className="text-slate-800 font-extrabold">{product.costingMethod || 'Area'} Model</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[8px] text-slate-400 mb-1 font-bold">Standard Base Cost</span>
              <span className="text-slate-800 font-extrabold">R {product.baseCost?.toFixed(2) || '0,00'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[8px] text-slate-400 mb-1">Profit Markup</span>
              <span className="text-emerald-600 font-extrabold">+{product.markupPercentage ?? product.markupPercent ?? 40}%</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[8px] text-slate-400 mb-1">Estimators Size</span>
              <span className="text-slate-800 font-extrabold">{product.dimensions || product.defaultSize || 'Any Size'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
              <span className="block text-[8px] text-slate-400 mb-1">Routing Department</span>
              <span className="text-slate-800 font-extrabold">{departmentObj?.name || 'Prepress Queue'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
              <span className="block text-[8px] text-slate-400 mb-1">Linked Calculator</span>
              <span className="text-brand-accent font-black tracking-tight">{matchedCalculator.name}</span>
            </div>
          </div>

          {/* Real pricing linkages & costing setup parameters (Req #6) */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              <Database size={13} />
              <span>Linked Costing Setup Parameters Summary</span>
            </div>

            <div className="space-y-3 font-semibold text-xs leading-relaxed text-slate-600">
              
              {/* Linked Substrates */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Linked Substrates/Materials ({linkedMaterials.length})</span>
                {linkedMaterials.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedMaterials.map(m => (
                      <span key={m.id} className="px-2.5 py-1 bg-slate-50 border border-slate-150 text-[9px] font-black text-slate-650 rounded-md uppercase">
                        {m.name} (Sell: R {m.costPrice || m.costPerSqm || '0'}/m²)
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No premium media substrates are explicitly connected.</span>
                )}
              </div>

              {/* Linked Offset Papers */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Primary Paper Stock ({linkedPapers.length})</span>
                {linkedPapers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedPapers.map(p => (
                      <span key={p.id} className="px-2.5 py-1 bg-slate-50 border border-slate-150 text-[9px] font-black text-slate-650 rounded-md uppercase">
                        {p.brand} ({p.gsm}gsm / Feed R {p.pricePerSheet || p.pricePerUnit || '0'})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No default paper stocks connected.</span>
                )}
              </div>

              {/* Linked Finishings */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Paired Finishing Elements ({linkedFinishings.length})</span>
                {linkedFinishings.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedFinishings.map(f => (
                      <span key={f.id} className="px-2.5 py-1 bg-slate-50 border border-slate-150 text-[9px] font-black text-slate-650 rounded-md uppercase">
                        {f.name} (R {f.fixedCost || f.unitCost || '0'} flat/rate)
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No special bindery finishing connected.</span>
                )}
              </div>

              {/* Connected Machinery */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Paired Machinery ({linkedMachines.length})</span>
                {linkedMachines.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedMachines.map(m => (
                      <span key={m.id} className="px-2.5 py-1 bg-slate-50 border border-slate-150 text-[9px] font-black text-slate-650 rounded-md uppercase">
                        {m.name} (Speed: {m.speed || 'Standard'} / Rate: R {m.costPerHour || m.hourlyRate || '0'}/hr)
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No manufacturing machines paired.</span>
                )}
              </div>

            </div>
          </div>

          {product.notes && (
            <div className="border-t border-slate-100 pt-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Internal Operations Remarks</span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{product.notes}</p>
            </div>
          )}

        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow"
          >
            Dismiss Specification
          </button>
        </div>
      </div>
    </div>
  );
}

// CheckCircle2 is used but fallback if not found in Lucide
function CheckCircle2({ size, ...props }: any) {
  return <CheckSquare size={size} className={cn("text-emerald-400", props.className)} />;
}
