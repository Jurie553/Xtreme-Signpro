import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, FileText, Users, Box, Share2, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Quote, Job, Client, Product } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: products, loading: productsLoading } = useCollection<Product>('products');

  const loading = quotesLoading || jobsLoading || clientsLoading || productsLoading;

  const mtdRevenue = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth() && new Date(q.createdAt).getFullYear() === new Date().getFullYear())
    .reduce((sum, q) => sum + q.subtotal, 0);

  const mtdProfit = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth() && new Date(q.createdAt).getFullYear() === new Date().getFullYear())
    .reduce((sum, q) => sum + q.profit, 0);

  const activeJobsCount = jobs.filter(j => j.stage !== 'Delivered' && j.stage !== 'Cancelled').length;
  const pendingQuotesCount = quotes.filter(q => q.status === 'Sent' || q.status === 'Viewed' || q.status === 'Draft').length;

  const chartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const revenue = quotes
      .filter(q => q.status === 'Accepted' && q.createdAt >= start.getTime() && q.createdAt <= end.getTime())
      .reduce((sum, q) => sum + (q.subtotal || q.total || 0), 0);
    return {
      name: date.toLocaleDateString(undefined, { weekday: 'short' }),
      revenue,
    };
  });

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      
      {/* Dynamic Statistics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          label="Revenue MTD" 
          value={loading ? '...' : `R ${mtdRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          trend="+12.5%" 
          link="/reports" 
          navigate={navigate} 
          accentClass="text-brand-accent bg-brand-accent/5 border-brand-accent/10"
        />
        <StatCard 
          label="Net Profit" 
          value={loading ? '...' : `R ${mtdProfit.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+8.2%" 
          link="/reports" 
          navigate={navigate} 
          accentClass="text-emerald-500 bg-emerald-50 bg-emerald-500/5 border-emerald-500/10"
        />
        <StatCard 
          label="Active Fleet" 
          value={loading ? '...' : activeJobsCount.toString()} 
          icon={Briefcase} 
          trend="Stable" 
          link="/jobs" 
          navigate={navigate} 
          accentClass="text-indigo-600 bg-indigo-50 border-indigo-500/10"
        />
        <StatCard 
          label="Quote Pipeline" 
          value={loading ? '...' : pendingQuotesCount.toString()} 
          icon={FileText} 
          trend="SLA Active" 
          link="/quotes" 
          navigate={navigate} 
          accentClass="text-amber-500 bg-amber-50 border-amber-500/10"
        />
      </div>

      {/* Guided Workflow Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Core Production Pipeline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <WorkflowStep 
            id={1}
            title="Clients"
            desc="Partner directory"
            icon={Users}
            link="/clients"
            isComplete={clients.length > 0}
            navigate={navigate}
          />
          <WorkflowStep 
            id={2}
            title="Products"
            desc="Unified catalogs"
            icon={Box}
            link="/inventory-registry"
            isComplete={products.length > 0}
            navigate={navigate}
          />
          <WorkflowStep 
            id={3}
            title="Quoting"
            desc="Dynamic calculators"
            icon={FileText}
            link="/quotes"
            isComplete={quotes.length > 0}
            navigate={navigate}
          />
          <WorkflowStep 
            id={4}
            title="Production"
            desc="Output flow control"
            icon={Share2}
            link="/production-board"
            isComplete={jobs.length > 0}
            navigate={navigate}
          />
        </div>
      </section>

      {/* Double Column Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Performance Chart Card */}
        <div className="lg:col-span-8 card-minimal p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-text-main uppercase tracking-wider italic">Performance Output</h3>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-1">Live weekly aggregate</p>
            </div>
            <span className="text-[9px] font-bold text-brand-accent bg-brand-accent/5 px-2.5 py-1 rounded-md uppercase tracking-widest select-none">Live Sync</span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -4px rgba(15,23,42,0.04)', fontSize: '11px', fontWeight: 'bold' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={2} 
                  fillOpacity={1}
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Log Logins */}
        <div className="lg:col-span-4 card-minimal p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-text-main uppercase tracking-wider italic mb-6">Activity Timeline</h3>
            
            <div className="space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-text-light/50 text-xs font-bold uppercase tracking-wider">Retrieving feeds...</div>
              ) : quotes.length === 0 ? (
                <div className="text-text-light/50 text-xs font-bold uppercase tracking-wider py-10 text-center">No recent activities</div>
              ) : (
                quotes.slice(0, 4).map((quote) => (
                  <div key={quote.id} className="flex gap-4 items-start text-xs group">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 shadow-[0_0_6px_rgba(79,70,229,0.4)] shrink-0 transition-transform group-hover:scale-125" />
                    <div>
                      <p className="text-text-main font-bold capitalize">Quote {quote.status.toLowerCase()}</p>
                      <p className="text-text-light text-[10px] uppercase font-bold tracking-wider mt-0.5">{quote.quoteNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={() => navigate('/quotes')}
            className="w-full mt-6 py-3 bg-slate-50 hover:bg-brand-accent hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center justify-center gap-2 border border-slate-100/50 hover:border-transparent transition-all duration-300 active:scale-[0.98] select-none"
          >
            Review Quotes
            <ArrowRight size={12} />
          </button>
        </div>

      </div>
    </div>
  );
}

interface WorkflowStepProps {
  id?: number;
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  link: string;
  isComplete: boolean;
  navigate: (path: string) => void;
}

function WorkflowStep({ title, desc, icon: Icon, link, isComplete, navigate }: WorkflowStepProps) {
  return (
    <div 
      onClick={() => navigate(link)}
      className="group card-minimal p-5 flex flex-col gap-4 justify-between h-full cursor-pointer border-slate-100/80 hover:border-brand-accent/20 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 font-semibold flex items-center justify-center transition-colors group-hover:bg-brand-accent/5 group-hover:text-brand-accent">
          <Icon size={16} strokeWidth={2.4} />
        </div>
        {isComplete && (
          <div className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/10">
            Active
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-text-main group-hover:text-brand-accent transition-colors tracking-tight">{title}</h4>
        <p className="text-[10px] font-bold text-text-light uppercase tracking-wider mt-0.5 leading-none">{desc}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  trend: string;
  link: string;
  accentClass?: string;
  navigate: (path: string) => void;
}

function StatCard({ label, value, icon: Icon, trend, link, accentClass, navigate }: StatCardProps) {
  return (
    <div 
      onClick={() => link && navigate(link)}
      className="card-minimal p-5 flex items-center justify-between cursor-pointer border-slate-100/80 hover:border-brand-accent/20 select-none group"
    >
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-text-light uppercase tracking-wider leading-none">{label}</p>
        <h4 className="text-2xl font-black text-text-main tracking-tight leading-none tabular-nums">{value}</h4>
      </div>
      
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-105 transition-all", accentClass)}>
        <Icon size={18} strokeWidth={2} />
      </div>
    </div>
  );
}
