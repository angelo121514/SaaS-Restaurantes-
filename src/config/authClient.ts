import { supabase } from "./supabase";
import type { Restaurant } from "./supabase";

// --------------------------------------------------------------------
// Tipos de la capa de identidad
// --------------------------------------------------------------------
export type UserRole = "owner" | "staff" | "admin";

/** Fila de public.profiles (se crea automáticamente al registrarse). */
export interface Profile {
  id: string;
  restaurant_id: string | null;
  role: UserRole;
  display_name: string | null;
  created_at: string;
}

/**
 * Sesión ya resuelta: identidad (auth.users) + perfil + restaurante.
 * `restaurant` y `profile` pueden ser null mientras cargan.
 */
export interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  loading: boolean;
}

// --------------------------------------------------------------------
// `supabase` ya está cableado (real o mock) en ./supabase.
// Lo reexportamos aquí para que todos los consumidores importen desde un
// único punto (`authClient`) una vez completada la migración.
//
// NOTA DE SEGURIDAD: nunca instancies un segundo cliente con la SERVICE
// ROLE KEY en el navegador. Esa clave vive solo en el servidor (Edge
// Functions). Si necesitas operaciones de admin, hazlas server-side.
// --------------------------------------------------------------------
export { supabase };
