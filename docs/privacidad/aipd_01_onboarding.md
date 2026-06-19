# AIPD-01 — Onboarding de restaurantes

- **Identificador AIPD:** `AIPD-01`
- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Vinculación al RAT:** `RAT-001` (Registro y alta de restaurantes), `RAT-005` (Invitaciones de onboarding).
- **Responsable del tratamiento:** Cmor Flow.
- **DPO:** `dpo@cmorflow.cl`.

## Sección 1 — Descripción del tratamiento

El onboarding captura prospectos de restaurantes vía el formulario público en `/register`, que inserta una fila en `public.registration_requests` con los datos del prospecto (nombre del restaurante, nombre del dueño, teléfono, email, ciudad, dirección, cómo nos conoció, notas). Un administrador revisa la solicitud en `/admin/requests` y, al aprobarla, ejecuta la RPC `admin_create_restaurant_v2`, que crea el restaurante en `restaurants`, el perfil en `profiles` y dispara una invitación en `invitations` que la Edge Function `invite-owner` convierte en un magic link enviado por email desde Supabase Auth.

Flujo de datos: navegador del prospecto → (HTTPS/TLS 1.2+ vía Vercel edge) → Supabase Postgres (cifrado AES-256 reposo) → Edge Function `invite-owner` → email provider → inbox del owner. Las tablas involucradas son `registration_requests`, `restaurants`, `profiles`, `invitations` y `auth.users`. Los tokens de invitación viven en `invitations.token` y expiran a los 7 días (o al ser consumidos).

## Sección 2 — Necesidad y proporcionalidad

El tratamiento es necesario para **ejecutar el contrato del servicio SaaS** (Ley 21.719 base legal `contract`). Sin estos datos no es posible dar de alta la cuenta, identificar al responsable B2B del restaurante, ni enviar la invitación de acceso.

- **Nombre y datos del restaurante:** indispensables para crear el slug público, la landing y la ficha operativa.
- **Nombre del dueño y contacto:** indispensables para la invitación y la relación comercial.
- **Ciudad y dirección:** necesarios para la factibilidad comercial y la segmentación; no se exige comprobante.
- **Cómo nos conoció y notas:** opcionales. Se conservan solo para mejorar la conversión; el prospecto puede dejarlos en blanco.

Alternativas evaluadas: se consideró ofrecer alta sin contacto (solo email), pero imposibilita verificar al responsable B2B ni enviar la invitación segura, por lo que se rechazó. La minimización se aplica recogiendo únicamente lo necesario para el alta.

## Sección 3 — Categorías de datos y datos sensibles

| Categoría | Campos | Tabla | Sensible | Origen |
|---|---|---|---|---|
| Identidad B2B | `restaurant_name`, `owner_name` | `registration_requests`, `restaurants`, `profiles` | No | Titular |
| Contacto B2B | `phone`, `email`, `city`, `address` | `registration_requests`, `restaurants`, `profiles` | No | Titular |
| Operativos | `heard_from`, `notes`, `internal_notes`, `block_reason` | `registration_requests`, `restaurants` | No | Titular / Admin |
| Tokens | `token` | `invitations` | Crítica (operativa) | Sistema |
| Autenticación | `password_hash` (legacy), `last_login_at` | `auth.users` | Crítica | Sistema |

- **Datos sensibles:** no se tratan datos de salud, biométricos, orientación, etc.
- **Datos de niños/adolescentes:** no aplicable (servicio B2B para adultos responsables de restaurantes).

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal | Consentimiento requerido |
|---|---|---|---|
| Owner del restaurante (prospecto) | Identidad B2B, Contacto B2B | `contract` | No (necesario para prestar el servicio) |
| Owner del restaurante | Marketing | `consent` | Sí (revocable, scope `marketing`) |
| Owner del restaurante | Analítica de uso | `consent` | Sí (revocable, scope `analytics`) |

Los consentimientos opcionales (marketing, analytics) se capturan con el componente `ConsentManager` y se registran en `consents` con `proof`.

