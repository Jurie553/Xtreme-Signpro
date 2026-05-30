import React, { useState, useMemo } from 'react';
import { Hash, RefreshCw, AlertCircle, CheckCircle, ArrowRight, CornerDownRight, Play, Eye } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRNumberingTabProps {
  selectedBook: NCRBook | null;
}

export default function NCRNumberingTab({ selectedBook }: NCRNumberingTabProps) {
  const [prefix, setPrefix] = useState('INV-');
  const [suffix, setSuffix] = useState('/2026');
  const [startNum, setStartNum] = useState(1001);
  const [setsCount, setSetsCount] = useState(2500); // quantity (e.g. 50 books * 50 sets = 2500 sets)
  const [dualNumbering, setDualNumbering] = useState(false);
  const [printerMode, setPrinterMode] = useState<'mechanical' | 'digital'>('mechanical');
  const [wheelColor, setWheelColor] = useState<'Red' | 'Black'>('Red');
  const [activePreviewPage, setActivePreviewPage] = useState(1);

  // Sync with book if selected
  React.useEffect(() => {
    if (selectedBook) {
      setSetsCount((selectedBook.setsPerBook || 50) * 10); // Calculate for 10 books
    }
  }, [selectedBook]);

  const endNum = useMemo(() => {
    return startNum + setsCount - 1;
  }, [startNum, setsCount]);

  // Simulated Audit / Missing-Number sequence generator
  const sequenceAudits = useMemo(() => {
    return [
      { id: 'QA-01', jobNo: 'JOB-9481', range: '1001 - 2500', status: 'Passed', checkedBy: 'Guillaume (Lead Press)', timestamp: '3 hours ago' },
      { id: 'QA-02', jobNo: 'JOB-9452', range: '501 - 1000', status: 'Passed', checkedBy: 'Sarah (Preflight)', timestamp: '1 day ago' },
      { id: 'QA-03', jobNo: 'JOB-9321', range: '001 - 500', status: 'Flagged Gap', checkedBy: 'System Audit', timestamp: '3 days ago', issue: 'Missing continuous set at index #412' }
    ];
  }, []);

  const previewPages = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const currentNum = startNum + i;
      const formattedNum = `${prefix}${String(currentNum).padStart(6, '0')}${suffix}`;
      return {
        id: i + 1,
        setIndex: currentNum,
        formattedNum
      };
    });
  }, [startNum, prefix, suffix]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT PANEL: Parameters & Configuration */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-sky-50 text-blue-600 border border-blue-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              AUTOMATED NUMBERING SETUP
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Sequence Mechanical Settings
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Configure prefixes, start ranges, skipping and crash wheel specifications.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prefix Tag</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                  placeholder="e.g. TAX-"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Suffix Tag</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                  placeholder="e.g. /2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Start Sequence Number</label>
                <input
                  type="number"
                  value={startNum}
                  onChange={(e) => setStartNum(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-850 tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Slashed Sets</label>
                <input
                  type="number"
                  value={setsCount}
                  onChange={(e) => setSetsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-850 tabular-nums"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">AUTO RE-CALCULATED END RANGE</span>
              <div className="flex items-center gap-2">
                <strong className="text-slate-800 font-black text-sm italic tracking-tight">{prefix}{String(startNum).padStart(6, '0')}{suffix}</strong>
                <ArrowRight size={14} className="text-slate-400" />
                <strong className="text-slate-800 font-black text-sm italic tracking-tight">{prefix}{String(endNum).padStart(6, '0')}{suffix}</strong>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Numbering Press Configuration</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrinterMode('mechanical')}
                  className={cn(
                    "px-3 py-2.5 text-[9px] font-black uppercase tracking-wider rounded-xl border text-center transition-all",
                    printerMode === 'mechanical' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  GTO Rotary Wheel
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterMode('digital')}
                  className={cn(
                    "px-3 py-2.5 text-[9px] font-black uppercase tracking-wider rounded-xl border text-center transition-all",
                    printerMode === 'digital' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Digital High-Yield
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wheel Ink Tint</label>
                <select
                  value={wheelColor}
                  onChange={(e) => setWheelColor(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase"
                >
                  <option value="Red">Red Ink (Standard)</option>
                  <option value="Black">Black Ink (Specialty)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Crash Dual Position</label>
                <div className="flex items-center gap-2 h-full">
                  <input
                    type="checkbox"
                    id="dualNumbering"
                    checked={dualNumbering}
                    onChange={(e) => setDualNumbering(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 border-slate-350 focus:ring-slate-900 focus:outline-none"
                  />
                  <label htmlFor="dualNumbering" className="text-[9px] font-extrabold text-slate-500 uppercase cursor-pointer select-none">
                    Place Dual Numbers
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Checkpoint Alert Panel */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-3">SEQUENCE GAP AUDITOR LOGS</h4>
          <div className="space-y-3">
            {sequenceAudits.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                {log.status.includes('Gap') ? (
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-700">{log.jobNo} ({log.range})</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                      log.status.includes('Gap') ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>{log.status}</span>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase">Checked: {log.checkedBy} • {log.timestamp}</p>
                  {log.issue && <p className="text-[8px] text-red-600 font-bold uppercase mt-1">*{log.issue}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Sequential Numbering Layout Simulator */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6 flex flex-col h-full min-h-[580px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                LIVE COMPOSITE PREVIEW SIMULATOR
              </span>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
                Press GTO Wheel Registration Alignment
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Simulated look of sheets rolling off GTO Heidelberg wheels.
              </p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              {previewPages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setActivePreviewPage(page.id)}
                  className={cn(
                    "px-3 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all",
                    activePreviewPage === page.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  Set {idxToOrdinalWord(index)}
                </button>
              ))}
            </div>
          </div>

          {/* Active sheet simulator */}
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl flex items-center justify-center p-6 relative overflow-hidden group">
            {/* Grid paper lines watermark styling */}
            <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

            <div className="w-full max-w-[420px] bg-white border border-slate-350 shadow-lg rounded-lg aspect-[1/1.4] p-6 relative flex flex-col justify-between transition-transform duration-500 hover:scale-[1.01]">
              
              {/* Header Invoice Sim */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase italic block leading-none">SIGNPRO INVOICE FORM</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block">CUSTOMER TRANSACTION RECORD</span>
                </div>
                {/* Red ink sequential placing simulation */}
                <span className={cn(
                  "px-3 py-1 border border-red-200 font-mono text-[11px] font-black tracking-widest rounded shadow-sm bg-red-50/50 blink-slow animate-duration-1000",
                  wheelColor === 'Red' ? "text-red-600 border-red-300" : "text-slate-800 border-slate-300"
                )}>
                  No. {previewPages[activePreviewPage - 1]?.formattedNum}
                </span>
              </div>

              {/* Duplicate Wheel simulation if active */}
              {dualNumbering && (
                <div className="absolute bottom-16 right-6">
                  <span className={cn(
                    "px-3 py-1 border font-mono text-[10px] font-black tracking-widest rounded shadow-sm bg-red-50/50",
                    wheelColor === 'Red' ? "text-red-500 border-red-200" : "text-slate-700 border-slate-200"
                  )}>
                    No. {previewPages[activePreviewPage - 1]?.formattedNum}
                  </span>
                  <span className="text-[6px] text-slate-400 block text-right mt-1 font-bold uppercase">SEC-CORD MATCH</span>
                </div>
              )}

              {/* Mock items list */}
              <div className="border-y border-slate-100 py-3.5 my-3.5 space-y-2 flex-grow">
                <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-wider">
                  <span>SPEC DESCRIPTION</span>
                  <span>QUANTITY</span>
                </div>
                <div className="border-t border-dashed border-slate-100 pt-2 flex justify-between text-[8px] font-bold text-slate-700">
                  <span className="uppercase">NCR carbonless set printed greyscale size A5</span>
                  <span className="tabular-nums">50 Pads</span>
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-700">
                  <span className="uppercase">Crash-numbering mechanical system red ink GTO</span>
                  <span className="tabular-nums">Included</span>
                </div>
              </div>

              {/* Bottom info signature and terms footer */}
              <div className="flex justify-between items-end border-t border-slate-100 pt-3 text-[7px] font-semibold text-slate-400 uppercase tracking-wide">
                <div className="space-y-1">
                  <span>Sign: _________________________</span>
                  <span className="block text-[6px]">Recipient verified receipt and condition</span>
                </div>
                <span className="text-right">Thank you for your business!</span>
              </div>

              {/* Coated details on edge sheet indicator */}
              <div className="absolute right-0 top-[40%] translate-x-1 pointer-events-none">
                <span className="px-2 py-0.5 bg-slate-900 text-white font-bold tracking-widest uppercase text-[6px] rounded shadow-md border border-slate-800 [writing-mode:vertical-lr]">
                  NCR SET SHEET {activePreviewPage}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Ready to verify numbering layout with operator checklist?
            </span>
            <button
              onClick={() => {
                toast.success(`Numbering sequence layout aligned. First sequence: ${previewPages[0].formattedNum} registered successfully.`);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
            >
              Verify Alignment
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function idxToOrdinalWord(idx: number): string {
  const words = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  return words[idx] || `${idx + 1}th`;
}
