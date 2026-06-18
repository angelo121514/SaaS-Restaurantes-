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
