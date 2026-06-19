# Plantilla — Notificación de brecha a la autoridad competente

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Marco normativo:** Ley N° 21.719, notificación a la autoridad competente **dentro de 72 horas** desde la detección cuando la brecha sea `medium` o superior (D12).

> Cómo usar: copiar el bloque **Texto de la notificación** en el cuerpo del correo (o documento) dirigido a *la autoridad competente*. Reemplazar los campos entre llaves `{...}` con los datos del incidente tomados de `breach_register`.

## Datos del remitente

- **Responsable del tratamiento:** Cmor Flow.
- **DPO:** `dpo@cmorflow.cl`.
- **Teléfono de contacto DPO:** `{+56 X XXXX XXXX}`.
- **Fecha de la notificación:** `{YYYY-MM-DD}`.

## Texto de la notificación

Asunto: **Notificación de brecha de seguridad de datos personales — Cmor Flow — Ref. `{breach_register.id}`**

Estimada autoridad competente:

En cumplimiento de la obligación de notificar brechas de seguridad que afecten datos personales conforme a la Ley N° 21.719, Cmor Flow comunica la siguiente brecha:

1. **Referencia interna:** `{breach_register.id}`.
2. **Fecha y hora de detección:** `{breach_register.detected_at}` (hora de Chile).
3. **Fecha y hora de esta notificación:** `{ahora}` (dentro de las 72 horas desde la detección).
4. **Descripción de la brecha:** `{breach_register.description}`. Naturaleza del incidente: `{acceso no autorizado / exfiltración / pérdida / destrucción / alteración}`.
5. **Categorías de datos afectadas:** `{breach_register.affected_data_categories}` — p. ej. *identidad B2B, contacto B2B, autenticación, identidad cliente, contacto cliente, transaccional, tokens, audit, consents, DSARs*.
6. **Número aproximado de titulares afectados:** `{breach_register.affected_subjects_count}`.
7. **Severidad asignada:** `{breach_register.severity}` (low / medium / high / critical).
8. **Probables consecuencias:** `{descripción de los riesgos para los titulares: p. ej. suplantación de identidad, fraude, exposición de contacto}`.
9. **Medidas de contención aplicadas:** `{breach_register.containment_measures}` — incluye revocación de sesiones, rotación de credenciales, parche RLS, restauración de backup, bloqueo de cuentas.
10. **Medidas correctivas en curso:** `{acciones con responsable y fecha}`.
11. **Notificación a titulares:** `{Sí, enviada el YYYY-MM-DD / No, por no existir riesgo alto a sus derechos, conforme evaluación DPO}`.
12. **Contacto del DPO:** `dpo@cmorflow.cl` — `{+56 X XXXX XXXX}`.

Quedamos a disposición para ampliar la información y aportar la evidencia que se requiera.

Atentamente,

**`{Nombre del DPO}`**
Data Protection Officer — Cmor Flow
`dpo@cmorflow.cl`

## Checklist de envío

- [ ] Datos del remitente completados.
- [ ] Campos 1–12 rellenados desde `breach_register`.
- [ ] `breach_register.reported_at=now()`.
- [ ] `breach_register.authority_notified_at=now()`.
- [ ] `breach_register.status='notified'`.
- [ ] Acuse de recibo conservado (adjunto al registro del incidente).

## Referencias normativas

- Ley N° 21.719 (notificación de brechas a la autoridad competente, dentro de 72 horas).
- Ley N° 19.628, art. 23 (seguridad).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** esta plantilla es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
