// =====================================================================
// Edge Function: webhook Webpay — P1-7
// Recibe la confirmación de Transbank tras el pago.
// Flujo:
//   1. Webpay llama a este endpoint con { token_ws } (GET callback)
//   2. Esta función valida la transacción contra Transbank API
//   3. Si está aprobada, activa el restaurante (llama RPC interna)
//   4. Redirige al frontend con resultado
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WEBPAY_API_URL = Deno.env.get("WEBPAY_ENVIRONMENT") === "production"
  ? "https://webpay3g.transbank.cl"
  : "https://webpay3gint.transbank.cl";

const WEBPAY_COMMERCE_CODE = Deno.env.get("WEBPAY_COMMERCE_CODE") || "597055555532";
const WEBPAY_API_KEY = Deno.env.get("WEBPAY_API_KEY") || "579B516A3B7D4A2E1B6F8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0";

const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://app.cmorflow.cl";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const url = new URL(req.url);

    // Webpay hace GET con token_ws como query param (callback de retorno)
    if (req.method === "GET") {
      const tokenWs = url.searchParams.get("token_ws");
      if (!tokenWs) {
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=no_token`);
      }

      // 1. Confirmar transacción con Transbank
      const confirmResponse = await fetch(
        `${WEBPAY_API_URL}/rswebpay/transactions/api/webpay/v1.2/transactions/${tokenWs}`,
        {
          method: "PUT",
          headers: {
            "Tbk-Api-Key-Id": WEBPAY_COMMERCE_CODE,
            "Tbk-Api-Key-Secret": WEBPAY_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!confirmResponse.ok) {
        console.error("Webpay confirm error:", confirmResponse.status);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=confirm_failed`);
      }

      const transaction = await confirmResponse.json();

      // 2. Verificar que el pago fue aprobado
      if (transaction.status !== "AUTHORIZED") {
        console.error("Webpay transaction not authorized:", transaction.status);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=${transaction.status}`);
      }

      // 3. Buscar payment_intent por buy_order
      const { data: paymentIntent, error: piError } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("buy_order", transaction.buy_order)
        .single();

      if (piError || !paymentIntent) {
        console.error("Payment intent not found for buy_order:", transaction.buy_order);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=intent_not_found`);
      }

      // 4. Validar que el monto coincida
      if (transaction.amount !== paymentIntent.amount) {
        console.error("Amount mismatch:", transaction.amount, "vs", paymentIntent.amount);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=amount_mismatch`);
      }

      // 5. Actualizar payment_intent
      await supabase
        .from("payment_intents")
        .update({
          status: "authorized",
          webpay_response: transaction,
          authorized_at: new Date().toISOString(),
        })
        .eq("id", paymentIntent.id);

      // 6. Activar restaurante (llamar auto_approve_registration_v2 con service_role)
      const { data: activateResult, error: activateError } = await supabase
        .rpc("auto_approve_registration_v2", {
          p_request_id: paymentIntent.registration_request_id,
          p_plan: paymentIntent.plan,
          p_payment_provider: "webpay",
          p_transaction_id: transaction.buy_order,
          p_amount: transaction.amount,
        });

      if (activateError) {
        console.error("Activate restaurant error:", activateError);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=activate_failed`);
      }

      const result = Array.isArray(activateResult) ? activateResult[0] : activateResult;
      if (!result?.success) {
        console.error("Activate restaurant failed:", result);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=activate_failed`);
      }

      // 7. Redirigir al setup-password del nuevo owner
      return Response.redirect(
        `${PUBLIC_APP_URL}/setup-password?request_id=${paymentIntent.registration_request_id}&restaurant_id=${result.restaurant_id}`
      );
    }

    // POST no esperado (Webpay usa GET para callback)
    return jsonResponse(req, { error: "method not allowed" }, 405);
  } catch (err) {
    console.error("webhook webpay error:", err);
    return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=internal_error`);
  }
});
