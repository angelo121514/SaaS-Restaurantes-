# HANDOFF — Finalizar Capa 4 del Plan de Privacidad (Ley 19.628 / Ley 21.719)

> **Para la IA que retoma esto:** este documento es autocontenido. Léelo completo
> antes de empezar. Tienes TODO lo que necesitas aquí y en el plan referenciado.
> No necesitas explorar el código base — solo crear archivos markdown copiando
> el contenido literal del plan.

---

## 🎯 Tu tarea (una sola cosa)

**Crear 7 archivos markdown** copiando su contenido literal del plan
`docs/superpowers/plans/2026-06-18-capa4-gobernanza.md`, commitearlos uno por
uno, y al final hacer merge de la rama `feature/capa4-gobernanza` a `main`.

Eso es TODO. No hay código que escribir. No hay SQL. No hay deploy. Solo
documentación legal redactada que ya está escrita en el plan.

**Tiempo estimado:** 20-30 minutos.

---

## 📂 Contexto del proyecto

- **Proyecto:** `C:/Users/angel/Desktop/Code/SaaS suchi` (Cmor Flow — SaaS POS para restaurantes)
- **Stack:** Vite + React 19 + Supabase + react-router-dom v7
- **Rama actual:** `feature/capa4-gobernanza` (ya creada, ya estás en ella)
- **Shell:** Windows, `cmd.exe`. Usa `git -C "C:/Users/angel/Desktop/Code/SaaS suchi" ...`
  para comandos git (el cwd se resetea entre llamadas).

---

## 🏛️ Avance total del plan (las 4 capas)

| Capa | Estado | Detalle |
|---|---|---|
| **Capa 1 — Fundacional (SQL)** | ✅ APLICADA EN PRODUCCIÓN | Archivo consolidado `database/00_APLICAR_TODO_SUPABASE.sql` aplicado vía MCP desde Antigravity. Verificado: 4 tablas, 4 funciones, cron job activo, buckets privados, admin_users sin grants, sweep OK. |
| **Capa 2 — Transparencia + Derechos** | ✅ EN MAIN + DEPLOYADA | 6 Edge Functions DSAR deployadas + verificadas. 5 componentes UI, 5 páginas, router + navItems. Build OK. Merge `ab62472`. |
| **Capa 3 — Operacional** | ✅ EN MAIN | 11 documentos (reglas_ia, plantilla AIPD + 4 AIPD, playbook, 3 plantillas notificación, rotación secretos) + `scripts/security-check.ts` + `securityService.ts` + `/admin/security`. Build OK. Merge `c064bd0`. |
| **Capa 4 — Gobernanza** | 🔄 EN PROGRESO (esta rama) | 5 de 12 archivos ya creados y commiteados. **Faltan 7 archivos + merge.** Eso es lo que vas a hacer. |

### Lo que YA está hecho en Capa 4 (no lo recrees)

Estos 5 archivos ya existen y están commiteados en `feature/capa4-gobernanza`:

1. ✅ `docs/legal/VERSION.md` — changelog de versiones, v2026-06-01
2. ✅ `docs/legal/contacto_dpo.md` — canal DPO + SLA
3. ✅ `docs/legal/politica_privacidad_b2b.md` — política B2B (10 bloques)
4. ✅ `docs/legal/aviso_privacidad_b2b.md` — aviso resumen 1 página
5. ✅ `docs/legal/politica_privacidad_clientes.md` — política clientes finales

---

## 📋 Tu plan de trabajo: 7 archivos + 1 merge

### Convención para TODOS los archivos

- Cada archivo empieza con el disclaimer:
  `> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.`
- **El contenido EXACTO de cada archivo** está en el plan
  `docs/superpowers/plans/2026-06-18-capa4-gobernanza.md` en la sección de la tarea correspondiente.
- NO inventes contenido. NO agregues secciones. NO cambies redacción.
  **Copia literal** del plan.
- Cada archivo se crea con la herramienta `Write` (ruta absoluta).
- Después de crear cada archivo, haz commit con el mensaje exacto indicado.

---

### TAREA 1 de 7 — `docs/legal/terminos_y_condiciones.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal/terminos_y_condiciones.md`

**Contenido:** Lee el plan `docs/superpowers/plans/2026-06-18-capa4-gobernanza.md`,
busca la sección **"Task 6: Términos y Condiciones + DPA cliente"**.
El contenido está dentro del bloque de código markdown (entre los ````).
Copia TODO ese contenido (Parte I con 10 cláusulas + Anexo A con 13 cláusulas A.1-A.13).

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/legal/terminos_y_condiciones.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(legal): terminos y condiciones + DPA cliente v2026-06-01"
```

---

### TAREA 2 de 7 — `docs/contratos/DPA_cmor_restaurante.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos/DPA_cmor_restaurante.md`

**Contenido:** Lee el plan, sección **"Task 7: DPA Cmor Flow ↔ Restaurante"**.
Son 13 cláusulas numeradas (Cláusula 1 a Cláusula 13). Copia TODO el contenido.

**Verificación:** debe contener "Cláusula 9" con mención a "72 horas" (notificación de brechas).

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/contratos/DPA_cmor_restaurante.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(contratos): DPA Cmor Flow restaurante 13 clausulas v2026-06-01"
```

