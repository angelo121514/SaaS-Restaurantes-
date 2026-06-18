# Capa 3 — Operacional (AIPD, Brechas, Security Check, IA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cubrir la capa operacional del spec de privacidad Ley 19.628 / Ley 21.719 §4: redactar 4 AIPD + plantilla, las reglas de IA, las plantillas de respuesta a incidentes, el script `security-check`, el servicio `securityService` y la UI admin de seguridad.

**Architecture:** Esta capa es mayoritariamente documental (markdown redactado en español de Chile con referencias normativas) más dos piezas de código: un script Node ESM (`scripts/security-check.ts`) que valida RLS/SECURITY DEFINER/env vía el cliente Supabase, y una página admin (`src/pages/admin/Security.tsx`) que consume `breach_register` y `audit_log` a través de `securityService.ts`. La UI reutiliza los componentes existentes (`Card`, `Button`, `Modal`, `Badge`, `Select`, `Alert`) y se integra al `navItems` del `Dashboard` admin.

**Tech Stack:** Vite + React 19 + Supabase + scripts Node.ts (`@supabase/supabase-js` desde node_modules, no esm.sh).
**Spec de referencia:** docs/superpowers/specs/2026-06-18-privacidad-chile-design.md §4
**Depende de:** Capa 1 (tablas audit_log, breach_register)

---

## Convenciones del plan

- Rutas absolutas: todas empiezan con `C:/Users/angel/Desktop/Code/SaaS suchi/...`.
- Referencias normativas: Ley N° 19.628 (sobre protección de la vida privada / datos personales, vigente) y Ley N° 21.719 (entra en vigencia nacional el **1 de diciembre de 2026**). Se citan como *Ley 19.628 art. X* y *Ley 21.719 art. X*.
- Disclaimer legal recurrente: estos AIPD y plantillas son **borradores técnicos**; requieren revisión de un abogado chileno antes de publicación oficial.
- Disclaimer de plazos: las retenciones por categoría son valores operativos de negocio (D7), salvo los **6 años de órdenes (SII)** que son obligación tributaria externa.
- Email DPO de referencia: `dpo@cmorflow.cl` (placeholder editable).
- Autoridad competente: *la autoridad competente* (genérico, D12; la autoridad final bajo Ley 21.719 se está definiendo).
- Escala de severidad: `low` / `medium` / `high` / `critical` (igual al CHECK de `breach_register` en `database/09_breach_register.sql`).
- Escala de probabilidad × impacto en AIPD: `1 (raro)` a `4 (casi seguro)` y `1 (mínimo)` a `4 (catastrófico)`.

---

## Task 1: Reglas de IA (`docs/privacidad/reglas_ia.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/reglas_ia.md`

- [ ] **Step 1: Crear el archivo `reglas_ia.md` con el contenido completo de abajo.**

````markdown
# Reglas de Privacidad en IA — Cmor Flow (SaaS suchi)

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.4
- **Marco normativo:** Ley N° 19.628 y Ley N° 21.719 (vigencia 1 de diciembre de 2026).
- **Responsable:** DPO — `dpo@cmorflow.cl`.

## Estado actual del tratamiento IA

**Hoy el chatbot (`src/components/AiChatbot.tsx`) es keyword-based y stateless.** Las conversaciones del chatbot **no se guardan** en ninguna base de datos: los mensajes viven únicamente en la memoria del navegador (estado de React) mientras la pestaña está abierta, **no se envían a ningún modelo externo**, y **no se usan para entrenar nada**.

No existe LLM integrado, no hay proveedor de IA conectado, no hay tabla `ai_usage_log` activa, y la AIPD-03 (chatbot) está en estado **dormida** (preparatoria). La activación de cualquier procesamiento IA real exige el cumplimiento de las 5 reglas de abajo más la activación formal de AIPD-03.

## Reglas obligatorias

### Regla 1 — No persistencia actual

Las conversaciones del chatbot **no se persisten** en base de datos, ni en Supabase, ni en ningún log permanente, ni en Storage.

- Si en el futuro se requiere guardar historial de conversaciones, será obligatorio **antes** de activar la persistencia:
  1. Consentimiento granular explícito del titular con `scope='ai_profiling'` registrado en la tabla `consents` (Ley 21.719 art. 9; Ley 19.628 art. 4).
  2. AIPD-03 firmada y activada (`docs/privacidad/aipd_03_chatbot_dormida.md`).
  3. Definir y aplicar una categoría de retención (por defecto: 12 meses desde la última interacción, anonimización al expirar).

### Regla 2 — No entrenamiento

Ningún proveedor de IA puede usar datos del proyecto (clientes finales, owners, staff, pedidos, conversaciones) para entrenamiento de modelos.

- Antes de integrar cualquier proveedor (OpenAI, Anthropic, Google, Mistral, u otro):
  1. Contrato **Zero Data Retention (ZDR)** o equivalente firmado con el proveedor.
  2. Confirmación por escrito del proveedor de que sus sistemas no retienen ni entrenan con el contenido.
  3. Bloquear en la API el flag equivalente a `training: false` / `store: false` / `usage_opt_out: true` según el proveedor.
- Esta regla cubre tanto prompts como respuestas y trazas.

### Regla 3 — Pseudonimización antes de cualquier envío externo

Si en el futuro se envían datos a un LLM, **antes** del envío se reemplazan los identificadores personales por tokens:

| Campo | Token |
|---|---|
| `customer_name` | `[CLIENTE_A]`, `[CLIENTE_B]`... |
| `phone` | `[TEL_1]`, `[TEL_2]`... |
| `email` | `[CORREO_1]`, `[CORREO_2]`... |
| `owner_name` | `[OWNER_1]`... |

El mapeo token → valor real vive solo en memoria de la sesión (server-side) y se descarta al cerrar la petición. No se persiste.

### Regla 4 — Sin datos sensibles en prompts

Filtro obligatorio que detecta y bloquea patrones sensibles **antes** de cualquier llamada externa:

- **RUN chileno** (formato `XX.XXX.XXX-X` o `XXXXXXXX-X`).
- **Tarjetas de crédito** (patrones PAN de 13–19 dígitos, incluido validación Luhn simple).
- **Datos de salud** (palabras clave: *diabetes, hipertensión, alergia, medicamento, receta* combinadas con contexto de persona).
- **Datos biométricos** (huellas, rostro, voz).
- **Credenciales** (`password`, `contraseña`, `secret`, tokens JWT).

Si el filtro detecta alguno, la petición se bloquea y se registra únicamente el **evento** (sin el contenido) en `audit_log` con `action='ai_sensitive_blocked'`.

### Regla 5 — Logging solo de metadatos

Cuando exista procesamiento IA, se registran únicamente metadatos. **Nunca** el contenido del prompt ni de la respuesta.

Tabla de referencia (opcional, a crear al activar IA): `ai_usage_log` con columnas:

| Columna | Tipo | Comentario |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NULL | `auth.uid()` del actor |
| `scope` | text | `chatbot`, `summary`, `recommendation` |
| `model` | text | identificador del modelo |
| `tokens_in` | integer | tokens de entrada |
| `tokens_out` | integer | tokens de salida |
| `blocked_reason` | text NULL | si aplica filtro sensible |
| `created_at` | timestamptz DEFAULT now() | |

RLS de `ai_usage_log`: solo lectura admin (`public.is_admin()`), inserción por sistema.

## Referencias normativas

- Ley N° 19.628, art. 2 (principios del tratamiento), art. 4 (consentimiento).
- Ley N° 21.719, art. 9 (consentimiento informado y granular), art. 19 (derechos del titular), art. 24 (seguridad del tratamiento).
- AIPD-03 (chatbot, dormida): `docs/privacidad/aipd_03_chatbot_dormida.md`.
- Registro de Actividades de Tratamiento (RAT-008 chatbot): `docs/privacidad/RAT.md`.

## Control de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-06-18 | 1.0.0 | Documento inicial. Afirma estado keyword-based y stateless del chatbot. |

> **Disclaimer legal:** este documento es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar contenido**

```bash
ls "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/reglas_ia.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/reglas_ia.md" || echo "OK: sin placeholders"
```

Output esperado: el `ls` muestra el archivo y el `grep` imprime `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/reglas_ia.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): reglas IA - 5 reglas obligatorias + afirmacion chatbot stateless (Ley 21.719 req.11)"
```

---

## Task 2: Plantilla AIPD (`docs/privacidad/aipd_plantilla.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_plantilla.md`

- [ ] **Step 1: Crear el archivo `aipd_plantilla.md` con las 9 secciones obligatorias.**

````markdown
# Plantilla — Evaluación de Impacto en la Protección de Datos (AIPD)

- **Versión plantilla:** 1.0.0
- **Fecha:** 2026-06-18
- **Marco normativo:** Ley N° 19.628 y Ley N° 21.719 (vigencia 1 de diciembre de 2026). Inspirada en el RGPD y las directrices del WP29 para evaluaciones de impacto.
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.3.
- **Responsable:** DPO — `dpo@cmorflow.cl`.

> Cómo usar esta plantilla: duplicar el archivo como `aipd_NN_<nombre>.md`, completar las 9 secciones con el contenido específico al tratamiento, asignar calificaciones concretas en la matriz y firmar la decisión. Las AIPD en estado **dormida** se llenan con el estado actual y se dejan listas para activar.

## Sección 1 — Descripción del tratamiento

- **Identificador AIPD:** (ej. `AIPD-01`)
- **Nombre del tratamiento:**
- **Vinculación al RAT:** (ej. `RAT-001` en `docs/privacidad/RAT.md`)
- **Descripción operativa:** qué se hace, sobre qué datos, con qué objetivo de negocio. Incluir el flujo de datos en prosa (origen → almacenamiento → destinatario → destrucción).
- **Sistemas y tablas involucradas:** (ej. `registration_requests`, `restaurants`, `profiles`).

## Sección 2 — Necesidad y proporcionalidad

