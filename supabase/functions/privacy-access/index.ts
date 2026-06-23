// =====================================================================
// Edge Function: privacy-access — P0-3 + P0-5 Remediación
// Derecho de ACCESO (Ley 21.719 art. 19). SLA: 10 días hábiles.
//
// CAMBIOS P0-3 + P0-5:
//   1. CORS restringido (vía _shared/cors.ts).
//   2. Si el solicitante no está autenticado (JWT válido con email coincidente),
//      se crea DSAR 'pending_verification' y se envía email con token.
//      La acción se ejecuta solo tras click en el link (Edge Function verify-dsar).
//   3. NO se retorna verification_token en la respuesta HTTP.
//   4. Rate-limit por IP + email.
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
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

const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLA_DAYS = 10; // Ley 21.719 art. 19 (días hábiles)

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
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "access");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "access") {
      return jsonResponse(req, { success: false, error: "type debe ser 'access'" }, 400);
    }

    // Rate-limit por IP + email
    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, ip, email);
    if (!rl.allowed) {
      return jsonResponse(req, { success: false, error: "Límite de solicitudes alcanzado", reason: rl.reason }, 429);
    }

    // Verificar identidad del solicitante
    const identity = await verifyRequesterIdentity(supabaseAuth, req, email);

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    if (!identity.authorized) {
      // Crear DSAR pendiente de verificación
      const verificationToken = crypto.randomUUID();
      const { data: inserted, error: insErr } = await supabase
        .from("data_subject_requests")
        .insert([
          {
            request_type: "access",
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
      const verificationUrl = `${Deno.env.get("PUBLIC_APP_URL") || "https://app.cmorflow.cl"}/verify-dsar?token=${verificationToken}`;
      await sendVerificationEmail(email, "access", verificationUrl);

      // NO retornar verification_token
      return jsonResponse(req, {
        success: true,
        requestId: inserted.id,
        status: "pending_verification",
        message: "Hemos enviado un correo de verificación a " + email + ".",
      }, 200);
    }

    // Identidad verificada: ejecutar directamente
    const subjectId = identity.userId;
    const { data: inserted, error: insErr } = await supabase
      .from("data_subject_requests")
      .insert([
        {
          request_type: "access",
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

    await supabase.from("audit_log").insert([
      {
        actor_email: email,
        action: "dsar_access_fulfilled",
        table_name: "data_subject_requests",
        row_id: inserted.id,
        metadata: { request_type: "access" },
      },
    ]);

    return jsonResponse(req, {
      success: true,
      requestId: inserted.id,
      status: "fulfilled",
      message: "Reporte de acceso generado.",
      data: report,
    }, 200);
  } catch (err) {
    console.error("privacy-access error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

async function sendVerificationEmail(email: string, type: string, verificationUrl: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set. URL:", verificationUrl);
    return;
  }
  const subject = "Confirma tu solicitud de acceso a datos — CMOR FLOW";
  const html = `<h2>Confirmación requerida</h2>
    <p>Hemos recibido una solicitud de <strong>acceso a datos personales</strong> para ${email}.</p>
    <p>Para confirmar, haz click: <a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>Expira en 24 horas. Si no fuiste tú, ignora este correo.</p>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "CMOR FLOW <dpo@cmorflow.cl>", to: email, subject, html }),
  });
}
