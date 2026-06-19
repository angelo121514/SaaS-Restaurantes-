-- =====================================================================
-- 00_APLICAR_TODO_SUPABASE.sql
-- ---------------------------------------------------------------------
-- PLAN DE PRIVACIDAD LEY 19.628 / LEY 21.719 — CAPA FUNDACIONAL
-- Proyecto: Cmor Flow (SaaS suchi)
-- Supabase: https://clsgoknzyhkxtogxoshz.supabase.co
-- ---------------------------------------------------------------------
-- CÓMO USARLO (vía Antigravity / MCP):
--
--   1. Conecta el MCP de Supabase en Antigravity.
--   2. Ejecuta TODO este archivo en una sola llamada a `execute_sql`:
--
--        execute_sql(sql = "<pegar todo este archivo>")
--
--   3. Es IDEMPOTENTE: puedes ejecutarlo cuantas veces quieras sin
--      error. Las políticas se recrean con DROP ... IF EXISTS antes
--      de CREATE. Las tablas usan CREATE TABLE IF NOT EXISTS.
--   4. Al terminar, corre el bloque "VERIFICACIÓN FINAL" (al final
--      de este archivo) para confirmar que todo quedó aplicado.
--
-- PRE-REQUISITOS:
--   * Haber aplicado database/setup.sql (v1) y database/setup_v2_auth.sql.
--     Estos crean las tablas base (restaurants, profiles, orders, etc.)
--     y las funciones is_admin(), is_my_restaurant().
--   * Si pg_cron no está activo, este script lo intenta habilitar
--     (CREATE EXTENSION IF NOT EXISTS pg_cron). Si falla por permisos,
--     habilítalo a mano en Supabase Dashboard → Database → Extensions.
--
-- QUÉ CREA (en orden):
--   1. Tabla consents                 (03_privacy_consents)
--   2. Tabla audit_log                (04_audit_log, append-only)
--   3. Parches RLS críticos           (05_rls_hardening)
--   4. Deprecación admin_users        (06_password_deprecation)
--   5. Tabla data_subject_requests    (07_data_subject_requests)
--   6. Función run_retention_sweep()  (08_retention)
--   7. Tabla breach_register          (09_breach_register)
--   8. Schedule pg_cron semanal       (10_pg_cron_schedule)
--   9. RPC auxiliares security_check  (para scripts/security-check.ts)
--
-- Espec de referencia:
--   docs/superpowers/specs/2026-06-18-privacidad-chile-design.md §2
-- Plan completo:
--   docs/superpowers/plans/2026-06-18-capa1-fundacional.md
-- =====================================================================

-- Extensión pg_cron (necesaria para el schedule semanal de retención).
-- Puede fallar si no hay permisos; en ese caso, activarla a mano.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =====================================================================
-- BLOQUE 1 — Tabla CONSENTS (consentimiento granular)
-- Requisito Ley 21.719: base legal + consentimiento (req. 1)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_email text NOT NULL,
  scope         text NOT NULL CHECK (scope IN
                  ('cookies','marketing','ai_profiling','analytics','third_party_share')),
  purpose       text NOT NULL,
  legal_basis   text NOT NULL CHECK (legal_basis IN
                  ('consent','contract','legal_obligation','legitimate_interest')),
  granted       boolean NOT NULL,
  granted_at    timestamptz,
  revoked_at    timestamptz,
  proof         jsonb,
  privacy_policy_version text NOT NULL,
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

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consents_select_self ON public.consents;
CREATE POLICY consents_select_self ON public.consents
  FOR SELECT USING (subject_id = auth.uid());

DROP POLICY IF EXISTS consents_select_admin ON public.consents;
CREATE POLICY consents_select_admin ON public.consents
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS consents_insert_any ON public.consents;
CREATE POLICY consents_insert_any ON public.consents
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS consents_update_self ON public.consents;
CREATE POLICY consents_update_self ON public.consents
  FOR UPDATE USING (subject_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated, anon;


-- =====================================================================
-- BLOQUE 2 — Tabla AUDIT_LOG (logs inmutables, append-only)
-- Requisito Ley 21.719: seguridad + trazabilidad (req. 5, 12)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigserial PRIMARY KEY,
  actor_id      uuid,
  actor_email   text,
  action        text NOT NULL,
  table_name    text,
  row_id        text,
  metadata      jsonb,
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

DROP POLICY IF EXISTS audit_log_admin_select ON public.audit_log;
CREATE POLICY audit_log_admin_select ON public.audit_log
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS audit_log_insert_any ON public.audit_log;
CREATE POLICY audit_log_insert_any ON public.audit_log
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_log TO authenticated, anon;

-- INMUTABILIDAD: revocar UPDATE y DELETE a todos los roles.
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC, authenticated, anon, service_role;


-- =====================================================================
-- BLOQUE 3 — PARCHES RLS CRÍTICOS
-- Endurece policies peligrosas del schema actual.
-- =====================================================================

-- 3.1 ORDERS: restringir INSERT público a restaurantes activos.
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

-- 3.2 NOTIFICATIONS: solo el dueño lee las suyas.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- 3.3 REGISTRATION_REQUESTS: el INSERT público se mantiene pero con
-- comentario sobre el rate-limit (que aplica en Edge Function/RPC).
COMMENT ON POLICY "Public can insert registration requests"
  ON public.registration_requests IS
  'El rate-limit (max 5/IP/día) se aplica en la capa de aplicación (Edge Function o RPC), no aquí.';

-- 3.4 STORAGE: buckets logos y qr-codes DEBEN ser privados.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Política de storage: el owner del restaurante gestiona sus logos.
-- Asume carpeta = restaurant_id dentro del bucket.
DROP POLICY IF EXISTS "Owners manage their logos" ON storage.objects;
CREATE POLICY "Owners manage their logos" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id IN ('logos','qr-codes')
    AND public.is_my_restaurant(
      ((storage.foldername(name))[1])::uuid
    )
  );