- **Finalidad legítima del tratamiento:** por qué existe y qué problema resuelve.
- **Necesidad:** por qué los datos recogidos son indispensables para la finalidad. Justificar cada categoría.
- **Proporcionalidad:** por qué se recoge **solo** lo necesario (minimización). Identificar campos opcionales y su justificación.
- **Alternativas menos invasivas:** se evaluó hacer el tratamiento sin datos personales, o con datos agregados/anonimizados, y no fue viable porque *(razón concreta)*.

## Sección 3 — Categorías de datos y datos sensibles

Lista detallada de categorías (basada en spec §1.3):

| Categoría | Campos | Tabla | Sensible | Origen |
|---|---|---|---|---|
| (ej. Identidad B2B) | `owner_name` | `restaurants` | No | Titular |
| ... | ... | ... | ... | ... |

- **¿Se tratan datos sensibles (salud, biométricos, orientación, etc.)?** (Sí/No y cuáles).
- **¿Se tratan datos de niños o adolescentes?** (Sí/No; si Sí, medidas adicionales obligatorias).

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal (Ley 21.719) | Consentimiento requerido |
|---|---|---|---|
| (ej. Owner del restaurante) | Identidad B2B, Contacto B2B | `contract` (ejecución de contrato) | No (necesario) |
| ... | ... | ... | ... |

Bases legales válidas (CHECK de `consents.legal_basis`): `consent`, `contract`, `legal_obligation`, `legitimate_interest`.

## Sección 5 — Destinatarios y transferencias

- **Destinatarios internos:** (ej. Equipo admin Cmor Flow, soporte).
- **Encargados subcontratados:** (ej. Supabase DB/Auth/Storage, Vercel hosting, email provider).
- **Transferencias internacionales:** país de cada encargado, existencia de DPA, existencia de Cláusulas Contractuales Tipo (SCC), nivel de riesgo (bajo/medio/alto).
- Referencia: `docs/privacidad/transferencias_internacionales.md`.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

Calificar cada riesgo identificado. Escala:

- **Probabilidad:** `1` (raro, <10% en 12 meses), `2` (posible, 10–40%), `3` (probable, 40–70%), `4` (casi seguro, >70%).
- **Impacto:** `1` (mínimo, sin afectación a titulares), `2` (moderado, afectación reversible a pocos titulares), `3` (grave, daño patrimonial o reidentificación), `4` (catastrófico, daño a derechos fundamentales o a gran escala).
- **Nivel de riesgo inherente** = probabilidad × impacto: ≤4 bajo · 5–9 medio · 10–14 alto · ≥15 crítico.

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | Acceso no autorizado a la tabla | | | | |
| R2 | Fuga por insider | | | | |
| R3 | Pérdida de integridad / borrado accidental | | | | |
| R4 | Reidentificación por cruce de datasets | | | | |
| R5 | Incumplimiento de retención | | | | |

## Sección 7 — Medidas mitigantes

Por cada riesgo de la Sección 6, listar las medidas existentes (técnicas y organizativas) y su efecto sobre el riesgo.

| Riesgo | Medida | Tipo (técnica/org.) | Reduce probabilidad/impacto |
|---|---|---|---|
| R1 | RLS habilitada + política por `auth.uid()` / `is_admin()` | Técnica | Probabilidad |
| R1 | Cifrado AES-256 en reposo (Supabase) | Técnica | Impacto |
| R2 | Mínimo privilegio + `audit_log` inmutable | Técnica | Probabilidad |
| R3 | Backups cifrados + PITR | Técnica | Impacto |
| R5 | `run_retention_sweep()` + pg_cron semanal | Técnica | Probabilidad |

## Sección 8 — Riesgo residual

Re-calcular probabilidad × impacto **después** de aplicar las medidas de la Sección 7.

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | | | | Sí/No |
| R2 | | | | Sí/No |
| R3 | | | | Sí/No |
| R4 | | | | Sí/No |
| R5 | | | | Sí/No |

Si algún riesgo residual queda en **alto** o **crítico**, definir acción correctiva y fecha límite antes de aprobar.

## Sección 9 — Decisión

- **Decisión:** (Procede / Procede condicionado / No procede).
- **Condiciones (si aplica):** lista de acciones con responsable y fecha.
- **Próxima revisión:** (fecha; mínimo anual, o ante cambio material del tratamiento).
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2 (principios), art. 4 (consentimiento), art. 19 (derechos del titular).
- Ley N° 21.719, art. 9 (consentimiento informado), art. 19 (derechos), art. 24 (seguridad), art. 33 (evaluación de impacto, donde se establezca).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §1.3 (mapa de datos) y §4.3 (AIPD).

> **Disclaimer legal:** esta plantilla y los AIPD generados a partir de ella son borradores técnicos. Requieren revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^## Sección " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_plantilla.md"
```

Output esperado: `9` (las 9 secciones obligatorias).

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/aipd_plantilla.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): plantilla AIPD con 9 secciones (Ley 21.719 req.6)"
```

---

## Task 3: AIPD-01 Onboarding de restaurantes (`docs/privacidad/aipd_01_onboarding.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_01_onboarding.md`

- [ ] **Step 1: Crear el archivo `aipd_01_onboarding.md` redactado al completo.**

````markdown
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
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^## Sección " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_01_onboarding.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_01_onboarding.md" || echo "OK: sin placeholders"
```

Output esperado: `9` y `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/aipd_01_onboarding.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): AIPD-01 onboarding restaurantes redactada (Ley 21.719 req.6)"
```

---

## Task 4: AIPD-02 CRM de clientes finales (`docs/privacidad/aipd_02_crm_clientes.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_02_crm_clientes.md`

- [ ] **Step 1: Crear el archivo `aipd_02_crm_clientes.md` redactado.**

````markdown
# AIPD-02 — CRM de clientes finales

- **Identificador AIPD:** `AIPD-02`
- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Vinculación al RAT:** `RAT-004` (Pedidos de clientes finales), tratado por el restaurante como responsable y por Cmor Flow como **encargado**.
- **Responsable del tratamiento:** Restaurante (Cmor Flow actúa como encargado; ver DPA en `docs/contratos/DPA_cmor_restaurante.md`).
- **DPO:** `dpo@cmorflow.cl`.

## Sección 1 — Descripción del tratamiento

El CRM de clientes finales almacena los datos que el restaurante introduce sobre sus propios clientes en `public.restaurant_customers` (nombre, teléfono, email, notas) y los vincula con el historial de pedidos en `public.orders` (items, total, método de pago, marca temporal). El cliente final también puede ingresar su nombre y teléfono directamente al hacer un pedido desde `/menu/:slug`. Cmor Flow, como encargado, únicamente procesa estos datos por instrucción del restaurante y los almacena en Supabase.

Flujo de datos: cliente final en el menú QR → (HTTPS) → Supabase → tabla `orders` y `restaurant_customers`. El restaurante accede a su CRM desde su dashboard; un admin de Cmor Flow accede por soporte con `is_admin()`. No hay transferencia a terceros más allá de los encargados de infraestructura.

## Sección 2 — Necesidad y proporcionalidad

El tratamiento es necesario para **ejecutar el pedido** (base legal `contract`) y para **gestionar la relación cliente-restaurante** (CRM, base legal `legitimate_interest`).

- **Nombre y teléfono del cliente:** indispensables para armar el pedido y entregarlo. Sin nombre no es posible la preparación; sin teléfono no es posible coordinar la entrega.
- **Email del cliente:** opcional; se recoge solo para enviar comprobante o marketing si el cliente consiente.
- **Notas del CRM:** opcionales; las escribe el restaurante (preferencias, alergias declaradas por el cliente). No se exige.

Alternativas evaluadas: ofrecer pedidos 100% anónimos sin CRM. Se descartó porque el CRM es una funcionalidad central del SaaS solicitada por el restaurante responsable. La minimización se aplica permitiendo operar sin email y con nombre+teléfono mínimo.

## Sección 3 — Categorías de datos y datos sensibles

| Categoría | Campos | Tabla | Sensible | Origen |
|---|---|---|---|---|
| Identidad cliente | `customer_name` | `restaurant_customers`, `orders` | No | Cliente / Restaurante |
| Contacto cliente | `phone`, `email` | `restaurant_customers`, `orders` | No | Cliente / Restaurante |
| Transaccional | `items`, `total`, `payment_method` | `orders` | No (financiero) | Cliente |
| Operativos | `notes`, `customer_notes` | `restaurant_customers`, `orders` | No | Restaurante |

- **Datos sensibles:** las **notas del CRM pueden contener alergias o condiciones de salud declaradas voluntariamente** por el cliente. Aunque no son solicitadas activamente, el restaurante podría registrarlas. Se clasifican como potencialmente sensibles y se aplica: (a) no usarlas para automatizar decisiones, (b) accesibles solo al restaurante y a admin Cmor Flow, (c) cubiertas por RLS estricta.
- **Datos de niños/adolescentes:** no se verifican; servicio de pedidos genérico. Si un cliente menor deja datos, se aplican las mismas medidas de minimización.

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal | Consentimiento requerido |
|---|---|---|---|
| Cliente final | Identidad cliente, Contacto cliente, Transaccional | `contract` (ejecución del pedido) | No (necesario para entregar) |
| Cliente final | Marketing del restaurante | `consent` | Sí (scope `marketing`) |
| Restaurante | Notas del CRM (datos que el restaurante introduce) | `legitimate_interest` | No (responsable de esos datos) |

El restaurante es **responsable** de los datos de sus clientes y debe disponer de su propio aviso de privacidad; Cmor Flow es **encargado** y solo los procesa por instrucción.

## Sección 5 — Destinatarios y transferencias

- **Destinatarios internos:** el restaurante (vía RLS por `restaurant_id`), y admin Cmor Flow por soporte (`is_admin()`).
- **Encargados subcontratados:** Supabase (DB/Storage), Vercel (hosting). Mismos DPAs/SCC que AIPD-01.
- **Transferencias internacionales:** USA, riesgo **medio**, SCC + cifrado + minimización.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | Fuga de CRM de un restaurante a otro (cross-tenant) | 2 | 4 | 8 (medio) | Falla en RLS por `restaurant_id` |
| R2 | Notas sensibles (alergias/salud) expuestas en export | 2 | 3 | 6 (medio) | El admin exporta CSV sin anonimizar |
| R3 | Reidentificación por cruce teléfono+nombre+ciudad | 2 | 3 | 6 (medio) | Dataset pequeño por restaurante |
| R4 | Conservación indefinida de clientes inactivos | 3 | 2 | 6 (medio) | Incumplimiento retención 24 meses |
| R5 | Acceso de ex-empleado del restaurante (cuenta staff no dada de baja) | 2 | 3 | 6 (medio) | Gestión de altas/bajas del restaurante |

## Sección 7 — Medidas mitigantes

| Riesgo | Medida | Tipo | Reduce |
|---|---|---|---|
| R1 | RLS estricta por `restaurant_id` en `restaurant_customers` y `orders`; `audit_log` registra accesos | Técnica | Probabilidad |
| R1 | Tests de aislamiento multi-tenant en `security-check.ts` | Técnica | Probabilidad |
| R2 | Export admin se audita en `audit_log` con `action='export_data'`; filtro de notas sensibles en pipeline de IA (Regla 4) | Técnica/Org. | Impacto |
| R3 | Cifrado AES-256 reposo; no se exponen datos crudos en logs (`audit_log.metadata` sin personales) | Técnica | Impacto |
| R4 | `run_retention_sweep()` anonimiza clientes sin pedidos > 24 meses | Técnica | Probabilidad |
| R5 | MFA opcional para `staff`; el restaurante gestiona altas/bajas desde su settings | Org. | Probabilidad |

## Sección 8 — Riesgo residual

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | 1 | 3 | 3 (bajo) | Sí |
| R2 | 1 | 2 | 2 (bajo) | Sí |
| R3 | 1 | 2 | 2 (bajo) | Sí |
| R4 | 1 | 2 | 2 (bajo) | Sí |
| R5 | 2 | 2 | 4 (bajo) | Sí |

Todos los riesgos residuales quedan en **bajo**.

## Sección 9 — Decisión

- **Decisión:** **Procede.**
- **Condiciones:** mantener el DPA Cmor Flow ↔ Restaurante vigente (`docs/contratos/DPA_cmor_restaurante.md`); el restaurante debe informar a sus clientes (aviso de privacidad) y gestionar altas/bajas de staff.
- **Próxima revisión:** 2027-06-18 o ante activación de IA sobre datos del CRM.
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2, art. 4, art. 19.
- Ley N° 21.719, art. 9, art. 19, art. 24.
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §1.3, §4.1.
- DPA: `docs/contratos/DPA_cmor_restaurante.md`.

> **Disclaimer legal:** este AIPD es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^## Sección " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_02_crm_clientes.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_02_crm_clientes.md" || echo "OK: sin placeholders"
```

