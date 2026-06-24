# CHANGELOG — Fase 1 P0 Hotfixes

**Branch:** `feature/fase-1-p0-hotfixes`
**Fecha:** 2026-06-22
**Base:** Plan de Remediación Segura CMOR FLOW

## Resumen

Implementación de los 8 P0 hotfixes críticos de seguridad identificados en la auditoría integral. Todos los fixes usan feature flags para staged rollout y cada migración SQL incluye plan de rollback documentado.

## Cambios por fix

### P0-1 — Eliminar RLS pública de `orders`
- **Migración SQL:** `supabase/migrations/20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql`
  - `DROP POLICY "Public can view orders" ON public.orders`
  - `ALTER TABLE orders ADD COLUMN access_token uuid` (backfill con `gen_random_uuid()`)
  - `CREATE FUNCTION get_my_order(p_token uuid)` (SECURITY DEFINER, one-shot, 24h TTL)
  - `REVOKE EXECUTE` en 4 RPCs admin heredadas (`admin_login`, `admin_create_restaurant`, `admin_toggle_restaurant_status`, `admin_reject_request`)
- **Frontend:**
  - `src/services/restaurantService.ts`: añadida `getMyOrder(accessToken)` que llama a la RPC `get_my_order`
- **Feature flag:** `use_order_token` (crear antes de activar)
- **Rollback:** re-crear política pública + re-GRANT EXECUTE (documentado en la migración)

### P0-2 — `auto_approve_registration_v2` con `is_admin()` check
- **Migración SQL:** `supabase/migrations/20260622000002_p0_2_auto_approve_registration_v2_is_admin.sql`
  - `CREATE OR REPLACE FUNCTION auto_approve_registration_v2` con 5 params (compatibilidad con `RegisterPage.tsx`)
  - Añade `is_admin()` check para planes pagos (`starter`, `pro`) con `p_provider != 'trial'`
  - `free_trial` sigue siendo auto-aprobable
  - Inserta en `audit_log` tras éxito
- **Frontend:**
  - `src/pages/public/RegisterPage.tsx`: cambia `p_payment_provider` de `"simulator"/"credit_card"` a `"trial"` para todos los planes. Si la RPC devuelve `unauthorized_paid_plan`, muestra mensaje al usuario indicando que el flujo de pago real se implementará en P1-7
- **Rollback:** restaurar `RegisterPage.tsx` a versión anterior + deployar migración que reemplace la función sin el check

### P0-3 — Verificación de identidad en Edge Functions DSAR
- **Migración SQL:** `supabase/migrations/20260622000003_p0_3_feature_flags.sql`
  - Crea tabla `feature_flags` con `enabled_globally`, `enabled_for_restaurants`, `disabled_for_restaurants`, `rollout_percentage`
  - Crea función `is_flag_enabled(p_key, p_restaurant_id)` (SECURITY DEFINER)
  - Inserta 6 flags iniciales (todos `enabled_globally = false`)
- **Helper compartido:** `supabase/functions/_shared/cors.ts`
  - `getCorsHeaders(req)` restringe CORS a 5 dominios propios
  - `verifyRequesterIdentity(supabase, req, email)` valida JWT y compara `session.user.email === email`
  - `checkRateLimit(supabase, ip, email)` limita 10 DSAR/IP/día y 3/email/30d
  - `getClientIp(req)` extrae IP de `x-forwarded-for`
- **Edge Function nueva:** `supabase/functions/verify-dsar/index.ts`
  - Recibe `{ token }`, busca DSAR `pending_verification`, valida expiración (24h), ejecuta la acción correspondiente (`erase`, `access`, `export`, `rectify`, `object`, `revoke-consent`), marca `fulfilled`
  - Exporta `executeErase()` para reuso desde `privacy-erase` y `verify-dsar`
