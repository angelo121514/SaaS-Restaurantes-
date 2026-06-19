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
