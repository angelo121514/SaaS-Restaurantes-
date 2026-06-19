# AIPD-02 — CRM de clientes finales

- **Identificador AIPD:** `AIPD-02`
- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Vinculación al RAT:** `RAT-004` (Pedidos de clientes finales), tratado por el restaurante como responsable y por Cmor Flow como **encargado**.
- **Responsable del tratamiento:** Restaurante (Cmor Flow actúa como encargado; ver DPA en `docs/contratos/DPA_cmor_restaurante.md`).
- **DPO:** `dpo@cmorflow.cl`.

## Sección 1 — Descripción del tratamiento

El CRM de clientes finales almacena los datos que el restaurante introduce sobre sus propios clientes en `public.restaurant_customers` (nombre, teléfono, email, notas) y los vincula con el historial de pedidos en `public.orders` (items, total, método de pago, marca temporal). El cliente final también puede ingresar su nombre y teléfono directamente al hacer un pedido desde `/menu/:slug`. Cmor Flow, como encargado, únicamente procesa estos datos por instrucción del restaurante y los almacena en Supabase.

Flujo de datos: cliente final en el menú QR → (HTTPS) → Supabase → tabla `orders` y `restaurant_customers`. El restaurante accede a su CRM desde su dashboard; un admin de Cmor Flow accede por soporte con `is_admin()`. No hay transferencia a terceros más allá de los encargados de infraestructura.

## Sección 2 — Necesidad y proporcionalidad

El tratamiento es necesario para **ejecutar el pedido** (base legal `contract`) y para **gestionar la relación cliente-restaurante** (CRM, base legal `legitimate_interest`).

- **Nombre y teléfono del cliente:** indispensables para armar el pedido y entregarlo. Sin nombre no es posible la preparación; sin teléfono no es posible coordinar la entrega.
- **Email del cliente:** opcional; se recoge solo para enviar comprobante o marketing si el cliente consiente.
- **Notas del CRM:** opcionales; las escribe el restaurante (preferencias, alergias declaradas por el cliente). No se exige.

Alternativas evaluadas: ofrecer pedidos 100% anónimos sin CRM. Se descartó porque el CRM es una funcionalidad central del SaaS solicitada por el restaurante responsable. La minimización se aplica permitiendo operar sin email y con nombre+teléfono mínimo.

## Sección 3 — Categorías de datos y datos sensibles

| Categoría | Campos | Tabla | Sensible | Origen |
|---|---|---|---|---|
| Identidad cliente | `customer_name` | `restaurant_customers`, `orders` | No | Cliente / Restaurante |
| Contacto cliente | `phone`, `email` | `restaurant_customers`, `orders` | No | Cliente / Restaurante |
| Transaccional | `items`, `total`, `payment_method` | `orders` | No (financiero) | Cliente |
| Operativos | `notes`, `customer_notes` | `restaurant_customers`, `orders` | No | Restaurante |

- **Datos sensibles:** las **notas del CRM pueden contener alergias o condiciones de salud declaradas voluntariamente** por el cliente. Aunque no son solicitadas activamente, el restaurante podría registrarlas. Se clasifican como potencialmente sensibles y se aplica: (a) no usarlas para automatizar decisiones, (b) accesibles solo al restaurante y a admin Cmor Flow, (c) cubiertas por RLS estricta.
- **Datos de niños/adolescentes:** no se verifican; servicio de pedidos genérico. Si un cliente menor deja datos, se aplican las mismas medidas de minimización.

## Sección 4 — Titulares y bases legales

| Titular | Categoría afectada | Base legal | Consentimiento requerido |
|---|---|---|---|
| Cliente final | Identidad cliente, Contacto cliente, Transaccional | `contract` (ejecución del pedido) | No (necesario para entregar) |
| Cliente final | Marketing del restaurante | `consent` | Sí (scope `marketing`) |
| Restaurante | Notas del CRM (datos que el restaurante introduce) | `legitimate_interest` | No (responsable de esos datos) |

