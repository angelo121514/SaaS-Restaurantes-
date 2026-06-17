# Migración a Supabase Auth — Guía paso a paso

Esta guía acompaña a `setup_v2_auth.sql` y a la Edge Function
`supabase/functions/invite-owner/index.ts`. Tras seguirla, la app deja de
usar hashing SHA-256 en el cliente y pasa a usar **Supabase Auth real**
con sesiones JWT, invitación por email y control de acceso por rol.

---

## 0. Requisitos previos

- Proyecto Supabase con **Auth habilitado**.
- Haber aplicado `database/setup.sql` (v1) al menos una vez.
- Proveedor **Email** activo (Authentication → Providers → Email).
- (Opcional pero recomendado) Proveedor **Google** configurado con OAuth.
- SMTP configurado (Authentication → Email Templates → SMTP Settings) o el
  servicio de email de Supabase por defecto.
- Node 18+ y `npm` para generar el hash del admin si lo creas por SQL.

---

## 1. Aplicar el SQL v2

1. Abre Supabase → **SQL Editor**.
2. Pega el contenido de `database/setup_v2_auth.sql` y ejecuta.
3. Debe terminar con `COMMIT` y sin errores. El script es idempotente.

Sanity checks tras aplicarlo:

```sql
-- Tablas nuevas presentes
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('profiles','invitations');

-- Funciones presentes
SELECT proname FROM pg_proc WHERE proname IN
  ('is_admin','get_my_restaurant','admin_create_restaurant_v2',
   'admin_invite_owner','consume_invitation');
```

---

## 2. Sembrar el usuario administrador

Elige **UNA** de estas opciones.

### Opción A (recomendada): crear el user desde el Dashboard

1. Authentication → **Users** → **Add user** →
   email `admin@cmorflow.cl` + la contraseña que elijas → **Create user**.
2. SQL Editor, ejecuta:

```sql
-- Fija el rol de admin en app_metadata (dispara el trigger de perfil)
UPDATE auth.users
SET raw_app_meta_data =
  jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"')
WHERE email = 'admin@cmorflow.cl';

-- Si el trigger no creó el perfil (user creado antes del trigger):
INSERT INTO public.profiles (id, role, display_name)
  SELECT id, 'admin', 'Administrador'
  FROM auth.users WHERE email = 'admin@cmorflow.cl'
ON CONFLICT (id) DO NOTHING;
```

### Opción B: crear por SQL con bcrypt

Genera el hash (cost 10):

```bash
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD',10))"
```

Luego descomenta y completa el bloque `INSERT INTO auth.users ...` al final
de `setup_v2_auth.sql`.

> ⚠️ **No** reutilices la contraseña demo `admin123` en producción.

---

## 3. Desplegar la Edge Function `invite-owner`