- **Edge Functions modificadas (7):**
  - `privacy-erase/index.ts` (refactor completo): si JWT válido + email coincide → ejecuta directo; si no → crea DSAR `pending_verification` + envía email con `verification_token`. NO retorna `verification_token` en respuesta.
  - `privacy-access/index.ts` (refactor completo): mismo patrón que `privacy-erase`
  - `privacy-export/index.ts`, `privacy-rectify/index.ts`, `privacy-object/index.ts`, `privacy-revoke-consent/index.ts`, `invite-owner/index.ts`: CORS restringido + eliminado retorno de `verificationToken` (transformación masiva vía `scripts/apply_cors_fix.py`)
- **Página nueva:** `src/pages/public/VerifyDsar.tsx`
  - Recibe `?token=xxx`, llama a `verify-dsar` Edge Function, muestra estado (loading/success/expired/error)
- **Ruta nueva:** `src/App.tsx` añade `/verify-dsar` y `/verify-dsar/:token`
- **Feature flag:** `dsar_verification`
- **Rollback:** `UPDATE feature_flags SET enabled_globally = false WHERE key = 'dsar_verification'` — las Edge Functions detectan el flag y usan el flujo viejo

### P0-4 — Eliminar SHA-256 y pass-the-hash (parcial)
- **Migración SQL:** `supabase/migrations/20260622000005_p0_4_revoke_legacy_login.sql`
  - `REVOKE EXECUTE ON FUNCTION admin_login(text, text) FROM anon, authenticated`
  - `REVOKE EXECUTE ON FUNCTION restaurant_login(text, text) FROM anon, authenticated`
  - Safety check: aborta si >5% de `admin_users.migrated_at IS NULL`
- **DB seed:**
  - `database/setup.sql`: eliminado el INSERT con `admin@foodorder.com / admin123` (SHA-256 sin salt). Añadidas instrucciones para crear admin vía Dashboard o `seed_admin.sql`
  - `database/seed_admin.sql`: comentado el hash bcrypt hardcodeado `$2b$10$SB4D8WspXAHkb9nZqD954OMfOrCLVMB0.At6rD0bVDc6EPDY.ePIS`. Ahora pide generar hash localmente con `node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD',10))"`
- **Frontend:**
  - `src/config/supabase.ts`: añadido comentario explicando que la eliminación del `MockSupabaseClient` del bundle (dynamic import) se realiza en P1-6 (refactor estructural)
- **Prerrequisito:** M-1 (migración passwords → Supabase Auth) debe estar al 95%+
- **Rollback:** `GRANT EXECUTE ON FUNCTION admin_login/restaurant_login TO anon, authenticated`

### P0-5 — Headers HTTP + CORS restringido
- **`vercel.json`:** añadidos 6 headers de seguridad para todas las rutas:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy` con whitelist estricta (script-src 'self', img-src 'self' data: https://*.supabase.co, connect-src 'self' https://*.supabase.co wss://*.supabase.co, etc.)
- **CORS en 7 Edge Functions:** restringido a 5 dominios propios (vía `_shared/cors.ts`)
- **Rollback:** revertir `vercel.json` + redeployar Edge Functions con CORS `*`

### P0-6 — Plazo DSAR correcto en 5 documentos legales
- **Documentos modificados (5):**
  - `docs/legal/politica_privacidad_b2b.md`: "30 días corridos / 15 días para rectificación" → "10 días hábiles, prorrogables por 5 días hábiles adicionales en casos complejos (art. 19 Ley N° 21.719)"
  - `docs/legal/politica_privacidad_clientes.md`: mismo cambio
  - `docs/legal/aviso_privacidad_b2b.md`: "plazo máximo 30 días" → "plazo máximo: 10 días hábiles, prorrogables a 15 en casos complejos"
  - `docs/legal/contacto_dpo.md`: SLA actualizado + referencia legal actualizada de Ley N° 19.628 a Ley N° 21.719
  - `docs/contratos/DPA_cmor_restaurante.md`: cláusula 11 actualizada
- **Versionado:** `docs/legal/VERSION.md` bumped a 2026-06-22 con changelog detallado
- **Rollback:** revertir los 5 archivos + VERSION.md

### P0-7 — SQL inválido en `00_APLICAR_TODO_SUPABASE.sql:289`
- **Migración SQL:** `supabase/migrations/20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql` (incluida en P0-1)
  - `CREATE POLICY IF EXISTS dsr_insert_any` (sintaxis inválida en PostgreSQL) reemplazado por `DROP POLICY IF EXISTS dsr_insert_any; CREATE POLICY dsr_insert_any ...`
- **Rollback:** N/A (la línea ya fallaba)

### P0-8 — Imágenes base64 → Supabase Storage
- **Migración SQL:** `supabase/migrations/20260622000004_p0_8_validate_image_urls.sql`
  - `ALTER TABLE menu_items ADD CONSTRAINT menu_items_image_urls_size CHECK (octet_length(image_urls::text) < 5000)`
  - `CREATE FUNCTION validate_image_urls()` trigger: valida máximo 3 elementos, cada uno debe ser `^https?://`
  - `CREATE TRIGGER trg_validate_image_urls BEFORE INSERT OR UPDATE OF image_urls`
