import React, { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, FileText, Sparkles, RefreshCcw, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface PreflightCheck {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  value: string;
  remedy: string;
}

const MOCK_FILES = [
  {
    name: 'corporate_catalog_final_v2.pdf',
    size: '18.4 MB',
    type: 'Adobe PDF (Acrobat Pro)',
    checks: [
      { id: '1', name: 'Image Resolution (DPI)', status: 'PASS', value: '300 DPI Average', remedy: 'No action required.' },
      { id: '2', name: 'Bleed Parameters margin', status: 'PASS', value: '3.0 mm Outer Bleed', remedy: 'No action required.' },
      { id: '3', name: 'Color Workspace profile', status: 'PASS', value: 'CMYK FOGRA39 Coated', remedy: 'No action required.' },
      { id: '4', name: 'Vector Font Outlines', status: 'PASS', value: 'Converted to Curves', remedy: 'No action required.' },
      { id: '5', name: 'Transparency / Spot blending', status: 'WARNING', value: 'Overlapping Spot Layers', remedy: 'Pre-rasterize background spot elements to avoid press shift.' },
      { id: '6', name: 'Safe-Zone Outer boundary', status: 'PASS', value: '5mm gutter margin verified', remedy: 'No action required.' }
    ] as PreflightCheck[]
  },
  {
    name: 'business_card_front_raw.jpeg',
    size: '4.2 MB',
    type: 'JPEG Image File',
    checks: [
      { id: '1', name: 'Image Resolution (DPI)', status: 'WARNING', value: '220 DPI (Low Quality)', remedy: 'Slight graininess expected. Request client vector file for sharp print edges.' },
      { id: '2', name: 'Bleed Parameters margin', status: 'FAIL', value: '0.0 mm (No bleed identified)', remedy: 'Critical risk of white borders during trim. Add 3mm canvas bleed borders.' },
      { id: '3', name: 'Color Workspace profile', status: 'FAIL', value: 'sRGB IEC61966-2.1', remedy: 'Automatic conversion to CMYK will shift vibrant greens/blues. Review soft proof.' },
      { id: '4', name: 'Vector Font Outlines', status: 'WARNING', value: 'Rasterized bitmap fonts', remedy: 'Texts may look pixelated. Supply PDF/X-1a with vectors.' },
      { id: '5', name: 'Transparency / Spot blending', status: 'PASS', value: 'No transparency', remedy: 'No action required.' },
      { id: '6', name: 'Safe-Zone Outer boundary', status: 'PASS', value: 'Passed margins', remedy: 'No action required.' }
    ] as PreflightCheck[]
  }
];

export default function LithoPreflightTab() {
  const [selectedFile, setSelectedFile] = useState(MOCK_FILES[0]);
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (idx: number) => {
    setIsPreflighting(true);
    setTimeout(() => {
      setSelectedFile(MOCK_FILES[idx]);
      setIsPreflighting(false);
      toast.success("Preflight check complete!");
    }, 1200);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIsPreflighting(true);
      setTimeout(() => {
        // Mock default analysis output for newly dropped assets
        toast.success(`Uploaded: ${e.dataTransfer.files[0].name}`);
        setSelectedFile(MOCK_FILES[1]); // Bind to JPEG analyzer log
        setIsPreflighting(false);
      }, 1500);
    }
  };

  const overallFailures = selectedFile.checks.filter(c => c.status === 'FAIL').length;
  const overallWarnings = selectedFile.checks.filter(c => c.status === 'WARNING').length;
  const overallPass = SelectedFilePassed(selectedFile.checks);

  function SelectedFilePassed(checks: PreflightCheck[]) {
    return checks.every(c => c.status !== 'FAIL') ? (checks.some(c => c.status === 'WARNING') ? 'WARNING' : 'PASS') : 'FAIL';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* File Dropping upload pane and mock selector */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="p-1 px-1.5 bg-brand-accent/5 text-brand-accent rounded text-[10px]"><Upload size={13} /></span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Artwork Ingestion Portal</span>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div 
            onDragEnter={handleDrag} 
            onDragOver={handleDrag} 
            onDragLeave={handleDrag} 
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none",
              dragActive 
                ? "border-brand-accent bg-brand-accent/3" 
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50"
            )}
          >
            <div className="w-11 h-11 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3 shadow-sm">
              <Upload size={18} />
            </div>

            <span className="text-xs font-bold text-slate-700 block mb-1">Drag new file proofs here</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Recommended: PDF/X-1a, EPS, TIFF</span>
          </div>

          {/* Preset proofs quick-loader */}
          <div className="space-y-2 pt-2 border-t border-slate-50">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Select proof from queue</span>
            {MOCK_FILES.map((f, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => handleFileChange(idx)}
                className={cn(
                  "w-full flex items-center justify-between p-3 border rounded-xl text-left transition-all duration-300 shadow-sm",
                  selectedFile.name === f.name 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="p-1.5 bg-slate-100 rounded-lg text-slate-500 shrink-0 group-hover:bg-slate-200">
                    <FileText size={14} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold truncate leading-none mb-1">{f.name}</span>
                    <span className="text-[9px] opacity-60 font-bold uppercase tracking-wider">{f.size} • {f.type}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic validation summary badge */}
        <div className="card-minimal p-6 border-slate-100 relative overflow-hidden flex flex-col gap-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diagnostic Verdict</span>
          
          <div className="flex items-center gap-4">
            {overallPass === 'PASS' && (
              <>
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <span className="p-0.5 px-2 bg-emerald-500 text-white text-[8px] font-bold rounded uppercase tracking-wider">Ready to plate</span>
                  <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight mt-1">Preflight: Passed</h3>
                </div>
              </>
            )}

            {overallPass === 'WARNING' && (
              <>
                <div className="w-14 h-14 bg-amber-50 text-amber-500 border border-amber-100 rounded-2xl flex items-center justify-center">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <span className="p-0.5 px-2 bg-amber-500 text-white text-[8px] font-bold rounded uppercase tracking-wider">Attention recommended</span>
                  <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight mt-1">Preflight: Warnings</h3>
                </div>
              </>
            )}

            {overallPass === 'FAIL' && (
              <>
                <div className="w-14 h-14 bg-red-50 text-red-500 border border-red-100 rounded-2xl flex items-center justify-center">
                  <XCircle size={28} />
                </div>
                <div>
                  <span className="p-0.5 px-2 bg-red-500 text-white text-[8px] font-bold rounded uppercase tracking-wider">Critical Failures</span>
                  <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight mt-1">Preflight: Blocked</h3>
                </div>
              </>
            )}
          </div>

          <p className="text-[10px] text-slate-450 leading-relaxed mt-1">
            {overallPass === 'PASS' && 'The asset fulfills high-fidelity print specifications and poses zero press-drying risk.'}
            {overallPass === 'WARNING' && 'The asset contains warnings. Check spotUV overlap and transparent blocks before outputting to plates.'}
            {overallPass === 'FAIL' && 'Fatal configuration errors. Bleed is missing or RGB workspace colors will produce dull prints.'}
          </p>
        </div>
      </div>

      {/* Structured granular preflight list and AI recommendations */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex-1">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Diagnostic checklist review</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {overallFailures} Fails | {overallWarnings} Warnings
            </span>
          </div>

          {isPreflighting ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCcw className="animate-spin text-brand-accent" size={32} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Running Diagnostic preflight pre-press filters...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedFile.checks.map((check) => (
                <div 
                  key={check.id} 
                  className={cn(
                    "p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                    check.status === 'PASS' && "bg-slate-50/50 border-slate-100/60",
                    check.status === 'WARNING' && "bg-amber-50/20 border-amber-100/40",
                    check.status === 'FAIL' && "bg-red-50/20 border-red-100/40"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {check.status === 'PASS' && <CheckCircle className="text-emerald-500" size={14} />}
                      {check.status === 'WARNING' && <AlertTriangle className="text-amber-500" size={14} />}
                      {check.status === 'FAIL' && <XCircle className="text-red-500" size={14} />}
                    </span>
                    <div className="flex flex-col text-[11px]">
                      <span className="font-bold text-slate-800">{check.name}</span>
                      <span className="text-[9px] text-slate-400/90 font-bold block mt-0.5 uppercase tracking-wider">Detected: {check.value}</span>
                    </div>
                  </div>

                  <div className="text-[10px] md:max-w-[280px] bg-white border border-slate-50 p-2 rounded-lg text-slate-500 font-medium">
                    {check.remedy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Prepress assistant auto-reconstruction tips */}
        <div className="card-minimal p-6 border-slate-100 bg-slate-900 text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-accent/10 rounded-full blur-[40px]" />
          
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <span className="p-1 bg-brand-accent text-white rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> Copilot Prepress
            </span>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-200">Prepress corrective instructions</h4>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">AI identifies vector and bleed risks in real-time. Follow these setup macros in Adobe Illustrator/InDesign before baking files to plates:</p>

          <ul className="space-y-2 mt-4 text-[10px] text-slate-300 list-disc pl-4 relative z-10">
            {overallPass === 'PASS' && (
              <li>No issues detected. High density offset dot layout safely verified on RIP software. Run plate exposure.</li>
            )}
            {selectedFile.checks.some(c => c.name.includes('Bleed') && c.status === 'FAIL') && (
              <li>Use the InDesign Bleed Tool set to 3mm canvas boundary. Force object boxes to align to the red margin guide.</li>
            )}
            {selectedFile.checks.some(c => c.name.includes('Color') && c.status === 'FAIL') && (
              <li>Convert layout documents via Edit &gt; Convert to Color Profile &gt; Coated FOGRA39. Check cyan brightness before client soft proofing.</li>
            )}
            {selectedFile.checks.some(c => c.name.includes('Fonts') && c.status === 'WARNING') && (
              <li>Select font frames and execute hotkey <code>Ctrl+Shift+O</code> (Mac: <code>Cmd+Shift+O</code>) to write curves. Fixes missing font raster errors.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
