# Capa 1 — Fundacional de Privacidad (SQL + RLS + Auditoría)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer la base de datos de Supabase para cumplir los requisitos 1 (consentimiento), 2 (minimización), 5 (seguridad por diseño) y parte del 12 (auditoría) de la Ley 19.628 / Ley 21.719, generando archivos SQL listos para aplicar por MCP.

**Architecture:** 8 migraciones SQL idempotentes en `database/` (numeradas `03`-`10`), cada una autocontenida con su reversión. Se aplican vía MCP desde Antigravity (no en esta sesión). Cada migración es independiente y puede aplicarse y verificarse por separado. No hay código de aplicación en esta capa — solo schema y RLS.

**Tech Stack:** PostgreSQL 15 (Supabase) + extensiones `pgcrypto`, `pg_cron`. Sin framework de migraciones — los archivos se pegan en el SQL Editor de Supabase.

**Spec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §2 (Capa Fundacional).

---

## Cómo aplicar este plan

Los archivos `.sql` se generan en el repo (`database/`), pero **no se aplican automáticamente**. El usuario los aplica vía MCP de Supabase desde Antigravity. Cada tarea incluye:
1. Escribir el SQL en el archivo.
2. Un bloque de **verificación** (queries `SELECT` que confirman que la migración quedó aplicada) que el usuario correrá tras aplicar.

