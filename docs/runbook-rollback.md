# Runbook de Rollback — CMOR FLOW

> Documento de referencia para revertir cambios en producción.
> Cada P0/P1 debe tener un rollback documentado y probado en staging.

## 🚨 Cómo usar este runbook

1. **No esperes a leer esto durante un incidente.** Familiarízate con él antes.
2. **Cada rollback tiene un timeout.** Si pasa el timeout, escalar a on-call senior.
3. **Después de cualquier rollback:** comunicar al equipo en Slack #incidentes y abrir postmortem.

## 📋 Rollbacks por fix

### P0-1 — RLS pública de orders eliminada

**Síntoma:** clientes no pueden ver su pedido tras crearlo.

**Rollback (< 5 min):**
```sql
-- Conectarse a Supabase SQL Editor y ejecutar:
CREATE POLICY "Public can view orders" ON public.orders
  FOR SELECT TO anon USING (true);
NOTIFY pgrst, 'reload schema';
```

**Frontend:** el flag `use_order_token` ya no se usa. El frontend volverá al comportamiento anterior automáticamente si no se rebuild.

---

### P0-2 — auto_approve_registration_v2 con is_admin()

**Síntoma:** nuevos restaurantes no se pueden registrar.

**Rollback (< 10 min):**
```bash
# 1. Revertir RegisterPage.tsx a versión anterior
git revert <commit-hash-del-cambio> -- src/pages/public/RegisterPage.tsx

# 2. Redeploy frontend
vercel --prod
```

```sql
-- 3. En Supabase SQL Editor, restaurar función v5 (sin is_admin check)
-- (pegar contenido de database/setup_v5_trial_30_days.sql:119-177)
```

---

### P0-3 — DSAR con verificación de identidad

**Síntoma:** titulares reportan que no reciben email de verificación.

**Rollback (< 5 min):**
```sql
-- Desactivar flag — las Edge Functions vuelven al flujo viejo (sin verificación)
UPDATE feature_flags SET enabled_globally = false WHERE key = 'dsar_verification';
```

**Nota:** el flujo viejo es vulnerable (cualquiera puede borrar datos ajenos), pero funcional. Reactivar ASAP tras investigar el problema de emails.

---

### P0-4 — admin_login / restaurant_login revocados

**Síntoma:** usuarios legacy no pueden loguearse.

**Rollback (< 5 min):**
```sql
-- Re-activar login legacy
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_login(text, text) TO anon, authenticated;
UPDATE public.admin_users SET deprecated_at = NULL;
NOTIFY pgrst, 'reload schema';
```

---

### P0-5 — Headers HTTP + CORS restringido

**Síntoma:** recursos externos no cargan (fuentes, imágenes).

**Rollback (< 5 min):**
```bash
# Revertir vercel.json a versión sin headers
git checkout HEAD~1 -- vercel.json
vercel --prod
```

**Edge Functions:** redeployar con CORS `*` si es urgente:
```bash
# Las funciones vuelven a usar corsHeaders con "*"
# Buscar y revertir en cada index.ts: getCorsHeaders(req) → "*"
supabase functions deploy privacy-erase
# (repetir para las otras 6)
```

---

### P0-6 — Plazo DSAR corregido

**Síntoma:** ninguno (es solo cambio de texto legal).

**Rollback:** revertir los 5 archivos en `docs/legal/` y `docs/contratos/DPA_cmor_restaurante.md`.

---

### P0-7 — SQL inválido CREATE POLICY IF EXISTS

**Síntoma:** ninguno (la línea ya fallaba).

**Rollback:** no necesario.

---

### P0-8 — Imágenes base64 → Storage

**Síntoma:** imágenes de menú no se ven.

**Rollback (< 5 min):**
```sql
UPDATE feature_flags SET enabled_globally = false WHERE key = 'storage_only_images';
```

El frontend automáticamente vuelve a usar base64 si el flag está desactivado.

**Si las imágenes ya están en Storage y no en DB:**
```bash
# Script para descargar de Storage y re-guardar como base64 en DB
# (aún no implementado — crear si es necesario)
```

---

## 🔧 Rollback de migraciones SQL

Cada migración tiene un bloque de rollback al final (comentado). Para revertir:

1. Abrir Supabase Dashboard → SQL Editor
2. Pegar el código de rollback (descomentado)
3. Ejecutar
4. Verificar con: `SELECT * FROM feature_flags;` o consulta equivalente

## 📞 Escalado

| Severidad | Quién | Tiempo respuesta |
|---|---|---|
| P0 (producción caída) | on-call + tech lead | 5 min |
| P1 (funcionalidad rota) | on-call | 30 min |
| P2 (degradado) | on-call | 2 horas |
| P3 (cosmético) | próximo sprint | — |

## 📝 Plantilla de postmortem

```markdown
# Postmortem — [Breve descripción del incidente]

**Fecha:** YYYY-MM-DD HH:MM
**Severidad:** P0/P1/P2
**Duración:** Xh Ym
**Impacto:** [qué falló, cuántos usuarios afectados]

## Timeline
- HH:MM — Detección (cómo se detectó: alerta, reporte usuario, etc.)
- HH:MM — Confirmación de incidente
- HH:MM — Rollback ejecutado
- HH:MM — Confirmación de recuperación

## Causa raíz
[Explicación técnica detallada]

## Lo que funcionó bien
- [Quédetectamos rápido, rollback funcionó, etc.]

## Lo que falló
- [Qué no funcionó como esperábamos]

## Acciones preventivas
- [ ] [Action item 1] — Owner: X — Fecha: Y
- [ ] [Action item 2] — Owner: X — Fecha: Y

## Lecciones aprendidas
[Reflexión para evitar incidentes similares]
```
