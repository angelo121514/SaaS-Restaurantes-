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
