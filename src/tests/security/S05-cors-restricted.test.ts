/**
 * S-05: Anti-regresión P0-5 — CORS restringido
 * Verifica que las Edge Functions rechazan requests de orígenes no permitidos.
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON = process.env.VITE_TEST_SUPABASE_ANON_KEY || "";

const skipIfNoSupabase = SUPABASE_ANON ? describe : describe.skip;

skipIfNoSupabase("S-05 · CORS restringido en Edge Functions (P0-5)", () => {
  const EVIL_ORIGIN = "https://evil-attacker.com";
  const ALLOWED_ORIGIN = "http://localhost:5173";

  it("Edge Function privacy-erase rechaza Origin malicioso", async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/privacy-erase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Origin: EVIL_ORIGIN,
        },
        body: JSON.stringify({ email: "test@example.com", type: "erase" }),
      }
    );

    // Tras P0-5: el header Access-Control-Allow-Origin debe ser "null"
    // (no el origin del atacante, ni "*")
    const corsHeader = response.headers.get("Access-Control-Allow-Origin");
    expect(corsHeader).toBe("null");
  });

  it("Edge Function privacy-erase acepta Origin permitido", async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/privacy-erase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Origin: ALLOWED_ORIGIN,
        },
        body: JSON.stringify({ email: "test@example.com", type: "erase" }),
      }
    );

    const corsHeader = response.headers.get("Access-Control-Allow-Origin");
    expect(corsHeader).toBe(ALLOWED_ORIGIN);
  });

  it("Headers de seguridad presentes en Vercel (CSP, HSTS)", async () => {
    // Este test se ejecuta contra la URL de Vercel en CI
    // Skip si no está configurada
    const VERCEL_URL = process.env.VITE_TEST_VERCEL_URL;
    if (!VERCEL_URL) return;

    const response = await fetch(VERCEL_URL);
    const csp = response.headers.get("Content-Security-Policy");
    const hsts = response.headers.get("Strict-Transport-Security");
    const xfo = response.headers.get("X-Frame-Options");

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(hsts).toContain("max-age=63072000");
    expect(xfo).toBe("DENY");
  });
});
