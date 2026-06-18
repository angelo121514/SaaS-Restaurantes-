# Diseño — Plan de Privacidad (Ley 19.628 + Ley 21.719) — SaaS suchi

- **Proyecto:** `C:/Users/angel/Desktop/Code/SaaS suchi` (Cmor Flow — SaaS POS para restaurantes)
- **Fecha:** 2026-06-18
- **Marco normativo:** Ley N° 19.628 (protección de datos personales) y Ley N° 21.719 (vigencia nacional: **1 de diciembre de 2026**), inspirada en el RGPD.
- **Enfoque:** por capas de madurez (A), 4 capas en orden de dependencia técnica.
- **Disclaimer legal:** los documentos legales (política, aviso, DPA, AIPD) son **borradores técnicos**. Requieren revisión de un abogado chileno antes de publicación oficial.

---

## Decisiones aprobadas

| # | Decisión | Valor |
|---|---|---|
| D1 | Stack destino | Vite + React 19 + Supabase + Edge Functions. N8N opcional. No asumir Next.js. |
| D2 | Profundidad | Entregable completo (12 requisitos del prompt original). |
| D3 | Documentos legales | Borradores técnicos accionables con disclaimer de revisión abogado. |
| D4 | Aplicación SQL | Archivos `.sql` numerados en `database/`. Aplicación por MCP desde Antigravity (otra vía), NO esta sesión. |
| D5 | Responsable del tratamiento | Compartido: Cmor Flow responsable B2B (owners/staff/admins); Restaurantes responsables de clientes finales; Cmor Flow encargado de los clientes finales que procesa. |
| D6 | Enfoque | A — 4 capas de madurez. |
| D7 | Retenciones por defecto | B2B: contrato + 90 días. Clientes: 24 meses sin pedidos. Orders: 6 años (SII). Prospectos: 12 meses. Tokens: 7 días. Audit log: 24 meses. Consents: revocación + 3 años. DSARs: 6 años. |
| D8 | MFA obligatorio | Roles `admin` y `owner`. `staff` opcional. |
| D9 | `admin_users` legacy | Deprecar (COMMENT + REVOKE), conservar datos, login admin pasa solo por Supabase Auth. |
| D10 | Camino de retención | pg_cron (camino A). |
| D11 | AIPD-03 chatbot | Dormida (preparatoria). Hoy el chatbot es keyword-based, no LLM. |
| D12 | Autoridad competente | Genérico: "la autoridad competente" (la autoridad final bajo Ley 21.719 se está definiendo). |

---

## Sección 1 — Arquitectura y mapa de datos ✅

### 1.1 Actores y responsabilidades

| # | Actor | Rol legal | Datos |
|---|---|---|---|
| 1 | Cmor Flow | Responsable B2B | email, nombre, teléfono, ciudad, dirección, auth, logs, invitaciones |
| 2 | Restaurante | Responsable de clientes finales y prospectos locales | customer_name, phone, email, notas, pedidos |
| 3 | Cmor Flow (encargado) | Encargado de los datos de clientes finales | Almacena/procesa en Supabase lo que el restaurante introduce |
| 4 | Vercel, Supabase, email provider | Encargados subcontratados (USA) | Hosting, DB, Auth, Storage, Realtime, Edge Functions |

### 1.2 Flujo de datos

```
Navegador (Vite SPA)
   ↓ HTTPS/TLS 1.2+ (Vercel edge)
Supabase (AES-256 reposo)
   ├─ auth.users, profiles, restaurants, registration_requests
   ├─ restaurant_customers, orders, invitations
   └─ Storage (logos/QR), Realtime
   ↓ HTTPS
Edge Functions
   ├─ invite-owner (existe)
   └─ privacy/* (nuevas)
   ↓ HTTPS
Terceros: Vercel (USA), Supabase (USA/AWS), email provider, N8N (opcional)
```

### 1.3 Inventario de categorías de datos (con retención D7)

