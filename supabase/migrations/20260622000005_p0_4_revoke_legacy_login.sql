-- =====================================================
-- Fase 1 · P0-4
-- REVOKE EXECUTE en admin_login y restaurant_login (legacy SHA-256).
--
-- ⚠️  PRE-REQUISITO: La migración M-1 (passwords → Supabase Auth)
--     debe estar al 95%+ completada antes de ejecutar este script.
--     Verificar con:
--       SELECT count(*) FILTER (WHERE migrated_at IS NULL) AS pending,
--              count(*) AS total
--       FROM admin_users;
--     Si pending > 5% del total, NO ejecutar — esperar o contactar manualmente.
--
-- Esta migración es independiente de la P0-1 porque requiere M-1.
-- Las funciones se mantienen definidas (no DROP) por si se necesita rollback.
-- =====================================================

BEGIN;

-- Verificación de safety: abortar si hay más de 5% sin migrar
DO $$
DECLARE
  v_total int;
  v_pending int;
  v_pct numeric;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE migrated_at IS NULL)
    INTO v_total, v_pending
    FROM public.admin_users;

  IF v_total = 0 THEN
    RAISE NOTICE 'admin_users vacía — procediendo con REVOKE (sin riesgo)';
  ELSE
    v_pct := (v_pending::numeric / v_total::numeric) * 100;
    IF v_pct > 5 THEN
      RAISE EXCEPTION 'ABORT: %.1%% de admin_users sin migrar (% de %). Migrar al menos al 95%% antes de ejecutar',
        v_pct, v_pending, v_total;
    END IF;
  END IF;
END $$;

-- Revocar acceso público a las RPC legacy
REVOKE EXECUTE ON FUNCTION public.admin_login(text, text)     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restaurant_login(text, text) FROM anon, authenticated;

-- Marcar como deprecated (la tabla se mantiene 90 días antes de DROP)
UPDATE public.admin_users
SET deprecated_at = now()
WHERE deprecated_at IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback (solo si usuarios pierden acceso):
-- ─────────────────────────────────────────────────────
-- BEGIN;
--   GRANT EXECUTE ON FUNCTION public.admin_login(text, text)     TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.restaurant_login(text, text) TO anon, authenticated;
--   UPDATE public.admin_users SET deprecated_at = NULL;
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
