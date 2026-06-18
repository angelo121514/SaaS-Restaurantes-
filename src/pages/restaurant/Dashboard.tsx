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
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
  Users,
  BrainCircuit,
  Calculator,
} from "lucide-react";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";
import Crm from "./Crm";
import AiRecommendations from "./AiRecommendations";
import Pos from "./Pos";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { supabase } from "../../config/authClient";
import { useAuth } from "../../hooks/useAuth";

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, restaurant, loading } = useAuth();

  const getTrialDaysLeft = (endsAt?: string) => {
    if (!endsAt) return 0;
    const diff = new Date(endsAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // El modo mock no expone signOut real: limpiamos el blob legado también.
    const { clearStoredSession } = await import("../../utils/helpers");
    clearStoredSession("user");
    navigate("/login");
  };

  // Mientras se resuelve la sesión mostramos nada (RequireRole ya muestra
  // spinner a nivel ruta); si no hay sesión, RequireRole redirige.
  if (loading || !user) return null;

  // Base navigation
  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "Resumen" },
    { path: "/restaurant/pos", icon: Calculator, label: "Caja POS" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "Pedidos" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "Menú/Carta" },
    { path: "/restaurant/reports", icon: FileText, label: "Reportes" },
  ];

  // If Pro plan, add CRM and AI Recommendations
  const isPro = restaurant?.subscription_plan === "pro";
  if (isPro) {
    navItems.push(
      { path: "/restaurant/crm", icon: Users, label: "CRM Clientes" },
      { path: "/restaurant/ai", icon: BrainCircuit, label: "IA Recomendaciones" }
    );
  }

  // Settings is always last
  navItems.push({ path: "/restaurant/settings", icon: Settings, label: "Configuración" });

  return (
    <div className="min-h-screen bg-bg-subtle transition-colors duration-200">
      {/* Top Navigation */}
      <nav className="bg-bg border-b border-border sticky top-0 z-40 transition-colors duration-200">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <CmorFlowLogo size="sm" showText={false} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-md font-extrabold text-text">
                    {restaurant?.name || "Restaurante"}
                  </h1>
                  {restaurant && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      restaurant.subscription_plan === "free_trial"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : restaurant.subscription_plan === "pro"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-bg-subtle text-text-secondary border-border"
                    }`}>
                      {restaurant.subscription_plan === "free_trial"
                        ? `Prueba (${getTrialDaysLeft(restaurant.trial_ends_at)} días)`
                        : restaurant.subscription_plan === "starter"
                        ? "Starter"
                        : restaurant.subscription_plan === "pro"
                        ? "Pro"
                        : restaurant.subscription_plan === "enterprise"
                        ? "Enterprise"
                        : restaurant.subscription_plan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-text-secondary hover:text-error transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-bg border-b border-border transition-colors duration-200">
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
          <Route index element={<RestaurantHome />} />
          <Route path="pos" element={<Pos />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="crm" element={<Crm />} />
          <Route path="ai" element={<AiRecommendations />} />
          <Route path="settings" element={<RestaurantSettings />} />
        </Routes>
      </div>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-border mt-12 text-center text-xs text-text-secondary flex flex-col items-center gap-1">
        <span>Software de Pedidos y Gestión para Locales Gastronómicos</span>
        <span className="font-semibold text-text">Potenciado por CMOR FLOW</span>
      </footer>
    </div>
  );
};

export default RestaurantDashboard;
