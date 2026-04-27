import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { getUserRole } from '@/lib/roleUtils';
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
import InvoiceCreate from './pages/InvoiceCreate';
import EstimateScheduler from './pages/EstimateScheduler';
import SendEstimate from './pages/SendEstimate';
import EstimateEditor from './pages/EstimateEditor';
import TimeTracking from './pages/TimeTracking';
import ClientEstimateView from './pages/ClientEstimateView';
import SignDocumentView from './pages/SignDocumentView';
import WorkOrderDetail from './pages/WorkOrderDetail';
import Customers from './pages/Customers';
import Assignments from './pages/Assignments';
import Workers from './pages/Workers';
import InvoiceDetail from './pages/InvoiceDetailClean';
import CustomerProfile from './pages/CustomerProfile';
import Payments from './pages/Payments';
import IncomeExpenses from './pages/IncomeExpenses';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ProfitabilityDashboard from './pages/ProfitabilityDashboard';
import Proposals from './pages/Proposals.jsx';
import SalesPipeline from './pages/SalesPipeline';
import ProposalEditor from './pages/ProposalEditor';
import PublicProposalView from './pages/PublicProposalView';
import ClientPortal from './pages/ClientPortal';
import RecoveryCenter from './pages/RecoveryCenter';
import SecurityDashboardWithBrain from './pages/SecurityDashboardWithBrain';
import VerifyDocument from './pages/VerifyDocument';

// FIELD APP
import FieldWorkOrders from './pages/FieldWorkOrders';
import FieldWorkOrderDetail from './pages/FieldWorkOrderDetail';

const PUBLIC_ROUTE_PREFIXES = [
  '/client-estimate',
  '/sign-document',
  '/proposal-view',
  '/client-portal',
  '/verify-document',
  '/',
  '/services',
  '/gallery',
  '/about',
  '/contact',
  '/partners',
  '/team-access',
  '/login',
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTE_PREFIXES.some(path => pathname === path || (path !== '/' && pathname.startsWith(path)));
}

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, access = 'any' }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) return <LoadingScreen />;

  const localAuth = sessionStorage.getItem('local_auth') === 'true';
  if (!isAuthenticated && !localAuth) {
    return <Navigate to="/team-access" replace />;
  }

  if (isAuthenticated) {
    sessionStorage.setItem('base44_authenticated', 'true');
  }

  const role = getUserRole() || 'admin';

  if (access === 'admin' && role === 'field_agent') {
    return <Navigate to="/field" replace />;
  }

  if (access === 'field' && role !== 'field_agent' && role !== 'admin') {
    return <Navigate to="/team-access" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicHome />} />
    <Route path="/services" element={<Services />} />
    <Route path="/gallery" element={<Gallery />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/partners" element={<Partners />} />
    <Route path="/team-access" element={<TeamAccess />} />
    <Route path="/login" element={<Login />} />

    <Route path="/sign-document" element={<SignDocumentView />} />

    <Route element={<ProtectedRoute access="admin"><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
    </Route>

    <Route path="/client-estimate" element={<ClientEstimateView />} />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const publicRoute = isPublicRoute(location.pathname);

  if (isLoadingPublicSettings || isLoadingAuth) return <LoadingScreen />;

  if (authError && !publicRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const localAuth = sessionStorage.getItem('local_auth') === 'true';
      if (!localAuth) {
        return <Navigate to="/team-access" replace />;
      }
    }
  }

  return <AppRoutes />;
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
  );
}

export default App
