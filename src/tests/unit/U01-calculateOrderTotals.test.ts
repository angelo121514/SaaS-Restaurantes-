/**
 * U-01: helpers.calculateOrderTotals()
 * Valida el cálculo de subtotal, IVA y total de un pedido.
 */
import { describe, it, expect } from "vitest";
import { calculateOrderTotals } from "../../utils/helpers";

describe("U-01 · calculateOrderTotals", () => {
  it("calcula correctamente para 1 item", () => {
    const items = [{ item_total: 11900 }];
    const result = calculateOrderTotals(items);
    expect(result.total).toBe(11900);
    expect(result.subtotal).toBeCloseTo(10000, 0);
    expect(result.tax).toBeCloseTo(1900, 0);
  });

  it("calcula correctamente para múltiples items", () => {
    const items = [{ item_total: 11900 }, { item_total: 2380 }, { item_total: 5950 }];
    const result = calculateOrderTotals(items);
    expect(result.total).toBe(20230);
    expect(result.subtotal).toBeCloseTo(17000, 0);
    expect(result.tax).toBeCloseTo(3230, 0);
  });

  it("retorna 0 para array vacío", () => {
    const result = calculateOrderTotals([]);
    expect(result.total).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
  });

  it("asume IVA del 19% (hardcoded — pendiente mover a config por país)", () => {
    const items = [{ item_total: 1190 }];
    const result = calculateOrderTotals(items);
    // 19% de 1000 = 190, total = 1190, subtotal = 1000
    expect(result.tax).toBeCloseTo(190, 1);
    // NOTA: este test DOCUMENTA que el IVA está hardcoded a 19%.
    // Cuando se internacionalice (Fase 3), este test debe actualizarse
    // para aceptar IVA por país (16% MX, 18% PE, etc.).
  });
});
