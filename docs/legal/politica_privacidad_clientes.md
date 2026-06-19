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
