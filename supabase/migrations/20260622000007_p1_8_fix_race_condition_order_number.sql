-- =====================================================
-- Fase 2 · P1-8
-- Fix race condition en generate_order_number().
-- Reemplaza COUNT(*)+1 (no atómico) por SEQUENCE.
-- =====================================================

BEGIN;

-- 1. Crear secuencia global de pedidos
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  START WITH 1000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 2. Setear valor inicial al máximo actual + 1
DO $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX(substring(order_number from '\d+')::integer), 999) INTO v_max FROM public.orders;
  PERFORM setval('public.order_number_seq', GREATEST(v_max, 999));
  RAISE NOTICE 'order_number_seq set to %', GREATEST(v_max, 999);
END $$;

-- 3. Crear nueva función atómica
CREATE OR REPLACE FUNCTION public.generate_order_number_atomic()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
BEGIN
  v_next := nextval('public.order_number_seq');
  RETURN 'ORD-' || LPAD(v_next::text, 8, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_number_atomic() TO anon, authenticated;

-- 4. Trigger para asignar order_number automáticamente si viene NULL
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number_atomic();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────
-- BEGIN;
--   DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
--   DROP FUNCTION IF EXISTS public.set_order_number();
--   DROP FUNCTION IF EXISTS public.generate_order_number_atomic();
--   DROP SEQUENCE IF EXISTS public.order_number_seq;
-- COMMIT;
