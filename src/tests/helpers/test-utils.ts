/**
 * Helpers compartidos para tests.
 * Factorías de datos, mock de Supabase, utilidades.
 */
import { vi } from "vitest";
import { faker } from "@faker-js/faker";

// ─────────────────────────────────────────────────────
// Factorías de datos (mocks)
// ─────────────────────────────────────────────────────

export const mockRestaurant = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name().toLowerCase()),
  owner_email: faker.internet.email(),
  owner_name: faker.person.fullName(),
  owner_phone: "+569" + faker.string.numeric(8),
  subscription_plan: "free_trial" as const,
  status: "trial" as const,
  trial_ends_at: faker.date.future().toISOString(),
  is_active: true,
  currency_code: "CLP",
  tax_rate: 0.19,
  timezone: "America/Santiago",
  country: "CL",
  language: "es-CL",
  payment_provider: "webpay",
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const mockMenuItem = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  restaurant_id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  base_price: faker.number.int({ min: 1000, max: 20000 }),
  category_id: faker.string.uuid(),
  is_available: true,
  image_urls: [] as string[],
  preparation_time_min: faker.number.int({ min: 5, max: 30 }),
  ...overrides,
});

export const mockOrder = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  restaurant_id: faker.string.uuid(),
  order_number: faker.number.int({ min: 1000, max: 9999 }),
  customer_name: faker.person.fullName(),
  customer_phone: "+569" + faker.string.numeric(8),
  customer_email: faker.internet.email(),
  order_type: "qr" as const,
  status: "pending" as const,
  subtotal: faker.number.int({ min: 5000, max: 50000 }),
  tax: faker.number.int({ min: 950, max: 9500 }),
  total: faker.number.int({ min: 5950, max: 59500 }),
  payment_method: "qr" as const,
  payment_status: "pending" as const,
  items: [] as any[],
  notes: "",
  created_at: faker.date.recent().toISOString(),
  access_token: faker.string.uuid(),
  ...overrides,
});

export const mockCustomer = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  restaurant_id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: "+569" + faker.string.numeric(8),
  total_orders: faker.number.int({ min: 0, max: 100 }),
  total_spent: faker.number.int({ min: 0, max: 500000 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const mockAdminUser = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: "admin" as const,
  is_super_admin: false,
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

// ─────────────────────────────────────────────────────
// Mock del cliente Supabase para tests unitarios
// (no conecta a DB real)
// ─────────────────────────────────────────────────────

export const createMockSupabase = () => {
  const mockChain: any = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    upsert: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    neq: vi.fn(() => mockChain),
    gt: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lt: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    like: vi.fn(() => mockChain),
    ilike: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    range: vi.fn(() => mockChain),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: undefined,
  };

  // Resolver a { data, error } al final de la cadena
  const resolveChain = (data: any, error: any = null) => {
    mockChain.single.mockResolvedValue({ data, error });
    mockChain.maybeSingle.mockResolvedValue({ data, error });
    // Para llamadas que NO terminan en single/maybeSingle, retornar Promise<{data, error}>
    mockChain.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
    return mockChain;
  };

  return {
    from: vi.fn(() => mockChain),
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        generateLink: vi.fn(),
        getUserById: vi.fn(),
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        createSignedUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    _chain: mockChain,
    _resolveChain: resolveChain,
  };
};

// ─────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const waitFor = async (fn: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    await sleep(50);
  }
  return false;
};

// Generar email aleatorio para tests
export const randomEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generar UUID v4 (sin dependencias)
export const randomUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
