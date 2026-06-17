-- =====================================================
-- SEMBRAR USUARIO ADMIN (CMOR FLOW)
-- =====================================================
-- Ejecutar DESPUÉS de setup.sql + setup_v2_auth.sql.
--
-- Elige UNA de las dos opciones y comenta la otra.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- OPCIÓN A (RECOMENDADA): crear el admin por el Dashboard
-- ─────────────────────────────────────────────────────
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    Email: admin@cmorflow.cl   (o el que quieras)
--    Password: <la que tú elijas>   ✅ Auto Confirm User
--    → Create user
--
-- 2. Luego ejecuta ESTE bloque (cambia el email si usaste otro):

UPDATE auth.users
SET raw_app_meta_data =
  jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"')
WHERE email = 'admin@cmorflow.cl';

-- 3. Asegura el perfil (si el trigger no lo creó):
INSERT INTO public.profiles (id, role, display_name)
  SELECT id, 'admin', 'Administrador'
  FROM auth.users
  WHERE email = 'admin@cmorflow.cl'
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────
-- OPCIÓN B: crear el admin por SQL con bcrypt (CONFIGURADO)
-- ─────────────────────────────────────────────────────
-- 1. Genera el hash en tu terminal (uno solo):
--    node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD',10))"
--
-- 2. Pégalo abajo en <HASH> y ejecuta (descomenta):

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  reauthentication_token, phone_change_token, email_change, phone_change,
  confirmed_at, is_sso_user, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin@cmorflow.cl',
  '$2b$10$SB4D8WspXAHkb9nZqD954OMfOrCLVMB0.At6rD0bVDc6EPDY.ePIS',                       -- bcrypt cost 10
  now(),
  '{"role":"admin"}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', '', '', '', '', '',
  now(), false, false
) ON CONFLICT (email) DO NOTHING;

-- 3. Inserta el perfil:
INSERT INTO public.profiles (id, role, display_name)
  SELECT id, 'admin', 'Administrador'
  FROM auth.users
  WHERE email = 'admin@cmorflow.cl'
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- VERIFICACIÓN (ejecuta y revisa que devuelva filas)
-- =====================================================

-- Debe mostrar 1 fila con role='admin':
-- SELECT id, role, display_name FROM public.profiles WHERE role = 'admin';

-- Tras loguearte como admin y abrir el SQL Editor con tu sesión,
-- esto debe devolver TRUE:
-- SELECT public.is_admin();
