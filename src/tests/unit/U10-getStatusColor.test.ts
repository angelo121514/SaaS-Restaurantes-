/**
 * U-10: helpers.getStatusColor()
 * Mapea status de pedido a color Tailwind.
 */
import { describe, it, expect } from "vitest";
import { getStatusColor } from "../../utils/helpers";

describe("U-10 · getStatusColor", () => {
  it("retorna color para status conocidos", () => {
    // Estos status dependen de APP_CONFIG.orderStatuses
    // Verificamos que retorna un string no vacío
    const result = getStatusColor("pending");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("retorna 'neutral' para status desconocido", () => {
    const result = getStatusColor("nonexistent_status");
    expect(result).toBe("neutral");
  });

  it("retorna 'neutral' para string vacío", () => {
    const result = getStatusColor("");
    expect(result).toBe("neutral");
  });
});
