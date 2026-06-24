-- =====================================================================
-- CMOR FLOW — Función segura para eliminar restaurantes en cascada
-- ---------------------------------------------------------------------
-- Esta función elimina un restaurante, todas sus tablas asociadas con
-- ON DELETE CASCADE, y también limpia la tabla auth.users para sus
-- propietarios y personal mediante SECURITY DEFINER.
-- =====================================================================

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

  -- 5. Registrar en el log de auditoría usando el helper oficial del proyecto
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
