import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Calendar, Clock, Download, FileText, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRClientPortalTabProps {
  selectedBook: NCRBook | null;
}

export default function NCRClientPortalTab({ selectedBook }: NCRClientPortalTabProps) {
  const [signatureName, setSignatureName] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [countdownText, setCountdownText] = useState('2d 23h 59m 54s');

  // Hard countdown simulating the 3-day approval deadline
  useEffect(() => {
    let secondsLeft = (3 * 24 * 60 * 60) - 1320; // 3 Days minus roughly 22 minutes
    const timer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        setCountdownText('EXPIRED (Auto approved)');
        clearInterval(timer);
      } else {
        const days = Math.floor(secondsLeft / (24 * 3600));
        const hours = Math.floor((secondsLeft % (24 * 3600)) / 3600);
        const minutes = Math.floor((secondsLeft % 3600) / 60);
        const seconds = secondsLeft % 60;
        setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Preflight tests
  const preflightTests = [
    { id: 'p1', name: 'Original face layout safe-zone bleed (.125” / 3mm)', result: 'PASS', description: 'Main text lines sit at least 4mm inside perforation lines.' },
    { id: 'p2', name: 'Sequential red numbering zone clearance', result: 'PASS', description: 'Clearance rectangular box of 12mm x 35mm provided for stamp indentation.' },
    { id: 'p3', name: 'Embedded Barcode element DPI density (&gt;600DPI)', result: 'PASS', description: 'Barcode vectors are fully rasterized high contrast black.' },
    { id: 'p4', name: 'Pantone reverse conditions ink conversion (solid 10%)', result: 'WARNING', description: 'Terms and conditions reversed font height is small (6pt). Renders better in solid 100% Grey.' }
  ];

  const handleClientApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      toast.error('Signature: Please input your name to sign.');
      return;
    }
    setIsSigned(true);
    toast.success('Signature: Legal job approval signed, checklist logged, production scheduled!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Client Proof Display & Signature Panel */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-5">
            <div>
              <span className="text-[8px] bg-slate-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                CLIENT PORTAL PROOF REVIEW
              </span>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
                Artwork Set proof Approval
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Clients can inspect vector safe zones, bleed marks, numbering grids, and append digital approvals.
              </p>
            </div>
            {/* Countdown widget */}
            <div className="text-right p-3 bg-red-50 border border-red-100 rounded-2xl">
              <span className="text-[7px] text-red-700 font-black uppercase tracking-widest block">3-DAY AUTO DEADLINE CLOSE</span>
              <strong className="text-xs font-black text-red-600 block tabular-nums mt-0.5">{countdownText}</strong>
            </div>
          </div>

          {/* Interactive Artwork layout container */}
          <div className="relative bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center p-6 aspect-[1.1/1]">
            <div className="absolute inset-0 bg-grid-slate-200 bg-[size:20px_20px] opacity-[0.4] pointer-events-none" />

            {/* Simulated Artwork Layer bounding boxes */}
            <div className="w-[300px] bg-white border-2 border-dashed border-red-400 shadow-md aspect-[1/1.4] p-5 relative flex flex-col justify-between">
              
              {/* Markers for bleed lines */}
              <div className="absolute -top-3.5 -left-3.5 text-[6px] font-black text-red-500 uppercase tracking-widest bg-white px-1.5 py-0.5 border border-dashed border-red-300">
                3MM BLEED REQ
              </div>
              <div className="absolute top-2.5 right-2.5 border border-red-200 px-2 py-0.5 bg-red-50 text-[8px] font-mono font-bold text-red-600">
                No. INV-1001 (RED)
              </div>

              {/* Title & grid lines */}
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-800 uppercase italic">ORIGINAL INVOICE FILE</span>
                <p className="text-[6px] text-slate-400 uppercase tracking-wide">Client Layout Viewport - SignPro Graphic Dept</p>
              </div>

              <div className="border border-slate-150 p-2 text-center rounded bg-slate-50 text-[7px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
                <span>[ PLACED COMPANY VECTOR LOGO HOVER ]</span>
              </div>

              <div className="border-t border-slate-100 space-y-1.5 flex-grow py-3 flex flex-col justify-end">
                <span className="w-full h-1 bg-slate-100 block rounded" />
                <span className="w-3/4 h-1 bg-slate-100 block rounded" />
                <span className="w-1/2 h-1 bg-slate-100 block rounded" />
              </div>

              {/* Footer bounds */}
              <div className="border-t border-slate-100 pt-2 flex justify-between text-[6px] font-black text-slate-400 uppercase">
                <span>Safe margins verified</span>
                <span className="text-red-500 font-bold">*PERFORATED BOUNDARY LINK</span>
              </div>
            </div>

            {/* Hover overlay guides */}
            <div className="absolute bottom-4 left-4 p-2 bg-slate-900 text-white rounded text-[7.5px] font-black uppercase tracking-widest shadow">
              ✔ 600DPI Resolution Checked
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                toast.success('Artwork PDF specs triggered. Downloading composite proof...');
              }}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Download size={12} /> Download PDF Proof
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Digital Signature Form & Preflight Checklist */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Signoff Panel */}
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              LEGAL SIGN-OFF CERTIFICATION
            </span>
            <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Proof Signature Verification
            </h4>
            <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">
              Signatures authorize print setup. Automatic 3-day approval executes if target queue timer closes.
            </p>
          </div>

          {isSigned ? (
            <div className="p-6 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center space-y-3.5">
              <CheckCircle size={32} className="text-emerald-500" />
              <div>
                <strong className="text-[11px] text-white uppercase tracking-wider block">PROOF LEGALLY OUTLINE REGISTERED</strong>
                <span className="text-[9px] text-slate-400 font-bold uppercase block mt-1">Signatory: {signatureName}</span>
                <span className="text-[7.5px] font-mono text-slate-500 block mt-2">TIMESTAMP: {new Date().toUTCString()}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClientApprove} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Signatory Representative Name</label>
                <input
                  type="text"
                  required
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="e.g. Jean-Pierre (Purchasing Manager)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase focus:outline-none"
                />
              </div>

              {/* Pad drawing area */}
              <div className="h-28 bg-slate-50 hover:bg-slate-100/50 cursor-crosshair border border-dashed border-slate-250 rounded-2xl flex flex-col items-center justify-center text-center select-none p-3 group">
                <FileText size={20} className="text-slate-400 group-hover:scale-110 transition-transform" />
                <span className="text-[7.5px] text-slate-400 font-extrabold uppercase mt-2">Click-and-Drag Mouse Signature Area</span>
                <span className="text-[6.5px] text-slate-400 font-bold uppercase mt-0.5">Requires client-side verification gesture</span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                Sign Off & Release to Print
              </button>
            </form>
          )}
        </div>

        {/* Preflight Tests summary */}
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-3 block">PREFLIGHT ENGINE AUDIT CHECKS</h4>
          <div className="space-y-3.5">
            {preflightTests.map((test) => (
              <div key={test.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 flex gap-2.5 items-start">
                <div className="mt-0.5 shrink-0">
                  {test.result === 'PASS' ? (
                    <CheckCircle size={14} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[9px] font-black text-slate-800 uppercase">{test.name}</span>
                    <span className={cn(
                      "text-[7px] font-black uppercase px-2 py-0.5 rounded",
                      test.result === 'PASS' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>{test.result}</span>
                  </div>
                  <p className="text-[8px] text-slate-455 uppercase leading-normal tracking-wide">{test.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
