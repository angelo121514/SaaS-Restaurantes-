-- =====================================================
-- Fase 1 · P0-3 (parte a)
-- Tabla feature_flags + función is_flag_enabled
-- Requerida para togglear todos los fixes P0/P1 sin redeploy.
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  description text NOT NULL,
  enabled_globally boolean NOT NULL DEFAULT false,
  enabled_for_restaurants uuid[] NOT NULL DEFAULT '{}',
  disabled_for_restaurants uuid[] NOT NULL DEFAULT '{}',
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer flags (necesario para que el cliente sepa qué hacer)
DROP POLICY IF EXISTS "Anyone can read flags" ON public.feature_flags;
CREATE POLICY "Anyone can read flags" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);

-- Solo admin puede escribir
DROP POLICY IF EXISTS "Only admin can write flags" ON public.feature_flags;
CREATE POLICY "Only admin can write flags" ON public.feature_flags
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Helper: ¿está activo el flag para este restaurante?
CREATE OR REPLACE FUNCTION public.is_flag_enabled(
  p_key text,
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag feature_flags;
  v_hash int;
BEGIN
  SELECT * INTO v_flag FROM public.feature_flags WHERE key = p_key;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Si está globalmente desactivado, solo restaurants en whitelist
  IF NOT v_flag.enabled_globally THEN
    IF p_restaurant_id IS NULL THEN
      RETURN false;
    END IF;
    RETURN p_restaurant_id = ANY(v_flag.enabled_for_restaurants);
  END IF;

  -- Si está en blacklist, desactivado
  IF p_restaurant_id IS NOT NULL AND p_restaurant_id = ANY(v_flag.disabled_for_restaurants) THEN
    RETURN false;
  END IF;

  -- Si rollout es 100%, activo para todos
  IF v_flag.rollout_percentage >= 100 THEN
    RETURN true;
  END IF;

  -- Si rollout es 0% pero enabled_globally=true, también activo
  -- (para permitir activación manual sin rollout percentage)
  IF v_flag.rollout_percentage = 0 THEN
    RETURN true;
  END IF;

  -- Hash determinista del restaurant_id para rollout%
  IF p_restaurant_id IS NULL THEN
    RETURN true;
  END IF;

  v_hash := abs(hashtext(p_restaurant_id::text));
  RETURN (v_hash % 100) < v_flag.rollout_percentage;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────
-- Flags iniciales para Fase 1
-- Todos DESACTIVADOS por defecto — activar manualmente
-- tras aplicar migraciones y validar en staging.
-- ─────────────────────────────────────────────────────
INSERT INTO public.feature_flags (key, description, enabled_globally, rollout_percentage) VALUES
  ('use_order_token',              'P0-1: Usar access_token en vez de política pública para ver pedido', false, 0),
  ('new_registration_flow',        'P0-2: Nuevo flujo de registro con webhook de pago', false, 0),
  ('dsar_verification',            'P0-3: DSAR con verificación por email', false, 0),
  ('require_supabase_auth',        'P0-4: Bloquear login legacy (SHA-256)', false, 0),
  ('storage_only_images',          'P0-8: Imágenes solo en Storage (no base64)', false, 0),
  ('strict_input_validation',      'P1-x: Validación estricta de inputs server-side', false, 0)
ON CONFLICT (key) DO NOTHING;

COMMIT;
