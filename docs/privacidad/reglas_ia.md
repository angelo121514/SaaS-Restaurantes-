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
