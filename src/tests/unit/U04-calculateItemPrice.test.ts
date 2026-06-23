/**
 * U-04: helpers.calculateItemPrice()
 * Calcula precio con tamaño seleccionado y addons.
 */
import { describe, it, expect } from "vitest";
import { calculateItemPrice } from "../../utils/helpers";

describe("U-04 · calculateItemPrice", () => {
  it("usa base_price si no hay tamaño ni addons", () => {
    expect(calculateItemPrice(10000)).toBe(10000);
  });

  it("usa precio del tamaño si está seleccionado", () => {
    const result = calculateItemPrice(10000, { price: 12000 });
    expect(result).toBe(12000);
  });

  it("suma addons al precio del tamaño", () => {
    const result = calculateItemPrice(
      10000,
      { price: 12000 },
      [{ price: 500 }, { price: 1000 }, { price: 1500 }]
    );
    expect(result).toBe(15000);
  });

  it("suma addons al base_price si no hay tamaño", () => {
    const result = calculateItemPrice(10000, undefined, [
      { price: 500 },
      { price: 1000 },
    ]);
    expect(result).toBe(11500);
  });

  it("maneja array de addons vacío", () => {
    expect(calculateItemPrice(10000, undefined, [])).toBe(10000);
  });

  it("maneja addons undefined", () => {
    expect(calculateItemPrice(10000, undefined, undefined)).toBe(10000);
  });
});
