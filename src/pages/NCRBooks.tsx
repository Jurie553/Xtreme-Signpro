import React, { useState, useMemo } from 'react';
import { Layers, Library, Hash, Coins, Shuffle, Wrench, UserCheck, BarChart3, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { NCRBook } from '../types';
import { toast } from 'sonner';

// Sub Tabs Imports
import NCRSpecsTab from '../components/ncr/NCRSpecsTab';
import NCRNumberingTab from '../components/ncr/NCRNumberingTab';
import NCRCostingTab from '../components/ncr/NCRCostingTab';
import NCRWorkflowTab from '../components/ncr/NCRWorkflowTab';
import NCRFinishingTab from '../components/ncr/NCRFinishingTab';
import NCRClientPortalTab from '../components/ncr/NCRClientPortalTab';
import NCRAnalyticsTab from '../components/ncr/NCRAnalyticsTab';

type ActiveTab = 'specs' | 'numbering' | 'costing' | 'workflow' | 'finishing' | 'approvals' | 'analytics';

export default function NCRBooks() {
  const { data: books, loading } = useCollection<NCRBook>('ncr_books');
  const [activeTab, setActiveTab] = useState<ActiveTab>('specs');
  const [selectedBook, setSelectedBook] = useState<NCRBook | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Default select first book
  React.useEffect(() => {
    if (books.length > 0 && !selectedBook) {
      setSelectedBook(books[0]);
    }
  }, [books, selectedBook]);

  const handleSave = async (bookData: Partial<NCRBook>, id?: string) => {
    try {
      if (id) {
        setIsUpdating(id);
        await updateDocument('ncr_books', id, bookData);
        // Refresh selected
        setSelectedBook(prev => prev ? { ...prev, ...bookData } : null);
        toast.success('NCR specification updated successfully');
      } else {
        const newDoc = await createDocument('ncr_books', { ...bookData, createdAt: Date.now() });
        toast.success('New NCR product registered successfully');
      }
    } catch (error) {
      console.error('Error saving NCR spec:', error);
      toast.error('Failed to save specifications');
      throw error;
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDuplicate = async (book: NCRBook) => {
    setIsUpdating(book.id);
    try {
      const { id, ...duplicateData } = book;
      await createDocument('ncr_books', {
        ...duplicateData,
        name: `${book.name} (Copy)`,
        createdAt: Date.now()
      });
      toast.success('NCR specification duplicated successfully.');
    } catch (error) {
      console.error('Error duplicating NCR spec:', error);
      toast.error('Failed to duplicate NCR specification.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    toast.custom((t) => (
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 min-w-[320px] animate-in slide-in-from-bottom-5">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 mb-2">Delete Specification?</h3>
        <p className="text-xs text-slate-450 font-bold mb-6 uppercase leading-relaxed">This action is irreversible. Removing this NCR configuration removes it from active calculations.</p>
        <div className="flex gap-3">
          <button onClick={() => toast.dismiss(t)} className="flex-1 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t);
              setIsUpdating(id);
              try {
                await deleteDocument('ncr_books', id);
                setSelectedBook(null);
                toast.success('Specification removed from print registry');
              } catch (error) {
                toast.error('Failed to remove registry record.');
              } finally {
                setIsUpdating(null);
              }
            }} 
            className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-100"
          >
            Remove Spec
          </button>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full" 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      
      {/* Dynamic Module Header Section */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-850 border border-slate-200 shadow-sm">
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-850 tracking-tight uppercase italic flex items-center gap-2">
              NCR Carbonless MIS/ERP Module
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Carbonless Set Sequence, sequential numbering GTOs, and specialty block bindery tracking
            </p>
          </div>
        </div>
      </motion.header>

      {/* Responsive Glassmorphism Navigation Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-slate-50/60 p-1.5 rounded-2xl border border-slate-150/40 shadow-sm">
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
          onClick={() => setActiveTab('numbering')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'numbering' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Hash size={15} />
          <span>Numbering Range</span>
        </button>

        <button
          onClick={() => setActiveTab('costing')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'costing' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Coins size={15} />
          <span>Dynamic Costing</span>
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
          onClick={() => setActiveTab('finishing')}
          className={cn(
            "p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 justify-center leading-none select-none",
            activeTab === 'finishing' 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
          )}
        >
          <Wrench size={15} />
          <span>Specialty Bindery</span>
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
          <span>Client Proofs</span>
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

      {/* Tabs Container Content render */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedBook?.id || 'none')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'specs' && (
              <NCRSpecsTab 
                books={books}
                onSelectBook={setSelectedBook}
                selectedBook={selectedBook}
                onSave={handleSave}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                isUpdating={isUpdating}
              />
            )}

            {activeTab === 'numbering' && (
              <NCRNumberingTab 
                selectedBook={selectedBook}
              />
            )}

            {activeTab === 'costing' && (
              <NCRCostingTab 
                selectedBook={selectedBook}
              />
            )}

            {activeTab === 'workflow' && (
              <NCRWorkflowTab 
                selectedBook={selectedBook}
              />
            )}

            {activeTab === 'finishing' && (
              <NCRFinishingTab 
                selectedBook={selectedBook}
              />
            )}

            {activeTab === 'approvals' && (
              <NCRClientPortalTab 
                selectedBook={selectedBook}
              />
            )}

            {activeTab === 'analytics' && (
              <NCRAnalyticsTab 
                books={books}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
