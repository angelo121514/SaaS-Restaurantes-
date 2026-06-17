-- =====================================================================
-- CMOR FLOW — Migración a Supabase Auth (setup v2)
-- ---------------------------------------------------------------------
-- Este script es IDEMPOTENTE: se puede ejecutar varias veces sin error.
-- Requisitos previos:
--   * Haber aplicado database/setup.sql (v1) al menos una vez.
--   * Tener Auth habilitado en el proyecto Supabase.
--   * Extensión pgcrypto disponible (ya habilitada por setup.sql).
--
-- Qué hace:
--   1. Crea la tabla `profiles` (clave auth.uid()) que reemplaza a `users`.
--   2. Trigger que crea el profile automáticamente al registrar un usuario.
--   3. Funciones RPC SECURITY DEFINER:
--        is_admin(), get_my_restaurant(),
--        admin_create_restaurant_v2(...), admin_invite_owner(...)
--   4. RLS para profiles y refuerzo de restaurants.
--   5. Estructura de `invitations` (cola que procesa la Edge Function).
--
-- NOTA DE SEGURIDAD:
--   La creación de auth.users y el envío de invitaciones por email NO se
--   hacen desde el navegador (requerirían la service role key). Se hace:
--     a) desde la Edge Function /invite-owner (recomendado), o
--     b) el frontend muestra un enlace /setup-password?token=<token> que
--        la RPC genera y guarda en invitations.token.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Tabla PROFILES (reemplaza a `users` como fuente de identidad)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  role          text NOT NULL DEFAULT 'owner'
                CHECK (role IN ('owner','staff','admin')),
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles IS 'Perfil de aplicación vinculado a auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'owner | staff | admin';

-- Índices
CREATE INDEX IF NOT EXISTS profiles_restaurant_id_idx ON public.profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx            ON public.profiles(role);

-- ---------------------------------------------------------------------
-- 2. Trigger: crear profile automáticamente al registrar auth.users
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.app_metadata->>'role', 'owner'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. Helpers de sesión
-- ---------------------------------------------------------------------

-- ¿El usuario actual es admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ¿El restaurante X pertenece al usuario actual?
CREATE OR REPLACE FUNCTION public.is_my_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND restaurant_id = p_restaurant_id
  ) OR public.is_admin();
$$;

-- Devuelve la fila del restaurante del owner actual.
CREATE OR REPLACE FUNCTION public.get_my_restaurant()
RETURNS SETOF public.restaurants
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.* FROM public.restaurants r
  JOIN public.profiles p ON p.restaurant_id = r.id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- 4. Cola de INVITACIONES (procesada por la Edge Function o el flujo B)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email         text NOT NULL,
  token         text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role          text NOT NULL DEFAULT 'owner',
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sent','consumed','cancelled')),
  created_by    uuid,  -- admin que invita (opcional)
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  consumed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS invitations_email_idx    ON public.invitations(email);
CREATE INDEX IF NOT EXISTS invitations_status_idx   ON public.invitations(status);
CREATE INDEX IF NOT EXISTS invitations_token_idx    ON public.invitations(token);

-- ---------------------------------------------------------------------
-- 5. RPC admin_create_restaurant_v2
--    Crea el restaurante + el registro de invitación.
--    NO crea auth.users aquí (necesitaría service role).
--    La Edge Function /invite-owner lee la cola y envía el magic link.
-- ---------------------------------------------------------------------
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

  -- 1. Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active
  )
  VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 'active', true
  )
  RETURNING id INTO v_restaurant_id;

  -- 2. Marcar la solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  -- 3. Crear invitación pendiente (la Edge Function la procesa)
  INSERT INTO public.invitations (restaurant_id, email, role, created_by)
  VALUES (v_restaurant_id, p_email, 'owner', auth.uid())
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_restaurant_id, v_invitation_id, TRUE, 'Restaurante creado; invitación en cola';
END;
$$;

