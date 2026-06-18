# Capa 4 — Gobernanza (RAT, DPA, Documentos Legales, Transferencias)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar la documentación de gobernanza del plan de cumplimiento Ley 19.628 / Ley 21.719 (documentos legales, DPAs, RAT, transferencias internacionales, checklist trimestral y guía operativa del README), cubriendo los 12 requisitos normativos en su dimensión documental.

**Architecture:** Capa 100 % documental en Markdown, sin código de aplicación ni SQL. Se distribuye en cuatro carpetas (`docs/legal/`, `docs/contratos/`, `docs/privacidad/`, raíz del proyecto). Es independiente de las capas 1-3: puede aplicarse en paralelo. Cada documento es autocontenido, versionado y comienza con disclaimer de borrador cuando corresponde.

**Tech Stack:** Documentación Markdown (sin código de aplicación).

**Spec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §5 (Capa de Gobernanza).

**Depende de:** nada (capa independiente, puramente documental).

---

## Convenciones

- **Disclaimer obligatorio** al inicio de cada documento legal (los 6 de `docs/legal/` + los 2 DPA de `docs/contratos/` + `transferencias_internacionales.md`): `> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.`
- **Identidad del proyecto:** responsable B2B = **Cmor Flow**; email DPO = **dpo@cmorflow.cl**; URL Supabase = `https://clsgoknzyhkxtogxoshz.supabase.co`; hosting frontend = **Vercel (USA)**; base de datos = **Supabase (USA/AWS)**.
- **Versión vigente de políticas:** `2026-06-01`.
- **Las 10 bloques obligatorios** de cada política: (1) responsable, (2) finalidades, (3) categorías de datos, (4) destinatarios, (5) transferencias internacionales, (6) derechos del titular, (7) plazo de conservación, (8) contacto DPO, (9) base legal, (10) reclamación ante autoridad competente.
- **Rutas absolutas** para todos los `git -C`.
- Si una carpeta destino no existe (`docs/legal/`, `docs/contratos/`, `docs/privacidad/`), su creación es implícita al escribir el primer archivo dentro de ella.

---

## Task 1: Changelog de versiones (`docs/legal/VERSION.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/VERSION.md`

- [ ] **Step 1: Crear el archivo `VERSION.md` con el contenido siguiente.**

````markdown
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
````

- [ ] **Step 2: Verificación.** Confirmar que el archivo declara `2026-06-01` como versión vigente para los 4 documentos y contiene la sección "Reglas de versionado".
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/VERSION.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): VERSION.md - changelog de politicas (v2026-06-01)"
```

---

## Task 2: Contacto del DPO (`docs/legal/contacto_dpo.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/contacto_dpo.md`

- [ ] **Step 1: Crear el archivo con el contenido siguiente.**

````markdown
# Contacto del Delegado de Protección de Datos (DPO)

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

## Canal oficial

- **Email:** dpo@cmorflow.cl
- **Formulario web:** `/legal/contacto-dpo` (graba en la tabla `data_subject_requests` con `request_type='contact'`).
- **Idioma de atención:** español de Chile.

## Responsable

El Delegado de Protección de Datos (DPO) de Cmor Flow es el punto de contacto único para:

- Ejercicio de los derechos del titular (acceso, rectificación, cancelación, oposición, portabilidad, revocación de consentimiento) previstos en el artículo 19 de la Ley N° 19.628 y regulados por la Ley N° 21.719.
- Consultas sobre el tratamiento de datos personales.
- Notificación de posibles incidentes de seguridad por parte de titulares o terceros.
- Comunicaciones de la autoridad competente en materia de protección de datos.

## Compromiso de niveles de servicio (SLA)

| Tipo de comunicación | Plazo de respuesta |
|---|---|
| Acuse de recibo de cualquier mensaje | 2 días hábiles |
| Consulta general | 10 días hábiles |
| Ejercicio de derechos del titular (art. 19 Ley N° 19.628) | 30 días corridos (acceso, cancelación, oposición, portabilidad) o 15 días corridos (rectificación), contados desde la verificación de identidad del titular |
| Notificación de incidente por parte de un titular o tercero | Acuse en 24 horas; evaluación inicial en 72 horas |

Cuando el ejercicio de un derecho exija consultar a un restaurante cliente (responsable de los datos de clientes finales), el cómputo del plazo se suspende hasta recibir la información del restaurante responsable, sin exceder en total el plazo legal.

## Verificación de identidad

Para proteger los datos personales, el DPO verifica la identidad del solicitante antes de entregar cualquier información. La verificación se realiza mediante un token de un solo uso enviado al correo electrónico declarado por el titular. En caso de discrepancia, podrá solicitarse documentación adicional razonable.

## Reclamación ante la autoridad competente

Si un titular considera que el tratamiento de sus datos personales no se ajusta a la Ley N° 19.628 o a la Ley N° 21.719, puede presentar una reclamación ante la autoridad competente en materia de protección de datos, sin perjuicio de haber contactado previamente al DPO de Cmor Flow.
````

- [ ] **Step 2: Verificación.** Confirmar que declara el email `dpo@cmorflow.cl`, un SLA máximo de 30 días y menciona la autoridad competente.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/contacto_dpo.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): contacto_dpo.md - canal y SLA del DPO"
```

---

