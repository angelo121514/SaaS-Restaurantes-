# DPA con Proveedores y Subencargados — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01

Este documento centraliza el estado de los Data Processing Agreements (DPA) de los proveedores que actúan como **encargados subcontratados** de Cmor Flow, junto con las cláusulas estándar que deben cumplir. Forma parte del Registro de Actividades de Tratamiento (RAT, `docs/privacidad/RAT.md`).

## Estado de DPAs por proveedor

| Proveedor | Servicio | País de procesamiento | DPA | SCC | Notificación de brechas | Estado |
|---|---|---|---|---|---|---|
| Vercel | Hosting frontend (Vite SPA) | Estados Unidos | Oficial Vercel, aceptado en el dashboard | Incluidos en el DPA oficial | Cláusula contractual | **Oficial** |
| Supabase | Base de datos, Auth, Storage, Realtime, Edge Functions | Estados Unidos (AWS) | Oficial Supabase, aceptado en el dashboard | Incluidos en el DPA oficial | Cláusula contractual | **Oficial** |
| Proveedor de correo transaccional (default sugerido: Resend) | Invitaciones y notificaciones | Estados Unidos | Pendiente de contratación | Requerido | Requerido (72 horas) | **Pendiente** |
| Proveedor de IA (futuro) | Si el chatbot migra a LLM | Estados Unidos | Requerido, con cláusula Zero Data Retention (ZDR) | Requerido | Requerido (72 horas) | **Requerido (no aplicable hoy)** |

> Acción operativa: aceptar los DPA oficiales de Vercel y Supabase en sus respectivos dashboards; contratar un proveedor de correo transaccional con DPA y SCC (Resend es la recomendación por defecto por su DPA disponible y SCC; sustituible por Postmark o SendGrid a elección). El proveedor de IA se contratará únicamente cuando se active el AIPD-03 (hoy dormido).

## Cláusulas estándar exigibles a todo subencargado

Todo proveedor que trate datos personales por cuenta de Cmor Flow debe aceptar contractualmente:

1. **Finalidad limitada:** tratar los datos únicamente para prestar el servicio contratado por Cmor Flow, sin usarlos para sus propias finalidades (incluido el entrenamiento de modelos).
2. **Confidencialidad:** personal con obligación de confidencialidad y acceso por menor privilegio.
3. **Medidas de seguridad:** cifrado en tránsito (TLS 1.2+) y en reposo (AES-256), controles de acceso y capacidad de auditoría.
4. **Subencargados:** notificación previa de cualquier subencargado adicional; transferencia de obligaciones a los sub-subencargados.
5. **Transferencias internacionales:** cuando el procesamiento ocurra fuera de Chile, Cláusulas Contractuales Tipo (SCC) u otra garantía adecuada conforme a la Ley N° 19.628 y la Ley N° 21.719.
6. **Notificación de brechas:** notificación a Cmor Flow **sin demora indebida y, en todo caso, dentro de las 72 horas** desde la detección, con la información necesaria para evaluar el impacto.
7. **Devolución y borrado:** devolución o supresión de los datos a la terminación del contrato, salvo obligación legal de conservación.
8. **Colabororación con derechos de los titulares:** asistir a Cmor Flow en la atención de solicitudes (art. 19 Ley N° 19.628).
9. **Auditoría:** permitir la verificación del cumplimiento de estas obligaciones, mediante auditorías o certificaciones reconocidas (p. ej., SOC 2, ISO/IEC 27001).
10. **Responsabilidad:** responder del incumplimiento de las obligaciones de protección de datos que le sean imputables.

## Proveedores específicos

### Vercel

Hosting del frontend Vite + React 19. La URL en producción es propiedad de Cmor Flow; el proveedor publica sus términos y su DPA en su sitio. Vercel está dentro del alcance de `docs/privacidad/transferencias_internacionales.md` (riesgo medio, mitigado con SCC).

### Supabase

Base de datos PostgreSQL, autenticación, almacenamiento de objetos (logos y QR), Realtime y Edge Functions. Endpoint del proyecto: `https://clsgoknzyhkxtogxoshz.supabase.co`. Los datos en reposo están cifrados con AES-256. Supabase está dentro del alcance de la evaluación de transferencias.

### Proveedor de correo transaccional (Resend, default)

Servicio para envío de invitaciones de onboarding y notificaciones. Requisito: DPA firmado + SCC + cláusula de no uso de datos para entrenamiento. Estado: **pendiente** hasta contratación efectiva; mientras tanto, la funcionalidad de invitaciones queda limitada a las Edge Functions existentes.

### Proveedor de IA (futuro)

Aplicable solo si el chatbot migra de su implementación actual keyword-based y stateless a un modelo de lenguaje (LLM). Requisitos adicionales:

- Contrato con cláusula **Zero Data Retention (ZDR)** por escrito.
- Confirmación explícita de bloqueo del flag `training` de la API.
- Pseudonimización de cualquier dato enviado al modelo (sustitución de nombre, teléfono y email por tokens).
- Filtro que bloquee patrones de datos sensibles (RUN, tarjetas, salud, biometría) antes del envío.
- Registro solo de metadatos en `ai_usage_log` (usuario, fecha, modelo, tokens, alcance), nunca el contenido del prompt ni de la respuesta.

La activación de este proveedor exige además el AIPD-03 firmado y el consentimiento granular `ai_profiling=true`. Mientras tanto, el chatbot es stateless y no transmite datos a ningún modelo externo.
