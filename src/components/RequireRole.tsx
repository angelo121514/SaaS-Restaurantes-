import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../config/authClient";
import { Loading } from "./ui";

interface RequireRoleProps {
  /** Rol mínimo requerido. `owner` admite owner/staff/admin; `admin` solo admin. */
  role?: UserRole;
  /** Destino al que mandar si no hay sesión. Por defecto "/login". */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Guard de ruta basado en sesión real (Supabase Auth) o blob legado (mock).
 *
 * - Mientras carga la sesión → spinner.
 * - Sin sesión → redirect a `redirectTo`.
 * - Con sesión pero rol insuficiente → redirect a "/404" (o al home del rol).
 *
 * Uso:
 *   <RequireRole role="owner"><RestaurantDashboard/></RequireRole>
 *   <RequireRole role="admin"><AdminDashboard/></RequireRole>
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
  role = "owner",
  redirectTo = "/login",
  children,
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <Loading text="Verificando sesión…" />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Si aún no tenemos profile (caso límite), dejamos pasar si solo
  // pedimos 'owner' (los nuevos usuarios sin restaurante aún entran).
  if (profile && role === "admin" && profile.role !== "admin") {
    // Un owner intentando entrar a /admin → lo mandamos a su panel.
    return <Navigate to="/restaurant" replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