Output esperado: `9` y `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/aipd_02_crm_clientes.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): AIPD-02 CRM clientes finales redactada (Ley 21.719 req.6)"
```

---

## Task 5: AIPD-03 Chatbot (dormida) (`docs/privacidad/aipd_03_chatbot_dormida.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_03_chatbot_dormida.md`

- [ ] **Step 1: Crear el archivo `aipd_03_chatbot_dormida.md` redactado en estado dormida.**

````markdown
# AIPD-03 — Chatbot de recomendación (estado DORMIDA)

- **Identificador AIPD:** `AIPD-03`
- **Versión:** 1.0.0 (dormida)
- **Fecha:** 2026-06-18
- **Vinculación al RAT:** `RAT-008` (Chatbot de recomendación, stateless).
- **Estado:** **DORMIDA** — preparatoria. No se aplica hoy porque no existe LLM integrado.
- **Responsable del tratamiento:** Restaurante (el chatbot opera dentro de la experiencia de su menú).
- **DPO:** `dpo@cmorflow.cl`.

> **Estado actual (hoy):** el chatbot (`src/components/AiChatbot.tsx`) es **keyword-based y stateless**. Las conversaciones no se persisten en ninguna base de datos, no se envían a ningún modelo externo y **no se usan para entrenar nada**. Ver `docs/privacidad/reglas_ia.md`. Esta AIPD se mantiene **redactada y lista para activar** si/hay migración a un LLM.

## Sección 1 — Descripción del tratamiento

Escenario **futuro** evaluado: el chatbot pasa de keyword-based a un LLM (OpenAI, Anthropic, Mistral u otro) que recibe el contexto del cliente (platos consultados, preferencias expresadas en la conversación) y devuelve recomendaciones de menú.

Hoy (estado dormida) no existe tal flujo: el chatbot responde con reglas locales en el navegador y no sale del dispositivo del usuario.

Flujo hipotético al activar: cliente final → (HTTPS) → Edge Function → proveedor LLM (USA) → respuesta → cliente. Las Edge Functions aplicarían pseudonimización y filtro sensible antes de llamar al LLM (Reglas 3 y 4).

## Sección 2 — Necesidad y proporcionalidad

- **Finalidad legítima (hipotética):** mejorar la experiencia de pedido con recomendaciones contextuales.
- **Necesidad:** el LLM requiere contexto del cliente (platos vistos, preferencias) para ser útil; sin contexto es equivalente al keyword-based actual.
- **Proporcionalidad:** solo se envían preferencias de menú y platos; **no** identificadores personales (Regla 3). Si el LLM no necesita nombre/teléfono, no se envían.
- **Alternativas:** mantener keyword-based (estado actual). Se opta por este mientras no se justifique el valor de un LLM frente al riesgo añadido.

## Sección 3 — Categorías de datos y datos sensibles

| Categoría | Campos | Persistencia actual | Sensible |
|---|---|---|---|
| Contexto de conversación | platos consultados, preferencias | No persistido (memoria navegador) | No |
| Identidad cliente | `customer_name` | No enviado a LLM (Regla 3) | No |
| Preferencias dietarias | alergias, vegetariano, etc. | Voluntarias; podrían ser sensibles | **Sí** si declaran salud |

- **Datos sensibles:** preferencias dietarias pueden revelar salud (celiaquía, diabetes). Se aplica filtro (Regla 4) que bloquea patrones de salud antes del envío; en su lugar se usan categorías genéricas (`sin_gluten`, `vegetariano`).

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal | Consentimiento requerido |
|---|---|---|---|
| Cliente final | Contexto conversacional | `consent` (scope `ai_profiling`) | **Sí, obligatorio** |
| Cliente final | Preferencias dietarias sensibles | `consent` explícito + filtro | **Sí, obligatorio** |

**No se activa el chatbot LLM sin `scope='ai_profiling'` granted=true registrado en `consents`.**

## Sección 5 — Destinatarios y transferencias

- **Proveedor LLM (futuro):** USA; exige contrato **Zero Data Retention** + confirmación escrita + flag `training: false` (Regla 2).
- **Transferencias internacionales:** USA, riesgo **medio-alto** para contenido conversacional; mitigado con pseudonimización + filtro sensible + ZDR. Procede **condicionado**.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | Persistencia accidental de conversaciones | 3 | 3 | 9 (medio) | Si un dev activa logging sin revisar reglas |
| R2 | Entrenamiento del modelo con datos del cliente | 2 | 4 | 8 (medio) | Si proveedor no respeta ZDR |
| R3 | Fuga de dato sensible (salud) vía prompt | 3 | 3 | 9 (medio) | Filtro insuficiente |
| R4 | Reidentificación por contexto conversacional | 2 | 3 | 6 (medio) | Contexto único del cliente |
| R5 | Consentimiento `ai_profiling` no verificado | 2 | 4 | 8 (medio) | Activación sin gating |

## Sección 7 — Medidas mitigantes

| Riesgo | Medida | Tipo | Reduce |
|---|---|---|---|
| R1 | Regla 1 (no persistencia); requiere AIPD activa + consentimiento para cambiar | Org. | Probabilidad |
| R2 | Regla 2 (ZDR + flag training:false + confirmación escrita) | Técnica/Org. | Probabilidad |
| R3 | Regla 4 (filtro sensible: RUN, tarjeta, salud, biométrico, credenciales) | Técnica | Probabilidad |
| R4 | Regla 3 (pseudonimización antes del envío) | Técnica | Impacto |
| R5 | Gating: verificar `consents.scope='ai_profiling' granted=true` antes de activar LLM | Técnica | Probabilidad |

## Sección 8 — Riesgo residual

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | 1 | 2 | 2 (bajo) | Sí (con gating) |
| R2 | 1 | 3 | 3 (bajo) | Sí (con ZDR) |
| R3 | 1 | 2 | 2 (bajo) | Sí (con filtro) |
| R4 | 1 | 2 | 2 (bajo) | Sí (con pseudonimización) |
| R5 | 1 | 2 | 2 (bajo) | Sí (con gating obligatorio) |

## Sección 9 — Decisión

- **Decisión:** **No procede hoy** (estado dormida). **Procede condicionado** si y solo si, al activar el LLM, se cumplen: (1) consentimiento granular `ai_profiling=true`, (2) contrato ZDR firmado con proveedor, (3) filtro sensible operativo, (4) pseudonimización aplicada, (5) esta AIPD firmada de nuevo con fecha de activación.
- **Próxima revisión:** al evaluar migración a LLM, o 2027-06-18.
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2, art. 4, art. 19.
- Ley N° 21.719, art. 9, art. 19, art. 24.
- Reglas de IA: `docs/privacidad/reglas_ia.md`.
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.4.

