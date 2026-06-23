/**
 * U-05: helpers.isValidEmail()
 */
import { describe, it, expect } from "vitest";
import { isValidEmail } from "../../utils/helpers";

describe("U-05 · isValidEmail", () => {
  it("acepta emails válidos", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@example.cl")).toBe(true);
    expect(isValidEmail("user@sub.domain.com")).toBe(true);
  });

  it("rechaza emails inválidos", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("user")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});
