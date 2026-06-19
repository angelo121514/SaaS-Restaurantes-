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