## Task 3: Política de Privacidad B2B (`docs/legal/politica_privacidad_b2b.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/politica_privacidad_b2b.md`

- [ ] **Step 1: Crear el archivo con los 10 bloques siguientes, redactados en español de Chile.**

````markdown
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

El ejercicio se realiza escribiendo a `dpo@cmorflow.cl` o por el formulario `/legal/contacto-dpo`. Plazos máximos: 30 días corridos para acceso, cancelación, oposición y portabilidad; 15 días para rectificación. La verificación de identidad se realiza mediante un token de un solo uso al correo declarado.

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
- SLA máximo de respuesta: 30 días corridos (ver `docs/legal/contacto_dpo.md`).

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
````

- [ ] **Step 2: Verificación.** Revisar que contiene los 10 bloques numerados y que los 6 derechos están explícitos.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/politica_privacidad_b2b.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): politica de privacidad B2B v2026-06-01"
```

---

## Task 4: Aviso de Privacidad B2B — resumen 1 página (`docs/legal/aviso_privacidad_b2b.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/aviso_privacidad_b2b.md`

- [ ] **Step 1: Crear el archivo con el contenido siguiente.**

````markdown
# Aviso de Privacidad — Resumen B2B

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Responsable:** Cmor Flow
**Dónde se muestra:** modal de primer login y enlace en `/restaurant/settings`.
**Documento completo:** `docs/legal/politica_privacidad_b2b.md`.

Este aviso resume cómo Cmor Flow trata los datos de quienes usan la plataforma en nombre de un restaurante. No sustituye a la Política de Privacidad completa.

## Quién es responsable

Cmor Flow, proveedor del SaaS de pedidos. Contacto del DPO: `dpo@cmorflow.cl`.

## Para qué tratamos sus datos

- Prestar el servicio contratado (gestión del restaurante, menú, pedidos, POS, CRM, reportes).
- Gestionar su cuenta y las invitaciones de su personal.
- Mejorar el producto (analítica de uso) y enviarle comunicaciones comerciales, **solo si usted consiente**.

## Qué datos tratamos

Identidad (nombre, nombre del restaurante), contacto (email, teléfono, ciudad, dirección), credenciales de acceso y eventos de auditoría. **No** tratamos datos sensibles.

## Con quién compartimos

Encargados subcontratados con contrato y cláusulas de protección de datos: Vercel (hosting) y Supabase (base de datos, autenticación, almacenamiento), ambos en Estados Unidos, con Cláusulas Contractuales Tipo (SCC) y cifrado. No cedemos datos con fines comerciales.

## Cuánto conservamos

Mientras dura el contrato. Tras la baja: identidad y contacto anonimizados a los 90 días; datos de pedidos conservados en lo que exige el SII (6 años) con anonimización de los campos personales; logs de auditoría 24-36 meses.

## Sus derechos

Puede ejercer acceso, rectificación, cancelación, oposición, portabilidad y revocación del consentimiento escribiendo a `dpo@cmorflow.cl` (plazo máximo 30 días). Puede también reclamar ante la autoridad competente en protección de datos.

## Al aceptar este aviso

Usted confirma haber leído la Política de Privacidad completa y acepta el tratamiento necesario para la prestación del servicio. Los consentimientos opcionales (marketing, analítica) puede otorgarlos o rechazarlos ahora y revocarlos cuando quiera desde `/account/privacy`.
````

- [ ] **Step 2: Verificación.** Confirmar que el aviso es apto para una pantalla, enlaza a la política completa y menciona el email del DPO y los 6 derechos.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/aviso_privacidad_b2b.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): aviso de privacidad B2B resumen 1 pagina v2026-06-01"
```

---

## Task 5: Política de Privacidad de Clientes Finales (`docs/legal/politica_privacidad_clientes.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/politica_privacidad_clientes.md`

- [ ] **Step 1: Crear el archivo con los 10 bloques siguientes.**

````markdown
# Política de Privacidad — Clientes Finales del Restaurante

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Dirigida a:** clientes finales que hacen pedidos en la carta digital (`/menu/:slug`).
**Dónde se muestra:** pie de página del menú y modal al ingresar datos del cliente.

Esta Política explica cómo se tratan los datos personales que el cliente final entrega al pedir en un restaurante que usa la plataforma Cmor Flow.

---

## 1. Responsable del tratamiento

El **responsable** del tratamiento de los datos del cliente final es el **restaurante** en el que el cliente hace su pedido. El restaurante define las finalidades comerciales, los plazos de su programa de fidelización y la atención al cliente.

**Cmor Flow** actúa como **encargado** del tratamiento: almacena y procesa los datos en la plataforma por cuenta y bajo las instrucciones del restaurante. La relación entre el restaurante y Cmor Flow se rige por el DPA respectivo (`docs/contratos/DPA_cmor_restaurante.md`).

Para ejercer sus derechos, el cliente final puede dirigirse tanto al restaurante (responsable) como a Cmor Flow como encargado, a través de `dpo@cmorflow.cl`.

## 2. Finalidades del tratamiento

- **Prestación del servicio de pedido** (base: contrato): gestionar el pedido, la entrega y, si corresponde, el pago.
- **Atención al cliente** (base: contrato / interés legítimo del restaurante): resolver incidencias relacionadas con un pedido.
- **CRM y fidelización del restaurante** (base: consentimiento, revocable): historial de pedidos y preferencias para personalizar la experiencia del cliente dentro del restaurante.
- **Cumplimiento legal** (base: obligación legal): conservación del registro tributario del pedido por el plazo que exige el SII.

