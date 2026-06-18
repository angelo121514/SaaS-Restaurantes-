# Diseño — Plan de Privacidad (Ley 19.628 + Ley 21.719) — SaaS suchi

- **Proyecto:** `C:/Users/angel/Desktop/Code/SaaS suchi` (Cmor Flow — SaaS POS para restaurantes)
- **Fecha:** 2026-06-18
- **Marco normativo:** Ley N° 19.628 (protección de datos personales) y Ley N° 21.719 (vigencia nacional: **1 de diciembre de 2026**), inspirada en el RGPD.
- **Enfoque:** por capas de madurez (A), 4 capas en orden de dependencia técnica.
- **Disclaimer legal:** los documentos legales (política, aviso, DPA, AIPD) son **borradores técnicos**. Requieren revisión de un abogado chileno antes de publicación oficial.
- **Disclaimer de retención:** las retenciones en D7 son **valores por defecto sujetos a validación legal/operativa**, no compromisos definitivos. Se ajustarán en la revisión con abogado y/o contabilidad tributaria.

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
| D7 | Retenciones por defecto *(sujetas a validación legal/operativa)* | Ver desglose en §1.3 — los plazos son de negocio/operativos, **no** obligaciones legales derivadas de la Ley 21.719 (la ley no fija plazos por categoría). Única obligación legal explícita: **6 años para documentos tributarios (orders)**, impuesta por el SII, no por la ley de protección de datos. |
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

**Naturaleza del plazo:** `📊 negocio` (decisión operativa, ajustable) · `⚖️ ley` (obligación legal externa, no modificable).

| Categoría | Campos | Tablas | Sensible | Retención | Naturaleza | Acción al expirar |
|---|---|---|---|---|---|---|
| Identidad B2B | owner_name, display_name | restaurants, profiles | No | Vida del contrato; al baja, **+90 días solo para inactivos** | 📊 negocio | Anonimizar tras baja confirmada |
| Contacto B2B | email, phone, city, address | restaurants, profiles | No | Igual identidad B2B | 📊 negocio | Anonimizar |
| Autenticación | password_hash, last_login_at | auth.users, users (legacy) | Crítica | Hasta baja del usuario | 📊 negocio | Soft-delete en Supabase Auth |
| Identidad cliente | customer_name | restaurant_customers, orders | No | 24 meses sin pedidos | 📊 negocio | Anonimizar (mantener para stats) |
| Contacto cliente | phone, email | restaurant_customers, orders | No | 24 meses sin pedidos | 📊 negocio | Anonimizar |
| Transaccional | items, total, payment_method | orders | No (financiero) | **6 años** | ⚖️ ley (SII) | **Anonimizar personales**, conservar monto/items |
| Prospectos | registration_requests | — | No | 12 meses desde último contacto | 📊 negocio | Borrar fila |
| Tokens | token | invitations | Crítica | 7 días o hasta consumo | 📊 negocio | Borrar fila |
| Operativos | internal_notes, block_reason | varias | No | Igual que tabla padre | 📊 negocio | Igual que tabla padre |
| Audit log | (eventos) | audit_log | — | 24 meses base; **36 meses para eventos de seguridad/auth** | 📊 negocio | Archivo frío + borrar |
| Consents | (prueba de consentimiento) | consents | — | Revocación + 3 años | ⚖️ ley (prueba de cumplimiento) | Conservar prueba |
| DSARs (evidencia) | data_subject_requests | — | — | 6 años — **solo metadatos mínimos** (id, tipo, fecha, resultado, prueba de respuesta) | ⚖️ ley (prueba de cumplimiento) | El contenido del DSAR se anonimiza a los 12 meses |
| IA (chatbot) | mensajes | (no persistidos) | — | 0 — stateless | — | No aplica |

**Principio de anonimización legal (refuerzo del §3.2):** cuando un titular pide supresión pero existe obligación legal de conservar el registro (ej. orders 6 años SII), **se anonimizan los campos personales** (`customer_name=NULL`, `customer_phone=NULL`, `customer_notes=NULL`, `anonymized_at=now()`) **en lugar de borrar la fila**. El registro financiero/tributario se conserva; la identidad del titular se pierde.

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

Ubicados en `docs/legal/` (ver estructura final). Revisión por abogado antes de publicar.

