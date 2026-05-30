import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ZohoSettingsTab from '../components/ZohoSettingsTab';
import { Settings, Save, AlertCircle, Check, Percent, Banknote, Layers, Building2, Mail, Phone, MapPin, Globe, CreditCard, Upload, Sliders, Coins, Trash2, Plus, Info, Workflow, CheckSquare, ShieldCheck, FileText, ChevronRight, List, Sparkles, BookOpen, Clock, Settings2 } from 'lucide-react';
import { useCollection, updateDocument, createDocument, setDocument } from '../lib/firestoreService';
import { PricingSettings, CompanySettings } from '../types';
import { DEFAULT_PRICING_SETTINGS } from '../lib/pricingService';
import { cn } from '../lib/utils';
import { AddressInput } from '../components/AddressInput';
import { toast } from 'sonner';

const SETTINGS_COLLECTION = 'settings';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'company',
  name: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  registrationNumber: '',
  bankName: '',
  accountNumber: '',
  branchCode: '',
  website: '',
  logoUrl: '',
  jobCardPrefix: 'Jobcard',
  quoteEmailTemplate: `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nSummary:\n{{itemsSummary}}\n\nTotal: {{totalAmount}}\n\nYou can view and approve the quote here: {{approvalUrl}}\n\nRegards,\n{{companyName}}`,
  quoteWhatsappTemplate: `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nTotal: {{totalAmount}}\n\nView here: {{approvalUrl}}`,
  jobEmailTemplate: `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}:\n\nCurrent Stage: {{jobStage}}\nProduct: {{productName}}\nEstimated Completion: {{dueDate}}\n\nTrack your order status here: {{trackingUrl}}\n\nRegards,\n{{companyName}}`,
  jobWhatsappTemplate: `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}.\nStage: {{jobStage}}\nReady: {{dueDate}}\n\nTrack: {{trackingUrl}}`,
  artworkEmailTemplate: `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready for review!\n\nYou can view and approve the artwork here: {{approvalUrl}}\n\nPlease let us know if any changes are required.\n\nRegards,\n{{companyName}}`,
  artworkWhatsappTemplate: `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready! 🎨\n\nView and approve here: {{approvalUrl}}`
};

