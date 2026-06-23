/**
 * U-07: helpers.generateTempPassword()
 * Genera contraseña temporal de 8 chars del set seguro.
 */
import { describe, it, expect } from "vitest";
import { generateTempPassword } from "../../utils/helpers";

describe("U-07 · generateTempPassword", () => {
  it("genera un string de 8 caracteres", () => {
    const pwd = generateTempPassword();
    expect(typeof pwd).toBe("string");
    expect(pwd.length).toBe(8);
  });

  it("usa solo caracteres del set seguro (sin 0, O, I, 1)", () => {
    const pwd = generateTempPassword();
    // Set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    expect(pwd).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("genera passwords diferentes en sucesión", () => {
    const pwd1 = generateTempPassword();
    const pwd2 = generateTempPassword();
    // Muy improbable que sean iguales
    expect(pwd1).not.toBe(pwd2);
  });
});
