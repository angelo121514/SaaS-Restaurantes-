import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Calculator,
  User,
  Phone,
  FileText,
  CreditCard,
  Coins,
  ArrowRightLeft,
  CheckCircle,
  HelpCircle,
  Hourglass,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Textarea,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
  updateOrder,
  getCustomers,
  createCustomer,
  getCustomerOrders,
} from "../../services/restaurantService";
import type { MenuItem, Order, OrderItem, Customer } from "../../config/supabase";
import { supabase } from "../../config/supabase";
import { formatCurrency as baseFormatCurrency } from "../../utils/helpers";
import { useRestaurantId, useAuth } from "../../hooks/useAuth";
import { APP_CONFIG } from "../../config/config";
import { createPortal } from "react-dom";

interface CartItem {
  id: string; // Composite unique key: menuItemId_sizeName_addonNames
  menuItem: MenuItem;
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number; // Unit price (size or base + addons)
}

const Pos: React.FC = () => {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Order Info Form
  const [orderType, setOrderType] = useState<"table" | "counter" | "phone">("counter");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  
  // Custom Option Modal State
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modalSelectedSize, setModalSelectedSize] = useState<{ name: string; price: number } | undefined>(undefined);
  const [modalSelectedAddons, setModalSelectedAddons] = useState<{ name: string; price: number }[]>([]);
  const [modalSpecialInstructions, setModalSpecialInstructions] = useState("");

  // UI state
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("¡Pedido registrado exitosamente!");
  const [orderError, setOrderError] = useState("");

  // Customer & CRM State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerFavorites, setCustomerFavorites] = useState<string[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [pendingQrOrders, setPendingQrOrders] = useState<Order[]>([]);
  
  // Print Ticket State
  const [printTicketData, setPrintTicketData] = useState<any | null>(null);

  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();

  const formatCurrency = (amount: number | undefined | null) => {
    return baseFormatCurrency(amount, restaurant?.currency, restaurant?.usd_exchange_rate);
  };

  useEffect(() => {
    if (!restaurantId) return;

    const subscription = subscribeToMenuItems(restaurantId, (data) => {
      // Filter out unavailable items for POS? Standard POS shows active/available items, but we should prioritize available ones
      setMenuItems(data.filter(item => item.is_available));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const loadCustomers = async () => {
    if (!restaurantId) return;
    const data = await getCustomers(restaurantId);
    setCustomers(data);
  };

  useEffect(() => {
    if (!restaurantId) return;
    loadCustomers();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchPendingQrOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("order_type", "qr")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPendingQrOrders(data);
      }
    };

    fetchPendingQrOrders();

    const subscription = supabase
      .channel(`restaurant-pending-qr-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        // Mutación local: actualizar solo el pedido afectado sin refetch completo
        (payload: any) => {
          const eventType = payload.eventType;
          const newRow = payload.new;
          const oldRow = payload.old;

          if (eventType === "INSERT" && newRow?.order_type === "qr" && newRow?.payment_status === "pending") {
            setPendingQrOrders((prev) => [newRow, ...prev.filter((o) => o.id !== newRow.id)]);
          } else if (eventType === "UPDATE" && newRow) {
            if (newRow.order_type === "qr" && newRow.payment_status === "pending") {
              // Actualizar o agregar si ya cumple los filtros
              setPendingQrOrders((prev) =>
                prev.some((o) => o.id === newRow.id)
                  ? prev.map((o) => (o.id === newRow.id ? { ...o, ...newRow } : o))
                  : [newRow, ...prev]
              );
            } else {
              // Ya no cumple el filtro (pagado o cambió tipo) — eliminarlo de la lista
              setPendingQrOrders((prev) => prev.filter((o) => o.id !== newRow.id));
            }
          } else if (eventType === "DELETE" && oldRow) {
            setPendingQrOrders((prev) => prev.filter((o) => o.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const handleLoadQrOrder = (qrOrder: Order) => {
    const loadedCart: CartItem[] = (qrOrder.items || []).map((item: any) => {
      const dbMenuItem = menuItems.find((m) => m.id === item.menu_item_id);
      
      const menuItem: MenuItem = dbMenuItem || {
        id: item.menu_item_id,
        restaurant_id: restaurantId || "",
        name: item.name,
        category: "Otro",
        base_price: item.base_price,
        is_available: true,
        image_url: "",
        created_at: new Date().toISOString(),
      };

      const sizePart = item.selected_size ? item.selected_size.name : "";
      const addonsPart = (item.selected_addons || []).map((a: any) => a.name).join("_");
      const cartItemId = `${item.menu_item_id}_${sizePart}_${addonsPart}`;

      return {
        id: cartItemId,
        menuItem,
        quantity: item.quantity,
        selectedSize: item.selected_size,
        selectedAddons: item.selected_addons || [],
        specialInstructions: item.special_instructions,
        itemTotal: item.item_total / item.quantity,
      };
    });

    setCart(loadedCart);
    setTableNumber(qrOrder.table_number || "");
    setCustomerName(qrOrder.customer_name || "");
    setCustomerPhone(qrOrder.customer_phone || "");
    setCustomerNotes(qrOrder.customer_notes || "");
    setOrderType(qrOrder.order_type === "qr" ? "table" : (qrOrder.order_type as any) || "table");
    setCurrentOrderId(qrOrder.id);
  };

  useEffect(() => {
    const fetchCustomerHistory = async () => {
      if (!selectedCustomer) {
        setCustomerOrders([]);
        setCustomerFavorites([]);
        return;
      }
      
      const orders = await getCustomerOrders(selectedCustomer.id, 3);
      setCustomerOrders(orders);
      
      const completedOrders = (selectedCustomer as any).orders || [];
      const itemCounts: Record<string, number> = {};
      completedOrders.forEach((o: any) => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((item: any) => {
          if (item.name) {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
          }
        });
      });
      
      const sortedDishes = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name);
        
      setCustomerFavorites(sortedDishes);
    };
    
    fetchCustomerHistory();
  }, [selectedCustomer]);

  useEffect(() => {
    if (printTicketData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintTicketData(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printTicketData]);

  const handleAddCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      setOrderError("Nombre y Teléfono son requeridos");
      return;
    }
    const { data, error } = await createCustomer({
      restaurant_id: restaurantId,
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      email: newCustomerData.email || undefined,
      notes: newCustomerData.notes || undefined,
    });
    if (error) {
      console.error(error);
      alert("Error al registrar cliente. Asegúrese de que el teléfono no esté duplicado.");
    } else if (data) {
      await loadCustomers();
      setSelectedCustomer(data);
      setCustomerName(data.name);
      setCustomerPhone(data.phone);
      setNewCustomerData({ name: "", phone: "", email: "", notes: "" });
      setShowAddCustomerModal(false);
    }
  };

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate pricing (VAT inclusive)
  const total = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);
  const subtotal = total / 1.19;
  const tax = total - subtotal;

  // Add Item to Cart (Direct or triggers Modal)
  const handleItemClick = (item: MenuItem) => {
    const hasSizes = item.sizes && item.sizes.length > 0;
    const hasAddons = item.addons && item.addons.length > 0;

    if (hasSizes || hasAddons) {
      setCustomizingItem(item);
      setModalSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0] : undefined);
      setModalSelectedAddons([]);
      setModalSpecialInstructions("");
      setOptionsModalOpen(true);
    } else {
      addToCartDirect(item);
    }
  };

  // Direct add for items without size/addons
  const addToCartDirect = (item: MenuItem) => {
    const cartItemId = item.id;
    const existingIndex = cart.findIndex((i) => i.id === cartItemId);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          id: cartItemId,
          menuItem: item,
          quantity: 1,
          selectedAddons: [],
          itemTotal: item.base_price,
        },
      ]);
    }
  };

  // Add item with custom sizes/addons from modal
  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return;

    const basePrice = modalSelectedSize ? modalSelectedSize.price : customizingItem.base_price;
    const addonsTotal = modalSelectedAddons.reduce((sum, a) => sum + a.price, 0);
    const itemTotal = basePrice + addonsTotal;

    // Create unique key based on selections
    const sizePart = modalSelectedSize ? modalSelectedSize.name : "base";
    const addonsPart = modalSelectedAddons.map((a) => a.name).sort().join(",");
    const cartItemId = `${customizingItem.id}_${sizePart}_${addonsPart}`;

    const existingIndex = cart.findIndex((i) => i.id === cartItemId);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      if (modalSpecialInstructions) {
        // Concatenate instructions if any
        updatedCart[existingIndex].specialInstructions = 
          (updatedCart[existingIndex].specialInstructions ? updatedCart[existingIndex].specialInstructions + "; " : "") + 
          modalSpecialInstructions;
      }
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          id: cartItemId,
          menuItem: customizingItem,
          quantity: 1,
          selectedSize: modalSelectedSize,
          selectedAddons: modalSelectedAddons,
          specialInstructions: modalSpecialInstructions || undefined,
          itemTotal,
        },
      ]);
    }

    setOptionsModalOpen(false);
    setCustomizingItem(null);
  };

  const updateQuantity = (cartItemId: string, amount: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + amount;
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setCart(updatedCart);
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(cart.filter((item) => item.id !== cartItemId));
  };

  const handleToggleAddon = (addon: { name: string; price: number }) => {
    const isSelected = modalSelectedAddons.some((a) => a.name === addon.name);
    if (isSelected) {
      setModalSelectedAddons(modalSelectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setModalSelectedAddons([...modalSelectedAddons, addon]);
    }
  };

  // Submit order to database
  const handlePlaceOrder = async (finalStatus: "accepted" | "completed") => {
    if (cart.length === 0) {
      setOrderError("El carrito está vacío");
      return;
    }

    if (orderType === "table" && !tableNumber) {
      setOrderError("Por favor ingresa el número de mesa");
      return;
    }

    setOrderError("");

    const orderData: Partial<Order> = {
      restaurant_id: restaurantId,
      customer_id: selectedCustomer?.id || undefined,
      order_type: orderType,
      table_number: orderType === "table" ? tableNumber : undefined,
      customer_name: customerName.trim() || "Cliente POS",
      customer_phone: customerPhone.trim() || undefined,
      items: cart.map((item) => ({
        menu_item_id: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        base_price: item.menuItem.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
        special_instructions: item.specialInstructions,
      })),
      subtotal,
      tax,
      total,
      status: (finalStatus === "completed" && orderType === "counter" && !currentOrderId) ? "completed" : "accepted",
      payment_method: paymentMethod,
      payment_status: finalStatus === "completed" ? "paid" : "pending",
      customer_notes: customerNotes.trim() || undefined,
      internal_notes: "Pedido registrado desde Caja POS",
    };

    // --- OPTIMISTIC UI: mostrar éxito y actualizar pantalla inmediatamente ---
    // Guardar snapshot del carrito para poder revertir si Supabase falla
    const snapshotCart = [...cart];
    const snapshotOrderId = currentOrderId;

    if (finalStatus === "completed") {
      setSuccessMessage("¡Pedido completado y pagado exitosamente!");
      setOrderSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerNotes("");
      setTableNumber("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setSelectedCustomer(null);
      setCustomerSearchQuery("");
      setCurrentOrderId(null);
      setTimeout(() => setOrderSuccess(false), 3000);
    } else {
      setSuccessMessage("¡Pedido enviado a cocina exitosamente!");
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    }

    // --- BACKGROUND: guardar en Supabase sin bloquear la UI ---
    try {
      const result = snapshotOrderId
        ? await updateOrder(snapshotOrderId, orderData)
        : await createOrder(orderData);

      if (result.error) {
        // Revertir: restaurar el carrito y mostrar error
        setCart(snapshotCart);
        if (snapshotOrderId) setCurrentOrderId(snapshotOrderId);
        setOrderSuccess(false);
        setOrderError(result.error.message || "Error al guardar el pedido. Reintenta.");
        return;
      }

      // Éxito real: guardar ID si es pedido a cocina, o imprimir ticket
      const savedOrder = result.data;
      if (finalStatus === "completed") {
        if (savedOrder) setPrintTicketData(savedOrder);
        loadCustomers();
      } else {
        if (savedOrder && !snapshotOrderId) setCurrentOrderId(savedOrder.id);
      }
    } catch {
      // Error de red: revertir
      setCart(snapshotCart);
      if (snapshotOrderId) setCurrentOrderId(snapshotOrderId);
      setOrderSuccess(false);
      setOrderError("Error de conexión. Verifica el internet y reintenta.");
    }
  };

  const clearCart = () => {
    setCart([]);
    setOrderError("");
    setCurrentOrderId(null);
  };

  const getTrialDaysLeft = (endsAt?: string | null) => {
    if (!endsAt) return 0;
    const diff = new Date(endsAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const isTrialExpired = restaurant?.subscription_plan === "free_trial" && 
    restaurant?.trial_ends_at && 
    getTrialDaysLeft(restaurant.trial_ends_at) === 0;

  if (isTrialExpired) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Card className="text-center p-8 flex flex-col items-center justify-center max-w-lg mx-auto">
          <Hourglass className="w-16 h-16 text-error mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-text mb-3">
            Período de Prueba Expirado
          </h2>
          <p className="text-text-secondary mb-6 text-sm">
            Tu período de prueba gratuito de 15 días ha expirado. Para continuar registrando ventas en el POS y recibir pedidos en tu menú digital de clientes, por favor contrata un plan en la sección de Configuración.
          </p>
          <Button
            onClick={() => navigate("/restaurant/settings")}
            className="bg-accent hover:bg-accent-secondary text-white font-bold"
          >
            Ir a Configuración de Planes
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <Loading text="Cargando menú de caja..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[550px]">
      {/* Left panel: Menu items grid */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Categories and search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar plato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-5 h-5 text-text-secondary" />}
              className="bg-bg border-border text-text"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full lg:max-w-[400px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  categoryFilter === cat
                    ? "bg-accent text-white border-accent"
                    : "bg-bg text-text-secondary border-border hover:bg-bg-subtle hover:text-text"
                }`}
              >
                {cat === "all" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu item list scroll area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-bg rounded-xl border border-border">
              <Calculator className="w-12 h-12 text-text-secondary opacity-60 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No se encontraron platos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-bg rounded-xl border border-border p-3 flex flex-col justify-between hover:shadow-md hover:border-zinc-500 cursor-pointer transition-all active:scale-[0.98] select-none"
                >
                  <div className="space-y-2">
                    {/* Thumbnail */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-24 bg-bg-subtle border border-border rounded-lg flex items-center justify-center text-xs text-text-secondary font-medium">
                        Sin Foto
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-text line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-text-secondary truncate">{item.category}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-extrabold text-accent">
                      {formatCurrency(item.base_price)}
                    </span>
                    <Badge variant="neutral" className="text-[9px] px-1.5 py-0.5 bg-bg-subtle border-border text-text-secondary">
                      {(item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0) ? "Opciones" : "+ Añadir"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active cart sidebar */}
      <div className="w-full lg:w-[380px] bg-bg border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-bg-subtle">
          <h3 className="font-extrabold text-sm text-text flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-accent" />
            <span>Detalle del Pedido</span>
          </h3>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-zinc-500 hover:text-red-650 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Pending QR Orders Notification */}
        {pendingQrOrders.length > 0 && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                {pendingQrOrders.length} Pedido{pendingQrOrders.length > 1 ? 's' : ''} QR Pendiente{pendingQrOrders.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pendingQrOrders.map((qrOrder) => (
                <div key={qrOrder.id} className="bg-bg border border-amber-500/30 rounded-lg p-2.5 flex justify-between items-center text-xs shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-text truncate">
                      {qrOrder.table_number ? `Mesa: ${qrOrder.table_number}` : 'Llevar / Mostrador'}
                    </p>
                    <p className="text-[10px] text-text-secondary truncate">
                      {qrOrder.customer_name || 'Cliente'} • {formatCurrency(qrOrder.total)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLoadQrOrder(qrOrder)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2.5 rounded text-[10px] ml-2 shrink-0 border-0"
                  >
                    Cobrar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orderSuccess && (
            <Alert
              type="success"
              message={successMessage}
            />
          )}

          {currentOrderId && (
            <Alert
              type="info"
              message="Pedido enviado a cocina. Pulsa 'Pagar' para completar y cerrar."
            />
          )}

          {orderError && (
            <Alert type="error" message={orderError} />
          )}

          {cart.length === 0 ? (
            <div className="text-center py-12 text-text-secondary space-y-2">
              <ShoppingCart className="w-10 h-10 mx-auto text-text-secondary opacity-50" />
              <p className="text-xs font-semibold">El carrito está vacío</p>
              <p className="text-[10px] text-text-secondary">Haz clic en los platos de la izquierda para agregarlos</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-2.5 items-start justify-between pb-3 border-b border-border">
                <div className="flex-1 min-w-0 text-xs">
                  <h5 className="font-bold text-text leading-tight">{item.menuItem.name}</h5>
                  
                  {/* Selected size */}
                  {item.selectedSize && (
                    <span className="block text-[10px] text-text-secondary mt-0.5">
                      Tamaño: {item.selectedSize.name}
                    </span>
                  )}

                  {/* Selected addons */}
                  {item.selectedAddons.length > 0 && (
                    <span className="block text-[10px] text-text-secondary">
                      Agregados: {item.selectedAddons.map(a => a.name).join(", ")}
                    </span>
                  )}

                  {/* Instructions */}
                  {item.specialInstructions && (
                    <span className="block text-[10px] italic text-text-secondary opacity-80">
                      Nota: "{item.specialInstructions}"
                    </span>
                  )}

                  <span className="block font-bold text-text mt-1">
                    {formatCurrency(item.itemTotal * item.quantity)}
                  </span>
                </div>

                {/* Quantity adjustments */}
                <div className="flex items-center gap-1.5 bg-bg border border-border rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-bg-subtle rounded text-text transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-text min-w-[12px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-bg-subtle rounded text-text transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Details Form */}
        <div className="p-4 border-t border-border space-y-3 bg-bg-subtle/40">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Order Type */}
            <div className={orderType === "table" ? "col-span-1" : "col-span-2"}>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Tipo de Orden</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 font-bold text-text focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="counter">Llevar / Mostrador</option>
                <option value="table">Mesa</option>
                <option value="phone">Teléfono / Delivery</option>
              </select>
            </div>

            {/* Table Number */}
            {orderType === "table" && (
              <div className="col-span-1">
                <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Mesa *</label>
                <input
                  type="text"
                  placeholder="Mesa 5, Barra..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-bg border-border rounded-lg px-2.5 py-1.5 font-bold text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
            )}
          </div>

          {/* Customer Selection Row */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Cliente (Opcional)</label>
              {!selectedCustomer ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-[10px] text-accent font-bold hover:underline"
                  style={{ outline: "none" }}
                >
                  + Nuevo Cliente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearchQuery("");
                    setCustomerName("");
                    setCustomerPhone("");
                  }}
                  className="text-[10px] text-red-650 font-bold hover:underline"
                  style={{ outline: "none" }}
                >
                  Quitar
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="p-2 bg-bg border border-border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-text text-left">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-text-secondary text-left">{selectedCustomer.phone}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o tel..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
                
                {/* Search Results Dropdown */}
                {customerSearchQuery.trim() !== "" && (
                  <div className="absolute left-0 right-0 mt-1 bg-bg border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-border">
                    {customers
                      .filter(c => 
                        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        c.phone.includes(customerSearchQuery)
                      )
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone);
                            setCustomerSearchQuery("");
                          }}
                          className="p-2 hover:bg-bg-subtle cursor-pointer text-left"
                        >
                          <p className="font-bold text-text text-xs">{c.name}</p>
                          <p className="text-[10px] text-text-secondary">{c.phone}</p>
                        </div>
                      ))}
                    {customers.filter(c => 
                      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone.includes(customerSearchQuery)
                    ).length === 0 && (
                      <div className="p-2 text-text-secondary text-xs text-center">
                        No se encontraron resultados.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer History & Tastes Panel */}
          {selectedCustomer && (
            <div className="p-2.5 bg-accent/5 border border-accent/10 rounded-xl space-y-2 text-xs text-left">
              {selectedCustomer.notes && (
                <div>
                  <span className="font-bold text-accent text-[9px] uppercase tracking-wider block">Preferencia / Alergia:</span>
                  <p className="text-text italic text-[10px]">"{selectedCustomer.notes}"</p>
                </div>
              )}
              
              {customerFavorites.length > 0 && (
                <div>
                  <span className="font-bold text-accent text-[9px] uppercase tracking-wider block">Platos Favoritos (Gustos):</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {customerFavorites.map(dish => (
                      <span key={dish} className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[9px] font-medium">
                        ⭐ {dish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <span className="font-bold text-text-secondary text-[9px] uppercase tracking-wider block">Últimos 3 Pedidos:</span>
                {customerOrders.length === 0 ? (
                  <p className="text-[10px] text-text-secondary">Sin historial registrado</p>
                ) : (
                  <div className="space-y-1 mt-1">
                    {customerOrders.map(o => (
                      <div key={o.id} className="text-[10px] border-b border-border/40 pb-1 last:border-b-0 last:pb-0 flex justify-between items-start">
                        <span className="text-text-secondary font-medium">
                          {new Date(o.created_at).toLocaleDateString()} - {o.order_number}
                        </span>
                        <span className="font-bold text-text">
                          {formatCurrency(o.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsible / Extra Options */}
          {cart.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border text-xs">
              {/* Payment selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 font-medium text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta (POS)</option>
                    <option value="transfer">🏦 Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Estado Pago</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 font-medium text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="paid">🟢 Pagado</option>
                    <option value="pending">🟡 Pendiente</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Instrucciones del pedido (Ej: Sin cebollín)"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Total details and checkout buttons */}
        <div className="p-4 border-t border-border bg-bg-subtle space-y-3">
          <div className="space-y-1.5 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (19%):</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-sm text-text border-t border-border pt-1.5 font-extrabold">
              <span>Total:</span>
              <span className="text-base text-accent">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={cart.length === 0}
              onClick={() => handlePlaceOrder("accepted")}
              className="text-xs border-border text-text hover:bg-bg-subtle flex items-center justify-center gap-1 px-2 py-2.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>A Cocina</span>
            </Button>
            <Button
              type="button"
              disabled={cart.length === 0}
              onClick={() => handlePlaceOrder("completed")}
              className="text-xs bg-red-600 hover:bg-red-750 text-white flex items-center justify-center gap-1 border-0 px-2 py-2.5 shadow-md shadow-red-500/10 active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Pagar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Item customizing options modal */}
      {optionsModalOpen && customizingItem && (
        <Modal
          isOpen={optionsModalOpen}
          onClose={() => {
            setOptionsModalOpen(false);
            setCustomizingItem(null);
          }}
          title={`Configurar: ${customizingItem.name}`}
          size="md"
        >
          <div className="space-y-5">
            {/* Sizes (Radios) */}
            {customizingItem.sizes && customizingItem.sizes.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Selecciona Tamaño</label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.sizes.map((sz) => (
                    <label
                      key={sz.name}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        modalSelectedSize?.name === sz.name
                          ? "border-red-500 bg-red-500/10 text-text"
                          : "border-border text-text-secondary hover:border-text"
                      }`}
                    >
                      <span className="text-xs font-bold">{sz.name}</span>
                      <span className="text-xs font-extrabold text-accent">{formatCurrency(sz.price)}</span>
                      <input
                        type="radio"
                        name="modal_size"
                        checked={modalSelectedSize?.name === sz.name}
                        onChange={() => setModalSelectedSize(sz)}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Addons (Checkboxes) */}
            {customizingItem.addons && customizingItem.addons.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Agregados Adicionales</label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.addons.map((ad) => {
                    const isSelected = modalSelectedAddons.some((a) => a.name === ad.name);
                    return (
                      <label
                        key={ad.name}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                          isSelected
                            ? "border-red-500 bg-red-500/10 text-text"
                            : "border-border text-text-secondary hover:border-text"
                        }`}
                      >
                        <span className="text-xs font-semibold">{ad.name}</span>
                        <span className="text-xs font-bold text-text-secondary">+{formatCurrency(ad.price)}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAddon(ad)}
                          className="hidden"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Notas Especiales</label>
              <Textarea
                placeholder="Ej. Sin sésamo, con jengibre extra..."
                value={modalSpecialInstructions}
                onChange={(e) => setModalSpecialInstructions(e.target.value)}
                rows={2}
                className="bg-bg border-border text-xs text-text"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOptionsModalOpen(false);
                  setCustomizingItem(null);
                }}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddCustomizedToCart}
                fullWidth
                className="bg-red-600 hover:bg-red-750 text-white font-bold border-0"
              >
                Agregar a la Orden ({formatCurrency(
                  (modalSelectedSize ? modalSelectedSize.price : customizingItem.base_price) +
                  modalSelectedAddons.reduce((sum, a) => sum + a.price, 0)
                )})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <Modal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          title="Agregar Nuevo Cliente"
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Nombre del Cliente *"
              placeholder="Ej: Juan Pérez"
              value={newCustomerData.name}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
              required
            />
            <Input
              label="Teléfono *"
              placeholder="Ej: +56 9 1234 5678"
              value={newCustomerData.phone}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
              required
            />
            <Input
              label="Correo Electrónico (Opcional)"
              placeholder="Ej: juan.perez@email.com"
              type="email"
              value={newCustomerData.email}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
            />
            <Textarea
              label="Notas de Preferencia o Alergias (Opcional)"
              placeholder="Ej: Alérgico al maní, prefiere mesa en la terraza..."
              value={newCustomerData.notes}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, notes: e.target.value })}
              rows={3}
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCustomerModal(false)}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddCustomer}
                className="bg-red-650 hover:bg-red-750 text-white font-bold border-0"
                fullWidth
              >
                Guardar Cliente
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable receipt ticket - Rendered via React Portal directly in body */}
      {printTicketData && createPortal(
        <div className="print-receipt-container">
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "14px", fontWeight: "bold" }}>
              TICKET DE VENTA
            </h3>
            <p style={{ margin: "0", fontSize: "11px" }}>
              Restaurante ID: {printTicketData.restaurant_id?.substring(0, 8)}
            </p>
            <p style={{ margin: "0", fontSize: "10px" }}>
              Nro Pedido: {printTicketData.order_number}
            </p>
            <p style={{ margin: "0", fontSize: "10px" }}>
              Fecha: {new Date(printTicketData.created_at || Date.now()).toLocaleString()}
            </p>
          </div>
          
          <div style={{ fontSize: "10px", marginBottom: "10px" }}>
            <p style={{ margin: "0 0 2px 0" }}>
              <strong>Tipo:</strong> {printTicketData.order_type === "table" ? `Mesa: ${printTicketData.table_number}` : printTicketData.order_type === "phone" ? "Delivery/Teléfono" : "Llevar/Mostrador"}
            </p>
            <p style={{ margin: "0 0 2px 0" }}>
              <strong>Cliente:</strong> {printTicketData.customer_name || "Cliente POS"}
            </p>
            {printTicketData.customer_phone && (
              <p style={{ margin: "0 0 2px 0" }}>
                <strong>Teléfono:</strong> {printTicketData.customer_phone}
              </p>
            )}
          </div>
          
          <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "5px 0", marginBottom: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "50%" }}>Plato</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Cant</th>
                  <th style={{ textAlign: "right", width: "35%" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(printTicketData.items) && printTicketData.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ verticalAlign: "top" }}>
                    <td style={{ textAlign: "left", padding: "3px 0" }}>
                      <div>{item.name}</div>
                      {item.selected_size && (
                        <div style={{ fontSize: "9px", color: "#666" }}>
                          - {item.selected_size.name}
                        </div>
                      )}
                      {Array.isArray(item.selected_addons) && item.selected_addons.map((a: any, i: number) => (
                        <div key={i} style={{ fontSize: "9px", color: "#666" }}>
                          + {a.name} (${parseFloat(a.price).toLocaleString("es-CL")})
                        </div>
                      ))}
                      {item.special_instructions && (
                        <div style={{ fontSize: "9px", fontStyle: "italic", color: "#666" }}>
                          Note: "{item.special_instructions}"
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "3px 0" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", padding: "3px 0" }}>
                      {formatCurrency(parseFloat(item.item_total || item.base_price) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ fontSize: "10px", textAlign: "right", marginBottom: "10px" }}>
            <p style={{ margin: "0" }}>Subtotal: {formatCurrency(printTicketData.subtotal)}</p>
            <p style={{ margin: "0" }}>IVA (19%): {formatCurrency(printTicketData.tax)}</p>
            <p style={{ margin: "0", fontSize: "12px", fontWeight: "bold" }}>
              Total: {formatCurrency(printTicketData.total)}
            </p>
          </div>

          <div style={{ fontSize: "10px", borderTop: "1px dashed black", paddingTop: "5px" }}>
            <p style={{ margin: "0 0 2px 0" }}>
              <strong>Medio de Pago:</strong> {printTicketData.payment_method === "cash" ? "Efectivo" : printTicketData.payment_method === "card" ? "Tarjeta (POS)" : "Transferencia"}
            </p>
            <p style={{ margin: "0 0 2px 0" }}>
              <strong>Estado de Pago:</strong> {printTicketData.payment_status === "paid" ? "Pagado" : "Pendiente"}
            </p>
            {printTicketData.customer_notes && (
              <p style={{ margin: "2px 0 0 0", fontStyle: "italic" }}>
                <strong>Obs:</strong> "{printTicketData.customer_notes}"
              </p>
            )}
          </div>
          
          <div style={{ textAlign: "center", marginTop: "15px", fontSize: "9px" }}>
            <p style={{ margin: "0" }}>¡Gracias por su compra!</p>
            <p style={{ margin: "0", fontWeight: "bold" }}>Potenciado por CMOR FLOW</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Pos;
