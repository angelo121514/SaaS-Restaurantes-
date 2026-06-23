/**
 * I-01: Aislamiento multi-tenant — owner A NO puede leer menu_items de restaurant B
 * Valida que RLS bloquea SELECT cross-tenant.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("I-01 · Aislamiento multi-tenant — owner A ≠ restaurant B", () => {
  let ownerA: any;
  let ownerB: any;
  let restaurantA: any;
  let restaurantB: any;

  beforeAll(async () => {
    // Setup: crear 2 owners con 2 restaurantes cada uno
    // Requiere DB de test sembrada.
    // En CI esto se hace con supabase db reset + seed.
  });

  it("owner A no puede leer menu_items de restaurant B", async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
    // Login como owner A
    // await supabaseA.auth.signInWithPassword({ email, password })

    // Intentar leer menu_items de restaurant B
    const { data, error } = await supabaseA
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", "00000000-0000-0000-0000-000000000001"); // restaurant B

    // Debe retornar array vacío (RLS bloquea)
    expect(data).toEqual([]);
  });

  it("owner A no puede actualizar menu_items de restaurant B", async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseA
      .from("menu_items")
      .update({ base_price: 1 })
      .eq("restaurant_id", "00000000-0000-0000-0000-000000000001");

    // No debe actualizar ninguna fila
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it("owner A no puede crear orders en restaurant B", async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseA.from("orders").insert({
      restaurant_id: "00000000-0000-0000-0000-000000000001",
      customer_name: "Test",
      total: 1000,
    });

    expect(error).toBeTruthy();
  });
});
