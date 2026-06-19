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

1. **Minimización:** solo se transfieren los datos strictly necesarios para la finalidad del servicio.
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
