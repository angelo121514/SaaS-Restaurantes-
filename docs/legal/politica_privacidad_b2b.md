# Política de Privacidad — Cmor Flow (Usuarios B2B)

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Responsable:** Cmor Flow
**Dirigida a:** owners, staff y administradores de la plataforma Cmor Flow.
**Dónde se muestra:** pie de página de `/legal/privacidad` y en el alta de cuenta.

Esta Política explica cómo Cmor Flow trata los datos personales de las personas que usan la plataforma en nombre de un restaurante (propietarios, administradores, personal de sala y caja). Se aplica a la versión `2026-06-01` de la política; los consentimientos registrados en la tabla `consents` guardan la versión vigente al aceptar.

---

## 1. Responsable del tratamiento

El responsable del tratamiento de los datos personales descritos en esta Política es **Cmor Flow**, proveedor de la plataforma SaaS de pedidos para restaurantes. El canal de contacto del Delegado de Protección de Datos (DPO) es `dpo@cmorflow.cl` (ver bloque 8).

En el tratamiento de datos de clientes finales del restaurante, Cmor Flow actúa como **encargado** por cuenta y bajo las instrucciones del restaurante, que es el responsable respecto de sus clientes. Esa relación se rige por el DPA Cmor Flow ↔ Restaurante (`docs/contratos/DPA_cmor_restaurante.md`).

## 2. Finalidades del tratamiento

Tratamos los datos de los usuarios B2B para las finalidades siguientes:

- **Prestación del servicio contratado** (base: contrato): autenticación, gestión de la cuenta del restaurante, gestión del catálogo de menú, pedidos, POS, CRM y reportes.
- **Gestión de la relación comercial** (base: contrato / interés legítimo): alta y baja de cuentas, invitaciones de onboarding del personal, soporte técnico y atención de consultas.
- **Analítica de uso del producto** (base: consentimiento, revocable): agregados de uso destinados a mejorar la plataforma.
- **Comunicaciones de marketing** (base: consentimiento, revocable): novedades del producto y ofertas comerciales.
- **Cumplimiento legal** (base: obligación legal): conservación de registros tributarios y de auditoría exigidos por el Servicio de Impuestos Internos (SII) y por la normativa de protección de datos.

No tratamos los datos para finalidades incompatibles con las descritas. No vendemos datos personales.

## 3. Categorías de datos tratados

| Categoría | Campos | Origen |
|---|---|---|
| Identidad | nombre del titular, nombre del restaurante | Provistos por el titular al registrarse |
| Contacto | email, teléfono, ciudad, dirección | Provistos por el titular |
| Autenticación | credenciales (gestionadas por Supabase Auth), fecha de último ingreso | Generados al registrarse |
| Operacionales | notas internas, motivos de bloqueo, invitaciones | Generados durante el uso |
| Auditoría | eventos de acción registrados en `audit_log` | Generados por el sistema |

No se tratan datos sensibles (Ley N° 19.628 art. 2) de los usuarios B2B. Si excepcionalmente un titular incorporara datos sensibles en un campo libre (p. ej., una nota), Cmor Flow no los utiliza para ninguna finalidad y procura su eliminación o anonimización.

## 4. Destinatarios

Los datos se comunican únicamente a:

- **Encargados subcontratados** bajo contrato con cláusulas de protección de datos: Vercel (hosting frontend), Supabase (base de datos, autenticación, almacenamiento, Realtime, Edge Functions) y el proveedor de correo transaccional (ver `docs/contratos/DPA_proveedores.md`). Todos figuran en el RAT (`docs/privacidad/RAT.md`).
- **Autoridades competentes** cuando exista obligación legal (p. ej., requerimientos del SII o de la autoridad de protección de datos).
- **No se ceden** datos a terceros con fines comerciales.

## 5. Transferencias internacionales

Vercel y Supabase procesan datos en **Estados Unidos**. Estas transferencias se documentan y mitigan mediante Cláusulas Contractuales Tipo (SCC), cifrado en tránsito (TLS 1.2+) y en reposo (AES-256), y minimización de los datos transferidos. La evaluación detallada está en `docs/privacidad/transferencias_internacionales.md`, con reevaluación trimestral.

## 6. Derechos del titular

Conforme al artículo 19 de la Ley N° 19.628 y la Ley N° 21.719, el titular puede ejercer los derechos siguientes:

- **Acceso:** conocer qué datos personales tenemos sobre el titular.
- **Rectificación:** corregir datos inexactos o incompletos.
- **Cancelación (supresión):** solicitar la eliminación de los datos, salvo obligación legal de conservación (p. ej., registros tributarios del SII), caso en el que se anonimizan los campos personales.
- **Oposición:** oponerse a un tratamiento específico (p. ej., marketing o analítica) sin cancelar la cuenta.
- **Portabilidad:** recibir los datos en formato estructurado (JSON y CSV).
- **Revocación del consentimiento:** retirar el consentimiento otorgado para los tratamientos basados en él (marketing, analítica), sin afectar la licitud del tratamiento anterior.

El ejercicio se realiza escribiendo a `dpo@cmorflow.cl` o por el formulario `/legal/contacto-dpo`. Plazos máximos: 10 días hábiles, prorrogables por 5 días hábiles adicionales en casos complejos (art. 19 Ley N° 21.719). La verificación de identidad se realiza mediante un token de un solo uso al correo declarado.

## 7. Plazo de conservación

Los datos se conservan mientras dura la relación contractual. Tras la baja de la cuenta:

- **Identidad y contacto B2B:** anonimizados tras 90 días de inactividad confirmada.
- **Registros transaccionales (pedidos):** los campos personales se anonimizan a los 6 años (obligación tributaria del SII); los montos y líneas de pedido se conservan.
- **Logs de auditoría:** 24 meses en general; 36 meses para eventos de seguridad y autenticación.
- **Prueba de consentimiento:** 3 años posteriores a la revocación.

Los plazos operativos (no los legales) se detallan en `docs/privacidad/RAT.md` y se ejecutan mediante la función `run_retention_sweep()`.

## 8. Contacto del DPO

- Email: `dpo@cmorflow.cl`
- Formulario: `/legal/contacto-dpo`
- SLA máximo de respuesta: 10 días hábiles prorrogables a 15 (art. 19 Ley N° 21.719) (ver `docs/legal/contacto_dpo.md`).

## 9. Base legal del tratamiento

| Finalidad | Base legal (Ley N° 19.628 / Ley N° 21.719) |
|---|---|
| Prestación del servicio contratado | Ejecución de un contrato (art. 4) |
| Gestión de la relación comercial | Contrato e interés legítimo (art. 4) |
| Analítica de uso | Consentimiento del titular (art. 4) |
| Marketing | Consentimiento del titular (art. 4) |
| Conservación de registros tributarios | Obligación legal (SII) |
| Auditoría y cumplimiento | Obligación legal e interés legítimo (art. 4) |

## 10. Reclamación ante la autoridad competente

Si el titular considera que el tratamiento no se ajusta a la Ley N° 19.628 o a la Ley N° 21.719, puede presentar una reclamación ante la autoridad competente en materia de protección de datos. Esta vía está disponible sin perjuicio de haber contactado previamente al DPO de Cmor Flow.