| Documento | Ruta | Para quién | Dónde se muestra |
|---|---|---|---|
| Política de privacidad B2B | `docs/legal/politica_privacidad_b2b.md` | Owners, staff, admins | Footer `/legal/privacidad` + alta de cuenta |
| Aviso de privacidad B2B (resumen) | `docs/legal/aviso_privacidad_b2b.md` | Owners, staff | Modal primer login + link en `/restaurant/settings` |
| Política de privacidad clientes finales | `docs/legal/politica_privacidad_clientes.md` | Clientes `/menu/:slug` | Footer del menú + modal al ingresar datos |
| Términos y condiciones + DPA cliente | `docs/legal/terminos_y_condiciones.md` | Owners onboarding | Checkbox en `/register` |

Cada documento con 10 bloques: responsable, finalidades, categorías, destinatarios, transferencias, derechos (incluidos **oposición y portabilidad explícitos**), conservación, DPO, base legal, reclamación.

**Versionado:** `docs/legal/VERSION.md` lleva el changelog. Cada cambio de política sube versión (ej. `2026-06-01` → `2026-09-01`) y los `consents` nuevos graban la versión vigente.

### 3.2 Derechos del titular (DSAR) — 6 endpoints Edge Functions

Los **6 derechos** son entregables obligatorios y verificables. Cada uno tiene endpoint, RPC y UI asociada. No son opcionales ni quedan solo en la tabla:

| Derecho | Art. (Ley 21.719) | Endpoint | Plazo | Entregable obligatorio |
|---|---|---|---|---|
| **Acceso** | Art. 19 | `privacy/access` | 30 días | Sí — el titular recibe un reporte de los datos que tenemos sobre él |
| **Rectificación** | Art. 19 | `privacy/rectify` | 15 días | Sí — formulario de corrección de datos inexactos |
| **Cancelación (supresión)** | Art. 19 | `privacy/erase` | 30 días (+ purge backups) | Sí — ejecuta anonimización/borrado según la categoría (ver §1.3) |
| **Oposición** | Art. 19 | `privacy/object` | 30 días | Sí — el titular puede oponerse a un tratamiento específico (ej. marketing, analítica) sin cancelar la cuenta |
| **Portabilidad** | Art. 19 | `privacy/export` | 30 días | Sí — entrega en **JSON + CSV** estructurado, no PDF |
| **Revocación de consentimiento** | Art. 7 | `privacy/revoke-consent` | Inmediato | Sí — revoca un scope específico sin tocar el resto |

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

**Estado actual (hoy):** el chatbot (`AiChatbot.tsx`) es keyword-based y **stateless** — los mensajes viven solo en memoria del navegador (state de React), **no se persisten en ninguna base de datos**, no se envían a ningún modelo externo, y **no se usan para entrenar nada**. Esta afirmación debe quedar explícita en la política de privacidad y en `reglas_ia.md`.

**Reglas obligatorias — `docs/privacidad/reglas_ia.md`:**

1. **No persistencia actual:** las conversaciones del chatbot **no se guardan** en DB. Si en el futuro se quiere persistir historial, requiere consentimiento explícito del titular + AIPD-03 activada.
2. **No entrenamiento:** ningún proveedor de IA puede usar datos del proyecto para entrenar. Si se integra OpenAI/Anthropic/etc.: contrato Zero Data Retention + confirmación por escrito + bloqueo del flag `training` de la API.
3. **Pseudonimización:** si en el futuro se envían datos a un LLM, se reemplazan `customer_name`, `phone`, `email` por tokens antes del envío.
4. **Sin datos sensibles en prompts:** filtro que detecta patrones (RUN, tarjeta, salud, biometría) y los bloquea antes de cualquier llamada externa.
5. **Logging solo de metadatos:** se registra en `ai_usage_log` (tabla nueva opcional) — `user_id`, `timestamp`, `model`, `tokens`, `scope`. **Nunca** el contenido del prompt ni de la respuesta.

**AIPD-03 (chatbot) — estado `dormida`:** se mantiene redactada y lista para activar si/hay migración a LLM. No se aplica hoy porque no hay LLM. La activación requiere: consentimiento granular `ai_profiling=true`, AIPD firmada, y contrato con proveedor IA.

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

La organización separa claramente **4 dominios**: documentación legal (`docs/legal/`), documentación operativa (`docs/privacidad/`, `docs/seguridad/`), código SQL (`database/`), y automatización (`scripts/`). Esto evita que se mezclen políticas (que revisa un abogado) con scripts técnicos (que ejecuta un dev).

