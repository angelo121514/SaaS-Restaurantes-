-- =====================================================
-- Fase 2 · P1-1 + P0-1
-- Habilitar flags 'use_rpc_create_order' y 'use_order_token'
-- para evitar violaciones RLS en inserts y selects directos de orders.
-- =====================================================

BEGIN;

-- Insertar o actualizar flag para la RPC de creación de pedidos
INSERT INTO public.feature_flags (key, description, enabled_globally, rollout_percentage)
VALUES (
  'use_rpc_create_order',
  'P1-1: Usar la RPC create_order server-side para evitar manipulación de precios e inserciones RLS fallidas',
  true,
  100
)
ON CONFLICT (key) DO UPDATE
SET enabled_globally = true, rollout_percentage = 100;

-- Asegurar que el flag use_order_token esté activo al 100%
INSERT INTO public.feature_flags (key, description, enabled_globally, rollout_percentage)
VALUES (
  'use_order_token',
  'P0-1: Usar access_token en vez de política pública para ver pedido',
  true,
  100
)
ON CONFLICT (key) DO UPDATE
SET enabled_globally = true, rollout_percentage = 100;

-- Por seguridad, re-confirmar los permisos de la RPC
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;

COMMIT;
