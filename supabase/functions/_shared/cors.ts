// =====================================================================
// CORS Helper compartido — P0-5 Plan de Remediación Segura
// Restringe CORS a dominios propios en vez de `*`.
// Importar desde todas las Edge Functions.
// =====================================================================

export const ALLOWED_ORIGINS = [
  "https://app.cmorflow.cl",
  "https://cmor-flow.vercel.app",
  "https://cmor-flow-staging.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// =====================================================================
// Helper de verificación de identidad — P0-3 Plan de Remediación
// Reemplaza el flujo vulnerable que ejecutaba la acción destructiva
// sin verificar propiedad del email.
// =====================================================================

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Verifica identidad del solicitante DSAR.
 * - Si hay JWT válido en Authorization header y el email coincide con el del
 *   usuario autenticado, se permite directamente.
 * - Si no, se requiere verificación por email (token enviado por correo).
 * Esta función solo valida el caso JWT. La verificación por token la hace
 * la Edge Function `verify-dsar`.
 */
export async function verifyRequesterIdentity(
  supabase: any,
  req: Request,
  requestedEmail: string
): Promise<{ authorized: boolean; reason?: string; userId?: string }> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, reason: "no_jwt" };
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { authorized: false, reason: "invalid_jwt" };
  }

  const userEmail = (data.user.email || "").toLowerCase().trim();
  if (userEmail !== requestedEmail.toLowerCase().trim()) {
    return { authorized: false, reason: "email_mismatch" };
  }

  return { authorized: true, userId: data.user.id };
}

/**
 * Rate limit por IP + email para DSAR.
 * Límites: 10 DSAR/IP/día, 3 DSAR/email/30 días.
 */
export async function checkRateLimit(
  supabase: any,
  ip: string,
  email: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Por IP
  if (ip !== "unknown") {
    const { count: ipCount } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("requester_ip", ip)
      .gte("created_at", oneDayAgo);
    if ((ipCount ?? 0) >= 10) {
      return { allowed: false, reason: "ip_rate_limit" };
    }
  }

  // Por email
  const { count: emailCount } = await supabase
    .from("data_subject_requests")
    .select("*", { count: "exact", head: true })
    .eq("subject_email", email)
    .gte("created_at", thirtyDaysAgo);
  if ((emailCount ?? 0) >= 3) {
    return { allowed: false, reason: "email_rate_limit" };
  }

  return { allowed: true };
}