| Categoría | Campos | Tablas | Sensible | Retención |
|---|---|---|---|---|
| Identidad B2B | owner_name, display_name | restaurants, profiles | No | Contrato + 90 días |
| Contacto B2B | email, phone, city, address | restaurants, profiles | No | Contrato + 90 días |
| Autenticación | password_hash, last_login_at | auth.users, users (legacy) | Crítica | Hasta baja |
| Identidad cliente | customer_name | restaurant_customers, orders | No | 24 meses |
| Contacto cliente | phone, email | restaurant_customers, orders | No | 24 meses |
| Transaccional | items, total, payment_method | orders | No (financiero) | 6 años (SII) |
| Tokens | token | invitations | Crítica | 7 días |
| Operativos | internal_notes, block_reason | varias | No | Igual que tabla padre |
| IA (chatbot) | mensajes | (no persistidos) | — | 0 — stateless, no entrena |

### 1.4 Hard defaults

- No se persisten conversaciones del AiChatbot (stateless).
- No se usan datos personales para entrenar modelos sin consentimiento explícito + AIPD.
- `admin_users` SHA-256 se depreca (D9).
- Transferencias USA se documentan con SCC (no repatriación).
- Idioma: español de Chile.

---

## Sección 2 — Capa Fundacional ✅

### 2.1 Archivos SQL a generar

```
database/
├── 03_privacy_consents.sql        ← tabla consents (granular)
├── 04_audit_log.sql               ← audit_log append-only
├── 05_rls_hardening.sql           ← arregla WITH CHECK (true)
├── 06_password_deprecation.sql    ← admin_users deprecated
├── 07_data_subject_requests.sql   ← cola de DSAR
├── 08_retention.sql               ← funciones de retención
├── 09_breach_register.sql         ← registro de brechas
├── 10_pg_cron_schedule.sql        ← schedule del sweep (camino A)
└── migrations_rollback.sql        ← reversión idempotente
```

### 2.2 Tablas nuevas (esquema)

**`consents`**
```sql
id uuid PK, subject_id uuid NULL, subject_email text NOT NULL,
scope text CHECK IN ('cookies','marketing','ai_profiling','analytics','third_party_share'),
purpose text NOT NULL, legal_basis text CHECK IN ('consent','contract','legal_obligation','legitimate_interest'),
granted boolean, granted_at timestamptz, revoked_at timestamptz,
proof jsonb, privacy_policy_version text, created_at timestamptz
```

**`audit_log`** (append-only)
```sql
id bigserial PK, actor_id uuid, actor_email text, action text, table_name text,
row_id text, metadata jsonb, ip inet, user_agent text, created_at timestamptz
WITH (fillfactor=95); REVOKE UPDATE, DELETE FROM public;
```

### 2.3 Parches RLS críticos (`05_rls_hardening.sql`)

| Problema | Fix |
|---|---|
| `orders` INSERT `WITH CHECK (true)` | Validar `restaurant_id` activo + rate-limit por IP |
| `registration_requests` INSERT libre | Honeypot + límite **5 envíos por IP/día** (RPC SECURITY DEFINER) |
| `notifications` sin política efectiva | Política por `user_id = auth.uid()` |
| Storage sin política de bucket | Bucket privado para logos/QR con URLs firmadas 1h. **Nota:** los logos públicos que el restaurante comparte en su landing pasan a servirse vía URL firmada renovable (no rompe la landing; se firma al cargar la página). Los objetos con visibilidad pública permanente quedan prohibidos. |

### 2.4 UI consentimiento granular

- **Componente:** `src/components/privacy/ConsentManager.tsx`
- **Estado JSON:** scopes `necessary` (no revocable), `analytics`, `marketing`, `ai_profiling` (revocables).
- **Banner inicial:** "Aceptar todo" / "Solo necesarias" / "Personalizar".
- **Revocación:** `/account/privacy` (auth) o enlace email (no auth).

```json
{
  "version": "1.0.0",
  "grantedAt": "2026-06-18T12:00:00-04:00",
  "policyVersion": "2026-06-01",
  "scopes": {
    "necessary":    { "granted": true,  "revocable": false },
    "analytics":    { "granted": false, "revocable": true  },
    "marketing":    { "granted": false, "revocable": true  },
    "ai_profiling": { "granted": false, "revocable": true  }
  },
  "proof": { "ip": "x.x.x.x", "userAgent": "...", "via": "cookie_banner" }
}
```

