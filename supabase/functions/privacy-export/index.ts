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
