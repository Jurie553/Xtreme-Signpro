import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert } from 'lucide-react';
import { Material, Supplier } from '../../types';
import MaterialForm from './MaterialForm';
import MaterialPreview from './MaterialPreview';
import { validateMaterial, sanitizeMaterial, MaterialValidationError } from './MaterialValidation';
import { createDocument, updateDocument } from '../../lib/firestoreService';
import { toast } from 'sonner';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  suppliers: Supplier[];
  onSaved?: () => void;
}

export default function MaterialModal({
  isOpen,
  onClose,
  material,
  suppliers,
  onSaved
}: MaterialModalProps) {
  const [formData, setFormData] = useState<Partial<Material>>({});
  const [sellPriceInput, setSellPriceInput] = useState<number>(0);
  const [errors, setErrors] = useState<MaterialValidationError>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync state on load
  useEffect(() => {
    if (isOpen) {
      if (material) {
        setFormData(material);
        setSellPriceInput(material.sellPerSqm || 0);
      } else {
        // Initialize fields for a new material cleanly without mock items
        setFormData({
          name: '',
          category: 'Print Media',
          unit: 'm²',
          costPrice: 0,
          costPerSqm: 0,
          sellPerSqm: 0,
          stockLevel: 0,
          minStock: 10,
          location: '',
          supplierId: suppliers.length > 0 ? suppliers[0].id : '',
          width: 1.37,
          rollLength: 50,
          gsm: 120,
          durabilityYears: 3,
          indoorOutdoor: 'Both',
          warehouse: 'Warehouse Alpha',
          rack: '03',
          shelf: 'B',
          bin: '14',
          reservedStock: 0,
          incomingStock: 0,
          damagedStock: 0,
          offcuts: [],
          pricingTrends: [100, 100, 100, 100, 100],
          printMethods: ['Digital'],
          inkTypes: ['Eco-Solvent'],
          fireRating: 'Class B1'
        });
        setSellPriceInput(0);
      }
      setErrors({});
    }
  }, [isOpen, material, suppliers]);

  // Sync sellPerSqm back to formData
  useEffect(() => {
    if (formData.sellPerSqm !== sellPriceInput) {
      setFormData(prev => ({ ...prev, sellPerSqm: sellPriceInput }));
    }
  }, [sellPriceInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    // Validate
    const validationErrors = validateMaterial(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSaving(false);
      toast.error('Specification validation failed. Please check required fields.');
      return;
    }

    try {
      // Sanitize
      const defaultSupplierId = suppliers.length > 0 ? suppliers[0].id : '';
      const payload = sanitizeMaterial(formData, defaultSupplierId);

      if (material && material.id) {
        const success = await updateDocument('materials', material.id, payload);
        if (success) {
          toast.success(`Substrate "${payload.name}" successfully updated.`);
        } else {
          throw new Error('Database update rejected.');
        }
      } else {
        const docId = await createDocument('materials', payload);
        if (docId) {
          toast.success(`New substrate "${payload.name}" added to registry.`);
        } else {
          throw new Error('Database insertion rejected.');
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(`Firestore save error: ${err.message || 'unknown-error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 z-50 flex items-center justify-center overflow-hidden">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-5xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-200/50 mx-4"
          >
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100/80 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase text-brand-accent tracking-[0.25em] block mb-1">Stock Control</span>
                <h3 className="text-sm font-black tracking-tight uppercase">
                  {material ? 'Adjust Substrate Specifications' : 'Register New Warehouse Substrate'}
                </h3>
              </div>
              
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all border border-slate-700 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Container (Two-column) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Form column */}
              <MaterialForm
                formData={formData}
                setFormData={setFormData}
                sellPriceInput={sellPriceInput}
                setSellPriceInput={setSellPriceInput}
                suppliers={suppliers}
                errors={errors}
                isSaving={isSaving}
                onSubmit={handleSubmit}
              />

              {/* Preview column */}
              <MaterialPreview
                data={formData}
                suppliers={suppliers}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
