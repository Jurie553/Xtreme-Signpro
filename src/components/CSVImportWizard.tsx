import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, 
  Settings, Loader2, Play, RefreshCw, FileText, Check, AlertCircle, 
  Trash2, ChevronLeft, Building2, Mail, Phone, MapPin, Sparkles, User
} from 'lucide-react';
import { Client } from '../types';
import { createDocument } from '../lib/firestoreService';
import { toast } from 'sonner';

interface CSVImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  rawData: any[];
  headers: string[];
  fileName: string;
  existingClients: Client[];
  onComplete: () => void;
}

export interface ColumnMapping {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
  vatNumber: string;
  contactPerson: string;
}

interface RowValidationResult {
  index: number;
  rawRow: any;
  mappedData: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    address: string;
    vatNumber: string;
    contactPerson: string;
  };
  status: 'valid' | 'invalid' | 'duplicate';
  errors: string[];
  duplicateReason?: string;
}

interface ImportReport {
  totalFound: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errors: Array<{ rowNum: number; name: string; email: string; reason: string }>;
}

const ALIASES: Record<keyof ColumnMapping, string[]> = {
  name: ['clientname', 'name', 'companyname', 'customername', 'fullname', 'contactperson', 'contact', 'client name', 'customer name', 'full name'],
  email: ['email', 'emailaddress', 'e-mail', 'mail', 'email address'],
  phone: ['phone', 'mobile', 'phonenumber', 'cell', 'telephone', 'mobilephone', 'mobile phone', 'phone number'],
  companyName: ['companyname', 'company', 'organisation', 'organization', 'company name'],
  address: ['address', 'physicaladdress', 'location', 'deliveryaddress', 'street', 'address line 1', 'address line 2', 'site address'],
  vatNumber: ['vatnumber', 'vat', 'taxnumber', 'tax', 'vatno', 'taxno', 'vat number', 'tax registration'],
  contactPerson: ['contactperson', 'contact', 'representative', 'contact person', 'attn']
};

