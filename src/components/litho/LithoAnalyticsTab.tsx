import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, ShieldAlert, Award, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const PRODUCT_PROFITABILITY = [
  { category: 'Folders', revenue: 45000, profit: 18500, margin: 41 },
  { category: 'Brochures', revenue: 64000, profit: 24200, margin: 37 },
  { category: 'Business Cards', revenue: 22000, profit: 12000, margin: 54 },
  { category: 'Flyers', revenue: 38000, profit: 14500, margin: 38 },
  { category: 'Letterheads', revenue: 15000, profit: 6200, margin: 41 }
];

const CLIENT_LEADERBOARD = [
  { name: 'Apex Logistics Corp', spend: 32000, profit: 13500 },
  { name: 'Sovereign Bank Group', spend: 28500, profit: 11200 },
  { name: 'Dynamic Retailers SA', spend: 24000, profit: 9800 },
  { name: 'Vanguard Media House', spend: 18000, profit: 7900 }
];

const BOTTLENECKS = [
  { area: 'Finishing Division (Auto Folds)', status: 'High Wear', delayWeight: '32m avg halt' },
  { area: 'Plate Making (CTP Exposure Queue)', status: 'Optimal', delayWeight: '8m delay' },
  { area: 'Offset Press Drying pile space', status: 'Clogged', delayWeight: '90m stack delay' }
];

const OPERATIONS_ALERTS = [
  { id: '1', level: 'CRITICAL', msg: 'SRA3 Coated 350gsm stock level below safety re-order threshold (1,200 sheets remaining).', date: 'Just now' },
  { id: '2', level: 'WARNING', msg: 'Heidelberg Speedmaster SM74 queue length exceeds optimal schedule capacity (+3 outstanding litho runs).', date: '12m ago' },
  { id: '3', level: 'ALERT', msg: 'Client approval timeout warning: Corporate Brochure A4 artwork proof pending review for 72+ hours.', date: '1h ago' },
  { id: '4', level: 'WARNING', msg: 'Lamination Matrix lamine roll running thin. Finishing operator crew action recommended.', date: '3h ago' }
];

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function LithoAnalyticsTab() {
  const totalRevenue = PRODUCT_PROFITABILITY.reduce((acc, item) => acc + item.revenue, 0);
  const totalProfit = PRODUCT_PROFITABILITY.reduce((acc, item) => acc + item.profit, 0);
  const overallAvgMargin = Math.round((totalProfit / totalRevenue) * 100);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Dynamic Key Indicators KPI ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-minimal p-6 border-slate-100">
          <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">AGGREGATED REVENUE</span>
          <span className="text-xl font-black text-slate-800 italic">R {totalRevenue.toLocaleString()}</span>
        </div>
        <div className="card-minimal p-6 border-slate-100">
          <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">OPERATIONAL MARGIN NETT</span>
          <span className="text-xl font-black text-emerald-600 italic">R {totalProfit.toLocaleString()}</span>
        </div>
        <div className="card-minimal p-6 border-slate-100">
          <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">AVERAGE NETT MASS MARGIN</span>
          <span className="text-xl font-black text-slate-800 italic">{overallAvgMargin}% COMMERCE</span>
        </div>
        <div className="card-minimal p-6 border-slate-100">
          <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">WASTE REGISTER RATIO</span>
          <span className="text-xl font-black text-indigo-650 italic">7.4% ALLOCATION</span>
        </div>
      </div>

      {/* Analytics Charts Panels row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Costing Profitability Bar Chart */}
        <div className="lg:col-span-8 card-minimal p-6 border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-6">
            <div>
              <span className="text-xs font-bold text-slate-850 uppercase tracking-widest block">Product Profit & Margin Index</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">High volumes vs short-run cost comparison</p>
            </div>
            <TrendingUp size={16} className="text-slate-400" />
          </div>

          <div className="w-full h-[260px] text-[10px] select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRODUCT_PROFITABILITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={9} />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={9} />
                <Tooltip />
                <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Net Profit R">
                  {PRODUCT_PROFITABILITY.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="revenue" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Gross Revenue R" opacity={0.65} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client contribution breakdown pie chart */}
        <div className="lg:col-span-4 card-minimal p-6 border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-6">
            <span className="text-xs font-bold text-slate-850 uppercase tracking-widest">Key Client Contribution</span>
            <Award size={16} className="text-slate-400" />
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[160px] pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={CLIENT_LEADERBOARD}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="spend"
                >
                  {CLIENT_LEADERBOARD.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-[10px]">
            {CLIENT_LEADERBOARD.map((client, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="truncate max-w-[150px] font-medium">{client.name}</span>
                </div>
                <span className="font-bold text-slate-800">R {client.spend.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Operational Alerts & Bottleneck reports list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Bottleneck tracking division map */}
        <div className="lg:col-span-5 card-minimal p-6 border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
            <span className="text-xs font-bold text-slate-850 uppercase tracking-widest">Floor Bottleneck index</span>
            <ShieldAlert size={16} className="text-slate-400" />
          </div>

          <div className="space-y-4">
            {BOTTLENECKS.map((b, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/40 flex justify-between items-center text-[11px]">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">{b.area}</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">Load density: {b.status}</span>
                </div>
                <span className="font-bold text-slate-700 bg-white border border-slate-100 px-2.5 py-1 rounded-lg text-[10px]">
                  {b.delayWeight}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Smart Alerts Log */}
        <div className="lg:col-span-7 card-minimal p-6 border-slate-100">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
            <span className="text-xs font-bold text-slate-850 uppercase tracking-widest">Smart Machine Warn Notifications</span>
            <FileSpreadsheet size={16} className="text-slate-400" />
          </div>

          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
            {OPERATIONS_ALERTS.map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "p-3 rounded-xl border flex items-start gap-3 text-[11px]",
                  alert.level === 'CRITICAL' && "bg-red-50/40 border-red-100/40 text-red-800",
                  alert.level === 'WARNING' && "bg-amber-50/40 border-amber-100/40 text-amber-800",
                  alert.level === 'ALERT' && "bg-blue-50/40 border-blue-100/40 text-blue-800"
                )}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[8px] font-black tracking-widest uppercase">{alert.level}</span>
                    <span className="text-[9px] opacity-60 font-bold">{alert.date}</span>
                  </div>
                  <span className="font-medium text-slate-700">{alert.msg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
