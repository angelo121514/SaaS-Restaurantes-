// =====================================================================
// Edge Function: privacy-erase — P0-3 Remediación
// Derecho de SUPRESIÓN / CANCELACIÓN (Ley 21.719 art. 19). SLA: 10 días hábiles.
//
// CAMBIOS P0-3:
//   1. CORS restringido a dominios propios (vía _shared/cors.ts).
//   2. Verificación de identidad requerida:
//      - Si hay JWT válido Y session.user.email === body.email → directo.
//      - Si no → se crea DSAR en status 'pending', se envía email con
//        verification_token, NO se ejecuta la acción destructiva hasta
//        que el titular haga click en el link (Edge Function verify-dsar).
//   3. NO se retorna verification_token en la respuesta HTTP.
//   4. Rate-limit por IP (10/día) + por email (3/30d).
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  handleOptions,
  jsonResponse,
  getClientIp,
  verifyRequesterIdentity,
  checkRateLimit,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cliente con anon key para verificar JWT del header Authorization
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLA_DAYS = 10; // Ley 21.719 art. 19 (días hábiles — el cálculo real es en cron)
const VERIFICATION_TOKEN_TTL_HOURS = 24;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "erase");
    const skipVerification = body.skip_verification === true; // solo para usuarios autenticados

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "erase") {
      return jsonResponse(req, { success: false, error: "type debe ser 'erase'" }, 400);
    }

    // Rate-limit por IP + email
    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, ip, email);
    if (!rl.allowed) {
      return jsonResponse(
        req,
        { success: false, error: "Límite de solicitudes alcanzado", reason: rl.reason },
        429
      );
    }

    // Verificar identidad del solicitante
    const identity = await verifyRequesterIdentity(supabaseAuth, req, email);
    const isVerified = identity.authorized;

    // Si no está verificado Y no pidió skip, crear DSAR pending y enviar email
    if (!isVerified) {
      const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();
      const verificationToken = crypto.randomUUID();

      const { data: inserted, error: insErr } = await supabase
        .from("data_subject_requests")
        .insert([
          {
            request_type: "erase",
            subject_email: email,
            subject_id: null,
            status: "pending_verification",
            sla_due_at: slaDueAt,
            verification_token: verificationToken,
            requester_ip: ip,
          },
        ])
        .select("id")
        .single();

      if (insErr) throw insErr;

      // Enviar email con el verification_token
      // (Implementación: usar Resend o Supabase Auth admin.sendMessage)
      const verificationUrl = `${Deno.env.get("PUBLIC_APP_URL") || "https://app.cmorflow.cl"}/verify-dsar?token=${verificationToken}`;
      await sendVerificationEmail(email, "erase", verificationUrl);

      // NO retornar verification_token en la respuesta
      return jsonResponse(
        req,
        {
          success: true,
          requestId: inserted.id,
          status: "pending_verification",
          message: "Hemos enviado un correo de verificación a " + email + ". Haz click en el enlace para confirmar tu solicitud.",
        },
        200
      );
    }

    // Si está verificado (JWT válido), ejecutar directamente
    const subjectId = identity.userId;

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
          requester_ip: ip,
        },
      ])
      .select("id")
      .single();
    if (insErr) throw insErr;

    const result = await executeErase(supabase, email);

    await supabase
      .from("data_subject_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
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

    return jsonResponse(
      req,
      {
        success: true,
        requestId: inserted.id,
        status: "fulfilled",
        message: "Supresión ejecutada. Tus datos personales fueron anonimizados o eliminados según obligación legal.",
        data: result,
      },
      200
    );
  } catch (err) {
    console.error("privacy-erase error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

// =====================================================================
// Ejecuta la supresión/anonimización. Extraída para reuso desde verify-dsar.
// =====================================================================
export async function executeErase(supabase: any, email: string) {
  const nowIso = new Date().toISOString();
  let customersAnon = 0;
  let ordersAnon = 0;
  let prospectsDeleted = 0;
  let invitationsDeleted = 0;
  let consentsRevoked = 0;

  const { data: matchedCustomers } = await supabase
    .from("restaurant_customers")
    .select("id")
    .ilike("email", email);
  const customerIds = (matchedCustomers ?? []).map((c: any) => c.id);

  if (customerIds.length) {
    await supabase
      .from("restaurant_customers")
      .update({ name: "[anónimo]", phone: "[anónimo]", email: null, notes: null })
      .in("id", customerIds);
    customersAnon = customerIds.length;

    const { count: oCount } = await supabase
      .from("orders")
      .update({ customer_name: null, customer_phone: null, customer_notes: null })
      .in("customer_id", customerIds)
      .select("*", { count: "exact", head: true });
    ordersAnon = oCount ?? 0;
  }

  const { count: delProspects } = await supabase
    .from("registration_requests")
    .delete()
    .ilike("email", email)
    .select("*", { count: "exact", head: true });
  prospectsDeleted = delProspects ?? 0;

  const { count: delInv } = await supabase
    .from("invitations")
    .delete()
    .ilike("email", email)
    .select("*", { count: "exact", head: true });
  invitationsDeleted = delInv ?? 0;

  const { count: revoked } = await supabase
    .from("consents")
    .update({ granted: false, revoked_at: nowIso })
    .ilike("subject_email", email)
    .eq("granted", true)
    .select("*", { count: "exact", head: true });
  consentsRevoked = revoked ?? 0;

  return {
    customers_anonymized: customersAnon,
    orders_anonymized_personal: ordersAnon,
    prospects_deleted: prospectsDeleted,
    invitations_deleted: invitationsDeleted,
    consents_revoked: consentsRevoked,
    note_b2b: "La cuenta owner/staff no se elimina en este endpoint (requiere cancelación de contrato).",
  };
}

// =====================================================================
// Envío de email de verificación (stub — completar con Resend/SES).
// =====================================================================
async function sendVerificationEmail(email: string, type: string, verificationUrl: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — verification email not sent. URL:", verificationUrl);
    // En staging/dev, loggear URL para pruebas
    return;
  }

  const subject = "Confirma tu solicitud de supresión de datos — CMOR FLOW";
  const html = `
    <h2>Confirmación requerida</h2>
    <p>Hemos recibido una solicitud de <strong>supresión de datos personales</strong> para tu correo ${email}.</p>
    <p>Para confirmar que eres tú, haz click en el siguiente enlace (expira en ${VERIFICATION_TOKEN_TTL_HOURS} horas):</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>Si no fuiste tú, ignora este correo — no se realizará ninguna acción.</p>
    <hr>
    <p style="color:#666;font-size:12px;">CMOR FLOW · dpo@cmorflow.cl</p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CMOR FLOW <dpo@cmorflow.cl>",
      to: email,
      subject,
      html,
    }),
  });
}
