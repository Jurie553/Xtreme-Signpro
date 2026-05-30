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
  const [collapsed, setCollapsed] = React.useState(true);
  const [openSubmenus, setOpenSubmenus] = React.useState<string[]>(['/inventory-group', '/settings-group', '/procurement-group']);
  const { pathname } = useLocation();

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  return (
    <aside className={cn(
      "bg-white border-r border-slate-200 flex flex-col h-screen transition-all duration-300 relative z-20 shadow-sm",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
          <span className="font-bold text-sm tracking-tight">SP</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <h1 className="font-bold text-lg leading-none text-slate-900 tracking-tight">SignPro</h1>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Corporate ERP</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-4">
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
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors rounded-xl font-medium text-xs",
                    isChildActive 
                      ? "text-brand-accent bg-brand-accent/5 font-semibold" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={16} strokeWidth={2.2} className={cn("shrink-0", isChildActive && "text-brand-accent")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left tracking-wide font-bold">{item.label}</span>
                      <ChevronDown size={12} className={cn("transition-transform duration-300 text-slate-400", isSubmenuOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                
                {!collapsed && isSubmenuOpen && (
                  <div className="pl-6 space-y-0.5">
                    {item.children?.map((child) => {
                      const isActive = pathname === child.path;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 transition-colors rounded-xl font-medium text-[11px]",
                            isActive 
                              ? "text-brand-accent bg-brand-accent/5 font-bold" 
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          <child.icon size={12} strokeWidth={2.2} className={cn("shrink-0", isActive ? "text-brand-accent" : "text-slate-400")} />
                          <span className="uppercase tracking-wider">{child.label}</span>
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
                "flex items-center gap-3 px-3 py-2.5 transition-colors rounded-xl font-medium text-xs",
                isItemActive 
                  ? "text-brand-accent bg-brand-accent/5 font-bold" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <item.icon size={16} strokeWidth={2.2} className={cn("shrink-0", isItemActive && "text-brand-accent")} />
              {!collapsed && <span className="tracking-wide font-bold">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100/60 text-slate-400">
        {!collapsed && (
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">System Status</h4>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Operational</span>
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-white border border-slate-100 shadow-sm rounded-full p-1.5 text-slate-400 hover:text-brand-accent hover:border-brand-accent/20 transition-all duration-350 z-30 select-none"
      >
        <ChevronLeft size={11} strokeWidth={2.5} className={cn("transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
