# Versionado de Documentos Legales — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

Registro de versiones vigentes de los documentos legales de Cmor Flow. Cada cambio sustantivo de una política sube su versión (formato `YYYY-MM-DD`) y se refleja aquí. Los consentimientos registrados en la tabla `consents` graban la versión vigente al momento de la aceptación (columna `privacy_policy_version`), permitiendo demostrar qué política aceptó cada titular.

## Versión vigente

| Fecha de versión | Política B2B | Aviso B2B | Política Clientes | TyC + DPA cliente |
|---|---|---|---|---|
| 2026-06-01 | 2026-06-01 | 2026-06-01 | 2026-06-01 | 2026-06-01 |

## Changelog

### 2026-06-01 — Versión inicial

- Política de Privacidad B2B (owners/staff/admins) — redacción inicial.
- Aviso de Privacidad B2B (resumen de 1 página, modal primer login).
- Política de Privacidad de Clientes Finales (menú `/menu/:slug`).
- Términos y Condiciones del Servicio + DPA cliente (onboarding).
- Contacto del DPO publicado: `dpo@cmorflow.cl`.
- Marco normativo de referencia: Ley N° 19.628 y Ley N° 21.719 (vigencia nacional 1 de diciembre de 2026).

## Reglas de versionado

1. Un cambio **sustantivo** (nueva finalidad, nuevo destinatario, nuevo proveedor con transferencia internacional, cambio de base legal, cambio de plazo de conservación, cambio de contacto DPO) requiere **nueva versión** con fecha del día.
2. Un cambio **editorial** (corrección ortotipográfica, aclaración que no altera obligaciones) mantiene la versión y se documenta en este changelog con nota menor.
3. Al publicar una nueva versión: actualizar la tabla "Versión vigente", registrar la entrada en este changelog y, si el cambio es sustantivo, forzar la re-aceptación del consentimiento en el próximo login de los titulares afectados.
4. Las versiones históricas se conservan en este repositorio (historial de git) por el plazo de conservación de la prueba de consentimiento (3 años posteriores a la revocación, según `docs/privacidad/RAT.md` RAT-009).
