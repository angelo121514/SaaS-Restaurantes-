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
   | `VITE_SUPABASE_URL` | `https://wirwadxtrbrslfwayple.supabase.co` |
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

## 📜 Licencia

Proyecto privado.
