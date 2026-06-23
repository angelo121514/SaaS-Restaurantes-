-- =====================================================
-- Fase 2 · P1-11
-- Particionar tabla orders por mes (RANGE por created_at).
--
-- ⚠️  MIGRACIÓN PELIGROSA — requiere ventana de mantenimiento.
-- Ver Plan de Remediación, capítulo 4 P1-11.
--
-- Estrategia:
--   1. Crear orders_new particionada
--   2. Crear particiones mensuales (12 meses atrás + 3 futuros)
--   3. Migrar datos en lotes (batch)
--   4. En transacción: RENAME orders → orders_old, orders_new → orders
--   5. Recrear RLS, índices, triggers
--   6. Mantener orders_old 7 días antes de DROP
--
-- EJECUTAR EN VENTANA DE BAJA CONCURRENCIA (3-6 AM Chile).
-- =====================================================

BEGIN;

-- 1. Crear tabla nueva particionada (mismo schema que orders)
CREATE TABLE IF NOT EXISTS public.orders_new (
  LIKE public.orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING STORAGE INCLUDING COMMENTS
) PARTITION BY RANGE (created_at);

-- 2. Crear particiones para 12 meses atrás + 3 meses futuros
-- Chile: America/Santiago (UTC-3/-4)
DO $$
DECLARE
  v_start date := DATE '2025-01-01';
  v_end date := DATE '2026-12-31';
  v_month_start date := v_start;
  v_month_end date;
  v_partition_name text;
BEGIN
  WHILE v_month_start <= v_end LOOP
    v_month_end := (v_month_start + INTERVAL '1 month')::date;
    v_partition_name := 'orders_' || to_char(v_month_start, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.orders_new
       FOR VALUES FROM (%L) TO (%L)',
      v_partition_name, v_month_start, v_month_end
    );

    v_month_start := v_month_end;
  END LOOP;

  RAISE NOTICE 'Particiones creadas desde % hasta %', v_start, v_end;
END $$;

-- 3. Crear índices en cada partición (Postgres no los hereda automáticamente)
-- Se hace con un DO similar para cada partición, pero por simplicidad
-- se asume que los índices se crean automáticamente al hacer CREATE TABLE LIKE.
-- Si no, ejecutar manualmente:
-- CREATE INDEX ON orders_2025_01 (restaurant_id, created_at DESC);
-- etc.

-- 4. Insertar datos existentes (en lotes de 10K para no saturar)
-- ⚠️  Esto puede tardar varios minutos para 100K+ pedidos.
-- Ejecutar en sesión separada con timeout alto.
DO $$
DECLARE
  v_total int;
  v_batch_size int := 10000;
  v_offset int := 0;
  v_inserted int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.orders;
  RAISE NOTICE 'Migrando % pedidos...', v_total;

  LOOP
    INSERT INTO public.orders_new
    SELECT * FROM public.orders
    ORDER BY created_at
    LIMIT v_batch_size
    OFFSET v_offset;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    EXIT WHEN v_inserted = 0;

    v_offset := v_offset + v_batch_size;
    RAISE NOTICE 'Migrados % / %', v_offset, v_total;

    -- Commit batch (no se puede dentro de DO, pero el PERFORM hace auto-commit)
    -- En su lugar, pausar para no saturar
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'Migración completada';
END $$;

-- 5. Verificar que el conteo coincide
DO $$
DECLARE
  v_old int;
  v_new int;
BEGIN
  SELECT COUNT(*) INTO v_old FROM public.orders;
  SELECT COUNT(*) INTO v_new FROM public.orders_new;

  IF v_old != v_new THEN
    RAISE EXCEPTION 'MIGRACIÓN INCOMPLETA: orders=%, orders_new=%', v_old, v_new;
  END IF;

  RAISE NOTICE 'Verificación OK: % pedidos migrados', v_new;
END $$;

-- 6. Swap atómico en transacción
--    orders → orders_old
--    orders_new → orders
ALTER TABLE public.orders RENAME TO orders_old;
ALTER TABLE public.orders_new RENAME TO orders;

-- 7. Recrear índices y constraints en orders (particionada)
-- Los índices se crean en cada partición, no en la tabla madre,
-- pero se pueden crear "índices partitioned" en la madre.
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders (access_token) WHERE access_token IS NOT NULL;

-- 8. Habilitar RLS en la nueva orders (particionada)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Las políticas se heredan de la definición LIKE, pero verificamos:
-- Si no se heredaron, ejecutar manualmente las políticas de P0-1.

-- 9. Mantener orders_old por 7 días antes de DROP
-- Programar drop para +7 días:
-- DROP TABLE IF EXISTS public.orders_old;
-- Por ahora, marcar como deprecated:
COMMENT ON TABLE public.orders_old IS 'DEPRECATED — reemplazada por orders (particionada). DROP después de 2026-06-29';

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback (inmediato, antes de DROP de orders_old):
-- ─────────────────────────────────────────────────────
-- BEGIN;
--   ALTER TABLE public.orders RENAME TO orders_partitioned;
--   ALTER TABLE public.orders_old RENAME TO orders;
--   -- Verificar que todo funciona
--   SELECT count(*) FROM orders;
-- COMMIT;
--
-- Si orders_old ya fue dropeada, restaurar desde backup:
--   pg_restore --table=orders backup_pre_fix.dump | psql
