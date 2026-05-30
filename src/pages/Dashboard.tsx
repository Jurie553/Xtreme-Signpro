import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, FileText, Users, Box, MessageSquareWarning, Clock, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Quote, Job, Client, Product } from '../types';

const money = (value: number) => `R ${Math.round(value || 0).toLocaleString()}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: products, loading: productsLoading } = useCollection<Product>('products');

  const loading = quotesLoading || jobsLoading || clientsLoading || productsLoading;
  const now = new Date();

  const acceptedThisMonth = quotes.filter(q => {
    const created = new Date(q.createdAt);
    return q.status === 'Accepted' && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  const activeJobs = jobs.filter(j => j.stage !== 'Delivered' && j.stage !== 'Cancelled' && j.status !== 'Completed');
  const overdueJobs = activeJobs.filter(j => j.dueDate && j.dueDate < Date.now());
  const dueSoonJobs = activeJobs
    .filter(j => j.dueDate >= Date.now() && j.dueDate <= Date.now() + 5 * 24 * 60 * 60 * 1000)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 5);
  const pendingApprovals = jobs.filter(j => j.artworkStatus === 'Pending' || j.artworkStatus === 'Changes Requested').length;
  const pendingQuotes = quotes.filter(q => ['Draft', 'Sent', 'Viewed'].includes(q.status)).length;

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
    return { name: date.toLocaleDateString(undefined, { weekday: 'short' }), revenue };
  });

  const recentActivity = [...quotes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <section className="surface-panel overflow-hidden">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-3 max-w-3xl">
              <span className="badge-status bg-orange-50 text-orange-700 border-orange-200">Print production workspace</span>
              <h1 className="page-title">Good day. Here is the live shop floor snapshot.</h1>
              <p className="page-subtitle">
                Track quotes, jobcards, approvals, and production deadlines from one clean view.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <QuickAction label="New Quote" icon={FileText} onClick={() => navigate('/quotes')} primary />
              <QuickAction label="New Jobcard" icon={Briefcase} onClick={() => navigate('/jobs')} />
              <QuickAction label="Add Client" icon={Users} onClick={() => navigate('/clients')} />
              <QuickAction label="Add Product" icon={Box} onClick={() => navigate('/products')} />
            </div>
          </div>
          <div className="bg-brand text-white p-6 md:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Month to date</p>
              <p className="mt-2 text-4xl font-black tracking-tight">{loading ? '...' : money(acceptedThisMonth.reduce((sum, q) => sum + (q.subtotal || q.total || 0), 0))}</p>
              <p className="mt-2 text-sm font-semibold text-white/70">Accepted quote value before VAT where available.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <MiniMetric label="Clients" value={clients.length} />
              <MiniMetric label="Products" value={products.length} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard label="Quotes" value={loading ? '...' : quotes.length.toString()} icon={FileText} tone="blue" sub={`${pendingQuotes} pending`} onClick={() => navigate('/quotes')} />
        <StatCard label="Jobs" value={loading ? '...' : activeJobs.length.toString()} icon={Briefcase} tone="navy" sub="active jobcards" onClick={() => navigate('/jobs')} />
        <StatCard label="Sales" value={loading ? '...' : money(acceptedThisMonth.reduce((sum, q) => sum + (q.total || 0), 0))} icon={DollarSign} tone="green" sub="accepted MTD" onClick={() => navigate('/reports')} />
        <StatCard label="Profit" value={loading ? '...' : money(acceptedThisMonth.reduce((sum, q) => sum + (q.profit || 0), 0))} icon={TrendingUp} tone="green" sub="estimated GP" onClick={() => navigate('/reports')} />
        <StatCard label="Approvals" value={loading ? '...' : pendingApprovals.toString()} icon={MessageSquareWarning} tone="amber" sub="awaiting clients" onClick={() => navigate('/production-board')} />
        <StatCard label="Overdue" value={loading ? '...' : overdueJobs.length.toString()} icon={Clock} tone={overdueJobs.length ? 'red' : 'green'} sub="needs attention" onClick={() => navigate('/jobs')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 surface-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-text-main">Weekly Sales Trend</h2>
              <p className="text-sm text-text-muted font-medium">Accepted quotes from the last 7 days.</p>
            </div>
            <span className="badge-status bg-blue-50 text-blue-700 border-blue-200">Live Firestore data</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.08)', fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-4 surface-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-text-main">Jobs Due Soon</h2>
              <p className="text-sm text-text-muted font-medium">Next 5 production deadlines.</p>
            </div>
            <button onClick={() => navigate('/production-board')} className="text-sm font-black text-brand-accent hover:text-blue-700 flex items-center gap-1">
              Board <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <EmptyLine text="Loading jobcards..." />
            ) : dueSoonJobs.length === 0 ? (
              <EmptyLine text="No urgent deadlines in the next 5 days." />
            ) : dueSoonJobs.map(job => (
              <button key={job.id} onClick={() => navigate('/jobs')} className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-brand-accent/40 hover:bg-blue-50/40 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-text-main">{job.jobNumber}</p>
                    <p className="text-xs font-semibold text-text-muted mt-0.5">{job.clientName || 'Client'} - {job.productName || 'Production item'}</p>
                  </div>
                  <span className={cn('badge-status shrink-0', job.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' : job.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>{job.priority}</span>
                </div>
                <p className="text-xs font-bold text-text-light mt-3">Due {new Date(job.dueDate).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-text-main">Recent Quote Activity</h2>
            <p className="text-sm text-text-muted font-medium">Latest quote records and client decisions.</p>
          </div>
          <button onClick={() => navigate('/quotes')} className="btn-secondary flex items-center gap-2">View Quotes <ArrowRight size={15} /></button>
        </div>
        {loading ? (
          <EmptyLine text="Loading activity..." />
        ) : recentActivity.length === 0 ? (
          <div className="empty-state">
            <FileText size={34} className="mx-auto text-slate-300 mb-3" />
            <p className="font-black text-text-main">No quotes yet</p>
            <p className="text-sm mt-1">Create your first quote to start building the sales pipeline.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            {recentActivity.map(quote => (
              <button key={quote.id} onClick={() => navigate('/quotes')} className="p-4 text-left rounded-xl border border-slate-200 bg-white hover:border-brand-accent/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-text-main">{quote.quoteNumber}</p>
                    <p className="text-xs font-bold text-text-light mt-1">{new Date(quote.createdAt).toLocaleDateString()}</p>
                  </div>
                  <QuoteBadge status={quote.status} />
                </div>
                <p className="mt-4 text-lg font-black text-brand">{money(quote.total)}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({ label, icon: Icon, onClick, primary = false }: { label: string; icon: React.ComponentType<any>; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all active:scale-[0.98]', primary ? 'bg-brand-accent text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700' : 'bg-white text-text-main border border-slate-200 hover:border-brand-accent/40 hover:bg-blue-50/40')}>
      <Icon size={17} />
      {label}
      {primary && <Plus size={15} />}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-white/50">{label}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub, tone, onClick }: { label: string; value: string; icon: React.ComponentType<any>; sub: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'navy'; onClick: () => void }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    navy: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <button onClick={onClick} className="card-minimal p-5 text-left hover:-translate-y-0.5 hover:border-brand-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-text-light uppercase tracking-widest">{label}</p>
          <p className="mt-2 text-2xl font-black text-text-main tracking-tight">{value}</p>
        </div>
        <div className={cn('w-11 h-11 rounded-xl border flex items-center justify-center', tones[tone])}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-xs font-bold text-text-muted">{sub}</p>
    </button>
  );
}

function QuoteBadge({ status }: { status: Quote['status'] }) {
  const style = status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    status === 'Rejected' || status === 'Expired' ? 'bg-red-50 text-red-700 border-red-200' :
    status === 'Viewed' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    'bg-slate-50 text-slate-600 border-slate-200';

  return <span className={cn('badge-status', style)}>{status === 'Accepted' && <CheckCircle2 size={11} />}{status}</span>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-semibold text-text-muted">{text}</div>;
}
