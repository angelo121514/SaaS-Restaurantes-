# Capa 2 — Transparencia y Derechos del Titular (DSAR + Consentimiento UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los 6 derechos del titular (DSAR) de la Ley 21.719 art. 19 + la UI de transparencia y consentimiento granular, sobre las tablas `consents` y `data_subject_requests` creadas en la Capa 1.

**Architecture:** 6 Edge Functions Deno (`supabase/functions/privacy-*`) procesan cada derecho usando `service_role`, crean/actualizan filas en `data_subject_requests` (evidencia legal + SLA) y ejecutan la acción específica (lectura, anonimización, revocación). Un servicio frontend `privacyService.ts` orquesta las llamadas (`supabase.functions.invoke`) y las consultas RLS. La UI expone 4 componentes en `src/components/privacy/`, 5 páginas (3 públicas + restaurant + admin), items de navegación en ambos dashboards y un modal obligatorio de primer login.

**Tech Stack:** Vite + React 19 + Supabase Edge Functions (Deno) + react-router-dom v7
**Spec de referencia:** `docs/superpowers/specs/2026-06-18-privacidad-chile-design.md` §3
**Depende de:** Capa 1 (tablas `consents`, `data_subject_requests`, `audit_log` ya aplicadas)

---

## Convenciones (leer antes de empezar)

- **Tipos TS nuevos:** se añaden a `src/config/supabase.ts` (NO crear `src/types/`).
- **Edge Functions Deno:** `// @ts-nocheck` al inicio, imports desde `https://esm.sh/`. Cliente `service_role` a nivel módulo. `corsHeaders` con `Access-Control-Allow-Origin: "*"`. Helper `json(body, status)`. `Deno.serve(async (req) => {...})`. try/catch con `String(err)`.
- **Rate-limit DSAR:** máx. 3 solicitudes por `subject_email` en los últimos 30 días (cada función lo valida antes de insertar).
- **SLA por tipo:** `access`/`erase`/`object`/`export` → 30 días; `rectify` → 15 días; `revoke-consent` → inmediato (1 día para tracking).
- **Versión de política vigente:** `"2026-06-01"` (constante `CURRENT_POLICY_VERSION`).
- **DPO email placeholder:** `dpo@cmorflow.cl`.
- **Verificación UI:** `npm run build` (tsc + vite build). Smoke test manual descrito por tarea.
- **Verificación Edge Function:** `npx supabase functions deploy <nombre> --no-verify-jwt` + `curl`.
- **Commit por tarea:** una sola vez al final de cada tarea con el `git -C` exacto.

---

## Task 1: Tipos `Consent` y `DataSubjectRequest` en `config/supabase.ts`

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/config/supabase.ts`

- [ ] **Step 1: Añadir tipos nuevos al final de la sección de interfaces (después de `interface AdminUser`, antes de la línea `// ---- LOCAL STORAGE MOCK...`)**

```ts
// --------------------------------------------------------------------
// Privacidad (Ley 19.628 / Ley 21.719) — Capa 2
// --------------------------------------------------------------------

export type ConsentScope =
  | "cookies"
  | "marketing"
  | "ai_profiling"
  | "analytics"
  | "third_party_share";

export type ConsentLegalBasis =
  | "consent"
  | "contract"
  | "legal_obligation"
  | "legitimate_interest";

/** Fila de public.consents (Capa 1, 03_privacy_consents.sql). */
export interface Consent {
  id: string;
  subject_id: string | null;
  subject_email: string;
  scope: ConsentScope;
  purpose: string;
  legal_basis: ConsentLegalBasis;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  proof: {
    ip?: string;
    user_agent?: string;
    via?: "cookie_banner" | "first_login_modal" | "dsar" | "account_panel";
    policy_version?: string;
  } | null;
  privacy_policy_version: string;
  created_at: string;
}

export type DsarType =
  | "access"
  | "rectify"
  | "erase"
  | "object"
  | "export"
  | "revoke-consent"
  | "contact";

export type DsarStatus =
  | "pending"
  | "verified"
  | "in_progress"
  | "fulfilled"
  | "rejected"
  | "cancelled";

/** Fila de public.data_subject_requests (Capa 1, 07_data_subject_requests.sql). */
export interface DataSubjectRequest {
  id: string;
  request_type: DsarType;
  subject_id: string | null;
  subject_email: string;
  verification_token: string;
  token_expires_at: string;
  status: DsarStatus;
  payload: Record<string, unknown> | null;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  result_metadata: Record<string, unknown> | null;
  rejection_reason: string | null;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
}

/** Versión vigente de la política de privacidad (docs/legal/VERSION.md). */
export const CURRENT_POLICY_VERSION = "2026-06-01";

/** Email de contacto del DPO (placeholder editable). */
export const DPO_EMAIL = "dpo@cmorflow.cl";
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso, sin errores TS. (Los tipos nuevos no se usan todavía, pero deben compilar.)

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/config/supabase.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): tipos Consent y DataSubjectRequest + constantes de version y DPO"
```

---

## Task 2: Servicio `privacyService.ts`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/services/privacyService.ts`

- [ ] **Step 1: Crear el archivo `privacyService.ts` con todas las funciones**

```ts
import { supabase } from "../config/supabase";
import type {
  Consent,
  ConsentScope,
  DataSubjectRequest,
  DsarType,
} from "../config/supabase";
import { CURRENT_POLICY_VERSION } from "../config/supabase";

// --------------------------------------------------------------------
// Helpers de invocación a Edge Functions (privacy/*)
// Cada función devuelve { success, data, error, message }.
// --------------------------------------------------------------------

interface InvokeResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

async function invokePrivacy<T = unknown>(
  fn: string,
  body: Record<string, unknown>
): Promise<InvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      return {
        success: false,
        data: null,
        error: error.message,
        message: null,
      };
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    return {
      success: payload.success !== false,
      data: (payload.data ?? payload) as T,
      error: (payload.error as string) ?? null,
      message: (payload.message as string) ?? null,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: String(err),
      message: null,
    };
  }
}

// --------------------------------------------------------------------
// DSAR — los 6 derechos del titular
// --------------------------------------------------------------------

export const requestAccess = (email: string) =>
  invokePrivacy("privacy-access", { email, type: "access" });

export const requestRectify = (
  email: string,
  payload: { fields: { field: string; current: string; correct: string }[] }
) => invokePrivacy("privacy-rectify", { email, type: "rectify", payload });

export const requestErase = (email: string) =>
  invokePrivacy("privacy-erase", { email, type: "erase" });

export const requestObject = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-object", {
    email,
    type: "object",
    payload: { scope },
  });

export const requestExport = (email: string) =>
  invokePrivacy<{ json: unknown; csv: string }>("privacy-export", {
    email,
    type: "export",
  });

export const requestRevokeConsent = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-revoke-consent", {
    email,
    type: "revoke-consent",
    payload: { scope },
  });

// --------------------------------------------------------------------
// Contacto DPO (graba en data_subject_requests con type='contact')
// --------------------------------------------------------------------

export const contactDpo = async (
  email: string,
  message: string,
  name?: string
): Promise<InvokeResult> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .insert([
      {
        request_type: "contact",
        subject_email: email,
        status: "pending",
        sla_due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payload: { name: name ?? null, message },
      },
    ])
    .select("id")
    .single();

  if (error) {
    return { success: false, data: null, error: error.message, message: null };
  }
  return {
    success: true,
    data: data as unknown,
    error: null,
    message: "Mensaje enviado al DPO.",
  };
};

// --------------------------------------------------------------------
// Consulta de estado (RLS: el titular ve solo los suyos)
// --------------------------------------------------------------------

export const listMyDsars = async (email: string): Promise<DataSubjectRequest[]> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listMyDsars error:", error);
    return [];
  }
  return (data ?? []) as unknown as DataSubjectRequest[];
};

export const listAllDsars = async (): Promise<DataSubjectRequest[]> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAllDsars error:", error);
    return [];
  }
  return (data ?? []) as unknown as DataSubjectRequest[];
};

export const updateDsarStatus = async (
  dsarId: string,
  status: DataSubjectRequest["status"],
  notes?: { rejection_reason?: string; result_metadata?: Record<string, unknown> }
): Promise<boolean> => {
  const update: Record<string, unknown> = {
    status,
    fulfilled_at: ["fulfilled", "rejected", "cancelled"].includes(status)
      ? new Date().toISOString()
      : null,
  };
  if (notes?.rejection_reason) update.rejection_reason = notes.rejection_reason;
  if (notes?.result_metadata) update.result_metadata = notes.result_metadata;

  const { error } = await supabase
    .from("data_subject_requests")
    .update(update)
    .eq("id", dsarId);
  return !error;
};

// --------------------------------------------------------------------
// Consentimientos
// --------------------------------------------------------------------

export const getMyConsents = async (email: string): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

export const grantConsent = async (params: {
  subjectId: string | null;
  subjectEmail: string;
  scope: ConsentScope;
  purpose: string;
  legalBasis: Consent["legal_basis"];
  granted: boolean;
  via: NonNullable<NonNullable<Consent["proof"]>["via"]>;
}): Promise<boolean> => {
  const { error } = await supabase.from("consents").insert([
    {
      subject_id: params.subjectId,
      subject_email: params.subjectEmail,
      scope: params.scope,
      purpose: params.purpose,
      legal_basis: params.legalBasis,
      granted: params.granted,
      granted_at: params.granted ? new Date().toISOString() : null,
      privacy_policy_version: CURRENT_POLICY_VERSION,
      proof: {
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        via: params.via,
        policy_version: CURRENT_POLICY_VERSION,
      },
    },
  ]);
  return !error;
};

export const revokeConsentScope = async (
  email: string,
  scope: ConsentScope
): Promise<boolean> => {
  const { error } = await supabase
    .from("consents")
    .update({ granted: false, revoked_at: new Date().toISOString() })
    .eq("subject_email", email)
    .eq("scope", scope)
    .eq("granted", true);
  return !error;
};

export const listAllConsents = async (): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listAllConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

// --------------------------------------------------------------------
// Utilidad: ¿el titular ya tiene algún consentimiento registrado?
// (para decidir si mostrar el modal de primer login)
// --------------------------------------------------------------------

export const hasAnyConsent = async (email: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("consents")
    .select("*", { count: "exact", head: true })
    .eq("subject_email", email);
  if (error) return false;
  return (count ?? 0) > 0;
};
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso sin errores TS.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/services/privacyService.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): servicio privacyService (DSAR invoke + consentimientos + DPO)"
```