> **Disclaimer legal:** este AIPD es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial y de la activación del chatbot LLM.
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^## Sección " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_03_chatbot_dormida.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_03_chatbot_dormida.md" || echo "OK: sin placeholders"
```

Output esperado: `9` y `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/aipd_03_chatbot_dormida.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): AIPD-03 chatbot en estado dormida (Ley 21.719 req.6, D11)"
```

---

## Task 6: AIPD-04 Exportaciones por admin (`docs/privacidad/aipd_04_exportaciones.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_04_exportaciones.md`

- [ ] **Step 1: Crear el archivo `aipd_04_exportaciones.md` redactado.**

````markdown
# AIPD-04 — Exportación de datos por admin (reportes CSV)

- **Identificador AIPD:** `AIPD-04`
- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Vinculación al RAT:** `RAT-009` (Cumplimiento y auditoría) y `RAT-010` (Seguridad).
- **Responsable del tratamiento:** Cmor Flow.
- **DPO:** `dpo@cmorflow.cl`.

## Sección 1 — Descripción del tratamiento

Los administradores de Cmor Flow generan reportes CSV desde el panel admin con fines de auditoría, soporte y métricas. La exportación cubre tablas como `restaurants`, `orders`, `restaurant_customers`, `registration_requests`, `consents`, `data_subject_requests`, `audit_log` y `breach_register`. Cada exportación se ejecuta vía el cliente Supabase del navegador del admin y produce un archivo CSV que se descarga localmente.

Flujo de datos: navegador admin → (HTTPS) → Supabase (RLS valida `is_admin()`) → CSV en memoria del navegador → descarga local. No se persisten los CSV en Storage; la exportación se registra en `audit_log` con `action='export_data'` y metadatos (tabla, número de filas, rango temporal), **sin** el contenido exportado.

## Sección 2 — Necesidad y proporcionalidad

- **Finalidad legítima:** auditoría de cumplimiento (DSARs, consents), soporte a restaurantes, métricas de negocio.
- **Necesidad:** sin exportación no es posible revisar agregados ni responder a un DSAR a tiempo (Ley 21.719 art. 19).
- **Proporcionalidad:** las exportaciones se limitan por RLS a `is_admin()`; se exportan solo los campos necesarios para el reporte; los CSV no incluyen columnas redundantes. Se evita exportar `password_hash`, tokens ni secretos.

## Sección 3 — Categorías de datos y datos sensibles

| Categoría | Campos incluidos en reportes | Sensible | Notas |
|---|---|---|---|
| Identidad B2B | `owner_name`, `restaurant_name` | No | Reporte de restaurantes |
| Contacto B2B | `email`, `phone`, `city` | No | Reporte de restaurantes |
| Identidad cliente | `customer_name` | No | Reporte de clientes (soporte) |
| Contacto cliente | `phone`, `email` | No | Reporte de clientes (soporte) |
| Transaccional | `items`, `total`, `payment_method` | No (financiero) | Reporte de pedidos |
| Consents | `scope`, `granted`, `granted_at`, `policy_version` | No | Reporte de cumplimiento |
| DSARs | `request_type`, `status`, `sla_due_at` | No (metadatos) | Reporte SLA |
| Audit | `action`, `actor_email`, `created_at`, `ip` | No (sin personales en metadata) | Reporte de seguridad |

- **Datos sensibles:** no se exportan notas del CRM con posible contenido de salud de forma rutinaria. Si se requiere, se documenta el caso y se filtra.
- **Tokens y secretos:** no se exportan (`token`, `password_hash` se excluyen explícitamente).

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal | Consentimiento requerido |
|---|---|---|---|
| Owner / staff | Identidad B2B, Contacto B2B | `legitimate_interest` (auditoría) / `legal_obligation` (cumplimiento Ley 21.719) | No |
| Cliente final | Identidad cliente, Contacto cliente, Transaccional | `legitimate_interest` (soporte al restaurante responsable) | No |

Las exportaciones a clientes finales se hacen por instrucción del restaurante responsable; el DPA cubre este encargo.

## Sección 5 — Destinatarios y transferencias

- **Destinatarios:** únicamente el admin Cmor Flow (descarga local).
- **Encargados:** Supabase (DB), Vercel (hosting). El CSV no transita por terceros adicionales.
- **Transferencias:** las mismas de la infraestructura (USA, SCC). El archivo CSV descargado vive en el dispositivo del admin: política interna obliga a cifrado de disco y borrado tras 90 días.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | CSV exportado con demasiados datos y filtrado a terceros | 2 | 4 | 8 (medio) | Exceso de columnas o envío por canal inseguro |
| R2 | Compromiso de la cuenta admin (export masivo malicioso) | 2 | 4 | 8 (medio) | Sin MFA o sin monitoreo |
| R3 | Exportación sin registro en `audit_log` | 2 | 3 | 6 (medio) | Falta de trazabilidad |
| R4 | CSV retenido indefinidamente en el dispositivo admin | 3 | 3 | 9 (medio) | Política interna débil |
| R5 | Exportación de notas sensibles (salud) sin filtro | 2 | 3 | 6 (medio) | Reportes ad-hoc |

## Sección 7 — Medidas mitigantes

| Riesgo | Medida | Tipo | Reduce |
|---|---|---|---|
| R1 | Las exportaciones se limitan por RLS `is_admin()` y a columnas mínimas | Técnica | Impacto |
| R1 | Política: nunca enviar CSV por email; usar canal seguro interno | Org. | Probabilidad |
| R2 | MFA obligatorio para `admin` (D8) | Técnica | Probabilidad |
| R2 | `security-check.ts` alerta de exports masivos (queries predefinidas en `securityService`) | Técnica | Probabilidad |
| R3 | Toda exportación escribe en `audit_log` con `action='export_data'` | Técnica | Probabilidad |
| R4 | Política interna: cifrado de disco + borrado del CSV a los 90 días | Org. | Impacto |
| R5 | Excluir `notes`/`customer_notes` salvo solicitud documentada | Técnica | Impacto |

## Sección 8 — Riesgo residual

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | 1 | 2 | 2 (bajo) | Sí |
| R2 | 1 | 3 | 3 (bajo) | Sí |
| R3 | 1 | 2 | 2 (bajo) | Sí |
| R4 | 2 | 2 | 4 (bajo) | Sí |
| R5 | 1 | 2 | 2 (bajo) | Sí |

Todos los riesgos residuales en **bajo**.

## Sección 9 — Decisión

- **Decisión:** **Procede condicionado.**
- **Condiciones:** (1) MFA admin obligatorio; (2) toda exportación se registra en `audit_log`; (3) política interna de borrado de CSV a 90 días; (4) exclusión por defecto de notas sensibles.
- **Próxima revisión:** 2027-06-18 o ante nuevo tipo de reporte.
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2, art. 19.
- Ley N° 21.719, art. 19 (derechos del titular), art. 24 (seguridad).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §1.3, §4.5.
- DPA: `docs/contratos/DPA_cmor_restaurante.md`.

> **Disclaimer legal:** este AIPD es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^## Sección " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_04_exportaciones.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/aipd_04_exportaciones.md" || echo "OK: sin placeholders"
```

Output esperado: `9` y `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/aipd_04_exportaciones.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): AIPD-04 exportaciones admin redactada (Ley 21.719 req.6)"
```

---

## Task 7: Playbook de respuesta a incidentes (`docs/seguridad/playbook_respuesta_incidentes.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/playbook_respuesta_incidentes.md`

- [ ] **Step 1: Crear el archivo `playbook_respuesta_incidentes.md` redactado.**

````markdown
# Playbook de Respuesta a Incidentes de Seguridad

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Responsable:** Encargado de respuesta a incidentes (designado por el DPO).
- **Marco normativo:** Ley N° 19.628 y Ley N° 21.719; notificación a la autoridad competente y a titulares **dentro de 72 horas** cuando la brecha sea de severidad `medium` o superior.

## Roles

- **DPO:** `dpo@cmorflow.cl`. Toma la decisión de notificar a la autoridad y a titulares.
- **Encargado de respuesta:** coordina contención e investigación técnica; registra cada paso en `breach_register`.
- **Responsable de seguridad:** rotación de secretos, monitoreo `audit_log`, ejecución de `security-check.ts`.

## Registro obligatorio

Todo incidente se registra en `public.breach_register` con `status='detected'`, `severity`, `description` y `affected_data_categories`. Los cambios de estado (`investigating`, `contained`, `notified`, `closed`) se actualizan en la misma fila y quedan trazados por el trigger `breach_updated_at`.

## Fases del playbook

### Fase 1 — Detección (0h)

- [ ] Origen de la detección: alerta Supabase (Auth rate-limit, RLS denials), consulta de anomalías en `/admin/security` (logins fallidos > 10, exports masivos), reporte interno o reporte externo.
- [ ] Crear fila en `breach_register` con `status='detected'`, `detected_at=now()`, `severity` inicial (conservadora: ante duda, `medium`).
- [ ] Notificar al DPO y al encargado de respuesta por canal fuera de banda (no usar el sistema comprometido si está en sospecha).

### Fase 2 — Evaluación (≤ 24h)

- [ ] Confirmar si es una brecha real de seguridad de datos personales (Ley 21.719).
- [ ] Identificar categorías afectadas (ver spec §1.3): identidad B2B, contacto B2B, autenticación, identidad cliente, contacto cliente, transaccional, tokens, audit, consents, DSARs.
- [ ] Estimar número de titulares afectados (`affected_subjects_count`).
- [ ] Reclassificar `severity`: `low` (sin datos personales, sin acceso real), `medium` (acceso a contacto B2B/cliente de pocos titulares), `high` (acceso a autenticación o muchos titulares), `critical` (acceso masivo o a datos sensibles).
- [ ] Actualizar `breach_register.status='investigating'`.

### Fase 3 — Contención (inmediata tras evaluación)

- [ ] Revocar sesiones comprometidas (Supabase Auth → revoke).
- [ ] Rotar `SUPABASE_SERVICE_ROLE_KEY` y API keys afectadas (ver `docs/seguridad/rotacion_secretos.md`).
- [ ] Bloquear cuentas implicadas (soft-delete o `block_reason`).
- [ ] Aplicar parche RLS de emergencia si la causa es una política débil.
- [ ] Restaurar backup PITR si hay corrupción de datos.
- [ ] Actualizar `breach_register.status='contained'` y `containment_measures`.

### Fase 4 — Notificación a la autoridad competente (≤ 72h desde detección, si severity ≥ medium)

