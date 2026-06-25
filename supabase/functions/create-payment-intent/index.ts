// =====================================================================
// Edge Function: create-payment-intent — P1-7
// Crea una intención de pago en Webpay Plus (Transbank) y retorna la URL
// a la que el frontend debe redirigir al usuario.
//
// Flujo:
//   1. Frontend llama con { registration_request_id, plan, amount }
//   2. Esta función valida contra Transbank API
//   3. Retorna { url, token } para redirigir
//   4. Tras pago, Transbank llama webhook /webhooks/webpay
//   5. El webhook valida firma y activa el restaurante
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Webpay config — usar INTEGRATION para sandbox, PRODUCTION para prod
const WEBPAY_API_URL = Deno.env.get("WEBPAY_ENVIRONMENT") === "production"
  ? "https://webpay3g.transbank.cl"
  : "https://webpay3gint.transbank.cl";

const WEBPAY_COMMERCE_CODE = Deno.env.get("WEBPAY_COMMERCE_CODE") || "597055555532"; // código integración
const WEBPAY_API_KEY = Deno.env.get("WEBPAY_API_KEY") || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://app.cmorflow.cl";

interface PlanConfig {
  amount: number; // en CLP
  name: string;
}

const PLANS: Record<string, PlanConfig> = {
  starter: { amount: 50, name: "Plan Starter (Prueba $50)" },
  pro: { amount: 24900, name: "Plan Pro (mensual)" },
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json().catch(() => ({}));
    const registrationRequestId = body.registration_request_id;
    const plan = body.plan;

    if (!registrationRequestId || !plan) {
      return jsonResponse(req, {
        success: false,
        error: "registration_request_id y plan son requeridos",
      }, 200);
    }

    if (!PLANS[plan]) {
      return jsonResponse(req, {
        success: false,
        error: "plan inválido. Valores: starter, pro",
      }, 200);
    }

    // Para free_trial, no se requiere pago
    if (plan === "free_trial") {
      return jsonResponse(req, {
        success: false,
        error: "free_trial no requiere pago. Usa auto_approve_registration_v2 directamente.",
      }, 200);
    }

    // 1. Verificar que el registration_request existe y está pendiente
    const { data: request, error: reqError } = await supabase
      .from("registration_requests")
      .select("id, restaurant_name, email, status")
      .eq("id", registrationRequestId)
      .eq("status", "pending")
      .single();

    if (reqError || !request) {
      return jsonResponse(req, {
        success: false,
        error: "registration_request no encontrada o ya procesada",
      }, 200);
    }

    // 2. Generar buy_order único (máximo 26 caracteres para Transbank)
    const buyOrder = `C-${registrationRequestId.slice(0, 6)}-${Date.now().toString().slice(-10)}`;
    const sessionId = `session-${registrationRequestId}`;
    const amount = PLANS[plan].amount;
    // Si la URL de Supabase es la interna de Docker (kong), usamos localhost:54321 expuesto
    const returnUrl = SUPABASE_URL.includes("kong")
      ? `http://localhost:54321/functions/v1/webhooks/webpay`
      : `${SUPABASE_URL}/functions/v1/webhooks/webpay`;

    // 3. Llamar a Webpay para crear transacción
    const webpayResponse = await fetch(
      `${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions`,
      {
        method: "POST",
        headers: {
          "Tbk-Api-Key-Id": WEBPAY_COMMERCE_CODE,
          "Tbk-Api-Key-Secret": WEBPAY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: amount,
          return_url: returnUrl,
        }),
      }
    );

    if (!webpayResponse.ok) {
      const errText = await webpayResponse.text();
      console.error("Webpay API error:", webpayResponse.status, errText);
      return jsonResponse(req, {
        success: false,
        error: "webpay_api_error",
        details: errText,
      }, 200);
    }

    const webpayData = await webpayResponse.json();

    // 4. Guardar referencia en DB (para el webhook)
    await supabase.from("payment_intents").insert({
      registration_request_id: registrationRequestId,
      buy_order: buyOrder,
      session_id: sessionId,
      amount: amount,
      plan: plan,
      webpay_token: webpayData.token,
      status: "pending",
      provider: "webpay",
      created_at: new Date().toISOString(),
    });

    // 5. Retornar URL + token para redirigir
    return jsonResponse(req, {
      success: true,
      url: webpayData.url,
      token: webpayData.token,
      buy_order: buyOrder,
      amount: amount,
      plan: plan,
    }, 200);
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});