---

### TAREA 3 de 7 — `docs/contratos/DPA_proveedores.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos/DPA_proveedores.md`

**Contenido:** Lee el plan, sección **"Task 8: DPA con Proveedores"**.
Incluye tabla de 4 proveedores (Vercel, Supabase, email/Resend, IA futuro) + 10 cláusulas estándar.

**Verificación:** debe mencionar "Zero Data Retention (ZDR)" para el proveedor IA.

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/contratos/DPA_proveedores.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(contratos): DPA proveedores y subencargados v2026-06-01"
```

---

### TAREA 4 de 7 — `docs/privacidad/transferencias_internacionales.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/transferencias_internacionales.md`

**Contenido:** Lee el plan, sección **"Task 9: Transferencias Internacionales"**.
Evaluación USA (riesgo medio, SCC, cifrado, procede condicionado) + reevaluación trimestral.

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/transferencias_internacionales.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): evaluacion de transferencias internacionales v2026-06-01"
```

---

### TAREA 5 de 7 — `docs/privacidad/RAT.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/RAT.md`

**Contenido:** Lee el plan, sección **"Task 10: Registro de Actividades de Tratamiento (RAT)"**.
Son 10 tratamientos (RAT-001 a RAT-010) cada uno con tabla de 11 campos.

**Verificación:** deben aparecer los IDs RAT-001 hasta RAT-010.

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/RAT.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): RAT 10 tratamientos RAT-001 a RAT-010 v2026-06-01"
```

---

### TAREA 6 de 7 — `docs/privacidad/checklist_trimestral.md`

**Crear archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad/checklist_trimestral.md`

**Contenido:** Lee el plan, sección **"Task 11: Checklist Trimestral"**.
Son 11 ítems + tabla de registro de revisiones.

**Verificación:** deben aparecer 11 ítems numerados.

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add docs/privacidad/checklist_trimestral.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(privacidad): checklist trimestral 11 items v2026-06-01"
```

---

### TAREA 7 de 7 — Extender `README.md` raíz con sección de privacidad

**Modificar archivo:** `C:/Users/angel/Desktop/Code/SaaS suchi/README.md`

**⚠️ IMPORTANTE:** este archivo YA EXISTE (169+ líneas). **NO lo sobrescribas.**
Debes EXTENDERLO insertando una nueva sección ANTES del heading final de Licencia
(típicamente `## Licencia` o `## 📜 Licencia`).

**Cómo hacerlo:**
1. Lee el README actual completo.
2. Localiza el heading de Licencia (busca "Licencia" en el texto).
3. Inserta ANTES de ese heading el bloque de markdown que está en el plan,
   sección **"Task 12: README raíz — extender con sección de privacidad"**,
   dentro del bloque de código markdown. Empieza con `---\n\n## 🔐 Plan de Cumplimiento...`.
4. Conserva TODO el contenido previo y posterior del README original.

**Si no estás seguro de dónde insertar:** inserta al final del archivo, antes
de cualquier sección de Licencia/Acknowledgments. Mejor al final que perder contenido.

**Commit:**
```
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add README.md
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "docs(readme): anade seccion de plan de cumplimiento de privacidad (capas 1-4)"
```

---

### TAREA FINAL — Merge a main

Después de los 7 commits anteriores:

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" checkout main
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" merge --no-ff feature/capa4-gobernanza -m "Merge feature/capa4-gobernanza: Capa 4 Gobernanza

Implementacion completa de la Capa 4 del plan de privacidad Ley 21.719:
- Documentos legales (docs/legal/): VERSION, contacto_dpo, politica B2B,
  aviso B2B, politica clientes, terminos + DPA cliente
- Contratos (docs/contratos/): DPA Cmor Flow restaurante (13 clausulas),
  DPA proveedores (Vercel, Supabase, email, IA)
- Documentacion operativa (docs/privacidad/): transferencias internacionales,
  RAT (10 tratamientos), checklist trimestral (11 items)
- README raiz extendido con seccion de plan de cumplimiento

Con esto completan las 4 capas del plan de privacidad Ley 19.628 / Ley 21.719."
```

---

## ✅ Cómo saber que terminaste bien

Después del merge, verifica:

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" log --oneline -10
```

Debes ver el merge commit y los commits de las tareas.

Lista de archivos que deben existir:

