import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  const location = useLocation();
  
  const getTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Command Center';
      case '/clients': return 'Client Matrix';
      case '/materials': return 'Material Store';
      case '/suppliers': return 'Supply Chain';
      case '/products': return 'Service Lab';
      case '/ncr-books': return 'NCR Repository';
      case '/litho-products': return 'Litho Forge';
      case '/packages': return 'Bundle Hub';
      case '/quotes': return 'Quote Engine';
      case '/jobs': return 'Active Pipeline';
      case '/production-board': return 'Production Grid';
      case '/machines': return 'Machine Units';
      case '/departments': return 'Department Flux';
      case '/inventory-registry': return 'Registry Hub';
      case '/inventory': return 'Stock Control';
      case '/purchasing': return 'Procurement';
      case '/reports': return 'Intelligence';
      case '/utilization': return 'Unit Metrics';
      case '/order-history': return 'Archive';
      case '/settings': return 'Core Config';
      default: return 'SignPro ERP';
    }
  };

  return (
    <div className="flex bg-slate-50/30 min-h-screen text-text-main font-sans selection:bg-indigo-100 italic-none">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <Header title={getTitle(location.pathname)} />
          <div className="flex-1 overflow-y-auto bg-surface/30 px-6 py-8 md:px-12 md:py-12 scrollbar-hide">
            <div className="max-w-[1700px] mx-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