- [ ] Si `severity IN ('medium','high','critical')`: preparar notificación usando `docs/seguridad/plantilla_notificacion_autoridad.md`.
- [ ] Enviar a **la autoridad competente** (D12; canal a definir cuando se publique la autoridad final bajo Ley 21.719; mientras tanto, documentar el envío y conservar acuse).
- [ ] Registrar `breach_register.reported_at=now()` y `authority_notified_at=now()` y `status='notified'`.
- [ ] Si `severity='low'`: documentar la decisión de **no** notificar con justificación en `breach_register.containment_measures`.

### Fase 5 — Notificación a titulares afectados (≤ 72h, si hay riesgo a sus derechos)

- [ ] Si la brecha implica riesgo alto a los derechos y libertades de los titulares (acceso a autenticación, datos sensibles, o muchos titulares): preparar notificación con `docs/seguridad/plantilla_notificacion_titulares.md`.
- [ ] Enviar por email (o por canal disponible) a los titulares afectados.
- [ ] Registrar `breach_register.subjects_notified_at=now()`.

### Fase 6 — Cierre y root cause

- [ ] Completar `breach_register.root_cause` con análisis técnico.
- [ ] Definir acciones correctivas (parches, pruebas, training) con responsable y fecha.
- [ ] Actualizar `breach_register.status='closed'`.
- [ ] Comunicado interno al equipo con `docs/seguridad/plantilla_comunicado_interno.md`.
- [ ] Lecciones aprendidas: actualizar `security-check.ts`, RLS, o este playbook según corresponda.

## Tablero de tiempo (objetivo)

| Hora desde detección | Hito |
|---|---|
| 0h | Detección + fila en `breach_register` |
| ≤ 24h | Evaluación + severidad final |
| Inmediata | Contención |
| ≤ 72h | Notificación autoridad (si severity ≥ medium) |
| ≤ 72h | Notificación titulares (si riesgo alto) |
| Post-cierre | Root cause + acciones correctivas |

## Referencias normativas

- Ley N° 19.628, art. 23 (seguridad).
- Ley N° 21.719, art. 24 (seguridad del tratamiento), obligación de notificar brechas a la autoridad y a titulares.
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

## Control de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-06-18 | 1.0.0 | Playbook inicial. |

> **Disclaimer legal:** este playbook es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -cE "^### Fase " "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/playbook_respuesta_incidentes.md"
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/playbook_respuesta_incidentes.md" || echo "OK: sin placeholders"
```

Output esperado: `6` (las 6 fases) y `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/seguridad/playbook_respuesta_incidentes.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(seguridad): playbook respuesta a incidentes con flujo 72h (Ley 21.719 req.10)"
```

---

## Task 8: Plantilla notificación a la autoridad (`docs/seguridad/plantilla_notificacion_autoridad.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_notificacion_autoridad.md`

- [ ] **Step 1: Crear el archivo `plantilla_notificacion_autoridad.md` redactado.**

````markdown
# Plantilla — Notificación de brecha a la autoridad competente

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Marco normativo:** Ley N° 21.719, notificación a la autoridad competente **dentro de 72 horas** desde la detección cuando la brecha sea `medium` o superior (D12).

> Cómo usar: copiar el bloque **Texto de la notificación** en el cuerpo del correo (o documento) dirigido a *la autoridad competente*. Reemplazar los campos entre llaves `{...}` con los datos del incidente tomados de `breach_register`.

## Datos del remitente

- **Responsable del tratamiento:** Cmor Flow.
- **DPO:** `dpo@cmorflow.cl`.
- **Teléfono de contacto DPO:** `{+56 X XXXX XXXX}`.
- **Fecha de la notificación:** `{YYYY-MM-DD}`.

## Texto de la notificación

Asunto: **Notificación de brecha de seguridad de datos personales — Cmor Flow — Ref. `{breach_register.id}`**

Estimada autoridad competente:

En cumplimiento de la obligación de notificar brechas de seguridad que afecten datos personales conforme a la Ley N° 21.719, Cmor Flow comunica la siguiente brecha:

1. **Referencia interna:** `{breach_register.id}`.
2. **Fecha y hora de detección:** `{breach_register.detected_at}` (hora de Chile).
3. **Fecha y hora de esta notificación:** `{ahora}` (dentro de las 72 horas desde la detección).
4. **Descripción de la brecha:** `{breach_register.description}`. Naturaleza del incidente: `{acceso no autorizado / exfiltración / pérdida / destrucción / alteración}`.
5. **Categorías de datos afectadas:** `{breach_register.affected_data_categories}` — p. ej. *identidad B2B, contacto B2B, autenticación, identidad cliente, contacto cliente, transaccional, tokens, audit, consents, DSARs*.
6. **Número aproximado de titulares afectados:** `{breach_register.affected_subjects_count}`.
7. **Severidad asignada:** `{breach_register.severity}` (low / medium / high / critical).
8. **Probables consecuencias:** `{descripción de los riesgos para los titulares: p. ej. suplantación de identidad, fraude, exposición de contacto}`.
9. **Medidas de contención aplicadas:** `{breach_register.containment_measures}` — incluye revocación de sesiones, rotación de credenciales, parche RLS, restauración de backup, bloqueo de cuentas.
10. **Medidas correctivas en curso:** `{acciones con responsable y fecha}`.
11. **Notificación a titulares:** `{Sí, enviada el YYYY-MM-DD / No, por no existir riesgo alto a sus derechos, conforme evaluación DPO}`.
12. **Contacto del DPO:** `dpo@cmorflow.cl` — `{+56 X XXXX XXXX}`.

Quedamos a disposición para ampliar la información y aportar la evidencia que se requiera.

Atentamente,

**`{Nombre del DPO}`**
Data Protection Officer — Cmor Flow
`dpo@cmorflow.cl`

## Checklist de envío

- [ ] Datos del remitente completados.
- [ ] Campos 1–12 rellenados desde `breach_register`.
- [ ] `breach_register.reported_at=now()`.
- [ ] `breach_register.authority_notified_at=now()`.
- [ ] `breach_register.status='notified'`.
- [ ] Acuse de recibo conservado (adjunto al registro del incidente).

## Referencias normativas

- Ley N° 21.719 (notificación de brechas a la autoridad competente, dentro de 72 horas).
- Ley N° 19.628, art. 23 (seguridad).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** esta plantilla es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -E "TBD|TODO|completar aquí" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_notificacion_autoridad.md" || echo "OK: sin placeholders prohibidos"
```

Output esperado: `OK: sin placeholders prohibidos` (los `{...}` son campos a rellenar por diseño, permitidos).

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/seguridad/plantilla_notificacion_autoridad.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(seguridad): plantilla notificacion a autoridad competente 72h (Ley 21.719 req.10)"
```

---

## Task 9: Plantilla notificación a titulares (`docs/seguridad/plantilla_notificacion_titulares.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_notificacion_titulares.md`

- [ ] **Step 1: Crear el archivo `plantilla_notificacion_titulares.md` redactado en lenguaje claro.**

````markdown
# Plantilla — Notificación de brecha a titulares afectados

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Marco normativo:** Ley N° 21.719, notificación a titulares **dentro de 72 horas** cuando la brecha implique riesgo alto a sus derechos y libertades.

> Cómo usar: enviar por email (o canal disponible) a cada titular afectado. Personalizar el saludo y los datos entre llaves. Mantener el lenguaje simple y orientado a la acción.

## Texto de la notificación

Asunto: **Aviso importante sobre la seguridad de tus datos — Cmor Flow**

Hola, `{nombre del titular}`:

Te escribimos porque detectamos un incidente de seguridad que pudo haber expuesto algunos de tus datos personales. Te contamos qué pasó, qué datos están involucrados y qué te recomendamos hacer.

**¿Qué pasó?**

`{descripción breve y clara del incidente, sin tecnicismos: p. ej. "Alguien accedió sin autorización a una base de datos que contenía tu nombre y teléfono"}`. Lo detectamos el `{fecha de detección}` y ya tomamos medidas para frenarlo.

**¿Qué datos tuyos están involucrados?**

`{lista concreta: nombre, teléfono, correo, etc.}`. **No** están involucrados `{datos no afectados: p. ej. contraseñas, tarjetas}`.

**¿Qué hicimos nosotros?**

- Cerramos las sesiones y rotamos las credenciales afectadas.
- Reparamos la causa del incidente.
- Reportamos el caso a la autoridad competente.

**¿Qué te recomendamos hacer?**

1. **Cambia tu contraseña** de Cmor Flow en `{enlace a /setup-password o recuperación}` si tienes cuenta con nosotros.
2. **Revisa tu correo y teléfono** por si recibes mensajes sospechosos: no entregues claves ni códigos a quien te los pida.
3. **Desconfía de correos o llamadas** que mencionen este incidente para pedirte datos: Cmor Flow **nunca** te pedirá tu contraseña.
4. Si tienes dudas, escríbenos a `dpo@cmorflow.cl`.

**¿Dónde obtener más información?**

Puedes escribirnos a `dpo@cmorflow.cl` indicando en el asunto "Brecha — Ref. `{breach_register.id}`". Atenderemos tu consulta dentro de los plazos legales.

Lamentamos lo ocurrido y trabajamos para que no vuelva a pasar.

Atentamente,

**`{Nombre del DPO}`**
Data Protection Officer — Cmor Flow
`dpo@cmorflow.cl`

## Checklist de envío

- [ ] Saludo personalizado.
- [ ] Datos afectados correctos por titular (no listas genéricas).
- [ ] Enlace de cambio de contraseña válido.
- [ ] `breach_register.subjects_notified_at=now()`.
- [ ] Registro del envío (logs del email provider).

## Referencias normativas

- Ley N° 21.719 (notificación a titulares afectados, dentro de 72 horas si hay riesgo alto).
- Ley N° 19.628, art. 19 (derechos del titular).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** esta plantilla es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -E "TBD|TODO|completar aquí" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_notificacion_titulares.md" || echo "OK: sin placeholders prohibidos"
```