---

## Task 3: Edge Function `privacy-access` (Derecho de acceso)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-access/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-access
// Derecho de ACCESO (Ley 21.719 art. 19). SLA: 30 días.
// Recibe POST { email, type } y devuelve un reporte JSON de los datos
// que tenemos sobre el titular. Crea fila en data_subject_requests
// como evidencia legal + tracking de SLA.
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SLA_DAYS = 30;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Recopila todos los datos asociados a un email (lectura, service_role). */
async function collectSubjectData(email: string) {
  const lower = email.toLowerCase();

  const [authUser, restaurants, customers, prospects, invitations, consents] =
    await Promise.all([
      supabase
        .from("auth.users")
        .select("id, email, created_at, last_sign_in_at")
        .ilike("email", lower),
      supabase.from("restaurants").select("*").ilike("email", lower),
      supabase
        .from("restaurant_customers")
        .select("*")
        .ilike("email", lower),
      supabase
        .from("registration_requests")
        .select("*")
        .ilike("email", lower),
      supabase.from("invitations").select("*").ilike("email", lower),
      supabase.from("consents").select("*").ilike("subject_email", lower),
    ]);

  const customerIds = (customers.data ?? [])
    .map((c: any) => c.id)
    .filter(Boolean);
  const orders = customerIds.length
    ? await supabase
        .from("orders")
        .select(
          "id, order_number, status, total, payment_method, created_at, completed_at, customer_name, customer_phone"
        )
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [], error: null };

  return {
    authUsers: authUser.data ?? [],
    restaurants: restaurants.data ?? [],
    customers: customers.data ?? [],
    orders: orders.data ?? [],
    registrationRequests: prospects.data ?? [],
    invitations: invitations.data ?? [],
    consents: consents.data ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "access");

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "access") {
      return json(
        { success: false, error: "type debe ser 'access'" },
        400
      );
    }

    // Rate-limit: máx 3 DSAR por email en 30 días.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        {
          success: false,
          error: "Límite de 3 solicitudes por mes alcanzado.",
        },
        429
      );
    }

    // Resolver subject_id desde auth.users.
    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(
      Date.now() + SLA_DAYS * 86400000
    ).toISOString();

    // Crear evidencia.
    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "access",
          subject_email: email,
          subject_id: subjectId,
          status: "pending",
          sla_due_at: slaDueAt,
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    // Ejecutar el acceso (lectura) y marcar fulfilled.
    const report = await collectSubjectData(email);

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        result_metadata: {
          counts: Object.fromEntries(
            Object.entries(report).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
          ),
        },
      })
      .eq("id", inserted.id);

    // Audit (mejor esfuerzo; audit_log permite INSERT any).
    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_access_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: { request_type: "access" },
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message:
          "Reporte de acceso generado. Revisa los datos que conservamos sobre ti.",
        data: report,
      },
      200
    );
  } catch (err) {
    console.error("privacy-access error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación con curl**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-access --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-access" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"access"}'
```
Output esperado: `{"success":true,"requestId":"...","message":"...","data":{...}}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-access/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-access (derecho de acceso, Ley 21.719 art.19)"
```

---

## Task 4: Edge Function `privacy-rectify` (Rectificación)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-rectify/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-rectify
// Derecho de RECTIFICACIÓN (Ley 21.719 art. 19). SLA: 15 días.
// Recibe POST { email, type, payload: { fields: [{field,current,correct}] } }.
// Crea fila PENDING para que el DPO aplique la corrección desde
// /admin/privacy (la rectificación requiere juicio humano sobre qué
// campo modificar y en qué tabla).
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SLA_DAYS = 15;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "rectify");
    const payload = body.payload || {};

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "rectify") {
      return json({ success: false, error: "type debe ser 'rectify'" }, 400);
    }
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    if (fields.length === 0) {
      return json(
        { success: false, error: "payload.fields es obligatorio" },
        400
      );
    }

    // Rate-limit 3/mes.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    // Resolver subject_id.
    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "rectify",
          subject_email: email,
          subject_id: subjectId,
          status: "pending",
          sla_due_at: slaDueAt,
          payload: { fields },
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_rectify_created",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: { field_count: fields.length },
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message:
          "Solicitud de rectificación recibida. El DPO la aplicará dentro de 15 días.",
      },
      200
    );
  } catch (err) {
    console.error("privacy-rectify error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-rectify --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-rectify" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"rectify","payload":{"fields":[{"field":"phone","current":"+56 9 1234","correct":"+56 9 9999"}]}}'
```
Output esperado: `{"success":true,"requestId":"...","message":"Solicitud de rectificación recibida..."}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-rectify/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-rectify (rectificacion, SLA 15 dias)"
```

---

## Task 5: Edge Function `privacy-erase` (Supresión / cancelación)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-erase/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-erase
// Derecho de SUPRESIÓN / CANCELACIÓN (Ley 21.719 art. 19). SLA: 30 días.
// Recibe POST { email, type }.
// Ejecuta ANONIMIZACIÓN para datos con obligación legal de retención
// (orders SII 6 años: se anonimizan campos personales, NO se borra la
// fila financiera) y BORRADO para datos sin obligación (prospects,
// invitations). Reenvía a consentimientos como revocados (prueba legal
// se conserva). El registro del DSAR se conserva como evidencia.
// NOTA B2B: la cuenta owner no se elimina aquí (requiere cancelación
// de contrato); se documenta en result_metadata.
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SLA_DAYS = 30;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "erase");

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "erase") {
      return json({ success: false, error: "type debe ser 'erase'" }, 400);
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "erase",
          subject_email: email,
          subject_id: subjectId,
          status: "in_progress",
          sla_due_at: slaDueAt,
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    const nowIso = new Date().toISOString();
    let customersAnon = 0;
    let ordersAnon = 0;
    let prospectsDeleted = 0;
    let invitationsDeleted = 0;
    let consentsRevoked = 0;

    // 1. Anonimizar restaurant_customers con ese email.
    const { data: matchedCustomers } = await supabase
      .from("restaurant_customers")
      .select("id")
      .ilike("email", email);
    const customerIds = (matchedCustomers ?? []).map((c: any) => c.id);

    if (customerIds.length) {
      await supabase
        .from("restaurant_customers")
        .update({
          name: "[anónimo]",
          phone: "[anónimo]",
          email: null,
          notes: null,
        })
        .in("id", customerIds);
      customersAnon = customerIds.length;

      // 2. Orders de esos clientes: anonimizar personales (SII conserva financiero 6 años).
      const { count: oCount } = await supabase
        .from("orders")
        .update({
          customer_name: null,
          customer_phone: null,
          customer_notes: null,
        })
        .in("customer_id", customerIds)
        .select("*", { count: "exact", head: true });
      ordersAnon = oCount ?? 0;
    }

    // 3. Registration_requests (prospects, sin obligación): borrar.
    const { count: delProspects } = await supabase
      .from("registration_requests")
      .delete()
      .ilike("email", email)
      .select("*", { count: "exact", head: true });
    prospectsDeleted = delProspects ?? 0;

    // 4. Invitaciones expiradas/pending: borrar.
    const { count: delInv } = await supabase
      .from("invitations")
      .delete()
      .ilike("email", email)
      .select("*", { count: "exact", head: true });
    invitationsDeleted = delInv ?? 0;

    // 5. Consents: revocar (NO borrar — son prueba legal de cumplimiento).
    const { count: revoked } = await supabase
      .from("consents")
      .update({ granted: false, revoked_at: nowIso })
      .ilike("subject_email", email)
      .eq("granted", true)
      .select("*", { count: "exact", head: true });
    consentsRevoked = revoked ?? 0;

    const result = {
      customers_anonymized: customersAnon,
      orders_anonymized_personal: ordersAnon,
      prospects_deleted: prospectsDeleted,
      invitations_deleted: invitationsDeleted,
      consents_revoked: consentsRevoked,
      note_b2b:
        "La cuenta owner/staff no se elimina en este endpoint (requiere cancelación de contrato). Se anonimizaron los datos de cliente final.",
    };

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: nowIso,
        result_metadata: result,
      })
      .eq("id", inserted.id);

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_erase_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: result,
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message:
          "Supresión ejecutada. Tus datos personales fueron anonimizados o eliminados según obligación legal.",
        data: result,
      },
      200
    );
  } catch (err) {
    console.error("privacy-erase error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-erase --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-erase" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"erase"}'
```
Output esperado: `{"success":true,"requestId":"...","data":{"customers_anonymized":N,...}}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-erase/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-erase (anonimizacion legal + borrado)"
```

---

## Task 6: Edge Function `privacy-object` (Oposición)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-object/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-object
// Derecho de OPOSICIÓN (Ley 21.719 art. 19). SLA: 30 días.
// Recibe POST { email, type, payload: { scope } }.
// El titular se opone a un tratamiento específico (marketing,
// analítica, ia_profiling, third_party_share) sin cancelar la cuenta.
// Revoca inmediatamente el scope indicado (mismo efecto que
// revoke-consent pero con evidencia DSAR tipo 'object').
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SLA_DAYS = 30;
const VALID_SCOPES = new Set([
  "cookies",
  "marketing",
  "ai_profiling",
  "analytics",
  "third_party_share",
]);

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "object");
    const payload = body.payload || {};
    const scope = String(payload.scope || "");

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "object") {
      return json({ success: false, error: "type debe ser 'object'" }, 400);
    }
    if (!VALID_SCOPES.has(scope)) {
      return json(
        { success: false, error: "payload.scope inválido" },
        400
      );
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "object",
          subject_email: email,
          subject_id: subjectId,
          status: "in_progress",
          sla_due_at: slaDueAt,
          payload: { scope },
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    // Revocar el scope inmediatamente.
    const nowIso = new Date().toISOString();
    const { count: revoked } = await supabase
      .from("consents")
      .update({ granted: false, revoked_at: nowIso })
      .ilike("subject_email", email)
      .eq("scope", scope)
      .eq("granted", true)
      .select("*", { count: "exact", head: true });

    const result = { scope, consents_revoked: revoked ?? 0 };

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: nowIso,
        result_metadata: result,
      })
      .eq("id", inserted.id);

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_object_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: result,
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message: `Te has opuesto al tratamiento '${scope}'. Se detuvo inmediatamente.`,
        data: result,
      },
      200
    );
  } catch (err) {
    console.error("privacy-object error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-object --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-object" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"object","payload":{"scope":"marketing"}}'
```
Output esperado: `{"success":true,"message":"Te has opuesto al tratamiento 'marketing'..."}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-object/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-object (oposicion a tratamiento especifico)"
```

---

## Task 7: Edge Function `privacy-export` (Portabilidad)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-export/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-export
// Derecho de PORTABILIDAD (Ley 21.719 art. 19). SLA: 30 días.
// Recibe POST { email, type } y devuelve los datos del titular en
// formato JSON + CSV estructurado (no PDF). Crea evidencia en
// data_subject_requests y marca fulfilled.
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SLA_DAYS = 30;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: any[], columns: string[]): string {
  if (!rows.length) return columns.join(",") + "\n";
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCsv(r[c])).join(","))
    .join("\n");
  return header + "\n" + body;
}

