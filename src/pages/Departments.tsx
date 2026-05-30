import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit2, Search, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Department } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

const colorOptions = [
  { name: 'Red', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', dot: 'bg-red-500' },
  { name: 'Blue', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-500' },
  { name: 'Green', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', dot: 'bg-green-500' },
  { name: 'Orange', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', dot: 'bg-orange-500' },
  { name: 'Purple', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', dot: 'bg-purple-500' },
  { name: 'Pink', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', dot: 'bg-pink-500' },
  { name: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-500' },
  { name: 'Cyan', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', dot: 'bg-cyan-500' },
  { name: 'Amber', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
];

export default function Departments() {
  const { data: departments, loading } = useCollection<Department>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Department>>({
    name: '',
    description: '',
    color: 'Red',
    createdAt: Date.now()
  });

  const handleEdit = (dept: Department) => {
    console.log('Button Click: Edit Department', { id: dept.id });
    setEditingDepartment(dept);
    setFormData(dept);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    console.log('Button Click: Create Department New');
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: '',
      color: 'Red',
      createdAt: Date.now()
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Department', { isEdit: !!editingDepartment });
    setIsSaving(true);
    try {
      if (editingDepartment) {
        await updateDocument('departments', editingDepartment.id, formData);
      } else {
        await createDocument('departments', { ...formData, createdAt: Date.now() } as any);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Failed to save department details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Department', { id });
    setDeptToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deptToDelete) return;
    setIsUpdating(deptToDelete);
    try {
      await deleteDocument('departments', deptToDelete);
      toast.success('Department cell decommissioned.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to remove department.');
    } finally {
      setIsUpdating(null);
      setDeptToDelete(null);
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Production Departments</h2>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Manage resource centers and groupings</p>
        </div>
        <button 
          onClick={handleCreate}
          className="px-8 py-4 bg-brand text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center gap-3"
        >
          <Plus size={18} strokeWidth={3} />
          Create Department
        </button>
      </header>

      <div className="flex flex-col gap-6">
        <div className="relative group max-w-md">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search departments..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-8 py-5 bg-paper border-none rounded-3xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-brand/5 transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map(dept => {
            const color = colorOptions.find(c => c.name === dept.color) || colorOptions[0];
            return (
              <div 
                key={dept.id} 
                className={cn(
                  "bg-white p-8 rounded-3xl border border-border/50 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden",
                  isUpdating === dept.id && "opacity-50 pointer-events-none"
                )}
              >
                {isUpdating === dept.id && (
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                  </div>
                )}
                <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-10 -translate-y-16 translate-x-16 rounded-full", color.bg)} />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col">
                    <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border", color.bg, color.text, color.border)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", color.dot)} />
                      {dept.color} Dept
                    </div>
                    <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic mb-2 leading-none">{dept.name}</h3>
                    <p className="text-xs font-bold text-text-muted leading-relaxed line-clamp-2 mb-6 h-8">{dept.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1">Created At</span>
                    <span className="text-[10px] font-bold text-text-muted">{new Date(dept.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(dept)}
                      className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-blue-50/50 rounded-2xl transition-all"
                    >
                      <Edit2 size={16} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => handleDelete(dept.id)}
                      className="w-10 h-10 flex items-center justify-center text-text-light hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main tracking-tight">{editingDepartment ? 'Edit Department' : 'Create Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Department Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                  placeholder="e.g. Large Format"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                  placeholder="What happens in this department?"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Identifier Color</label>
                <div className="grid grid-cols-3 gap-3">
                  {colorOptions.map(option => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: option.name })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest",
                        formData.color === option.name 
                          ? cn(option.bg, option.text, option.border, "ring-2 ring-offset-2 ring-brand/20")
                          : "bg-surface border-border/50 text-text-muted opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", option.dot)} />
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-text-muted hover:bg-surface border border-border/50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} strokeWidth={3} />
                  )}
                  {isSaving ? 'Processing...' : (editingDepartment ? 'Update Dept' : 'Create Dept')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Dismantle Department?"
        message="This will remove the department grouping from the system. Associated machines and jobs will be unlinked from this specific resource center."
        confirmText="Dismantle"
        variant="danger"
        isLoading={!!isUpdating}
      />
    </div>
  );
}
