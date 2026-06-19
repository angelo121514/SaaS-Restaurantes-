# Política de Rotación de Secretos

- **Versión:** 1.0.0
- **Fecha:** 2026-06-18
- **Espec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.5.
- **Responsable:** Responsable de seguridad.
- **Frecuencia base:** rotación **trimestral** de los secretos enumerados abajo. Rotación **inmediata** ante sospecha de compromiso (ver `docs/seguridad/playbook_respuesta_incidentes.md` Fase 3).

## Secretos en alcance

| Secreto | Dónde vive | Caducidad | Rotación |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API keys; usada en Edge Functions y scripts (`scripts/security-check.ts`) | n/a | Trimestral + tras incidente |
| `SUPABASE_URL` | No es secreto per se, pero se rota junto al proyecto si se reemplaza | — | Solo si migración de proyecto |
| `SUPABASE_ANON_KEY` | Frontend (no es crítica) | n/a | Trimestral por buena práctica |
| API key del email provider (Resend por defecto) | Dashboard del proveedor; en Supabase Edge Functions Secrets | n/a | Trimestral + tras incidente |
| API key del proveedor IA (futuro) | Solo si AIPD-03 se activa | n/a | Trimestral + tras incidente |
| Secrets de Vercel | Vercel Project Settings | n/a | Trimestral |
| JWT secret de Supabase | Supabase (gestionado por el servicio) | n/a | No rotar salvo indicación de Supabase |
| Tokens de integraciones de terceros | Variables de entorno | n/a | Trimestral |

## Procedimiento de rotación trimestral

1. **Agendar:** la rotación entra en el checklist trimestral (`docs/privacidad/checklist_trimestral.md`).
2. **Generar nuevo secreto** en el dashboard del proveedor (Supabase / Resend / Vercel).
3. **Actualizar** las variables de entorno:
   - Vercel (Project Settings → Environment Variables) — para el frontend y Edge Functions.
   - Supabase → Edge Functions → Secrets — para las EF (`invite-owner`, futuras `privacy/*`).
   - Archivo `.env` local solo para desarrollo; **nunca** commitear `.env` (verificado por `scripts/security-check.ts`).
4. **Redeploy** Edge Functions (`supabase functions deploy <name>`) y Vercel (auto-deploy o manual).
5. **Revocar** el secreto anterior desde el dashboard del proveedor una vez confirmado que todo funciona.
6. **Verificar** ejecutando `npm run security-check` y un smoke test (login admin, envío de invitación).
7. **Registrar** la rotación en `audit_log` con `action='secret_rotated'` (si hay canal para insertar) o en un log de cambios interno.

## Procedimiento de rotación por incidente

1. Activar Fase 3 del playbook de respuesta.
2. Rotar `SUPABASE_SERVICE_ROLE_KEY` y API keys afectadas de forma **inmediata**, sin esperar al trimestre.
3. Forzar logout de sesiones activas (Supabase Auth).
4. Verificar con `security-check.ts` y monitorear `audit_log` durante 72h.

## Reglas adicionales

- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en el bundle del frontend. Todo uso server-side (Edge Functions o scripts Node).
- `.env` debe estar en `.gitignore` (verificado por `security-check.ts`).
- Compartir secretos solo por canal seguro (gestor de contraseñas), nunca por chat plano ni email.
- Backups cifrados (AES-256) con sus propias claves rotadas anualmente.

## Referencias normativas

- Ley N° 19.628, art. 23 (seguridad).
- Ley N° 21.719, art. 24 (seguridad del tratamiento).
- Spec: `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §4.5.

## Control de cambios

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-06-18 | 1.0.0 | Política inicial (rotación trimestral + por incidente). |

> **Disclaimer legal:** esta política es un borrador técnico. Requiere revisión de un abogado chileno antes de su publicación oficial.
