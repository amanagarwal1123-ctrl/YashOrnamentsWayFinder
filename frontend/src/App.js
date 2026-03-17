import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/lib/context';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import LandingPage from '@/pages/LandingPage';
import ScanLandingPage from '@/pages/ScanLandingPage';
import NavigationHub from '@/pages/NavigationHub';
import RouteSelectionPage from '@/pages/RouteSelectionPage';
import CheckpointNavPage from '@/pages/CheckpointNavPage';
import RecoveryPage from '@/pages/RecoveryPage';
import TreasureMapPage from '@/pages/TreasureMapPage';
import SchematicMapPage from '@/pages/SchematicMapPage';
import WhereAmIPage from '@/pages/WhereAmIPage';
import HelpPage from '@/pages/HelpPage';
import ArrivalPage from '@/pages/ArrivalPage';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminRoutes from '@/pages/AdminRoutes';
import AdminSessions from '@/pages/AdminSessions';
import AdminUsers from '@/pages/AdminUsers';
import AdminGoldRates from '@/pages/AdminGoldRates';
import AdminAnalytics from '@/pages/AdminAnalytics';
import AdminQRGeneration from '@/pages/AdminQRGeneration';
import AdminBrandingSettings from '@/pages/AdminBrandingSettings';
import AdminMediaManagement from '@/pages/AdminMediaManagement';
import AdminManualsPage from '@/pages/AdminManualsPage';
import AdminReports from '@/pages/AdminReports';
import HelpdeskDashboard from '@/pages/HelpdeskDashboard';
import GoldRatePage from '@/pages/GoldRatePage';
import GalleryPage from '@/pages/GalleryPage';
import HelpGuidePage from '@/pages/HelpGuidePage';
import HelpdeskManualPage from '@/pages/HelpdeskManualPage';
import TrainerManualPage from '@/pages/TrainerManualPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/start" element={<LandingPage />} />
          <Route path="/start/:qrCode" element={<LandingPage />} />
          <Route path="/scan/:qrCode" element={<ScanLandingPage />} />
          <Route path="/hub" element={<NavigationHub />} />
          <Route path="/routes" element={<RouteSelectionPage />} />
          <Route path="/navigate" element={<CheckpointNavPage />} />
          <Route path="/recovery" element={<RecoveryPage />} />
          <Route path="/map" element={<TreasureMapPage />} />
          <Route path="/schematic" element={<SchematicMapPage />} />
          <Route path="/where-am-i" element={<WhereAmIPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/arrived" element={<ArrivalPage />} />
          <Route path="/gold-rates" element={<GoldRatePage />} />
          <Route path="/gallery" element={<GalleryPage />} />

          {/* Public Help Guide */}
          <Route path="/help-guide" element={<HelpGuidePage />} />

          {/* Staff Login */}
          <Route path="/staff" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/staff" replace />} />

          {/* Role-specific Manuals */}
          <Route path="/manual/helpdesk" element={<HelpdeskManualPage />} />
          <Route path="/manual/trainer" element={<TrainerManualPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/routes" element={<AdminRoutes />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/gold-rates" element={<AdminGoldRates />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/qr-codes" element={<AdminQRGeneration />} />
          <Route path="/admin/branding" element={<AdminBrandingSettings />} />
          <Route path="/admin/media" element={<AdminMediaManagement />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/manuals" element={<AdminManualsPage />} />

          {/* Helpdesk Routes */}
          <Route path="/helpdesk" element={<HelpdeskDashboard />} />

          {/* Legacy redirects */}
          <Route path="/tutorial" element={<Navigate to="/help-guide" replace />} />
          <Route path="/admin/tutorial-pdf" element={<Navigate to="/admin/manuals" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AppProvider>
  );
}

export default App;
