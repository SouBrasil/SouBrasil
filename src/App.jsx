import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Landing from '@/pages/Landing';
import Home from '@/pages/Home';
import MapPage from '@/pages/Map';
import Partners from '@/pages/Partners';
import PartnerDetail from '@/pages/PartnerDetail';
import Pricing from '@/pages/Pricing';
import Profile from '@/pages/Profile';
import ReferralHub from '@/pages/ReferralHub';
import OnboardingRegister from '@/pages/OnboardingRegister';
import BecomePartner from '@/pages/BecomePartner';
import Raffles from '@/pages/Raffles';
import AdminDashboard from '@/pages/AdminDashboard';
import PartnerPortal from '@/pages/PartnerPortal';
import AdminLogin from '@/pages/AdminLogin';
import AdminPanel from '@/pages/AdminPanel';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Landing" replace />} />
      <Route path="/Landing" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/Home" element={<Home />} />
        <Route path="/Map" element={<MapPage />} />
        <Route path="/Partners" element={<Partners />} />
        <Route path="/PartnerDetail" element={<PartnerDetail />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Pricing" element={<Pricing />} />
        <Route path="/ReferralHub" element={<ReferralHub />} />
        <Route path="/BecomePartner" element={<BecomePartner />} />
        <Route path="/Raffles" element={<Raffles />} />
      </Route>
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/PartnerPortal" element={<PartnerPortal />} />
      <Route path="/AdminLogin" element={<AdminLogin />} />
      <Route path="/AdminPanel" element={<AdminPanel />} />
      <Route path="/OnboardingRegister" element={<OnboardingRegister />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App