async function collectSubjectData(email: string) {
  const lower = email.toLowerCase();

  const [authUser, restaurants, customers, prospects, invitations, consents] =
    await Promise.all([
      supabase
        .from("auth.users")
        .select("id, email, created_at, last_sign_in_at")
        .ilike("email", lower),
      supabase.from("restaurants").select("*").ilike("email", lower),
      supabase
        .from("restaurant_customers")
        .select("*")
        .ilike("email", lower),
      supabase
        .from("registration_requests")
        .select("*")
        .ilike("email", lower),
      supabase.from("invitations").select("*").ilike("email", lower),
      supabase.from("consents").select("*").ilike("subject_email", lower),
    ]);

  const customerIds = (customers.data ?? [])
    .map((c: any) => c.id)
    .filter(Boolean);
  const orders = customerIds.length
    ? await supabase
        .from("orders")
        .select(
          "id, order_number, status, total, payment_method, created_at, completed_at"
        )
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [], error: null };

  return {
    authUsers: authUser.data ?? [],
    restaurants: restaurants.data ?? [],
    customers: customers.data ?? [],
    orders: orders.data ?? [],
    registrationRequests: prospects.data ?? [],
    invitations: invitations.data ?? [],
    consents: consents.data ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "export");

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "export") {
      return json({ success: false, error: "type debe ser 'export'" }, 400);
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "export",
          subject_email: email,
          subject_id: subjectId,
          status: "in_progress",
          sla_due_at: slaDueAt,
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    const collected = await collectSubjectData(email);

    // CSV de pedidos (portabilidad del historial transaccional).
    const csv = toCsv(collected.orders, [
      "id",
      "order_number",
      "status",
      "total",
      "payment_method",
      "created_at",
      "completed_at",
    ]);

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        result_metadata: {
          format: "json+csv",
          counts: Object.fromEntries(
            Object.entries(collected).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.length : 0,
            ])
          ),
        },
      })
      .eq("id", inserted.id);

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_export_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: { format: "json+csv" },
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message: "Portabilidad de datos generada en formato JSON + CSV.",
        data: { json: collected, csv },
      },
      200
    );
  } catch (err) {
    console.error("privacy-export error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-export --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-export" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"export"}'
```
Output esperado: `{"success":true,"data":{"json":{...},"csv":"id,order_number,..."}}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-export/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-export (portabilidad JSON+CSV)"
```

---

## Task 8: Edge Function `privacy-revoke-consent` (Revocación)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/supabase/functions/privacy-revoke-consent/index.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// =====================================================================
// Edge Function: privacy-revoke-consent
// Revocación de consentimiento (Ley 21.719 art. 7). Plazo: inmediato.
// Recibe POST { email, type, payload: { scope } }.
// Revoca UN scope específico (marketing, analytics, ai_profiling,
// third_party_share, cookies) sin tocar el resto. Crea evidencia DSAR
// y marca fulfilled al instante.
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

// Inmediato; usamos 1 día solo para tracking.
const SLA_DAYS = 1;
const VALID_SCOPES = new Set([
  "cookies",
  "marketing",
  "ai_profiling",
  "analytics",
  "third_party_share",
]);

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "revoke-consent");
    const payload = body.payload || {};
    const scope = String(payload.scope || "");

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "email inválido" }, 400);
    }
    if (type !== "revoke-consent") {
      return json(
        { success: false, error: "type debe ser 'revoke-consent'" },
        400
      );
    }
    if (!VALID_SCOPES.has(scope)) {
      return json(
        { success: false, error: "payload.scope inválido" },
        400
      );
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return json(
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    const subjectId = authRow && authRow.length ? authRow[0].id : null;

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "revoke-consent",
          subject_email: email,
          subject_id: subjectId,
          status: "in_progress",
          sla_due_at: slaDueAt,
          payload: { scope },
        },
      ])
      .select("id, verification_token")
      .single();
    if (insErr) throw insErr;

    const nowIso = new Date().toISOString();
    const { count: revoked } = await supabase
      .from("consents")
      .update({ granted: false, revoked_at: nowIso })
      .ilike("subject_email", email)
      .eq("scope", scope)
      .eq("granted", true)
      .select("*", { count: "exact", head: true });

    const result = { scope, consents_revoked: revoked ?? 0 };

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: nowIso,
        result_metadata: result,
      })
      .eq("id", inserted.id);

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_revoke_consent_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: result,
      },
    ]);

    return json(
      {
        success: true,
        requestId: inserted.id,
        verificationToken: inserted.verification_token,
        message: `Consentimiento '${scope}' revocado inmediatamente.`,
        data: result,
      },
      200
    );
  } catch (err) {
    console.error("privacy-revoke-consent error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
```

- [ ] **Step 2: Deploy y verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npx supabase functions deploy privacy-revoke-consent --no-verify-jwt
curl -X POST "https://<SUPABASE_PROJECT>.supabase.co/functions/v1/privacy-revoke-consent" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"revoke-consent","payload":{"scope":"marketing"}}'
```
Output esperado: `{"success":true,"message":"Consentimiento 'marketing' revocado inmediatamente."}`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add supabase/functions/privacy-revoke-consent/index.ts
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): edge function privacy-revoke-consent (revocacion inmediata de scope)"
```