- **Migración SQL:** `supabase/migrations/20260622000006_p0_8_create_bucket_menu_images.sql`
  - `INSERT INTO storage.buckets (id='menu-images', public=false, file_size_limit=2MB, allowed_mime_types=[jpeg,png,webp])`
  - 4 políticas de acceso: owners INSERT/SELECT/DELETE en su restaurant_id, anon SELECT vía URL firmada
- **Frontend:** `src/components/ImageDropZone.tsx` refactorizado:
  - Si `storagePath` está definido y Supabase real activo → sube a Storage y devuelve URL firmada (100 años)
  - Si no → fallback a base64 (compatibilidad con mock y datos legacy)
  - Compresión a Blob (más eficiente que base64)
  - Indicador de "Subiendo..." durante upload
  - Borrar imagen en Storage al hacer remove
- **Prerrequisito:** M-2 (migración de imágenes base64 existentes a Storage) — script por crear
- **Rollback:** `UPDATE feature_flags SET enabled_globally = false WHERE key = 'storage_only_images'`. El frontend vuelve a base64 automáticamente

## Migraciones SQL creadas (6)

| # | Archivo | Fix |
|---|---------|-----|
| 1 | `20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql` | P0-1, P0-3 (RPCs), P0-7 |
| 2 | `20260622000002_p0_2_auto_approve_registration_v2_is_admin.sql` | P0-2 |
| 3 | `20260622000003_p0_3_feature_flags.sql` | P0-3 (tabla feature_flags) |
| 4 | `20260622000004_p0_8_validate_image_urls.sql` | P0-8 (trigger) |
| 5 | `20260622000005_p0_4_revoke_legacy_login.sql` | P0-4 |
| 6 | `20260622000006_p0_8_create_bucket_menu_images.sql` | P0-8 (bucket) |

## Archivos modificados (frontend + docs)

| Archivo | Fix | Tipo |
|---------|-----|------|
| `vercel.json` | P0-5 | Editado |
| `src/App.tsx` | P0-3 | Editado (añadida ruta) |
| `src/components/ImageDropZone.tsx` | P0-8 | Refactor completo |
| `src/config/supabase.ts` | P0-4 | Comentario explicativo |
| `src/pages/public/RegisterPage.tsx` | P0-2 | Editado |
| `src/pages/public/VerifyDsar.tsx` | P0-3 | **Nuevo** |
| `src/services/restaurantService.ts` | P0-1 | Añadida `getMyOrder()` |
| `database/setup.sql` | P0-4 | Eliminado seed admin123 |
| `database/seed_admin.sql` | P0-4 | Comentado hash bcrypt |
| `docs/legal/politica_privacidad_b2b.md` | P0-6 | Editado |
| `docs/legal/politica_privacidad_clientes.md` | P0-6 | Editado |
| `docs/legal/aviso_privacidad_b2b.md` | P0-6 | Editado |
| `docs/legal/contacto_dpo.md` | P0-6 | Editado |
| `docs/legal/VERSION.md` | P0-6 | Bumped a 2026-06-22 |
| `docs/contratos/DPA_cmor_restaurante.md` | P0-6 | Editado |