## Sección 5 — Destinatarios y transferencias

- **Destinatarios internos:** equipo admin Cmor Flow (acceso vía `profiles.role='admin'` + RLS).
- **Encargados subcontratados:**
  - Vercel (hosting frontend) — USA — DPA oficial ✅, SCC incluidos.
  - Supabase (DB/Auth/Storage/Edge Functions) — USA (AWS) — DPA oficial ✅, SCC incluidos.
  - Email provider (Resend por defecto) — USA — DPA pendiente, SCC requerido.
- **Transferencias internacionales:** USA, riesgo **medio**, mitigado con SCC + cifrado + minimización. Procede condicionado a DPA firmado. Referencia: `docs/privacidad/transferencias_internacionales.md`.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | Acceso no autorizado a `registration_requests` (prospectos expuestos) | 2 | 3 | 6 (medio) | Formulario público; sin rate-limit, un atacante podría enumerar |
| R2 | Fuga por insider (admin copia datos de prospectos) | 2 | 3 | 6 (medio) | Acceso admin legítimo con exportación |
| R3 | Token de invitación interceptado (toma de cuenta) | 2 | 4 | 8 (medio) | Magic link enviado por email; expone acceso inicial |
| R4 | Reidentificación por cruce ciudad+teléfono | 1 | 2 | 2 (bajo) | Datos de contacto B2B, baja sensibilidad |
| R5 | Solicitud rechazada retenida > 12 meses | 3 | 2 | 6 (medio) | Riesgo de incumplimiento de retención D7 |

## Sección 7 — Medidas mitigantes

| Riesgo | Medida | Tipo | Reduce |
|---|---|---|---|
| R1 | Rate-limit 5 envíos por IP/día en Edge Function/RPC SECURITY DEFINER (spec §2.3) | Técnica | Probabilidad |
| R1 | RLS habilitada en `registration_requests` + honeypot | Técnica | Probabilidad |
| R1 | TLS 1.2+ en todo el tránsito (Vercel + Supabase) | Técnica | Impacto |
| R2 | `audit_log` inmutable registra toda aprobación/rechazo/export | Técnica | Probabilidad |
| R2 | MFA obligatorio para `admin` y `owner` (D8) | Técnica | Probabilidad |
| R3 | Token expira a 7 días; consumo único; enviado solo al email registrado | Técnica | Probabilidad |
| R3 | Email de invitación generado por Supabase Auth (no se exponen tokens en el frontend) | Técnica | Impacto |
| R4 | Cifrado AES-256 en reposo (Supabase) | Técnica | Impacto |
| R5 | `run_retention_sweep()` borra `registration_requests` rejected > 12 meses (pg_cron semanal) | Técnica | Probabilidad |

## Sección 8 — Riesgo residual

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | 1 | 2 | 2 (bajo) | Sí |
| R2 | 1 | 2 | 2 (bajo) | Sí |
| R3 | 1 | 3 | 3 (bajo) | Sí |
| R4 | 1 | 2 | 2 (bajo) | Sí |
| R5 | 1 | 2 | 2 (bajo) | Sí |

Todos los riesgos residuales quedan en **bajo**. Ningún riesgo alto o crítico pendiente.

## Sección 9 — Decisión

- **Decisión:** **Procede.**
- **Condiciones:** ninguna adicional (las medidas existentes reducen todos los riesgos a bajo).
- **Próxima revisión:** 2027-06-18 (o ante cambio material del flujo de onboarding, integración de nuevo email provider o nuevo proveedor de IA en el flujo).
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2 (principios), art. 4 (consentimiento), art. 19 (derechos del titular).
- Ley N° 21.719, art. 9 (consentimiento informado), art. 19 (derechos), art. 24 (seguridad del tratamiento).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §1.3 (mapa de datos), §2.3 (parches RLS), §4.1 (retención).

> **Disclaimer legal:** este AIPD es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
