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
- Mantener la confidencialidad de sus credenciales y activar los mecanismos de autenticación de varios factores (MFA) cuando Cmor Flow lo exija para roles `admin` and `owner`.
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
