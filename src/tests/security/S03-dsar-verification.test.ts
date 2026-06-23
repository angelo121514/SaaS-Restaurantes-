/**
 * S-03: Anti-regresión P0-3 — DSAR con verificación
 * Verifica que privacy-erase no ejecuta la acción sin verificación.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("S-03 · DSAR con verificación de identidad (P0-3)", () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
  });

  it("anónimo llama privacy-erase → NO ejecuta directamente", async () => {
    // Llamar a la Edge Function sin JWT
    const { data, error } = await supabase.functions.invoke("privacy-erase", {
      body: { email: "test-victim@example.com", type: "erase" },
    });

    // Tras P0-3: debe retornar success: true PERO con status: "pending_verification"
    // NO debe ejecutar la acción destructiva (no borrar datos)
    expect(data?.success).toBe(true);
    expect(data?.status).toBe("pending_verification");
    expect(data?.verificationToken).toBeUndefined(); // NO retornar token
  });

  it("anónimo llama privacy-export → NO retorna datos del titular", async () => {
    const { data, error } = await supabase.functions.invoke("privacy-export", {
      body: { email: "test-victim@example.com", type: "export" },
    });

    // Tras P0-3: NO debe incluir data con los datos del titular
    expect(data?.success).toBe(true);
    expect(data?.status).toBe("pending_verification");
    expect(data?.data).toBeUndefined();
  });

  it("rate-limit: más de 3 DSAR por email en 30 días → 429", async () => {
    // Hacer 3 solicitudes (deberían pasar)
    for (let i = 0; i < 3; i++) {
      await supabase.functions.invoke("privacy-erase", {
        body: { email: "ratetest@example.com", type: "erase" },
      });
    }

    // La 4ta debe retornar 429
    const { data, error } = await supabase.functions.invoke("privacy-erase", {
      body: { email: "ratetest@example.com", type: "erase" },
    });

    expect(data?.success).toBe(false);
    expect(data?.reason).toMatch(/rate_limit/);
  });
});