## 3. Categorías de datos tratados

| Categoría | Campos |
|---|---|
| Identidad | nombre del cliente |
| Contacto | teléfono, email |
| Transaccional | líneas de pedido, monto total, método de pago |
| Notas | notas del cliente asociadas al pedido |

No se solicitan datos sensibles. Si excepcionalmente el cliente los incluyera en un campo libre, no se utilizan para ninguna finalidad y se procura su eliminación.

## 4. Destinatarios

Los datos se comunican a:

- **Cmor Flow**, como encargado, para almacenarlos y procesarlos en la plataforma.
- **Encargados subcontratados por Cmor Flow** (Vercel, Supabase y el proveedor de correo transaccional), bajo contrato con cláusulas de protección de datos (ver `docs/contratos/DPA_proveedores.md`).
- **Autoridades competentes** cuando exista obligación legal.

No se ceden los datos a terceros con fines comerciales ajenos al restaurante.

## 5. Transferencias internacionales

Cmor Flow procesa los datos en infraestructura de Vercel y Supabase ubicada en **Estados Unidos**. Las transferencias se documentan con Cláusulas Contractuales Tipo (SCC), cifrado TLS 1.2+ en tránsito y AES-256 en reposo, y minimización de los datos transferidos (ver `docs/privacidad/transferencias_internacionales.md`).

## 6. Derechos del titular

Conforme al artículo 19 de la Ley N° 19.628 y la Ley N° 21.719, el cliente final puede ejercer:

- **Acceso, rectificación, cancelación, oposición y portabilidad**, y **revocación del consentimiento**, dirigiéndose al restaurante o a `dpo@cmorflow.cl`.
- Plazo máximo de respuesta: 30 días corridos (15 días para rectificación).
- La cancelación puede concretarse como **anonimización** de los campos personales cuando exista obligación legal de conservar el registro (p. ej., el registro tributario del pedido exigido por el SII).

## 7. Plazo de conservación

- **Datos de clientes sin pedidos en 24 meses:** anonimizados.
- **Pedidos:** los campos personales se anonimizan a los 6 años (SII); se conservan los montos y líneas.
- Los plazos operativos se ejecutan automáticamente mediante la función `run_retention_sweep()`.

## 8. Contacto del DPO

Cmor Flow, como encargado, ofrece el canal `dpo@cmorflow.cl` y el formulario `/legal/contacto-dpo`. El restaurante es responsable de publicar además su propio canal de atención al cliente.

## 9. Base legal del tratamiento

| Finalidad | Base legal |
|---|---|
| Pedido y entrega | Ejecución de un contrato (Ley N° 19.628 art. 4) |
| Atención al cliente | Contrato e interés legítimo |
| CRM y fidelización del restaurante | Consentimiento del titular |
| Conservación del registro tributario | Obligación legal (SII) |

## 10. Reclamación ante la autoridad competente

El cliente final puede presentar reclamación ante la autoridad competente en materia de protección de datos si considera que el tratamiento no se ajusta a la Ley N° 19.628 o a la Ley N° 21.719, sin perjuicio de contactar previamente al restaurante o al DPO de Cmor Flow.
````

