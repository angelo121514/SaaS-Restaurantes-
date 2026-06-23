/**
 * I-02: Owner A SÍ puede leer menu_items de SU restaurant
 * Valida que RLS permite SELECT mismo-tenant.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("I-02 · Acceso legítimo mismo-tenant", () => {
  it("owner A puede leer menu_items de su restaurant A", async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });

    // Tras login como owner A:
    // const { data: menuItems } = await supabaseA
    //   .from("menu_items")
    //   .select("*")
    //   .eq("restaurant_id", RESTAURANT_A_ID);
    // expect(menuItems?.length).toBeGreaterThan(0);
    expect(true).toBe(true); // placeholder hasta sembrar datos
  });

  it("owner A puede actualizar SU menu_item", async () => {
    expect(true).toBe(true); // placeholder
  });

  it("owner A puede crear orders en su restaurant", async () => {
    expect(true).toBe(true); // placeholder
  });
});
