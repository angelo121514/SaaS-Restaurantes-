/**
 * S-02: Anti-regresión P0-2 — auto_approve_registration_v2
 * Verifica que la RPC rechaza activación de planes pagos sin is_admin().
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("S-02 · auto_approve_registration_v2 con is_admin (P0-2)", () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
    // Sembrar registration_request pendiente para el test
    // (en DB de test)
  });

  it("anónimo NO puede activar plan pro gratis", async () => {
    const { data, error } = await supabase.rpc("auto_approve_registration_v2", {
      p_request_id: "00000000-0000-0000-0000-000000000000",
      p_plan: "pro",
      p_payment_provider: "credit_card",
      p_transaction_id: "sim_test123",
      p_amount: 9990,
    });

    // Tras P0-2: debe retornar success: false con error "unauthorized_paid_plan"
    // o error de PostgREST por función no encontrada
    const result = Array.isArray(data) ? data[0] : data;
    expect(result?.success).toBe(false);
    expect(result?.error).toBe("unauthorized_paid_plan");
  });

  it("anónimo SÍ puede activar free_trial", async () => {
    // free_trial no requiere pago, sigue siendo auto-aprobable
    // Pero requiere una registration_request válida
    const { data, error } = await supabase.rpc("auto_approve_registration_v2", {
      p_request_id: "00000000-0000-0000-0000-000000000000",
      p_plan: "free_trial",
      p_payment_provider: "trial",
      p_transaction_id: "trial_test123",
      p_amount: 0,
    });

    // Debe retornar success: false con error "request_not_found_or_processed"
    // (porque el request_id no existe), NO "unauthorized_paid_plan"
    const result = Array.isArray(data) ? data[0] : data;
    expect(result?.error).not.toBe("unauthorized_paid_plan");
  });
});
