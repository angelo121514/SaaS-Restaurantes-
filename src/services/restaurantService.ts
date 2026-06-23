import { supabase } from "../config/supabase";
import type { Order, MenuItem, Customer } from "../config/supabase";

/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 */

// Subscribe to restaurant's orders with real-time updates
// P1-10: optimizado para NO hacer refetch completo en cada evento.
// En su lugar, muta el estado local con el payload del evento.
// Fallback: refetch cada 30s por si se pierde algún evento.
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void
) => {
  let currentOrders: Order[] = [];

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      currentOrders = data;
      callback(currentOrders);
    }
  };

  // Carga inicial
  fetchOrders();

  // Fallback: refetch cada 30s (por si se pierden eventos)
  const fallbackInterval = setInterval(fetchOrders, 30_000);

  // Suscripción optimizada: mutar estado local según evento
  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload: any) => {
        const eventType = payload.eventType;
        const newRow = payload.new as Order;
        const oldRow = payload.old as Order;

        if (eventType === "INSERT" && newRow) {
          // Evitar duplicados
          if (!currentOrders.find((o) => o.id === newRow.id)) {
            currentOrders = [newRow, ...currentOrders];
            callback(currentOrders);
          }
        } else if (eventType === "UPDATE" && newRow) {
          currentOrders = currentOrders.map((o) =>
            o.id === newRow.id ? { ...o, ...newRow } : o
          );
          callback(currentOrders);
        } else if (eventType === "DELETE" && oldRow) {
          currentOrders = currentOrders.filter((o) => o.id !== oldRow.id);
          callback(currentOrders);
        }
        // Otros eventos: ignorar (el fallback de 30s lo captura)
      }
    )
    .subscribe();

  // Retornar objeto con método unsubscribe que limpia interval
  return {
    ...subscription,
    unsubscribe: () => {
      clearInterval(fallbackInterval);
      subscription.unsubscribe();
    },
  };
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  }
) => {
  const updateData: any = { status };

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
    updateData.payment_status = "paid";
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  return !error;
};

// Subscribe to menu items with real-time updates
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { error } = await supabase
    .from("menu_items")
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating menu item:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  return !error;
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  return !error;
};

// Create order (manual or from customer)
// P0-1: retorna access_token para que el cliente pueda ver su pedido
// vía get_my_order(token) sin necesidad de política RLS pública.
// P1-1: si feature flag use_rpc_create_order está activo, usa RPC que
// recalcula totales server-side (evita manipulación de precios).
export const createOrder = async (order: Partial<Order>) => {
  // P1-1: detectar si debemos usar la RPC server-side
  const useRpc = await shouldUseRpcCreateOrder();
  if (useRpc && order.restaurant_id && order.items) {
    const { data, error } = await createOrderViaRpc(order);
    if (error) return { data, error };
    if (data && data.success === false) {
      return { data, error: { message: data.error || "Error al crear el pedido" } as any };
    }
    return { data, error: null };
  }

  // Legacy: INSERT directo (mantener mientras flag está desactivado)
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  return { data, error };
};

// P1-1: crear pedido vía RPC server-side (totales recalculados)
async function createOrderViaRpc(order: Partial<Order>) {
  const { data, error } = await supabase.rpc("create_order", {
    p_restaurant_id: order.restaurant_id!,
    p_items: order.items as any,
    p_customer_name: order.customer_name || null,
    p_customer_phone: order.customer_phone || null,
    p_customer_email: (order as any).customer_email || null,
    p_order_type: order.order_type || "qr",
    p_table_number: (order as any).table_number || null,
    p_notes: order.customer_notes || (order as any).notes || null,
    p_payment_method: order.payment_method || "qr",
  });
  return { data, error };
}

// P1-1: helper para verificar si usar RPC create_order
async function shouldUseRpcCreateOrder(): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("is_flag_enabled", {
      p_key: "use_rpc_create_order",
      p_restaurant_id: null,
    });
    return data === true;
  } catch {
    return false;
  }
}

// P0-1: obtener pedido por access_token (one-shot, 24h TTL)
// Reemplaza la política RLS pública USING(true) eliminada.
export const getMyOrder = async (accessToken: string) => {
  const { data, error } = await supabase.rpc("get_my_order", {
    p_token: accessToken,
  });
  return { data, error };
};

// Update order (manual or from customer)
export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { data: todayOrders },
      { data: pendingOrders },
      { count: totalOrders },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString()),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
    ]);

    const completedToday =
      todayOrders?.filter((o: any) => o.status === "completed").length || 0;
    const revenueToday =
      todayOrders
        ?.filter((o: any) => o.status === "completed")
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

    return {
      pendingOrders: pendingOrders?.length || 0,
      completedToday,
      revenueToday,
      totalOrders: totalOrders || 0,
    };
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    return {
      pendingOrders: 0,
      completedToday: 0,
      revenueToday: 0,
      totalOrders: 0,
    };
  }
};

// --- Customer & CRM Service Functions ---

// Get all customers for a restaurant
export const getCustomers = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("restaurant_customers")
    .select("*, orders(*)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data as any[];
};

// Create a new customer
export const createCustomer = async (customer: Partial<Customer>) => {
  const { data, error } = await supabase
    .from("restaurant_customers")
    .insert([customer])
    .select()
    .single();

  return { data: data as Customer | null, error };
};

// Update customer details (e.g. notes)
export const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
  const { data, error } = await supabase
    .from("restaurant_customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();

  return { data: data as Customer | null, error };
};

// Get last 3 orders for a customer
export const getCustomerOrders = async (customerId: string, limit = 3) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
  return data as Order[];
};

// =====================================================
// P1-9: Reports usando RPCs SQL (en vez de SELECT * + JS)
// =====================================================

export const getDailySales = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_daily_sales", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getTopItems = async (restaurantId: string, fromDate: string, toDate?: string, limit = 20) => {
  const { data, error } = await supabase.rpc("get_top_items", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
    p_limit: limit,
  });
  return { data, error };
};

export const getAvgTicket = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_avg_ticket", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getSalesByHour = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_sales_by_hour", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getSalesByOrderType = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_sales_by_order_type", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getReportsSummary = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_reports_summary", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};
