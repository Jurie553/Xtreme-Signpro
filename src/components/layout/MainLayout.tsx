import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  const location = useLocation();
  
  const getTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/clients': return 'Clients';
      case '/materials': return 'Materials';
      case '/suppliers': return 'Suppliers';
      case '/products': return 'Products';
      case '/ncr-books': return 'NCR Books';
      case '/litho-products': return 'Litho Printing';
      case '/packages': return 'Packages';
      case '/quotes': return 'Quotes';
      case '/jobs': return 'Jobcards';
      case '/production-board': return 'Production Board';
      case '/machines': return 'Machines';
      case '/departments': return 'Departments';
      case '/inventory-registry': return 'Registry Hub';
      case '/inventory': return 'Inventory';
      case '/purchasing': return 'Procurement';
      case '/reports': return 'Reports';
      case '/utilization': return 'Machine Utilization';
      case '/order-history': return 'Order History';
      case '/settings': return 'Settings';
      default: return 'Xtreme SignPro';
    }
  };

  return (
    <div className="flex bg-surface min-h-screen text-text-main font-sans selection:bg-blue-100">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <Header title={getTitle(location.pathname)} />
          <div className="flex-1 overflow-y-auto bg-surface px-4 py-6 md:px-8 lg:px-10 md:py-8 scrollbar-hide">
            <div className="max-w-[1680px] mx-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