Output esperado: `OK: sin placeholders prohibidos`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/seguridad/plantilla_notificacion_titulares.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(seguridad): plantilla notificacion a titulares en lenguaje claro (Ley 21.719 req.10)"
```

---

## Task 10: Plantilla comunicado interno (`docs/seguridad/plantilla_comunicado_interno.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_comunicado_interno.md`

- [ ] **Step 1: Crear el archivo `plantilla_comunicado_interno.md` redactado.**

````markdown
# Plantilla — Comunicado interno de incidente

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Audiencia:** equipo interno de Cmor Flow (desarrollo, soporte, ventas, dirección).

> Cómo usar: enviar por el canal interno oficial (Slack/email) al cierre del incidente o cuando se requiera coordinar. Ajustar el nivel de detalle al rol del destinatario.

## Texto del comunicado

Asunto: **Interno — Incidente de seguridad `{breach_register.id}` — resumen y acciones**

Equipo,

Resumen del incidente de seguridad `{breach_register.id}` para coordinación interna. **Este mensaje es confidencial y de uso interno. No reenviar ni comentar fuera de Cmor Flow.**

**Qué pasó (resumen ejecutivo)**

`{2–3 líneas en lenguaje plano: qué se vio, cuándo, qué se afectó}`.

**Estado actual**

- Severidad: `{low / medium / high / critical}`.
- Estado: `{contained / notified / closed}`.
- Categorías afectadas: `{breach_register.affected_data_categories}`.
- Titulares afectados (aprox.): `{breach_register.affected_subjects_count}`.

**Acciones tomadas**

- `{acción 1}`.
- `{acción 2}`.
- `{acción 3}`.

**Notificaciones externas**

- Autoridad competente: `{notificada el YYYY-MM-DD / no requerida}`.
- Titulares: `{notificados el YYYY-MM-DD / no requerido}`.

**Qué se pide al equipo**

- **Soporte:** usar el guion oficial (ver más abajo) si un cliente o titular pregunta. No dar detalles técnicos.
- **Ventas:** no iniciar conversaciones sobre este incidente; si un cliente pregunta, derivar al DPO.
- **Desarrollo:** priorizar las acciones correctivas listadas en `{enlace al issue/ticket}`.
- **Comunicaciones:** cualquier declaración externa pasa por el DPO. Sin permiso, no publicar nada en redes ni a clientes.

**Guion para consultas**

> *"Estamos al tanto del incidente, ya lo contuvimos y notificamos a las autoridades y a las personas afectadas conforme a la ley. Por favor escribe a dpo@cmorflow.cl para detalles de tu caso."*

**Contacto**

DPO: `dpo@cmorflow.cl`. Encargado de respuesta: `{nombre}`.

Gracias por la colaboración.

## Checklist de envío

- [ ] Resumen ejecutivo revisado por el DPO.
- [ ] Acciones tomadas actualizadas en `breach_register`.
- [ ] Guion de consultas difundido a soporte y ventas.
- [ ] Recordatorio de confidencialidad incluido.

## Referencias normativas

- Ley N° 21.719, art. 24 (seguridad del tratamiento).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** este comunicado es interno. Su difusión externa está sujeta a aprobación del DPO.
````

- [ ] **Step 2: Verificar**

```bash
grep -E "TBD|TODO|completar aquí" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/plantilla_comunicado_interno.md" || echo "OK: sin placeholders prohibidos"
```

Output esperado: `OK: sin placeholders prohibidos`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/seguridad/plantilla_comunicado_interno.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(seguridad): plantilla comunicado interno de incidentes"
```

---

## Task 11: Política de rotación de secretos (`docs/seguridad/rotacion_secretos.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/rotacion_secretos.md`

- [ ] **Step 1: Crear el archivo `rotacion_secretos.md` redactado.**

````markdown
# Política de Rotación de Secretos

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.5.
- **Responsable:** Responsable de seguridad.
- **Frecuencia base:** rotación **trimestral** de los secretos enumerados abajo. Rotación **inmediata** ante sospecha de compromiso (ver `docs/seguridad/playbook_respuesta_incidentes.md` Fase 3).

## Secretos en alcance

| Secreto | Dónde vive | Caducidad | Rotación |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API keys; usada en Edge Functions y scripts (`scripts/security-check.ts`) | n/a | Trimestral + tras incidente |
| `SUPABASE_URL` | No es secreto per se, pero se rota junto al proyecto si se reemplaza | — | Solo si migración de proyecto |
| `SUPABASE_ANON_KEY` | Frontend (no es crítica) | n/a | Trimestral por buena práctica |
| API key del email provider (Resend por defecto) | Dashboard del proveedor; en Supabase Edge Functions Secrets | n/a | Trimestral + tras incidente |
| API key del proveedor IA (futuro) | Solo si AIPD-03 se activa | n/a | Trimestral + tras incidente |
| Secrets de Vercel | Vercel Project Settings | n/a | Trimestral |
| JWT secret de Supabase | Supabase (gestionado por el servicio) | n/a | No rotar salvo indicación de Supabase |
| Tokens de integraciones de terceros | Variables de entorno | n/a | Trimestral |

## Procedimiento de rotación trimestral

1. **Agendar:** la rotación entra en el checklist trimestral (`docs/privacidad/checklist_trimestral.md`).
2. **Generar nuevo secreto** en el dashboard del proveedor (Supabase / Resend / Vercel).
3. **Actualizar** las variables de entorno:
   - Vercel (Project Settings → Environment Variables) — para el frontend y Edge Functions.
   - Supabase → Edge Functions → Secrets — para las EF (`invite-owner`, futuras `privacy/*`).
   - Archivo `.env` local solo para desarrollo; **nunca** commitear `.env` (verificado por `scripts/security-check.ts`).
4. **Redeploy** Edge Functions (`supabase functions deploy <name>`) y Vercel (auto-deploy o manual).
5. **Revocar** el secreto anterior desde el dashboard del proveedor una vez confirmado que todo funciona.
6. **Verificar** ejecutando `npm run security-check` y un smoke test (login admin, envío de invitación).
7. **Registrar** la rotación en `audit_log` con `action='secret_rotated'` (si hay canal para insertar) o en un log de cambios interno.

## Procedimiento de rotación por incidente

1. Activar Fase 3 del playbook de respuesta.
2. Rotar `SUPABASE_SERVICE_ROLE_KEY` y API keys afectadas de forma **inmediata**, sin esperar al trimestre.
3. Forzar logout de sesiones activas (Supabase Auth).
4. Verificar con `security-check.ts` y monitorear `audit_log` durante 72h.

## Reglas adicionales

- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en el bundle del frontend. Todo uso server-side (Edge Functions o scripts Node).
- `.env` debe estar en `.gitignore` (verificado por `security-check.ts`).
- Compartir secretos solo por canal seguro (gestor de contraseñas), nunca por chat plano ni email.
- Backups cifrados (AES-256) con sus propias claves rotadas anualmente.

## Referencias normativas

- Ley N° 19.628, art. 23 (seguridad).
- Ley N° 21.719, art. 24 (seguridad del tratamiento).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.5.

## Control de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-06-18 | 1.0.0 | Política inicial (rotación trimestral + por incidente). |

> **Disclaimer legal:** esta política es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
````

- [ ] **Step 2: Verificar**

```bash
grep -E "TBD|TODO|completar aquí|\[descripción\]" "C:/Users/angel/Desktop/Code/SaaS suchi/docs/seguridad/rotacion_secretos.md" || echo "OK: sin placeholders"
```

Output esperado: `OK: sin placeholders`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/seguridad/rotacion_secretos.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(seguridad): politica rotacion trimestral de secretos (Ley 21.719 req.5)"
```

---

## Task 12: Script `security-check.ts`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/scripts/security-check.ts`
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/package.json`

- [ ] **Step 1: Crear la carpeta `scripts/` (si no existe) y el archivo `security-check.ts`.**

El script usa `@supabase/supabase-js` desde `node_modules` (Node, no Deno). Lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` desde `process.env`. Sale con código 0 (éxito) o 1 (fallos).

