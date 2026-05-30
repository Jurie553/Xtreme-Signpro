import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-text-main/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                variant === 'danger' ? "bg-red-50 text-red-600" :
                variant === 'warning' ? "bg-amber-50 text-amber-600" :
                "bg-blue-50 text-blue-600"
              )}>
                <AlertCircle size={24} />
              </div>
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} className="text-text-light" />
              </button>
            </div>

            <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic mb-2">
              {title}
            </h3>
            <p className="text-xs font-bold text-text-light leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-4 bg-surface text-[10px] font-black uppercase tracking-widest text-text-muted rounded-2xl hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70",
                  variant === 'danger' ? "bg-red-600 shadow-red-100 hover:bg-red-700" :
                  variant === 'warning' ? "bg-amber-500 shadow-amber-100 hover:bg-amber-600" :
                  "bg-brand shadow-blue-100 hover:bg-brand/90"
                )}
              >
                {isLoading && (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
                {isLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
