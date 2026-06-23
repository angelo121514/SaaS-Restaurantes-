import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Node process polyfill para tests (los tests usan process.env)
declare global {
  // eslint-disable-next-line no-var
  var process: any;
}

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Faker seed determinista para tests reproducibles
beforeAll(() => {
  faker.seed(42);
});

// Mock de window.matchMedia (necesario para componentes que usan Tailwind dark mode)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root: any = null;
  rootMargin = "";
  thresholds: number[] = [];
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock de ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Silenciar console.warn y console.error en tests
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args: unknown[]) => {
  if (process.env.VITEST_VERBOSE) originalWarn(...args);
};
console.error = (...args: unknown[]) => {
  if (process.env.VITEST_VERBOSE) originalError(...args);
};