---

## Task 9: Componente `CookieBanner.tsx`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/components/privacy/CookieBanner.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import React, { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "../ui";
import { Modal } from "../ui";
import { grantConsent } from "../../services/privacyService";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";
import type { ConsentScope } from "../../config/supabase";

interface ScopeChoice {
  scope: ConsentScope;
  label: string;
  description: string;
  legal_basis: "consent" | "legitimate_interest";
}

const CHOICES: ScopeChoice[] = [
  {
    scope: "analytics",
    label: "Analítica de uso",
    description: "Métricas anónimas para mejorar el producto.",
    legal_basis: "consent",
  },
  {
    scope: "marketing",
    label: "Marketing",
    description: "Comunicaciones comerciales y promociones.",
    legal_basis: "consent",
  },
  {
    scope: "ai_profiling",
    label: "Perfilado con IA",
    description: "Recomendaciones basadas en tu actividad.",
    legal_basis: "consent",
  },
];

const STORAGE_KEY = "cmor_cookie_consent";

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(
    () => typeof localStorage !== "undefined" && !localStorage.getItem(STORAGE_KEY)
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [scopes, setScopes] = useState<Record<ConsentScope, boolean>>({
    analytics: false,
    marketing: false,
    ai_profiling: false,
    third_party_share: false,
    cookies: true,
  });
  const [emailInput, setEmailInput] = useState("");

  const persist = async (grantedScopes: ConsentScope[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_POLICY_VERSION,
        grantedAt: new Date().toISOString(),
        scopes: grantedScopes,
      })
    );
    const email = emailInput.trim();
    // Si hay email, persistir prueba legal en la tabla consents.
    if (email) {
      for (const s of grantedScopes) {
        await grantConsent({
          subjectId: null,
          subjectEmail: email,
          scope: s,
          purpose: `Consentimiento ${s} vía banner de cookies`,
          legalBasis: "consent",
          granted: true,
          via: "cookie_banner",
        });
      }
    }
  };

  const acceptAll = async () => {
    await persist(["analytics", "marketing", "ai_profiling"]);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const onlyNecessary = async () => {
    await persist([]);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const saveCustom = async () => {
    const granted = (Object.keys(scopes) as ConsentScope[]).filter(
      (k) => scopes[k] && k !== "cookies"
    );
    await persist(granted);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const toggle = (scope: ConsentScope) =>
    setScopes((prev) => ({ ...prev, [scope]: !prev[scope] }));

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-bg border-t border-border shadow-lg">
        <div className="container-custom flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text">
              <p className="font-semibold text-text">
                Usamos cookies para mejorar tu experiencia.
              </p>
              <p className="text-text-secondary">
                Las necesarias son obligatorias. Puedes aceptar todas o
                personalizar. Política:{" "}
                <a
                  href="/legal/privacidad"
                  className="text-accent underline"
                >
                  ver política de privacidad
                </a>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onlyNecessary}>
              Solo necesarias
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
              Personalizar
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Aceptar todo
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Personalizar consentimiento"
        size="md"
      >
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Tu email (para registro legal del consentimiento, opcional)"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="input"
          />
          {CHOICES.map((c) => (
            <label
              key={c.scope}
              className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-bg-subtle"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={scopes[c.scope]}
                onChange={() => toggle(c.scope)}
              />
              <div>
                <p className="font-medium text-text">{c.label}</p>
                <p className="text-sm text-text-secondary">{c.description}</p>
              </div>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onlyNecessary}>
              Solo necesarias
            </Button>
            <Button onClick={saveCustom}>Guardar preferencias</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CookieBanner;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: monta el componente en una página temporal (ej. LandingPage) o verifica con React DevTools que aparece el banner fijo abajo y los 3 botones funcionan.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/components/privacy/CookieBanner.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): componente CookieBanner (aceptar todo / solo necesarias / personalizar)"
```

---

## Task 10: Componente `ConsentManager.tsx`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/components/privacy/ConsentManager.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import React, { useEffect, useState } from "react";
import { Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Button, Badge, Loading } from "../ui";
import {
  getMyConsents,
  revokeConsentScope,
} from "../../services/privacyService";
import type { Consent, ConsentScope } from "../../config/supabase";

interface ConsentManagerProps {
  email: string;
  onChanged?: () => void;
}

const SCOPES: { scope: ConsentScope; label: string; description: string }[] = [
  {
    scope: "analytics",
    label: "Analítica de uso",
    description: "Métricas anónimas para mejorar el producto.",
  },
  {
    scope: "marketing",
    label: "Marketing",
    description: "Comunicaciones comerciales y promociones.",
  },
  {
    scope: "ai_profiling",
    label: "Perfilado IA",
    description: "Recomendaciones basadas en tu actividad.",
  },
  {
    scope: "third_party_share",
    label: "Compartir con terceros",
    description: "Transferencia a encargados subcontratados.",
  },
];

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  email,
  onChanged,
}) => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<ConsentScope | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getMyConsents(email);
    setConsents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const isGranted = (scope: ConsentScope) =>
    consents.some((c) => c.scope === scope && c.granted);

  const handleRevoke = async (scope: ConsentScope) => {
    setRevoking(scope);
    const ok = await revokeConsentScope(email, scope);
    if (ok) {
      await load();
      onChanged?.();
    }
    setRevoking(null);
  };

  if (loading) return <Loading text="Cargando consentimientos…" />;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-text">Mis consentimientos</h3>
      </div>
      <p className="text-sm text-text-secondary">
        Gestiona qué tratamientos autorizas. Los cambios se aplican de inmediato.
      </p>

      <div className="space-y-3">
        {SCOPES.map(({ scope, label, description }) => {
          const granted = isGranted(scope);
          return (
            <div
              key={scope}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{label}</span>
                  <Badge variant={granted ? "success" : "neutral"}>
                    {granted ? "Concedido" : "Revocado"}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
              <Button
                variant={granted ? "outline" : "ghost"}
                size="sm"
                loading={revoking === scope}
                disabled={!granted}
                icon={
                  granted ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )
                }
                onClick={() => handleRevoke(scope)}
              >
                {granted ? "Revocar" : "Revocado"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary">
        Las cookies necesarias no son revocables (son imprescindibles para el
        funcionamiento del servicio).
      </p>
    </Card>
  );
};

export default ConsentManager;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: renderiza `<ConsentManager email="test@example.com" />` dentro de `restaurant/Privacy.tsx` (Task 16) y verifica que cargue la lista de scopes y el botón "Revocar".

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/components/privacy/ConsentManager.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): componente ConsentManager (panel granular de consentimientos)"
```

---

## Task 11: Componente `PrivacyPolicyModal.tsx`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/components/privacy/PrivacyPolicyModal.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import React from "react";
import { FileText } from "lucide-react";
import { Modal, Button, Badge } from "../ui";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Texto de la política. Por defecto muestra el resumen B2B. */
  policyText?: string;
  title?: string;
}

const DEFAULT_TEXT = `
Responsable del tratamiento: CMOR FLOW (Cmor Flow SpA).
Contacto del DPO: dpo@cmorflow.cl.

Finalidades: prestación del servicio SaaS de pedidos y gestión para
restaurantes; analítica de uso; comunicaciones comerciales (con
consentimiento); cumplimiento de obligaciones legales (SII).

Categorías de datos: identidad, contacto, autenticación,
transaccional, operativos.

Destinatarios: Vercel (hosting), Supabase (DB/Auth/Storage), proveedor
de email. Transferencias internacionales a EE. UU. con Cláusulas
Contractuales Tipo (SCC) y cifrado.

Derechos del titular (Ley 19.628 / Ley 21.719): acceso, rectificación,
cancelación (supresión), oposición, portabilidad y revocación del
consentimiento. Plazo máximo de respuesta: 30 días (15 días para
rectificación).

Conservación: según categorías; los documentos tributarios (pedidos)
se conservan 6 años por obligación del SII, anonimizando los datos
personales al expirar.

Reclamación: ante la autoridad competente en materia de protección de
datos personales.
`;

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  policyText = DEFAULT_TEXT,
  title = "Política de Privacidad",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          <Badge variant="accent-secondary">
            Versión {CURRENT_POLICY_VERSION}
          </Badge>
        </div>
        <div className="prose prose-sm max-w-none text-text whitespace-pre-line">
          {policyText}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: abre el modal desde un botón y verifica que muestra versión + texto.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/components/privacy/PrivacyPolicyModal.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): componente PrivacyPolicyModal (politica versionada)"
```

---

## Task 12: Componente `DsarForm.tsx`

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/components/privacy/DsarForm.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import React, { useState } from "react";
import { Send } from "lucide-react";
import { Card, Button, Input, Select, Textarea, Alert } from "../ui";
import {
  requestAccess,
  requestRectify,
  requestErase,
  requestObject,
  requestExport,
} from "../../services/privacyService";
import type { ConsentScope, DsarType } from "../../config/supabase";

interface DsarFormProps {
  defaultEmail?: string;
  onSubmitted?: () => void;
}

const TYPE_OPTIONS: { value: DsarType; label: string }[] = [
  { value: "access", label: "Acceso — ver mis datos" },
  { value: "rectify", label: "Rectificación — corregir datos" },
  { value: "erase", label: "Supresión — borrar mis datos" },
  { value: "object", label: "Oposición — detener un tratamiento" },
  { value: "export", label: "Portabilidad — exportar mis datos" },
];

const SCOPE_OPTIONS: { value: ConsentScope; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "analytics", label: "Analítica" },
  { value: "ai_profiling", label: "Perfilado IA" },
  { value: "third_party_share", label: "Compartir con terceros" },
];

interface RectifyRow {
  field: string;
  current: string;
  correct: string;
}

export const DsarForm: React.FC<DsarFormProps> = ({
  defaultEmail = "",
  onSubmitted,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [type, setType] = useState<DsarType>("access");
  const [scope, setScope] = useState<ConsentScope>("marketing");
  const [rectifyRows, setRectifyRows] = useState<RectifyRow[]>([
    { field: "", current: "", correct: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setResult(null);
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido." });
      return;
    }

    setLoading(true);
    let res;
    if (type === "access") res = await requestAccess(email);
    else if (type === "erase") res = await requestErase(email);
    else if (type === "export") res = await requestExport(email);
    else if (type === "object") res = await requestObject(email, scope);
    else {
      const valid = rectifyRows.filter((r) => r.field && r.correct);
      if (!valid.length) {
        setResult({
          success: false,
          message: "Agrega al menos un campo a rectificar.",
        });
        setLoading(false);
        return;
      }
      res = await requestRectify(email, { fields: valid });
    }
    setLoading(false);

    setResult({
      success: res.success,
      message:
        res.message ||
        (res.success
          ? "Solicitud enviada."
          : res.error || "Error al enviar la solicitud."),
    });
    if (res.success) onSubmitted?.();
  };

  const updateRow = (i: number, patch: Partial<RectifyRow>) =>
    setRectifyRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-text">Ejercer un derecho (DSAR)</h3>
      <p className="text-sm text-text-secondary">
        Ley 19.628 / Ley 21.719. Plazo de respuesta: 30 días (15 días
        rectificación).
      </p>

      <Input
        label="Tu email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Select
        label="Tipo de solicitud"
        value={type}
        onChange={(e) => setType(e.target.value as DsarType)}
        options={TYPE_OPTIONS}
      />

      {type === "object" && (
        <Select
          label="Tratamiento al que te opones"
          value={scope}
          onChange={(e) => setScope(e.target.value as ConsentScope)}
          options={SCOPE_OPTIONS}
        />
      )}

      {type === "rectify" && (
        <div className="space-y-3">
          <label className="label">Campos a rectificar</label>
          {rectifyRows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Campo (ej. phone)"
                value={row.field}
                onChange={(e) => updateRow(i, { field: e.target.value })}
              />
              <Input
                placeholder="Valor actual"
                value={row.current}
                onChange={(e) => updateRow(i, { current: e.target.value })}
              />
              <Input
                placeholder="Valor correcto"
                value={row.correct}
                onChange={(e) => updateRow(i, { correct: e.target.value })}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRectifyRows((prev) => [
                ...prev,
                { field: "", current: "", correct: "" },
              ])
            }
          >
            + Agregar campo
          </Button>
        </div>
      )}

      {result && (
        <Alert
          type={result.success ? "success" : "error"}
          message={result.message}
        />
      )}

      <Button
        onClick={handleSubmit}
        loading={loading}
        icon={<Send className="w-4 h-4" />}
      >
        Enviar solicitud
      </Button>
    </Card>
  );
};

export default DsarForm;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: monta el form, cambia tipos, verifica que rectify muestra filas dinámicas y object muestra select de scope.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/components/privacy/DsarForm.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): componente DsarForm (formulario de ejercicio de derechos)"
```

---

## Task 13: Página `public/Privacy.tsx` (`/legal/privacidad`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/public/Privacy.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, FileText } from "lucide-react";
import { Button, Card, Badge } from "../../components/ui";
import { PrivacyPolicyModal } from "../../components/privacy/PrivacyPolicyModal";
import { CURRENT_POLICY_VERSION, DPO_EMAIL } from "../../config/supabase";

const PrivacyPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-accent">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">
            Política de Privacidad
          </h1>
        </div>
        <Badge variant="accent-secondary">
          Versión {CURRENT_POLICY_VERSION}
        </Badge>

        <Card className="p-6 mt-6 space-y-4 text-text">
          <section>
            <h2 className="text-xl font-semibold mb-2">Responsable</h2>
            <p className="text-text-secondary">
              CMOR FLOW (Cmor Flow SpA) — responsable del tratamiento de los
              datos de owners, staff y administradores. Para los datos de
              clientes finales, el restaurante es responsable y CMOR FLOW actúa
              como encargado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Finalidades</h2>
            <ul className="list-disc pl-5 text-text-secondary space-y-1">
              <li>Prestación del servicio SaaS de pedidos y gestión.</li>
              <li>Analítica de uso (con consentimiento).</li>
              <li>Comunicaciones comerciales (con consentimiento).</li>
              <li>Cumplimiento de obligaciones legales y tributarias (SII).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Tus derechos</h2>
            <p className="text-text-secondary">
              Acceso, rectificación, supresión, oposición, portabilidad y
              revocación del consentimiento (Ley 19.628 / Ley 21.719 art. 19).
              Plazo máximo de respuesta: 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Conservación</h2>
            <p className="text-text-secondary">
              Los documentos tributarios (pedidos) se conservan 6 años por
              obligación del SII, anonimizando los datos personales al expirar
              el plazo. El resto según la categoría documentada.
            </p>
          </section>
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            variant="outline"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Ver política completa
          </Button>
          <Link to="/legal/contacto-dpo">
            <Button variant="ghost" icon={<Mail className="w-4 h-4" />}>
              Contactar al DPO
            </Button>
          </Link>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default PrivacyPage;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: tras Task 18 (router), navega a `/legal/privacidad` y verifica que carga.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/public/Privacy.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): pagina publica /legal/privacidad (politica B2B)"
