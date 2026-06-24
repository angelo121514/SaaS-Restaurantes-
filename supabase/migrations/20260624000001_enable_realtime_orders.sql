-- =====================================================================
-- CMOR FLOW — Habilitación de tiempo real para la tabla de pedidos
-- ---------------------------------------------------------------------
-- Tras particionar la tabla 'orders' en la Fase 2, la nueva estructura
-- particionada no se vinculó automáticamente a la publicación de
-- tiempo real de Supabase. Este script corrige eso de forma segura.
-- =====================================================================

DO $$
BEGIN
  -- Verificar si la tabla public.orders ya está en la publicación
  -- Si no está, la agregamos para habilitar los eventos websockets
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
