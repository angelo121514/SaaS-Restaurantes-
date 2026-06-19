# CMOR FLOW — Plataforma SaaS de Pedidos para Restaurantes

Multi-tenant restaurant ordering platform: QR ordering, tiempo real, panel de
administración, POS, CRM y analítica.

> Stack: React 19 + TypeScript + Vite + Supabase + Tailwind.

---

## 📋 Estado del proyecto

| Módulo | Estado |
|---|---|
| Autenticación | ✅ Supabase Auth real (`signInWithPassword`, Google OAuth, invitaciones por email) |
| Sesión | ✅ JWT (hook `useAuth`), ya no localStorage plano |
| Rutas | ✅ Guards por rol (`RequireRole`), code-splitting |
| Modo demo | ✅ `MockSupabaseClient` funcional cuando no hay `.env` |
| Bundle | ✅ Optimizado (code-splitting + manualChunks, ~255 KB inicial) |

Detalles de la auditoría y migración en `database/MIGRATION_AUTH.md`.

---

## 🚀 Despliegue rápido en Vercel (recomendado)

El frontend se despliega en **Vercel**; el backend vive en **Supabase**.

### 1. Sube el repo a GitHub

Ya hecho: https://github.com/angelo121514/SaaS-Restaurantes-

### 2. Conecta Vercel

1. Ve a https://vercel.com/new
2. **Import Git Repository** → selecciona `SaaS-Restaurantes-`
3. Framework Preset: **Vite** (se detecta solo)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. **Environment Variables** (clave para salir del modo mock):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://clsgoknzyhkxtogxoshz.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | (tu anon key pública de Supabase) |

7. **Deploy** → en ~1 min tienes `https://<tu-proyecto>.vercel.app`

> Si NO pones las variables de entorno, la app arranca en **modo demo**
> (MockSupabaseClient, datos en localStorage). Útil para previsualizar sin
> backend, pero sin persistencia real.

### 3. (Requisito para Auth real) Aplica el SQL en Supabase

Sigue `database/MIGRATION_AUTH.md`:

1. Supabase → **SQL Editor** → pega y ejecuta `database/setup.sql`
2. Luego ejecuta `database/setup_v2_auth.sql`
3. Siembra el admin (sección 2 de la guía)
4. (Opcional) Despliega la Edge Function `invite-owner`

Sin esto, el login con Supabase Auth real no funcionará (solo modo demo).

---

## 💻 Desarrollo local

```bash
npm install
cp .env.example .env      # rellena tus claves (o déjalo vacío para modo demo)
npm run dev
```

- Sin `.env` → **modo demo** (datos en localStorage, sin backend).
- Con `.env` completo → conexión real a Supabase.

Scripts:

```bash
npm run dev      # entorno de desarrollo (http://localhost:5173)
npm run build    # tsc -b && vite build (carpeta dist/)
npm run preview  # previsualizar el build de producción
npm run lint     # eslint
```

---

## 🔐 Seguridad

- **La anon key** es pública y vive en el cliente. La seguridad real la aporta
  el **RLS** de la base de datos (`database/setup_v2_auth.sql`).
- **La service_role key NUNCA** debe ir en el frontend ni en git. Solo en los
  secrets de la Edge Function (`supabase/functions/invite-owner`).
- `.env` está en `.gitignore` — nunca se commitea.
- Login admin requiere `app_metadata.role = "admin"` (validado en
  `RequireRole` + RLS).

---

## 🗂 Estructura

```
src/
  config/          authClient.ts, supabase.ts, config.ts
  hooks/           useAuth.ts (sesión reactiva)
  components/      RequireRole, CmorFlowLogo, ui/, ThemeProvider...
  pages/
    public/        LandingPage, LoginPage, RegisterPage, SetupPassword
    restaurant/    Dashboard, Orders, Menu, Pos, Crm, Reports, Settings...
    admin/         Dashboard, PendingRequests, AllRestaurants, Analytics
    customer/      CustomerMenu (pedidos por QR)
  services/        adminService, restaurantService
database/          setup.sql (v1), setup_v2_auth.sql (Auth), MIGRATION_AUTH.md
supabase/functions/invite-owner/   Edge Function (invitaciones por email)
vercel.json        config de deploy + SPA rewrite
```

---

## 📱 Rutas

```
/                       → Landing page
/register               → Registro de restaurante
/login                  → Login restaurante (email/contraseña + Google)
/setup-password         → Definir contraseña desde invitación por email
/menu/:slug             → Carta digital del cliente (pedidos por QR)
/restaurant/*           → Panel del restaurante (protegido: rol owner)
  /restaurant                     → Home del dashboard
  /restaurant/orders              → Pedidos
  /restaurant/menu                → Carta
  /restaurant/pos                 → POS
  /restaurant/crm                 → CRM
  /restaurant/reports             → Reportes
  /restaurant/settings            → Ajustes
/admin/login            → Login admin
/admin/*                → Panel admin (protegido: rol admin)
  /admin                          → Resumen
  /admin/requests                 → Solicitudes pendientes
  /admin/restaurants              → Todos los restaurantes
  /admin/analytics                → Analítica de plataforma
/404                    → Página no encontrada
```

---

## 🧭 Próximas fases (pendientes de la auditoría)

- **Fase 3** — Bugs funcionales: unificar enum `order_type` (analítica hoy
  rota entre POS/Reports/Customer), spinners pegados sin error handling,
  mutaciones de estado en carritos, CSV sin escapar.