```

---

## Task 14: Página `public/PrivacyClients.tsx` (`/legal/privacidad-clientes`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/public/PrivacyClients.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText } from "lucide-react";
import { Button, Card, Badge } from "../../components/ui";
import { PrivacyPolicyModal } from "../../components/privacy/PrivacyPolicyModal";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

const CLIENT_TEXT = `
Responsable: el restaurante donde realizas tu pedido es responsable de
tus datos de cliente; CMOR FLOW actúa como encargado del tratamiento
(alimenta/procesa en Supabase lo que el restaurante introduce).

Finalidades: gestión de pedidos, atención al cliente, historial de
compras, comunicaciones sobre tu pedido.

Categorías: nombre, teléfono, email, notas de pedido, historial de
pedidos.

Derechos: acceso, rectificación, supresión, oposición, portabilidad.
Para ejercerlos, contacta al restaurante o a dpo@cmorflow.cl.

Conservación: historial de pedidos 24 meses sin actividad; los datos
financieros del pedido se conservan 6 años por obligación tributaria
(SII), anonimizando tu identidad al expirar.

IA: el chatbot de recomendaciones es stateless. Tus mensajes no se
persisten ni se usan para entrenar modelos.
`;

const PrivacyClientsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-accent">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">
            Privacidad de Clientes
          </h1>
        </div>
        <Badge variant="accent-secondary">
          Versión {CURRENT_POLICY_VERSION}
        </Badge>

        <Card className="p-6 mt-6">
          <p className="text-text-secondary whitespace-pre-line">
            {CLIENT_TEXT}
          </p>
        </Card>

        <div className="mt-6">
          <Button
            variant="outline"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Ver aviso completo
          </Button>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        policyText={CLIENT_TEXT}
        title="Aviso de Privacidad — Clientes"
      />
    </div>
  );
};

export default PrivacyClientsPage;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: tras router, navega a `/legal/privacidad-clientes`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/public/PrivacyClients.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): pagina publica /legal/privacidad-clientes"
```

