-- =====================================================================
-- database/setup_v3_updates.sql
-- ---------------------------------------------------------------------
-- Migración para añadir soporte de multimoneda, idioma, tiempos de cocina,
-- múltiples fotos por plato y duración de prueba de 15 días.
-- =====================================================================

-- 1. Modificar tabla de restaurantes
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD')),
ADD COLUMN IF NOT EXISTS usd_exchange_rate NUMERIC DEFAULT 950,
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'es' CHECK (default_language IN ('es', 'en')),
ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 15;

-- 2. Modificar tabla de platos (menu_items)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- 3. Migrar imágenes existentes de platos a la nueva columna image_urls
UPDATE public.menu_items
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL 
  AND (image_urls IS NULL OR jsonb_array_length(image_urls) = 0);

-- 4. Actualizar función RPC admin_create_restaurant para soportar los 15 días de prueba
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

-- 5. Actualizar función RPC admin_create_restaurant_v2 para soportar los 15 días de prueba
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

  -- Marcar la solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  -- Crear invitación pendiente
  INSERT INTO public.invitations (restaurant_id, email, role, created_by)
  VALUES (v_restaurant_id, p_email, 'owner', auth.uid())
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_restaurant_id, v_invitation_id, TRUE, 'Restaurante creado; invitación en cola';
END;
$$;