## Archivos nuevos (Edge Functions)

| Archivo | Fix | Descripción |
|---------|-----|-------------|
| `supabase/functions/_shared/cors.ts` | P0-3, P0-5 | Helper CORS + identity + rate-limit |
| `supabase/functions/verify-dsar/index.ts` | P0-3 | Ejecuta DSAR tras click en email |

## Archivos modificados (Edge Functions)

| Archivo | Fix | Descripción |
|---------|-----|-------------|
| `supabase/functions/privacy-erase/index.ts` | P0-3, P0-5 | Refactor completo |
| `supabase/functions/privacy-access/index.ts` | P0-3, P0-5 | Refactor completo |
| `supabase/functions/privacy-export/index.ts` | P0-5 | CORS + sin verificationToken |
| `supabase/functions/privacy-rectify/index.ts` | P0-5 | CORS + sin verificationToken |
| `supabase/functions/privacy-object/index.ts` | P0-5 | CORS + sin verificationToken |
| `supabase/functions/privacy-revoke-consent/index.ts` | P0-5 | CORS + sin verificationToken |
| `supabase/functions/invite-owner/index.ts` | P0-5 | CORS restringido |

## Próximos pasos para aplicar en producción

### Pre-requisitos (Fase 0 — Setup)
1. ✅ Branch creada: `feature/fase-1-p0-hotfixes`
2. ⏳ Implementar 30 tests de regresión (10 unit + 10 integ + 5 E2E + 5 security)
3. ⏳ Configurar GitHub Actions CI
4. ⏳ Instalar Supabase CLI y linkear proyecto prod
5. ⏳ Ejecutar backup completo de DB prod
6. ⏳ Inicializar Sentry con release tracking

### Migraciones de datos (paralelas a Fase 1)
- ⏳ M-1: Migrar passwords SHA-256 → Supabase Auth (vía magic link invite)
- ⏳ M-2: Migrar imágenes base64 → Storage (script `scripts/migrate_images.ts` por crear)
- ⏳ M-3: Backfill access_token en orders (incluido en migración 1)
- ⏳ M-6: Migrar admin_users legacy → profiles

### Aplicar Fase 1 (orden recomendado)
1. Aplicar migración 3 (feature_flags) en prod
2. Deploy Edge Functions (incluye `_shared/cors.ts` y `verify-dsar`)
3. Deploy frontend a Vercel preview
4. Aplicar migraciones 1, 2, 4, 6 (sin 5 todavía) en staging
5. Smoke tests en staging
6. Aplicar mismas migraciones en prod
7. Activar flags al 10%: `use_order_token`, `new_registration_flow`, `dsar_verification`, `storage_only_images`
8. Monitorear Sentry 24h
9. Si OK, escalar a 50% → 100%
10. Tras M-1 al 95%+, aplicar migración 5 (P0-4 REVOKE admin_login)
11. Comunicar a restaurantes el cambio de plazo DSAR (Ley 21.719)
12. Pentest externo para validar fixes

### Pendiente para Fase 2
- P1-6: Refactor `src/config/supabase.ts` para dynamic import de `MockSupabaseClient`
- P1-7: Integración real de Webpay Plus para planes pagos
- M-2: Script `scripts/migrate_images.ts` para migrar imágenes base64 existentes
- Helper de Supabase Storage en `Menu.tsx` para usar `storagePath` con `ImageDropZone`
