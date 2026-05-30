import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Settings, Users, Percent, Flame } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRAnalyticsTabProps {
  books: NCRBook[];
}

export default function NCRAnalyticsTab({ books }: NCRAnalyticsTabProps) {
  
  // Turnaround turnaround times over months
  const monthlyMetrics = useMemo(() => {
    return [
      { name: 'Jan', turnaroundDays: 6.2, wastePercent: 4.5, reprintCalls: 12 },
      { name: 'Feb', turnaroundDays: 5.8, wastePercent: 4.1, reprintCalls: 9 },
      { name: 'Mar', turnaroundDays: 5.9, wastePercent: 3.8, reprintCalls: 15 },
      { name: 'Apr', turnaroundDays: 5.2, wastePercent: 3.5, reprintCalls: 5 },
      { name: 'May', turnaroundDays: 4.8, wastePercent: 3.2, reprintCalls: 3 }
    ];
  }, []);

  // Utilization workload workloads
  const machineBacklogs = useMemo(() => {
    return [
      { name: 'Horizon MC-80', workload: 88, backlogJobs: 8 },
      { name: 'GTO Heidelberg', workload: 76, backlogJobs: 4 },
      { name: 'Polar G-92 Guillo', workload: 92, backlogJobs: 11 },
      { name: 'Collation Padding', workload: 62, backlogJobs: 2 },
      { name: 'Staple Wrap Bound', workload: 45, backlogJobs: 1 }
    ];
  }, []);

  // Operator efficiency ratings
  const operatorMetrics = [
    { name: 'Amelia (Collation Sta)', setsCollated: '15,400 sets', wasteRatio: '1.2%', rating: 'Elite' },
    { name: 'Dimitri (GTO Wheels)', sheetsNumbered: '32,000 sheets', wasteRatio: '1.5%', rating: 'Senior' },
    { name: 'Gerrit (Guillo Cut)', trimsCompleted: '450 blocks', wasteRatio: '0.8%', rating: 'Master' },
    { name: 'Guillaume (Lead Press)', runsFinished: '18 press-cycles', wasteRatio: '1.9%', rating: 'Senior' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* STATS ROW BENTO CARDS */}
      <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-slate-150 rounded-3xl flex flex-col justify-between">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">Waste Ratio (Overs)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-2xl font-black text-slate-800 tabular-nums italic">3.2%</strong>
            <span className="text-[8px] font-bold text-emerald-600 block uppercase">✔ Optimal (-1.2% Dec)</span>
          </div>
          <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-1">Chemical donor ply saving bounds</span>
        </div>

        <div className="p-6 bg-white border border-slate-150 rounded-3xl flex flex-col justify-between">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">GTO Wheel Continuity errors</span>
          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-2xl font-black text-slate-800 tabular-nums italic">0.14%</strong>
            <span className="text-[8px] font-bold text-emerald-600 block uppercase">✔ Under threshold</span>
          </div>
          <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-1">Zero-Defect sequential count rating</span>
        </div>

        <div className="p-6 bg-white border border-slate-150 rounded-3xl flex flex-col justify-between">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">Dispatch lead Turnaround</span>
          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-2xl font-black text-slate-800 tabular-nums italic">4.8 Days</strong>
            <span className="text-[8px] font-bold text-emerald-600 block uppercase">✔ -1.4 Days saving</span>
          </div>
          <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-1">From quote accepted to courier seal</span>
        </div>

        <div className="p-6 bg-white border border-slate-150 rounded-3xl flex flex-col justify-between">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">Reprint Rate exception flags</span>
          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-2xl font-black text-slate-800 tabular-nums italic">0.8%</strong>
            <span className="text-[8px] font-bold text-red-650 block uppercase">▲ 3 sets rerun</span>
          </div>
          <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-1">Pull tests, alignment offsets</span>
        </div>
      </div>

      {/* LEFT COLUMN: Production Speed & waste ratios line charts */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <span className="text-[8px] bg-indigo-50 text-indigo-650 border border-indigo-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              HISTORIC EFFICIENCY LOG
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Turnaround Speed vs. Raw Material Waste %
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Tracks improvements in lead times following the deployment of proprietary Fan-Apart automated clamps.
            </p>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyMetrics}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" />
                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} 
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="turnaroundDays" name="Turnaround (Days)" stroke="#0f172a" strokeWidth={3.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="wastePercent" name="Waste Spoilage %" stroke="#3b82f6" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operator productivity logs table */}
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800">OPERATOR CRAFT EFFICIENCIES</h4>
          <div className="space-y-3.5">
            {operatorMetrics.map((op, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-900 text-white flex items-center justify-center font-black italic text-xs">
                    {op.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-800 uppercase italic block leading-none">{op.name}</span>
                    <span className="text-[8.5px] text-slate-400 font-bold uppercase block mt-1 tracking-wider">Output volume: {op.setsCollated || op.sheetsNumbered || op.trimsCompleted || op.runsFinished}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-emerald-600 block">
                    {op.rating} ({op.wasteRatio} Waste)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Machine utilization workloads */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <span className="text-[8px] bg-zinc-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              GEARBOX LOAD MATRIX
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Bindery Machinery workload Load
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Active operating capacity levels of offset presses, cutters, numbering wheels, and collation stacks.
            </p>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineBacklogs}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} fontWeight="black" />
                <YAxis stroke="#475569" fontSize={9} fontWeight="black" />
                <Tooltip
                  formatter={(value) => [`${value}% Utilization`, 'Load']}
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} 
                />
                <Bar dataKey="workload" name="Machine utilization Load" fill="#0f172a" radius={[6, 6, 0, 0]}>
                  {machineBacklogs.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.workload > 85 ? '#dc2626' : entry.workload > 70 ? '#3b82f6' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
