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
import {
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLA_DAYS = 30;
const VALID_SCOPES = new Set([
  "cookies",
  "marketing",
  "ai_profiling",
  "analytics",
  "third_party_share",
]);

Deno.serve(async (req) => {
  const options = handleOptions(req); if (options) return options;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "object");
    const payload = body.payload || {};
    const scope = String(payload.scope || "");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "object") {
      return jsonResponse(req, { success: false, error: "type debe ser 'object'" }, 400);
    }
    if (!VALID_SCOPES.has(scope)) {
      return jsonResponse(req, 
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
      return jsonResponse(req, 
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
      .select("id")
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

    return jsonResponse(req, 
      {
        success: true,
        requestId: inserted.id,
        message: `Te has opuesto al tratamiento '${scope}'. Se detuvo inmediatamente.`,
        data: result,
      },
      200
    );
  } catch (err) {
    console.error("privacy-object error:", err);
    return jsonResponse(req, { success: false, error: String(err) }, 500);
  }
});
