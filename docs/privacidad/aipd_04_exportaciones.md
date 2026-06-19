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
