# Plantilla — Comunicado interno de incidente

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Audiencia:** equipo interno de Cmor Flow (desarrollo, soporte, ventas, dirección).

> Cómo usar: enviar por el canal interno oficial (Slack/email) al cierre del incidente o cuando se requiera coordinar. Ajustar el nivel de detalle al rol del destinatario.

## Texto del comunicado

Asunto: **Interno — Incidente de seguridad `{breach_register.id}` — resumen y acciones**

Equipo,

Resumen del incidente de seguridad `{breach_register.id}` para coordinación interna. **Este mensaje es confidencial y de uso interno. No reenviar ni comentar fuera de Cmor Flow.**

**Qué pasó (resumen ejecutivo)**

`{2–3 líneas en lenguaje plano: qué se vio, cuándo, qué se afectó}`.

**Estado actual**

- Severidad: `{low / medium / high / critical}`.
- Estado: `{contained / notified / closed}`.
- Categorías afectadas: `{breach_register.affected_data_categories}`.
- Titulares afectados (aprox.): `{breach_register.affected_subjects_count}`.

**Acciones tomadas**

- `{acción 1}`.
- `{acción 2}`.
- `{acción 3}`.

**Notificaciones externas**

- Autoridad competente: `{notificada el YYYY-MM-DD / no requerida}`.
- Titulares: `{notificados el YYYY-MM-DD / no requerido}`.

**Qué se pide al equipo**

- **Soporte:** usar el guion oficial (ver más abajo) si un cliente o titular pregunta. No dar detalles técnicos.
- **Ventas:** no iniciar conversaciones sobre este incidente; si un cliente pregunta, derivar al DPO.
- **Desarrollo:** priorizar las acciones correctivas listadas en `{enlace al issue/ticket}`.
- **Comunicaciones:** cualquier declaración externa pasa por el DPO. Sin permiso, no publicar nada en redes ni a clientes.

**Guion para consultas**

> *"Estamos al tanto del incidente, ya lo contuvimos y notificamos a las autoridades y a las personas afectadas conforme a la ley. Por favor escribe a dpo@cmorflow.cl para detalles de tu caso."*

**Contacto**

DPO: `dpo@cmorflow.cl`. Encargado de respuesta: `{nombre}`.

Gracias por la colaboración.

## Checklist de envío

- [ ] Resumen ejecutivo revisado por el DPO.
- [ ] Acciones tomadas actualizadas en `breach_register`.
- [ ] Guion de consultas difundido a soporte y ventas.
- [ ] Recordatorio de confidencialidad incluido.

## Referencias normativas

- Ley N° 21.719, art. 24 (seguridad del tratamiento).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** este comunicado es interno. Su difusión externa está sujeta a aprobación del DPO.
