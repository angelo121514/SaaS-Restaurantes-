# Plantilla — Notificación de brecha a titulares afectados

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.
- **Marco normativo:** Ley N° 21.719, notificación a titulares **dentro de 72 horas** cuando la brecha implique riesgo alto a sus derechos y libertades.

> Cómo usar: enviar por email (o canal disponible) a cada titular afectado. Personalizar el saludo y los datos entre llaves. Mantener el lenguaje simple y orientado a la acción.

## Texto de la notificación

Asunto: **Aviso importante sobre la seguridad de tus datos — Cmor Flow**

Hola, `{nombre del titular}`:

Te escribimos porque detectamos un incidente de seguridad que pudo haber expuesto algunos de tus datos personales. Te contamos qué pasó, qué datos están involucrados y qué te recomendamos hacer.

**¿Qué pasó?**

`{descripción breve y clara del incidente, sin tecnicismos: p. ej. "Alguien accedió sin autorización a una base de datos que contenía tu nombre y teléfono"}`. Lo detectamos el `{fecha de detección}` y ya tomamos medidas para frenarlo.

**¿Qué datos tuyos están involucrados?**

`{lista concreta: nombre, teléfono, correo, etc.}`. **No** están involucrados `{datos no afectados: p. ej. contraseñas, tarjetas}`.

**¿Qué hicimos nosotros?**

- Cerramos las sesiones y rotamos las credenciales afectadas.
- Reparamos la causa del incidente.
- Reportamos el caso a la autoridad competente.

**¿Qué te recomendamos hacer?**

1. **Cambia tu contraseña** de Cmor Flow en `{enlace a /setup-password o recuperación}` si tienes cuenta con nosotros.
2. **Revisa tu correo y teléfono** por si recibes mensajes sospechosos: no entregues claves ni códigos a quien te los pida.
3. **Desconfía de correos o llamadas** que mencionen este incidente para pedirte datos: Cmor Flow **nunca** te pedirá tu contraseña.
4. Si tienes dudas, escríbenos a `dpo@cmorflow.cl`.

**¿Dónde obtener más información?**

Puedes escribirnos a `dpo@cmorflow.cl` indicando en el asunto "Brecha — Ref. `{breach_register.id}`". Atenderemos tu consulta dentro de los plazos legales.

Lamentamos lo ocurrido y trabajamos para que no vuelva a pasar.

Atentamente,

**`{Nombre del DPO}`**
Data Protection Officer — Cmor Flow
`dpo@cmorflow.cl`

## Checklist de envío

- [ ] Saludo personalizado.
- [ ] Datos afectados correctos por titular (no listas genéricas).
- [ ] Enlace de cambio de contraseña válido.
- [ ] `breach_register.subjects_notified_at=now()`.
- [ ] Registro del envío (logs del email provider).

## Referencias normativas

- Ley N° 21.719 (notificación a titulares afectados, dentro de 72 horas si hay riesgo alto).
- Ley N° 19.628, art. 19 (derechos del titular).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.2.

> **Disclaimer legal:** esta plantilla es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
