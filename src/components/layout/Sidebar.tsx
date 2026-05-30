import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Box, 
  Truck, 
  Tag, 
  BookOpen, 
  Package, 
  FileText, 
  Briefcase, 
  Columns, 
  Cpu, 
  Warehouse, 
  ShoppingCart, 
  BarChart3,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  Printer,
  ChevronDown,
  Shirt,
  Flag,
  Landmark
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLocation } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Columns, label: 'Production Board', path: '/production-board' },
  { icon: FileText, label: 'Quotes', path: '/quotes' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Layers, label: 'Sheet Optimizer', path: '/imposition' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { 
    icon: Box, 
    label: 'Products', 
    path: '/inventory-group',
    children: [
      { icon: LayoutDashboard, label: 'Overview', path: '/inventory-registry' },
      { icon: Tag, label: 'Standard Specs', path: '/products' },
      { icon: Box, label: 'Materials', path: '/materials' },
      { icon: Flag, label: 'Exhibition Branding', path: '/exhibition' },
      { icon: Printer, label: 'Litho Printing', path: '/litho-products' },
      { icon: BookOpen, label: 'NCR Books', path: '/ncr-books' },
      { icon: Package, label: 'Packages', path: '/packages' },
    ]
  },
  { 
    icon: Truck, 
    label: 'Procurement', 
    path: '/procurement-group',
    children: [
      { icon: Warehouse, label: 'Inventory', path: '/inventory' },
      { icon: Truck, label: 'Suppliers', path: '/suppliers' },
      { icon: ShoppingCart, label: 'Purchasing', path: '/purchasing' },
    ]
  },
  { 
    icon: Settings, 
    label: 'Settings', 
    path: '/settings-group',
    children: [
      { icon: Settings, label: 'General', path: '/settings' },
      { icon: Landmark, label: 'Zoho Books', path: '/settings?tab=zoho' },
      { icon: FileText, label: 'Templates Setup', path: '/settings?tab=templates' },
      { icon: Cpu, label: 'Machines', path: '/machines' },
      { icon: Layers, label: 'Departments', path: '/departments' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
      { icon: Cpu, label: 'Utilization', path: '/utilization' },
      { icon: History, label: 'Order History', path: '/order-history' },
    ]
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [openSubmenus, setOpenSubmenus] = React.useState<string[]>(['/inventory-group', '/procurement-group']);
  const { pathname } = useLocation();

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  return (
    <aside className={cn(
      "bg-brand text-white flex flex-col h-screen transition-all duration-300 relative z-20 shadow-xl shadow-slate-950/10",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-brand shrink-0 shadow-md">
          <span className="font-black text-sm tracking-tight">XS</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <h1 className="font-black text-lg leading-none text-white tracking-tight">Xtreme SignPro</h1>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Print & Signage Hub</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-4 no-scrollbar">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isSubmenuOpen = openSubmenus.includes(item.path);
          const isChildActive = hasChildren && item.children?.some(child => pathname === child.path);
          const isItemActive = pathname === item.path || isChildActive;

          if (hasChildren) {
            return (
              <div key={item.path} className="space-y-0.5">
                <button
                  onClick={() => !collapsed && toggleSubmenu(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors rounded-xl font-bold text-sm",
                    isChildActive 
                      ? "text-white bg-white/12 shadow-sm" 
                      : "text-slate-300 hover:text-white hover:bg-white/8"
                  )}
                >
                  <item.icon size={17} strokeWidth={2.2} className={cn("shrink-0", isChildActive && "text-creative")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown size={13} className={cn("transition-transform duration-300 text-slate-400", isSubmenuOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                
                {!collapsed && isSubmenuOpen && (
                  <div className="pl-6 space-y-0.5 py-1">
                    {item.children?.map((child) => {
                      const isActive = pathname === child.path;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 transition-colors rounded-xl font-semibold text-xs",
                            isActive 
                              ? "text-white bg-white/12" 
                              : "text-slate-400 hover:text-white hover:bg-white/8"
                          )}
                        >
                          <child.icon size={13} strokeWidth={2.2} className={cn("shrink-0", isActive ? "text-creative" : "text-slate-500")} />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
 
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors rounded-xl font-bold text-sm",
                isItemActive 
                  ? "text-white bg-white/12 shadow-sm" 
                  : "text-slate-300 hover:text-white hover:bg-white/8"
              )}
            >
              <item.icon size={17} strokeWidth={2.2} className={cn("shrink-0", isItemActive && "text-creative")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 text-slate-400">
        {!collapsed && (
          <div className="bg-white/8 p-3 rounded-xl border border-white/10">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">System Status</h4>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Operational</span>
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 text-slate-500 hover:text-brand-accent hover:border-brand-accent/30 transition-all duration-300 z-30 select-none"
      >
        <ChevronLeft size={11} strokeWidth={2.5} className={cn("transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
