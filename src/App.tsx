import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Public pages — loaded eagerly (tiny, on the critical path for first paint)
import LandingPage from "./pages/public/LandingPage";
import RequireRole from "./components/RequireRole";

// Feature-level code splitting: each area below ships in its own chunk,
// so a customer on /menu/:slug no longer downloads the admin panel,
// POS, CRM, AI or auth pages.
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const SetupPassword = lazy(() => import("./pages/public/SetupPassword"));

const RestaurantDashboard = lazy(() => import("./pages/restaurant/Dashboard"));
const AdminLogin = lazy(() => import("./pages/admin/LoginPage"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));

const CustomerMenu = lazy(() => import("./pages/customer/CustomerMenu"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Privacy pages — Ley 19.628 / Ley 21.719
const PublicPrivacy = lazy(() => import("./pages/public/Privacy"));
const PublicPrivacyClients = lazy(() => import("./pages/public/PrivacyClients"));
const PublicContactDpo = lazy(() => import("./pages/public/ContactDpo"));
const PublicTerms = lazy(() => import("./pages/public/Terms"));
const VerifyDsar = lazy(() => import("./pages/public/VerifyDsar"));
import { CookieBanner } from "./components/privacy/CookieBanner";

// Lightweight fallback shown while a lazy route resolves its chunk.
const RouteFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-text-secondary text-sm">Cargando…</span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password" element={<SetupPassword />} />

          {/* Legal / Privacy (publicas) */}
          <Route path="/legal/privacidad" element={<PublicPrivacy />} />
          <Route path="/legal/privacidad-clientes" element={<PublicPrivacyClients />} />
          <Route path="/legal/contacto-dpo" element={<PublicContactDpo />} />
          <Route path="/legal/terminos" element={<PublicTerms />} />

          {/* DSAR verification flow (P0-3) */}
          <Route path="/verify-dsar" element={<VerifyDsar />} />
          <Route path="/verify-dsar/:token" element={<VerifyDsar />} />

          {/* Restaurant Dashboard Routes */}
          <Route
            path="/restaurant/*"
            element={
              <RequireRole role="owner">
                <RestaurantDashboard />
              </RequireRole>
            }
          />

          {/* Admin Panel Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <RequireRole role="admin" redirectTo="/admin/login">
                <AdminDashboard />
              </RequireRole>
            }
          />

          {/* Customer Ordering Route */}
          <Route path="/menu/:slug" element={<CustomerMenu />} />

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
  );
}

export default App;