Desde la raíz del proyecto (requiere la [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
npm i -g supabase
supabase login
supabase link --project-ref <TU_PROJECT_REF>
```

Configura los **secrets**:

```bash
supabase secrets set \
  SUPABASE_URL=https://<TU_PROJECT>.supabase.co \
  SUPABASE_SERVICE_ROLE=<SERVICE_ROLE_KEY> \
  APP_URL=https://app.cmorflow.cl
```

Despliega:

```bash
supabase functions deploy invite-owner --no-verify-jwt
```

Verifica manualmente:

```bash
curl -i https://<TU_PROJECT>.supabase.co/functions/v1/invite-owner \
  -H "Authorization: Bearer <ANON_KEY>"
# → { "processed": 0 }
```

### Automatizar (cron de Supabase)

Database → **Cron** (o pg_cron) o, más simple, en Supabase Dashboard →
**Edge Functions → invite-owner → Schedule** cada 2-5 minutos.

---

## 4. Plantilla de email de invitación

Authentication → **Email Templates** → **Invite User**:

```
Asunto: Tu acceso a CMOR FLOW

Hola,

{{ .email }} ha sido invitado a gestionar tu restaurante en CMOR FLOW.
Haz clic en el siguiente enlace para crear tu contraseña y acceder:

{{ .ConfirmationURL }}

Si no esperabas este correo, ignóralo.
```

Configura `redirectTo = APP_URL + '/setup-password'` para que el enlace
caiga en la página de definición de contraseña (ya creada en el frontend).

---

## 5. Variables de entorno del frontend

Crea `.env` en la raíz (no se commitea — ya está en `.gitignore`):

```env
VITE_SUPABASE_URL=https://<TU_PROJECT>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Con esto, `src/config/config.ts` deja de usar placeholders y el cliente
usa el Supabase real (ya no el `MockSupabaseClient`).

---

## 6. Migración de datos existentes (solo si ya tenías usuarios reales)

Si ya estabas en producción con la tabla `users` (SHA-256), los passwords
**no son migrables** a bcrypt. Procedimiento:

1. Para cada `users.email` existente, inserta una invitación:

```sql
INSERT INTO public.invitations (restaurant_id, email, role)
SELECT restaurant_id, email, 'owner'
FROM public.users
WHERE role = 'owner'
ON CONFLICT DO NOTHING;
```

2. La Edge Function enviará el magic link a cada owner; ellos definirán su
   contraseña nueva.
3. Los perfiles (`profiles`) se crean automáticamente cuando el owner
   completa la invitación (trigger `on_auth_user_created`).
4. Enlaza cada `profiles.restaurant_id` en el `consume_invitation` (ver
   frontend `/setup-password`).

> Si solo tienes datos demo (modo mock), **no necesitas migrar nada**: los
> owners nuevos se crean vía el flujo de invitación del admin.

---

## 7. Checklist de verificación

Ejecuta estas pruebas tras la migración:

- [ ] Login admin con `admin@cmorflow.cl` → entra a `/admin`.
- [ ] Un owner **no** puede acceder a `/admin/*` (RLS lo bloquea).
- [ ] Login owner email/password → entra a `/restaurant`.
- [ ] Login Google owner → entra a `/restaurant`.
- [ ] Admin crea un restaurante desde PendingRequests → llega invitación
      por email al owner.
- [ ] Owner abre el enlace → define contraseña en `/setup-password` →
      puede loguearse con email/contraseña.
- [ ] Un owner **no** puede leer `menu_items`/`orders` de otro restaurante
      (prueba con un segundo restaurante).
- [ ] Logout limpia la sesión y redirige a `/login`.
- [ ] La sesión caduca tras el tiempo configurado en Supabase (JWT).

Sanity queries:

```sql
-- ¿Quién soy ahora? (ejecutar logueado)
SELECT auth.uid(), public.is_admin();

-- Mi restaurante
SELECT * FROM public.get_my_restaurant();

-- Invitaciones pendientes
SELECT email, status, created_at FROM public.invitations ORDER BY created_at DESC;
```

---

## 8. Qué queda fuera de esta migración (próximas fases)

- **Eliminar `MockSupabaseClient`** del bundle de producción (Fase 4).
- **Rate-limiting** de login e invitación (Supabase Auth settings o
  middleware Edge).
- **2FA** para admin.
- Migrar el README inline divergente a la nueva arquitectura.
- Auditoría final de RLS (verificar que cada política funciona como se
  espera con datos reales de múltiples restaurantes).

---

## 9. Rollback

Si necesitas volver atrás:

1. El frontend mantiene compatibilidad con los helpers `getStoredUser()`
   hasta la Fase 4, pero la fuente de verdad será el JWT. Para volver al
   flujo viejo, revierte los commits del bloque B de la Fase 2.
2. El SQL v2 solo **añade** tablas/funciones/RLS; no destruye `users` ni
   `admin_users`. Para limpiar:

```sql
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_restaurant_v2(...);
-- ... (ver el script para el resto)
```