### 2.5 MFA y RBAC

- MFA TOTP obligatorio para `admin` y `owner` (D8). `staff` opcional.
- Bloquear login si `role IN ('admin','owner')` sin MFA activado.
- Roles RBAC existentes (`owner/staff/admin`) en `profiles.role`.
- Revisión de grants `anon` vs `authenticated`: restringir `admin_login`/`restaurant_login` o migrar a Supabase Auth.

### 2.6 Cifrado

| Capa | Estado |
|---|---|
| En tránsito | TLS 1.2+ (Vercel + Supabase) ✅ |
| En reposo DB | AES-256 Postgres (Supabase) ✅ |
| En reposo Storage | AES-256 (Supabase Storage) ✅ |
| Campos sensibles | No obligatorio hoy (AES-256 DB basta); pgcrypto disponible si se requiere futuro |

### 2.7 Logs inmutables

- `audit_log` append-only (REVOKE UPDATE/DELETE ni siquiera admin).
- Nunca contenido de campos personales en `metadata` — solo referencias.

---

## Sección 3 — Capa de Transparencia y Derechos ✅

### 3.1 Documentos legales (4, español de Chile, versionados)

| Documento | Para quién | Dónde |
|---|---|---|
| Política de privacidad B2B | Owners, staff, admins | Footer `/legal/privacidad` + alta de cuenta |
| Aviso de privacidad B2B (resumen) | Owners, staff | Modal primer login + link en `/restaurant/settings` |
| Política de privacidad clientes finales | Clientes `/menu/:slug` | Footer del menú + modal al ingresar datos |
| Términos + DPA cliente | Owners onboarding | Checkbox en `/register` |

Cada documento con 10 bloques: responsable, finalidades, categorías, destinatarios, transferencias, derechos, conservación, DPO, base legal, reclamación.

### 3.2 Derechos del titular (DSAR) — 6 endpoints Edge Functions

| Derecho | Endpoint | Plazo |
|---|---|---|
| Acceso | `privacy/access` | 30 días |
| Rectificación | `privacy/rectify` | 15 días |
| Cancelación | `privacy/erase` | 30 días (+ purge backups) |
| Oposición | `privacy/object` | 30 días |
| Portabilidad | `privacy/export` | 30 días (JSON/CSV) |
| Revocación | `privacy/revoke-consent` | Inmediato |

**Flujo:**
```
Titular → POST /privacy/{endpoint} (con token de verificación por email)
   → data_subject_requests fila status='pending', requested_at=now()
   → Cron/N8N alerta al DPO si > SLA
   → DPO revisa en /admin/privacy → RPC privacy_fulfill_request()
   → audit_log + confirmación al titular (export adjunto si aplica)
```

**Validaciones:**
- Token de un solo uso al email del titular.
- Rate-limit: máx. 3 DSAR por titular/mes.
- Conflictos legales: si hay obligación de retención (orders 6 años SII), `privacy/erase` **anonimiza** (`customer_name=NULL`, `phone=NULL`, `anonymized_at=now()`) en vez de borrar.

### 3.3 Rutas frontend nuevas

```
/legal/privacidad              ← política B2B (pública)
/legal/privacidad-clientes     ← política clientes (pública)
/legal/contacto-dpo            ← formulario de contacto DPO (pública)
/account/privacy               ← panel owner/staff: consentimientos + DSAR
/account/privacy/export        ← descarga portabilidad
/menu/:slug/privacidad         ← versión corta clientes
/admin/privacy                 ← bandeja DPO: DSARs, consents, audit_log
```

### 3.4 Componentes nuevos

- `ConsentManager.tsx`, `CookieBanner.tsx`, `DsarForm.tsx`, `PrivacyPolicyModal.tsx`
- `src/pages/restaurant/Privacy.tsx`, `src/pages/admin/Privacy.tsx`, `src/pages/public/Privacy.tsx`

