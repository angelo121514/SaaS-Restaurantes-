// =====================================================================
// Edge Function: invite-owner
// ---------------------------------------------------------------------
// Procesa la cola `public.invitations` (status = 'pending') enviando un
// correo de invitación al nuevo owner del restaurante.
//
// Se invoca:
//   * Por un cron de Supabase (Schedule) cada N minutos, o
//   * Manualmente tras admin_create_restaurant_v2.
//
// Requiere estas variables (Supabase → Project Settings → Edge Functions
// → Secrets):
//   SUPABASE_URL            https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE   eyJ...     (NUNCA exponerla en el cliente)
//   APP_URL                 https://app.cmorflow.cl  (tu frontend)
//
// Flujo:
//   1. Lee invitaciones pendientes.
//   2. Para cada una, llama a auth.admin.inviteUserByEmail(email,
//      { data: { restaurant_id, role }, redirectTo: APP_URL + '/setup-password' }).
//      Supabase envía el email de invitación (configura plantilla en
//      Authentication → Email Templates → "Invite User").
//   3. Marca la invitación como 'sent' (o 'cancelled' si falla).
// =====================================================================
// @ts-nocheck — Deno runtime (no usa tipos de Node)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

// Cliente con service role (server-side únicamente).
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Traer invitaciones pendientes
    const { data: pending, error: qErr } = await supabase
      .from("invitations")
      .select("id, restaurant_id, email, role")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (qErr) throw qErr;
    if (!pending || pending.length === 0) {
      return json({ processed: 0 }, 200);
    }

    let processed = 0;
    let failed = 0;

    for (const inv of pending) {
      // 2. Enviar invitación (Supabase envía el email)
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        inv.email,
        {
          redirectTo: `${APP_URL}/setup-password`,
          data: {
            restaurant_id: inv.restaurant_id,
            role: inv.role,
          },
        }
      );

      if (inviteError) {
        console.error(`invite failed for ${inv.email}:`, inviteError.message);
        failed++;
        // Marcamos cancelada solo tras varios reintentos; aquí simple
        continue;
      }

      // 3. Marcar enviada
      await supabase
        .from("invitations")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", inv.id);

      processed++;
    }

    return json({ processed, failed }, 200);
  } catch (err) {
    console.error("invite-owner error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
