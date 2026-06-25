// =====================================================================
// Edge Function: webhooks — Router
// Enruta las llamadas de webhooks (Webpay, etc.) a sus respectivos
// manejadores basándose en la ruta de la URL.
// =====================================================================
import { handleOptions } from "../_shared/cors.ts";
import { handler as webpayHandler } from "./webpay/index.ts";

Deno.serve(async (req) => {
  // Manejo de CORS preflight
  const options = handleOptions(req);
  if (options) return options;

  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[webhooks-router] Recibida petición: ${req.method} ${path}`);

  // Enrutar a Webpay
  if (path.endsWith("/webpay") || path.includes("/webhooks/webpay")) {
    return await webpayHandler(req);
  }

  return new Response(
    JSON.stringify({ error: "webhook route not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});
