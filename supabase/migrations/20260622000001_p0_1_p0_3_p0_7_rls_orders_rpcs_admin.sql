-- =====================================================
-- Fase 1 · P0-1 + P0-3 + P0-7
-- Elimina RLS pública de orders, revoca RPCs admin heredadas,
-- añade access_token a orders, crea RPC get_my_order, corrige
-- sintaxis CREATE POLICY IF EXISTS inválida.
-- =====================================================
-- Author: Plan de Remediación Segura CMOR FLOW
-- Date:   2026-06-22
-- Prereq: M-3 (backfill access_token) — incluido abajo

BEGIN;

-- ─────────────────────────────────────────────────────
-- P0-7: Corregir SQL inválido en 00_APLICAR_TODO_SUPABASE.sql:289
-- PostgreSQL no soporta CREATE POLICY IF EXISTS
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests;
CREATE POLICY dsr_insert_any ON public.data_subject_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────
-- P0-1 (parte 1/3): Añadir access_token a orders (backfill)
-- Prerrequisito para poder eliminar la política pública SELECT
-- ─────────────────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS access_token uuid;

-- Backfill de orders existentes
UPDATE public.orders
SET access_token = gen_random_uuid()
WHERE access_token IS NULL;

-- Hacer NOT NULL con default
ALTER TABLE public.orders ALTER COLUMN access_token SET DEFAULT gen_random_uuid();
ALTER TABLE public.orders ALTER COLUMN access_token SET NOT NULL;

-- Índice para lookup por token (parcial: solo pedidos < 24h)
CREATE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders(access_token)
  WHERE access_token IS NOT NULL;

-- ─────────────────────────────────────────────────────
-- P0-1 (parte 2/3): RPC get_my_order(p_token)
-- Permite al cliente ver SU pedido sin política RLS pública
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_order(p_token uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT o.* INTO v_order
  FROM public.orders o
  WHERE o.access_token = p_token
    AND o.created_at > now() - interval '24 hours';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o expirado' USING ERRCODE = 'P0002';
  END IF;

  -- Invalidar token tras uso (one-shot)
  UPDATE public.orders SET access_token = NULL WHERE id = v_order.id;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────
-- P0-1 (parte 3/3): Eliminar política pública SELECT de orders
-- ⚠️  IMPORTANTE: solo ejecutar tras activar feature flag
--     `use_order_token` al 100% en producción y verificar
--     que el frontend usa get_my_order en vez de SELECT directo.
--     En staging se puede ejecutar directamente.
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;

-- ─────────────────────────────────────────────────────
-- P0-3 (parte b): REVOKE EXECUTE en 4 RPCs admin heredadas
-- Las funciones se mantienen (no DROP) por si se necesita rollback,
-- pero se vuelven inaccesibles desde la API pública.
-- ─────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.admin_login(text, text)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_restaurant()          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_restaurant_status(uuid, boolean, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reject_request(uuid, text)   FROM anon, authenticated;

-- restaurant_login se mantiene accesible temporalmente (M-1 en curso)
-- hasta que el 100% de owners haya migrado a Supabase Auth.
-- Entonces ejecutar la migración p0-4-revoke-legacy-login.sql

-- Forzar recarga del caché de esquema en PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback (ejecutar SOLO si se necesita revertir):
-- ─────────────────────────────────────────────────────
-- BEGIN;
--   -- Re-crear política pública (vuelve a ser vulnerable)
--   CREATE POLICY "Public can view orders" ON public.orders
--     FOR SELECT TO anon USING (true);
--
--   -- Re-grant EXECUTE en RPCs admin
--   GRANT EXECUTE ON FUNCTION public.admin_login(text, text)            TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.admin_create_restaurant()          TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.admin_toggle_restaurant_status(uuid, boolean, text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.admin_reject_request(uuid, text)   TO anon, authenticated;
--
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