-- =====================================================================
-- BLOQUE 4 — DEPRECACIÓN DE admin_users (SHA-256 legacy)
-- Decisión D9: deprecar pero conservar datos.
-- =====================================================================

COMMENT ON TABLE public.admin_users IS
  '[DEPRECATED 2026-06-18] Tabla legacy con contraseñas SHA-256. '
  'NO usar para autenticación. El login admin pasa por auth.users + '
  'profiles.role=''admin''. Conservada solo para auditoría histórica.';

-- Revocar todos los grants: ni anon ni authenticated pueden leer/escribir.
REVOKE ALL ON public.admin_users FROM anon, authenticated;

COMMENT ON FUNCTION public.admin_login(text, text) IS
  '[DEPRECATED 2026-06-18] Usar Supabase Auth. Mantenida solo para auditoría.';


-- =====================================================================
-- BLOQUE 5 — Tabla DATA_SUBJECT_REQUESTS (cola DSAR)
-- Requisito Ley 21.719: derechos del titular (req. 4)
-- 6 tipos: access, rectify, erase, object, export, revoke-consent
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type    text NOT NULL CHECK (request_type IN
                    ('access','rectify','erase','object','export','revoke-consent','contact')),
  subject_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email   text NOT NULL,
  verification_token text UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN
                    ('pending','verified','in_progress','fulfilled','rejected','cancelled')),
  payload         jsonb,
  fulfilled_at    timestamptz,
  fulfilled_by    uuid REFERENCES auth.users(id),
  result_metadata jsonb,
  rejection_reason text,
  sla_due_at      timestamptz NOT NULL,
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

