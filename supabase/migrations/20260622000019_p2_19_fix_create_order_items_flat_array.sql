-- =====================================================
-- Fase 2 · P1-1 Fix
-- Corregir el formato del campo 'items' en public.orders.
-- La función create_order insertaba una matriz doblemente anidada
-- [[{...}]] debido al uso de jsonb_build_array sobre jsonb[],
-- lo cual causaba errores de renderizado en POS/Cocina.
-- Se cambia v_items_to_insert a jsonb para concatenar de forma plana.
-- Adicionalmente se leen y guardan las propiedades complejas de
-- selected_size y selected_addons para el renderizado del frontend.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_items jsonb,  -- [{ menu_item_id, quantity, selected_size: { id, name, price }, selected_addons: [{ id, name, price }] }]
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_order_type text DEFAULT 'qr',
  p_table_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'qr'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant public.restaurants;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_size record;
  v_addon record;
  v_unit_price numeric;
  v_item_total numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_order_number text;
  v_items_to_insert jsonb := jsonb_build_array();
  v_now timestamptz := now();
BEGIN
  -- 1. Validar restaurante
  SELECT * INTO v_restaurant
  FROM public.restaurants
  WHERE id = p_restaurant_id
    AND is_active = true
    AND status IN ('active', 'trial');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
  END IF;

  -- 2. Validar trial no expirado
  IF v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'trial_expired');
  END IF;

  -- 3. Validar items
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;

  -- 4. Procesar cada item (recuperar precios REALES de la DB)
  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    -- 4a. Buscar menu_item
    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = p_restaurant_id
      AND is_available = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'item_not_available',
        'menu_item_id', v_item->>'menu_item_id'
      );
    END IF;

    -- 4b. Precio base
    v_unit_price := v_menu_item.base_price;

    -- 4c. Si hay tamaño seleccionado, obtener precio del size
    IF v_item ? 'selected_size' AND (v_item->'selected_size'->>'id') IS NOT NULL THEN
      SELECT * INTO v_size
      FROM public.menu_item_sizes
      WHERE id = (v_item->'selected_size'->>'id')::uuid
        AND menu_item_id = v_menu_item.id;

      IF FOUND THEN
        v_unit_price := v_size.price;
      END IF;
    END IF;

    -- 4d. Sumar addons
    IF v_item ? 'selected_addons' AND jsonb_array_length(v_item->'selected_addons') > 0 THEN
      FOR v_addon IN
        SELECT * FROM public.menu_item_addons
        WHERE id = ANY (
          SELECT (addon->>'id')::uuid FROM jsonb_array_elements(v_item->'selected_addons') AS addon
        )
        AND menu_item_id = v_menu_item.id
      LOOP
        v_unit_price := v_unit_price + v_addon.price;
      END LOOP;
    END IF;

    -- 4e. Calcular total del item
    v_item_total := v_unit_price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_item_total;

    -- 4f. Guardar item para insert posterior en formato plano
    v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'quantity', (v_item->>'quantity')::int,
      'unit_price', v_unit_price,
      'item_total', v_item_total,
      'selected_size', v_item->'selected_size',
      'selected_addons', v_item->'selected_addons'
    ));
  END LOOP;

  -- 5. Calcular tax y total con la tasa estándar de 19% (IVA)
  v_tax := v_subtotal * 0.19;
  v_total := v_subtotal + v_tax;

  -- 6. Generar order_number atómico (P1-8)
  v_order_number := public.generate_order_number_atomic();

  -- 7. Insertar pedido con las columnas corregidas y array de items plano
  INSERT INTO public.orders (
    restaurant_id,
    order_number,
    customer_name,
    customer_phone,
    order_type,
    table_number,
    customer_notes,
    subtotal,
    tax,
    total,
    payment_method,
    payment_status,
    status,
    items,
    access_token,
    created_at
  ) VALUES (
    p_restaurant_id,
    v_order_number,
    p_customer_name,
    p_customer_phone,
    p_order_type,
    p_table_number,
    p_notes,
    v_subtotal,
    v_tax,
    v_total,
    p_payment_method,
    'pending',
    'pending',
    v_items_to_insert,
    v_access_token,
    v_now
  )
  RETURNING id INTO v_order_id;

  -- 8. Retornar pedido creado
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total,
    'item_count', jsonb_array_length(p_items)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;

-- Recrear la política RLS para que los administradores puedan gestionar sus pedidos
DROP POLICY IF EXISTS "Restaurant owners and admins can manage orders" ON public.orders;
CREATE POLICY "Restaurant owners and admins can manage orders" ON public.orders
  FOR ALL TO public
  USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

COMMIT;

