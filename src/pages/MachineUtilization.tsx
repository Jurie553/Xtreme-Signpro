import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Cpu, Clock, AlertTriangle, Play, Pause, Settings as SettingsIcon, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { useCollection } from '../lib/firestoreService';
import { Machine } from '../types';
import { cn } from '@/src/lib/utils';

const COLORS = {
  uptime: '#10b981', // Emerald 500
  idle: '#fbbf24',   // Amber 400
  downtime: '#ef4444' // Red 500
};

// Mock historical data for machines
const MOCK_TIME_DATA = [
  { day: 'Mon', uptime: 18, idle: 4, downtime: 2 },
  { day: 'Tue', uptime: 20, idle: 2, downtime: 2 },
  { day: 'Wed', uptime: 15, idle: 6, downtime: 3 },
  { day: 'Thu', uptime: 22, idle: 1, downtime: 1 },
  { day: 'Fri', uptime: 19, idle: 3, downtime: 2 },
  { day: 'Sat', uptime: 8, idle: 12, downtime: 4 },
  { day: 'Sun', uptime: 4, idle: 18, downtime: 2 },
];

const MOCK_TREND_DATA = [
  { time: '00:00', load: 15, target: 80 },
  { time: '02:00', load: 12, target: 80 },
  { time: '04:00', load: 10, target: 80 },
  { time: '06:00', load: 25, target: 80 },
  { time: '08:00', load: 45, target: 80 },
  { time: '10:00', load: 85, target: 80 },
  { time: '12:00', load: 92, target: 80 },
  { time: '14:00', load: 78, target: 80 },
  { time: '16:00', load: 95, target: 80 },
  { time: '18:00', load: 60, target: 80 },
  { time: '20:00', load: 35, target: 80 },
  { time: '22:00', load: 20, target: 80 },
];

