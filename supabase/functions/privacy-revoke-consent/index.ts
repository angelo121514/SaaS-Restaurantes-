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