### 3.5 Canal DPO

- Email: `dpo@cmorflow.cl` (placeholder editable).
- Formulario `/legal/contacto-dpo` (graba en `data_subject_requests` con `type='contact'`).
- SLA publicado: 30 días máximo.

### 3.6 Cancelación de copias en backups

- Postgres backups automáticos 7-30 días, no borrables retroactivamente.
- Estrategia: marcar `anonymized_at` + registro en `audit_log`. Los backups viejos expiran naturalmente. Dato queda inaccesible vía RLS tras anonimización.
- Storage: borrar objetos + invalidar URLs firmadas.

### 3.7 Aviso in-app (B2B)

Modal obligatorio al primer login owner/staff:
- He leído la política (link).
- Consiento tratamiento para prestación del servicio (necesario, no revocable sin cancelar cuenta).
- Consiento marketing (revocable).
- Consiento analítica de uso (revocable).

Aceptación se graba en `consents` con `proof`.

---

## Sección 4 — Capa Operacional ✅

### 4.1 Retención y eliminación

Tabla maestra (D7). Implementación `08_retention.sql` con `run_retention_sweep()`:
- `DELETE registration_requests` > 12 meses (rejected).
- `DELETE invitations` expiradas.
- `UPDATE restaurant_customers` → anonimizar si > 24 meses sin pedidos.
- `UPDATE orders` → anonimizar personales si completed_at > 6 años.
- Cada bloque loguea en `audit_log`.

**Camino: pg_cron (D10)** — `10_pg_cron_schedule.sql`:
```sql
SELECT cron.schedule('retention_sweep', '0 3 * * 0', 'SELECT run_retention_sweep()');
```
Requiere activar extensión `pg_cron` en Supabase.

### 4.2 Proceso de brechas (requisito 10)

**Detección:** alertas Supabase (Auth rate-limit, RLS denials) + consultas sobre `audit_log` + vista `admin/security/anomalies`.

**Registro — tabla nueva `09_breach_register.sql`:**
```sql
id uuid PK, detected_at, reported_at, severity CHECK IN ('low','medium','high','critical'),
status CHECK IN ('detected','investigating','contained','notified','closed'),
description, affected_data_categories text[], affected_subjects_count integer,
containment_measures, root_cause, authority_notified_at, subjects_notified_at, created_by
```

**Flujo 72h:**
```
Detección → breach_register (detected)
  → evaluación DPO (máx 24h)
  → si severity ≥ medium: notificar autoridad competente ≤72h (D12)
  → si afecta titulares: notificar a titulares ≤72h
  → status='notified' → investigación → status='closed' con root_cause
```

**Plantillas:**
- `docs/seguridad/plantilla_notificacion_autoridad.md`
- `docs/seguridad/plantilla_notificacion_titulares.md`
- `docs/seguridad/plantilla_comunicado_interno.md`
- `docs/seguridad/playbook_respuesta_incidentes.md`

### 4.3 AIPD (requisito 6)

Plantilla: `docs/privacidad/aipd_plantilla.md` (9 secciones obligatorias).

**AIPD concretas:**

| # | Tratamiento | Estado |
|---|---|---|
| AIPD-01 | Onboarding de restaurantes (registration_requests) | A redactar |
| AIPD-02 | CRM de clientes finales (restaurant_customers + historial) | A redactar |
| AIPD-03 | Chatbot de recomendación | **Dormida** (D11) — keyword-based hoy |
| AIPD-04 | Exportación de datos por admin (reportes CSV) | A redactar |

### 4.4 Privacidad en IA (requisito 11)

`docs/privacidad/reglas_ia.md`:
1. No entrenamiento de modelos con datos personales sin consentimiento + AIPD.
2. No persistencia de prompts (chatbot stateless; futuro LLM requiere consentimiento).
3. Pseudonimización antes de enviar a LLM.
4. Filtro anti datos sensibles (RUN, tarjeta, salud) en prompts.
5. Logging solo metadatos en `ai_usage_log` (opcional): `user_id`, `timestamp`, `model`, `tokens`. Nunca contenido.