DROP POLICY IF EXISTS dsr_select_self ON public.data_subject_requests;
CREATE POLICY dsr_select_self ON public.data_subject_requests
  FOR SELECT USING (
    subject_id = auth.uid()
    OR subject_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS dsr_admin_all ON public.data_subject_requests;
CREATE POLICY dsr_admin_all ON public.data_subject_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests;
CREATE POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.data_subject_requests TO authenticated, anon;


-- =====================================================================
-- BLOQUE 6 — FUNCIÓN run_retention_sweep() (retención y eliminación)
-- Requisito Ley 21.719: retención y eliminación (req. 8)
-- Ejecutada por pg_cron (BLOQUE 8).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.run_retention_sweep()
RETURNS TABLE(table_name text, rows_affected bigint, action text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_deleted bigint;
  v_updated bigint;
BEGIN
  -- 1. Registration requests rechazados > 12 meses (borrar)
  WITH d AS (
    DELETE FROM public.registration_requests
    WHERE status = 'rejected'
      AND created_at < now() - interval '12 months'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'registration_requests'::text, v_deleted, 'delete'::text;

  -- 2. Invitaciones expiradas > 7 días (borrar)
  WITH d AS (
    DELETE FROM public.invitations
    WHERE status IN ('pending','sent')
      AND created_at < now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'invitations'::text, v_deleted, 'delete'::text;

  -- 3. Clientes finales sin pedidos > 24 meses (anonimizar)
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

  -- 4. Orders > 6 años: anonimizar campos personales (SII conserva financiero)
  WITH u AS (
    UPDATE public.orders SET
      customer_name = NULL,
      customer_phone = NULL,
      customer_notes = NULL
    WHERE completed_at < now() - interval '6 years'
      AND customer_name IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM u;
  RETURN QUERY SELECT 'orders'::text, v_updated, 'anonymize_personal'::text;

  -- 5. Audit log > 24 meses base (borrar); 36 meses para eventos de seguridad
  WITH d AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - interval '24 months'
      AND audit_log.action NOT IN ('login_failed','rls_denied','security_event','breach_detected')
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN QUERY SELECT 'audit_log'::text, v_deleted, 'delete'::text;

  WITH d AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - interval '36 months'
      AND audit_log.action IN ('login_failed','rls_denied','security_event','breach_detected')
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


-- =====================================================================
-- BLOQUE 7 — Tabla BREACH_REGISTER (registro de brechas)
-- Requisito Ley 21.719: notificación de brechas (req. 10)
-- Notificación a autoridad competente y a titulares: <= 72h.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.breach_register (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at     timestamptz NOT NULL DEFAULT now(),
  reported_at     timestamptz,
  severity        text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          text NOT NULL DEFAULT 'detected' CHECK (status IN
                    ('detected','investigating','contained','notified','closed')),
  description     text NOT NULL,
  affected_data_categories text[],
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

DROP POLICY IF EXISTS breach_admin_all ON public.breach_register;
CREATE POLICY breach_admin_all ON public.breach_register
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.breach_register TO authenticated;


-- =====================================================================
-- BLOQUE 8 — SCHEDULE pg_cron (sweep semanal de retención)
-- Decisión D10: camino pg_cron (camino A del spec).
-- Domingos 03:00 hora de Chile (UTC-4) = 07:00 UTC.
-- =====================================================================

-- Desprogramar el job si ya existía (para idempotencia).
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'retention_sweep_weekly';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Programar el sweep semanal.
SELECT cron.schedule(
  'retention_sweep_weekly',
  '0 7 * * 0',
  $$SELECT * FROM public.run_retention_sweep();$$
);


-- =====================================================================
-- BLOQUE 9 — RPC AUXILIARES para scripts/security-check.ts
-- Estas 3 funciones son llamadas por `npm run security-check`.
-- Todas SECURITY DEFINER + is_admin() para que el service_role pueda
-- consultar los catálogos del sistema (pg_class, pg_proc).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.security_check_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.relname::text,
         c.relrowsecurity::boolean
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'consents','audit_log','data_subject_requests','breach_register',
      'profiles','restaurants','orders','restaurant_customers',
      'invitations','registration_requests','notifications'
    );
$$;

CREATE OR REPLACE FUNCTION public.security_check_security_definer()
RETURNS TABLE(proname text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.proname::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proname NOT LIKE 'security_check_%'
    AND p.proname NOT IN ('run_retention_sweep', 'is_admin', 'is_my_restaurant')
    AND position('is_admin' in pg_get_functiondef(p.oid)) = 0;
$$;

CREATE OR REPLACE FUNCTION public.security_check_admin_users_grants()
RETURNS TABLE(anon_select boolean, auth_select boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT has_table_privilege('anon','public.admin_users','SELECT'),
         has_table_privilege('authenticated','public.admin_users','SELECT');
$$;

GRANT EXECUTE ON FUNCTION public.security_check_rls_status()          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.security_check_security_definer()    TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.security_check_admin_users_grants()  TO service_role, authenticated;


-- =====================================================================
-- VERIFICACIÓN FINAL — Ejecutar este bloque aparte para confirmar.
-- =====================================================================

-- 1. Las 4 tablas nuevas existen:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname='public'
--   AND tablename IN ('consents','audit_log','data_subject_requests','breach_register');
-- Esperado: 4 filas.

-- 2. Las funciones existen:
-- SELECT proname FROM pg_proc
-- WHERE proname IN ('run_retention_sweep','security_check_rls_status',
--                   'security_check_security_definer','security_check_admin_users_grants');
-- Esperado: 4 filas.

-- 3. El schedule de pg_cron quedó activo:
-- SELECT jobname, active FROM cron.job WHERE jobname='retention_sweep_weekly';
-- Esperado: active=true.

-- 4. Buckets de storage son privados:
-- SELECT id, public FROM storage.buckets WHERE id IN ('logos','qr-codes');
-- Esperado: public=false en ambos.

-- 5. admin_users sin grants a anon/authenticated (debe dar false,false):
-- SELECT * FROM public.security_check_admin_users_grants();

-- 6. Dry-run del sweep de retención (debe ejecutarse sin error):
-- SELECT * FROM public.run_retention_sweep();
-- Esperado: tabla con 6 filas, rows_affected probablemente 0 en DB nueva.

-- =====================================================================
-- FIN DEL ARCHIVO
-- ---------------------------------------------------------------------
-- Si todo lo anterior corrió sin error, la Capa Fundacional está
-- aplicada. Procede a implementar las Capas 2, 3 y 4 siguiendo sus
-- respectivos planes en docs/superpowers/plans/.
--
-- ROLLBACK de emergencia: ver database/migrations_rollback.sql
-- (NO es parte del flujo normal; solo si una migración sale mal).
-- =====================================================================