```
docs/legal/VERSION.md                        ✅ (ya existe)
docs/legal/contacto_dpo.md                   ✅ (ya existe)
docs/legal/politica_privacidad_b2b.md        ✅ (ya existe)
docs/legal/aviso_privacidad_b2b.md           ✅ (ya existe)
docs/legal/politica_privacidad_clientes.md   ✅ (ya existe)
docs/legal/terminos_y_condiciones.md         ← TAREA 1 (creas tú)
docs/contratos/DPA_cmor_restaurante.md       ← TAREA 2 (creas tú)
docs/contratos/DPA_proveedores.md            ← TAREA 3 (creas tú)
docs/privacidad/transferencias_internacionales.md ← TAREA 4 (creas tú)
docs/privacidad/RAT.md                       ← TAREA 5 (creas tú)
docs/privacidad/checklist_trimestral.md      ← TAREA 6 (creas tú)
README.md                                    ← TAREA 7 (extiendes tú)
```

Verifica que NO hay placeholders prohibidos:

```bash
grep -rnE "TBD|TODO|\[completar\]|describir aquí|XXX" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/legal" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/contratos" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/docs/privacidad" \
  "C:/Users/angel/Desktop/Code/SaaS suchi/README.md"
# Esperado: sin resultados (los {...} en plantillas SÍ están permitidos)
```

---

## 🔑 Datos del proyecto (para que los documentos sean consistentes)

- **Responsable B2B:** Cmor Flow
- **DPO email:** `dpo@cmorflow.cl` (placeholder editable)
- **Supabase URL:** `https://clsgoknzyhkxtogxoshz.supabase.co`
- **Hosting:** Vercel (USA)
- **DB:** Supabase (USA/AWS)
- **Versión vigente políticas:** `2026-06-01`
- **Autoridad competente:** "la autoridad competente" (genérico — la autoridad final bajo Ley 21.719 se está definiendo)
- **Marco normativo:** Ley N° 19.628 + Ley N° 21.719 (vigencia nacional 1 de diciembre de 2026)

---

## 📐 Las 4 capas del plan (resumen para contexto)

El plan completo de privacidad tiene 4 capas. Las primeras 3 YA ESTÁN HECHAS:

### Capa 1 — Fundacional (SQL) ✅
8 migraciones SQL en `database/00_APLICAR_TODO_SUPABASE.sql`:
consents, audit_log, RLS hardening, admin_users deprecation, data_subject_requests,
run_retention_sweep, breach_register, pg_cron schedule + 3 RPC auxiliares.

### Capa 2 — Transparencia + Derechos ✅
6 Edge Functions DSAR (access, rectify, erase, object, export, revoke-consent) +
servicio privacyService + 5 componentes UI + 5 páginas + integración router/navItems.

### Capa 3 — Operacional ✅
reglas_ia + plantilla AIPD + 4 AIPD + playbook incidentes + 3 plantillas notificación +
rotación secretos + scripts/security-check.ts + securityService.ts + página /admin/security.

### Capa 4 — Gobernanza 🔄 (lo que vas a terminar)
Documentos legales formales (políticas, DPAs) + RAT + transferencias + checklist + README.

---

## 🚨 Errores comunes a evitar

1. **NO sobrescribas `README.md`.** Es un Modify, no un Create. Lee primero, inserta, conserva.
2. **NO inventes contenido legal.** Todo está literal en el plan. Solo copia.
3. **NO saltes el disclaimer** `> DOCUMENTO BORRADOR...` al inicio de cada documento legal.
4. **NO mezcles commits.** Un commit por archivo, con el mensaje exacto indicado.
5. **NO deployes nada.** Capa 4 es 100% documental. No hay Edge Functions ni SQL.
6. **NO olvides el merge final.** Sin merge, el trabajo queda en la rama sin integrar.
7. **Cuidado con las comillas tipográficas.** Si copias del plan, asegúrate de que los
   acentos y eñes se preserven (UTF-8).

---

## 📞 Cómo retomar

Dile a la IA que retoma:

> "Lee `docs/superpowers/handoff/2026-06-19-handoff-capa4-final.md` y ejecuta
> las 7 tareas + merge final que se describen ahí. El contenido de cada archivo
> está literal en `docs/superpowers/plans/2026-06-18-capa4-gobernanza.md`."

Eso es todo. La IA lee este handoff, va al plan, copia el contenido, commitea, mergea.

---

## 🎉 Al terminar

El plan de privacidad Ley 19.628 / Ley 21.719 para SaaS suchi queda **100% completo**:
- 4 capas implementadas
- Las 12 decisiones del spec aplicadas
- Los 12 requisitos normativos cubiertos
- Todo en `main`, commiteado, versionado

Después del merge, el usuario debería:
1. Hacer `git push` a GitHub.
2. Revisar los documentos legales con un abogado chileno (disclaimer presente).
3. Aceptar los DPAs oficiales de Vercel y Supabase en sus dashboards.
4. Activar MFA para roles admin y owner en Supabase Auth.
5. Configurar las secrets en Vercel/Supabase para el deploy del frontend.
