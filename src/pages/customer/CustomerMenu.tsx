import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
} from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { APP_CONFIG } from "../../config/config";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { AiChatbot } from "../../components/AiChatbot";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Load restaurant and menu
  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        setMenuItems(data);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Restaurant not found");
      setLoading(false);
      return;
    }

    setRestaurant(data);
  };

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (
    item: MenuItem,
    selectedSize?: any,
    selectedAddons: any[] = []
  ) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const itemTotal = basePrice + addonsTotal;

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      selectedSize,
      selectedAddons,
      itemTotal,
    };

    const existingIndex = cart.findIndex(
      (ci) =>
        ci.id === item.id &&
        ci.selectedSize?.name === selectedSize?.name &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    if ((item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0)) {
      setSelectedItem(item);
      setShowItemModal(true);
    } else {
      addToCart(item);
    }
  };

  if (loading) {
    return <Loading text="Cargando la carta digital..." />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8 flex flex-col items-center max-w-md">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            Restaurante no encontrado
          </h2>
          <p className="text-text-secondary">
            El restaurante al que intentas acceder no existe o no se encuentra activo.
          </p>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return cart.reduce((sum, cartItem) => {
      if (cartItem.id === itemId) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);
  };

  const handleAddSimple = (item: MenuItem) => {
    addToCart(item);
  };

  const handleRemoveItem = (itemId: string) => {
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-accent/5 flex items-center justify-center font-bold text-accent">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-800">
                {restaurant.name}
              </h1>
              <p className="text-xs text-gray-500">
                {restaurant.restaurant_type}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plato o bebida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[108px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  categoryFilter === category
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {category === "all" ? "Todos" : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              const hasVariations =
                (item.sizes && item.sizes.length > 0) ||
                (item.addons && item.addons.length > 0);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-tight">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 pt-0">
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="font-bold text-gray-800">
                          {item.sizes && item.sizes.length > 0
                            ? formatCurrency(
                                Math.min(...item.sizes.map((s) => s.price))
                              )
                            : formatCurrency(item.base_price)}
                        </p>
                      </div>

                      {item.is_available && (
                        <div className="flex-shrink-0">
                          {quantity === 0 ? (
                            <button
                              onClick={() =>
                                hasVariations
                                  ? handleItemClick(item)
                                  : handleAddSimple(item)
                              }
                              className="px-4 py-1.5 border border-accent text-accent font-bold text-xs rounded-lg hover:bg-accent hover:text-white transition-colors"
                            >
                              AÑADIR
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-lg">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2 py-1.5 hover:bg-accent-hover rounded-l-lg"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-bold text-xs">
                                {quantity}
                              </span>
                              <button
                                onClick={() =>
                                  hasVariations
                                    ? handleItemClick(item)
                                    : handleAddSimple(item)
                                }
                                className="px-2 py-1.5 hover:bg-accent-hover rounded-r-lg"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="py-12 flex flex-col items-center justify-center gap-2 border-t border-border mt-12 text-center max-w-screen-lg mx-auto px-4">
        <CmorFlowLogo size="sm" showText={true} />
        <p className="text-xs text-text-secondary">
          Pedidos interactivos por mesa — Potenciado por CMOR FLOW
        </p>
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>Ver Carrito</span>
              <span className="text-lg">›</span>
            </div>
          </button>
        </div>
      )}
      {/* AI Chatbot Recommendations */}
      <AiChatbot menuItems={menuItems} onAddToCart={handleAddSimple} />
    </div>
  );
};

// Cart Modal Component
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}) => {
  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tu Carrito" size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">
                        Tamaño: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Agregados:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-accent font-semibold mt-1">
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 text-error hover:bg-error/10 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                Proceder al Pago / Envío
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Item Customization Modal Component
interface ItemCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedSize?: any, selectedAddons?: any[]) => void;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  item,
  onClose,
  onAdd,
}) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0]);
    }
  }, [item]);

  if (!item) return null;

  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    return basePrice + addonsTotal;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name} size="md">
      <div className="space-y-6">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        {item.description && (
          <p className="text-text-secondary">{item.description}</p>
        )}

        {/* Sizes */}
        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Selecciona el Tamaño</h4>
            <div className="space-y-2">
              {item.sizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setSelectedSize(size)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedSize?.name === size.name
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{size.name}</span>
                  <span className="text-accent font-semibold">
                    {formatCurrency(size.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addons */}
        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Agregados Adicionales (Opcional)</h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedAddons.find((a) => a.name === addon.name)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{addon.name}</span>
                  <span className="text-accent font-semibold">
                    +{formatCurrency(addon.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xl font-bold text-text mb-4">
            <span>Total</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button
            onClick={() => onAdd(item, selectedSize, selectedAddons)}
            fullWidth
            size="lg"
          >
            Agregar al Carrito
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const tax = subtotal * APP_CONFIG.taxRate; // 19% IVA (Chile)
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Por favor ingresa tu nombre");
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/[\s\-()]/g, "").length < 8) {
      setError("Por favor ingresa un número de teléfono válido");
      return;
    }

    if (orderType === "table" && !tableNumber.trim()) {
      setError("Por favor indica tu número de mesa");
      return;
    }

    setLoading(true);

    const orderData = {
      restaurant_id: restaurantId,
      order_type: (orderType === "table" ? "qr" : "counter") as
        | "qr"
        | "counter",
      table_number: orderType === "table" ? tableNumber : undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
        special_instructions: undefined,
      })),
      subtotal,
      tax,
      total,
      customer_notes: notes,
    };

    const { error: orderError } = await createOrder(orderData);
    setLoading(false);

    if (!orderError) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 2000);
    } else {
      setError(orderError?.message || "No se pudo realizar el pedido");
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setTableNumber("");
    setNotes("");
    setOrderType("table");
    setSuccess(false);
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="¡Pedido Enviado!" size="md">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">
            ¡Pedido Exitoso!
          </h3>
          <p className="text-text-secondary mb-6">
            Tu pedido ha sido recibido por la cocina. Estará listo a la brevedad.
          </p>
          <Button onClick={onClose} fullWidth>
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar Pedido" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-3">Opción de Entrega</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "table"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Consumo en Local
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "takeaway"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Para Llevar
            </button>
          </div>
        </div>

        {/* Table Number (only for table orders) */}
        {orderType === "table" && (
          <Input
            label="Número de Mesa"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Ej: Mesa 4, Barra, Terraza 2"
            required
          />
        )}

        {/* Customer Details */}
        <Input
          label="Tu Nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Escribe tu nombre"
          required
        />

        <Input
          label="Número de Teléfono"
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Ej: +56912345678"
          required
          helperText="Te contactaremos a este número si hay alguna duda con tu orden"
        />

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Comentarios o Indicaciones Especiales (Opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Sin cebolla, aderezos aparte, servilletas extra..."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Resumen de tu Pedido</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {item.name}
                {item.selectedSize && ` (${item.selectedSize.name})`}
              </span>
              <span className="text-text">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-text-secondary text-xs">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary text-xs">
              <span>IVA (19%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-text pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Confirmar y Enviar Pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
