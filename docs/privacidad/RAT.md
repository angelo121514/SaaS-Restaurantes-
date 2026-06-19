# Registro de Actividades de Tratamiento (RAT) — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Marco normativo:** Ley N° 19.628 y Ley N° 21.719 (art. 24 sobre seguridad del tratamiento y obligaciones de documentación).

Este registro inventaría las actividades de tratamiento de datos personales realizadas por Cmor Flow. Es el documento central de gobernanza: cada tratamiento se enlaza con su evaluación de impacto (AIPD) cuando aplica, y alimenta el checklist trimestral (`docs/privacidad/checklist_trimestral.md`).

## Resumen de tratamientos

| ID | Tratamiento | Responsable |
|---|---|---|
| RAT-001 | Registro y alta de restaurantes | Cmor Flow |
| RAT-002 | Gestión de cuentas owners/staff | Cmor Flow |
| RAT-003 | Operación del SaaS — catálogo de menú | Cmor Flow |
| RAT-004 | Pedidos de clientes finales | Restaurante (Cmor Flow encargado) |
| RAT-005 | Invitaciones de onboarding | Cmor Flow |
| RAT-006 | Analítica de uso del producto | Cmor Flow |
| RAT-007 | Comunicaciones de marketing | Cmor Flow |
| RAT-008 | Chatbot de recomendación (stateless) | Restaurante |
| RAT-009 | Cumplimiento y auditoría | Cmor Flow |
| RAT-010 | Seguridad y respuesta a incidentes | Cmor Flow |

## Detalle por tratamiento

### RAT-001 — Registro y alta de restaurantes

| Campo | Valor |
|---|---|
| Nombre | Registro y alta de restaurantes |
| Responsable | Cmor Flow |
| Finalidad | Gestionar la solicitud de alta de restaurantes prospectos y su evaluación comercial |
| Base legal | Interés legítimo (Ley N° 19.628 art. 4) y paso previo a la ejecución del contrato |
| Titulares | Representantes legales de restaurantes prospectos |
| Categorías de datos | Identidad (nombre del restaurante, nombre del contacto), contacto (email, teléfono, ciudad, dirección) |
| Destinatarios | Cmor Flow; Supabase (encargado); Vercel (hosting del formulario) |
| Transferencias internacionales | Estados Unidos (Vercel, Supabase), con SCC (ver `docs/privacidad/transferencias_internacionales.md`) |
| Retención | 12 meses desde el último contacto para prospectos no convertidos; los convertidos pasan a RAT-002 |
| Medidas de seguridad | RLS, TLS 1.2+, AES-256, validación anti-spam (honeypot y límite por IP) |
| AIPD | A redactar (`docs/privacidad/aipd_01_onboarding.md`) |

### RAT-002 — Gestión de cuentas owners/staff

| Campo | Valor |
|---|---|
| Nombre | Gestión de cuentas de owners y staff |
| Responsable | Cmor Flow |
| Finalidad | Autenticar y administrar a los usuarios del restaurante en la plataforma |
| Base legal | Ejecución del contrato (Ley N° 19.628 art. 4) |
| Titulares | Owners y personal de sala/caja del restaurante |
| Categorías de datos | Identidad, contacto, credenciales de autenticación, fecha de último ingreso |
| Destinatarios | Cmor Flow; Supabase (Auth y DB) |
| Transferencias internacionales | Estados Unidos (Supabase), con SCC |
| Retención | Vida del contrato; identidad y contacto anonimizados a los 90 días de baja confirmada |
| Medidas de seguridad | MFA obligatorio para `admin` y `owner`; RLS; `audit_log` |
| AIPD | A redactar |

### RAT-003 — Operación del SaaS — catálogo de menú

| Campo | Valor |
|---|---|
| Nombre | Operación del SaaS — catálogo de menú |
| Responsable | Cmor Flow |
| Finalidad | Permitir al restaurante gestionar su carta digital |
| Base legal | Ejecución del contrato |
| Titulares | Owners y staff del restaurante |
| Categorías de datos | Datos operacionales del restaurante (productos, precios, logos, QR) |
| Destinatarios | Cmor Flow; Supabase (DB y Storage) |
| Transferencias internacionales | Estados Unidos (Supabase), con SCC |
| Retención | Vida del contrato |
| Medidas de seguridad | RLS; Storage con URLs firmadas de 1 hora; sin objetos públicos permanentes |
| AIPD | No requerido (sin datos personales directos del titular final) |

### RAT-004 — Pedidos de clientes finales

| Campo | Valor |
|---|---|
| Nombre | Pedidos de clientes finales |
| Responsable | Restaurante |
| Encargado | Cmor Flow |
| Finalidad | Gestionar pedidos, entrega y pago |
| Base legal | Ejecución del contrato (Ley N° 19.628 art. 4) |
| Titulares | Clientes finales del restaurante |
| Categorías de datos | Identidad (nombre), contacto (teléfono, email), transaccional (ítems, monto, método de pago), notas |
| Destinatarios | Restaurante; Cmor Flow (encargado); Supabase (subencargado) |
| Transferencias internacionales | Estados Unidos (Supabase), con SCC |
| Retención | Clientes sin pedidos en 24 meses: anonimización; pedidos: campos personales anonimizados a los 6 años (SII), se conservan montos e ítems |
| Medidas de seguridad | RLS en `orders`; INSERT validado contra restaurante activo; `audit_log` |
| AIPD | A redactar (`docs/privacidad/aipd_02_crm_clientes.md`) |

