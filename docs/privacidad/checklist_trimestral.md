# Checklist de Revisión Trimestral — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Periodicidad:** cada 3 meses, a cargo del DPO (`dpo@cmorflow.cl`).

Este checklist documenta la revisión trimestral del programa de cumplimiento de protección de datos de Cmor Flow (Ley N° 19.628 y Ley N° 21.719). Cada revisión se ejecuta completa, registra su resultado y, si hay hallazgos, abre acciones correctivas con responsable y plazo.

## Checklist (11 ítems)

- [ ] **1. RAT revisado** — verificar si hay nuevos tratamientos no inventariados en `docs/privacidad/RAT.md`. Si los hay, incorporarlos con todas las columnas.
- [ ] **2. AIPD revisadas** — confirmar que las AIPD activas (`aipd_01_onboarding`, `aipd_02_crm_clientes`, `aipd_04_exportaciones`) siguen vigentes y que el AIPD-03 (chatbot) permanece dormido o se ha activado con justificación.
- [ ] **3. Consentimientos — tasa de revocación** — medir revocaciones en el trimestre por scope (marketing, analítica, `ai_profiling`) y evaluar si alguna finalidad requiere ajuste.
- [ ] **4. DSAR dentro de SLA** — confirmar que el 100 % de las solicitudes en `data_subject_requests` se atendieron dentro de los plazos legales (30 días; 15 días para rectificación).
- [ ] **5. `audit_log` — anomalías** — revisar eventos de seguridad y autenticación (intentos fallidos, negaciones de RLS) y descartar patrones sospechosos.
- [ ] **6. `breach_register` — incidentes abiertos** — confirmar que no haya incidentes con más de 30 días en estado distinto de `closed`; si los hay, escalar al DPO y al responsable de seguridad.
- [ ] **7. Rotación de secretos** — verificar la rotación prevista en `docs/seguridad/rotacion_secretos.md` y el estado de las variables de entorno en Vercel y Supabase.
- [ ] **8. Backups — prueba de restauración** — ejecutar una prueba de restauración de un backup cifrado y registrar el resultado.
- [ ] **9. DPA de proveedores vigentes** — revisar el estado de los DPA en `docs/contratos/DPA_proveedores.md` (Vercel, Supabase, proveedor de correo, proveedor IA futuro).
- [ ] **10. Versión de políticas de privacidad vigente** — confirmar la versión declarada en `docs/legal/VERSION.md` y, si hubo cambios sustantivos, que la re-aceptación de consentimientos quedó forzada.
- [ ] **11. RLS — `security-check` ejecutado** — correr `npm run security-check` (`scripts/security-check.ts`) y atender todos los hallazgos antes de cerrar la revisión.

## Registro de revisiones

| Fecha | Responsable | Ítems OK | Ítems con acción | Acciones abiertas (responsable, plazo) | Próxima revisión |
|---|---|---|---|---|---|
| _(primera revisión pendiente)_ | | | | | |

## Cierre de la revisión

La revisión se considera cerrada cuando los 11 ítems están resueltos o tienen una acción registrada con responsable y plazo. El DPO archiva el resultado y comunica cualquier hallazgo material al responsable legal del proyecto.