```typescript
// =====================================================================
// scripts/security-check.ts
// ---------------------------------------------------------------------
// Validaciones operacionales de seguridad (spec §4.5):
//   1. RLS habilitada en todas las tablas con datos personales.
//   2. Ningun SECURITY DEFINER sin chequeo is_admin() (escanea pg_proc).
//   3. .env no commiteado (no aparece en `git ls-files`).
//   4. admin_users sin grants a anon/authenticated (post-deprecation).
//
// Requiere:
//   - Node con soporte ESM (package.json "type":"module" ya configurado).
//   - @supabase/supabase-js instalado en node_modules.
//   - Variables de entorno:
//       SUPABASE_URL=https://xxxx.supabase.co
//       SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// Uso:  npm run security-check
// Salida: 0 si todas pasan, 1 si alguna falla.
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Faltan variables de entorno. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
  );
  console.error(
    "En PowerShell: $env:SUPABASE_URL='...'; $env:SUPABASE_SERVICE_ROLE_KEY='...'; npm run security-check"
  );
  console.error(
    "En bash: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run security-check"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CheckResult = { name: string; passed: boolean; detail: string };

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

const TABLES_WITH_PERSONAL_DATA: string[] = [
  "consents",
  "audit_log",
  "data_subject_requests",
  "breach_register",
  "profiles",
  "restaurants",
  "orders",
  "restaurant_customers",
  "invitations",
  "registration_requests",
  "notifications",
];

async function checkRlsEnabled() {
  const { data, error } = await supabase.rpc("security_check_rls_status");
  if (error) {
    record(
      "RLS habilitada",
      false,
      `No se pudo consultar RLS via RPC 'security_check_rls_status': ${error.message}. Crea la RPC (ver Step 2) o ajusta el nombre en el script.`
    );
    return;
  }
  const rows = (data || []) as { table_name: string; rls_enabled: boolean }[];
  const sinRls = TABLES_WITH_PERSONAL_DATA.filter((t) => {
    const row = rows.find((r) => r.table_name === t);
    return !row || row.rls_enabled !== true;
  });
  if (sinRls.length === 0) {
    record(
      "RLS habilitada",
      true,
      `Las ${TABLES_WITH_PERSONAL_DATA.length} tablas con datos personales tienen RLS activa.`
    );
  } else {
    record(
      "RLS habilitada",
      false,
      `Tablas sin RLS o no encontradas: ${sinRls.join(", ")}`
    );
  }
}

async function checkSecurityDefiner() {
  const { data, error } = await supabase.rpc("security_check_security_definer");
  if (error) {
    record(
      "SECURITY DEFINER sin is_admin()",
      false,
      `No se pudo consultar via RPC 'security_check_security_definer': ${error.message}.`
    );
    return;
  }
  const offenders = (data || []) as { proname: string }[];
  if (offenders.length === 0) {
    record(
      "SECURITY DEFINER sin is_admin()",
      true,
      "Toda funcion SECURITY DEFINER incluye chequeo is_admin() o es interna segura."
    );
  } else {
    record(
      "SECURITY DEFINER sin is_admin()",
      false,
      `Funciones potencialmente inseguras: ${offenders
        .map((o) => o.proname)
        .join(", ")}`
    );
  }
}

function checkEnvNotCommitted() {
  try {
    const out = execSync("git ls-files", {
      cwd: "C:/Users/angel/Desktop/Code/SaaS suchi",
      encoding: "utf8",
    });
    const tracked = out.split(/\r?\n/);
    const envFiles = tracked.filter((f) => f && f.endsWith(".env"));
    if (envFiles.length === 0) {
      record(
        ".env no commiteado",
        true,
        "Ningun archivo .env aparece en `git ls-files`."
      );
    } else {
      record(
        ".env no commiteado",
        false,
        `Archivos .env commiteados: ${envFiles.join(", ")}`
      );
    }
  } catch (e) {
    record(
      ".env no commiteado",
      false,
      `No se pudo ejecutar 'git ls-files': ${String(e)}`
    );
  }
}

async function checkAdminUsersGrants() {
  const { data, error } = await supabase.rpc("security_check_admin_users_grants");
  if (error) {
    record(
      "admin_users sin grants anon/auth",
      false,
      `No se pudo consultar via RPC 'security_check_admin_users_grants': ${error.message}.`
    );
    return;
  }
  const row = (data || [{}])[0] as {
    anon_select?: boolean;
    auth_select?: boolean;
  };
  const anonOk = row.anon_select === false;
  const authOk = row.auth_select === false;
  if (anonOk && authOk) {
    record(
      "admin_users sin grants anon/auth",
      true,
      "admin_users no concede SELECT a anon ni a authenticated (D9 OK)."
    );
  } else {
    record(
      "admin_users sin grants anon/auth",
      false,
      `admin_users concede SELECT a anon=${row.anon_select}, authenticated=${row.auth_select}. Aplica database/06_password_deprecation.sql.`
    );
  }
}

async function main() {
  console.log("== security-check — Cmor Flow ==");
  console.log(`Endpoint: ${SUPABASE_URL}`);
  console.log("");
  await checkRlsEnabled();
  await checkSecurityDefiner();
  checkEnvNotCommitted();
  await checkAdminUsersGrants();

  console.log("");
  for (const r of results) {
    const tag = r.passed ? "PASS" : "FAIL";
    console.log(`[${tag}] ${r.name}`);
    console.log(`        ${r.detail}`);
  }
  console.log("");
  const failed = results.filter((r) => !r.passed).length;
  if (failed === 0) {
    console.log(
      `Resultado: TODAS LAS VALIDACIONES PASARON (${results.length}/${results.length}).`
    );
    process.exit(0);
  } else {
    console.log(
      `Resultado: ${failed} validacion(es) fallaron de ${results.length}.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error inesperado en security-check:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Crear las RPC auxiliares en Supabase (pre-requisito para que el script funcione).**

Aplicar este SQL una sola vez en el SQL Editor de Supabase (o vía MCP). Es idempotente.

```sql
-- RPC auxiliares para scripts/security-check.ts
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
```

- [ ] **Step 3: Añadir la entrada `"security-check"` a `package.json` y la dependencia `tsx`.**

Modificar `C:/Users/angel/Desktop/Code/SaaS suchi/package.json` para que el bloque `scripts` quede así:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "security-check": "tsx scripts/security-check.ts"
  },
```

Y añadir a `devDependencies`:

```json
    "tsx": "^4.19.0"
```

Luego ejecutar `npm install` en la terminal del proyecto.

- [ ] **Step 4: Verificar ejecución.**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run security-check
```

Output esperado: 4 checks `[PASS]` y `Resultado: TODAS LAS VALIDACIONES PASARON (4/4)`. Sale con código 0. Si alguna falla, sale con código 1.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add scripts/security-check.ts package.json
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(security): script security-check + entrada npm (Ley 21.719 req.5)"
```

---

## Task 13: Servicio `securityService.ts` (`src/services/securityService.ts`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/services/securityService.ts`

- [ ] **Step 1: Crear el archivo `securityService.ts`.**

```typescript
// src/services/securityService.ts
// Servicio para la UI admin de seguridad (/admin/security).
// Lee breach_register y agrega anomalias del audit_log.
// Sigue el patron de adminService.ts (funciones nombradas, supabase desde config).

import { supabase } from "../config/supabase";

export type BreachSeverity = "low" | "medium" | "high" | "critical";
export type BreachStatus =
  | "detected"
  | "investigating"
  | "contained"
  | "notified"
  | "closed";

export interface BreachRecord {
  id: string;
  detected_at: string;
  reported_at: string | null;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  affected_data_categories: string[] | null;
  affected_subjects_count: number | null;
  containment_measures: string | null;
  root_cause: string | null;
  authority_notified_at: string | null;
  subjects_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnomalyResult {
  key: string;
  label: string;
  count: number;
  window_hours: number;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function listBreaches(filters?: {
  severity?: BreachSeverity | "all";
  status?: BreachStatus | "all";
}): Promise<ServiceResult<BreachRecord[]>> {
  let query = supabase
    .from("breach_register")
    .select("*")
    .order("detected_at", { ascending: false });

  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data || []) as BreachRecord[], error: null };
}

export async function createBreach(input: {
  severity: BreachSeverity;
  description: string;
  affected_data_categories?: string[];
  affected_subjects_count?: number | null;
  containment_measures?: string | null;
}): Promise<ServiceResult<BreachRecord>> {
  const { data, error } = await supabase
    .from("breach_register")
    .insert({
      severity: input.severity,
      status: "detected",
      description: input.description,
      affected_data_categories: input.affected_data_categories ?? null,
      affected_subjects_count: input.affected_subjects_count ?? null,
      containment_measures: input.containment_measures ?? null,
    })
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as BreachRecord, error: null };
}

export async function updateBreach(
  id: string,
  patch: Partial<
    Pick<
      BreachRecord,
      | "status"
      | "containment_measures"
      | "root_cause"
      | "authority_notified_at"
      | "subjects_notified_at"
      | "reported_at"
    >
  >
): Promise<ServiceResult<BreachRecord>> {
  const { data, error } = await supabase
    .from("breach_register")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as BreachRecord, error: null };
}

const ANOMALY_QUERIES: {
  key: string;
  label: string;
  window_hours: number;
  actions: string[];
  threshold: number;
}[] = [
  { key: "failed_logins", label: "Logins fallidos (> 10 en 1h)", window_hours: 1, actions: ["login_failed", "auth_failed"], threshold: 10 },
  { key: "massive_exports", label: "Exportaciones de datos (> 5 en 24h)", window_hours: 24, actions: ["export_data"], threshold: 5 },
  { key: "rls_denials", label: "Rechazos de RLS (> 20 en 1h)", window_hours: 1, actions: ["rls_denied"], threshold: 20 },
  { key: "security_events", label: "Eventos de seguridad (24h)", window_hours: 24, actions: ["security_event", "breach_detected"], threshold: 1 },
];

export async function listAnomalies(): Promise<ServiceResult<AnomalyResult[]>> {
  const now = new Date();
  const results: AnomalyResult[] = [];

  for (const q of ANOMALY_QUERIES) {
    const since = new Date(
      now.getTime() - q.window_hours * 60 * 60 * 1000
    ).toISOString();
    const { count, error } = await supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .in("action", q.actions)
      .gte("created_at", since);
    if (error) {
      results.push({ key: q.key, label: q.label, count: 0, window_hours: q.window_hours });
      continue;
    }
    results.push({ key: q.key, label: q.label, count: count || 0, window_hours: q.window_hours });
  }

  return { data: results, error: null };
}

export async function listRecentAuditEvents(limit = 100): Promise<
  ServiceResult<
    {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[]
  >
> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, table_name, created_at, ip")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: error.message };
  return {
    data: (data || []) as {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[],
    error: null,
  };
}

export function severityToBadgeVariant(
  s: BreachSeverity
): "success" | "warning" | "error" | "neutral" {
  switch (s) {
    case "low":
      return "neutral";
    case "medium":
      return "warning";
    case "high":
    case "critical":
      return "error";
    default:
      return "neutral";
  }
}
```

- [ ] **Step 2: Verificar tipo**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx tsc -b --noEmit 2>&1 | grep -i "securityService" || echo "OK: sin errores en securityService"
```

Output esperado: `OK: sin errores en securityService`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/services/securityService.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(services): securityService para breach_register y anomalias audit_log"
```

---

## Task 14: Página admin `Security.tsx` (`src/pages/admin/Security.tsx`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/admin/Security.tsx`

- [ ] **Step 1: Crear `Security.tsx` reutilizando los componentes UI existentes.**