### RAT-005 — Invitaciones de onboarding

| Campo | Valor |
|---|---|
| Nombre | Invitaciones de onboarding de personal |
| Responsable | Cmor Flow |
| Finalidad | Invitar al personal del restaurante a crear su cuenta |
| Base legal | Ejecución del contrato |
| Titulares | Personal invitado del restaurante |
| Categorías de datos | Email del invitado, token de invitación |
| Destinatarios | Cmor Flow; Supabase; proveedor de correo transaccional |
| Transferencias internacionales | Estados Unidos, con SCC |
| Retención | Tokens: 7 días o hasta consumo |
| Medidas de seguridad | Tokens de un solo uso; Edge Function `invite-owner` con `service_role` solo en el secreto |
| AIPD | No requerido |

### RAT-006 — Analítica de uso del producto

| Campo | Valor |
|---|---|
| Nombre | Analítica de uso del producto |
| Responsable | Cmor Flow |
| Finalidad | Agregados de uso para mejorar la plataforma |
| Base legal | Consentimiento del titular (Ley N° 19.628 art. 4), revocable |
| Titulares | Owners y staff |
| Categorías de datos | Eventos de uso agregados, sin identificar al titular cuando es posible |
| Destinatarios | Cmor Flow; Supabase |
| Transferencias internacionales | Estados Unidos, con SCC |
| Retención | 24 meses |
| Medidas de seguridad | Minimización; RLS; agregación |
| AIPD | A redactar (`docs/privacidad/aipd_04_exportaciones.md`, si aplica exportación) |

### RAT-007 — Comunicaciones de marketing

| Campo | Valor |
|---|---|
| Nombre | Comunicaciones de marketing |
| Responsable | Cmor Flow |
| Finalidad | Enviar novedades de producto y ofertas comerciales |
| Base legal | Consentimiento del titular, revocable |
| Titulares | Owners |
| Categorías de datos | Email |
| Destinatarios | Cmor Flow; proveedor de correo transaccional |
| Transferencias internacionales | Estados Unidos, con SCC |
| Retención | Hasta revocación del consentimiento |
| Medidas de seguridad | Registro granular en `consents` con prueba |
| AIPD | No requerido |

### RAT-008 — Chatbot de recomendación (stateless)

| Campo | Valor |
|---|---|
| Nombre | Chatbot de recomendación (hoy keyword-based y stateless) |
| Responsable | Restaurante |
| Finalidad | Asistir al cliente final en la elección de productos |
| Base legal | Hoy no aplica tratamiento persistente; futuro LLM requeriría consentimiento granular `ai_profiling=true` |
| Titulares | Clientes finales |
| Categorías de datos | Hoy: ninguna persistida (stateless, solo en memoria del navegador). Futuro: mensajes, con pseudonimización previa |
| Destinatarios | Hoy ninguno. Futuro: proveedor IA con contrato Zero Data Retention |
| Transferencias internacionales | Hoy ninguna. Futuro: a evaluar al activarse el AIPD-03 |
| Retención | 0 días (stateless) |
| Medidas de seguridad | Sin persistencia; si se activa LLM: filtro de datos sensibles, metadatos solamente en `ai_usage_log` |
| AIPD | `docs/privacidad/aipd_03_chatbot_dormida.md` (dormida, hoy no se aplica) |

### RAT-009 — Cumplimiento y auditoría

| Campo | Valor |
|---|---|
| Nombre | Cumplimiento y auditoría |
| Responsable | Cmor Flow |
| Finalidad | Demostrar el cumplimiento normativo y atender derechos de los titulares |
| Base legal | Obligación legal e interés legítimo |
| Titulares | Titulares que ejercen derechos (DSAR) |
| Categorías de datos | Solicitudes DSAR, prueba de consentimiento, `audit_log` |
| Destinatarios | Cmor Flow; Supabase; autoridad competente si procede |
| Transferencias internacionales | Estados Unidos (Supabase), con SCC |
| Retención | Prueba de consentimiento: 3 años posteriores a revocación; DSAR (metadatos mínimos): 6 años, contenido anonimizado a los 12 meses; `audit_log`: 24 meses base, 36 meses para seguridad/auth |
| Medidas de seguridad | `audit_log` inmutable; `data_subject_requests` con token de verificación |
| AIPD | No requerido |

### RAT-010 — Seguridad y respuesta a incidentes

| Campo | Valor |
|---|---|
| Nombre | Seguridad y respuesta a incidentes |
| Responsable | Cmor Flow |
| Finalidad | Detectar, contener y notificar incidentes de seguridad |
| Base legal | Obligación legal e interés legítimo (Ley N° 21.719, notificación de brechas) |
| Titulares | Titulares cuyos datos pudieran verse afectados por un incidente |
| Categorías de datos | `audit_log`, `breach_register` |
| Destinatarios | Cmor Flow; autoridad competente (notificación 72 horas); titulares afectados (notificación 72 horas) |
| Transferencias internacionales | Estados Unidos (Supabase), con SCC |
| Retención | `breach_register`: hasta cierre del incidente y al menos 6 años; `audit_log` de seguridad: 36 meses |
| Medidas de seguridad | `breach_register` con acceso restringido a `admin`; plantillas de notificación en `docs/seguridad/` |
| AIPD | No requerido (tratamiento de seguridad) |
