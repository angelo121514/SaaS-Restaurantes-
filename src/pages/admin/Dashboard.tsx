import React from "react";
import {
  useNavigate,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Store as StoreIcon,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import DashboardHome from "./DashboardHome";
import PendingRequests from "./PendingRequests";
import AllRestaurants from "./AllRestaurants";
import Analytics from "./Analytics";
import Privacy from "./Privacy";
import Security from "./Security";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { supabase } from "../../config/authClient";
import { useAuth } from "../../hooks/useAuth";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const { clearStoredSession } = await import("../../utils/helpers");
    clearStoredSession("admin");
    navigate("/admin/login");
  };

  if (loading || !user) return null;

  const admin = { email: user.email, name: profile?.display_name };

  if (!admin) return null;

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Resumen (Dashboard)" },
    { path: "/admin/requests", icon: FileText, label: "Solicitudes Pendientes" },
    { path: "/admin/restaurants", icon: StoreIcon, label: "Restaurantes Activos" },
    { path: "/admin/analytics", icon: BarChart3, label: "Métricas Globales" },
    { path: "/admin/privacy", icon: ShieldCheck, label: "Privacidad (DPO)" },
    { path: "/admin/security", icon: ShieldAlert, label: "Seguridad" },
  ];

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <CmorFlowLogo size="sm" showText={false} />
              <div>
                <h1 className="text-md font-bold text-text">Consola Admin CMOR FLOW</h1>
                <p className="text-xs text-text-secondary">{admin.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-text-secondary hover:text-error transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-border">
        <div className="container-custom">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-8">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="requests" element={<PendingRequests />} />
          <Route path="restaurants" element={<AllRestaurants />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="security" element={<Security />} />
        </Routes>
      </div>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-border mt-12 text-center text-xs text-text-secondary">
        SaaS de Pedidos QR y Gestión — Potenciado por CMOR FLOW
      </footer>
    </div>
  );
};

export default AdminDashboard;
