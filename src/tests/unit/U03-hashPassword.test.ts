/**
 * U-03: helpers.hashPassword()
 * Documenta el comportamiento actual (SHA-256 sin salt — DEPRECADO).
 * Tras P0-4, esta función NO debe usarse en producción.
 */
import { describe, it, expect } from "vitest";
import { hashPassword } from "../../utils/helpers";

describe("U-03 · hashPassword (DEPRECADO — P0-4)", () => {
  it("retorna un hash hex de 64 caracteres (SHA-256)", async () => {
    const hash = await hashPassword("test123");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("es determinista (mismo input → mismo hash)", async () => {
    const hash1 = await hashPassword("test123");
    const hash2 = await hashPassword("test123");
    expect(hash1).toBe(hash2);
  });

  it("el hash de 'admin123' es conocido y debe revocarse (P0-4)", async () => {
    const hash = await hashPassword("admin123");
    // Este es el hash hardcodeado en database/setup.sql:450 (eliminado en P0-4)
    expect(hash).toBe("240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9");
    // NOTA: este test DOCUMENTA el hash vulnerable. Tras P0-4, el seed
    // admin123 fue eliminado de setup.sql. Este test debe seguir pasando
    // para garantizar que no se reintroduzca.
  });

  it("NO usa salt (vulnerabilidad rainbow tables)", async () => {
    // Dos hashes del mismo password deben ser idénticos (sin salt)
    const hash1 = await hashPassword("password123");
    const hash2 = await hashPassword("password123");
    expect(hash1).toBe(hash2); // ← Sin salt = vulnerable
    // Tras migrar a Supabase Auth (bcrypt), este test debe eliminarse
    // porque hashPassword() ya no se usa.
  });
});
