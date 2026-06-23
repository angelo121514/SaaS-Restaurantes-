-- =====================================================
-- Fase 2 · P1-2
-- Tabla rate_limits para limitar intentos de login y DSAR.
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,  -- IP o email
  identifier_type text NOT NULL CHECK (identifier_type IN ('ip', 'email')),
  endpoint text NOT NULL,    -- 'login', 'dsar', 'register', etc.
  count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup rápido
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (identifier, endpoint, window_start);

-- RLS: anon puede INSERT (para registrar intentos), solo service_role puede SELECT/UPDATE
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can insert rate_limits" ON public.rate_limits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Función helper para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_identifier_type text,
  p_endpoint text,
  p_max_attempts int DEFAULT 5,
  p_window_minutes int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_window_start timestamptz := now() - (p_window_minutes || ' minutes')::interval;
BEGIN
  -- Limpiar entradas viejas (mejor con pg_cron, pero esto funciona)
  DELETE FROM public.rate_limits
  WHERE window_start < v_window_start
    AND endpoint = p_endpoint;

  -- Contar intentos en la ventana
  SELECT count(*) INTO v_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  -- Si supera el límite, denegar
  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  -- Registrar intento
  INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, window_start)
  VALUES (p_identifier, p_identifier_type, p_endpoint, now());

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, int, int) TO anon, authenticated;

COMMIT;