### 4.5 Refuerzo de seguridad operacional

- Rotación de secretos trimestral (`docs/seguridad/rotacion_secretos.md`).
- Variables de entorno: checklist Vercel + Supabase; `.env` nunca commiteado.
- Backups: cifrados AES-256, PITR activado.
- `npm run security-check` (`scripts/security-check.ts`): valida RLS habilitada, ningún SECURITY DEFINER sin `is_admin()`, `.env` no commiteado.

---

## Sección 5 — Capa de Gobernanza ✅

### 5.1 RAT (Registro de Actividades de Tratamiento)

Archivo: `docs/privacidad/RAT.md`. Una fila por tratamiento con: ID, nombre, responsable, finalidad, base legal, titulares, categorías, destinatarios, transferencias, retención, medidas, enlace a AIPD.

**Tratamientos identificados:**

| ID | Tratamiento | Responsable |
|---|---|---|
| RAT-001 | Registro y alta de restaurantes | Cmor Flow |
| RAT-002 | Gestión de cuentas owners/staff | Cmor Flow |
| RAT-003 | Operación del SaaS — catálogo de menú | Cmor Flow |
| RAT-004 | Pedidos de clientes finales | Restaurante (Cmor Flow encargado) |
| RAT-005 | Invitaciones de onboarding | Cmor Flow |
| RAT-006 | Analítica de uso del producto | Cmor Flow |
| RAT-007 | Comunicaciones de marketing | Cmor Flow |
| RAT-008 | Chatbot de recomendación (stateless) | Restaurante |
| RAT-009 | Cumplimiento y auditoría | Cmor Flow |
| RAT-010 | Seguridad y respuesta a incidentes | Cmor Flow |

### 5.2 DPA Cmor Flow ↔ Restaurante

`docs/contratos/DPA_cmor_restaurante.md` — 13 cláusulas:
objeto, finalidad, duración, instrucciones del responsable, confidencialidad, medidas de seguridad, subencargados, transferencias (SCC), **notif. brechas ≤72h**, devolución/borrado, derechos titulares, auditoría anual, responsabilidad.

### 5.3 DPA con proveedores

`docs/contratos/DPA_proveedores.md`:

| Proveedor | Servicio | País | DPA | SCC |
|---|---|---|---|---|
| Vercel | Hosting frontend | USA | Oficial ✅ | Incluidos |
| Supabase | DB/Auth/Storage/Realtime/EF | USA (AWS) | Oficial ✅ | Incluidos |
| Email provider (default sugerido: **Resend**, editable) | Invitaciones + notif. | USA | Pendiente | Requerido |
| Proveedor IA (futuro) | Si chatbot LLM | USA | Requerido ZDR | Requerido |

**Acción concreta:** aceptar DPAs oficiales de Vercel/Supabase en sus dashboards; contratar email provider con DPA + SCC (Resend es la recomendación por defecto por su DPA disponible y SCC; editable si prefieres Postmark/SendGrid).

### 5.4 Transferencias internacionales

`docs/privacidad/transferencias_internacionales.md`:
- **USA:** riesgo medio, mitigado con SCC + cifrado + minimización. Procede condicionado a DPA firmado.
- Reevaluar si Chile publica lista de países adecuados (revisión trimestral).

### 5.5 Gobernanza — roles

- **DPO:** `dpo@cmorflow.cl`. Mantiene RAT, responde DSARs, coordina brechas.
- **Responsable de seguridad:** rotación secretos, monitoreo `audit_log`, ejecuta `security-check`.
- **Encargado de respuesta a incidentes:** activa playbook de brechas.

### 5.6 Checklist trimestral

`docs/privacidad/checklist_trimestral.md` (cada 3 meses):
- [ ] RAT revisado (¿nuevos tratamientos?).
- [ ] AIPD revisadas.
- [ ] Consents: tasa de revocación.
- [ ] DSARs: 100% dentro de SLA.
- [ ] audit_log: anomalías.
- [ ] breach_register: 0 incidentes > 30 días.
- [ ] Rotación secretos.
- [ ] Backups: prueba de restauración.
- [ ] DPAs proveedores vigentes.
- [ ] Versión políticas de privacidad vigente.
- [ ] RLS: `security-check` ejecutado.