export default function CSVImportWizard({
  isOpen,
  onClose,
  rawData,
  headers,
  fileName,
  existingClients,
  onComplete
}: CSVImportWizardProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    vatNumber: '',
    contactPerson: ''
  });

  const [importStep, setImportStep] = useState<'configure' | 'importing' | 'results'>('configure');
  const [isSaving, setIsSaving] = useState(false);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  
  // Tab within config for viewing: 'all' | 'valid' | 'invalid' | 'duplicate'
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');

  // Trigger Automatic Column Mapping on Mount
  useEffect(() => {
    if (headers.length > 0) {
      const automaticMapping: ColumnMapping = {
        name: autoMapField('name'),
        email: autoMapField('email'),
        phone: autoMapField('phone'),
        companyName: autoMapField('companyName'),
        address: autoMapField('address'),
        vatNumber: autoMapField('vatNumber'),
        contactPerson: autoMapField('contactPerson')
      };
      setMapping(automaticMapping);
    }
  }, [headers]);

  // Helper helper to clean keys and check matching
  const autoMapField = (fieldKey: keyof ColumnMapping): string => {
    const list = ALIASES[fieldKey];
    
    // First Pass: Exact Match
    for (const h of headers) {
      const cleanH = h.toLowerCase().trim().replace(/[\s\-_]/g, '');
      for (const alias of list) {
        const cleanA = alias.toLowerCase().trim().replace(/[\s\-_]/g, '');
        if (cleanH === cleanA) return h;
      }
    }

    // Second Pass: Fuzzy string checking
    for (const h of headers) {
      const cleanH = h.toLowerCase().trim().replace(/[\s\-_]/g, '');
      for (const alias of list) {
        const cleanA = alias.toLowerCase().trim().replace(/[\s\-_]/g, '');
        if (cleanH.includes(cleanA) || cleanA.includes(cleanH)) return h;
      }
    }

    return '';
  };

  const handleMapChange = (targetKey: keyof ColumnMapping, csvCol: string) => {
    setMapping(prev => ({ ...prev, [targetKey]: csvCol }));
  };

  // Real-time parsed rows validation with full dependency safety
  const validatedRows = useMemo<RowValidationResult[]>(() => {
    if (!rawData.length) return [];

    return rawData.map((row, idx) => {
      // 1. Resolve raw fields from current mapping rules
      const nameVal = (mapping.name ? row[mapping.name] : '').toString().trim();
      const emailVal = (mapping.email ? row[mapping.email] : '').toString().trim();
      const phoneVal = (mapping.phone ? row[mapping.phone] : '').toString().trim();
      const comVal = (mapping.companyName ? row[mapping.companyName] : '').toString().trim();
      const addrVal = (mapping.address ? row[mapping.address] : '').toString().trim();
      const vatVal = (mapping.vatNumber ? row[mapping.vatNumber] : '').toString().trim();
      const contactVal = (mapping.contactPerson ? row[mapping.contactPerson] : '').toString().trim();

      const errors: string[] = [];
      let status: 'valid' | 'invalid' | 'duplicate' = 'valid';
      let duplicateReason = '';

      // 2. Format Validation
      if (!mapping.name) {
        errors.push('Client Name column is not mapped.');
      } else if (!nameVal) {
        errors.push('Missing client or contact person name.');
      }

      if (!mapping.email) {
        errors.push('Email column is not mapped.');
      } else if (!emailVal) {
        errors.push('Missing email address.');
      } else if (!emailVal.includes('@')) {
        errors.push(`Malformed email format ("${emailVal}").`);
      }

      // Check validation error state
      if (errors.length > 0) {
        status = 'invalid';
      } else {
        // 3. Duplicate Detection
        const matchedByName = existingClients.find(
          c => c.name.toLowerCase().trim() === nameVal.toLowerCase().trim()
        );
        const matchedByEmail = existingClients.find(
          c => c.email.toLowerCase().trim() === emailVal.toLowerCase().trim()
        );
        const matchedByPhone = phoneVal 
          ? existingClients.find(c => c.phone?.trim() === phoneVal.trim())
          : null;

        if (matchedByEmail) {
          status = 'duplicate';
          duplicateReason = `Email already assigned to "${matchedByEmail.name}" in registry.`;
        } else if (matchedByPhone) {
          status = 'duplicate';
          duplicateReason = `Phone number exists for client "${matchedByPhone.name}".`;
        } else if (matchedByName) {
          status = 'duplicate';
          duplicateReason = `Name matches existing client record for "${matchedByName.name}".`;
        }
      }

      return {
        index: idx + 1,
        rawRow: row,
        mappedData: {
          name: nameVal,
          email: emailVal,
          phone: phoneVal,
          companyName: comVal,
          address: addrVal,
          vatNumber: vatVal,
          contactPerson: contactVal
        },
        status,
        errors,
        duplicateReason
      };
    });
  }, [rawData, mapping, existingClients]);

  // Totals calculations
  const totals = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let duplicates = 0;

    validatedRows.forEach(r => {
      if (r.status === 'valid') valid++;
      if (r.status === 'invalid') invalid++;
      if (r.status === 'duplicate') duplicates++;
    });

    return { valid, invalid, duplicates, total: validatedRows.length };
  }, [validatedRows]);

  // Filtered previews
  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'all') return validatedRows;
    return validatedRows.filter(r => r.status === previewFilter);
  }, [validatedRows, previewFilter]);

  // Execute Batch Imports
  const handleStartImport = async () => {
    const importable = validatedRows.filter(r => r.status === 'valid');
    if (importable.length === 0) {
      toast.error('Zero valid clients found to import. Please double check column mapping.');
      return;
    }

    setImportStep('importing');
    setIsSaving(true);
    setCurrentImportIndex(0);

    let importedCount = 0;
    let duplicateCount = totals.duplicates;
    let skippedCount = totals.invalid;
    const errorsList: Array<{ rowNum: number; name: string; email: string; reason: string }> = [];

    // Save skipped errors to the final report directly
    validatedRows.forEach(r => {
      if (r.status === 'invalid') {
        errorsList.push({
          rowNum: r.index,
          name: r.mappedData.name || '(Empty)',
          email: r.mappedData.email || '(Empty)',
          reason: r.errors.join(', ')
        });
      } else if (r.status === 'duplicate') {
        errorsList.push({
          rowNum: r.index,
          name: r.mappedData.name,
          email: r.mappedData.email,
          reason: r.duplicateReason || 'Duplicate client skipped'
        });
      }
    });

    // Sequential document writing to Firebase
    for (let i = 0; i < importable.length; i++) {
      const record = importable[i];
      setCurrentImportIndex(i + 1);
      try {
        const docPayload = {
          name: record.mappedData.name,
          email: record.mappedData.email,
          phone: record.mappedData.phone || '',
          companyName: record.mappedData.companyName || record.mappedData.name, // Auto-fallback if empty
          address: record.mappedData.address || '',
          vatNumber: record.mappedData.vatNumber || '',
          contactPerson: record.mappedData.contactPerson || '',
          createdAt: Date.now()
        };
        await createDocument('clients', docPayload);
        importedCount++;
      } catch (err: any) {
        console.error('Failed to import row index', record.index, err);
        skippedCount++;
        errorsList.push({
          rowNum: record.index,
          name: record.mappedData.name,
          email: record.mappedData.email,
          reason: err?.message || 'Firestore database write error'
        });
      }
    }

    setImportReport({
      totalFound: totals.total,
      importedCount,
      skippedCount,
      duplicateCount,
      errors: errorsList
    });

    setIsSaving(false);
    setImportStep('results');
    onComplete();
    
    if (importedCount > 0) {
      toast.success(`Complete: ${importedCount} clients registered successfully!`);
    } else {
      toast.warning('No clients were imported during the process.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md overflow-hidden">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-200/50">
        
        {/* Modal Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shadow-sm">
              <Upload size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic font-serif">
                CSV Client Import Wizard
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Flexible spreadsheet parser & duplicate protection
              </p>
            </div>
          </div>
          {importStep !== 'importing' && (
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-white border hover:border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all shadow-sm"
              title="Close importer"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Step 1: Mapping & Preview Screen */}
        {importStep === 'configure' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            
            {/* Left side: COLUMN MAPPING PANEL (1/3 Width) */}
            <div className="w-full md:w-85 border-r border-slate-100 p-6 overflow-y-auto shrink-0 bg-slate-50/50 flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 mb-1">
                  <Settings size={14} className="text-brand" />
                  Map Fields
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Align your CSV headers to the CRM registration model
                </p>
              </div>

              {/* Mapping Controls Box */}
              <div className="space-y-4 flex-1">
                {/* Field: Customer Name */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <User size={12} className="text-brand" />
                      Client Name <span className="text-red-505 font-black">*</span>
                    </label>
                    {mapping.name ? (
                      <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Mapped
                      </span>
                    ) : (
                      <span className="text-[8px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Required
                      </span>
                    )}
                  </div>
                  <select
                    value={mapping.name}
                    onChange={(e) => handleMapChange('name', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand/5"
                  >
                    <option value="">-- Choose Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: Email */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Mail size={12} className="text-brand" />
                      Email Address <span className="text-red-505 font-black">*</span>
                    </label>
                    {mapping.email ? (
                      <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Mapped
                      </span>
                    ) : (
                      <span className="text-[8px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Required
                      </span>
                    )}
                  </div>
                  <select
                    value={mapping.email}
                    onChange={(e) => handleMapChange('email', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand/5"
                  >
                    <option value="">-- Choose Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: Phone */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-500" />
                    Phone / Mobile
                  </label>
                  <select
                    value={mapping.phone}
                    onChange={(e) => handleMapChange('phone', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4"
                  >
                    <option value="">-- Optional / Ignore --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: Company Name */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-500" />
                    Company Name
                  </label>
                  <select
                    value={mapping.companyName}
                    onChange={(e) => handleMapChange('companyName', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4"
                  >
                    <option value="">-- Optional / Ignore --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: Address */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-500" />
                    Physical Address
                  </label>
                  <select
                    value={mapping.address}
                    onChange={(e) => handleMapChange('address', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4"
                  >
                    <option value="">-- Optional / Ignore --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: VAT Number */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-500" />
                    VAT / Tax Number
                  </label>
                  <select
                    value={mapping.vatNumber}
                    onChange={(e) => handleMapChange('vatNumber', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4"
                  >
                    <option value="">-- Optional / Ignore --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Field: Contact Person */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-slate-500" />
                    Alternative Contact Representative
                  </label>
                  <select
                    value={mapping.contactPerson}
                    onChange={(e) => handleMapChange('contactPerson', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4"
                  >
                    <option value="">-- Optional / Ignore --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Informative tips box */}
              <div className="p-4 bg-blue-50 border border-blue-100/60 rounded-2xl flex gap-3 text-blue-700">
                <HelpCircle size={18} className="shrink-0 mt-0.5 stroke-[2.5]" />
                <div className="text-[10px] leading-relaxed">
                  <strong className="font-bold flex items-center gap-1 mb-0.5">Flexible Detection System</strong>
                  Mapped headers are analyzed immediately, highlighting format faults or duplicate records before you perform database writes.
                </div>
              </div>
            </div>

            {/* Right side: REAL-TIME AUDIT & PREVIEW GRID (2/3 Width) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white p-8">
              
              {/* Filter Tabs & Counters Header */}
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight italic flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    Import Batch Registry: {fileName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Audited from parsed file ({rawData.length} rows loaded)
                  </p>
                </div>

                {/* Tab Pill Filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                      previewFilter === 'all' 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-55'
                    }`}
                  >
                    All Rows ({totals.total})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                      previewFilter === 'valid' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-white text-emerald-600 border-emerald-110 hover:bg-emerald-50/30'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    Valid ({totals.valid})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('duplicate')}
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                      previewFilter === 'duplicate' 
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                      : 'bg-white text-amber-600 border-amber-110 hover:bg-amber-50/30'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    Duplicates ({totals.duplicates})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('invalid')}
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                      previewFilter === 'invalid' 
                      ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                      : 'bg-white text-red-600 border-red-110 hover:bg-red-50/30'
                    }`}
                  >
                    <AlertCircle size={12} />
                    Skips / Invalid ({totals.invalid})
                  </button>
                </div>
              </div>

              {/* Core Preview Rows list */}
              <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-[1.5rem] bg-slate-50/30">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-12">Row</th>
                      <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/3">Client Identity</th>
                      <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/3">Contact Mapped</th>
                      <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Validation Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-bold italic text-xs uppercase tracking-wider">
                          No matching records returned by preview mapping filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row, rIdx) => (
                        <tr key={row.index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 text-center font-mono text-xs font-bold text-slate-400 border-r border-slate-50 select-none">
                            {row.index}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-800">
                                {row.mappedData.name || <span className="text-red-400 italic font-bold">"(No Name Mapped)"</span>}
                              </span>
                              {row.mappedData.companyName && (
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <Building2 size={10} />
                                  {row.mappedData.companyName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              {row.mappedData.email ? (
                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 select-all">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  {row.mappedData.email}
                                </span>
                              ) : (
                                <span className="text-xs italic text-red-400 font-bold">"(No Email Mapped)"</span>
                              )}
                              {row.mappedData.phone && (
                                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 border-t border-slate-50/50 pt-1 select-all">
                                  <Phone size={11} className="text-slate-400 shrink-0" />
                                  {row.mappedData.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 align-top items-start justify-center">
                              {row.status === 'valid' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <CheckCircle2 size={10} className="stroke-[3]" />
                                  Valid & Safe
                                </span>
                              )}
                              
                              {row.status === 'duplicate' && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <AlertTriangle size={10} className="stroke-[3]" />
                                    Duplicate skipped
                                  </span>
                                  <p className="text-[9px] text-amber-600/80 font-bold italic leading-tight">
                                    {row.duplicateReason}
                                  </p>
                                </div>
                              )}

                              {row.status === 'invalid' && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <AlertCircle size={10} className="stroke-[3]" />
                                    Fault Skip
                                  </span>
                                  <ul className="list-none p-0 m-0 space-y-0.5">
                                    {row.errors.map((msg, i) => (
                                      <li key={i} className="text-[9px] text-red-500/80 font-bold italic flex items-center gap-1 leading-tight">
                                        • {msg}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom control row */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-mono font-bold text-xs text-slate-500">
                    {totals.valid} / {totals.total} OK
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      Ready to Proceed?
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Duplicates ({totals.duplicates}) and Skips ({totals.invalid}) will be omitted automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 self-stretch sm:self-auto shrink-0">
                  <button
                    onClick={onClose}
                    className="px-6 py-4 border border-slate-250 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel Action
                  </button>
                  <button
                    disabled={totals.valid === 0}
                    onClick={handleStartImport}
                    className="flex-1 sm:flex-none px-8 py-4 bg-brand text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-brand/10 hover:brightness-110 active:scale-95 disabled:opacity-40 select-none transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={12} className="stroke-[3]" />
                    Accept & Register {totals.valid} Clients
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Step 2: Injecting Data Modal Loader */}
        {importStep === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 py-24 bg-white select-none">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <Loader2 className="absolute text-brand animate-spin" size={72} strokeWidth={2} />
              <div className="relative z-10 w-16 h-16 bg-brand/5 text-brand rounded-[1.5rem] flex items-center justify-center">
                <Upload size={28} />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic font-serif">
              Importing CRM Records
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3">
              Writing client profiles dynamically to Central Firestore Registry
            </p>

            {/* Dynamic Progress Indicator bar */}
            <div className="w-full max-w-md mt-10 space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-widest text-[10px]">Processing client ledger...</span>
                <span>{currentImportIndex} / {totals.valid} finished</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand rounded-full transition-all duration-300" 
                  style={{ width: `${(currentImportIndex / totals.valid) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Final Reports Screen */}
        {importStep === 'results' && importReport && (
          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/40 flex flex-col gap-8">
            
            {/* Visual Header Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
              
              <div className="bg-white p-6 rounded-[2rem] border border-slate-150/85 shadow-sm text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mb-3">
                  <FileText size={18} />
                </div>
                <h4 className="text-2xl font-black text-slate-800 tabular-nums">{importReport.totalFound}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Spreadsheet Rows</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Check size={18} className="stroke-[3]" />
                </div>
                <h4 className="text-2xl font-black text-emerald-600 tabular-nums">{importReport.importedCount}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-1">Clients Created</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-amber-100 shadow-sm text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <AlertTriangle size={18} className="stroke-[3]" />
                </div>
                <h4 className="text-2xl font-black text-amber-600 tabular-nums">{importReport.duplicateCount}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1">Duplicates Avoided</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-red-100 shadow-sm text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-3">
                  <AlertCircle size={18} className="stroke-[3]" />
                </div>
                <h4 className="text-2xl font-black text-red-500 tabular-nums">{importReport.skippedCount}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mt-1">Rows Skipped</p>
              </div>

            </div>

            {/* Error Diagnostics Logging Card */}
            {importReport.errors.length > 0 && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex-1 flex flex-col min-h-0 min-h-[250px] overflow-hidden">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 mb-3 shrink-0">
                  <AlertCircle size={14} className="text-red-500" />
                  Skipped Rows & Diagnostics details
                </h4>
                
                <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-xl bg-slate-50/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-4 py-3 text-center w-16">Row Num</th>
                        <th className="px-4 py-3">Client Identity</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Diagnostic Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-xs">
                      {importReport.errors.map((err, index) => (
                        <tr key={index} className="hover:bg-slate-50/45">
                          <td className="px-4 py-3 text-center font-mono text-slate-400 font-bold border-r border-slate-50">{err.rowNum}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{err.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{err.email}</td>
                          <td className="px-4 py-3 text-slate-500 font-medium italic text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 shrink-0 inline-block" />
                            {err.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty reports / Perfect Import State */}
            {importReport.importedCount === importReport.totalFound && (
              <div className="bg-white p-8 py-16 rounded-[2.5rem] border border-emerald-100 shadow-sm text-center flex flex-col items-center justify-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={32} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">
                    Pristine Batch Import!
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Every sheet record was created successfully in the CRM without validation errors.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom finish toolbar */}
            <div className="flex justify-end gap-4 shrink-0 mt-2">
              <button
                onClick={onClose}
                className="px-8 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                Done & Return to CRM
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