El restaurante es **responsable** de los datos de sus clientes y debe disponer de su propio aviso de privacidad; Cmor Flow es **encargado** y solo los procesa por instrucción.

## Sección 5 — Destinatarios y transferencias

- **Destinatarios internos:** el restaurante (vía RLS por `restaurant_id`), y admin Cmor Flow por soporte (`is_admin()`).
- **Encargados subcontratados:** Supabase (DB/Storage), Vercel (hosting). Mismos DPAs/SCC que AIPD-01.
- **Transferencias internacionales:** USA, riesgo **medio**, SCC + cifrado + minimización.

## Sección 6 — Riesgos (matriz probabilidad × impacto)

| ID | Riesgo | Prob. | Impacto | Inherente | Descripción |
|---|---|---|---|---|---|
| R1 | Fuga de CRM de un restaurante a otro (cross-tenant) | 2 | 4 | 8 (medio) | Falla en RLS por `restaurant_id` |
| R2 | Notas sensibles (alergias/salud) expuestas en export | 2 | 3 | 6 (medio) | El admin exporta CSV sin anonimizar |
| R3 | Reidentificación por cruce teléfono+nombre+ciudad | 2 | 3 | 6 (medio) | Dataset pequeño por restaurante |
| R4 | Conservación indefinida de clientes inactivos | 3 | 2 | 6 (medio) | Incumplimiento retención 24 meses |
| R5 | Acceso de ex-empleado del restaurante (cuenta staff no dada de baja) | 2 | 3 | 6 (medio) | Gestión de altas/bajas del restaurante |

## Sección 7 — Medidas mitigantes

| Riesgo | Medida | Tipo | Reduce |
|---|---|---|---|
| R1 | RLS estricta por `restaurant_id` en `restaurant_customers` y `orders`; `audit_log` registra accesos | Técnica | Probabilidad |
| R1 | Tests de aislamiento multi-tenant en `security-check.ts` | Técnica | Probabilidad |
| R2 | Export admin se audita en `audit_log` con `action='export_data'`; filtro de notas sensibles en pipeline de IA (Regla 4) | Técnica/Org. | Impacto |
| R3 | Cifrado AES-256 reposo; no se exponen datos crudos en logs (`audit_log.metadata` sin personales) | Técnica | Impacto |
| R4 | `run_retention_sweep()` anonimiza clientes sin pedidos > 24 meses | Técnica | Probabilidad |
| R5 | MFA opcional para `staff`; el restaurante gestiona altas/bajas desde su settings | Org. | Probabilidad |

## Sección 8 — Riesgo residual

| ID | Prob. post | Impacto post | Residual | Aceptable |
|---|---|---|---|---|
| R1 | 1 | 3 | 3 (bajo) | Sí |
| R2 | 1 | 2 | 2 (bajo) | Sí |
| R3 | 1 | 2 | 2 (bajo) | Sí |
| R4 | 1 | 2 | 2 (bajo) | Sí |
| R5 | 2 | 2 | 4 (bajo) | Sí |

Todos los riesgos residuales quedan en **bajo**.

## Sección 9 — Decisión

- **Decisión:** **Procede.**
- **Condiciones:** mantener el DPA Cmor Flow ↔ Restaurante vigente (`docs/contratos/DPA_cmor_restaurante.md`); el restaurante debe informar a sus clientes (aviso de privacidad) y gestionar altas/bajas de staff.
- **Próxima revisión:** 2027-06-18 o ante activación de IA sobre datos del CRM.
- **Firma DPO:** `dpo@cmorflow.cl` — Fecha: 2026-06-18.

## Referencias normativas

- Ley N° 19.628, art. 2, art. 4, art. 19.
- Ley N° 21.719, art. 9, art. 19, art. 24.
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §1.3, §4.1.
- DPA: `docs/contratos/DPA_cmor_restaurante.md`.

> **Disclaimer legal:** este AIPD es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