---

## Estructura final de entregables

```
SaaS suchi/
├── database/
│   ├── 03_privacy_consents.sql
│   ├── 04_audit_log.sql
│   ├── 05_rls_hardening.sql
│   ├── 06_password_deprecation.sql
│   ├── 07_data_subject_requests.sql
│   ├── 08_retention.sql
│   ├── 09_breach_register.sql
│   ├── 10_pg_cron_schedule.sql
│   └── migrations_rollback.sql
├── supabase/functions/
│   ├── privacy-access/
│   ├── privacy-rectify/
│   ├── privacy-erase/
│   ├── privacy-object/
│   ├── privacy-export/
│   └── privacy-revoke-consent/
├── src/components/privacy/
│   ├── ConsentManager.tsx
│   ├── CookieBanner.tsx
│   ├── DsarForm.tsx
│   └── PrivacyPolicyModal.tsx
├── src/pages/
│   ├── public/Privacy.tsx
│   ├── restaurant/Privacy.tsx
│   └── admin/Privacy.tsx
├── docs/
│   ├── privacidad/
│   │   ├── 01_politica_privacidad_b2b.md
│   │   ├── 02_aviso_privacidad_b2b.md
│   │   ├── 03_politica_privacidad_clientes.md
│   │   ├── 04_terminos_y_dpa_cliente.md
│   │   ├── VERSION.md
│   │   ├── RAT.md
│   │   ├── aipd_01_onboarding.md
│   │   ├── aipd_02_crm_clientes.md
│   │   ├── aipd_03_chatbot_dormida.md
│   │   ├── aipd_04_exportaciones.md
│   │   ├── aipd_plantilla.md
│   │   ├── reglas_ia.md
│   │   ├── transferencias_internacionales.md
│   │   └── checklist_trimestral.md
│   ├── contratos/
│   │   ├── DPA_cmor_restaurante.md
│   │   └── DPA_proveedores.md
│   └── seguridad/
│       ├── plantilla_notificacion_autoridad.md
│       ├── plantilla_notificacion_titulares.md
│       ├── plantilla_comunicado_interno.md
│       ├── playbook_respuesta_incidentes.md
│       └── rotacion_secretos.md
└── scripts/
    └── security-check.ts
```

---

## Matriz de cumplimiento — 12 requisitos

| # | Requisito | Dónde se cumple |
|---|---|---|
| 1 | Base legal y consentimiento | Sec 2 (consents, ConsentManager) + Sec 3 (documentos) |
| 2 | Finalidad y minimización | Sec 1 (inventario) + Sec 5 (RAT) |
| 3 | Transparencia | Sec 3 (4 documentos legales) |
| 4 | Derechos del titular | Sec 3 (6 endpoints DSAR + SLA) |
| 5 | Seguridad por diseño | Sec 2 (RLS, MFA, audit, cifrado) + Sec 4 (security-check) |
| 6 | Gestión de riesgos (AIPD) | Sec 4 (4 AIPD + plantilla) |
| 7 | Transferencias internacionales | Sec 5 (evaluación + SCC) |
| 8 | Retención y eliminación | Sec 4 (tabla + run_retention_sweep + pg_cron) |
| 9 | Proveedores y contratos (DPA) | Sec 5 (Cmor↔Restaurante + proveedores) |
| 10 | Brechas de seguridad | Sec 4 (breach_register + plantillas + 72h) |
| 11 | Privacidad en IA | Sec 4 (reglas_ia.md, chatbot dormido) |
| 12 | Documentación y gobernanza | Sec 5 (RAT, DPO, checklist trimestral) |

---

## Próximos pasos (fuera de este spec)

1. **Self-review** de este documento (placeholder scan, consistencia, scope).
2. **Revisión del usuario** antes de pasar a implementación.
3. Invocar skill `writing-plans` para plan de implementación detallado.
4. Generación de entregables (capa por capa) — el SQL se aplica por MCP desde Antigravity.
