import React, { useState } from 'react';
import { Cpu, Edit2, Trash2, Zap, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Machine } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function Machines() {
  const { data: machines, loading } = useCollection<Machine>('machines');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleEdit = (machine: Machine) => {
    console.log('Button Click: Edit Machine', { id: machine.id });
    setEditingMachine(machine);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Machine', { id });
    setMachineToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!machineToDelete) return;
    setIsUpdating(machineToDelete);
    try {
      await deleteDocument('machines', machineToDelete);
      toast.success('Machine record purged from registry.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to purge record.');
    } finally {
      setIsUpdating(null);
      setMachineToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Machine Fleet</h2>
          <p className="text-xs text-text-light font-medium">Manage your production hardware and hourly rates</p>
        </div>
        <button 
          onClick={() => {
            setEditingMachine(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Machine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {machines.map((machine) => (
          <div 
            key={machine.id} 
            className={cn(
              "card-minimal group relative flex flex-col hover:border-brand/40 transition-all",
              isUpdating === machine.id && "opacity-50 pointer-events-none"
            )}
          >
            {isUpdating === machine.id && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-text-light group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                  <Cpu size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main tracking-tight">{machine.name}</h3>
                  <p className="text-[10px] text-text-light font-bold uppercase tracking-widest">{machine.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-2 uppercase tracking-widest",
                  machine.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", machine.status === 'Active' ? "bg-emerald-500" : "bg-orange-400")} />
                  {machine.status}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-light uppercase font-black tracking-widest mb-1">Operating Cost</span>
                  <span className="text-sm font-bold text-text-main tabular-nums">
                    R {machine.hourlyRate?.toLocaleString()}/{machine.costUnit}
                  </span>
                </div>
                {machine.maxWidth && (
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-light uppercase font-black tracking-widest mb-1">Max Width</span>
                    <span className="text-sm font-bold text-text-main tabular-nums">{machine.maxWidth} mm</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-xl border border-border border-dashed">
                <div className="flex justify-between items-center text-[10px] font-black text-text-light uppercase tracking-widest mb-1 pb-1 border-b border-border/10">
                   <span>Service Log</span>
                   <span className="text-brand">SA-01</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <span className="text-[7px] font-black text-text-light uppercase tracking-[0.2em] block mb-0.5">Last Check</span>
                      <span className="text-[10px] font-black text-text-main uppercase">{machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'Never'}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[7px] font-black text-text-light uppercase tracking-[0.2em] block mb-0.5">Next Due</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        machine.nextMaintenanceDate && machine.nextMaintenanceDate < Date.now() ? "text-red-500" : "text-emerald-600"
                      )}>
                        {machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'Pending'}
                      </span>
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-xl border border-border border-dashed">
                <div className="flex justify-between items-center text-[10px] font-black text-text-light uppercase tracking-widest">
                   <span>Capacity Load</span>
                   <span>0%</span>
                </div>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-1000" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5 border-t border-dashed border-border flex items-center justify-between">
              <span className="text-[9px] text-text-light font-black uppercase tracking-[0.2em]">Ready For Production</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(machine)} className="p-2 text-text-light hover:text-brand hover:bg-white rounded-lg transition-all"><Edit2 size={16} strokeWidth={2.5} /></button>
                <button onClick={() => handleDelete(machine.id)} className="p-2 text-text-light hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
        ))}
        {machines.length === 0 && (
          <div className="col-span-full py-20 text-center card-minimal border-dashed">
             <AlertTriangle className="mx-auto text-text-light mb-4" size={32} />
             <p className="font-bold text-text-muted italic">No machines registered</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <MachineModal 
          machine={editingMachine} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Purge Machine Specification?"
        message="This action cannot be undone. All historical production data linked to this asset will remain in logs, but the machine will be removed from future routing."
        confirmText="Purge Machine"
        variant="danger"
        isLoading={!!isUpdating}
      />
    </div>
  );
}

function MachineModal({ machine, onClose }: { machine: Machine | null, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Machine>>({
    name: machine?.name || '',
    type: machine?.type || 'Printer',
    maxWidth: machine?.maxWidth || 0,
    hourlyRate: machine?.hourlyRate || 0,
    costUnit: machine?.costUnit || 'hr',
    status: machine?.status || 'Active',
    lastMaintenanceDate: machine?.lastMaintenanceDate || 0,
    nextMaintenanceDate: machine?.nextMaintenanceDate || 0
  });

  const formatDateLabel = (timestamp?: number) => {
    if (!timestamp) return 'No schedule';
    return new Date(timestamp).toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Machine Details', { isEdit: !!machine });
    setIsSaving(true);
    try {
      if (machine) {
        await updateDocument('machines', machine.id, formData);
      } else {
        await createDocument('machines', formData as any);
      }
      onClose();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error('Failed to save machine details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{machine ? 'Edit Machine' : 'Add New Machine'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Machine Name</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Category / Type</label>
                <input required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Max Print Width (mm)</label>
                <input type="number" value={formData.maxWidth} onChange={(e) => setFormData({ ...formData, maxWidth: Number(e.target.value) })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Internal Cost (R)</label>
                <input type="number" step="0.01" value={formData.costPerHour || 0} onChange={(e) => setFormData({ ...formData, costPerHour: Number(e.target.value) })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Billing Unit</label>
                <select value={formData.costUnit} onChange={(e) => setFormData({ ...formData, costUnit: e.target.value as any })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand">
                  <option value="hr">Per Hour</option>
                  <option value="m²">Per m²</option>
                  <option value="page">Per Page</option>
                  <option value="item">Per Item</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Billing Rate (R)</label>
                <input required type="number" step="0.01" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" />
              </div>
              <div className="flex items-end">
                <p className="text-[9px] text-text-light font-bold italic mb-4">Markup: {formData.hourlyRate && formData.costPerHour ? (((formData.hourlyRate / formData.costPerHour) - 1) * 100).toFixed(0) : 0}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Last Maintenance</label>
                <input 
                  type="date" 
                  value={formData.lastMaintenanceDate ? new Date(formData.lastMaintenanceDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value ? new Date(e.target.value).getTime() : 0 })} 
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Next Scheduled</label>
                <input 
                  type="date" 
                  value={formData.nextMaintenanceDate ? new Date(formData.nextMaintenanceDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value ? new Date(e.target.value).getTime() : 0 })} 
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand" 
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 font-bold text-text-muted hover:bg-gray-100 rounded-xl disabled:opacity-50">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Saving...' : 'Register Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
