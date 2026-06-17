import React, { useEffect, useState } from "react";
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
} from "../../services/restaurantService";
import type { MenuItem, Order, OrderItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { useRestaurantId } from "../../hooks/useAuth";
import { APP_CONFIG } from "../../config/config";

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
  const [orderError, setOrderError] = useState("");

  const restaurantId = useRestaurantId();

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

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate pricing
  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);
  const tax = subtotal * APP_CONFIG.taxRate;
  const total = subtotal + tax;

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

    setOrderSubmitting(true);
    setOrderError("");

    const orderData: Partial<Order> = {
      restaurant_id: restaurantId,
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
      status: finalStatus,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      customer_notes: customerNotes.trim() || undefined,
      internal_notes: "Pedido registrado desde Caja POS",
    };

    const { error } = await createOrder(orderData);
    setOrderSubmitting(false);

    if (!error) {
      setOrderSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerNotes("");
      setTableNumber("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");

      setTimeout(() => {
        setOrderSuccess(false);
      }, 3000);
    } else {
      setOrderError(error.message || "Ocurrió un error al registrar el pedido");
    }
  };

  const clearCart = () => {
    setCart([]);
    setOrderError("");
  };

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
              icon={<Search className="w-5 h-5 text-zinc-400" />}
              className="bg-white border-zinc-200"
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
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
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
            <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
              <Calculator className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">No se encontraron platos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-white rounded-xl border border-zinc-200 p-3 flex flex-col justify-between hover:shadow-md cursor-pointer transition-all active:scale-[0.98] select-none"
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
                      <div className="w-full h-24 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400 font-medium">
                        Sin Foto
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-zinc-500 truncate">{item.category}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-accent">
                      {formatCurrency(item.base_price)}
                    </span>
                    <Badge variant="neutral" className="text-[9px] px-1.5 py-0.5 bg-zinc-50 border-zinc-200 text-zinc-600">
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
      <div className="w-full lg:w-[380px] bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <h3 className="font-extrabold text-sm text-zinc-800 flex items-center gap-2">
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

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orderSuccess && (
            <Alert
              type="success"
              message="¡Pedido registrado exitosamente!"
              className="bg-emerald-50 border-emerald-250 text-emerald-800"
            />
          )}

          {orderError && (
            <Alert type="error" message={orderError} className="bg-red-50 border-red-200 text-red-800" />
          )}

          {cart.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 space-y-2">
              <ShoppingCart className="w-10 h-10 mx-auto text-zinc-300 opacity-60" />
              <p className="text-xs">El carrito está vacío</p>
              <p className="text-[10px] text-zinc-400">Haz clic en los platos de la izquierda para agregarlos</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-2.5 items-start justify-between pb-3 border-b border-zinc-100">
                <div className="flex-1 min-w-0 text-xs">
                  <h5 className="font-bold text-zinc-900 leading-tight">{item.menuItem.name}</h5>
                  
                  {/* Selected size */}
                  {item.selectedSize && (
                    <span className="block text-[10px] text-zinc-500 mt-0.5">
                      Tamaño: {item.selectedSize.name}
                    </span>
                  )}

                  {/* Selected addons */}
                  {item.selectedAddons.length > 0 && (
                    <span className="block text-[10px] text-zinc-500">
                      Agregados: {item.selectedAddons.map(a => a.name).join(", ")}
                    </span>
                  )}

                  {/* Instructions */}
                  {item.specialInstructions && (
                    <span className="block text-[10px] italic text-zinc-400">
                      Nota: "{item.specialInstructions}"
                    </span>
                  )}

                  <span className="block font-bold text-zinc-800 mt-1">
                    {formatCurrency(item.itemTotal * item.quantity)}
                  </span>
                </div>

                {/* Quantity adjustments */}
                <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-zinc-800 min-w-[12px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Details Form */}
        <div className="p-4 border-t border-zinc-100 space-y-3 bg-zinc-50/50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Order Type */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Tipo de Orden</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="counter">Llevar / Mostrador</option>
                <option value="table">Mesa</option>
                <option value="phone">Teléfono / Delivery</option>
              </select>
            </div>

            {/* Table Number */}
            {orderType === "table" ? (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Mesa *</label>
                <input
                  type="text"
                  placeholder="Mesa 5, Barra..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-bold text-zinc-850 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cliente</label>
                <input
                  type="text"
                  placeholder="Nombre cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            )}
          </div>

          {/* Collapsible / Extra Options */}
          {cart.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-150 text-xs">
              {/* Payment selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta (POS)</option>
                    <option value="transfer">🏦 Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Estado Pago</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent"
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
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-805 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Total details and checkout buttons */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
          <div className="space-y-1.5 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (19%):</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-900 border-t border-zinc-200 pt-1.5 font-extrabold">
              <span>Total:</span>
              <span className="text-base text-accent">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={cart.length === 0 || orderSubmitting}
              onClick={() => handlePlaceOrder("accepted")}
              className="text-xs border-zinc-350 text-zinc-700 hover:bg-zinc-100 flex items-center justify-center gap-1 px-2 py-2.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>A Cocina</span>
            </Button>
            <Button
              type="button"
              disabled={cart.length === 0 || orderSubmitting}
              onClick={() => handlePlaceOrder("completed")}
              loading={orderSubmitting}
              className="text-xs bg-red-600 hover:bg-red-750 text-white flex items-center justify-center gap-1 border-0 px-2 py-2.5 shadow-md shadow-red-900/10 active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Directo / Caja</span>
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
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Selecciona Tamaño</label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.sizes.map((sz) => (
                    <label
                      key={sz.name}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        modalSelectedSize?.name === sz.name
                          ? "border-red-650 bg-red-50/20 text-zinc-900"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
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
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Agregados Adicionales</label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.addons.map((ad) => {
                    const isSelected = modalSelectedAddons.some((a) => a.name === ad.name);
                    return (
                      <label
                        key={ad.name}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                          isSelected
                            ? "border-red-650 bg-red-50/20 text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <span className="text-xs font-semibold">{ad.name}</span>
                        <span className="text-xs font-bold text-zinc-500">+{formatCurrency(ad.price)}</span>
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
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Notas Especiales</label>
              <Textarea
                placeholder="Ej. Sin sésamo, con jengibre extra..."
                value={modalSpecialInstructions}
                onChange={(e) => setModalSpecialInstructions(e.target.value)}
                rows={2}
                className="bg-white border-zinc-200 text-xs text-zinc-800"
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
    </div>
  );
};

export default Pos;
