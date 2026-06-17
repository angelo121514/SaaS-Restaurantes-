import { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/authClient";
import type { AuthState, Profile, UserRole } from "../config/authClient";
import type { Restaurant } from "../config/supabase";

/**
 * Hook central de autenticación.
 *
 * Sustituye a la lectura directa de `localStorage("user"|"admin")`. La
 * fuente de verdad es la sesión JWT de Supabase; al cambiar, se resuelve
 * el `profile` (rol, restaurant_id) y, si aplica, la fila de `restaurants`.
 *
 * En modo mock (MockSupabaseClient), `onAuthStateChange` no existe y la
 * sesión se gestiona a través del blob legado "user"/"admin" + los helpers
 * `getStoredUser/getStoredAdmin`. Mantenemos compatibilidad para no romper
 * el desarrollo local sin backend hasta la Fase 4.
 */

const initialState: AuthState = {
  user: null,
  profile: null,
  restaurant: null,
  loading: true,
};

// Detecta si el cliente expone auth real (Supabase) o es el mock.
// El MockSupabaseClient define `getSession`/`signInWithOAuth`/`signOut`
// pero NO `onAuthStateChange`, así que su existencia distingue ambos modos.
const hasRealAuth =
  typeof (supabase as any).auth?.onAuthStateChange === "function";

export function useAuth(): AuthState & {
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>(initialState);

  // Resuelve profile + restaurante a partir de un userId.
  const resolveProfile = useCallback(
    async (userId: string, email: string) => {
      // Profile por RLS (el propio usuario puede leer el suyo).
      const { data: profile } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()) as { data: Profile | null };

      let restaurant: Restaurant | null = null;
      if (profile?.restaurant_id) {
        const { data: rest } = (await supabase
          .from("restaurants")
          .select("*")
          .eq("id", profile.restaurant_id)
          .single()) as { data: Restaurant | null };
        restaurant = rest;
      }

      setState({
        user: { id: userId, email },
        profile,
        restaurant,
        loading: false,
      });
    },
    []
  );

  const refresh = useCallback(async () => {
    if (hasRealAuth) {
      const { data } = await (supabase as any).auth.getSession();
      const session = data?.session;
      if (session?.user?.id && session.user.email) {
        await resolveProfile(session.user.id, session.user.email);
      } else {
        setState({ ...initialState, loading: false });
      }
    } else {
      // Modo mock: leer el blob legado.
      const { getStoredUser } = await import("../utils/helpers");
      const u = getStoredUser();
      if (u?.id && u.email) {
        // En mock, el "profile" se sintetiza del blob legado.
        const profile: Profile = {
          id: u.id,
          restaurant_id: u.restaurant_id ?? null,
          role: (u.role as UserRole) ?? "owner",
          display_name: null,
          created_at: new Date().toISOString(),
        };
        let restaurant: Restaurant | null = null;
        if (u.restaurant) {
          restaurant = {
            id: u.restaurant_id,
            name: u.restaurant.name,
            slug: u.restaurant.slug,
            is_active: u.restaurant.is_active,
            // campos mínimos para que compile; el resto se rellena en dashboards
          } as Restaurant;
        }
        setState({
          user: { id: u.id, email: u.email },
          profile,
          restaurant,
          loading: false,
        });
      } else {
        setState({ ...initialState, loading: false });
      }
    }
  }, [resolveProfile]);

  useEffect(() => {
    refresh();

    if (hasRealAuth) {
      const { data } = (supabase as any).auth.onAuthStateChange(
        (_event: string, session: any) => {
          if (session?.user?.id && session.user.email) {
            resolveProfile(session.user.id, session.user.email);
          } else {
            setState({ ...initialState, loading: false });
          }
        }
      );
      return () => data?.subscription?.unsubscribe?.();
    }

    // En mock, escuchamos el storage para reaccionar a login/logout manuales.
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh, resolveProfile]);

  return { ...state, refresh };
}

/** Convenience: el restaurant_id del owner actual (o null). */
export function useRestaurantId(): string | null {
  const { profile } = useAuth();
  return profile?.restaurant_id ?? null;
}
