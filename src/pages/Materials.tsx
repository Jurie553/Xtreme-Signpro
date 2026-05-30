import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Box, Filter, AlertTriangle, TrendingUp, HelpCircle, 
  Layers, ChevronLeft, ChevronRight, RefreshCw, Star, ArrowUpDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, deleteDocument } from '../lib/firestoreService';
import { Material, Supplier, PricingSettings } from '../types';
import { getActivePricingSettings } from '../lib/pricingService';

// Import split modular components
import MaterialModal from '../components/materials/MaterialModal';
import MaterialViewModal from '../components/materials/MaterialViewModal';
import MaterialsRegistryTable from '../components/materials/MaterialsRegistryTable';
import MaterialsRegistryGrid from '../components/materials/MaterialsRegistryGrid';
import { getStockHealth, getConvertedStock, getConvertedCost } from '../components/materials/MaterialCalculations';
import MaterialConversionPanel from '../components/materials/MaterialConversionPanel';

import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function Materials() {
  const { data: materials, loading: materialsLoading, error: materialsError } = useCollection<Material>('materials');
  const { data: suppliers, loading: suppliersLoading } = useCollection<Supplier>('suppliers');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  
  const pricingSettings = getActivePricingSettings(settingsList);
  const globalMarkup = 1 + ((pricingSettings.materialMarkupPercent ?? 40) / 100);

  // Filter and view States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSupplier, setSelectedSupplier] = useState('All');
  const [selectedHealth, setSelectedHealth] = useState<'All' | 'Low Stock' | 'Out of Stock' | 'Healthy'>('All');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [displayUnit, setDisplayUnit] = useState<string>('Default');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categories = ['All', 'Print Media', 'Board', 'Ink', 'Vinyl', 'Laminate', 'Consumable'];

  // 1. Calculate health counters globally based on raw materials
  const healthStats = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let healthy = 0;

    materials.forEach(m => {
      const threshold = m.minStock || 10;
      if (m.stockLevel === 0) {
        outOfStock++;
      } else if (m.stockLevel <= threshold) {
        lowStock++;
      } else {
        healthy++;
      }
    });

    return {
      total: materials.length,
      outOfStock,
      lowStock,
      healthy
    };
  }, [materials]);

  // 2. Filter materials list safely
  const processedMaterials = useMemo(() => {
    let list = [...materials];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(term) ||
        (m.sku && m.sku.toLowerCase().includes(term)) ||
        (m.barcode && m.barcode.includes(term))
      );
    }

    // Filter by Category
    if (selectedCategory !== 'All') {
      list = list.filter(m => m.category === selectedCategory);
    }

    // Filter by Supplier
    if (selectedSupplier !== 'All') {
      list = list.filter(m => m.supplierId === selectedSupplier);
    }

    // Filter by Stock Health
    if (selectedHealth !== 'All') {
      list = list.filter(m => {
        const threshold = m.minStock || 10;
        if (selectedHealth === 'Out of Stock') return m.stockLevel === 0;
        if (selectedHealth === 'Low Stock') return m.stockLevel > 0 && m.stockLevel <= threshold;
        return m.stockLevel > threshold;
      });
    }

    // Sorting
    list.sort((a, b) => {
      const aCost = Number(a.costPrice) || 0;
      const bCost = Number(b.costPrice) || 0;
      const aStock = Number(a.stockLevel) || 0;
      const bStock = Number(b.stockLevel) || 0;

      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'sku-asc':
          return (a.sku || '').localeCompare(b.sku || '');
        case 'stock-asc':
          return aStock - bStock;
        case 'stock-desc':
          return bStock - aStock;
        case 'cost-asc':
          return aCost - bCost;
        case 'cost-desc':
          return bCost - aCost;
        default:
          return 0;
      }
    });

    return list;
  }, [materials, searchTerm, selectedCategory, selectedSupplier, selectedHealth, sortBy]);

  // 3. Paginate materials list
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [processedMaterials, currentPage]);

  const totalPages = Math.ceil(processedMaterials.length / itemsPerPage);

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleView = (material: Material) => {
    setViewingMaterial(material);
  };

  const handleDeleteTrigger = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    setIsUpdatingId(materialToDelete.id);
    try {
      const success = await deleteDocument('materials', materialToDelete.id);
      if (success) {
        toast.success(`Substrate "${materialToDelete.name}" removed from library.`);
      } else {
        throw new Error();
      }
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to remove substrate from repository.');
    } finally {
      setIsUpdatingId(null);
      setMaterialToDelete(null);
    }
  };

  const onSavedSuccess = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const getConvertedMaterial = (m: Material) => {
    // Return a carbon copy with converted dimensions in stock/cost if needed
    const stock = getConvertedStock(m.stockLevel, m.unit, displayUnit, m.conversions);
    const cost = getConvertedCost(m.costPrice, m.unit, displayUnit, m.conversions);
    const sell = m.sellPerSqm ? getConvertedCost(m.sellPerSqm, m.unit, displayUnit, m.conversions) : cost * globalMarkup;
    
    return {
      ...m,
      stockLevel: Number(stock.toFixed(2)),
      costPrice: Number(cost.toFixed(2)),
      sellPerSqm: Number(sell.toFixed(2)),
      unit: displayUnit === 'Default' ? m.unit : displayUnit
    };
  };

  // Convert on display level
  const convertedList = useMemo(() => {
    return paginatedMaterials.map(m => getConvertedMaterial(m));
  }, [paginatedMaterials, displayUnit, globalMarkup]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Print Media Library
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Wide-format substrates, rigid boards & consumable registry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                viewMode === 'grid' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Grid Swatches
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                viewMode === 'table' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Compact Register
            </button>
          </div>

          <button 
            onClick={() => {
              setEditingMaterial(null);
              setIsModalOpen(true);
            }}
            className="bg-brand-accent text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-2.5 active:scale-95 shrink-0"
          >
            <Plus size={15} strokeWidth={3} />
            Register Substrate
          </button>
        </div>
      </header>

      {/* RE-ESTABLISHING INVENTORY HEALTH METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <button 
          onClick={() => setSelectedHealth('All')}
          className={cn(
            "p-4 bg-white rounded-2xl border text-left transition-all",
            selectedHealth === 'All' ? "border-brand-accent ring-2 ring-brand-accent/5 shadow-sm" : "border-slate-150 hover:border-slate-300"
          )}
        >
          <span className="text-[8px] font-black text-slate-450 uppercase text-slate-450 tracking-widest block mb-1">Registered Library</span>
          <p className="text-xl font-black text-slate-900">{healthStats.total}</p>
          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Specifications indexed</span>
        </button>

        <button 
          onClick={() => setSelectedHealth('Healthy')}
          className={cn(
            "p-4 bg-white rounded-2xl border text-left transition-all",
            selectedHealth === 'Healthy' ? "border-emerald-500 ring-2 ring-emerald-500/5 shadow-sm" : "border-slate-150 hover:border-emerald-250"
          )}
        >
          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Satisfactory Levels</span>
          <p className="text-xl font-black text-emerald-600">{healthStats.healthy}</p>
          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Sufficient stock levels</span>
        </button>

        <button 
          onClick={() => setSelectedHealth('Low Stock')}
          className={cn(
            "p-4 bg-white rounded-2xl border text-left transition-all",
            selectedHealth === 'Low Stock' ? "border-amber-500 ring-2 ring-amber-500/5 shadow-sm" : "border-slate-150 hover:border-amber-250",
            healthStats.lowStock > 0 && "animate-none"
          )}
        >
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block mb-1">Low-Stock Warnings</span>
          <p className="text-xl font-black text-amber-600">{healthStats.lowStock}</p>
          <span className="text-[9px] text-slate-450 text-slate-400 font-semibold block mt-0.5">Approaching minimum threshold</span>
        </button>

        <button 
          onClick={() => setSelectedHealth('Out of Stock')}
          className={cn(
            "p-4 bg-white rounded-2xl border text-left transition-all animate-[pulse_6s_infinite]",
            selectedHealth === 'Out of Stock' ? "border-rose-500 ring-2 ring-rose-500/5 shadow-sm" : "border-slate-150 hover:border-rose-250"
          )}
        >
          <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block mb-1">Depleted stock levels</span>
          <p className="text-xl font-black text-rose-600">{healthStats.outOfStock}</p>
          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Urgent reorders required</span>
        </button>
      </div>

      {/* DYNAMIC CONVERSION UTILITY PANEL */}
      <MaterialConversionPanel />

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-sm space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, SKU or barcode..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/15 focus:border-brand-accent transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Preferred Supplier select */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Preferred supplier</span>
              <select
                value={selectedSupplier}
                onChange={(e) => { setSelectedSupplier(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer outline-none focus:ring-2"
              >
                <option value="All">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Sort Options select */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-slate-450 text-slate-400 uppercase tracking-widest mr-1">Sort specs</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer outline-none focus:ring-2"
              >
                <option value="name-asc">Alphabetical (A-Z)</option>
                <option value="name-desc">Alphabetical (Z-A)</option>
                <option value="sku-asc">SKU Code</option>
                <option value="stock-asc">Stock Level (Asc)</option>
                <option value="stock-desc">Stock Level (Desc)</option>
                <option value="cost-asc">Raw Cost (Asc)</option>
                <option value="cost-desc">Raw Cost (Desc)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global displays metric and categories filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={cn(
                  "px-4.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border border-transparent",
                  selectedCategory === cat 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar max-w-full self-end">
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest px-2 font-mono">Convert Units:</span>
            {['Default', 'm²', 'kg', 'sheet', 'liter'].map((unit) => (
              <button
                key={unit}
                onClick={() => setDisplayUnit(unit)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  displayUnit === unit 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {materialsLoading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-150/60 rounded-3xl shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-brand-accent" size={30} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Awaiting database registers...</p>
          </div>
        </div>
      ) : (
        <>
          {/* RENDER TABLE OR GRID DIRECTLY */}
          {viewMode === 'table' ? (
            <MaterialsRegistryTable
              materials={convertedList}
              suppliers={suppliers}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDeleteTrigger}
            />
          ) : (
            <MaterialsRegistryGrid
              materials={convertedList}
              suppliers={suppliers}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDeleteTrigger}
            />
          )}

          {/* PAGINATION INTERACTIVE CONTROLLER */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-150/60 px-6 py-4 rounded-2xl shadow-sm mt-2 shrink-0">
              <span className="text-[10px] font-extrabold text-slate-405 text-slate-400 uppercase tracking-wider">
                Showing {processedMaterials.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedMaterials.length)} of {processedMaterials.length} specifications
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95 text-slate-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-800 px-4 font-serif italic">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95 text-slate-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* RENDER DEDICATED TYPE-SAFE EDIT/CREATE MODAL */}
      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        material={editingMaterial}
        suppliers={suppliers}
        onSaved={onSavedSuccess}
      />

      {/* RENDER DEDICATED READ-ONLY PREVIEW BLUEPRINT MODAL */}
      <MaterialViewModal
        isOpen={!!viewingMaterial}
        onClose={() => setViewingMaterial(null)}
        material={viewingMaterial}
        suppliers={suppliers}
      />

      {/* RENDER RE-USABLE DELETE CONFIRMATION INTERFACE */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Deregister Substrate from Library?"
        message={`This will delete the media specifications for "${materialToDelete?.name || 'this substrate'}" permanently from your inventory. This media will no longer be available for auto-quoting calculations, though matching historic quotes will remain completely unaffected.`}
        confirmText="Remove Media Permanently"
        variant="danger"
        isLoading={!!isUpdatingId}
      />
    </div>
  );
}