-- Reenviar / crear invitación para un restaurante existente
CREATE OR REPLACE FUNCTION public.admin_invite_owner(
  p_restaurant_id uuid,
  p_email         text
)
RETURNS TABLE(invitation_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
    RETURN;
  END IF;

  -- Cancelar invitaciones previas pendientes para este restaurante
  UPDATE public.invitations
  SET status = 'cancelled'
  WHERE restaurant_id = p_restaurant_id AND status = 'pending';

  INSERT INTO public.invitations (restaurant_id, email, role, created_by)
  VALUES (p_restaurant_id, p_email, 'owner', auth.uid())
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, TRUE, 'Invitación en cola para envío';
END;
$$;

-- Marcar invitación como consumida cuando el owner completa el registro
CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text)
RETURNS TABLE(restaurant_id uuid, email text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.invitations
  WHERE token = p_token AND status IN ('pending','sent') LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE;
    RETURN;
  END IF;

  UPDATE public.invitations
  SET status = 'consumed', consumed_at = now()
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations  ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS profiles_select_self    ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin   ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self    ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_trigger ON public.profiles;

CREATE POLICY profiles_select_self   ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_select_admin  ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY profiles_update_self   ON public.profiles FOR UPDATE USING (id = auth.uid());
-- El trigger SECURITY DEFINER inserta; los usuarios no insertan manualmente.
CREATE POLICY profiles_insert_trigger ON public.profiles FOR INSERT WITH CHECK (true);

-- INVITATIONS: solo admin lee/escribe; el owner solo consume vía RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS invitations_admin_all ON public.invitations;
CREATE POLICY invitations_admin_all ON public.invitations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RESTAURANTS: refuerzo (el owner puede ver/editar el suyo; admin todo)
DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
DROP POLICY IF EXISTS restaurants_owner_update ON public.restaurants;
CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT USING (
    public.is_my_restaurant(id)
    OR (is_active AND status = 'active')  -- público ve los activos
  );
CREATE POLICY restaurants_owner_update ON public.restaurants
  FOR UPDATE USING (public.is_my_restaurant(id));

-- ---------------------------------------------------------------------
-- 7. Permisos de ejecución
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION
  public.is_admin(),
  public.is_my_restaurant(uuid),
  public.get_my_restaurant(),
  public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text),
  public.admin_invite_owner(uuid,text),
  public.consume_invitation(text)
TO authenticated, anon;

COMMIT;

-- =====================================================================
-- 8. SEMBRAR EL ADMIN (ejecutar UNA vez; AJUSTA email y contraseña)
-- ---------------------------------------------------------------------
-- Reemplaza '<TU_PASSWORD_HASH>' por el bcrypt hash de la contraseña que
-- elijas. Genera el hash con:
--   node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD',10))"
-- o crea el admin desde Supabase Dashboard → Authentication → Add user
-- y luego ejecuta SOLO el UPDATE de app_metadata que va abajo.
-- ---------------------------------------------------------------------
-- OPCIÓN 1: crear directamente en auth.users (descomenta y completa):
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, raw_app_meta_data, created_at, updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated', 'authenticated',
--   'admin@cmorflow.cl',
--   '<TU_PASSWORD_HASH>',         -- bcrypt, cost 10
--   now(),
--   '{"role":"admin"}'::jsonb,    -- app_metadata.role = admin
--   now(), now()
-- ) ON CONFLICT (email) DO NOTHING;
--
-- OPCIÓN 2 (preferida): crear el user desde el Dashboard de Supabase y
-- luego fijar el rol de admin en app_metadata:
-- UPDATE auth.users
--   SET raw_app_meta_data = jsonb_set(
--     COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'
--   )
-- WHERE email = 'admin@cmorflow.cl';
--
-- El trigger on_auth_user_created insertará el perfil automáticamente;
-- si creaste el user antes del trigger, insértalo a mano:
-- INSERT INTO public.profiles (id, role, display_name)
--   SELECT id, 'admin', 'Administrador' FROM auth.users
--   WHERE email = 'admin@cmorflow.cl'
--   ON CONFLICT (id) DO NOTHING;
-- =====================================================================

-- Sanity checks (ejecutar manualmente tras aplicar):
-- SELECT public.is_admin();                        -- tras loguearte como admin
-- SELECT * FROM public.get_my_restaurant();        -- tras loguearte como owner
-- SELECT email, status FROM public.invitations;    -- invitaciones pendientes
