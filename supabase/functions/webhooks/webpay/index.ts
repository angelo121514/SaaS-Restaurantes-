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
const WEBPAY_API_KEY = Deno.env.get("WEBPAY_API_KEY") || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://app.cmorflow.cl";

export async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    let tokenWs = url.searchParams.get("token_ws");
    let tbkToken = url.searchParams.get("tbk_token");

    // Transbank redirige mediante POST con Content-Type: application/x-www-form-urlencoded
    if (req.method === "POST") {
      try {
        const formData = await req.formData();
        if (formData.has("token_ws")) {
          tokenWs = formData.get("token_ws") as string;
        }
        if (formData.has("tbk_token")) {
          tbkToken = formData.get("tbk_token") as string;
        }
      } catch (err) {
        console.error("Error parsing form data:", err);
      }
    }

    const token = tokenWs || tbkToken;

    if (!token) {
      console.error("No token_ws or tbk_token found in request");
      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=no_token`);
    }

    // Caso: El usuario canceló la transacción en el portal de Webpay
    if (tbkToken && !tokenWs) {
      console.log("User cancelled transaction, token:", tbkToken);
      
      // Buscar el intent de pago y marcarlo como cancelado
      const { data: paymentIntent, error: piError } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("webpay_token", tbkToken)
        .single();

      if (piError || !paymentIntent) {
        console.error("Payment intent not found for cancelled token:", tbkToken);
        return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=intent_not_found`);
      }

      await supabase
        .from("payment_intents")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentIntent.id);

      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=user_cancelled&buy_order=${encodeURIComponent(paymentIntent.buy_order || "")}&amount=${paymentIntent.amount || ""}`);
    }

    // Caso: Transacción completada (tenemos token_ws), procedemos a confirmar
    console.log("Confirmando transacción en Transbank con token:", tokenWs);
    const confirmResponse = await fetch(
      `${WEBPAY_API_URL}/rswebpaytransaction/api/webpay/v1.2/transactions/${tokenWs}`,
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
      
      // Intentar actualizar el intent de pago a 'rejected' si podemos encontrarlo
      const { data: paymentIntent } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("webpay_token", tokenWs)
        .single();
        
      if (paymentIntent) {
        await supabase
          .from("payment_intents")
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentIntent.id);
      }

      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=confirm_failed&buy_order=${encodeURIComponent(paymentIntent?.buy_order || "")}&amount=${paymentIntent?.amount || ""}`);
    }

    const transaction = await confirmResponse.json();
    console.log("Resultado confirmación Transbank:", transaction.status, transaction.buy_order);

    // 2. Verificar que el pago fue aprobado
    if (transaction.status !== "AUTHORIZED") {
      console.error("Webpay transaction not authorized:", transaction.status);
      
      const { data: paymentIntent } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("webpay_token", tokenWs)
        .single();
        
      if (paymentIntent) {
        await supabase
          .from("payment_intents")
          .update({
            status: "rejected",
            webpay_response: transaction,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentIntent.id);
      }

      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=${transaction.status}&buy_order=${encodeURIComponent(transaction.buy_order)}&amount=${transaction.amount}`);
    }

    // 3. Buscar payment_intent por buy_order
    const { data: paymentIntent, error: piError } = await supabase
      .from("payment_intents")
      .select("*")
      .eq("buy_order", transaction.buy_order)
      .single();

    if (piError || !paymentIntent) {
      console.error("Payment intent not found for buy_order:", transaction.buy_order);
      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=intent_not_found&buy_order=${encodeURIComponent(transaction.buy_order)}&amount=${transaction.amount}`);
    }

    // 4. Validar que el monto coincida
    if (transaction.amount !== paymentIntent.amount) {
      console.error("Amount mismatch:", transaction.amount, "vs", paymentIntent.amount);
      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=amount_mismatch&buy_order=${encodeURIComponent(transaction.buy_order)}&amount=${transaction.amount}`);
    }

    // 5. Actualizar payment_intent
    await supabase
      .from("payment_intents")
      .update({
        status: "authorized",
        webpay_response: transaction,
        authorized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=activate_failed&buy_order=${encodeURIComponent(transaction.buy_order)}&amount=${transaction.amount}`);
    }

    const result = Array.isArray(activateResult) ? activateResult[0] : activateResult;
    if (!result?.success) {
      console.error("Activate restaurant failed:", result);
      return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=activate_failed&buy_order=${encodeURIComponent(transaction.buy_order)}&amount=${transaction.amount}`);
    }

    // 6.5 Obtener datos de la solicitud de registro para el flujo de frontend
    const { data: regRequest } = await supabase
      .from("registration_requests")
      .select("email, owner_name")
      .eq("id", paymentIntent.registration_request_id)
      .single();

    // 7. Redirigir al setup-password del nuevo owner, incluyendo detalles de la transacción para las evidencias
    const queryParams = new URLSearchParams({
      request_id: paymentIntent.registration_request_id,
      restaurant_id: String(result.restaurant_id),
      email: regRequest?.email || "",
      owner_name: regRequest?.owner_name || "",
      buy_order: transaction.buy_order,
      amount: String(transaction.amount),
      authorization_code: transaction.authorization_code,
      card_number: transaction.card_detail?.card_number || "",
      transaction_date: transaction.transaction_date,
      payment_type_code: transaction.payment_type_code,
    });
    return Response.redirect(`${PUBLIC_APP_URL}/setup-password?${queryParams.toString()}`);
  } catch (err) {
    console.error("webhook webpay error:", err);
    return Response.redirect(`${PUBLIC_APP_URL}/payment/error?reason=internal_error`);
  }
}

if (import.meta.main) {
  Deno.serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    return await handler(req);
  });
}