---

## Task 15: Página `public/ContactDpo.tsx` (`/legal/contacto-dpo`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/public/ContactDpo.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { Button, Card, Input, Textarea, Alert } from "../../components/ui";
import { contactDpo } from "../../services/privacyService";
import { DPO_EMAIL } from "../../config/supabase";

const ContactDpoPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setResult(null);
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido." });
      return;
    }
    if (!message.trim()) {
      setResult({ success: false, message: "El mensaje es obligatorio." });
      return;
    }

    setLoading(true);
    const res = await contactDpo(email, message, name);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? "Tu mensaje fue enviado al DPO. Responderemos en un máximo de 30 días."
        : res.error || "Error al enviar.",
    });
    if (res.success) {
      setName("");
      setEmail("");
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-accent">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">Contacto DPO</h1>
        </div>
        <p className="text-text-secondary">
          Delegado de Protección de Datos:{" "}
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="text-accent underline"
          >
            {DPO_EMAIL}
          </a>
        </p>

        <Card className="p-6 mt-6 space-y-4">
          <Input
            label="Nombre (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Textarea
            label="Mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
          {result && (
            <Alert
              type={result.success ? "success" : "error"}
              message={result.message}
            />
          )}
          <Button
            onClick={handleSubmit}
            loading={loading}
            icon={<Send className="w-4 h-4" />}
          >
            Enviar mensaje
          </Button>
        </Card>

        <p className="text-xs text-text-secondary mt-4">
          SLA de respuesta: 30 días máximo.
        </p>
      </div>
    </div>
  );
};

export default ContactDpoPage;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: tras router, navega a `/legal/contacto-dpo`, envía un mensaje (requiere Supabase real para persistir).

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/public/ContactDpo.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): pagina publica /legal/contacto-dpo (canal DPO)"
```

---

## Task 16: Página `restaurant/Privacy.tsx` (`/account/privacy`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/restaurant/Privacy.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, Badge, Loading } from "../../components/ui";
import { ConsentManager, DsarForm } from "../../components/privacy";
import { listMyDsars } from "../../services/privacyService";
import { useAuth } from "../../hooks/useAuth";
import type { DataSubjectRequest } from "../../config/supabase";

const RestaurantPrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [dsars, setDsars] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    const data = await listMyDsars(email);
    setDsars(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ email, generatedAt: new Date().toISOString(), dsars }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-datos-${email}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!email) return <Loading text="Cargando…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">Privacidad y datos</h2>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExport}
        >
          Descargar mis datos
        </Button>
      </div>

      <ConsentManager email={email} onChanged={load} />

      <DsarForm defaultEmail={email} onSubmitted={load} />

      <Card className="p-6">
        <h3 className="text-lg font-bold text-text mb-3">
          Mis solicitudes (DSAR)
        </h3>
        {loading ? (
          <Loading text="Cargando solicitudes…" />
        ) : dsars.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No tienes solicitudes registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {dsars.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-text">{d.request_type}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(d.created_at).toLocaleString("es-CL")}
                  </p>
                </div>
                <Badge
                  variant={
                    d.status === "fulfilled"
                      ? "success"
                      : d.status === "rejected"
                      ? "error"
                      : "warning"
                  }
                >
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RestaurantPrivacyPage;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: tras router + navItem (Tasks 18, 20), entra a `/restaurant/privacy` logueado y verifica ConsentManager + DsarForm + lista de DSAR.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/restaurant/Privacy.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): pagina restaurant /account/privacy (panel del titular)"
```

---

## Task 17: Página `admin/Privacy.tsx` (`/admin/privacy`)

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/admin/Privacy.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import React, { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Card, Badge, Button, Loading, Select } from "../../components/ui";
import {
  listAllDsars,
  updateDsarStatus,
} from "../../services/privacyService";
import type { DataSubjectRequest, DsarStatus } from "../../config/supabase";

const STATUS_OPTIONS: { value: DsarStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "verified", label: "Verificado" },
  { value: "in_progress", label: "En progreso" },
  { value: "fulfilled", label: "Cumplido" },
  { value: "rejected", label: "Rechazado" },
  { value: "cancelled", label: "Cancelado" },
];

