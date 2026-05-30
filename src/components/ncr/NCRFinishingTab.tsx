import React, { useState, useMemo } from 'react';
import { ToggleLeft, CheckSquare, Wrench, ShieldAlert, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRFinishingTabProps {
  selectedBook: NCRBook | null;
}

interface MachineState {
  id: string;
  name: string;
  category: string;
  status: 'Online' | 'Offline' | 'Standby' | 'Maintenance';
  operator: string;
  queueLength: number;
  maintenanceDue: string;
}

export default function NCRFinishingTab({ selectedBook }: NCRFinishingTabProps) {
  const [binderyType, setBinderyType] = useState('fan-apart');
  const [coverType, setCoverType] = useState('croc-black');
  const [perforateAll, setPerforateAll] = useState(true);

  // Machinery fleet status metrics
  const [fleet, setFleet] = useState<MachineState[]>([
    { id: 'M1', name: 'Polar G-92 Guillotine Cutter', category: 'Guillotine Trimming', status: 'Online', operator: 'Gerrit (Guillo Operator)', queueLength: 3, maintenanceDue: '12 Days' },
    { id: 'M2', name: 'Horizon MC-80 air-suction collator', category: 'NCR Collation', status: 'Online', operator: 'Amelia (Collation Stage)', queueLength: 1, maintenanceDue: '24 Days' },
    { id: 'M3', name: 'Heidelberg Windmill GTO 52', category: 'Mechanical Numbering', status: 'Standby', operator: 'Dimitri (Rotary Lead)', queueLength: 0, maintenanceDue: '4 Days' },
    { id: 'M4', name: 'Standard Glued Padding Clamps', category: 'Edge Glue Pad / Fanapart', status: 'Online', operator: 'Amelia (Collation Stage)', queueLength: 2, maintenanceDue: '60 Days' },
    { id: 'M5', name: 'Horizon Stitcher & Spine Wrapper', category: 'Staple Bound Bindery', status: 'Offline', operator: 'N/A - Standby Line', queueLength: 0, maintenanceDue: 'Immediate Service' }
  ]);

  // QC checkoff items state
  const [qcItems, setQcItems] = useState([
    { id: 'q1', text: 'Sequential check: continuous numbering count free from skips or double strikes', checked: true },
    { id: 'q2', text: 'Chemical Transfer: pressure carbon copy reaction functions perfectly down to final ply', checked: true },
    { id: 'q3', text: 'Perforation line validation: micro-perforate tear is clean without ripping margins', checked: false },
    { id: 'q4', text: 'Spine tape wrap alignment: cloth tape covers stapled spine evenly and sets neatly', checked: false },
    { id: 'q5', text: 'Original sheets CB and CFB duplicate sets match print register lines fully (+-0.2mm)', checked: false }
  ]);

  const toggleQc = (id: string) => {
    setQcItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        if (nextChecked) toast.success('Quality Checklist: Verified and approved and certified.');
        return { ...item, checked: nextChecked };
      }
      return item;
    }));
  };

  const reprintCount = useMemo(() => {
    return qcItems.filter(q => !q.checked).length;
  }, [qcItems]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Specialty Bindery Settings & Machinery Tracking */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              SPECIALTY BINDERY PRODUCTION
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Machine Bindery Settings
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Track carbonless bindery parameters including fanapart bonds, Crocodileboard wrap jackets, micro-perforation line depths, and edge taping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-extrabold pb-0.5">Glued Padding Binder</label>
              <select
                value={binderyType}
                onChange={(e) => setBinderyType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-755"
              >
                <option value="fan-apart">Proprietary Fan-Apart Carbonless Adhesive</option>
                <option value="standard-padded">Heavy White Padding Compound (Non-carbon)</option>
                <option value="spine-tape">Black Spine Tape and Heavy Bookcloth binding</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-extrabold pb-0.5">Spine Wrap Shield / Cover Face</label>
              <select
                value={coverType}
                onChange={(e) => setCoverType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-755"
              >
                <option value="croc-black">Crocodile Texture Emboss Board 240gsm (Red/Blue/Black Spine)</option>
                <option value="kraft-plain">Plain Kraft Board Backing + Wrap flap shield</option>
                <option value="self-cover">Self-cover paper 60gsm front pad (No board front jacket)</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2 pt-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2.5">Perforation Depth Tear Settings</span>
              <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex-1">
                  <span className="text-[10px] font-black text-slate-800 block uppercase leading-none">Micro-perforation Line Press Wheel</span>
                  <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-1 leading-relaxed">
                    Applies perforation wheel on face of White & Pink layers so they detach cleanly. Yellow layer remains securely glued inside backing block.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPerforateAll(!perforateAll)}
                  className={cn(
                    "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border",
                    perforateAll ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500"
                  )}
                >
                  {perforateAll ? 'Perforate All copies' : 'Perforate Top Plies Only'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Machinery fleet queues status */}
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-red-50 text-red-600 border border-red-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              FLEET UTILIZATION SCHEDULER
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Bindery Equipment Line Load
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Monitor active queues and downtime parameters on Polar cutters and Horizon MC collation stations.
            </p>
          </div>

          <div className="space-y-3.5">
            {fleet.map((machine) => (
              <div key={machine.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center border",
                    machine.status === 'Online' && "bg-emerald-50 text-emerald-600 border-emerald-150",
                    machine.status === 'Standby' && "bg-yellow-50 text-yellow-600 border-yellow-150",
                    machine.status === 'Offline' && "bg-red-50 text-red-500 border-red-150"
                  )}>
                    <Cpu size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase italic block leading-none">{machine.name}</span>
                    <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-widest block mt-1">{machine.category} • Lead: {machine.operator}</span>
                  </div>
                </div>

                <div className="flex items-center gap-5 justify-between md:justify-end text-right">
                  <div>
                    <span className="text-[7px] text-slate-400 font-black uppercase block tracking-widest">ACTIVE QUEUES</span>
                    <span className="text-[11px] font-black text-slate-800 tabular-nums">{machine.queueLength} Jobs waiting</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-slate-400 font-black uppercase block tracking-widest">MAINTENANCE</span>
                    <span className="text-[11px] font-black text-slate-800 italic uppercase">{machine.maintenanceDue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Visual Quality Checkoff Board */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              MANUFACTURING QUALITY ASSURANCE
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              QC Sequence Continuity Signoff
            </h3>
            <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">
              Lead bindery operator must inspect first set plies and manually tick signoffs before packing crate boxes.
            </p>
          </div>

          <div className="space-y-3.5">
            {qcItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleQc(item.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex gap-3.5 items-start",
                  item.checked 
                    ? "bg-slate-900 border-slate-900 text-slate-300" 
                    : "bg-slate-50 border-slate-150 text-slate-550 hover:border-slate-300 hover:bg-slate-100/50"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <CheckCircle2
                    size={16}
                    className={cn(
                      "transition-all",
                      item.checked ? "text-emerald-500 fill-emerald-500" : "text-slate-400"
                    )}
                  />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide leading-relaxed block">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 pt-5 mt-5">
            <span className="text-[8px] text-slate-455 font-black uppercase tracking-widest">QC HEALTH RATIO CHECK</span>
            <div className="flex justify-between items-baseline mt-1.5 pb-2 border-b border-slate-200">
              <strong className="text-indigo-600 text-lg font-black tracking-tight">{100 - (reprintCount * 20)}% PASSED</strong>
              <span className="text-[8px] text-slate-400 font-bold uppercase">Pending Check: {reprintCount} / 5</span>
            </div>
            
            <p className="text-[8px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">
              *Ticking and auditing off all items guarantees a 100% Zero-Defect warrant for Carbonless printing chemical transfers.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
