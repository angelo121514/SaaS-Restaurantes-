-- =====================================================================
-- database/setup_v6_trial_15_days.sql
-- ---------------------------------------------------------------------
-- Migración para revertir la prueba gratuita a 15 días, asegurar que la
-- columna image_urls exista en menu_items, y recargar el caché de PostgREST.
-- =====================================================================

-- 1. Asegurar la columna image_urls en menu_items (evita el error 'image_urls' column not found)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar imágenes existentes de platos a la nueva columna image_urls si no se ha hecho
UPDATE public.menu_items
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL 
  AND (image_urls IS NULL OR jsonb_array_length(image_urls) = 0);

-- 3. Actualizar función RPC admin_create_restaurant para soportar 15 días de prueba
CREATE OR REPLACE FUNCTION public.admin_create_restaurant(
  p_request_id UUID,
  p_restaurant_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_city TEXT,
  p_address TEXT,
  p_subscription_plan TEXT,
  p_password_hash TEXT,
  p_internal_notes TEXT
)
RETURNS TABLE (
  restaurant_id UUID,
  user_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
BEGIN
  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  ) VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 
    CASE WHEN p_subscription_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END, 
    TRUE,
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '15 days' ELSE NULL END
  )
  RETURNING id INTO v_restaurant_id;

  -- Crear usuario owner
  INSERT INTO public.users (restaurant_id, email, password_hash, temp_password, role)
  VALUES (v_restaurant_id, p_email, p_password_hash, TRUE, 'owner')
  RETURNING id INTO v_user_id;

  -- Marcar solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, v_user_id, TRUE, 'Restaurante creado exitosamente';
END;
$$;


-- 4. Actualizar función RPC admin_create_restaurant_v2 para soportar 15 días de prueba
CREATE OR REPLACE FUNCTION public.admin_create_restaurant_v2(
  p_request_id        uuid,
  p_restaurant_name   text,
  p_slug              text,
  p_owner_name        text,
  p_phone             text,
  p_email             text,
  p_city              text,
  p_address           text,
  p_subscription_plan text,
  p_internal_notes    text
)
RETURNS TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_invitation_id uuid;
BEGIN
  -- Solo admins pueden ejecutar
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
    RETURN;
  END IF;

  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  )
  VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 
    CASE WHEN p_subscription_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END, 
    true,
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '15 days' ELSE NULL END
  )
  RETURNING id INTO v_restaurant_id;

  -- Crear invitación
  INSERT INTO public.invitations (restaurant_id, email, token, expires_at)
  VALUES (
    v_restaurant_id,
    p_email,
    encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    now() + interval '7 days'
  )
  RETURNING id INTO v_invitation_id;

  -- Marcar solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, v_invitation_id, true, 'Restaurante e invitación creados con éxito';
END;
$$;


-- 5. Actualizar función RPC auto_approve_registration_v2 para soportar 15 días de prueba
CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id uuid,
  p_plan       text
)
RETURNS TABLE(restaurant_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_row           record;
BEGIN
  -- Solo admin
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::uuid, FALSE, 'Solo administradores.';
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.registration_requests WHERE id = p_request_id;
  IF v_row.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, FALSE, 'Solicitud no encontrada.';
    RETURN;
  END IF;

  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  )
  VALUES (
    p_request_id,
    v_row.restaurant_name,
    lower(regexp_replace(v_row.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g')),
    v_row.owner_name,
    v_row.phone,
    v_row.email,
    v_row.city,
    v_row.address,
    p_plan,
    CASE WHEN p_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END,
    true,
    CASE WHEN p_plan = 'free_trial' THEN now() + interval '15 days' ELSE NULL END
  )
  RETURNING id INTO v_restaurant_id;

  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = 'Auto-aprobado por sistema'
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, true, 'Aprobado de forma automática';
END;
$$;


-- 6. Recalcular el período de prueba de los restaurantes que tengan 30 días a 15 días
UPDATE public.restaurants
SET trial_ends_at = created_at + interval '15 days'
WHERE subscription_plan = 'free_trial' 
  AND trial_ends_at IS NOT NULL;

-- 7. Corregir políticas RLS en la tabla restaurants para permitir que los usuarios públicos vean los restaurantes en prueba (trial)
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant" ON public.restaurants;
DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;

CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT USING (
    public.is_my_restaurant(id)
    OR (is_active = TRUE AND status IN ('active', 'trial'))
  );

-- 8. Forzar recarga del caché de esquema en PostgREST
NOTIFY pgrst, 'reload schema';