export default function MachineUtilization() {
  const { data: machines, loading } = useCollection<Machine>('machines');
  const [statusFilter, setStatusFilter] = useState<Machine['status'] | 'All'>('All');

  const filteredMachines = machines.filter(m => 
    statusFilter === 'All' ? true : m.status === statusFilter
  );

  const statusData = [
    { name: 'Active', value: machines.filter(m => m.status === 'Active').length, color: COLORS.uptime },
    { name: 'Idle', value: machines.filter(m => m.status === 'Idle').length, color: COLORS.idle },
    { name: 'Maintenance', value: machines.filter(m => m.status === 'Maintenance').length, color: COLORS.downtime },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPossibleHours = 24 * 7;
  const avgUptime = MOCK_TIME_DATA.reduce((acc, curr) => acc + curr.uptime, 0) / 7;
  const utilizationRate = Math.round((avgUptime / 24) * 100);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Machine Utilization</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Production asset performance & lifecycle monitoring</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <UtilizationStatCard 
          label="Avg. Daily Uptime" 
          value={`${avgUptime.toFixed(1)}h`} 
          icon={Play} 
          color="emerald" 
          subtext="Across active fleet"
        />
        <UtilizationStatCard 
          label="System Utilization" 
          value={`${utilizationRate}%`} 
          icon={Clock} 
          color="brand" 
          subtext="Target: 85%"
        />
        <UtilizationStatCard 
          label="Maintenance Pulse" 
          value={machines.filter(m => m.status === 'Maintenance').length.toString()} 
          icon={AlertTriangle} 
          color="red" 
          subtext="Current fleet downtime"
        />
        <UtilizationStatCard 
          label="Active Assets" 
          value={machines.filter(m => m.status === 'Active').length.toString()} 
          icon={Cpu} 
          color="amber" 
          subtext="Provisioned machines"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Utilization Over Time (Stacked Bar) */}
        <div className="lg:col-span-2 card-minimal p-8 overflow-hidden relative">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic">Weekly Utilization Matrix</h3>
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest mt-1">Daily hours allocation by status</p>
            </div>
            <div className="flex gap-4">
               {Object.entries(COLORS).map(([key, color]) => (
                 <div key={key} className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                   <span className="text-[8px] font-black text-text-light uppercase tracking-widest">{key}</span>
                 </div>
               ))}
            </div>
          </div>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TIME_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#6B7280' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#6B7280' }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: -5, fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1.5rem', 
                    border: '1px solid #E5E7EB', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '1rem'
                  }}
                  labelStyle={{ fontWeight: 900, color: '#111827', textTransform: 'uppercase', fontSize: '12px' }}
                />
                <Bar dataKey="uptime" stackId="a" fill={COLORS.uptime} radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="idle" stackId="a" fill={COLORS.idle} />
                <Bar dataKey="downtime" stackId="a" fill={COLORS.downtime} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Composition Pie */}
        <div className="card-minimal p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic mb-8 self-start">Fleet Pulse</h3>
          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-3xl font-black text-text-main italic tracking-tighter">{machines.length}</span>
              <p className="text-[8px] font-black text-text-light uppercase tracking-widest mt-1">Total Assets</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 w-full">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 bg-surface/50 border border-border/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{s.name} Mode</span>
                </div>
                <span className="text-xs font-black text-text-main tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real-time Load Trend */}
        <div className="card-minimal p-8 relative overflow-hidden">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic mb-8 relative z-10">Daily Load Profile</h3>
          <div className="h-[250px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#6B7280' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#6B7280' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1.5rem', 
                    border: '1px solid #E5E7EB', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '1rem'
                  }}
                  labelStyle={{ fontWeight: 900, color: '#111827', textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="load" 
                  name="Current Load"
                  stroke={COLORS.uptime} 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: COLORS.uptime, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: COLORS.uptime }}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="target" 
                  name="Target Efficiency"
                  stroke="#9CA3AF" 
                  strokeWidth={1} 
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Index */}
        <div className="card-minimal p-8 relative overflow-hidden">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
            <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic">Maintenance Radar</h3>
            
            <div className="flex bg-surface/50 p-1 rounded-xl border border-border/30">
              {(['All', 'Active', 'Idle', 'Maintenance'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    statusFilter === status 
                      ? "bg-white text-brand-accent shadow-sm ring-1 ring-border/50" 
                      : "text-text-light hover:text-text-main"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 relative z-10">
             {filteredMachines.map((machine) => (
               <div key={machine.id} className="flex flex-col gap-2 p-4 bg-surface/50 border border-border/30 rounded-2xl group hover:border-brand-accent transition-all cursor-default">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        machine.status === 'Active' ? "bg-emerald-50 text-emerald-500" : machine.status === 'Maintenance' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                      )}>
                        <SettingsIcon size={14} />
                      </div>
                      <span className="text-xs font-black text-text-main uppercase tracking-tighter">{machine.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest">MTTF: 450h</span>
                 </div>
                 <div className="flex gap-2 items-center">
                    <div className="flex-1 h-2 bg-border/50 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          machine.status === 'Active' ? "bg-emerald-500" : machine.status === 'Maintenance' ? "bg-red-500" : "bg-amber-400"
                        )} 
                        style={{ width: machine.status === 'Active' ? '85%' : machine.status === 'Maintenance' ? '15%' : '40%' }} 
                      />
                    </div>
                    <span className="text-[9px] font-black text-text-main tabular-nums italic">
                       {machine.status === 'Active' ? '85%' : machine.status === 'Maintenance' ? '15%' : '40%'}
                    </span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UtilizationStatCard({ label, value, icon: Icon, color, subtext }: any) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    brand: 'bg-blue-50 text-brand-accent border-blue-100',
    red: 'bg-red-50 text-red-500 border-red-100',
    amber: 'bg-amber-50 text-amber-500 border-amber-100',
  };

  return (
    <div className="card-minimal p-6 flex flex-col group hover:border-brand-accent/40 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
          colorMap[color as keyof typeof colorMap]
        )}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] mb-1">{label}</span>
        <span className="text-3xl font-black text-text-main tracking-tighter italic tabular-nums">{value}</span>
        <p className="text-[8px] font-bold text-text-light uppercase tracking-widest mt-2">{subtext}</p>
      </div>
    </div>
  );
}
