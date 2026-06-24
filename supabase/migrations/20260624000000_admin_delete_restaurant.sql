-- =====================================================================
-- CMOR FLOW — Corrección de log_admin_action y eliminación de restaurantes
-- ---------------------------------------------------------------------
-- 1. Parche para public.log_admin_action: Corrige el error de tipado
--    "column 'ip' is of type inet but expression is of type text"
--    añadiendo un cast seguro a ::inet.
-- 2. Función segura para eliminar restaurantes en cascada.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. PARCHE DE AUDITORÍA: Redefinir log_admin_action con casting a ::inet
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip inet;
BEGIN
  -- Obtener la IP de las cabeceras de la solicitud y castear de forma segura a inet
  BEGIN
    v_ip := NULLIF(split_part(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ',', 1), '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO public.audit_log (
    actor_id, actor_email, action, table_name, row_id, before_state, after_state, ip
  )
  SELECT
    auth.uid(),
    COALESCE(p.email, ''),
    p_action,
    p_target_type,
    p_target_id,
    p_before,
    p_after,
    v_ip
  FROM (
    SELECT
      (SELECT email FROM auth.users WHERE id = auth.uid()) AS email
  ) p
  WHERE auth.uid() IS NOT NULL;

  -- Si no hay usuario autenticado (webhook con service_role), loguear como 'system'
  IF NOT FOUND THEN
    INSERT INTO public.audit_log (
      actor_email, action, table_name, row_id, before_state, after_state, ip
    ) VALUES (
      'system', p_action, p_target_type, p_target_id, p_before, p_after,
      v_ip
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ELIMINACIÓN DE RESTAURANTE: Función segura en cascada
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_name text;
BEGIN
  -- 1. Verificar que el invocador sea administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores de la plataforma pueden eliminar un restaurante.';
  END IF;

  -- 2. Obtener nombre del restaurante para el log de auditoría
  SELECT name INTO v_restaurant_name FROM public.restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El restaurante no existe.';
  END IF;

  -- 3. Borrar los usuarios de auth.users asociados a este restaurante (dueño y personal)
  --    Esto a su vez borrará automáticamente sus perfiles en public.profiles por ON DELETE CASCADE
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.profiles WHERE restaurant_id = p_restaurant_id
  );

  -- 4. Borrar el restaurante. Las tablas hijas (menu_categories, menu_items, orders, restaurant_customers)
  --    se borrarán automáticamente gracias al ON DELETE CASCADE.
  DELETE FROM public.restaurants WHERE id = p_restaurant_id;

  -- 5. Registrar en el log de auditoría usando el helper oficial del proyecto (parcheado arriba)
  PERFORM public.log_admin_action(
    'delete_restaurant',
    'restaurant',
    p_restaurant_id,
    jsonb_build_object('name', v_restaurant_name),
    NULL
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_restaurant(uuid) TO authenticated;
