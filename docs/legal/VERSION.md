# Versionado de Documentos Legales — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

Registro de versiones vigentes de los documentos legales de Cmor Flow. Cada cambio sustantivo de una política sube su versión (formato `YYYY-MM-DD`) y se refleja aquí. Los consentimientos registrados en la tabla `consents` graban la versión vigente al momento de la aceptación (columna `privacy_policy_version`), permitiendo demostrar qué política aceptó cada titular.

## Versión vigente

| Fecha de versión | Política B2B | Aviso B2B | Política Clientes | TyC + DPA cliente |
|---|---|---|---|---|
| 2026-06-22 | 2026-06-22 | 2026-06-22 | 2026-06-22 | 2026-06-22 |
| 2026-06-01 | 2026-06-01 | 2026-06-01 | 2026-06-01 | 2026-06-01 |

## Changelog

### 2026-06-22 (actualización P1-12) — Identidad jurídica + DPO formal

**Cambio sustantivo.** Completada la identidad jurídica del responsable en `contacto_dpo.md`:
- Añadida razón social (CMOR FLOW SpA), placeholders para RUT, domicilio y representante legal a completar tras registro ante SII.
- Designación formal del DPO conforme al art. 24 Ley N° 21.719 con nombre, cargo, fecha de designación y contacto.
- Añadida referencia a la AGDP como autoridad competente.

**Acción requerida:** completar los campos `[POR COMPLETAR]` con datos reales tras constitución legal de la SpA y registro ante SII.

### 2026-06-22 — Cumplimiento Ley 21.719 (plazo DSAR)

**Cambio sustantivo.** Corrección del plazo de respuesta a solicitudes de derechos del titular (DSAR) para ajustarse al art. 19 de la Ley N° 21.719 (vigente desde diciembre 2024, aplicación plena diciembre 2026).

- `politica_privacidad_b2b.md`: plazo cambiado de "30 días corridos / 15 días para rectificación" a "10 días hábiles prorrogables a 15 días hábiles en casos complejos".
- `aviso_privacidad_b2b.md`: plazo cambiado de "30 días" a "10 días hábiles prorrogables a 15 (art. 19 Ley N° 21.719)".
- `politica_privacidad_clientes.md`: plazo cambiado de "30 días corridos (15 días para rectificación)" a "10 días hábiles prorrogables a 15; rectificación 5 días hábiles".
- `contacto_dpo.md`: SLA de ejercicio de derechos del titular actualizado a "10 días hábiles prorrogables por 5 días hábiles adicionales en casos complejos". Referencia legal actualizada de Ley N° 19.628 a Ley N° 21.719.
- `docs/contratos/DPA_cmor_restaurante.md`: cláusula 11 actualizada con nuevo plazo y referencia legal.

**Acción requerida:** forzar re-aceptación del consentimiento en el próximo login de titulares afectados. La versión 2026-06-01 sigue siendo válida para consentimientos registrados antes del 2026-06-22.

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
