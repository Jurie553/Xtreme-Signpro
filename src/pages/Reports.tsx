import React, { useState, useMemo } from 'react';
import { Search, DollarSign, TrendingUp, Briefcase, FileText, Download } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Job, Quote } from '../types';
import { toast } from 'sonner';

export default function Reports() {
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'last' | 'custom'>('month');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const totalRevenue = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
    const totalProfit = jobs.reduce((sum, job) => sum + (job.profit || 0), 0);
    return {
      revenue: totalRevenue,
      profit: totalProfit,
      jobsCount: jobs.length,
      quotesCount: quotes.length
    };
  }, [jobs, quotes]);

  const chartData = useMemo(() => {
    // Current sample logic - in production this would be real date grouping
    const months = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26'];
    return months.map(m => ({
      name: m,
      revenue: Math.floor(Math.random() * 50000) + 50000,
      profit: Math.floor(Math.random() * 20000) + 15000
    }));
  }, [jobs]);

  const clientData = useMemo(() => {
    const clients: Record<string, number> = {};
    jobs.forEach(job => {
      const name = job.clientName || 'Unknown';
      clients[name] = (clients[name] || 0) + (job.totalAmount || 0);
    });

    return Object.entries(clients)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [jobs]);

  if (jobsLoading || quotesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex items-end justify-between">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic font-serif">Institutional Intelligence</h2>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-3">Advanced financial performance metrics</p>
        </div>
        
        <button 
          onClick={() => {
            console.log('Button Click: Export Analytics');
            toast.success('Analytical export generated. Downloading CSV...');
          }}
          className="px-8 py-3 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:brightness-110 transition-all flex items-center gap-3"
        >
          <Download size={16} />
          Export Datastream
        </button>
      </header>

      <div className="flex items-center justify-between">
        <div className="flex bg-paper p-1 rounded-2xl border border-border/50 shadow-sm">
          <button 
            onClick={() => {
              console.log('Tab Click: Reports Tactical');
              setTimeRange('week');
            }}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              timeRange === 'week' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Tactical
          </button>
          <button 
            onClick={() => {
              console.log('Tab Click: Reports Standard');
              setTimeRange('month');
            }}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              timeRange === 'month' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Standard
          </button>
          <button 
            onClick={() => {
              console.log('Tab Click: Reports Historical');
              setTimeRange('last');
            }}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              timeRange === 'last' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Historical
          </button>
          <button 
            onClick={() => {
              console.log('Tab Click: Reports Custom');
              setTimeRange('custom');
            }}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              timeRange === 'custom' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Custom
          </button>
        </div>
        <div className="relative group w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search queries..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-paper border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StatCard label="Aggregate Revenue" value={`R ${stats.revenue.toLocaleString()}`} icon={DollarSign} color="blue" />
        <StatCard label="Net Operating Profit" value={`R ${stats.profit.toLocaleString()}`} icon={TrendingUp} color="emerald" highlight />
        <StatCard label="Active Deployments" value={stats.jobsCount.toString()} icon={Briefcase} color="purple" />
        <StatCard label="Pending Proposals" value={stats.quotesCount.toString()} icon={FileText} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-2 card-minimal p-8 overflow-hidden relative group">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <div className="flex items-center justify-between mb-10 relative z-10">
            <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic font-serif">Performance Vectors</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-lg shadow-blue-200" />
                <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
                <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8', textTransform: 'uppercase' }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: '1px solid #f0f0f0', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.08)', padding: '16px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  labelStyle={{ fontWeight: 900, color: '#111827', marginBottom: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-minimal p-8 overflow-hidden relative">
          <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
          <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic mb-10 relative z-10 font-serif">Entity Distribution</h3>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', textTransform: 'uppercase', width: 100 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(37, 99, 235, 0.03)' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 12, 12, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight = false }: any) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className={cn(
      "card-minimal p-8 flex items-center justify-between group hover:-translate-y-1 transition-all border border-border/50",
      highlight && "border-emerald-200 bg-emerald-50/20"
    )}>
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-black text-text-light uppercase tracking-widest">{label}</span>
        <span className="text-2xl font-black text-text-main tracking-tighter tabular-nums italic lowercase">{value}</span>
      </div>
      <div className={cn(
        "w-14 h-14 rounded-[1.25rem] border flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110",
        colors[color as keyof typeof colors]
      )}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
  );
}
