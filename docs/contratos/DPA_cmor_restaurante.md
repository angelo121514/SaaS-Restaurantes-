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

El Encargado asiste al Responsable en la atención de las solicitudes de los titulares (art. 19 Ley N° 21.719), poniendo a disposición los mecanismos técnicos para ejercicio de los derechos (Edge Functions `privacy/*` y la cola `data_subject_requests`), dentro de los plazos legales (10 días hábiles, prorrogables a 15 en casos complejos; 5 días hábiles para rectificación).

### Cláusula 12 — Auditoría anual

El Responsable puede auditar el cumplimiento del Encargado **una vez al año**, previa notificación razonable y sin interrumpir el servicio. La auditoría se apoya en los reportes de seguridad, el registro `audit_log` y el RAT del Encargado (`docs/privacidad/RAT.md`).

### Cláusula 13 — Responsabilidad

Cada parte responde por el incumplimiento de sus obligaciones bajo este DPA. La responsabilidad del Encargado se limita a las tarifas facturadas en los 12 meses anteriores, salvo dolo o culpa grave. Las partes se someten a la jurisdicción de los tribunales de Santiago de Chile.