- **Fase 4** — Limpieza: eliminar `MockSupabaseClient` del bundle de
  producción, generar tipos desde Supabase, a11y del Modal, i18n.

---

## 🎨 Design System

- **Colores**: fondo blanco, texto `#0A0A0A`, acento indigo `#6366F1`,
  éxito `#10B981`, error `#EF4444`.
- **Tipografía**: Inter (400/500/600/700).
- **Componentes**: `src/components/ui/` (Button, Input, Card, Modal, Alert,
  Badge, Loading).

---

---

## 🔐 Plan de Cumplimiento de Privacidad (Ley 19.628 / Ley 21.719)

Cmor Flow mantiene un plan de cumplimiento de protección de datos personales organizado en **4 capas** que se aplican en orden de dependencia técnica. La capa 4 (gobernanza, documental) puede aplicarse en paralelo al resto porque no depende de código.

> **Disclaimer legal:** los documentos de `docs/legal/`, `docs/contratos/` y `docs/privacidad/` son **borradores técnicos**. Requieren revisión de un abogado chileno antes de su publicación oficial. La versión vigente de las políticas se declara en `docs/legal/VERSION.md`.

### Orden de aplicación de las capas

| Capa | Qué cubre | Dónde | Estado |
|---|---|---|---|
| 1. Fundacional | Schema SQL + RLS + auditoría + retención | `database/` (archivos `03`-`10`) | Plan escrito; aplicación por MCP desde Antigravity |
| 2. Transparencia y Derechos | Documentos legales + Edge Functions `privacy/*` + UI | `docs/legal/`, `supabase/functions/`, `src/components/privacy/`, `src/pages/` | En diseño |
| 3. Operacional | AIPD, plantillas de brecha, `security-check.ts`, reglas IA | `docs/privacidad/`, `docs/seguridad/`, `scripts/` | En diseño |
| 4. Gobernanza | RAT, DPA, transferencias, checklist trimestral | `docs/privacidad/`, `docs/contratos/`, este README | Documentos generados (borrador) |

### Estructura de carpetas del plan

```
SaaS suchi/
├── database/                  ← SQL para Supabase (capa 1, aplicar vía MCP)
│   ├── 03_privacy_consents.sql
│   ├── 04_audit_log.sql
│   ├── 05_rls_hardening.sql
│   ├── 06_password_deprecation.sql
│   ├── 07_data_subject_requests.sql
│   ├── 08_retention.sql
│   ├── 09_breach_register.sql
│   ├── 10_pg_cron_schedule.sql
│   └── migrations_rollback.sql  ← EMERGENCIA, ver §"Rollback" abajo
├── scripts/                    ← Automatización (npm run X)
│   ├── security-check.ts
│   ├── seed-policy-versions.ts
│   └── dsar-cron-check.ts
├── docs/
│   ├── legal/                  ← Documentos legales (los revisa un abogado)
│   │   ├── politica_privacidad_b2b.md
│   │   ├── aviso_privacidad_b2b.md
│   │   ├── politica_privacidad_clientes.md
│   │   ├── terminos_y_condiciones.md
│   │   ├── VERSION.md
│   │   └── contacto_dpo.md
│   ├── privacidad/             ← Documentación operativa de privacidad
│   │   ├── RAT.md
│   │   ├── transferencias_internacionales.md
│   │   ├── checklist_trimestral.md
│   │   ├── aipd_plantilla.md
│   │   ├── reglas_ia.md
│   │   └── aipd_01..04_*.md
│   ├── contratos/              ← DPA (también los revisa un abogado)
│   │   ├── DPA_cmor_restaurante.md
│   │   └── DPA_proveedores.md
│   └── seguridad/              ← Plantillas y playbook de incidentes
│       ├── plantilla_notificacion_autoridad.md
│       ├── plantilla_notificacion_titulares.md
│       ├── plantilla_comunicado_interno.md
│       ├── playbook_respuesta_incidentes.md
│       └── rotacion_secretos.md
└── supabase/functions/         ← Edge Functions privacy/* (capa 2)
```

### Entregables clave

- **Políticas de privacidad:** `docs/legal/politica_privacidad_b2b.md`, `docs/legal/aviso_privacidad_b2b.md`, `docs/legal/politica_privacidad_clientes.md`, `docs/legal/terminos_y_condiciones.md`.
- **Gobernanza:** `docs/privacidad/RAT.md` (10 tratamientos), `docs/privacidad/transferencias_internacionales.md`, `docs/privacidad/checklist_trimestral.md`.
- **Contratos:** `docs/contratos/DPA_cmor_restaurante.md` (13 cláusulas), `docs/contratos/DPA_proveedores.md` (Vercel, Supabase, correo, IA).
- **Contacto del DPO:** `dpo@cmorflow.cl` (SLA 30 días, ver `docs/legal/contacto_dpo.md`).

### Spec de referencia

`docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` — diseño completo del plan (4 capas, 12 requisitos).

### Rollback (emergencia)

`database/migrations_rollback.sql` es una **herramienta de emergencia** que **NO** forma parte del flujo normal. Solo se ejecuta si una migración de la capa 1 (`03`-`10`) causa un problema crítico que no se puede resolver con una nueva migración. Antes de ejecutarlo:

1. Hacer un backup en Supabase (Dashboard → Database → Backups).
2. Revisar el archivo bloque por bloque; **NO ejecutar todo de una vez**.
3. Tener presente que **NO revierte** los parches de RLS de `05_rls_hardening.sql` (reabrirían vulnerabilidades) ni la deprecación de `admin_users`.

---

## 📜 Licencia

Proyecto privado.
