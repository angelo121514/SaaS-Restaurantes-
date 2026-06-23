# Fase 0 — Setup Pre-Vuelo ✅

> Setup de seguridad y calidad necesario antes de aplicar Fase 1 (P0 hotfixes) a producción.
> **Tiempo estimado:** 1 semana con 1 dev senior + 1 devops.
> **Bloqueante para Fase 1.**

## 📦 Lo que incluye

### 1. Tests automatizados (30 tests)

| Categoría | Cantidad | Stack | Carpeta |
|---|---|---|---|
| Unitarios | 10 | Vitest + Testing Library | `src/tests/unit/` |
| Integración | 10 | Vitest + Supabase local | `src/tests/integration/` |
| E2E | 5 | Playwright | `src/tests/e2e/` |
| Seguridad | 5 | Vitest | `src/tests/security/` |

**Ejecutar:**
```bash
npm test                    # todos los unitarios
npm run test:security       # tests de seguridad (requiere Supabase local)
npm run test:e2e            # tests E2E (requiere app corriendo)
npm run test:coverage       # con cobertura
```

### 2. CI/CD con GitHub Actions

Archivo: `.github/workflows/ci.yml`

Ejecuta en cada PR y push a main:
- ✅ Lint (ESLint)
- ✅ Type-check (tsc --noEmit)
- ✅ Build (vite build)
- ✅ Tests unitarios (Vitest)
- ✅ Tests de seguridad
- ✅ npm audit (alta+crítica)
- ✅ Secret scanning (busca API keys en código)
- ✅ Verifica que `.env` no está commiteado
- ⏸️ Tests E2E (deshabilitado hasta tener staging URL)

**Jobs paralelos:** build, test-unit, security-audit. Job final `all-passed` gatea el merge.

### 3. Supabase CLI configurado

Archivo: `supabase/config.toml`

Para usar:
```bash
# Inicializar proyecto local
supabase init

# Empezar Supabase local (DB + Auth + Storage + Realtime + Edge Functions runtime)
supabase start

# Aplicar migraciones locales
supabase db reset

# Linkear proyecto prod
supabase link --project-ref clsgoknzyhkxtogxoshz

# Aplicar migraciones a prod
supabase db push

# Deployar Edge Function
supabase functions deploy privacy-erase
```

### 4. Sentry (monitoreo de errores)

Archivos:
- `src/instrumentation.ts` — inicialización con redacción de PII
- `src/utils/logger.ts` — logger estructurado que envía a Sentry en prod

**Configuración:**
1. Crear cuenta en https://sentry.io (free tier: 5k errores/mes)
2. Crear proyecto "cmor-flow" → React
3. Copiar DSN a `.env`:
   ```
   VITE_SENTRY_DSN=https://xxxxx@o12345.ingest.sentry.io/12345
   VITE_APP_VERSION=1.0.0
   ```
4. Listo. Sentry captura errores automáticamente.

**Características:**
- Redacta automáticamente: Authorization headers, cookies, tokens en query params, emails en breadcrumbs
- 10% sample rate para performance monitoring
- 5% sample rate para session replays (1% en errores)
- Ignora errores conocidos (ResizeObserver, AbortError, etc.)

### 5. Scripts de backup

Archivos:
- `scripts/backup-db.sh` — backup completo de Supabase DB
- `scripts/restore-db.sh` — restaura desde backup (con doble confirmación)

**Uso:**
```bash
# Backup (requiere pg_dump instalado)
export SUPABASE_DB_PASSWORD="tu_password"
npm run backup-db

# Restore (PELIGRO: sobrescribe DB)
./scripts/restore-db.sh ./backups/cmor_backup_20260622_120000.dump
```

**Características:**
- Backup en formato custom (comprimido, comprime ~9x)
- Backup separado de `auth.users` (para restore parcial)
- Verificación automática de integridad (`pg_restore --list`)
- Limpieza de backups > 7 días
- Upload opcional a S3 (configurar `BACKUP_S3_BUCKET`)

### 6. Environment separation

3 proyectos Supabase recomendados:
- **Dev:** `cmor-flow-dev` (Free) — desarrollo local, tests CI
- **Staging:** `cmor-flow-staging` (Free) — smoke tests pre-prod
- **Prod:** `cmor-flow-prod` (Pro $25/mes) — producción

Crear los 3 en https://supabase.com/dashboard y linkearlos:
```bash
supabase link --project-ref <dev-ref>
# Para switch entre proyectos, usar:
# supabase link --project-ref <prod-ref>
```

## ✅ Checklist de salida

Antes de declarar Fase 0 completa, todos estos items deben estar ✓:

- [ ] 30 tests implementados y pasando en CI
  - [ ] 10 unit tests (`npm test`)
  - [ ] 10 integration tests (requieren `supabase start`)
  - [ ] 5 E2E tests (requieren app corriendo)
  - [ ] 5 security tests (requieren Supabase local)
- [ ] GitHub Actions CI configurado y verde en main
- [ ] Supabase CLI instalado y linkeado a dev/staging/prod
- [ ] Backup completo de DB prod ejecutado y subido a almacenamiento durable
- [ ] Tabla `feature_flags` creada en prod y función `is_flag_enabled` operativa
- [ ] Sentry inicializado en frontend, release tracking activo, PII redaction configurada
- [ ] Tres proyectos Supabase (dev, staging, prod) creados
- [ ] Documento de runbook de rollback creado (`docs/runbook-rollback.md`)
- [ ] Equipo entrenado en workflow: PR → CI verde → staging → smoke test → prod con flag

## 🚀 Próximos pasos

Una vez completada Fase 0:

1. **Fase 1 — Aplicar P0 hotfixes** (ver `CHANGELOG-P0.md`)
   - Aplicar 6 migraciones SQL en orden
   - Deployar 8 Edge Functions
   - Deployar frontend con feature flags desactivados
   - Activar flags al 10% → 50% → 100%

2. **Migraciones de datos paralelas:**
   - M-1: passwords SHA-256 → Supabase Auth (4-6 semanas)
   - M-2: imágenes base64 → Storage
   - M-6: admin_users legacy → profiles

3. **Pentest externo** para validar que los fixes P0 efectivamente cierran las vulnerabilidades.

## 📞 Soporte

Si algo de Fase 0 falla:
- Revisar logs: `npm run dev` y consola del navegador
- Verificar `.env` configurado correctamente (ver `.env.example`)
- Para tests: `npx vitest --reporter=verbose`
- Para CI: revisar Actions tab en GitHub