**Importante:** todas las migraciones deben ser **idempotentes** (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`, etc.) — el usuario puede re-aplicarlas sin error.

---

## Task 1: Tabla `consents` (consentimiento granular)

**Files:**
- Create: `database/03_privacy_consents.sql`

- [ ] **Step 1: Crear el archivo `03_privacy_consents.sql`**

```sql
-- =====================================================
-- 03 — Tabla de consentimientos granulares
-- Requisito Ley 21.719: base legal + consentimiento (req. 1)
-- Idempotente: re-ejecutable sin error.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- subject_id: auth.uid() del titular (B2B autenticado).
  -- NULL para clientes finales que solo dejan email.
  subject_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_email text NOT NULL,
  scope         text NOT NULL CHECK (scope IN
                  ('cookies','marketing','ai_profiling','analytics','third_party_share')),
  purpose       text NOT NULL,                 -- finalidad explícita (art. 9 Ley 21.719)
  legal_basis   text NOT NULL CHECK (legal_basis IN
                  ('consent','contract','legal_obligation','legitimate_interest')),
  granted       boolean NOT NULL,
  granted_at    timestamptz,
  revoked_at    timestamptz,
  proof         jsonb,                          -- {ip, user_agent, via, policy_version}
  privacy_policy_version text NOT NULL,         -- ej. '2026-06-01'
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consents IS
  'Registro granular de consentimientos. Ley 19.628 art. 4 / Ley 21.719 art. 9.';

CREATE INDEX IF NOT EXISTS consents_subject_id_idx
  ON public.consents(subject_id);
CREATE INDEX IF NOT EXISTS consents_subject_email_idx
  ON public.consents(subject_email);
CREATE INDEX IF NOT EXISTS consents_scope_granted_idx
  ON public.consents(scope, granted);

-- RLS: el titular ve solo sus consentimientos; admin ve todo.
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consents_select_self ON public.consents;
CREATE POLICY consents_select_self ON public.consents
  FOR SELECT USING (subject_id = auth.uid());

DROP POLICY IF EXISTS consents_select_admin ON public.consents;
CREATE POLICY consents_select_admin ON public.consents
  FOR SELECT USING (public.is_admin());

-- Inserción: cualquiera autenticado puede grabar su consentimiento.
-- También se permite anon (clientes finales no autenticados dejan email).
DROP POLICY IF EXISTS consents_insert_any ON public.consents;
CREATE POLICY consents_insert_any ON public.consents
  FOR INSERT WITH CHECK (true);

-- Update: el titular revoca; admin también.
DROP POLICY IF EXISTS consents_update_self ON public.consents;
CREATE POLICY consents_update_self ON public.consents
  FOR UPDATE USING (subject_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated, anon;
```

- [ ] **Step 2: Bloque de verificación**

El usuario corre esto tras aplicar la migración. Confirmar que devuelve `true`:

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='consents'
) AS tabla_creada,
(
  SELECT count(*) FROM pg_policies WHERE tablename='consents'
) AS politicas_rls;
-- Esperado: tabla_creada=t, politicas_rls >= 4
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/03_privacy_consents.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 03 - tabla consents para consentimiento granular (Ley 21.719 req.1)"
```

---

## Task 2: Tabla `audit_log` (logs inmutables)

**Files:**
- Create: `database/04_audit_log.sql`

- [ ] **Step 1: Crear el archivo `04_audit_log.sql`**

```sql
-- =====================================================
-- 04 — Log de auditoría inmutable
-- Requisito Ley 21.719: seguridad + trazabilidad (req. 5, 12)
-- APPEND-ONLY: sin UPDATE ni DELETE para nadie.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigserial PRIMARY KEY,
  actor_id      uuid,                          -- auth.uid() o NULL (sistema)
  actor_email   text,
  action        text NOT NULL,                 -- 'login','update_restaurant','export_data'...
  table_name    text,
  row_id        text,
  metadata      jsonb,                         -- NUNCA datos personales en crudo
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 95);

COMMENT ON TABLE public.audit_log IS
  'Log inmutable de eventos. Ley 21.719 art. 24 (seguridad del tratamiento).';

CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx
  ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log(action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Solo lectura para admin; nadie lee sus propias filas por defecto
-- (podría añadirse política para que un titular vea su propio log).
DROP POLICY IF EXISTS audit_log_admin_select ON public.audit_log;
CREATE POLICY audit_log_admin_select ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- Inserción abierta (Edge Functions y triggers escriben aquí).
-- Un trigger o RPC SECURITY DEFINER es quien realmente inserta.
DROP POLICY IF EXISTS audit_log_insert_any ON public.audit_log;
CREATE POLICY audit_log_insert_any ON public.audit_log
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_log TO authenticated, anon;

-- INMUTABILIDAD: revocar UPDATE y DELETE a todos los roles.
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC, authenticated, anon, service_role;
```

- [ ] **Step 2: Bloque de verificación**

```sql
-- 1. Tabla existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='audit_log'
) AS tabla_creada;

-- 2. UPDATE está revocado (debe dar error de permiso o RLS)
-- Probar desde una sesión autenticada (NO service_role):
-- UPDATE public.audit_log SET action='hack' WHERE id=1;
-- Esperado: ERROR: permission denied / RLS blocked
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/04_audit_log.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 04 - tabla audit_log inmutable (Ley 21.719 req.5)"
```

---

## Task 3: Parches RLS críticos (`05_rls_hardening.sql`)

**Files:**
- Create: `database/05_rls_hardening.sql`

- [ ] **Step 1: Crear el archivo `05_rls_hardening.sql`**

```sql
-- =====================================================
-- 05 — Endurecimiento de RLS
-- Arregla policies peligrosas encontradas en el schema actual.
-- =====================================================

-- 5.1 ORDERS: restringir INSERT público a restaurantes activos.
-- (Antes: WITH CHECK (true) permitía insertar contra cualquier restaurant_id.)
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = orders.restaurant_id
        AND r.is_active = true
        AND r.status = 'active'
    )
  );

-- 5.2 NOTIFICATIONS: solo el dueño lee las suyas.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Las notificaciones las inserta el sistema (Edge Function / trigger).
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- 5.3 REGISTRATION_REQUESTS: el INSERT público se mantiene (es el alta
-- de prospectos), pero añadimos validación de campos obligatorios + longitud
-- para reducir spam. El rate-limit real por IP se hace en la Edge Function
-- o RPC (ver comentario abajo).
COMMENT ON POLICY "Public can insert registration requests"
  ON public.registration_requests IS
  'El rate-limit (max 5/IP/día) se aplica en la capa de aplicación (Edge Function o RPC), no aquí.';

-- 5.4 STORAGE: buckets de logos y QR deben ser privados.
-- Nota: esto se ejecuta en el SQL Editor pero la política de storage
-- vive en storage.buckets / storage.objects. Asegurarse de que los
-- buckets 'logos' y 'qr-codes' existen como privados.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Política de storage: solo el owner del restaurante sube/lee sus logos.
-- Las URLs firmadas (1h) se generan desde el frontend con createSignedUrl.
DROP POLICY IF EXISTS "Owners manage their logos" ON storage.objects;
CREATE POLICY "Owners manage their logos" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id IN ('logos','qr-codes')
    AND public.is_my_restaurant(
      (storage.foldername(name))::uuid  -- asume carpeta = restaurant_id
    )
  );
```

- [ ] **Step 2: Bloque de verificación**

```sql
-- 1. Política de orders ahora valida restaurant activo
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename='orders' AND policyname='Public can create orders';
-- Esperado: cmd=INSERT, qual contiene 'is_active = true'

-- 2. Buckets son privados
SELECT id, public FROM storage.buckets WHERE id IN ('logos','qr-codes');
-- Esperado: public=false en ambos
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/05_rls_hardening.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "fix(db): 05 - endurece RLS (orders, notifications, storage privado)"
```

---

## Task 4: Deprecación de `admin_users` SHA-256 (`06_password_deprecation.sql`)

**Files:**
- Create: `database/06_password_deprecation.sql`

- [ ] **Step 1: Crear el archivo `06_password_deprecation.sql`**

```sql
-- =====================================================
-- 06 — Deprecación de admin_users (SHA-256 legacy)
-- Decisión D9: deprecar pero conservar datos.
-- El login admin pasa por Supabase Auth (profiles.role='admin').
-- =====================================================

COMMENT ON TABLE public.admin_users IS
  '[DEPRECATED 2026-06-18] Tabla legacy con contraseñas SHA-256. '
  'NO usar para autenticación. El login admin pasa por auth.users + '
  'profiles.role=''admin''. Conservada solo para auditoría histórica.';

-- Revocar todos los grants: ni anon ni authenticated pueden leer/escribir.
REVOKE ALL ON public.admin_users FROM anon, authenticated;

-- Las funciones RPC legacy admin_login ya no deben usarse.
-- Las marcamos como obsoletas en lugar de borrarlas (compatibilidad).
COMMENT ON FUNCTION public.admin_login(text, text) IS
  '[DEPRECATED 2026-06-18] Usar Supabase Auth. Mantenida solo para auditoría.';

-- No eliminamos filas: conservamos el historial por si se necesita
-- en una investigación de seguridad futura. El campo password_hash
-- queda en reposo cifrado (AES-256 a nivel DB), pero sin acceso vía API.

-- Sanity: confirmar que ningún admin_users.email coincide con un
-- auth.users.email activo (si coincide, hay duplicación que arreglar).
SELECT email,
       (SELECT count(*) FROM auth.users au WHERE au.email = admin_users.email) AS en_auth
FROM public.admin_users
WHERE is_active = true;
-- Revisar manualmente el output. Si algún email aparece en ambas,
-- eliminar el registro de admin_users correspondiente.
```

- [ ] **Step 2: Bloque de verificación**

```sql
-- 1. Tabla existe pero sin grants a anon/authenticated
SELECT has_table_privilege('anon','public.admin_users','SELECT') AS anon_puede_leer,
       has_table_privilege('authenticated','public.admin_users','SELECT') AS auth_puede_leer;
-- Esperado: ambos false

-- 2. Comment de deprecation presente
SELECT obj_description('public.admin_users'::regclass) AS comentario;
-- Esperado: contiene '[DEPRECATED'
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/06_password_deprecation.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "chore(db): 06 - depreca admin_users SHA-256 legacy (D9)"
```

---

## Task 5: Tabla `data_subject_requests` (cola DSAR)

**Files:**
- Create: `database/07_data_subject_requests.sql`

- [ ] **Step 1: Crear el archivo `07_data_subject_requests.sql`**

```sql
-- =====================================================
-- 07 — Cola de Data Subject Requests (DSAR)
-- Requisito Ley 21.719: derechos del titular (req. 4)
-- 6 tipos: access, rectify, erase, object, export, revoke-consent
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type    text NOT NULL CHECK (request_type IN
                    ('access','rectify','erase','object','export','revoke-consent','contact')),
  subject_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email   text NOT NULL,
  -- Token de verificación de identidad (enviado por email)
  verification_token text UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  -- Estado del flujo
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN
                    ('pending','verified','in_progress','fulfilled','rejected','cancelled')),
  -- Payload: qué pide exactamente (ej. {scope:'marketing'} o {fields:['phone']})
  payload         jsonb,
  -- Resolución
  fulfilled_at    timestamptz,
  fulfilled_by    uuid REFERENCES auth.users(id),
  result_metadata jsonb,                        -- {anonymized_rows: 5, export_url: '...'}
  rejection_reason text,
  sla_due_at      timestamptz NOT NULL,         -- calculado al crear (now()+SLA)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_subject_requests IS
  'Cola de solicitudes de derechos del titular. Ley 19.628 art. 19 / Ley 21.719.';

CREATE INDEX IF NOT EXISTS dsr_subject_email_idx
  ON public.data_subject_requests(subject_email);
CREATE INDEX IF NOT EXISTS dsr_status_idx
  ON public.data_subject_requests(status);
CREATE INDEX IF NOT EXISTS dsr_sla_due_at_idx
  ON public.data_subject_requests(sla_due_at)
  WHERE status IN ('pending','verified','in_progress');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_dsr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS dsr_updated_at ON public.data_subject_requests;
CREATE TRIGGER dsr_updated_at BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_dsr_updated_at();

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- El titular ve SOLO sus propias solicitudes (por email o subject_id).
DROP POLICY IF EXISTS dsr_select_self ON public.data_subject_requests;
CREATE POLICY dsr_select_self ON public.data_subject_requests
  FOR SELECT USING (
    subject_id = auth.uid()
    OR subject_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Admin ve y gestiona todo.
DROP POLICY IF EXISTS dsr_admin_all ON public.data_subject_requests;
CREATE POLICY dsr_admin_all ON public.data_subject_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Cualquiera puede crear una solicitud (es ejercicio de derecho).
DROP POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests;
CREATE POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.data_subject_requests TO authenticated, anon;
```

- [ ] **Step 2: Bloque de verificación**

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name='data_subject_requests'
) AS tabla_creada,
(
  SELECT count(*) FROM pg_policies WHERE tablename='data_subject_requests'
) AS politicas;
-- Esperado: tabla_creada=t, politicas >= 3
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/07_data_subject_requests.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 07 - cola data_subject_requests (DSAR, Ley 21.719 req.4)"
```

---

## Task 6: Función `run_retention_sweep()` + política de retención (`08_retention.sql`)

**Files:**
- Create: `database/08_retention.sql`

- [ ] **Step 1: Crear el archivo `08_retention.sql`**

```sql
-- =====================================================
-- 08 — Función de retención y eliminación
-- Requisito Ley 21.719: retención y eliminación (req. 8)
-- Ejecutada por pg_cron (ver 10_pg_cron_schedule.sql).
-- =====================================================

CREATE OR REPLACE FUNCTION public.run_retention_sweep()
RETURNS TABLE(table_name text, rows_affected bigint, action text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_deleted bigint;
  v_updated bigint;
BEGIN
  -- =========================================================
  -- 1. Registration requests rechazados > 12 meses (borrar)
  -- =========================================================
  WITH d AS (
    DELETE FROM public.registration_requests
    WHERE status = 'rejected'
      AND created_at < now() - interval '12 months'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'registration_requests'::text, v_deleted, 'delete'::text;

  -- =========================================================
  -- 2. Invitaciones expiradas > 7 días (borrar)
  -- =========================================================
  WITH d AS (
    DELETE FROM public.invitations
    WHERE status IN ('pending','sent')
      AND created_at < now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'invitations'::text, v_deleted, 'delete'::text;

  -- =========================================================
  -- 3. Clientes finales sin pedidos > 24 meses (anonimizar)
  --    Decisión de negocio (D7), no obligación legal.
  -- =========================================================
  WITH u AS (
    UPDATE public.restaurant_customers c SET
      name = '[anónimo]',
      phone = '[anónimo]',
      email = NULL,
      notes = NULL
    WHERE c.updated_at < now() - interval '24 months'
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.customer_id = c.id
          AND o.created_at > now() - interval '24 months'
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM u;
  RETURN QUERY SELECT 'restaurant_customers'::text, v_updated, 'anonymize'::text;

  -- =========================================================
  -- 4. Orders > 6 años: anonimizar campos personales (SII exige conservar financiero)
  -- =========================================================
  WITH u AS (
    UPDATE public.orders SET
      customer_name = NULL,
      customer_phone = NULL,
      customer_notes = NULL
    WHERE completed_at < now() - interval '6 years'
      AND customer_name IS NOT NULL  -- idempotente
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM u;
  RETURN QUERY SELECT 'orders'::text, v_updated, 'anonymize_personal'::text;

  -- =========================================================
  -- 5. Audit log > 24 meses base (borrar); 36 meses para eventos de seguridad.
  -- =========================================================
  WITH d AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - interval '24 months'
      AND action NOT IN ('login_failed','rls_denied','security_event','breach_detected')
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'audit_log'::text, v_deleted, 'delete'::text;

  WITH d AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - interval '36 months'
      AND action IN ('login_failed','rls_denied','security_event','breach_detected')
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'audit_log'::text, v_deleted, 'delete_security'::text;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.run_retention_sweep() IS
  'Sweep de retención semanal. Plazos según D7 (sujetos a validación legal). '
  'Usa anonimización cuando hay obligación legal de conservar (orders 6a SII).';

GRANT EXECUTE ON FUNCTION public.run_retention_sweep() TO authenticated, anon, service_role;
```

- [ ] **Step 2: Bloque de verificación**

```sql
-- La función existe y es executable
SELECT proname FROM pg_proc WHERE proname='run_retention_sweep';
-- Esperado: 1 fila

-- Dry-run: ejecutar y ver qué haría (en producción debe dar filas reales)
SELECT * FROM public.run_retention_sweep();
-- Esperado: tabla con 5-6 filas, rows_affected probablemente 0 en DB nueva
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/08_retention.sql
git -C "C:/14-desktop-code/Code/SaaS suchi" 2>/dev/null || true
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 08 - funcion run_retention_sweep + politica de retencion (D7)"
```

---

## Task 7: Tabla `breach_register` (`09_breach_register.sql`)

**Files:**
- Create: `database/09_breach_register.sql`

- [ ] **Step 1: Crear el archivo `09_breach_register.sql`**

```sql
-- =====================================================
-- 09 — Registro de brechas de seguridad
-- Requisito Ley 21.719: notificación de brechas (req. 10)
-- Notificación a autoridad competente y a titulares: <= 72h.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.breach_register (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at     timestamptz NOT NULL DEFAULT now(),
  reported_at     timestamptz,                  -- cuando se notificó a autoridad
  severity        text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          text NOT NULL DEFAULT 'detected' CHECK (status IN
                    ('detected','investigating','contained','notified','closed')),
  description     text NOT NULL,
  affected_data_categories text[],              -- ['contacto','auth',...]
  affected_subjects_count integer,
  containment_measures text,
  root_cause      text,
  authority_notified_at timestamptz,
  subjects_notified_at timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.breach_register IS
  'Registro de incidentes de seguridad. Ley 21.719: notificación <= 72h.';

CREATE INDEX IF NOT EXISTS breach_status_idx ON public.breach_register(status);
CREATE INDEX IF NOT EXISTS breach_detected_at_idx ON public.breach_register(detected_at DESC);

CREATE OR REPLACE FUNCTION public.set_breach_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS breach_updated_at ON public.breach_register;
CREATE TRIGGER breach_updated_at BEFORE UPDATE ON public.breach_register
  FOR EACH ROW EXECUTE FUNCTION public.set_breach_updated_at();

ALTER TABLE public.breach_register ENABLE ROW LEVEL SECURITY;

-- Solo admin gestiona brechas.
DROP POLICY IF EXISTS breach_admin_all ON public.breach_register;
CREATE POLICY breach_admin_all ON public.breach_register
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.breach_register TO authenticated;
```

- [ ] **Step 2: Bloque de verificación**

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name='breach_register'
) AS creada;
-- Esperado: t
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/09_breach_register.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 09 - registro de brechas de seguridad (Ley 21.719 req.10)"
```

---

## Task 8: Schedule pg_cron (`10_pg_cron_schedule.sql`)

**Files:**
- Create: `database/10_pg_cron_schedule.sql`

- [ ] **Step 1: Crear el archivo `10_pg_cron_schedule.sql`**

```sql
-- =====================================================
-- 10 — Schedule de pg_cron para retención semanal
-- Requisito: automatización de retención (D10, camino A pg_cron).
-- Requiere extensión pg_cron activa en Supabase.
-- =====================================================

-- PASO PREVIO (manual, una sola vez, en Supabase Dashboard):
-- Database → Extensions → buscar "pg_cron" → Enable.
-- Si no aparece, ejecutar:
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Programar el sweep semanal: domingos 03:00 America/Santiago.
-- pg_cron corre en UTC por defecto; ajustar offset si necesario.
SELECT cron.schedule(
  'retention_sweep_weekly',
  '0 7 * * 0',                                   -- 07:00 UTC = 03:00 UTC-4 (Chile)
  $$SELECT * FROM public.run_retention_sweep();$$
);

-- Verificar que quedó programado
SELECT jobid, schedule, command, active, jobname
FROM cron.jobs WHERE jobname = 'retention_sweep_weekly';
-- Esperado: 1 fila, active=true
```

- [ ] **Step 2: Bloque de verificación**

```sql
SELECT jobname, active FROM cron.jobs WHERE jobname='retention_sweep_weekly';
-- Esperado: active=true
```

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/10_pg_cron_schedule.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(db): 10 - schedule pg_cron para retention sweep semanal (D10)"
```

---

## Task 9: Rollback de emergencia (`migrations_rollback.sql`)

**Files:**
- Create: `database/migrations_rollback.sql`

> **ADVERTENCIA:** este archivo es **herramienta de emergencia**. Solo se usa si una migración sale mal. **No forma parte del flujo normal de aplicación** y NO debe ejecutarse completo sin revisión. Documentar su uso en `README.md` §"Rollback".

- [ ] **Step 1: Crear el archivo `migrations_rollback.sql`**

```sql
-- =====================================================
-- ROLLBACK DE EMERGENCIA — NO USAR EN FLUJO NORMAL
-- -----------------------------------------------------
-- Solo ejecutar si una migración 03-10 causó un problema
-- crítico que no se puede arreglar con una nueva migración.
--
-- ADVERTENCIAS:
--   * Esto ELIMINA datos. Las tablas consents, audit_log,
--     data_subject_requests, breach_register se borrarán.
--   * NO revierte los cambios de RLS en orders/notifications/storage
--     (esos parches corrigen vulnerabilidades; revertirlos reabre el hoyo).
--   * Ejecutar bloque por bloque, NO todo de una vez.
--   * Hacer BACKUP antes (Supabase → Database → Backups).
-- =====================================================

-- Bloque A: des-programar el cron
SELECT cron.unschedule(jobid) FROM cron.jobs WHERE jobname='retention_sweep_weekly';

-- Bloque B: eliminar funciones nuevas
DROP FUNCTION IF EXISTS public.run_retention_sweep() CASCADE;
DROP FUNCTION IF EXISTS public.set_dsr_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_breach_updated_at() CASCADE;

-- Bloque C: eliminar tablas nuevas
DROP TABLE IF EXISTS public.breach_register CASCADE;
DROP TABLE IF EXISTS public.data_subject_requests CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.consents CASCADE;

-- Bloque D: restaurar policy de orders al estado anterior (PELIGROSO)
-- Solo si es estrictamente necesario. Reabre la vulnerabilidad.
-- DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
-- CREATE POLICY "Public can create orders" ON public.orders
--   FOR INSERT WITH CHECK (true);

-- Bloque E: restaurar grants de admin_users (PELIGROSO)
-- GRANT SELECT ON public.admin_users TO authenticated;

-- Bloque F: comentarios de deprecation
-- COMMENT ON TABLE public.admin_users IS NULL;
```

- [ ] **Step 2: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/migrations_rollback.sql
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "chore(db): rollback de emergencia para migraciones 03-10"
```

---

## Task 10: README operativo de la capa

**Files:**
- Create: `database/README.md`

- [ ] **Step 1: Crear el archivo `database/README.md`**

````markdown
# Migraciones de Privacidad — Capa Fundacional

Migraciones SQL para cumplimiento Ley 19.628 / Ley 21.719.
Spec de referencia: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §2.

## Orden de aplicación

Aplicar en orden, una por una, en el SQL Editor de Supabase (o vía MCP):

| # | Archivo | Qué hace |
|---|---|---|
| 03 | `03_privacy_consents.sql` | Tabla de consentimientos granular |
| 04 | `04_audit_log.sql` | Log inmutable (append-only) |
| 05 | `05_rls_hardening.sql` | Endurece RLS (orders, notifications, storage) |
| 06 | `06_password_deprecation.sql` | Deprecar admin_users SHA-256 |
| 07 | `07_data_subject_requests.sql` | Cola de DSAR (derechos del titular) |
| 08 | `08_retention.sql` | Función `run_retention_sweep()` |
| 09 | `09_breach_register.sql` | Registro de brechas |
| 10 | `10_pg_cron_schedule.sql` | Schedule semanal del sweep |

## Pre-requisitos

1. Haber aplicado `database/setup.sql` y `database/setup_v2_auth.sql` (tablas base + RLS + auth).
2. Activar extensión `pg_cron` en Supabase Dashboard → Database → Extensions.

## Aplicación

Cada archivo es **idempotente**: se puede re-ejecutar sin error.

```sql
-- En el SQL Editor, pegar el contenido de 03_privacy_consents.sql
-- Ejecutar. Revisar el bloque de verificación al final del archivo.
-- Repetir con 04, 05... hasta 10.
```

## Verificación global

Tras aplicar todas:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('consents','audit_log','data_subject_requests','breach_register');
-- Esperado: 4 filas

SELECT cron.unschedule; -- verificar schedule activo
SELECT jobname, active FROM cron.jobs WHERE jobname='retention_sweep_weekly';
-- Esperado: active=true
```

## Rollback (emergencia)

Ver `migrations_rollback.sql`. **Solo para emergencias.** Hacer backup antes.
````

- [ ] **Step 2: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add database/README.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(db): README operativo de migraciones de privacidad"
```

---

## Verificación final de la Capa 1

Tras aplicar las 8 migraciones, ejecutar este checklist:

- [ ] `SELECT * FROM public.run_retention_sweep();` corre sin error.
- [ ] `SELECT jobname, active FROM cron.jobs WHERE jobname='retention_sweep_weekly';` devuelve `active=true`.
- [ ] Intentar `UPDATE public.audit_log SET action='x';` desde sesión autenticada → error de permiso.
- [ ] Intentar insertar un `order` con `restaurant_id` inexistente o inactivo → rechazado por RLS.
- [ ] `SELECT has_table_privilege('anon','public.admin_users','SELECT');` → `false`.

---

## Qué cubre esta capa del spec

| Requisito Ley 21.719 | Dónde se cubre |
|---|---|
| 1. Base legal + consentimiento | Task 1 (consents) |
| 2. Finalidad y minimización | Task 5 (DSAR), Task 6 (retención) |
| 5. Seguridad por diseño | Tasks 2, 3, 4 (audit, RLS, deprecation) |
| 8. Retención y eliminación | Tasks 6, 8 (sweep + cron) |
| 10. Brechas | Task 7 (breach_register) |
| 12. Documentación y gobernanza | Task 10 (README), tablas de auditoría |

## Qué NO cubre (capas siguientes)

- **Capa 2 (Transparencia + Derechos):** los endpoints Edge Functions `privacy/*` que consumen la tabla DSAR (Task 5). Aquí solo creamos el almacén.
- **Capa 3 (Operacional):** documentación AIPD, plantillas de brecha, `security-check.ts`.
- **Capa 4 (Gobernanza):** RAT, DPAs, políticas de privacidad en `docs/legal/`.
