-- =====================================================================
-- CMOR FLOW — Corrección de Replica Identity para la tabla particionada orders
-- ---------------------------------------------------------------------
-- Al habilitar la tabla particionada 'orders' en Supabase Realtime (réplica lógica),
-- PostgreSQL requiere una identidad de réplica para poder procesar UPDATEs y DELETEs.
-- Este script configura 'REPLICA IDENTITY FULL' tanto en la tabla madre como
-- de forma dinámica en todas sus particiones actuales.
-- =====================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Configurar REPLICA IDENTITY FULL en la tabla madre
  ALTER TABLE public.orders REPLICA IDENTITY FULL;
  
  -- 2. Configurar REPLICA IDENTITY FULL en cada una de las particiones existentes de forma dinámica
  FOR r IN 
    SELECT inhrelid::regclass AS partition_name
    FROM pg_inherits
    WHERE inhparent = 'public.orders'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s REPLICA IDENTITY FULL', r.partition_name);
  END LOOP;
END $$;
