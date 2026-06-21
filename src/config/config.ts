// Supabase Configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

// Application Configuration
export const APP_CONFIG = {
  appName: "CMOR FLOW",
  defaultCurrency: "$",
  taxRate: 0.19, // 19% IVA (Chile)
  orderPrefix: "PED",

  // Subscription plans
  plans: {
    free_trial: {
      name: "Prueba Gratuita",
      price: 0,
      price_usd: 0,
      price_annual: 0,
      price_annual_usd: 0,
      duration: "15 días",
      features: [
        "Hasta 50 pedidos/mes",
        "Gestión básica de menú",
        "Pedidos por código QR",
        "Soporte por correo electrónico",
      ],
    },
    starter: {
      name: "Básico (Starter)",
      price: 40000,
      price_usd: 45,
      price_annual: 408000, // 40.000 * 12 * 0.85 (15% ahorro)
      price_annual_usd: 459, // 45 * 12 * 0.85 (15% ahorro)
      duration: "por mes",
      features: [
        "Pedidos ilimitados",
        "Gestión completa de menú",
        "Pedidos por código QR",
        "Reportes básicos",
        "CRM Integrado de Clientes",
        "Soporte por WhatsApp",
      ],
    },
    pro: {
      name: "Pro",
      price: 120000,
      price_usd: 130,
      price_annual: 1224000, // 120.000 * 12 * 0.85 (15% ahorro)
      price_annual_usd: 1326, // 120.000 * 12 * 0.85 (15% ahorro)
      duration: "por mes",
      features: [
        "Todo lo del plan Básico",
        "Página web personalizada, posicionada en Google y con botones de llamada de acción",
        "Multi-sucursal",
        "Estadísticas y reportes avanzados",
        "Contenido para redes sociales",
        "Marca personalizada",
        "Recomendaciones con Inteligencia Artificial (IA)",
        "CRM Integrado de Clientes",
        "Soporte Premium 24/7",
      ],
    },
  },

  // Restaurant types
  restaurantTypes: [
    "Restaurante",
    "Food Truck",
    "Cafetería",
    "Pastelería / Panadería",
    "Cocina Oculta (Cloud Kitchen)",
    "Cena Fina",
    "Comida Rápida",
    "Pizzería",
    "Sushi bar",
    "Otro",
  ],

  // Menu categories
  menuCategories: [
    "Entradas",
    "Platos Principales",
    "Desayunos",
    "Almuerzos",
    "Bebidas",
    "Postres",
    "Pizzas",
    "Sushi",
    "Snacks / Sándwiches",
    "Otro",
  ],

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendiente", color: "warning" },
    accepted: { label: "Aceptado", color: "accent-secondary" },
    preparing: { label: "Preparando", color: "accent-secondary" },
    ready: { label: "Listo", color: "success" },
    completed: { label: "Completado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rechazado", color: "error" },
  },

  // Payment methods
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta de Débito/Crédito", "Otro"],

  // Registration sources
  heardFromOptions: [
    "Búsqueda en Google",
    "Redes Sociales",
    "Recomendación de un Amigo",
    "Publicidad",
    "Otro",
  ],
};