- [ ] **Step 2: Verificación.** Confirmar que identifica al restaurante como responsable y a Cmor Flow como encargado, y contiene los 10 bloques.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/politica_privacidad_clientes.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): politica de privacidad clientes finales v2026-06-01"
```

---

## Task 6: Términos y Condiciones + DPA cliente (`docs/legal/terminos_y_condiciones.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/terminos_y_condiciones.md`

- [ ] **Step 1: Crear el archivo con los Términos del servicio y el Anexo A (DPA cliente).**

````markdown
# Términos y Condiciones del Servicio + DPA Cliente — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Aplicables a:** restaurantes que contratan la plataforma Cmor Flow.
**Aceptación:** casilla obligatoria en `/register`.

Estos Términos regulan el uso de la plataforma SaaS de pedidos para restaurantes proporcionada por Cmor Flow e incorporan, en su Anexo A, el acuerdo de tratamiento de datos personales (DPA cliente) que define la relación entre el restaurante (responsable de los datos de sus clientes finales) y Cmor Flow (encargado).

---

## Parte I — Términos del Servicio

### 1. Objeto

Cmor Flow pone a disposición del restaurante una plataforma SaaS de pedidos para restaurantes (carta digital por QR, panel de administración, POS, CRM y reportes), alojada en Vercel y Supabase, accesible mediante navegador web.

### 2. Aceptación

Al registrarse, el restaurante declara tener capacidad legal para contratar y aceptar estos Términos y el Anexo A (DPA cliente). Si el restaurante no acepta algún término, no debe usar la plataforma.

### 3. Obligaciones del restaurante

- Proporcionar información veraz en el registro y mantenerla actualizada.
- Ser **responsable** del tratamiento de los datos personales de sus clientes finales, conforme a la Ley N° 19.628 y la Ley N° 21.719.
- Utilizar la plataforma conforme a la ley y a estos Términos; en particular, no cargar contenido ilícito ni datos personales que no tenga derecho a tratar.
- Mantener la confidencialidad de sus credenciales y activar los mecanismos de autenticación de varios factores (MFA) cuando Cmor Flow lo exija para roles `admin` y `owner`.
- Responder por las instrucciones que entregue a Cmor Flow como encargado.

### 4. Obligaciones de Cmor Flow

- Prestar el servicio con niveles razonables de disponibilidad y soporte.
- Tratar los datos del restaurante y de sus clientes finales como **encargado**, únicamente según las instrucciones del restaurante y el Anexo A.
- Mantener las medidas de seguridad técnicas y organizativas descritas en el Anexo A.

### 5. Tarifas y facturación

Las tarifas, modalidades de cobro y condiciones económicas se rigen por el acuerdo comercial suscrito entre las partes. En ausencia de acuerdo comercial específico, el registro en la plataforma no genera obligación de pago hasta la contratación efectiva de un plan.

### 6. Propiedad intelectual

Cmor Flow conserva los derechos sobre la plataforma, su código y sus marcas. El restaurante conserva la propiedad de los datos que carga y de los contenidos propios (carta, logos).

### 7. Suspensión y término

Cmor Flow puede suspender el acceso ante incumplimiento grave de estos Términos o por razones de seguridad, previa comunicación salvo urgencia. El restaurante puede terminar el servicio en cualquier momento. A la terminación, los datos se conservan o suprimen conforme al Anexo A.

### 8. Limitación de responsabilidad

Salvo dolo o culpa grave, la responsabilidad de Cmor Flow por el servicio se limita, en conjunto, a las tarifas facturadas en los 12 meses anteriores al hecho generador. No se responde por lucro cesante indirecto.

### 9. Modificaciones

Cmor Flow puede modificar estos Términos; los cambios sustantivos se comunican con antelación razonable y exigen nueva aceptación. La versión vigente se publica en `docs/legal/VERSION.md`.

### 10. Ley aplicable

Estos Términos se rigen por el derecho chileno. Las partes se someten a los tribunales de Santiago de Chile, sin perjuicio de las acciones que pudieran ejercerse ante la autoridad competente en protección de datos.

---

## Anexo A — DPA Cliente (Cláusulas de Tratamiento)

**Partes:** el Restaurante (en adelante, el **Responsable**) y Cmor Flow (en adelante, el **Encargado**).

### A.1 Objeto y roles

El Encargado trata datos personales por cuenta del Responsable, en su calidad de proveedor de la plataforma. El Responsable determina las finalidades y medios del tratamiento respecto de los datos de clientes finales; el Encargado los trata únicamente según las instrucciones documentadas del Responsable.

### A.2 Finalidad

El tratamiento por parte del Encargado se limita a la prestación del servicio contratado (gestión de pedidos, CRM del restaurante, reportes) y a las finalidades derivadas de la Ley N° 19.628 y la Ley N° 21.719.

### A.3 Duración

Por el tiempo que dure el servicio contratado y, posteriormente, por los plazos de conservación exigidos por ley (p. ej., el registro tributario del SII) o hasta la devolución/borrado previsto en A.10.

### A.4 Instrucciones del Responsable

El Encargado documentará y seguirá las instrucciones del Responsable. Las instrucciones que pudieran violar la Ley N° 19.628 o la Ley N° 21.719 se comunican al Responsable para su aclaración antes de ejecutarse.

### A.5 Confidencialidad

El personal del Encargado con acceso a datos personales está sujeto a obligaciones de confidencialidad, con acceso basado en el principio de menor privilegio.

### A.6 Medidas de seguridad

El Encargado mantiene medidas técnicas y organizativas apropiadas: cifrado en tránsito (TLS 1.2+) y en reposo (AES-256), control de acceso basado en roles (RLS), autenticación multifactor para roles privilegiados, registro de auditoría inmutable y revisiones periódicas (`scripts/security-check.ts`).

### A.7 Subencargados

El Encargado autoriza a Vercel y Supabase como subencargados, ubicados en Estados Unidos, bajo Cláusulas Contractuales Tipo (SCC). La lista vigente se mantiene en `docs/contratos/DPA_proveedores.md`.

### A.8 Transferencias internacionales

Las transferencias a Estados Unidos se documentan y mitigan conforme a `docs/privacidad/transferencias_internacionales.md`.

### A.9 Notificación de brechas (72 horas)

El Encargado notifica al Responsable cualquier brecha de seguridad que afecte a los datos personales del Responsable **sin demora indebida y, en todo caso, dentro de las 72 horas** siguientes a su detección, proporcionando la información necesaria para que el Responsable cumpla sus propias obligaciones de notificación.

### A.10 Devolución y borrado

A la terminación del servicio, el Encargado devuelve o suprime los datos personales del Responsable, salvo obligación legal de conservación (p. ej., SII). Los backups se gestionan conforme al principio de expiración natural (7-30 días) y los campos personales afectados por una supresión se anonimizan.

### A.11 Derechos de los titulares

El Encargado asiste al Responsable, en la medida de lo posible, en la atención de las solicitudes de los titulares (art. 19 Ley N° 19.628), poniendo a disposición los mecanismos técnicos para el ejercicio de los derechos (Edge Functions `privacy/*`).

### A.12 Auditoría

El Responsable puede auditar el cumplimiento del Encargado **una vez al año**, previa notificación razonable. La auditoría se realizará sin interrumpir el servicio y se apoya en los reportes de seguridad y los registros de auditoría que el Encargado mantiene.

### A.13 Responsabilidad

Cada parte responde por el incumplimiento de sus obligaciones bajo este Anexo. La responsabilidad del Encargado se rige por la limitación del Apartado 8 de la Parte I, salvo dolo o culpa grave.
````

- [ ] **Step 2: Verificación.** Confirmar que contiene Parte I (10 cláusulas) y Anexo A (13 cláusulas A.1-A.13), y que la notificación de brechas menciona 72 horas.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/terminos_y_condiciones.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): terminos y condiciones + DPA cliente v2026-06-01"
```

---

## Task 7: DPA Cmor Flow ↔ Restaurante (`docs/contratos/DPA_cmor_restaurante.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos/DPA_cmor_restaurante.md`

- [ ] **Step 1: Crear el archivo con las 13 cláusulas del spec §5.2.**

````markdown
# DPA — Cmor Flow (Encargado) ↔ Restaurante (Responsable)

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Marco normativo:** Ley N° 19.628 y Ley N° 21.719.

Acuerdo de tratamiento de datos personales entre el Restaurante (en adelante, el **Responsable**) y Cmor Flow (en adelante, el **Encargado**), en relación con los datos de clientes finales del Restaurante tratados en la plataforma Cmor Flow.

> Nota: este DPA contractual de proveedor se complementa con el Anexo A de `docs/legal/terminos_y_condiciones.md`, que detalla los roles y obligaciones del Restaurante en su calidad de cliente de la plataforma. Ambos documentos se interpretan de forma armónica; en caso de discrepancia sobre tratamiento de datos personales, prevalece el más protector del titular.

---

### Cláusula 1 — Objeto

El Encargado tratará datos personales por cuenta del Responsable, únicamente para prestar el servicio contratado. El Responsable se compromete a otorgar instrucciones documentadas y lícitas.

### Cláusula 2 — Finalidad

La finalidad del tratamiento es la operación de la plataforma de pedidos del Restaurante (carta digital, gestión de pedidos, POS, CRM y reportes), conforme a la Ley N° 19.628 y la Ley N° 21.719.

### Cláusula 3 — Duración

Por la vigencia del servicio contratado y, posteriormente, durante los plazos de conservación que la ley exija o hasta la devolución/borrado de la Cláusula 10.

### Cláusula 4 — Instrucciones del Responsable

El Encargado documentará las instrucciones del Responsable. Las instrucciones manifiestamente contrarias a la Ley N° 19.628 o a la Ley N° 21.719 se comunican al Responsable para su aclaración y no se ejecutan hasta resolver la discrepancia.

### Cláusula 5 — Confidencialidad

El personal del Encargado con acceso a los datos está sujeto a obligaciones de confidencialidad, con acceso basado en el principio de menor privilegio y segregación de funciones por rol (`owner`, `staff`, `admin`).

### Cláusula 6 — Medidas de seguridad

El Encargado mantiene medidas técnicas y organizativas apropiadas al riesgo:

- Cifrado en tránsito TLS 1.2+ y en reposo AES-256 (Supabase).
- Seguridad por diseño: Row Level Security en todas las tablas con datos personales, políticas validadas con `scripts/security-check.ts`.
- Autenticación multifactor obligatoria para roles `admin` y `owner`.
- Registro de auditoría inmutable (`audit_log`, append-only).
- Copias de respaldo cifradas con recuperación en un punto en el tiempo (PITR).

### Cláusula 7 — Subencargados

El Encargado autoriza a los subencargados listados en `docs/contratos/DPA_proveedores.md` (Vercel y Supabase, en Estados Unidos, con SCC; proveedor de correo transaccional). Cualquier cambio se comunica al Responsable con antelación razonable.

### Cláusula 8 — Transferencias internacionales (SCC)

Las transferencias a Estados Unidos se documentan con Cláusulas Contractuales Tipo y se mitigan con cifrado y minimización. La evaluación de transferencias se mantiene en `docs/privacidad/transferencias_internacionales.md`, con reevaluación trimestral.

### Cláusula 9 — Notificación de brechas (72 horas)

El Encargado notifica al Responsable cualquier incidente de seguridad que afecte a datos personales **sin demora indebida y, en todo caso, dentro de las 72 horas** desde su detección, incluyendo: naturaleza de la brecha, categorías y número aproximado de afectados, medidas de contención y punto de contacto. Esto permite al Responsable cumplir sus propias obligaciones frente a la autoridad competente y a los titulares.

### Cláusula 10 — Devolución y borrado

A la terminación del servicio, el Encargado devuelve al Responsable los datos personales tratados, o los suprime a elección del Responsable, salvo obligación legal de conservación (p. ej., registro tributario del SII). En este último caso, los campos personales se anonimizan. Las copias en backups expiran naturalmente (7-30 días).

### Cláusula 11 — Derechos de los titulares

El Encargado asiste al Responsable en la atención de las solicitudes de los titulares (art. 19 Ley N° 19.628), poniendo a disposición los mecanismos técnicos para ejercicio de los derechos (Edge Functions `privacy/*` y la cola `data_subject_requests`), dentro de los plazos legales (30 días, salvo rectificación con 15 días).

### Cláusula 12 — Auditoría anual

El Responsable puede auditar el cumplimiento del Encargado **una vez al año**, previa notificación razonable y sin interrumpir el servicio. La auditoría se apoya en los reportes de seguridad, el registro `audit_log` y el RAT del Encargado (`docs/privacidad/RAT.md`).

### Cláusula 13 — Responsabilidad

Cada parte responde por el incumplimiento de sus obligaciones bajo este DPA. La responsabilidad del Encargado se limita a las tarifas facturadas en los 12 meses anteriores, salvo dolo o culpa grave. Las partes se someten a la jurisdicción de los tribunales de Santiago de Chile.
````

- [ ] **Step 2: Verificación.** Confirmar las 13 cláusulas y que la cláusula de brechas menciona 72 horas.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/contratos/DPA_cmor_restaurante.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(contratos): DPA Cmor Flow restaurante 13 clausulas v2026-06-01"
```

---

## Task 8: DPA con Proveedores (`docs/contratos/DPA_proveedores.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos/DPA_proveedores.md`

- [ ] **Step 1: Crear el archivo con la tabla de estado de DPAs por proveedor y las cláusulas estándar.**

````markdown
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
````

- [ ] **Step 2: Verificación.** Confirmar que la tabla cubre los 4 proveedores, Resend como default, y las 10 cláusulas estándar incluyen notificación 72h y ZDR.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/contratos/DPA_proveedores.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(contratos): DPA proveedores y subencargados v2026-06-01"
```

---

## Task 9: Transferencias Internacionales (`docs/privacidad/transferencias_internacionales.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/transferencias_internacionales.md`

- [ ] **Step 1: Crear el archivo con la evaluación por país y reevaluación trimestral.**

````markdown
# Evaluación de Transferencias Internacionales — Cmor Flow

> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.

**Versión:** 2026-06-01
**Marco normativo:** Ley N° 19.628 y Ley N° 21.719 (vigencia nacional 1 de diciembre de 2026).

Este documento evalúa las transferencias internacionales de datos personales que realiza Cmor Flow, en su calidad de responsable de los datos B2B y de encargado de los datos de clientes finales. Sirve de soporte a las cláusulas de transferencias de los DPA (`docs/contratos/`) y a la Política de Privacidad.

## Resumen ejecutivo

Cmor Flow procesa datos personales en infraestructura de **Estados Unidos** mediante Vercel (hosting frontend) y Supabase (base de datos, autenticación, almacenamiento, Realtime, Edge Functions; endpoint del proyecto `https://clsgoknzyhkxtogxoshz.supabase.co`). Chile aún no publica una decisión de adecuación para Estados Unidos. Por ello, las transferencias se documentan y mitigan con Cláusulas Contractuales Tipo (SCC), cifrado y minimización de datos.

## Evaluación por país

### Estados Unidos — Riesgo: medio

| Dimensión | Evaluación |
|---|---|
| Proveedores | Vercel, Supabase, proveedor de correo transaccional, proveedor de IA futuro |
| Datos transferidos | Cuenta B2B (identidad, contacto, autenticación), clientes finales del restaurante (identidad, contacto, pedidos) |
| Marco legal aplicable en destino | Orden Ejecutiva 14086 y el marco de protección de la privacidad UE-EE. UU. (referencias útiles para ponderar las garantías) |
| Nivel de protección | Medio. Existe un marco de privacidad reconocido internacionalmente, pero no hay decisión de adecuación específica emitida por Chile |
| Garantías adoptadas | Cláusulas Contractuales Tipo (SCC); cifrado en tránsito TLS 1.2+ y en reposo AES-256; minimización (solo datos necesarios para el servicio); segregación lógica multi-tenant con Row Level Security |
| Evaluación de impacto | Las garantías adoptadas reducen el riesgo a un nivel razonable. La transferencia **procede condicionada** a la firma del DPA correspondiente (incluyendo SCC) con cada proveedor |

### Chile

El procesamiento interno de Cmor Flow (Edge Functions y la lógica de aplicación) opera bajo jurisdicción chilena. No constituye transferencia internacional.

### Otros países

A la fecha, no hay otros destinos. Cualquier nuevo destino se incorpora a este documento tras una evaluación específica y la firma del DPA correspondiente.

## Medidas de mitigación transversales

1. **Minimización:** solo se transfieren los datos estrictamente necesarios para la finalidad del servicio.
2. **Cifrado:** TLS 1.2+ en tránsito y AES-256 en reposo en todos los proveedores.
3. **Separación lógica:** arquitectura multi-tenant con Row Level Security; un inquilino no accede a los datos de otro.
4. **Acceso por menor privilegio:** roles `owner`, `staff` y `admin` con permisos diferenciados; MFA obligatorio para `admin` y `owner`.
5. **Trazabilidad:** registro de auditoría inmutable (`audit_log`) que cubre accesos y operaciones relevantes.
6. **Cláusulas contractuales:** DPA con cláusulas estándar (incluidas SCC) en cada proveedor (ver `docs/contratos/DPA_proveedores.md`).

## Reevaluación trimestral

Cada tres meses, el DPO revisa:

- [ ] Si Chile ha publicado una decisión de adecuación para algún país destino (en particular Estados Unidos), lo que permitiría simplificar el régimen aplicable.
- [ ] Si los proveedores mantienen sus DPA y certificaciones vigentes (SOC 2, ISO/IEC 27001 u otras reconocidas).
- [ ] Si las categorías de datos transferidas se mantienen sin cambios respecto de la minimización declarada.
- [ ] Si han ocurrido incidentes en proveedores que afecten la evaluación de riesgo.

El resultado de la reevaluación se registra en `docs/privacidad/checklist_trimestral.md` y, si hay cambios sustantivos, se actualiza este documento con nueva versión.
````

- [ ] **Step 2: Verificación.** Confirmar que cubre USA (riesgo medio, SCC, cifrado, minimización, procede condicionado a DPA) y define reevaluación trimestral.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/transferencias_internacionales.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): evaluacion de transferencias internacionales v2026-06-01"
```

---

## Task 10: Registro de Actividades de Tratamiento (RAT) (`docs/privacidad/RAT.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/RAT.md`

- [ ] **Step 1: Crear el archivo con los 10 tratamientos (RAT-001 a RAT-010).**

````markdown
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
````

- [ ] **Step 2: Verificación.** Confirmar los 10 tratamientos y que cada uno tiene todas las columnas.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/RAT.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): RAT 10 tratamientos RAT-001 a RAT-010 v2026-06-01"
```

---

## Task 11: Checklist Trimestral (`docs/privacidad/checklist_trimestral.md`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/checklist_trimestral.md`

- [ ] **Step 1: Crear el archivo con los 11 ítems del spec §5.6 y registro de ejecuciones.**

````markdown
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
````

- [ ] **Step 2: Verificación.** Confirmar los 11 ítems del spec §5.6.
- [ ] **Step 3: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/checklist_trimestral.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): checklist trimestral 11 items v2026-06-01"
```

---

## Task 12: README raíz — extender con sección de privacidad

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/README.md`

> **Pre-condición:** el archivo `README.md` raíz ya existe. Esta tarea **EXTIENDE** el README existente insertando una sección de privacidad antes de la sección "Licencia" final; NO sobrescribe el contenido existente. Conservar íntegramente las secciones actuales del README.

- [ ] **Step 1: Leer el README actual y localizar la sección final (típicamente `## 📜 Licencia`).**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" --no-pager log --oneline -1
```

```bash
ls "C:/Users/angel/Desktop/Code/SaaS suchi/README.md"
```

Abrir el archivo y ubicar el heading de cierre (ej. `## Licencia`, `## 📜 Licencia`).

- [ ] **Step 2: Insertar la sección siguiente ANTES de la cabecera de Licencia.** Mantener intacto todo el contenido previo y el contenido posterior a la inserción.

````markdown
---

## 🔐 Plan de Cumplimiento de Privacidad (Ley 19.628 / Ley 21.719)

Cmor Flow mantiene un plan de cumplimiento de protección de datos personales organizado en **4 capas** que se aplican en orden de dependencia técnica. La capa 4 (gobernanza, documental) puede aplicarse en paralelo al resto porque no depende de código.

> **Disclaimer legal:** los documentos de `docs/legal/`, `docs/contratos/` y `docs/privacidad/` son **borradores técnicos**. Requieren revisión de un abogado chileno antes de su publicación oficial. La versión vigente de las políticas se declara en `docs/legal/VERSION.md`.

### Orden de aplicación de las capas

| Capa | Qué cubre | Dónde | Estado |
|---|---|---|---|
| 1. Fundacional | Schema SQL + RLS + auditoría + retención | `database/` (archivos `03`-`10`) | Plan escrito; aplicación por MCP desde Antigravity |
| 2. Transparencia y Derechos | Documentos legales + Edge Functions `privacy/*` + UI | `docs/legal/`, `supabase/functions/`, `src/components/privacy/`, `src/pages/` | En diseño |
| 3. Operacional | AIPD, plantillas de brecha, `security-check.ts`, reglas IA | `docs/privacidad/`, `docs/seguridad/`, `scripts/` | En diseño |
| 4. Gobernanza | RAT, DPA, transferencias, checklist trimestral | `docs/privacidad/`, `docs/contratos/`, este README | Documentos generados (borrador) |

### Estructura de carpetas del plan

```
SaaS suchi/
├── database/                  ← SQL para Supabase (capa 1, aplicar vía MCP)
│   ├── 03_privacy_consents.sql
│   ├── 04_audit_log.sql
│   ├── 05_rls_hardening.sql
│   ├── 06_password_deprecation.sql
│   ├── 07_data_subject_requests.sql
│   ├── 08_retention.sql
│   ├── 09_breach_register.sql
│   ├── 10_pg_cron_schedule.sql
│   └── migrations_rollback.sql  ← EMERGENCIA, ver §"Rollback" abajo
├── scripts/                    ← Automatización (npm run X)
│   ├── security-check.ts
│   ├── seed-policy-versions.ts
│   └── dsar-cron-check.ts
├── docs/
│   ├── legal/                  ← Documentos legales (los revisa un abogado)
│   │   ├── politica_privacidad_b2b.md
│   │   ├── aviso_privacidad_b2b.md
│   │   ├── politica_privacidad_clientes.md
│   │   ├── terminos_y_condiciones.md
│   │   ├── VERSION.md
│   │   └── contacto_dpo.md
│   ├── privacidad/             ← Documentación operativa de privacidad
│   │   ├── RAT.md
│   │   ├── transferencias_internacionales.md
│   │   ├── checklist_trimestral.md
│   │   ├── aipd_plantilla.md
│   │   ├── reglas_ia.md
│   │   └── aipd_01..04_*.md
│   ├── contratos/              ← DPA (también los revisa un abogado)
│   │   ├── DPA_cmor_restaurante.md
│   │   └── DPA_proveedores.md
│   └── seguridad/              ← Plantillas y playbook de incidentes
│       ├── plantilla_notificacion_autoridad.md
│       ├── plantilla_notificacion_titulares.md
│       ├── plantilla_comunicado_interno.md
│       ├── playbook_respuesta_incidentes.md
│       └── rotacion_secretos.md
└── supabase/functions/         ← Edge Functions privacy/* (capa 2)
```

### Entregables clave

- **Políticas de privacidad:** `docs/legal/politica_privacidad_b2b.md`, `docs/legal/aviso_privacidad_b2b.md`, `docs/legal/politica_privacidad_clientes.md`, `docs/legal/terminos_y_condiciones.md`.
- **Gobernanza:** `docs/privacidad/RAT.md` (10 tratamientos), `docs/privacidad/transferencias_internacionales.md`, `docs/privacidad/checklist_trimestral.md`.
- **Contratos:** `docs/contratos/DPA_cmor_restaurante.md` (13 cláusulas), `docs/contratos/DPA_proveedores.md` (Vercel, Supabase, correo, IA).
- **Contacto del DPO:** `dpo@cmorflow.cl` (SLA 30 días, ver `docs/legal/contacto_dpo.md`).

### Spec de referencia

`docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` — diseño completo del plan (4 capas, 12 requisitos).

### Rollback (emergencia)

`database/migrations_rollback.sql` es una **herramienta de emergencia** que **NO** forma parte del flujo normal. Solo se ejecuta si una migración de la capa 1 (`03`-`10`) causa un problema crítico que no se puede resolver con una nueva migración. Antes de ejecutarlo:

1. Hacer un backup en Supabase (Dashboard → Database → Backups).
2. Revisar el archivo bloque por bloque; **NO ejecutar todo de una vez**.
3. Tener presente que **NO revierte** los parches de RLS de `05_rls_hardening.sql` (reabrirían vulnerabilidades) ni la deprecación de `admin_users`.
````

- [ ] **Step 3: Verificación.** Confirmar que el README original quedó intacto y que la nueva sección aparece antes de la sección de Licencia. Verificar que los enlaces a archivos apuntan a rutas existentes o planeadas según la tabla de capas.
- [ ] **Step 4: Commit.**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add README.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(readme): anade seccion de plan de cumplimiento de privacidad (capas 1-4)"
```

---

## Verificación final de la Capa 4

- [ ] `docs/legal/VERSION.md` declara `2026-06-01` y changelog.
- [ ] `docs/legal/contacto_dpo.md` publica `dpo@cmorflow.cl`, SLA 30 días y autoridad competente.
- [ ] `docs/legal/politica_privacidad_b2b.md` tiene los 10 bloques y los 6 derechos explícitos.
- [ ] `docs/legal/aviso_privacidad_b2b.md` es un resumen de 1 página apto para modal.
- [ ] `docs/legal/politica_privacidad_clientes.md` identifica restaurante como responsable y Cmor Flow como encargado, con 10 bloques.
- [ ] `docs/legal/terminos_y_condiciones.md` tiene Parte I (10 cláusulas) + Anexo A (DPA cliente).
- [ ] `docs/contratos/DPA_cmor_restaurante.md` tiene las 13 cláusulas con brechas 72 h.
- [ ] `docs/contratos/DPA_proveedores.md` cubre Vercel, Supabase, correo (Resend default) e IA, con notificación 72 h y ZDR.
- [ ] `docs/privacidad/transferencias_internacionales.md` evalúa USA (riesgo medio, SCC, cifrado, procede condicionado) con reevaluación trimestral.
- [ ] `docs/privacidad/RAT.md` tiene los 10 tratamientos RAT-001 a RAT-010 con todas las columnas.
- [ ] `docs/privacidad/checklist_trimestral.md` tiene los 11 ítems del spec §5.6.
- [ ] `README.md` raíz extendido (no sobrescrito) con la sección de privacidad, estructura de carpetas, orden de capas, links y rollback.

## Búsqueda de placeholders

```bash
grep -rnE "TBD|TODO|\[completar\]|describir aquí|XXX" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/README.md" \
  || echo "OK: sin placeholders prohibidos en ningun archivo de la Capa 4"
```

## Qué cubre esta capa del spec

| Requisito Ley 21.719 | Dónde se cubre |
|---|---|
| 3. Transparencia | Tasks 3, 4, 5 (políticas B2B, aviso, clientes) |
| 7. Transferencias internacionales | Task 9 (evaluación + SCC) |
| 9. Proveedores y contratos (DPA) | Tasks 6, 7, 8 (TyC + DPA cliente, DPA Cmor↔Restaurante, DPA proveedores) |
| 12. Documentación y gobernanza | Tasks 1, 2, 10, 11, 12 (VERSION, DPO, RAT, checklist, README) |

## Qué NO cubre (capas 1-3)

- Capa 1 (SQL y RLS): `database/03`-`10`.
- Capa 2 (transparencia y derechos): Edge Functions `privacy/*` y UI React.
- Capa 3 (operacional): AIPD concretas, plantillas de brecha, `security-check.ts`.
