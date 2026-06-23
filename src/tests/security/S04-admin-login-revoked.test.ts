/**
 * S-04: Anti-regresión P0-4 — admin_login revocado
 * Verifica que la RPC admin_login ya no es accesible públicamente.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("S-04 · admin_login revocado (P0-4)", () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
  });

  it("anónimo NO puede llamar admin_login", async () => {
    const { data, error } = await supabase.rpc("admin_login", {
      p_email: "admin@foodorder.com",
      p_password_hash:
        "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    });

    // Tras P0-4: debe retornar error (función no encontrada o permiso denegado)
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("anónimo NO puede llamar restaurant_login", async () => {
    const { data, error } = await supabase.rpc("restaurant_login", {
      p_email: "owner@restaurante.cl",
      p_password_hash: "fake_hash",
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("pass-the-hash falla: hash conocido de admin123 no funciona", async () => {
    const { data, error } = await supabase.rpc("admin_login", {
      p_email: "admin@foodorder.com",
      p_password_hash:
        "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    });

    // Antes de P0-4: esto logueaba al admin (pass-the-hash)
    // Tras P0-4: error
    expect(error).not.toBeNull();
  });
});
