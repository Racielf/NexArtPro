import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import PublicHome from './pages/PublicHome';
import Services from './pages/Services';
import Gallery from './pages/Gallery';
import About from './pages/About';
import Contact from './pages/Contact';
import Partners from './pages/Partners';
import Login from './pages/Login';
import TeamAccess from './pages/TeamAccess';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Appointments from './pages/Appointments';
import Estimates from './pages/Estimates';
import WorkOrders from './pages/WorkOrders';
import Invoices from './pages/Invoices';
import EstimateScheduler from './pages/EstimateScheduler';
import SendEstimate from './pages/SendEstimate';
import EstimateEditor from './pages/EstimateEditor';
import TimeTracking from './pages/TimeTracking';
import ClientEstimateView from './pages/ClientEstimateView';
import WorkOrderDetail from './pages/WorkOrderDetail';
import Customers from './pages/Customers';
import Assignments from './pages/Assignments';
import Workers from './pages/Workers';
import InvoiceDetail from './pages/InvoiceDetail';
import CustomerProfile from './pages/CustomerProfile';
import Payments from './pages/Payments';
import IncomeExpenses from './pages/IncomeExpenses';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ProfitabilityDashboard from './pages/ProfitabilityDashboard';
import Proposals from './pages/Proposals.jsx';
import ProposalEditor from './pages/ProposalEditor';
import PublicProposalView from './pages/PublicProposalView';
import ClientDocumentView from './pages/ClientDocumentView';
import ClientPortal from './pages/ClientPortal';


const ProtectedRoute = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Accept base44 real auth OR legacy local_auth
  const localAuth = sessionStorage.getItem('local_auth') === 'true';
  if (!isAuthenticated && !localAuth) {
    return <Navigate to="/team-access" replace />;
  }

  // Mark session so other components know auth is active
  if (isAuthenticated) {
    sessionStorage.setItem('base44_authenticated', 'true');
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Only redirect if no local_auth fallback
      const localAuth = sessionStorage.getItem('local_auth') === 'true';
      if (!localAuth) {
        return <Navigate to="/team-access" replace />;
      }
    }
  }

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/services" element={<Services />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/team-access" element={<TeamAccess />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/estimates" element={<Estimates />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/schedule-estimate" element={<EstimateScheduler />} />
        <Route path="/send-estimate" element={<SendEstimate />} />
        <Route path="/estimate-editor" element={<EstimateEditor />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/invoice-detail" element={<InvoiceDetail />} />
        <Route path="/customer-profile" element={<CustomerProfile />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/income-expenses" element={<IncomeExpenses />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profitability" element={<ProfitabilityDashboard />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/proposal-editor" element={<ProposalEditor />} />
        <Route path="/settings" element={<Settings />} />

      </Route>
      <Route path="/client-estimate" element={<ClientEstimateView />} />
      <Route path="/proposal-view" element={<PublicProposalView />} />
      <Route path="/client-document" element={<ClientDocumentView />} />
      <Route path="/client-portal" element={<ClientPortal />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App