```
SaaS suchi/
│
├── README.md                          ← (NUEVO) guía operativa: cómo aplicar
│                                         el plan, orden de ejecución, checklist
│                                         inicial, y links a cada entregable.
│
├── database/                          ← SQL para Supabase (aplicar vía MCP)
│   ├── 03_privacy_consents.sql
│   ├── 04_audit_log.sql
│   ├── 05_rls_hardening.sql
│   ├── 06_password_deprecation.sql
│   ├── 07_data_subject_requests.sql
│   ├── 08_retention.sql
│   ├── 09_breach_register.sql
│   ├── 10_pg_cron_schedule.sql
│   └── migrations_rollback.sql        ← HERRAMIENTA DE EMERGENCIA, no flujo normal.
│                                         Solo se usa si una migración sale mal.
│                                         Documentado en README.md §"Rollback".
│
├── supabase/functions/                ← Edge Functions (código TypeScript)
│   ├── invite-owner/                  (existe)
│   ├── privacy-access/
│   ├── privacy-rectify/
│   ├── privacy-erase/
│   ├── privacy-object/
│   ├── privacy-export/
│   └── privacy-revoke-consent/
│
├── src/components/privacy/            ← UI React
│   ├── ConsentManager.tsx
│   ├── CookieBanner.tsx
│   ├── DsarForm.tsx
│   └── PrivacyPolicyModal.tsx
│
├── src/pages/
│   ├── public/Privacy.tsx             (/legal/privacidad)
│   ├── restaurant/Privacy.tsx         (/account/privacy)
│   └── admin/Privacy.tsx              (/admin/privacy)
│
├── scripts/                           ← Automatización (NO SQL, NO docs).
│   │                                    Ejecutables con npm run X.
│   ├── security-check.ts              (npm run security-check)
│   ├── seed-policy-versions.ts        (actualiza versión vigente)
│   └── dsar-cron-check.ts             (opcional, si no se usa pg_cron)
│
├── docs/
│   ├── legal/                         ← (NUEVO) documentos legales centralizados.
│   │   │                                Lo que revisa el abogado. Versionado.
│   │   ├── politica_privacidad_b2b.md
│   │   ├── aviso_privacidad_b2b.md
│   │   ├── politica_privacidad_clientes.md
│   │   ├── terminos_y_condiciones.md
│   │   ├── VERSION.md                 ← changelog de versiones vigentes
│   │   └── contacto_dpo.md            ← datos de contacto del DPO
│   │
│   ├── privacidad/                    ← documentación operativa de privacidad
│   │   ├── RAT.md                     ← Registro de Actividades de Tratamiento
│   │   ├── aipd_01_onboarding.md
│   │   ├── aipd_02_crm_clientes.md
│   │   ├── aipd_03_chatbot_dormida.md
│   │   ├── aipd_04_exportaciones.md
│   │   ├── aipd_plantilla.md
│   │   ├── reglas_ia.md
│   │   ├── transferencias_internacionales.md
│   │   └── checklist_trimestral.md    ← (confirmado) vive aquí dentro
│   │
│   ├── contratos/                     ← DPAs (también revisa el abogado)
│   │   ├── DPA_cmor_restaurante.md
│   │   └── DPA_proveedores.md
│   │
│   └── seguridad/
│       ├── plantilla_notificacion_autoridad.md
│       ├── plantilla_notificacion_titulares.md
│       ├── plantilla_comunicado_interno.md
│       ├── playbook_respuesta_incidentes.md
│       └── rotacion_secretos.md
```

**Notas de organización (respuesta a tu feedback):**

- **`docs/legal/`** se separa de `docs/privacidad/` porque el abogado revisa `legal/` (texto normativo) mientras que el equipo de producto mantiene `privacidad/` (RAT, AIPD, reglas operativas). Confirma lo que pediste: centralizar políticas.
- **`VERSION.md`** y **`checklist_trimestral.md`** quedan **dentro de `docs/`** (en `docs/legal/` y `docs/privacidad/` respectivamente), no dispersos.
- **`scripts/`** es una carpeta aparte y clara: solo archivos ejecutables (`npm run X`), separados del SQL (`database/`) y de la documentación (`docs/`). El SQL de `database/` se aplica por MCP; los scripts de `scripts/` se corren desde la terminal.
- **`migrations_rollback.sql`** se etiqueta como **herramienta de emergencia**, no entra en el flujo de aplicación normal. Solo se invoca si una migración falla. Se documenta su uso en `README.md` §"Rollback".
- **`README.md` raíz** es la guía operativa: cómo aplicar el plan, orden de ejecución por capas, y links a cada entregable.

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
