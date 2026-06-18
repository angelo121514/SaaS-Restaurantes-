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
