import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tag, Printer, BookOpen, Package as PackageIcon, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Material, Product, LithoProduct, NCRBook, Package } from '../types';

export default function InventoryRegistryHub() {
  const navigate = useNavigate();
  const { data: materials, loading: mLoading } = useCollection<Material>('materials');
  const { data: products, loading: pLoading } = useCollection<Product>('products');
  const { data: lithoProducts, loading: lLoading } = useCollection<LithoProduct>('litho_products');
  const { data: ncrBooks, loading: nLoading } = useCollection<NCRBook>('ncr_books');
  const { data: packages, loading: pkgLoading } = useCollection<Package>('packages');

  const lowStockMaterials = materials.filter(m => (m.stockLevel || 0) <= (m.minStock || 0));

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic text-brand-accent">Inventory & Registry</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Central hub for materials, products, and configurations</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HubCard 
          title="Materials"
          desc="Raw substrates and media"
          count={materials.length}
          icon={Box}
          color="blue"
          link="/materials"
          navigate={navigate}
          loading={mLoading}
          alert={lowStockMaterials.length > 0 ? `${lowStockMaterials.length} low stock` : undefined}
        />
        <HubCard 
          title="Products"
          desc="Standard configurable items"
          count={products.length}
          icon={Tag}
          color="purple"
          link="/products"
          navigate={navigate}
          loading={pLoading}
        />
        <HubCard 
          title="Litho Registry"
          desc="Lithographic printing presets"
          count={lithoProducts.length}
          icon={Printer}
          color="emerald"
          link="/litho-products"
          navigate={navigate}
          loading={lLoading}
        />
        <HubCard 
          title="NCR Registry"
          desc="No Carbon Required book configs"
          count={ncrBooks.length}
          icon={BookOpen}
          color="amber"
          link="/ncr-books"
          navigate={navigate}
          loading={nLoading}
        />
        <HubCard 
          title="Packages"
          desc="Bundled product offerings"
          count={packages.length}
          icon={PackageIcon}
          color="rose"
          link="/packages"
          navigate={navigate}
          loading={pkgLoading}
        />
      </div>
    </div>
  );
}

function HubCard({ title, desc, count, icon: Icon, color, link, navigate, loading, alert }: any) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
  };

  return (
    <div 
      onClick={() => navigate(link)}
      className="card-minimal p-8 group cursor-pointer hover:border-brand-accent/30 transition-all flex flex-col gap-6"
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rounded-xl", colors[color as keyof typeof colors])}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        {alert && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
            <AlertTriangle size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">{alert}</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic group-hover:text-brand-accent transition-colors">{title}</h3>
        <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-1">{desc}</p>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border/50">
        <div className="flex items-baseline gap-2">
          {loading ? (
            <div className="w-8 h-8 flex items-center justify-center"><div className="w-4 h-4 border-2 border-brand/20 border-t-brand rounded-full animate-spin" /></div>
          ) : (
            <>
              <span className="text-3xl font-black text-text-main tabular-nums leading-none tracking-tighter">{count}</span>
              <span className="text-[9px] font-black text-text-light uppercase tracking-widest">Active Entries</span>
            </>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-text-light group-hover:text-brand bg-brand/5 group-hover:border-brand transition-all group-hover:scale-110">
          <ArrowRight size={14} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