const DEFAULT_JOBCARD_CONFIG = {
  id: 'jobcard_config',
  templates: [
    {
      id: 'ncr-dup',
      name: 'Standard NCR Duplicate Book',
      description: 'Pre-collated White & Pink duplicate set. Standard spine stapled and taped left-edge with red sequence numbering.',
      stages: [
        { id: 'Prepress', name: 'File preflight & Numbering setup', duration: 15, notes: 'Verify front-only ink configuration. Align numbering block.' },
        { id: 'Printing', name: 'Carbonless CB/CF digital run', duration: 40, notes: 'Register White CB on feed tray 1, Pink CF on tray 2.' },
        { id: 'Finishing', name: 'Wire stapling & spine tape tape-on', duration: 50, notes: 'Align sheets precisely. Spine tape 12mm overlap. Board back backing.' }
      ],
      steps: [
        'Confirm starting number corresponds to client history log.',
        'Check sheet feeding order: CB first, then CF at bottom.',
        'Apply perforation margin pressure check before print.',
        'Brush fan-apart adhesive evenly onto binder edges.'
      ],
      bindery: {
        stitchType: 'Staple Bound (Saddle/Spine)',
        spineTapeColor: 'Black Croco Tape',
        coverStockGsm: 240,
        backingBoardThickness: 'Paperboard (1200mic)',
        trimmingSpecs: 'No trim, size A4/DL exact sizes',
        instructions: [
          'Stack 50 sets perfectly flush.',
          'Staple 2 heavy-wire stitches along left binding margin.',
          'Apply 1 inch black croco tape over raw stapled edge.'
        ]
      }
    },
    {
      id: 'ncr-trip',
      name: 'Standard NCR Triplicate Book',
      description: 'Tri-layer chemical transfer book: White CB, Yellow CFB, and Pink CF. Left spine taped with top perforation.',
      stages: [
        { id: 'Prepress', name: 'Digital file alignment & registration check', duration: 20, notes: 'Verify 3-ply coloring layout matches client proof.' },
        { id: 'Printing', name: '3-Ply collated press run', duration: 60, notes: 'Set tray: Tray 1 White CB, Tray 2 Yellow CFB, Tray 3 Pink CF.' },
        { id: 'Finishing', name: 'Precision collation & numbering audit', duration: 45, notes: 'Perform manual audit on every 20th set for skipped numbers.' }
      ],
      steps: [
        'Confirm numbering start digit and verify counting digits are right.',
        'Perform scratch-test on Coated Front & Coated Back papers to identify correct faces.',
        'Align margin perforation wheels to exactly 15mm from binding edge.',
        'Separate books with cardboard divider'
      ],
      bindery: {
        stitchType: 'Saddle Wire Stitching',
        spineTapeColor: 'Red Spine Tape',
        coverStockGsm: 240,
        backingBoardThickness: 'Rigid greyboard (1800mic)',
        trimmingSpecs: 'Flush cut guillotine trim other three edges',
        instructions: [
          'Pack 50 sets of triplicate layers together.',
          'Saddle-wire stitch through cover board backer.',
          'Wrap binding with red bookbinder gummed cloth tape.'
        ]
      }
    },
    {
      id: 'large-format',
      name: 'Heavy Signage Board Banner',
      description: 'Industrial large format vinyl application with laminate overlay and grommets.',
      stages: [
        { id: 'Prepress', name: 'Pre-flight high-res pixel count proofing', duration: 15, notes: 'Set print scale exact 1:1. Bleed margin 50mm.' },
        { id: 'Printing', name: 'Wide-format eco-solvent print run', duration: 75, notes: 'Calibrate tension bars. Run nozzle test prior to high density ink spraying.' },
        { id: 'Finishing', name: 'Heavy laminate shield heat seal', duration: 30, notes: 'Laminating roller set to steady 115 degrees.' }
      ],
      steps: [
        'Check vinyl alignment on rolling tension bars before starting sweep.',
        'Verify high-density UV protective ink configuration matches exterior specifications.',
        'Trim border bleed flush with security aluminum guides.',
        'Affix brass grommets securely at 500mm spacing intervals.'
      ],
      bindery: {
        stitchType: 'Welded Hem with Grommets',
        spineTapeColor: 'N/A',
        coverStockGsm: 0,
        backingBoardThickness: 'Aluminum composite backing (3mm)',
        trimmingSpecs: 'Trimmed flush with crop guides',
        instructions: [
          'Fold edges 40mm for hem weld.',
          'Apply industrial vinyl adhesive and clamp flat.',
          'Punch brass grommets in all four corners.'
        ]
      }
    }
  ],
  productionStages: [
    { id: 'Prepress', name: 'Artwork Pre-flight & Setup', operatorRole: 'DTP Operator', estimatedHrs: 0.25, detailedNotes: 'Check bleed margins (min 3mm), image resolution (min 300dpi), outline text, and convert colors to CMYK mode.' },
    { id: 'Printing', name: 'Digital Press & Printing Run', operatorRole: 'Press Operator', estimatedHrs: 1.0, detailedNotes: 'Calibrate tray alignment. Conduct print proof for matching color swatches. Inspect for streaking and horizontal lines.' },
    { id: 'Laminating', name: 'Protective Film Lamination', operatorRole: 'Finisher', estimatedHrs: 0.5, detailedNotes: 'Pre-heat lamination rolls to 118 degrees Celsius. Fasten media guides to prevent wrinkling. Matt or Gloss options to review.' },
    { id: 'Finishing', name: 'Precision Collation, Bindery & QA', operatorRole: 'Bindery Specialist', estimatedHrs: 1.5, detailedNotes: 'Stitch pages as specified. Apply vinyl bookbinding tape cleanly. Pack inside neat bundles. Run QA inspections.' }
  ],
  artworkStatuses: [
    { status: 'Pending', badgeColor: 'bg-amber-100 text-amber-800 border-amber-250', protocolText: 'Awaiting client or DTP preflight. No fabrication runs may be started.', requiresApproval: true, notifyStaff: true },
    { status: 'Approved', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-250', protocolText: 'Signed-off by client. Approved files locked and ready to queue for direct printing plates allocation.', requiresApproval: false, notifyStaff: false },
    { status: 'Changes Requested', badgeColor: 'bg-rose-100 text-rose-800 border-rose-250', protocolText: 'Client rejected layout. Return DTP ticket to initial DTP queue. All active setups are suspended immediately.', requiresApproval: true, notifyStaff: true },
    { status: 'N/A', badgeColor: 'bg-slate-100 text-slate-800 border-slate-200', protocolText: 'Job card does not require custom layouts setup. Safe to run from standard raw product dimensions.', requiresApproval: false, notifyStaff: false }
  ],
  ncrBuilder: {
    standardSets: 3,
    standardBooks: 10,
    standardSetsPerBook: 50,
    defaultGsm: 60,
    standardColours: ['White', 'Yellow', 'Pink', 'Blue', 'Green'],
    bindingMethods: ['Glued Pads', 'Stitch & Tape', 'Spiral Wire-O', 'Saddle Bound']
  },
  layerStackPrev: {
    defaultCBColor: 'White',
    defaultCFBColor: 'Yellow',
    defaultCFColor: 'Pink',
    gsmCB: 60,
    gsmCFB: 60,
    gsmCF: 60,
    collatingInstructions: 'Always collate with CB (Coated Back) on top face up, intermediary sheets as CFB (Coated Front & Back), and bottom sheet as CF (Coated Front) face up.'
  },
  binderyGuide: {
    stitchType: 'Standard Heavy Stapling Code 12',
    spineTapeColor: 'Black Crocodile Spine Cloth',
    coverStockGsm: 240,
    backingBoardThickness: 'Cardboard Backing (1400mic)',
    trimmingSpecs: 'Precision guillotine trim 2mm for clean alignment',
    instructions: [
      'Collate specified NCR sets.',
      'Affix 240gsm colored board index covers on front and 1400mic card backing on spine.',
      'Saddle stitch and wrap with heavy adhesive croco binding tape.'
    ]
  },
  productionSteps: [
    { name: 'Stock Checking', description: 'Count raw sheets from warehouse and log sheet dimensions.', estimatedMinutes: 10, safetyPrecautions: 'Use paper lifting techniques' },
    { name: 'Numbering Registration', description: 'Double check the printer numbering position block is clean.', estimatedMinutes: 15, safetyPrecautions: 'Wear standard eye protection' },
    { name: 'Creasing & Scoring', description: 'Run test folds to calibrate line placement and crease depths.', estimatedMinutes: 12, safetyPrecautions: 'Guard fingers from roller pinch' },
    { name: 'Final Trimming', description: 'Stack finished blocks and cut to target size margins.', estimatedMinutes: 20, safetyPrecautions: 'Always use safe dual-button trigger on blade' }
  ],
  productionSequence: [
    { stepNo: 1, department: 'DTP / Prepress', actionItem: 'Client file proof alignment and preflight confirmation.', signOffRequired: true, verificationMethod: 'Digital visual file match' },
    { stepNo: 2, department: 'Printing Press', actionItem: 'Execute press run with color profiling checks.', signOffRequired: true, verificationMethod: 'Spectrophotometer reading' },
    { stepNo: 3, department: 'Bindery Hand', actionItem: 'Numbering, perforation sequence assembly and collation check.', signOffRequired: false, verificationMethod: 'Visual count checking' },
    { stepNo: 4, department: 'Finishing Shop', actionItem: 'Staple, wrap tape, trim and QA checklist signoff.', signOffRequired: true, verificationMethod: 'QA checklist review' }
  ],
  pdfSettings: {
    showPricing: false,
    showCompanyRegistration: false,
    showSafetyNotes: false,
    showDetailedCompliance: false,
    showArtworkHaltRules: 'unapproved',
    showCustomerNotes: true,
    showInternalNotes: true,
    showProductionSpecs: true,
    showProductionChecklist: true,
    showQcChecklist: true
  }
};

export default function SettingsPage() {
  const { data: settingsList, loading: loadingPricing } = useCollection<PricingSettings>(SETTINGS_COLLECTION);
  const { data: companyList, loading: loadingCompany } = useCollection<CompanySettings>('company_settings');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'company' | 'pricing' | 'templates' | 'jobcard' | 'zoho'>(
    (tabParam && ['company', 'pricing', 'templates', 'jobcard', 'zoho', 'messaging'].includes(tabParam)) ? (tabParam === 'messaging' ? 'templates' : tabParam as any) : 'company'
  );

  useEffect(() => {
    if (tabParam && ['company', 'pricing', 'templates', 'jobcard', 'zoho', 'messaging'].includes(tabParam)) {
      setActiveTab(tabParam === 'messaging' ? 'templates' : tabParam as any);
    }
  }, [tabParam]);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [jobcardConfig, setJobcardConfig] = useState<any>(DEFAULT_JOBCARD_CONFIG);
  const [jobcardSubTab, setJobcardSubTab] = useState<'stages' | 'statuses' | 'ncr' | 'layers' | 'bindery' | 'steps' | 'sequence' | 'pdf'>('stages');
  const [templateCategory, setTemplateCategory] = useState<'notifications' | 'jobcard-presets'>('notifications');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateJobcardConfigField = (subSection: string, field: string, value: any) => {
    setJobcardConfig((prev: any) => ({
      ...prev,
      [subSection]: {
        ...(prev[subSection] || {}),
        [field]: value
      }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast.error('Please upload a JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setCompany(prev => ({ ...prev, logoUrl: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const updateNcrSizeFactor = (key: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      ncrSizeFactors: {
        ...(prev.ncrSizeFactors || {}),
        [key]: value
      }
    }));
  };

  const updateNcrPartFactor = (key: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      ncrPartFactors: {
        ...(prev.ncrPartFactors || {}),
        [key]: value
      }
    }));
  };

  const updateNcrPrintFactor = (key: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      ncrPrintFactors: {
        ...(prev.ncrPrintFactors || {}),
        [key]: value
      }
    }));
  };

  const updateNcrBindingRate = (key: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      ncrBindingRates: {
        ...(prev.ncrBindingRates || {}),
        [key]: value
      }
    }));
  };

  const handleAddDiscountTier = () => {
    const currentTiers = [...(pricing.ncrVolumeDiscounts || [])];
    currentTiers.push({ minQty: 10, discount: 0.1 });
    currentTiers.sort((a, b) => b.minQty - a.minQty);
    setPricing(prev => ({
      ...prev,
      ncrVolumeDiscounts: currentTiers
    }));
  };

  const handleUpdateDiscountTier = (index: number, field: 'minQty' | 'discount', value: number) => {
    const currentTiers = [...(pricing.ncrVolumeDiscounts || [])];
    currentTiers[index] = {
      ...currentTiers[index],
      [field]: value
    };
    setPricing(prev => ({
      ...prev,
      ncrVolumeDiscounts: currentTiers
    }));
  };

  const handleDeleteDiscountTier = (index: number) => {
    const currentTiers = (pricing.ncrVolumeDiscounts || []).filter((_, i) => i !== index);
    setPricing(prev => ({
      ...prev,
      ncrVolumeDiscounts: currentTiers
    }));
  };

  useEffect(() => {
    if (settingsList.length > 0) {
      const p = settingsList.find(s => s.id === 'pricing');
      if (p) setPricing({ ...DEFAULT_PRICING_SETTINGS, ...p });
      const jc = settingsList.find(s => s.id === 'jobcard_config');
      if (jc) {
        setJobcardConfig({ ...DEFAULT_JOBCARD_CONFIG, ...jc });
      }
    }
  }, [settingsList]);

  useEffect(() => {
    if (companyList.length > 0) {
      const c = companyList.find(s => s.id === 'company') || companyList[0];
      setCompany({ ...DEFAULT_COMPANY_SETTINGS, ...c });
    }
  }, [companyList]);

  const handleSavePricing = async () => {
    console.log('Button Click: Commit Pricing Logic');
    setIsSaving(true);
    try {
      await setDocument(SETTINGS_COLLECTION, 'pricing', pricing);
      toast.success('Pricing engine parameters updated.');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    console.log('Button Click: Update Business Profile');
    setIsSaving(true);
    try {
      await setDocument('company_settings', 'company', company);
      toast.success('Business profile updated successfully.');
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast.error('Failed to save business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveJobcardConfig = async () => {
    console.log('Button Click: Commit Job Card Operation Parameters');
    setIsSaving(true);
    try {
      await setDocument(SETTINGS_COLLECTION, 'jobcard_config', jobcardConfig);
      toast.success('Job Card operations configuration updated successfully.');
    } catch (error) {
      console.error('Error saving Job Card configuration:', error);
      toast.error('Failed to save Job Card settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingPricing || loadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">System Settings</h1>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Global configuration & business profile</p>
        </div>
        <div className="flex bg-surface p-1 rounded-2xl border border-border/50 self-start md:self-center flex-wrap gap-1">
          <button 
            onClick={() => { setActiveTab('company'); setSearchParams({}); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'company' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Business Profile
          </button>
          <button 
            onClick={() => { setActiveTab('pricing'); setSearchParams({}); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'pricing' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Pricing Engine
          </button>
          <button 
            onClick={() => { setActiveTab('jobcard'); setSearchParams({}); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'jobcard' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Job Card Operations
          </button>
          <button 
            onClick={() => { setActiveTab('templates'); setSearchParams({ tab: 'templates' }); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'templates' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Templates Setup
          </button>
          <button 
            onClick={() => { setActiveTab('zoho'); setSearchParams({ tab: 'zoho' }); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'zoho' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Zoho Books Integration
          </button>
        </div>
      </div>

      {activeTab === 'company' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 space-y-10">
            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Company Details</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Primary business identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Company Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="XPress Print Solutions"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">VAT Number</label>
                  <div className="relative">
                    <Check size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.vatNumber}
                      onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                      placeholder="4012345678"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Registration No.</label>
                  <input 
                    type="text" 
                    value={company.registrationNumber}
                    onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
                    placeholder="2023/123456/07"
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Website</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      placeholder="www.xpressprint.co.za"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Job Card Prefix</label>
                  <input 
                    type="text" 
                    value={company.jobCardPrefix || ''}
                    onChange={(e) => setCompany({ ...company, jobCardPrefix: e.target.value })}
                    placeholder="Jobcard"
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                  />
                  <p className="text-[8px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Affects newly created jobs (e.g. {company.jobCardPrefix || 'Jobcard'}-2026-001)</p>
                </div>
              </div>
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Contact & Location</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Public facing contact information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Support Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="email" 
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="info@xpressprint.com"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      placeholder="+27 11 123 4567"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Business Address</label>
                  <AddressInput 
                    value={company.address}
                    onChange={(val) => setCompany({ ...company, address: val })}
                    placeholder="123 Printing Way, Industrial Area, Cape Town"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="card-minimal h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Banking</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Invoicing details</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Bank Name</label>
                  <input 
                    type="text" 
                    value={company.bankName}
                    onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Account Number</label>
                  <input 
                    type="text" 
                    value={company.accountNumber}
                    onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Branch Code</label>
                  <input 
                    type="text" 
                    value={company.branchCode}
                    onChange={(e) => setCompany({ ...company, branchCode: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Branding</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Logo and visual identity</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Company Logo</label>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept=".jpg,.jpeg,image/jpeg"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-surface border border-brand/20 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand/5 transition-all group"
                    >
                      <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                      {company.logoUrl ? 'Change Company Logo' : 'Upload Company Logo'}
                    </button>
                    <p className="text-[10px] font-bold text-text-muted italic px-2">Recommended: JPEG format with a white or transparent background. Max size 1MB.</p>
                  </div>
                </div>
                
                {company.logoUrl && (
                  <div className="p-8 bg-paper border border-border border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 relative group overflow-hidden">
                    <div className="absolute inset-0 grid-structure opacity-[0.03] pointer-events-none" />
                    <button 
                      onClick={() => setCompany(prev => ({ ...prev, logoUrl: '' }))}
                      className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      title="Remove Logo"
                    >
                      <AlertCircle size={14} />
                    </button>
                    <p className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] relative z-10">Live Branding Preview</p>
                    <div className="relative z-10 p-4 bg-white rounded-xl shadow-sm border border-border/50">
                      <img 
                        src={company.logoUrl} 
                        alt="Company Logo Preview" 
                        className="max-h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleSaveCompany}
                disabled={isSaving}
                className="w-full py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? <Check className="animate-spin" /> : <Save size={18} />}
                Update Business Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="flex flex-col gap-10 pb-20">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Column 1: General & NCR Base Pricing Settings */}
            <div className="space-y-10">
              {/* Card 1: General & Global Pricing Rules */}
              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Global Surcharges & Taxes</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Base finance & urgency rates</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Currency Symbol / Code</label>
                    <div className="relative">
                      <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                      <input 
                        type="text" 
                        value={pricing.currency || 'ZAR'}
                        onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
                        placeholder="ZAR"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Tax rate (VAT %)</label>
                    <div className="relative">
                      <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                      <input 
                        type="number" 
                        step="0.1"
                        value={pricing.vatRate}
                        onChange={(e) => setPricing({ ...pricing, vatRate: Number(e.target.value) || 0 })}
                        placeholder="15"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Substrate Material Markup (%)</label>
                    <div className="relative">
                      <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                      <input 
                        type="number" 
                        value={pricing.materialMarkupPercent ?? 40}
                        onChange={(e) => setPricing({ ...pricing, materialMarkupPercent: Number(e.target.value) || 0 })}
                        placeholder="40"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                    <p className="text-[8px] font-bold text-text-muted px-1 italic">Applied when materials are sold as stand-alone items</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Express Surcharge Scheme</label>
                    <select
                      value={pricing.expressSurchargeType}
                      onChange={(e) => setPricing({ ...pricing, expressSurchargeType: e.target.value as 'percentage' | 'flat' })}
                      className="w-full px-5 py-4 bg-gray-50 border border-border rounded-2xl font-bold text-sm focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    >
                      <option value="percentage">Percentage (%) Premium</option>
                      <option value="flat">Flat Surcharge Fee (Amt)</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">
                      Express Surcharge Premium ({pricing.expressSurchargeType === 'percentage' ? '%' : pricing.currency || 'ZAR'})
                    </label>
                    <input 
                      type="number" 
                      value={pricing.expressSurchargeValue}
                      onChange={(e) => setPricing({ ...pricing, expressSurchargeValue: Number(e.target.value) || 0 })}
                      placeholder="15"
                      className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: NCR Base Auxiliary Rates */}
              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Sliders size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">NCR Base & Fee Rules</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Base setup fees & secondary finishing units</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">NCR Base Rate (per Set)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-light opacity-60">
                        {pricing.currency || 'ZAR'}
                      </span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={pricing.ncrBaseRate}
                        onChange={(e) => setPricing({ ...pricing, ncrBaseRate: Number(e.target.value) || 0 })}
                        placeholder="45.00"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">100-Sets Book Multiplier Factor</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={pricing.ncrSets100Factor || 1.8}
                      onChange={(e) => setPricing({ ...pricing, ncrSets100Factor: Number(e.target.value) || 1.0 })}
                      placeholder="1.8"
                      className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                    <p className="text-[8px] font-bold text-text-muted px-1 italic">Surcharge ratio applied for 100 sets books (e.g. 1.8x base)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Sequential Numbering Fee</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-light opacity-60">
                        {pricing.currency || 'ZAR'}
                      </span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={pricing.ncrNumberingFee}
                        onChange={(e) => setPricing({ ...pricing, ncrNumberingFee: Number(e.target.value) || 0 })}
                        placeholder="8.50"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Perforation Fee</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-light opacity-60">
                        {pricing.currency || 'ZAR'}
                      </span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={pricing.ncrPerforationFee}
                        onChange={(e) => setPricing({ ...pricing, ncrPerforationFee: Number(e.target.value) || 0 })}
                        placeholder="4.00"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Hard Cover Upgrade Fee</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-light opacity-60">
                        {pricing.currency || 'ZAR'}
                      </span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={pricing.ncrCoverFee}
                        onChange={(e) => setPricing({ ...pricing, ncrCoverFee: Number(e.target.value) || 0 })}
                        placeholder="12.00"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Advanced Factors & Discounts */}
            <div className="space-y-10">
              {/* Card 3: Advanced Size, Ink, Layers & Bind Multipliers */}
              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">NCR Scalar Coefficients</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Pricing factors for sizes, plies, ink & binding</p>
                  </div>
                </div>

                {/* Sub-block: Size factors */}
                <div className="border-b border-border/40 pb-6 mb-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-brand rounded-full inline-block" />
                    Paper Sizes Multiplier
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {['A4', 'A5', 'A6', 'DL'].map((sizeKey) => (
                      <div key={sizeKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border/40">
                        <span className="text-xs font-black text-text-main">{sizeKey} Size Ratio</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={pricing.ncrSizeFactors?.[sizeKey] ?? 1.0}
                          onChange={(e) => updateNcrSizeFactor(sizeKey, Number(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 text-right font-bold text-xs bg-white border border-border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-block: Paper Part Plies (Layers) */}
                <div className="border-b border-border/40 pb-6 mb-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-brand rounded-full inline-block" />
                    Layer Ply Multiplier
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {['2-part', '3-part', '4-part'].map((partKey) => (
                      <div key={partKey} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-border/40">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-light text-center">{partKey} Ply</span>
                        <input 
                          type="number" 
                          step="0.05" 
                          value={pricing.ncrPartFactors?.[partKey] ?? 1.0}
                          onChange={(e) => updateNcrPartFactor(partKey, Number(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-center font-bold text-xs bg-white border border-border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-block: Paint/Ink profile */}
                <div className="border-b border-border/40 pb-6 mb-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-brand rounded-full inline-block" />
                    Ink / Print Mode Multipliers
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {['Greyscale', 'Full Colour'].map((printKey) => (
                      <div key={printKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border/40">
                        <span className="text-[10px] font-black uppercase text-text-light">{printKey} Ratio</span>
                        <input 
                          type="number" 
                          step="0.05" 
                          value={pricing.ncrPrintFactors?.[printKey] ?? 1.0}
                          onChange={(e) => updateNcrPrintFactor(printKey, Number(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 text-right font-bold text-xs bg-white border border-border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-block: Binding rates */}
                <div className="pb-2">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-brand rounded-full inline-block" />
                    Binding Flat Fees ({pricing.currency || 'ZAR'})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Glued', 'Stapled & Tabbed'].map((bindKey) => (
                      <div key={bindKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border/40">
                        <span className="text-[10px] font-black uppercase text-text-light">{bindKey}</span>
                        <input 
                          type="number" 
                          step="0.5" 
                          value={pricing.ncrBindingRates?.[bindKey] ?? 0}
                          onChange={(e) => updateNcrBindingRate(bindKey, Number(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 text-right font-bold text-xs bg-white border border-border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: NCR Volume Scale Discounts */}
              <div className="card-minimal">
                <div className="flex justify-between items-center mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Percent size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Volume Discounts</h3>
                      <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Adjust discount percentages based on set quantity</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDiscountTier}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                  >
                    <Plus size={12} /> Add Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {(pricing.ncrVolumeDiscounts || []).length === 0 ? (
                    <div className="px-6 py-10 bg-slate-50 border border-slate-100 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No discount tiers initialized</p>
                      <p className="text-[10px] text-slate-400 italic">Click "Add Tier" to reward bulk book purchases</p>
                    </div>
                  ) : (
                    <div className="border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/40">
                      <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-text-light text-center">
                        <div className="col-span-5 text-left">Quantity Threshold (min)</div>
                        <div className="col-span-5">Discount Percent (%)</div>
                        <div className="col-span-2">Remove</div>
                      </div>
                      {(pricing.ncrVolumeDiscounts || [])
                        .sort((a, b) => b.minQty - a.minQty)
                        .map((tier, idx) => (
                          <div key={idx} className="grid grid-cols-12 items-center px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                            <div className="col-span-5">
                              <input 
                                type="number"
                                min="1"
                                value={tier.minQty}
                                onChange={(e) => handleUpdateDiscountTier(idx, 'minQty', Number(e.target.value) || 1)}
                                className="w-11/12 px-3 py-1.5 font-bold text-xs bg-white border border-border rounded-lg"
                                placeholder="Min Qty"
                              />
                            </div>
                            <div className="col-span-5 flex items-center justify-center gap-2">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={Math.round(tier.discount * 100)}
                                onChange={(e) => handleUpdateDiscountTier(idx, 'discount', (Number(e.target.value) || 0) / 100)}
                                className="w-20 px-3 py-1.5 font-bold text-xs text-center bg-white border border-border rounded-lg"
                                placeholder="Discount %"
                              />
                              <span className="text-xs font-black text-text-light">%</span>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteDiscountTier(idx)}
                                className="p-2 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete discount tier"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 self-stretch xl:self-end">
            <button 
              onClick={handleSavePricing}
              disabled={isSaving}
              className="px-12 py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isSaving ? <Check className="animate-spin" /> : <Save size={18} />}
              Save Pricing Engine Configuration
            </button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10 animate-in fade-in duration-350">
          {/* Sub Navigation Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-text-light uppercase tracking-widest block px-3 mb-3">Templates Category</span>
              
              <button
                onClick={() => setTemplateCategory('notifications')}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all",
                  templateCategory === 'notifications' 
                    ? "bg-brand text-white shadow-md shadow-brand/10" 
                    : "text-text-light hover:text-text-main hover:bg-slate-50"
                )}
              >
                <Mail size={16} />
                <span>Client Notifications</span>
              </button>

              <button
                onClick={() => setTemplateCategory('jobcard-presets')}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all",
                  templateCategory === 'jobcard-presets' 
                    ? "bg-brand text-white shadow-md shadow-brand/10" 
                    : "text-text-light hover:text-text-main hover:bg-slate-50"
                )}
              >
                <Sparkles size={16} />
                <span>Production Presets</span>
              </button>
            </div>
          </div>

          {/* Main Module Editor Panel */}
          <div className="xl:col-span-3 bg-white p-8 rounded-[2.5rem] border border-border shadow-sm min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8">
              {templateCategory === 'notifications' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <Mail className="text-brand" size={18} /> Notification Messaging Templates
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Configure client-facing email and WhatsApp notification defaults</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="card-minimal bg-slate-50/50">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-brand">
                          <Mail size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Quote Templates</h3>
                          <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Email & WhatsApp defaults</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                          <textarea 
                            value={company.quoteEmailTemplate}
                            onChange={(e) => setCompany({ ...company, quoteEmailTemplate: e.target.value })}
                            rows={8}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter email template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{quoteNumber}}, {{companyName}}, {{itemsSummary}}, {{totalAmount}}, {{approvalUrl}}"}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                          <textarea 
                            value={company.quoteWhatsappTemplate}
                            onChange={(e) => setCompany({ ...company, quoteWhatsappTemplate: e.target.value })}
                            rows={4}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter WhatsApp template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{quoteNumber}}, {{companyName}}, {{totalAmount}}, {{approvalUrl}}"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card-minimal bg-slate-50/50">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Phone size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Job Update Templates</h3>
                          <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Production notifications</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                          <textarea 
                            value={company.jobEmailTemplate}
                            onChange={(e) => setCompany({ ...company, jobEmailTemplate: e.target.value })}
                            rows={8}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter email template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{jobStage}}, {{productName}}, {{dueDate}}, {{trackingUrl}}"}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                          <textarea 
                            value={company.jobWhatsappTemplate}
                            onChange={(e) => setCompany({ ...company, jobWhatsappTemplate: e.target.value })}
                            rows={4}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter WhatsApp template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{jobStage}}, {{dueDate}}, {{trackingUrl}}"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card-minimal bg-slate-50/50 md:col-span-2">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Layers size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Artwork Approval</h3>
                          <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Client review notifications</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                          <textarea 
                            value={company.artworkEmailTemplate}
                            onChange={(e) => setCompany({ ...company, artworkEmailTemplate: e.target.value })}
                            rows={8}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter email template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{approvalUrl}}"}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                          <textarea 
                            value={company.artworkWhatsappTemplate}
                            onChange={(e) => setCompany({ ...company, artworkWhatsappTemplate: e.target.value })}
                            rows={4}
                            className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                            placeholder="Enter WhatsApp template..."
                          />
                          <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{approvalUrl}}"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6 border-t border-border/40">
                    <button 
                      onClick={handleSaveCompany}
                      disabled={isSaving}
                      className="px-12 py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isSaving ? <Check className="animate-spin" /> : <Save size={18} />}
                      Update Client Notification Templates
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <Sparkles className="text-brand" size={18} /> Load Configuration Templates Registry
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Select and load standard production templates to override default settings</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {jobcardConfig.templates?.map((tmpl: any) => (
                      <div key={tmpl.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4 hover:border-brand/35 transition-all text-left">
                        <div>
                          <h4 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">{tmpl.name}</h4>
                          <p className="text-xs text-text-light mt-1.5 leading-relaxed">{tmpl.description}</p>
                        </div>
                        <button
                          onClick={async () => {
                            const updatedConfig = {
                              ...jobcardConfig,
                              productionStages: tmpl.stages || jobcardConfig.productionStages,
                              binderyGuide: tmpl.bindery || jobcardConfig.binderyGuide,
                              productionSteps: (tmpl.steps || []).map((step: string, i: number) => ({
                                name: `Step ${i + 1}`,
                                description: step,
                                estimatedMinutes: 15,
                                safetyPrecautions: 'None'
                              }))
                            };
                            setJobcardConfig(updatedConfig);
                            try {
                              await setDocument(SETTINGS_COLLECTION, 'jobcard_config', updatedConfig);
                              toast.success(`Loaded and saved configuration template: ${tmpl.name}`);
                            } catch (e) {
                              toast.error(`Loaded ${tmpl.name} locally, but failed to save settings.`);
                            }
                          }}
                          className="w-full py-2.5 bg-white border border-brand/20 text-brand rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand hover:text-white transition-all text-center"
                        >
                          Load template variables
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobcard' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10 animate-in fade-in duration-350">
          
          {/* Sub Navigation Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-text-light uppercase tracking-widest block px-3 mb-3">Jobcard Settings Modules</span>
              
              {[
                { id: 'stages', label: '1. Production Stages', icon: Workflow },
                { id: 'statuses', label: '2. Artwork Statuses Protocol', icon: ShieldCheck },
                { id: 'ncr', label: '3. Operational NCR Builder', icon: Settings2 },
                { id: 'layers', label: '4. Layer Stack Preview', icon: Layers },
                { id: 'bindery', label: '5. Quick Operator Bindery Guide', icon: BookOpen },
                { id: 'steps', label: '6. Simple Production Steps', icon: CheckSquare },
                { id: 'sequence', label: '7. Factory Production Sequence', icon: List },
                { id: 'pdf', label: '8. PDF Export Customisation', icon: FileText }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = jobcardSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setJobcardSubTab(item.id as any)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all",
                      isSelected 
                        ? "bg-brand text-white shadow-md shadow-brand/10" 
                        : "text-text-light hover:text-text-main hover:bg-slate-50"
                    )}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Save Buttons Panel */}
            <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-accent font-bold">Production Compliance</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Configurations made here act as standard operational mandates across all job folders and printed job sheets.
              </p>
              <button
                onClick={handleSaveJobcardConfig}
                disabled={isSaving}
                className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Check className="animate-spin" /> : <Save size={14} />}
                <span>Save All Specifications</span>
              </button>
            </div>
          </div>
          
          {/* Main Module Editor Panel */}
          <div className="xl:col-span-3 bg-white p-8 rounded-[2.5rem] border border-border shadow-sm min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8">
              
              {/* Production Stages */}
              {jobcardSubTab === 'stages' && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                        <Workflow className="text-brand" size={18} /> Production Stages & Operators
                      </h3>
                      <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Configure individual floor phases, typical operators, and checks</p>
                    </div>
                    <button
                      onClick={() => {
                        const newStage = { id: 'Custom', name: 'New Custom Stage', operatorRole: 'Floor Hand', estimatedHrs: 1, detailedNotes: 'Standard operating procedure.' };
                        setJobcardConfig({ ...jobcardConfig, productionStages: [...(jobcardConfig.productionStages || []), newStage] });
                      }}
                      className="px-4 py-2 text-xs font-bold text-brand hover:bg-blue-50 border border-brand/20 rounded-xl flex items-center gap-1 bg-white select-none"
                    >
                      <Plus size={14} /> Add Stage
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {jobcardConfig.productionStages?.map((stage: any, idx: number) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative group">
                        <div className="md:col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stage ID</label>
                          <select
                            value={stage.id}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionStages];
                              updated[idx].id = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="Prepress">Prepress</option>
                            <option value="Printing">Printing</option>
                            <option value="Laminating">Laminating</option>
                            <option value="Finishing">Finishing</option>
                            <option value="Quality Check">Quality Check</option>
                            <option value="Ready">Ready</option>
                            <option value="Custom">Custom</option>
                          </select>
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stage Description</label>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionStages];
                              updated[idx].name = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator Role</label>
                          <input
                            type="text"
                            value={stage.operatorRole}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionStages];
                              updated[idx].operatorRole = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Std Hours</label>
                          <input
                            type="number"
                            step="0.05"
                            value={stage.estimatedHrs}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionStages];
                              updated[idx].estimatedHrs = parseFloat(e.target.value) || 0;
                              setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-right animate-none"
                          />
                        </div>
                        <div className="md:col-span-12 bg-white p-3 rounded-lg border border-slate-100 mt-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Floor Notes & Operator Instruction Guidelines</label>
                          <textarea
                            value={stage.detailedNotes}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionStages];
                              updated[idx].detailedNotes = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                            }}
                            className="w-full px-3 py-1 bg-white rounded text-xs min-h-[50px] border-none focus:outline-none resize-none font-medium text-slate-700"
                            placeholder="Provide standard floor operations instructions..."
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = jobcardConfig.productionStages.filter((_: any, i: number) => i !== idx);
                            setJobcardConfig({ ...jobcardConfig, productionStages: updated });
                          }}
                          className="absolute right-4 top-4 text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Artwork Statuses */}
              {jobcardSubTab === 'statuses' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <ShieldCheck className="text-brand" size={18} /> Artwork Proofing Statuses & Protocol
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Customise status identifiers and standard security instructions</p>
                  </div>
                  
                  <div className="space-y-4">
                    {jobcardConfig.artworkStatuses?.map((item: any, idx: number) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-3">
                          <span className={cn("inline-block px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border", item.badgeColor)}>
                            {item.status}
                          </span>
                        </div>
                        <div className="md:col-span-3 flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.requiresApproval}
                              onChange={(e) => {
                                const updated = [...jobcardConfig.artworkStatuses];
                                updated[idx].requiresApproval = e.target.checked;
                                setJobcardConfig({ ...jobcardConfig, artworkStatuses: updated });
                              }}
                              className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1"
                            />
                            Halt Printing Run
                          </label>
                        </div>
                        <div className="md:col-span-6">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Operational Protocol Text</label>
                          <textarea
                            value={item.protocolText}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.artworkStatuses];
                              updated[idx].protocolText = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, artworkStatuses: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs/relaxed resize-none h-16 focus:ring-1 focus:ring-brand focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Operational NCR Builder */}
              {jobcardSubTab === 'ncr' && (
                <div className="space-y-6">
                  <div className="text-left">
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <Settings2 className="text-brand" size={18} /> Operational NCR Builder Configuration
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Standard parameters default for multi-part chemical transfer carbonless books</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-left">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Set Packaging Numbers</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Plies</label>
                          <input
                            type="number"
                            value={jobcardConfig.ncrBuilder.standardSets}
                            onChange={(e) => updateJobcardConfigField('ncrBuilder', 'standardSets', parseInt(e.target.value) || 2)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Books / Package</label>
                          <input
                            type="number"
                            value={jobcardConfig.ncrBuilder.standardBooks}
                            onChange={(e) => updateJobcardConfigField('ncrBuilder', 'standardBooks', parseInt(e.target.value) || 10)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sets Per Book Volume</label>
                          <input
                            type="number"
                            value={jobcardConfig.ncrBuilder.standardSetsPerBook}
                            onChange={(e) => updateJobcardConfigField('ncrBuilder', 'standardSetsPerBook', parseInt(e.target.value) || 50)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-left">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Substrate Setup</h4>
                      
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Default Paper Weight (GSM)</label>
                        <input
                          type="number"
                          value={jobcardConfig.ncrBuilder.defaultGsm}
                          onChange={(e) => updateJobcardConfigField('ncrBuilder', 'defaultGsm', parseInt(e.target.value) || 60)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Plies Color Sequences (comma separated)</label>
                        <input
                          type="text"
                          value={jobcardConfig.ncrBuilder.standardColours?.join(', ')}
                          onChange={(e) => {
                            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            updateJobcardConfigField('ncrBuilder', 'standardColours', arr);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Layer Stack Preview */}
              {jobcardSubTab === 'layers' && (
                <div className="space-y-6">
                  <div className="text-left">
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <Layers className="text-brand" size={18} /> Layer Stack Preview & Chemical Mechanics
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Configure default colors and critical collation verification routines</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4 text-left">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Default Triplicate Stack Colors & Weights</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-bold text-slate-600">CB (Coated Back - Top Copy)</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={jobcardConfig.layerStackPrev.defaultCBColor}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'defaultCBColor', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-20"
                              />
                              <input
                                type="number"
                                value={jobcardConfig.layerStackPrev.gsmCB}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'gsmCB', parseInt(e.target.value) || 60)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-16 text-center"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-bold text-slate-600">CFB (Coated Front & Back - Middle)</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={jobcardConfig.layerStackPrev.defaultCFBColor}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'defaultCFBColor', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-20"
                              />
                              <input
                                type="number"
                                value={jobcardConfig.layerStackPrev.gsmCFB}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'gsmCFB', parseInt(e.target.value) || 60)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-16 text-center"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-bold text-slate-600">CF (Coated Front - Bottom Copy)</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={jobcardConfig.layerStackPrev.defaultCFColor}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'defaultCFColor', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-20"
                              />
                              <input
                                type="number"
                                value={jobcardConfig.layerStackPrev.gsmCF}
                                onChange={(e) => updateJobcardConfigField('layerStackPrev', 'gsmCF', parseInt(e.target.value) || 60)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-16 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Default Collation Instructions</label>
                        <textarea
                          value={jobcardConfig.layerStackPrev.collatingInstructions}
                          onChange={(e) => updateJobcardConfigField('layerStackPrev', 'collatingInstructions', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs/relaxed min-h-[90px] font-medium text-slate-700"
                        />
                      </div>
                    </div>
                    
                    {/* Isometric Stack Visualizer */}
                    <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-4">Live Config Isometric Stack</span>
                      <div className="relative h-44 w-full flex items-center justify-center">
                        <div className="relative w-36 h-36 flex flex-col-reverse justify-center items-center">
                          {[
                            { color: jobcardConfig.layerStackPrev.defaultCFColor, type: 'CF', label: 'Bottom Anchor copy' },
                            { color: jobcardConfig.layerStackPrev.defaultCFBColor, type: 'CFB', label: 'Intermediary Copy' },
                            { color: jobcardConfig.layerStackPrev.defaultCBColor, type: 'CB', label: 'Top Original copy' }
                          ].map((l, index) => {
                            const offsetZ = index * 12;
                            let cardBg = 'bg-white text-slate-900 border-slate-300';
                            if (l.color.toLowerCase().includes('pink')) cardBg = 'bg-rose-100 text-rose-800 border-rose-200';
                            else if (l.color.toLowerCase().includes('yellow')) cardBg = 'bg-amber-100 text-amber-800 border-amber-200';
                            else if (l.color.toLowerCase().includes('blue')) cardBg = 'bg-sky-100 text-sky-800 border-sky-200';
                            else if (l.color.toLowerCase().includes('green')) cardBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                            
                            return (
                              <div
                                key={index}
                                className={cn("absolute w-32 h-20 rounded-xl border shadow-md flex flex-col justify-between p-2 text-left", cardBg)}
                                style={{
                                  transform: `rotateX(55deg) rotateZ(-22deg) translateY(${-offsetZ}px)`,
                                  zIndex: index + 10,
                                }}
                              >
                                <div className="flex justify-between text-[6px] font-black">
                                  <span>{l.type}</span>
                                  <span>60gsm</span>
                                </div>
                                <span className="text-[7px] font-black uppercase tracking-tighter truncate">{l.label}</span>
                                <div className="text-[5px] text-slate-400 font-bold">Collation set ply #{3 - index}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick Operator Bindery Guide */}
              {jobcardSubTab === 'bindery' && (
                <div className="space-y-6">
                  <div className="text-left">
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <BookOpen className="text-brand" size={18} /> Quick Operator Bindery Guide Parameters
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Specify binding methods, cover index board weights, back greyboards, and step guides</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Bindery Material Specifications</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Stitching Staple Method</label>
                          <input
                            type="text"
                            value={jobcardConfig.binderyGuide.stitchType}
                            onChange={(e) => updateJobcardConfigField('binderyGuide', 'stitchType', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-750"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Crocodile Spine Book Tape Color</label>
                          <input
                            type="text"
                            value={jobcardConfig.binderyGuide.spineTapeColor}
                            onChange={(e) => updateJobcardConfigField('binderyGuide', 'spineTapeColor', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cover Index GSM</label>
                            <input
                              type="number"
                              value={jobcardConfig.binderyGuide.coverStockGsm}
                              onChange={(e) => updateJobcardConfigField('binderyGuide', 'coverStockGsm', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Backing Board thickness</label>
                            <input
                              type="text"
                              value={jobcardConfig.binderyGuide.backingBoardThickness}
                              onChange={(e) => updateJobcardConfigField('binderyGuide', 'backingBoardThickness', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Precision Finished Gutters Trimming Specs</label>
                          <input
                            type="text"
                            value={jobcardConfig.binderyGuide.trimmingSpecs}
                            onChange={(e) => updateJobcardConfigField('binderyGuide', 'trimmingSpecs', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Chronological Operator Guidelines</h4>
                        <button
                          onClick={() => {
                            const updated = [...(jobcardConfig.binderyGuide.instructions || []), 'New manual bindery rule.'];
                            updateJobcardConfigField('binderyGuide', 'instructions', updated);
                          }}
                          className="p-1 px-2.5 bg-white border border-slate-200 hover:border-brand/30 text-brand text-[9px] font-black rounded-lg uppercase"
                        >
                          + Add Rule
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {jobcardConfig.binderyGuide.instructions?.map((inst: string, i: number) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-[10px] font-black text-slate-400 font-mono w-4 shrink-0">{i + 1}.</span>
                            <input
                              type="text"
                              value={inst}
                              onChange={(e) => {
                                const updated = [...jobcardConfig.binderyGuide.instructions];
                                updated[i] = e.target.value;
                                updateJobcardConfigField('binderyGuide', 'instructions', updated);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-150 rounded-lg text-xs font-semibold text-slate-750"
                            />
                            <button
                              onClick={() => {
                                const updated = jobcardConfig.binderyGuide.instructions.filter((_: any, idx: number) => idx !== i);
                                updateJobcardConfigField('binderyGuide', 'instructions', updated);
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Simple Production Steps */}
              {jobcardSubTab === 'steps' && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                        <CheckSquare className="text-brand" size={18} /> Simple Production Steps Checklist
                      </h3>
                      <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">General check list elements copied onto fabrication workflows</p>
                    </div>
                    <button
                      onClick={() => {
                        const newStep = { name: 'Quality Audit Step', description: 'Perform manual visual and touch comparison checks against master sample.', estimatedMinutes: 10, safetyPrecautions: 'None' };
                        setJobcardConfig({ ...jobcardConfig, productionSteps: [...(jobcardConfig.productionSteps || []), newStep] });
                      }}
                      className="px-4 py-2 text-xs font-bold text-brand hover:bg-blue-50 border border-brand/20 rounded-xl flex items-center gap-1 bg-white select-none"
                    >
                      <Plus size={14} /> Add Step
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {jobcardConfig.productionSteps?.map((item: any, idx: number) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative group">
                        <div className="md:col-span-4">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist Heading</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSteps];
                              updated[idx].name = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSteps: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-855 animate-none"
                          />
                        </div>
                        <div className="md:col-span-5">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Task Subtype Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSteps];
                              updated[idx].description = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSteps: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="md:col-span-1 border-r pr-2 border-slate-250">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Min Duration</label>
                          <input
                            type="number"
                            value={item.estimatedMinutes}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSteps];
                              updated[idx].estimatedMinutes = parseInt(e.target.value) || 0;
                              setJobcardConfig({ ...jobcardConfig, productionSteps: updated });
                            }}
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono font-bold"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Safety Measure</label>
                          <input
                            type="text"
                            value={item.safetyPrecautions}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSteps];
                              updated[idx].safetyPrecautions = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSteps: updated });
                            }}
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] text-amber-700 font-bold bg-amber-50/50"
                          />
                        </div>
                        
                        <button
                          onClick={() => {
                            const updated = jobcardConfig.productionSteps.filter((_: any, i: number) => i !== idx);
                            setJobcardConfig({ ...jobcardConfig, productionSteps: updated });
                          }}
                          className="absolute right-4 top-4 text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 transition-all focus:outline-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Factory Production Sequence */}
              {jobcardSubTab === 'sequence' && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                        <List className="text-brand" size={18} /> Factory Production Sequence Flow
                      </h3>
                      <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Order and details of compliance milestones checked off during line assembly</p>
                    </div>
                    <button
                      onClick={() => {
                        const nextStepNo = (jobcardConfig.productionSequence?.length || 0) + 1;
                        const newSeq = { stepNo: nextStepNo, department: 'Floor Hand', actionItem: 'Manual collation & bundling checklist validation', signOffRequired: false, verificationMethod: 'Manager audit inspection check' };
                        setJobcardConfig({ ...jobcardConfig, productionSequence: [...(jobcardConfig.productionSequence || []), newSeq] });
                      }}
                      className="px-4 py-2 text-xs font-bold text-brand hover:bg-blue-50 border border-brand/20 rounded-xl flex items-center gap-1 bg-white select-none animate-none"
                    >
                      <Plus size={14} /> Add Sequence Entry
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {jobcardConfig.productionSequence?.map((item: any, idx: number) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative group">
                        <div className="md:col-span-1 text-center font-black text-slate-400 text-sm">
                          #{item.stepNo}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsibility</label>
                          <input
                            type="text"
                            value={item.department}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSequence];
                              updated[idx].department = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSequence: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Industrial Action / Quality Mandate</label>
                          <input
                            type="text"
                            value={item.actionItem}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSequence];
                              updated[idx].actionItem = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSequence: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-center">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.signOffRequired}
                              onChange={(e) => {
                                const updated = [...jobcardConfig.productionSequence];
                                updated[idx].signOffRequired = e.target.checked;
                                setJobcardConfig({ ...jobcardConfig, productionSequence: updated });
                              }}
                              className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1"
                            />
                            Sign-Off Required
                          </label>
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification Audit Method</label>
                          <input
                            type="text"
                            value={item.verificationMethod}
                            onChange={(e) => {
                              const updated = [...jobcardConfig.productionSequence];
                              updated[idx].verificationMethod = e.target.value;
                              setJobcardConfig({ ...jobcardConfig, productionSequence: updated });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        
                        <button
                          onClick={() => {
                            const updated = jobcardConfig.productionSequence.filter((_: any, i: number) => i !== idx).map((entry: any, i: number) => ({ ...entry, stepNo: i + 1 }));
                            setJobcardConfig({ ...jobcardConfig, productionSequence: updated });
                          }}
                          className="absolute right-4 top-4 text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 transition-all focus:outline-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Customisation Settings */}
              {jobcardSubTab === 'pdf' && (
                <div className="space-y-6 text-left animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-lg font-black text-text-main tracking-tight uppercase italic flex items-center gap-2">
                      <FileText className="text-brand" size={18} /> Job Card PDF Export Customisation
                    </h3>
                    <p className="text-[10px] text-text-light uppercase tracking-widest mt-1">Configure which sections and data points are visible on the production workshop Job Card</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Pricing */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showPricing"
                          checked={jobcardConfig.pdfSettings?.showPricing ?? false}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showPricing', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showPricing" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Pricing on Job Card</span>
                          <span className="block text-[10px] text-text-light mt-1">Include rate, VAT, amount, totals, margin, cost, or pricing breakdowns on the floor sheet.</span>
                        </label>
                      </div>

                      {/* Company Reg */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showCompanyRegistration"
                          checked={jobcardConfig.pdfSettings?.showCompanyRegistration ?? false}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showCompanyRegistration', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showCompanyRegistration" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Company Registration Details</span>
                          <span className="block text-[10px] text-text-light mt-1">Include company registration number and full company VAT number under the logo header.</span>
                        </label>
                      </div>

                      {/* Safety Notes */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showSafetyNotes"
                          checked={jobcardConfig.pdfSettings?.showSafetyNotes ?? false}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showSafetyNotes', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showSafetyNotes" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Safety Notes & Guidelines</span>
                          <span className="block text-[10px] text-text-light mt-1">Display safety precautions, gear requirements, and safety guidelines on checklists.</span>
                        </label>
                      </div>

                      {/* Detailed Compliance */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showDetailedCompliance"
                          checked={jobcardConfig.pdfSettings?.showDetailedCompliance ?? false}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showDetailedCompliance', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showDetailedCompliance" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Detailed Compliance & Audit Methods</span>
                          <span className="block text-[10px] text-text-light mt-1">Display regulatory standard wording, compliance check phrases, and verification audit methods.</span>
                        </label>
                      </div>

                      {/* Customer Notes */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showCustomerNotes"
                          checked={jobcardConfig.pdfSettings?.showCustomerNotes ?? true}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showCustomerNotes', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showCustomerNotes" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Customer Notes</span>
                          <span className="block text-[10px] text-text-light mt-1">Include custom notes, shipping requests, and requirements received directly from the client.</span>
                        </label>
                      </div>

                      {/* Internal Notes */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showInternalNotes"
                          checked={jobcardConfig.pdfSettings?.showInternalNotes ?? true}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showInternalNotes', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showInternalNotes" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Internal Notes / Remarks</span>
                          <span className="block text-[10px] text-text-light mt-1">Include administrative remarks, staff overrides, or internal operation notes on the PDF.</span>
                        </label>
                      </div>

                      {/* Production Specs */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showProductionSpecs"
                          checked={jobcardConfig.pdfSettings?.showProductionSpecs ?? true}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showProductionSpecs', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showProductionSpecs" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Production / Job Specifications</span>
                          <span className="block text-[10px] text-text-light mt-1">Show structural sizes, materials, collation details, bindery, coating, or item specs snapshots.</span>
                        </label>
                      </div>

                      {/* Production Checklist */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showProductionChecklist"
                          checked={jobcardConfig.pdfSettings?.showProductionChecklist ?? true}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showProductionChecklist', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showProductionChecklist" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Production Checklists</span>
                          <span className="block text-[10px] text-text-light mt-1">Enable standard digital/physical checkpoint stages and chronological assembly lines checkboxes on sheets.</span>
                        </label>
                      </div>

                      {/* QC Checklist */}
                      <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="pdf_showQcChecklist"
                          checked={jobcardConfig.pdfSettings?.showQcChecklist ?? true}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showQcChecklist', e.target.checked)}
                          className="w-4 h-4 text-brand bg-white border-slate-300 rounded focus:ring-1 mt-1 cursor-pointer"
                        />
                        <label htmlFor="pdf_showQcChecklist" className="text-xs cursor-pointer select-none">
                          <span className="block font-bold text-slate-800">Show Quality Control (QC) Checklist</span>
                          <span className="block text-[10px] text-text-light mt-1">Print a dedicated Quality Control section with checkboxes for Correct Quantity, Dimensions, Tearing, and sign-off.</span>
                        </label>
                      </div>

                      {/* Artwork Halt Rules */}
                      <div className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-slate-100">
                        <label htmlFor="pdf_showArtworkHaltRules" className="text-xs">
                          <span className="block font-bold text-slate-850">Show Artwork Halt Rules & Protocols</span>
                          <span className="block text-[10px] text-text-light mt-1 mb-2">Control when security printing halt rules display based on the artwork approval status.</span>
                        </label>
                        <select
                          id="pdf_showArtworkHaltRules"
                          value={jobcardConfig.pdfSettings?.showArtworkHaltRules ?? 'unapproved'}
                          onChange={(e) => updateJobcardConfigField('pdfSettings', 'showArtworkHaltRules', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          <option value="yes">Always Show Artwork Protocols</option>
                          <option value="no">Never Show Artwork Protocols</option>
                          <option value="unapproved">Only Show Halt Rules if Artwork is NOT Approved (Default)</option>
                        </select>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action panel footer */}
            <div className="pt-8 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveJobcardConfig}
                disabled={isSaving}
                className="px-8 py-3.5 bg-brand text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isSaving ? <Check className="animate-spin" /> : <Save size={14} />}
                <span>Save All Tab Configurations</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'zoho' && (
        <div className="card-minimal text-left">
          <ZohoSettingsTab />
        </div>
      )}

      {/* No success toast needed here as sonner handles it */}
    </div>
  );
}
