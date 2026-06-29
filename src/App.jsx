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
import Calendar from './pages/Calendar';
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
import NexArtSign from './pages/NexArtSign';
import NexArtSignFieldEditor from './pages/NexArtSignFieldEditor';
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
import PriceBook from './pages/PriceBook';
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
import NexArtAgent from './pages/NexArtAgent';

import FieldWorkOrders from './pages/FieldWorkOrders';
import FieldWorkOrderDetail from './pages/FieldWorkOrderDetail';
import Projects from './pages/projects/Projects';
import ProjectNew from './pages/projects/ProjectNew';
import Investors from './pages/investors/Investors';
import InvestorNew from './pages/investors/InvestorNew';
import InvestorDetail from './pages/investors/InvestorDetail';
import ProjectDetail from './pages/projects/ProjectDetail';
import ProjectOverview from './pages/projects/ProjectOverview';
import ProjectFinancials from './pages/projects/ProjectFinancials';
import ProjectInvestors from './pages/projects/ProjectInvestors';
import ProjectCapital from './pages/projects/ProjectCapital';
import FlipAnalysis from './pages/projects/FlipAnalysis';

const INVESTOR_HUB_ENABLED = import.meta.env.VITE_INVESTOR_HUB_ENABLED === 'true';

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

const ADMIN_ROLES = new Set(['admin', 'office_agent']);
const FIELD_ROLES = new Set(['admin', 'field_agent']);

function isPublicRoute(pathname) {
  return PUBLIC_ROUTE_PREFIXES.some(path => pathname === path || (path !== '/' && pathname.startsWith(path)));
}

function getLocalSession() {
  const role = getUserRole();
  const localAuth = sessionStorage.getItem('local_auth') === 'true';
  const userId = sessionStorage.getItem('local_user_id');

  return {
    isValid: localAuth && Boolean(userId) && Boolean(role),
    role,
  };
}

function canAccessRoute({ access, isAuthenticated, localSession }) {
  if (isAuthenticated) {
    if (access === 'field') return localSession.role ? FIELD_ROLES.has(localSession.role) : true;
    if (access === 'admin') return !localSession.role || ADMIN_ROLES.has(localSession.role);
    return true;
  }

  if (!localSession.isValid) return false;
  if (access === 'field') return FIELD_ROLES.has(localSession.role);
  if (access === 'admin') return ADMIN_ROLES.has(localSession.role);
  return true;
}

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
  </div>
);

// --- AUTH BYPASS (temporary) ---
// Original ProtectedRoute preserved below for re-enabling.
const ProtectedRoute = ({ children /*, access = 'any' */ }) => {
  // Always allow access — auth disabled temporarily
  return children;
};
/* ORIGINAL ProtectedRoute:
const ProtectedRoute_Original = ({ children, access = 'any' }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  if (isLoadingAuth) return <LoadingScreen />;
  const localSession = getLocalSession();
  if (!canAccessRoute({ access, isAuthenticated, localSession })) {
    if (localSession.role === 'field_agent') return <Navigate to="/field" replace />;
    return <Navigate to="/team-access" replace />;
  }
  if (isAuthenticated) sessionStorage.setItem('nexartpro_authenticated', 'true');
  return children;
};
*/

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicHome />} />
    <Route path="/services" element={<Services />} />
    <Route path="/gallery" element={<Gallery />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/partners" element={<Partners />} />
    {/* AUTH BYPASS: redirect team-access and login to dashboard */}
    <Route path="/team-access" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Navigate to="/dashboard" replace />} />
    <Route path="/sign-document" element={<SignDocumentView />} />

    <Route path="/field" element={<ProtectedRoute access="field"><FieldWorkOrders /></ProtectedRoute>} />
    <Route path="/field/work-orders/:id" element={<ProtectedRoute access="field"><FieldWorkOrderDetail /></ProtectedRoute>} />

    <Route element={<ProtectedRoute access="admin"><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/estimates" element={<Estimates />} />
      <Route path="/work-orders" element={<WorkOrders />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/invoice-create" element={<InvoiceCreate />} />
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
      <Route path="/price-book" element={<PriceBook />} />
      <Route path="/profitability" element={<ProfitabilityDashboard />} />
      <Route path="/proposals" element={<Proposals />} />
      <Route path="/sales-pipeline" element={<SalesPipeline />} />
      <Route path="/proposal-editor" element={<ProposalEditor />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/recovery-center" element={<RecoveryCenter />} />
      <Route path="/security-dashboard" element={<SecurityDashboardWithBrain />} />
      <Route path="/nexartsign" element={<NexArtSign />} />
      <Route path="/nexartsign-field-editor" element={<NexArtSignFieldEditor />} />
      <Route path="/agent" element={<NexArtAgent />} />
      {INVESTOR_HUB_ENABLED && (
        <>
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/investors" element={<Investors />} />
          <Route path="/investors/new" element={<InvestorNew />} />
          <Route path="/investors/:id" element={<InvestorDetail />} />
          <Route path="/projects/:id" element={<ProjectDetail />}>
            <Route index           element={<ProjectOverview />} />
            <Route path="financials"   element={<ProjectFinancials />} />
            <Route path="investors"    element={<ProjectInvestors />} />
            <Route path="capital"      element={<ProjectCapital />} />
            <Route path="flip-analysis" element={<FlipAnalysis />} />
          </Route>
        </>
      )}
    </Route>

    <Route path="/client-estimate" element={<ClientEstimateView />} />
    <Route path="/proposal-view" element={<PublicProposalView />} />
    <Route path="/client-portal" element={<ClientPortal />} />
    <Route path="/verify-document" element={<VerifyDocument />} />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

// --- AUTH BYPASS: skip auth checks, go straight to routes ---
const AuthenticatedApp = () => {
  return <AppRoutes />;
};
/* ORIGINAL AuthenticatedApp:
const AuthenticatedApp_Original = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const publicRoute = isPublicRoute(location.pathname);
  if (isLoadingPublicSettings || isLoadingAuth) return <LoadingScreen />;
  if (authError && !publicRoute) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required' && !getLocalSession().isValid) {
      return <Navigate to="/team-access" replace />;
    }
  }
  return <AppRoutes />;
};
*/

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router basename={import.meta.env.BASE_URL}>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App