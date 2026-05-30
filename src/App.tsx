import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MainLayout } from '@/src/components/layout/MainLayout';
import { Toaster } from 'sonner';
import { seedProductCategories } from './lib/firestoreService';

// Pages
import Dashboard from '@/src/pages/Dashboard';
import Clients from '@/src/pages/Clients';
import Materials from '@/src/pages/Materials';
import Products from '@/src/pages/Products';
import Suppliers from '@/src/pages/Suppliers';
import NCRBooks from '@/src/pages/NCRBooks';
import LithoProducts from '@/src/pages/LithoProducts';
import Packages from '@/src/pages/Packages';
import Quotes from '@/src/pages/Quotes';
import Jobs from '@/src/pages/Jobs';
import ProductionBoard from '@/src/pages/ProductionBoard';
import Machines from '@/src/pages/Machines';
import Inventory from '@/src/pages/Inventory';
import InventoryRegistryHub from '@/src/pages/InventoryRegistryHub';
import Purchasing from '@/src/pages/Purchasing';
import Reports from '@/src/pages/Reports';
import OrderHistory from '@/src/pages/OrderHistory';
import Settings from '@/src/pages/Settings';
import MachineUtilization from '@/src/pages/MachineUtilization';
import Departments from '@/src/pages/Departments';
import ClientApproval from '@/src/pages/ClientApproval';
import ExhibitionBranding from '@/src/pages/ExhibitionBranding';
import ImpositionOptimizer from '@/src/pages/ImpositionOptimizer';
import PublicPortal from '@/src/pages/PublicPortal';
import PublicApproval from '@/src/pages/PublicApproval';

function ApproveRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/approval/${jobId}`} replace />;
}

function QuoteRedirect() {
  const { quoteId } = useParams();
  return <Navigate to={`/approval/q/${quoteId}`} replace />;
}

export default function App() {
  useEffect(() => {
    seedProductCategories();
  }, []);

  return (
    <>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/approval/q/:quoteId" element={<ClientApproval />} />
        <Route path="/approval/:jobId" element={<ClientApproval />} />
        <Route path="/approve/:jobId" element={<ApproveRedirect />} />
        <Route path="/approve/q/:quoteId" element={<QuoteRedirect />} />
        
        {/* Dynamic Secured Public Share Portals */}
        <Route path="/quote/:quoteId" element={<PublicPortal />} />
        <Route path="/quote-approval/:token" element={<PublicApproval />} />
        <Route path="/job/:jobId" element={<PublicPortal />} />
        <Route path="/job-approval/:token" element={<PublicApproval />} />
        <Route path="/artwork-approval/:token" element={<PublicApproval />} />
        <Route path="/public/approval/:token" element={<PublicApproval />} />
        <Route path="/client-portal/:clientId" element={<PublicPortal />} />
        <Route path="/proof/:token" element={<PublicApproval />} />
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/inventory-registry" element={<InventoryRegistryHub />} />
        <Route path="/products" element={<Products />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/exhibition" element={<ExhibitionBranding />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/ncr-books" element={<NCRBooks />} />
        <Route path="/litho-products" element={<LithoProducts />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/imposition" element={<ImpositionOptimizer />} />
        <Route path="/production-board" element={<ProductionBoard />} />
        <Route path="/machines" element={<Machines />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/purchasing" element={<Purchasing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/utilization" element={<MachineUtilization />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/pricing-config" element={<Navigate to="/settings" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </>
  );
}