const AdminPrivacyPage: React.FC = () => {
  const [dsars, setDsars] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await listAllDsars();
    setDsars(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (
    id: string,
    status: DsarStatus
  ) => {
    const ok = await updateDsarStatus(id, status);
    if (ok) await load();
  };

  const badgeVariant = (status: DsarStatus) =>
    status === "fulfilled"
      ? "success"
      : status === "rejected" || status === "cancelled"
      ? "error"
      : "warning";

  const isOverdue = (d: DataSubjectRequest) =>
    ["pending", "verified", "in_progress"].includes(d.status) &&
    new Date(d.sla_due_at).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Inbox className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-text">
          Bandeja DPO — Solicitudes de derechos
        </h2>
      </div>

      <Card className="p-6">
        {loading ? (
          <Loading text="Cargando bandeja…" />
        ) : dsars.length === 0 ? (
          <p className="text-text-secondary">No hay solicitudes.</p>
        ) : (
          <div className="space-y-3">
            {dsars.map((d) => (
              <div
                key={d.id}
                className="p-4 border border-border rounded-lg space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text">
                      <span className="capitalize">{d.request_type}</span>
                      {d.request_type === "contact" && " (DPO)"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {d.subject_email} ·{" "}
                      {new Date(d.created_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue(d) && (
                      <Badge variant="error">Fuera de SLA</Badge>
                    )}
                    <Badge variant={badgeVariant(d.status)}>
                      {d.status}
                    </Badge>
                  </div>
                </div>

                {d.payload && (
                  <pre className="text-xs bg-bg-subtle p-2 rounded overflow-x-auto text-text-secondary">
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                )}

                {d.result_metadata && (
                  <pre className="text-xs bg-bg-subtle p-2 rounded overflow-x-auto text-text-secondary">
                    {JSON.stringify(d.result_metadata, null, 2)}
                  </pre>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    Cambiar estado:
                  </span>
                  <Select
                    value={d.status}
                    onChange={(e) =>
                      handleStatusChange(d.id, e.target.value as DsarStatus)
                    }
                    options={STATUS_OPTIONS}
                    className="max-w-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-text mb-2">Recordatorio de SLA</h3>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>Acceso / Supresión / Oposición / Portabilidad: 30 días.</li>
          <li>Rectificación: 15 días.</li>
          <li>Revocación de consentimiento: inmediato.</li>
        </ul>
      </Card>
    </div>
  );
};

export default AdminPrivacyPage;
```

- [ ] **Step 2: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: tras router + navItem (Tasks 18, 19), entra a `/admin/privacy` como admin; verifica la lista de DSAR y el cambio de estado.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/admin/Privacy.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): pagina admin /admin/privacy (bandeja DPO)"
```

---

## Task 18: Actualizar router `App.tsx`

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/App.tsx`

- [ ] **Step 1: Añadir lazy imports para las 3 páginas públicas nuevas (justo después del bloque de lazy imports existente, antes de `const CustomerMenu`)**

```tsx
const PublicPrivacy = lazy(() => import("./pages/public/Privacy"));
const PublicPrivacyClients = lazy(() => import("./pages/public/PrivacyClients"));
const PublicContactDpo = lazy(() => import("./pages/public/ContactDpo"));
```

- [ ] **Step 2: Añadir el `import` de `CookieBanner` al inicio del archivo (después de los imports existentes de React/router)**

```tsx
import { CookieBanner } from "./components/privacy/CookieBanner";
```

- [ ] **Step 3: Añadir las rutas públicas nuevas y envolver todo con el banner**

Reemplazar el `<BrowserRouter>...</BrowserRouter>` completo por:

```tsx
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password" element={<SetupPassword />} />

          {/* Legal / Privacy (publicas) */}
          <Route path="/legal/privacidad" element={<PublicPrivacy />} />
          <Route path="/legal/privacidad-clientes" element={<PublicPrivacyClients />} />
          <Route path="/legal/contacto-dpo" element={<PublicContactDpo />} />

          {/* Restaurant Dashboard Routes */}
          <Route
            path="/restaurant/*"
            element={
              <RequireRole role="owner">
                <RestaurantDashboard />
              </RequireRole>
            }
          />

          {/* Admin Panel Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <RequireRole role="admin" redirectTo="/admin/login">
                <AdminDashboard />
              </RequireRole>
            }
          />

          {/* Customer Ordering Route */}
          <Route path="/menu/:slug" element={<CustomerMenu />} />

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
```

- [ ] **Step 4: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: `npm run dev` → navega a `/legal/privacidad`, `/legal/privacidad-clientes`, `/legal/contacto-dpo`. Verifica que el banner de cookies aparece abajo.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/App.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): rutas /legal/* publicas + CookieBanner global en App.tsx"
```

---

## Task 19: Actualizar `admin/Dashboard.tsx` (navItem + ruta)

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Añadir import de icono `ShieldCheck` (junto a los otros iconos de `lucide-react`)**

```tsx
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Store as StoreIcon,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
```

- [ ] **Step 2: Añadir import de la página `Privacy` del admin (junto a los otros imports de páginas admin)**

```tsx
import Privacy from "./Privacy";
```

- [ ] **Step 3: Añadir el item al array `navItems`**

Dentro de `const navItems = [...]`, añadir antes del cierre `];`:

```tsx
    { path: "/admin/privacy", icon: ShieldCheck, label: "Privacidad (DPO)" },
```

(Que quede como último item del array.)

- [ ] **Step 4: Añadir la `<Route>` anidada**

Dentro del `<Routes>` del contenido principal, añadir:

```tsx
          <Route path="privacy" element={<Privacy />} />
```

- [ ] **Step 5: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: entra a `/admin` como admin, verifica que aparece la pestaña "Privacidad (DPO)" y al hacer click carga `/admin/privacy`.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/admin/Dashboard.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): navItem + ruta Privacidad en admin Dashboard (bandeja DPO)"
```

---

## Task 20: Actualizar `restaurant/Dashboard.tsx` (navItem + ruta)

**Files:**
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/restaurant/Dashboard.tsx`

- [ ] **Step 1: Añadir import del icono `ShieldCheck` al bloque de `lucide-react`**

```tsx
import {
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
  Users,
  BrainCircuit,
  Calculator,
  ShieldCheck,
} from "lucide-react";
```

- [ ] **Step 2: Añadir import de la página `Privacy`**

```tsx
import Privacy from "./Privacy";
```

- [ ] **Step 3: Insertar el navItem antes de "Configuración"**

Localizar la línea:

```tsx
  // Settings is always last
  navItems.push({ path: "/restaurant/settings", icon: Settings, label: "Configuración" });
```

Reemplazarla por:

```tsx
  // Privacy (panel del titular: consentimientos + DSAR)
  navItems.push({ path: "/restaurant/privacy", icon: ShieldCheck, label: "Privacidad" });

  // Settings is always last
  navItems.push({ path: "/restaurant/settings", icon: Settings, label: "Configuración" });
```

- [ ] **Step 4: Añadir la `<Route>` anidada**

Dentro del `<Routes>` del contenido principal, añadir (antes de `<Route path="settings" ...>`):

```tsx
          <Route path="privacy" element={<Privacy />} />
```

- [ ] **Step 5: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: entra a `/restaurant` como owner, verifica la pestaña "Privacidad" y que carga `/restaurant/privacy` con ConsentManager + DsarForm + lista DSAR.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/pages/restaurant/Dashboard.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): navItem + ruta Privacidad en restaurant Dashboard (panel del titular)"
```

---

## Task 21: Componente `FirstLoginPrivacyModal.tsx` + integración

**Files:**
- Create: `C:/Users/angel/Desktop/Code/SaaS suchi/src/components/privacy/FirstLoginPrivacyModal.tsx`
- Modify: `C:/Users/angel/Desktop/Code/SaaS suchi/src/pages/restaurant/Dashboard.tsx`

- [ ] **Step 1: Crear el componente `FirstLoginPrivacyModal.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Modal, Button, Alert } from "../ui";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import {
  hasAnyConsent,
  grantConsent,
} from "../../services/privacyService";
import { useAuth } from "../../hooks/useAuth";

interface FirstLoginPrivacyModalProps {
  /** Forzar visible (debug). Por defecto se muestra solo si no hay consentimientos. */
  forceOpen?: boolean;
}

/**
 * Modal obligatorio al primer login owner/staff (Ley 21.719 — transparencia).
 * Se muestra si no existe ningún consentimiento para el email del usuario.
 * Registra en `consents` con proof { via: 'first_login_modal' }.
 */
export const FirstLoginPrivacyModal: React.FC<FirstLoginPrivacyModalProps> = ({
  forceOpen = false,
}) => {
  const { user, profile } = useAuth();
  const email = user?.email ?? "";
  const subjectId = user?.id ?? null;

  const [open, setOpen] = useState(forceOpen);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || forceOpen) {
      setOpen(forceOpen);
      return;
    }
    let active = true;
    (async () => {
      const exists = await hasAnyConsent(email);
      if (active) setOpen(!exists);
    })();
    return () => {
      active = false;
    };
  }, [email, forceOpen]);

  const handleAccept = async () => {
    setError(null);
    if (!acceptedTerms) {
      setError("Debes aceptar la política para continuar.");
      return;
    }
    if (!email) {
      setError("No se pudo resolver tu email.");
      return;
    }
    setSaving(true);

    // Servicio (necesario, contract): siempre granted.
    const ok1 = await grantConsent({
      subjectId,
      subjectEmail: email,
      scope: "cookies",
      purpose:
        "Tratamiento necesario para la prestación del servicio (base: contrato).",
      legalBasis: "contract",
      granted: true,
      via: "first_login_modal",
    });

    let ok2 = true;
    if (marketing) {
      ok2 = await grantConsent({
        subjectId,
        subjectEmail: email,
        scope: "marketing",
        purpose: "Comunicaciones comerciales.",
        legalBasis: "consent",
        granted: true,
        via: "first_login_modal",
      });
    }

    let ok3 = true;
    if (analytics) {
      ok3 = await grantConsent({
        subjectId,
        subjectEmail: email,
        scope: "analytics",
        purpose: "Analítica de uso.",
        legalBasis: "consent",
        granted: true,
        via: "first_login_modal",
      });
    }

    setSaving(false);

    if (ok1 && ok2 && ok3) {
      setOpen(false);
    } else {
      setError("Error al registrar el consentimiento. Intenta nuevamente.");
    }
  };

  return (
    <>
      <Modal
        isOpen={open}
        onClose={() => {
          /* No se puede cerrar sin aceptar la política */
        }}
        title="Aviso de Privacidad"
        size="lg"
        showCloseButton={false}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <p className="text-text">
              Bienvenido{profile?.display_name ? `, ${profile.display_name}` : ""}.
              Antes de continuar revisa nuestra política de privacidad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPolicyOpen(true)}
            className="text-accent underline text-sm"
          >
            Leer política de privacidad completa
          </button>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span className="text-sm text-text">
              He leído y acepto la política de privacidad. Consiento el
              tratamiento de mis datos para la prestación del servicio
              (necesario, no revocable sin cancelar la cuenta).
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span className="text-sm text-text">
              Consiento recibir comunicaciones de marketing (revocable).
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            <span className="text-sm text-text">
              Consiento la analítica de uso del producto (revocable).
            </span>
          </label>

          {error && <Alert type="error" message={error} />}

          <div className="flex justify-end">
            <Button onClick={handleAccept} loading={saving} disabled={!acceptedTerms}>
              Aceptar y continuar
            </Button>
          </div>
        </div>
      </Modal>

      <PrivacyPolicyModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
      />
    </>
  );
};

export default FirstLoginPrivacyModal;
```

- [ ] **Step 2: Integrar el modal en `restaurant/Dashboard.tsx`**

En `src/pages/restaurant/Dashboard.tsx`, añadir el import (junto al import de `Privacy` añadido en Task 20):

```tsx
import { FirstLoginPrivacyModal } from "../../components/privacy/FirstLoginPrivacyModal";
```

Y renderizar el modal justo antes del `<footer>` final de cierre, dentro del `<div className="min-h-screen ...">`:

```tsx
      {/* Aviso de privacidad obligatorio al primer login (Ley 21.719) */}
      <FirstLoginPrivacyModal />

      {/* Footer Branding */}
```

- [ ] **Step 3: Verificación**

```bash
cd "C:/Users/angel/Desktop/Code/SaaS suchi" && npm run build
```
Output esperado: build exitoso.
Smoke test: con un usuario owner que no tenga consentimientos previos, entra a `/restaurant` y verifica que aparece el modal obligatorio. Tras aceptar, al recargar no debe reaparecer (porque `hasAnyConsent` devuelve true).

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" add src/components/privacy/FirstLoginPrivacyModal.tsx src/pages/restaurant/Dashboard.tsx
git -C "C:/Users/angel/Desktop/Code/SaaS suchi" commit -m "feat(privacy): FirstLoginPrivacyModal + integracion en restaurant Dashboard (aviso in-app B2B)"
```

---

## Verificación de cobertura §3 (control de gaps)

Tras implementar las 21 tareas, ejecutar este checklist de cobertura frente al spec §3:

- [ ] **§3.1 Documentos legales:** texto B2B y de clientes incluido en `PrivacyPolicyModal` (Task 11), `public/Privacy.tsx` (Task 13) y `public/PrivacyClients.tsx` (Task 14). **GAP intencional:** los 4 documentos `.md` formales en `docs/legal/` (incluido `terminos_y_condiciones.md` con checkbox en `/register` y `VERSION.md`) NO se crean en esta capa — pertenecen a la Capa 4 (Gobernanza). El texto embebido en los componentes es un borrador accionable con disclaimer.
- [ ] **§3.2 DSAR — 6 endpoints:** Tasks 3-8 cubren access, rectify, erase, object, export, revoke-consent. Todos crean evidencia en `data_subject_requests` con SLA y `verification_token`. Rate-limit 3/mes implementado. Anonimización legal (SII 6 años) en erase. Portabilidad JSON+CSV en export. Cumplido.
- [ ] **§3.3 Rutas frontend:** `/legal/privacidad` (Task 13/18), `/legal/privacidad-clientes` (Task 14/18), `/legal/contacto-dpo` (Task 15/18), `/account/privacy` → implementada como `/restaurant/privacy` (Task 16/20), `/admin/privacy` (Task 17/19). **GAPS intencionales (fuera de scope MVP):**
  - `/account/privacy/export` como ruta propia: se reemplaza por el botón "Descargar mis datos" dentro de `restaurant/Privacy.tsx` (Task 16). Misma funcionalidad.
  - `/menu/:slug/privacidad`: no se crea una página dedicada; el cliente final usa `/legal/privacidad-clientes` (pública) y el banner de cookies. Si se requiere una versión corta embebida en el menú, dejar como tarea futura (Capa 2.1).
- [ ] **§3.4 Componentes nuevos:** `ConsentManager` (Task 10), `CookieBanner` (Task 9), `DsarForm` (Task 12), `PrivacyPolicyModal` (Task 11). Cumplido.
- [ ] **§3.5 Canal DPO:** `DPO_EMAIL = "dpo@cmorflow.cl"` (Task 1), formulario `/legal/contacto-dpo` graba con `request_type='contact'` (Task 15), SLA 30 días publicado. Cumplido.
- [ ] **§3.6 Backups:** `privacy-erase` (Task 5) anonimiza campos y registra en `audit_log`; los backups viejos expiran naturalmente y el dato queda inaccesible vía RLS. **GAP:** no se invalidan URLs firmadas de Storage en esta capa (no hay assets de cliente asociados al email hoy); documentar si se añaden logos de clientes en el futuro.
- [ ] **§3.7 Aviso in-app B2B:** `FirstLoginPrivacyModal` (Task 21) se muestra si no hay `consents`, registra con `proof.via='first_login_modal'`, cubre los 3 checkboxes (política, marketing, analítica). Cumplido.

### Notas de consistencia entre tareas
- `privacyService` expone `requestAccess/requestRectify/requestErase/requestObject/requestExport/requestRevokeConsent` → consumidos por `DsarForm` (Task 12) con los mismos nombres.
- `getMyConsents`/`revokeConsentScope`/`grantConsent` (Task 2) → consumidos por `ConsentManager` (Task 10), `CookieBanner` (Task 9) y `FirstLoginPrivacyModal` (Task 21).
- `listAllDsars`/`updateDsarStatus` (Task 2) → consumidos por `admin/Privacy.tsx` (Task 17).
- `listMyDsars` (Task 2) → consumido por `restaurant/Privacy.tsx` (Task 16).
- `contactDpo` (Task 2) → consumido por `public/ContactDpo.tsx` (Task 15).
- `CURRENT_POLICY_VERSION` y `DPO_EMAIL` (Task 1) → usados en Tasks 9, 11, 13, 14, 15.

---

## Verificación final de la Capa 2

- [ ] `npm run build` pasa sin errores TS.
- [ ] Las 6 Edge Functions deployadas (`npx supabase functions deploy <nombre> --no-verify-jwt`) responden 200 a sus curls.
- [ ] Navegación manual: `/legal/privacidad`, `/legal/privacidad-clientes`, `/legal/contacto-dpo`, `/restaurant/privacy`, `/admin/privacy`.
- [ ] Banner de cookies aparece y sus 3 botones persisten en `localStorage`.
- [ ] `FirstLoginPrivacyModal` aparece solo la primera vez y graba en `consents`.
- [ ] Un DSAR de prueba (access) crea fila en `data_subject_requests` y entrada en `audit_log`.

---

## Qué cubre esta capa del spec

| Requisito Ley 21.719 | Dónde se cubre |
|---|---|
| 3. Transparencia | Tasks 11, 13, 14 (política + avisos) + Task 21 (aviso in-app) |
| 4. Derechos del titular (DSAR) | Tasks 3-8 (6 endpoints) + Tasks 12, 16, 17 (UI) |
| 1. Base legal + consentimiento (parte UI) | Tasks 9, 10, 21 (consentimiento granular + revocación) |

## Qué NO cubre (otras capas)
- Documentos legales formales en `docs/legal/` con `VERSION.md` → Capa 4 (Gobernanza).
- Plantillas de brecha, AIPD, security-check → Capa 3 (Operacional).
- RPC `privacy_fulfill_request` automática → no se necesita: el admin cumple manualmente vía `updateDsarStatus` (RLS `dsr_admin_all`).
