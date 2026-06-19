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
