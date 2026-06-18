# Handoff — Plan de Privacidad (Ley 19.628 + Ley 21.719)

> **Sesión interrumpida el 2026-06-18.** Retomar desde aquí.
> Proyecto: `C:/Users/angel/Desktop/Code/SaaS suchi`
> Skill activa: `brainstorming` (etapa "presentación de diseño por secciones").

---

## ✅ Decisiones ya aprobadas

1. **Stack destino:** Adaptar al stack actual (Vite + React 19 + Supabase + Edge Functions).
   N8N solo se menciona como opcional. No asumir Next.js.

2. **Profundidad:** Entregable completo (los 12 requisitos del prompt).

3. **Documentos legales:** Borradores técnicos accionables **con disclaimer** de
   revisión por abogado chileno antes de publicación oficial.

4. **Aplicación SQL:** Generar archivos `.sql` numerados en `database/`.
   El usuario los aplicará vía MCP desde **Antigravity** (otra vía), NO desde
   esta sesión.

5. **Responsable del tratamiento:** Responsabilidad compartida.
   - Cmor Flow = responsable de owners/staff/admins (B2B).
   - Restaurantes = responsables de sus clientes finales.
   - Cmor Flow = encargado de los datos de clientes finales que procesa.

6. **Enfoque:** A — por capas de madurez (4 capas en orden de dependencia).

---

## ✅ Secciones de diseño APROBADAS

### Sección 1 — Arquitectura y mapa de datos (APROBADA)

- **Actores:** 1) Cmor Flow responsable B2B; 2) Restaurante responsable
  clientes finales; 3) Cmor Flow encargado; 4) Vercel/Supabase/etc. encargados
  subcontratados (USA → SCC).
- **Mapa de datos documentado** (browser → Vercel edge → Supabase → Edge
  Functions → terceros).
- **Inventario por categoría** con retención propuesta:
  - Identidad/contacto B2B: vida del contrato + 90 días.
  - Clientes finales: 24 meses desde último pedido.
  - Transaccional (orders): **6 años** (obligación legal SII).
  - Tokens invitación: 7 días.
  - IA chatbot: **no persistente** (stateless), no se entrena.
- **Hard defaults:** no entrenar IA con datos personales; admin_users SHA-256
  se depreca; transferencias USA se documentan con SCC; todo en español de Chile.

### Sección 2 — Capa Fundacional (APROBADA el 2026-06-18)

Archivos SQL a generar en `database/`:

```
03_privacy_consents.sql       ← tabla consents (granular, con proof/legal_basis)
04_audit_log.sql              ← audit_log append-only (sin UPDATE/DELETE)
05_rls_hardening.sql          ← arregla WITH CHECK (true) en orders/reg_requests
06_password_deprecation.sql   ← admin_users SHA-256 marcado deprecated
07_data_subject_requests.sql  ← cola de DSAR (acceso/rectif./olvido/etc.)
08_retention.sql              ← funciones de retención + cleanup
migrations_rollback.sql       ← reversión idempotente de todo lo anterior
```

Tablas nuevas (esquema resumido):

- `consents(id, subject_id, subject_email, scope, purpose, legal_basis,
   granted, granted_at, revoked_at, proof jsonb, privacy_policy_version)`.
- `audit_log(bigserial PK, actor_id, actor_email, action, table_name, row_id,
   metadata jsonb, ip inet, user_agent, created_at)`. Append-only vía REVOKE.

Parches RLS críticos:
- `orders` INSERT: validar restaurant_id activo + rate limit por IP.
- `registration_requests`: honeypot + límite por IP/día vía RPC.
- `notifications`: política por `user_id = auth.uid()`.
- Storage bucket privado con URLs firmadas 1h.

UI consentimiento granular:
- Componente `src/components/privacy/ConsentManager.tsx`.
- Estado JSON con scopes `necessary`(no revocable), `analytics`, `marketing`,
  `ai_profiling` (todos revocables).
- Banner inicial: "Aceptar todo" / "Solo necesarias" / "Personalizar".
- Revocación: `/account/privacy` para auth, enlace email para no auth.

MFA + RBAC:
- MFA TOTP obligatorio para `admin` y `owner` (bloquear login si no activado).
- Revisar grants `anon` vs `authenticated`; restringir `admin_login`/
  `restaurant_login` o migrar a Supabase Auth.

Cifrado:
- TLS 1.2+ ✅ ya. AES-256 reposo DB/Storage ✅ ya. Cifrado columna NO obligatorio
  hoy (documentar).

**Pregunta abierta (pendiente de respuesta del usuario) al cerrar sesión:**
- (a) Confirmar retenciones por defecto.
- (b) Confirmar MFA obligatorio para **owner** además de admin.
- (c) ¿Eliminar físicamente `admin_users` o solo deprecarse?

---

## 🔴 Secciones PENDIENTES de diseñar (resumir mañana al usuario)

### Sección 3 — Capa de Transparencia y Derechos
- Política de privacidad (2 versiones: B2B owners/staff + clientes finales).
- Aviso de privacidad corto (in-app).
- API de derechos del titular como Edge Functions Supabase:
  `privacy/access`, `privacy/rectify`, `privacy/erase`, `privacy/object`,
  `privacy/export` (portabilidad), `privacy/revoke-consent`.
- SLA: máx 30 días. Cancelación en backups (marca `deleted_at` + purge
  programado).
- Canal de contacto DPO: email + formulario.

### Sección 4 — Capa Operacional
- Plan de retención y eliminación (cronograma + scripts SQL + N8N opcional).
- Proceso de brechas: detección, registro, notificación 72h, plantillas
  interna/externa.
- Plantilla de AIPD (evaluación de impacto) para tratamientos de alto riesgo.
- RBAC documental + revisión de secretos en Vercel/Supabase vars.

### Sección 5 — Capa de Gobernanza
- RAT (Registro de Actividades de Tratamiento).
- DPA Cmor Flow ↔ Restaurante (encargado).
- DPA con proveedores: cláusulas Vercel/Supabase/email provider (notificación
  brechas 72h, SCC).
- Transferencias internacionales: SCC + evaluación de transferencia.
- Checklist trimestral de cumplimiento.

---

## 📋 Próximos pasos mañana

1. Retomar respuesta a las 3 preguntas abiertas de Sección 2.
2. Presentar Sección 3 (Transparencia y Derechos) y pedir aprobación.
3. Presentar Sección 4 (Operacional) y pedir aprobación.
4. Presentar Sección 5 (Gobernanza) y pedir aprobación.
5. Escribir spec completo en
   `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md`.
6. Self-review + revisión del usuario.
7. Invocar skill `writing-plans` para plan de implementación detallado.

---

## 🛠 Cómo retomar

Decirle a ZCode algo como:
> "Continúa el plan de privacidad Ley 21.719 para SaaS suchi.
> Lee `docs/superpowers/handoff/2026-06-18-privacidad-handoff.md` y retoma
> desde donde quedó."

---

## ⚠️ Notas técnicas para retomar

- Skill activa: **brainstorming**. NO invocar skills de implementación hasta
  tener el spec aprobado y commiteado.
- Las skills se reinician entre sesiones: invocar `brainstorming` al retomar.
- El shell resetea `cwd` entre comandos → usar `git -C "ruta"` o rutas absolutas.
- Para aplicar SQL, el usuario usará **Antigravity con MCP de Supabase**, no
  esta sesión. Generar SQL como archivos numerados listos.
