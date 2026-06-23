/**
 * U-09: helpers.debounce()
 * Verifica que debounce ejecuta la función solo después del delay.
 */
import { describe, it, expect, vi } from "vitest";
import { debounce } from "../../utils/helpers";

describe("U-09 · debounce", () => {
  it("no ejecuta la función inmediatamente", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it("ejecuta después del delay", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("multiple calls solo ejecutan una vez tras delay", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("pasa los argumentos a la función original", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("arg1", "arg2");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    vi.useRealTimers();
  });
});
