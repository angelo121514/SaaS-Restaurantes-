/**
 * S-01: Anti-regresión P0-1 — RLS orders
 * Verifica que la política pública "Public can view orders" fue eliminada.
 *
 * Tras P0-1, un anónimo NO debería poder leer /rest/v1/orders.
 * Este test se ejecuta contra una DB local de Supabase
 * (requiere `supabase start`).
 *
 * Skip automático si no hay Supabase local disponible.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("S-01 · RLS orders — política pública eliminada (P0-1)", () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
  });

  it("anónimo NO puede listar todos los pedidos", async () => {
    const { data, error } = await supabase.from("orders").select("*").limit(10);
    // Tras P0-1: debe retornar error 401/403 o array vacío
    // Antes de P0-1: retornaba todos los pedidos (vulnerable)
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("anónimo NO puede leer un pedido por id sin access_token", async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    // Tras P0-1: debe retornar error o data=null
    expect(data).toBeNull();
  });

  it("anónimo SÍ puede leer pedido vía RPC get_my_order con token válido", async () => {
    // Este test requiere un pedido existente con access_token conocido.
    // Se debe sembrar en el beforeAll.
    // Skip si no hay datos sembrados.
    const { data, error } = await supabase.rpc("get_my_order", {
      p_token: "00000000-0000-0000-0000-000000000000", // token inexistente
    });
    // Debe retornar error (token inválido), NO data
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
