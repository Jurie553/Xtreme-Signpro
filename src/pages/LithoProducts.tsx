import React, { useState } from 'react';
import { Layers, Library, LayoutGrid, FileSearch, Shuffle, Cpu, UserCheck, BarChart3, Coins, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { LithoProduct } from '../types';
import QuoteModal from '../components/QuoteModal';
import { toast } from 'sonner';

// Sub Tab Imports
import LithoSpecsTab from '../components/litho/LithoSpecsTab';
import LithoImpositionTab from '../components/litho/LithoImpositionTab';
import LithoPreflightTab from '../components/litho/LithoPreflightTab';
import LithoWorkflowTab from '../components/litho/LithoWorkflowTab';
import LithoMachineTab from '../components/litho/LithoMachineTab';
import LithoClientPortalTab from '../components/litho/LithoClientPortalTab';
import LithoAnalyticsTab from '../components/litho/LithoAnalyticsTab';
import LithoCostingSetupTab from '../components/litho/LithoCostingSetupTab';
import LithoBookCalculatorTab from '../components/litho/LithoBookCalculatorTab';

type ActiveTab = 'specs' | 'imposition' | 'preflight' | 'workflow' | 'fleet' | 'approvals' | 'analytics' | 'costing-setup' | 'book-calc';

export default function LithoProducts() {
  const { data: products, loading } = useCollection<LithoProduct>('litho_products');
  const [activeTab, setActiveTab] = useState<ActiveTab>('book-calc'); // default to Book Calculator so they see it instantly!
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAddToQuote = (productId: string, qty: number) => {
    setPrefilledItem({ type: 'Litho', originId: productId, quantity: qty });
    setIsQuoteModalOpen(true);
  };

  const handleDuplicate = async (product: LithoProduct) => {
    try {
      const { id, ...duplicateData } = product;
      await createDocument('litho_products', {
        ...duplicateData,
        name: `${product.name} (Copy)`,
        createdAt: Date.now()
      });
      toast.success('Product specification duplicated in registry');
    } catch (error) {
      console.error('Error duplicating product:', error);
      toast.error('Failed to duplicate product');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this litho product specification from registry?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('litho_products', id);
        toast.success('Product removed successfully');
      } finally {
        setIsUpdating(null);
      }
    }
  };

  const handleSave = async (productData: Partial<LithoProduct>, id?: string) => {
    try {
      if (id) {
        await updateDocument('litho_products', id, productData);
        toast.success('Specifications updated successfully');
      } else {
        await createDocument('litho_products', { ...productData, createdAt: Date.now() });
        toast.success('New product registered successfully');
      }
    } catch (error) {
      console.error('Error saving litho product:', error);
      toast.error('Failed to save specifications');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full" 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Page Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-accent/5 rounded-xl flex items-center justify-center text-brand border border-brand-accent/15 shadow-sm">
            <Layers size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-2">
              Litho Print MIS/ERP Module
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Enterprise production, layout imposition, workflow & fleet scheduler</p>
          </div>
        </div>
      </motion.header>

      {/* Modern Responsive Glassmorphism Navigation Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 bg-slate-50/60 p-1.5 rounded-2xl border border-slate-150/40 shadow-sm">
        <button
          onClick={() => setActiveTab('book-calc')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'book-calc' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50 proxy-tab-calc"
          )}
        >
          <Calculator size={15} />
          <span>Book Calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('costing-setup')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'costing-setup' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50 proxy-tab-setup"
          )}
        >
          <Coins size={15} />
          <span>Costing Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'specs' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Library size={15} />
          <span>Product Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('imposition')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'imposition' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <LayoutGrid size={15} />
          <span>Imposition Fit</span>
        </button>

        <button
          onClick={() => setActiveTab('preflight')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'preflight' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <FileSearch size={15} />
          <span>Artwork Preflight</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'workflow' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Shuffle size={15} />
          <span>Floor Workflow</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'fleet' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Cpu size={15} />
          <span>Machine Fleet</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'approvals' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <UserCheck size={15} />
          <span>Approval Hubs</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'analytics' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <BarChart3 size={15} />
          <span>Print Analytics</span>
        </button>
      </div>

      {/* Main Tab Render Space */}
      <div className="flex-1 min-h-[400px]">
        {activeTab === 'book-calc' && (
          <LithoBookCalculatorTab />
        )}

        {activeTab === 'costing-setup' && (
          <LithoCostingSetupTab />
        )}

        {activeTab === 'specs' && (
          <LithoSpecsTab 
            products={products}
            isUpdating={isUpdating}
            onEdit={() => {}} // Internal spec editing is directly integrated inside Specs registry tab!
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onAddToQuote={handleAddToQuote}
            onSave={handleSave}
          />
        )}

        {activeTab === 'imposition' && (
          <LithoImpositionTab />
        )}

        {activeTab === 'preflight' && (
          <LithoPreflightTab />
        )}

        {activeTab === 'workflow' && (
          <LithoWorkflowTab />
        )}

        {activeTab === 'fleet' && (
          <LithoMachineTab />
        )}

        {activeTab === 'approvals' && (
          <LithoClientPortalTab />
        )}

        {activeTab === 'analytics' && (
          <LithoAnalyticsTab />
        )}
      </div>

      {/* Global Quote Builder modal */}
      {isQuoteModalOpen && (
        <QuoteModal 
          isOpen={true}
          prefilledItem={prefilledItem}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setPrefilledItem(null);
          }}
        />
      )}
    </div>
  );
}
