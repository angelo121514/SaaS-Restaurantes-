-- =====================================================================
-- database/setup_v5_trial_30_days.sql
-- ---------------------------------------------------------------------
-- Migración para extender la prueba gratuita a 30 días en base de datos.
-- =====================================================================

-- 1. Actualizar función RPC admin_create_restaurant para soportar 30 días de prueba
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
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '30 days' ELSE NULL END
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


-- 2. Actualizar función RPC admin_create_restaurant_v2 para soportar 30 días de prueba
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
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '30 days' ELSE NULL END
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


-- 3. Crear/Actualizar la función RPC auto_approve_registration_v2 para que la aprobación en línea asigne 30 días de prueba
CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id        uuid,
  p_plan              text,
  p_payment_provider  text,
  p_transaction_id    text,
  p_amount            numeric
)
RETURNS TABLE(restaurant_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_req record;
  v_invitation_id uuid;
BEGIN
  -- Obtener los datos de la solicitud
  SELECT * INTO v_req FROM public.registration_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, FALSE, 'Solicitud no encontrada';
    RETURN;
  END IF;

  -- Crear el restaurante con 30 días si el plan es de prueba
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  )
  VALUES (
    p_request_id, 
    v_req.restaurant_name, 
    lower(regexp_replace(v_req.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g')), 
    v_req.owner_name, 
    v_req.phone, 
    v_req.email,
    v_req.city, 
    v_req.address, 
    p_plan, 
    CASE WHEN p_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END, 
    true,
    CASE WHEN p_plan = 'free_trial' THEN now() + interval '30 days' ELSE NULL END
  )
  RETURNING id INTO v_restaurant_id;

  -- Marcar la solicitud como verificada y guardar registro del pago simulado
  UPDATE public.registration_requests
  SET status = 'verified', 
      contacted_at = now(), 
      internal_notes = 'Aprobado automáticamente vía registro online con plan: ' || p_plan || ' (Tx: ' || p_transaction_id || ')'
  WHERE id = p_request_id;

  -- Crear invitación para que el dueño registre su contraseña al ingresar
  INSERT INTO public.invitations (restaurant_id, email, role, created_by)
  VALUES (v_restaurant_id, v_req.email, 'owner', NULL)
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_restaurant_id, TRUE, 'Restaurante activado con éxito';
END;
$$;


-- 4. REPARACIÓN: Actualizar cualquier local en plan de prueba cuya fecha de expiración sea errónea o nula
--    Establece su período de prueba a 30 días a contar de su fecha de registro (created_at).
UPDATE public.restaurants
SET trial_ends_at = created_at + interval '30 days',
    status = 'trial',
    is_active = true
WHERE subscription_plan = 'free_trial' 
  AND (trial_ends_at IS NULL OR trial_ends_at < now());