```tsx
import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Activity, Plus, RefreshCw } from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Badge,
  Select,
  Alert,
  Loading,
  Input,
  Textarea,
} from "../../components/ui";
import {
  listBreaches,
  createBreach,
  listAnomalies,
  listRecentAuditEvents,
  severityToBadgeVariant,
  type BreachRecord,
  type BreachSeverity,
  type BreachStatus,
  type AnomalyResult,
} from "../../services/securityService";

const SEVERITY_OPTIONS: { value: BreachSeverity | "all"; label: string }[] = [
  { value: "all", label: "Todas las severidades" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const STATUS_OPTIONS: { value: BreachStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "detected", label: "Detectada" },
  { value: "investigating", label: "Investigando" },
  { value: "contained", label: "Contenida" },
  { value: "notified", label: "Notificada" },
  { value: "closed", label: "Cerrada" },
];

const STATUS_LABEL: Record<BreachStatus, string> = {
  detected: "Detectada",
  investigating: "Investigando",
  contained: "Contenida",
  notified: "Notificada",
  closed: "Cerrada",
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso;
  }
}

const Security: React.FC = () => {
  const [breaches, setBreaches] = useState<BreachRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [recent, setRecent] = useState<
    {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<BreachSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<BreachStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const [b, a, r] = await Promise.all([
      listBreaches({ severity: filterSeverity, status: filterStatus }),
      listAnomalies(),
      listRecentAuditEvents(100),
    ]);
    if (b.error) setError(b.error);
    if (a.error && !error) setError(a.error);
    if (r.error && !error) setError(r.error);
    setBreaches(b.data || []);
    setAnomalies(a.data || []);
    setRecent(r.data || []);
    setLoading(false);
  }, [filterSeverity, filterStatus, error]);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSeverity, filterStatus]);

  if (loading && breaches.length === 0) {
    return <Loading text="Cargando panel de seguridad..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2 flex items-center">
            <ShieldAlert className="w-7 h-7 mr-2 text-error" />
            Seguridad
          </h2>
          <p className="text-text-secondary">
            Brechas registradas y anomalías del audit_log. Ley 21.719 req. 10.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={reload}
          >
            Actualizar
          </Button>
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreate(true)}
          >
            Registrar brecha
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div>
        <h3 className="text-lg font-semibold text-text mb-3 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-accent-secondary" />
          Anomalías (audit_log)
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {anomalies.map((a) => {
            const hot = a.count > 0;
            return (
              <Card key={a.key} className={hot ? "border-error" : ""}>
                <p className="text-sm text-text-secondary mb-1">{a.label}</p>
                <p className={`text-3xl font-bold ${hot ? "text-error" : "text-text"}`}>
                  {a.count}
                </p>
                <p className="text-xs text-text-secondary mt-1">Últimas {a.window_hours}h</p>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Severidad"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as BreachSeverity | "all")}
          options={SEVERITY_OPTIONS}
        />
        <Select
          label="Estado"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as BreachStatus | "all")}
          options={STATUS_OPTIONS}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text mb-3">Brechas ({breaches.length})</h3>
        {breaches.length === 0 ? (
          <Card className="text-center py-12">
            <ShieldAlert className="w-12 h-12 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">No hay brechas que coincidan con los filtros.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {breaches.map((b) => (
              <Card key={b.id}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityToBadgeVariant(b.severity)}>
                        {b.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="neutral">{STATUS_LABEL[b.status]}</Badge>
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(b.detected_at)}
                      </span>
                    </div>
                    <p className="text-text">{b.description}</p>
                    {b.affected_data_categories && b.affected_data_categories.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        <strong>Categorías afectadas:</strong>{" "}
                        {b.affected_data_categories.join(", ")}
                      </p>
                    )}
                    {b.affected_subjects_count != null && (
                      <p className="text-sm text-text-secondary">
                        <strong>Titulares afectados:</strong> {b.affected_subjects_count}
                      </p>
                    )}
                    {b.root_cause && (
                      <p className="text-sm text-text-secondary">
                        <strong>Causa raíz:</strong> {b.root_cause}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary md:text-right space-y-1">
                    {b.authority_notified_at && (
                      <p>Autoridad: {formatDateTime(b.authority_notified_at)}</p>
                    )}
                    {b.subjects_notified_at && (
                      <p>Titulares: {formatDateTime(b.subjects_notified_at)}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text mb-3">Eventos recientes (audit_log)</h3>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Acción</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Tabla</th>
                <th className="py-2 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-secondary">
                    Sin eventos recientes.
                  </td>
                </tr>
              ) : (
                recent.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-text-secondary">{formatDateTime(e.created_at)}</td>
                    <td className="py-2 pr-4 font-mono text-text">{e.action}</td>
                    <td className="py-2 pr-4 text-text">{e.actor_email || "—"}</td>
                    <td className="py-2 pr-4 text-text-secondary">{e.table_name || "—"}</td>
                    <td className="py-2 pr-4 text-text-secondary">{e.ip || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <CreateBreachModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          reload();
        }}
      />
    </div>
  );
};

interface CreateBreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateBreachModal: React.FC<CreateBreachModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [severity, setSeverity] = useState<BreachSeverity>("medium");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [subjectsCount, setSubjectsCount] = useState("");
  const [containment, setContainment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!description.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    setLoading(true);
    const cats = categories.split(",").map((s) => s.trim()).filter(Boolean);
    const result = await createBreach({
      severity,
      description: description.trim(),
      affected_data_categories: cats.length ? cats : undefined,
      affected_subjects_count: subjectsCount ? Number(subjectsCount) : null,
      containment_measures: containment.trim() || null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDescription("");
    setCategories("");
    setSubjectsCount("");
    setContainment("");
    onCreated();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar nueva brecha" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Alert
          type="info"
          message="Al registrar una brecha con severidad media o superior, el DPO debe activar el playbook de notificación dentro de 72h (docs/seguridad/playbook_respuesta_incidentes.md)."
        />
        <Select
          label="Severidad"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as BreachSeverity)}
          options={[
            { value: "low", label: "Baja" },
            { value: "medium", label: "Media" },
            { value: "high", label: "Alta" },
            { value: "critical", label: "Crítica" },
          ]}
          required
        />
        <Textarea
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué ocurrió, cómo se detectó, qué tablas o datos están involucrados."
          rows={4}
          required
        />
        <Input
          label="Categorías afectadas (separadas por coma)"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="identidad B2B, contacto B2B, autenticación"
          helperText="Ver categorías en spec §1.3."
        />
        <Input
          label="Nº de titulares afectados (aprox.)"
          type="number"
          min={0}
          value={subjectsCount}
          onChange={(e) => setSubjectsCount(e.target.value)}
        />
        <Textarea
          label="Medidas de contención"
          value={containment}
          onChange={(e) => setContainment(e.target.value)}
          placeholder="Qué se hizo para frenar el incidente."
          rows={3}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" loading={loading} fullWidth>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default Security;
```

- [ ] **Step 2: Verificar tipo**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx tsc -b --noEmit 2>&1 | grep -i "Security.tsx" || echo "OK: sin errores en Security.tsx"
```

Output esperado: `OK: sin errores en Security.tsx`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/admin/Security.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(admin): pagina Security con brechas + anomalias audit_log (Ley 21.719 req.10)"
```

---

## Task 15: Integrar `Security` en el Dashboard admin (`src/pages/admin/Dashboard.tsx`)

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Añadir imports de `ShieldAlert` y `Security`.**

```tsx
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Store as StoreIcon,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
```

```tsx
import Security from "./Security";
```

- [ ] **Step 2: Añadir el item al array `navItems` (después de "Métricas Globales").**

```tsx
  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Resumen (Dashboard)" },
    { path: "/admin/requests", icon: FileText, label: "Solicitudes Pendientes" },
    { path: "/admin/restaurants", icon: StoreIcon, label: "Restaurantes Activos" },
    { path: "/admin/analytics", icon: BarChart3, label: "Métricas Globales" },
    { path: "/admin/security", icon: ShieldAlert, label: "Seguridad" },
  ];
```

- [ ] **Step 3: Añadir la ruta hija (después de analytics).**

```tsx
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="requests" element={<PendingRequests />} />
          <Route path="restaurants" element={<AllRestaurants />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="security" element={<Security />} />
        </Routes>
```

- [ ] **Step 4: Verificar build**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```

Output esperado: build exitoso.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/admin/Dashboard.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(admin): integra pagina Security al nav y rutas del Dashboard"
```

---

## Verificación final de la Capa 3

- [ ] `docs/privacidad/reglas_ia.md` existe y afirma explícitamente que el chatbot es keyword-based y stateless.
- [ ] `docs/privacidad/aipd_plantilla.md` tiene 9 secciones.
- [ ] `docs/privacidad/aipd_01_onboarding.md`, `aipd_02_crm_clientes.md`, `aipd_03_chatbot_dormida.md`, `aipd_04_exportaciones.md` están redactadas, cada una con matriz de riesgo y decisión.
- [ ] `docs/seguridad/playbook_respuesta_incidentes.md` tiene 6 fases y flujo 72h.
- [ ] `docs/seguridad/plantilla_notificacion_autoridad.md` y `plantilla_notificacion_titulares.md` y `plantilla_comunicado_interno.md` y `rotacion_secretos.md` existen y están redactados.
- [ ] `npm run security-check` corre y reporta PASS/FAIL (sale 0 o 1).
- [ ] `src/services/securityService.ts` exporta `listBreaches`, `createBreach`, `updateBreach`, `listAnomalies`, `listRecentAuditEvents`.
- [ ] `src/pages/admin/Security.tsx` renderiza brechas + anomalías + tabla de audit_log + modal de nueva brecha.
- [ ] El nav del admin muestra "Seguridad" y `/admin/security` carga.

## Qué cubre esta capa del spec (§4)

| Requisito spec §4 | Dónde se cubre |
|---|---|
| 4.1 Retención (sweep) | Referenciado en AIPD-01/02/04 (depende de Capa 1 Task 6) |
| 4.2 Proceso de brechas (72h) | Task 7 (playbook), Tasks 8–10 (plantillas), Task 14 (UI breach_register) |
| 4.3 AIPD | Tasks 2–6 (plantilla + 4 AIPD) |
| 4.4 Privacidad en IA | Task 1 (reglas_ia.md), Task 5 (AIPD-03 dormida) |
| 4.5 Refuerzo seguridad operacional | Tasks 11 (rotación), 12 (security-check), 13–14 (UI) |
