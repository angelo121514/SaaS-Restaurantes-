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
import { formatCurrency as baseFormatCurrency } from "../../utils/helpers";
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


const TRANSLATIONS = {
  es: {
    loading: "Cargando la carta digital...",
    notFound: "Restaurante no encontrado",
    notFoundDesc: "El restaurante al que intentas acceder no existe o no se encuentra activo.",
    open: "Abierto",
    qrOrders: "Pedidos por Mesa con QR instantáneo",
    fastPrep: "⚡ Preparación Rápida",
    securePayment: "💳 Pago Seguro POS",
    searchPlaceholder: "Buscar plato o bebida...",
    all: "Todos",
    noProducts: "No se encontraron productos",
    customizable: "Personalizable",
    outOfStock: "Agotado",
    price: "Precio",
    add: "AGREGAR",
    viewCart: "Ver Carrito",
    poweredBy: "Pedidos interactivos por mesa — Potenciado por CMOR FLOW",
    yourCart: "Tu Carrito",
    cartEmpty: "Tu carrito está vacío",
    size: "Tamaño",
    addons: "Agregados",
    total: "Total",
    proceedToCheckout: "Proceder al Pago / Envío",
    selectSize: "Selecciona el Tamaño",
    addonsOptional: "Agregados Adicionales (Opcional)",
    addToCart: "Agregar al Carrito",
    orderSent: "¡Pedido Enviado!",
    orderSuccess: "¡Pedido Exitoso!",
    orderSuccessDesc: "Tu pedido ha sido recibido por la cocina. Estará listo a la brevedad.",
    close: "Cerrar",
    sendOrder: "Enviar Pedido",
    deliveryOption: "Opción de Entrega",
    dineIn: "Consumo en Local",
    takeaway: "Para Llevar",
    tableNumber: "Número de Mesa",
    tableNumberPlaceholder: "Ej: Mesa 4, Barra, Terraza 2",
    yourName: "Tu Nombre",
    yourNamePlaceholder: "Escribe tu nombre",
    phoneNumber: "Número de Teléfono",
    phoneNumberPlaceholder: "Ej: +56912345678",
    phoneHelper: "Te contactaremos a este número si hay alguna duda con tu orden",
    specialInstructions: "Comentarios o Indicaciones Especiales (Opcional)",
    specialInstructionsPlaceholder: "Ej: Sin cebolla, aderezos aparte, servilletas extra...",
    orderSummary: "Resumen de tu Pedido",
    subtotal: "Subtotal",
    tax: "IVA (19%)",
    cancel: "Cancelar",
    confirmOrder: "Confirmar y Enviar Pedido",
    errorName: "Por favor ingresa tu nombre",
    errorPhone: "Por favor ingresa un número de teléfono válido",
    errorTable: "Por favor indica tu número de mesa",
    errorSubmit: "No se pudo realizar el pedido",
  },
  en: {
    loading: "Loading digital menu...",
    notFound: "Restaurant not found",
    notFoundDesc: "The restaurant you are trying to access does not exist or is not active.",
    open: "Open",
    qrOrders: "Instant QR table ordering",
    fastPrep: "⚡ Fast Prep",
    securePayment: "💳 Secure POS Payment",
    searchPlaceholder: "Search dish or beverage...",
    all: "All",
    noProducts: "No products found",
    customizable: "Customizable",
    outOfStock: "Out of Stock",
    price: "Price",
    add: "ADD",
    viewCart: "View Cart",
    poweredBy: "Interactive table ordering — Powered by CMOR FLOW",
    yourCart: "Your Cart",
    cartEmpty: "Your cart is empty",
    size: "Size",
    addons: "Addons",
    total: "Total",
    proceedToCheckout: "Proceed to Checkout",
    selectSize: "Select Size",
    addonsOptional: "Additional Addons (Optional)",
    addToCart: "Add to Cart",
    orderSent: "Order Sent!",
    orderSuccess: "Success!",
    orderSuccessDesc: "Your order has been received by the kitchen. It will be ready shortly.",
    close: "Close",
    sendOrder: "Send Order",
    deliveryOption: "Delivery Option",
    dineIn: "Dine In",
    takeaway: "Takeaway",
    tableNumber: "Table Number",
    tableNumberPlaceholder: "e.g. Table 4, Bar, Terrace 2",
    yourName: "Your Name",
    yourNamePlaceholder: "Write your name",
    phoneNumber: "Phone Number",
    phoneNumberPlaceholder: "e.g. +56912345678",
    phoneHelper: "We will contact you at this number if there are questions about your order",
    specialInstructions: "Special Comments or Instructions (Optional)",
    specialInstructionsPlaceholder: "e.g. No onions, dressings on the side, extra napkins...",
    orderSummary: "Order Summary",
    subtotal: "Subtotal",
    tax: "VAT (19%)",
    cancel: "Cancel",
    confirmOrder: "Confirm & Send Order",
    errorName: "Please enter your name",
    errorPhone: "Please enter a valid phone number",
    errorTable: "Please enter your table number",
    errorSubmit: "Failed to place order",
  }
};

const ImageCarousel: React.FC<{ images: string[]; alt: string }> = ({ images, alt }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-56 overflow-hidden rounded-xl bg-gray-100 group shadow-md">
      <div 
        className="flex w-full h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${alt} - ${idx + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 md:opacity-100 active:scale-95 z-10 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 md:opacity-100 active:scale-95 z-10 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeIndex === idx ? "bg-white w-4" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const getItemTags = (item: MenuItem, lang: "es" | "en" = "es") => {
  const tags: { label: string; colorClass: string }[] = [];
  const text = ((item.name || "") + " " + (item.description || "")).toLowerCase();
  
  if (text.includes("vegano") || text.includes("vegan")) {
    tags.push({ label: lang === "es" ? "Vegano" : "Vegan", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100" });
  } else if (text.includes("vegetari") || text.includes("margherita") || text.includes("queso")) {
    tags.push({ label: lang === "es" ? "Vegetariano" : "Vegetarian", colorClass: "bg-green-50 text-green-700 border-green-100" });
  }
  
  if (text.includes("sin gluten") || text.includes("gluten-free") || text.includes("celiac")) {
    tags.push({ label: lang === "es" ? "Sin Gluten" : "Gluten Free", colorClass: "bg-sky-50 text-sky-700 border-sky-100" });
  }
  
  if (text.includes("picante") || text.includes("ají") || text.includes("hot") || text.includes("chili")) {
    tags.push({ label: lang === "es" ? "🌶️ Picante" : "🌶️ Spicy", colorClass: "bg-rose-50 text-rose-700 border-rose-100" });
  }
  
  if (text.includes("chef") || text.includes("recomend") || text.includes("especial") || text.includes("pizza margherita") || text.includes("vegana")) {
    tags.push({ label: lang === "es" ? "⭐ Destacado" : "⭐ Featured", colorClass: "bg-amber-50 text-amber-700 border-amber-100" });
  }
  
  return tags;
};

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

  const [lang, setLang] = useState<"es" | "en">("es");
  const [activeCurrency, setActiveCurrency] = useState<string>("CLP");

  useEffect(() => {
    if (restaurant) {
      setLang((restaurant.default_language as "es" | "en") || "es");
      setActiveCurrency(restaurant.currency || "CLP");
    }
  }, [restaurant]);

  const formatCurrency = (amount: number | undefined | null) => {
    return baseFormatCurrency(amount, activeCurrency, restaurant?.usd_exchange_rate || 950);
  };

  const t = (key: keyof typeof TRANSLATIONS.es) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.es[key] || "";
  };

  const translateText = (text: string) => {
    if (lang === "es" || !text) return text;
    const dict: Record<string, string> = {
      "Pizza Margherita": "Margherita Pizza",
      "Deliciosa pizza con salsa de tomate natural, queso mozzarella y albahaca fresca.": "Delicious pizza with natural tomato sauce, mozzarella cheese, and fresh basil.",
      "Masa delgada": "Thin crust",
      "Familiar": "Family size",
      "Queso extra": "Extra cheese",
      "Champiñones": "Mushrooms",
      "Sushi Roll": "Sushi Roll",
      "Roll de salmón y palta envuelto en sésamo.": "Salmon and avocado roll wrapped in sesame.",
      "9 piezas": "9 pieces",
      "Salsa teriyaki": "Teriyaki sauce",
      "Salsa spicy": "Spicy sauce",
      "Hamburguesa Clásica": "Classic Burger",
      "Hamburguesa con queso cheddar, lechuga, tomate y salsa especial.": "Burger with cheddar cheese, lettuce, tomato, and special sauce.",
      "Simple": "Single patty",
      "Doble": "Double patty",
      "Papas fritas": "French fries",
      "Bebida": "Soft Drink",
      "Bebida en lata 350ml.": "Canned soda 350ml.",
      "Normal": "Regular",
      "Zero": "Zero sugar",
      "Todos": "All",
      "Entradas": "Appetizers",
      "Platos Fuertes": "Entrées",
      "Postres": "Desserts",
      "Bebidas": "Drinks",
      "Pizzas": "Pizzas",
      "Sushi": "Sushi",
      "Hamburguesas": "Burgers",
    };
    return dict[text] || text;
  };

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
    return <Loading text={t("loading")} />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8 flex flex-col items-center max-w-md">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            {t("notFound")}
          </h2>
          <p className="text-text-secondary">
            {t("notFoundDesc")}
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
      {/* Cover Banner */}
      <div className="h-44 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Restaurant Info Panel */}
      <div className="max-w-screen-lg mx-auto px-4 -mt-16 relative z-10 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border-4 border-white shadow-md flex items-center justify-center font-black text-2xl text-accent flex-shrink-0">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-2xl text-gray-900 leading-tight">
                  {restaurant.name}
                </h1>
                <span className="bg-success/10 text-success text-xs font-bold px-2 py-0.5 rounded-full border border-success/20">
                  {t("open")}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <span className="font-semibold text-accent">{restaurant.restaurant_type}</span>
                <span>•</span>
                <span>Santiago, Chile</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t("qrOrders")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs border-t border-gray-100 pt-3 md:border-t-0 md:pt-0">
            <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-gray-650 font-medium">{t("fastPrep")}</span>
            <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-gray-650 font-medium">{t("securePayment")}</span>
          </div>
        </div>
      </div>

      {/* Sticky Header with Search and Categories */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white text-sm">
                {restaurant.name.charAt(0)}
              </div>
              <span className="font-extrabold text-sm text-gray-800 hidden sm:inline">{restaurant.name}</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Language Selector */}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as "es" | "en")}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent font-bold cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="es">🇪🇸 ES</option>
                <option value="en">🇺🇸 EN</option>
              </select>

              {/* Currency Selector */}
              <select
                value={activeCurrency}
                onChange={(e) => setActiveCurrency(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent font-bold cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="CLP">CLP ($)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Category Tabs inside sticky bar */}
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide border-t border-gray-100 pt-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  categoryFilter === category
                    ? "bg-accent text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category === "all" ? t("all") : translateText(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">{t("noProducts")}</p>
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
                  className="bg-white rounded-xl overflow-hidden shadow-sm flex flex-col justify-between border border-gray-150 hover:shadow-md transition-shadow group duration-200"
                >
                  <div className="cursor-pointer" onClick={() => handleItemClick(item)}>
                    <div className="relative h-36 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={translateText(item.name)}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                          <Package className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                      {hasVariations && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {t("customizable")}
                          </span>
                        </div>
                      )}
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                            {t("outOfStock")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                        {translateText(item.name)}
                      </h3>
                      
                      {/* Dynamic food tags */}
                      {getItemTags(item, lang).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {getItemTags(item, lang).map((tag, idx) => (
                            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${tag.colorClass}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-snug">
                          {translateText(item.description)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 pt-0">
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">{t("price")}</span>
                        <p className="font-extrabold text-sm text-gray-900">
                          {item.sizes && item.sizes.length > 0
                            ? formatCurrency(
                                Math.min(...item.sizes.map((s) => s.price))
                              )
                            : formatCurrency(item.base_price)}
                          {item.sizes && item.sizes.length > 0 && <span className="text-[10px] text-gray-400 font-medium"> +</span>}
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
                              className="px-4 py-1.5 border border-accent text-accent font-extrabold text-xs rounded-lg hover:bg-accent hover:text-white active:scale-95 transition-all shadow-sm shadow-accent/5"
                            >
                              {t("add")}
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-lg shadow-sm">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2.5 py-1.5 hover:bg-accent-hover rounded-l-lg transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-bold text-xs select-none">
                                {quantity}
                              </span>
                              <button
                                onClick={() =>
                                  hasVariations
                                    ? handleItemClick(item)
                                    : handleAddSimple(item)
                                }
                                className="px-2.5 py-1.5 hover:bg-accent-hover rounded-r-lg transition-colors"
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
          {t("poweredBy")}
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
        lang={lang}
        activeCurrency={activeCurrency}
        exchangeRate={restaurant?.usd_exchange_rate || 950}
      />

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
        lang={lang}
        activeCurrency={activeCurrency}
        exchangeRate={restaurant?.usd_exchange_rate || 950}
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
        lang={lang}
        activeCurrency={activeCurrency}
        exchangeRate={restaurant?.usd_exchange_rate || 950}
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
              <span>{t("viewCart")}</span>
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
  lang: "es" | "en";
  activeCurrency: string;
  exchangeRate: number;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  lang,
  activeCurrency,
  exchangeRate,
}) => {
  const formatCurrency = (amount: number | undefined | null) => {
    return baseFormatCurrency(amount, activeCurrency, exchangeRate);
  };

  const t = (key: keyof typeof TRANSLATIONS.es) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.es[key] || "";
  };

  const translateText = (text: string) => {
    if (lang === "es" || !text) return text;
    const dict: Record<string, string> = {
      "Masa delgada": "Thin crust",
      "Familiar": "Family size",
      "Queso extra": "Extra cheese",
      "Champiñones": "Mushrooms",
      "9 piezas": "9 pieces",
      "Salsa teriyaki": "Teriyaki sauce",
      "Salsa spicy": "Spicy sauce",
      "Simple": "Single patty",
      "Doble": "Double patty",
      "Papas fritas": "French fries",
      "Normal": "Regular",
      "Zero": "Zero sugar",
    };
    return dict[text] || text;
  };

  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("yourCart")} size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">{t("cartEmpty")}</p>
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
                    <h4 className="font-semibold text-text">{translateText(item.name)}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">
                        {lang === "es" ? "Tamaño" : "Size"}: {translateText(item.selectedSize.name)}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        {lang === "es" ? "Agregados" : "Addons"}:{" "}
                        {item.selectedAddons.map((a) => translateText(a.name)).join(", ")}
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
                <span>{t("total")}</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                {t("proceedToCheckout")}
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
  lang: "es" | "en";
  activeCurrency: string;
  exchangeRate: number;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  item,
  onClose,
  onAdd,
  lang,
  activeCurrency,
  exchangeRate,
}) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0]);
    }
  }, [item]);

  const formatCurrency = (amount: number | undefined | null) => {
    return baseFormatCurrency(amount, activeCurrency, exchangeRate);
  };

  const t = (key: keyof typeof TRANSLATIONS.es) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.es[key] || "";
  };

  const translateText = (text: string) => {
    if (lang === "es" || !text) return text;
    const dict: Record<string, string> = {
      "Pizza Margherita": "Margherita Pizza",
      "Deliciosa pizza con salsa de tomate natural, queso mozzarella y albahaca fresca.": "Delicious pizza with natural tomato sauce, mozzarella cheese, and fresh basil.",
      "Masa delgada": "Thin crust",
      "Familiar": "Family size",
      "Queso extra": "Extra cheese",
      "Champiñones": "Mushrooms",
      "Sushi Roll": "Sushi Roll",
      "Roll de salmón y palta envuelto en sésamo.": "Salmon and avocado roll wrapped in sesame.",
      "9 piezas": "9 pieces",
      "Salsa teriyaki": "Teriyaki sauce",
      "Salsa spicy": "Spicy sauce",
      "Hamburguesa Clásica": "Classic Burger",
      "Hamburguesa con queso cheddar, lechuga, tomate y salsa especial.": "Burger with cheddar cheese, lettuce, tomato, and special sauce.",
      "Simple": "Single patty",
      "Doble": "Double patty",
      "Papas fritas": "French fries",
      "Bebida": "Soft Drink",
      "Bebida en lata 350ml.": "Canned soda 350ml.",
      "Normal": "Regular",
      "Zero": "Zero sugar",
    };
    return dict[text] || text;
  };

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
    <Modal isOpen={isOpen} onClose={onClose} title={translateText(item.name)} size="md">
      <div className="space-y-6">
        {item.image_urls && item.image_urls.length > 1 ? (
          <ImageCarousel images={item.image_urls} alt={item.name} />
        ) : item.image_url ? (
          <img
            src={item.image_url}
            alt={translateText(item.name)}
            loading="lazy"
            className="w-full h-48 object-cover rounded-lg"
          />
        ) : null}

        {item.description && (
          <p className="text-text-secondary">{translateText(item.description)}</p>
        )}

        {/* Sizes */}
        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{t("selectSize")}</h4>
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
                  <span className="font-medium text-text">{translateText(size.name)}</span>
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
            <h4 className="font-semibold text-text mb-3">{t("addonsOptional")}</h4>
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
                  <span className="font-medium text-text">{translateText(addon.name)}</span>
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
            <span>{t("total")}</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button
            onClick={() => onAdd(item, selectedSize, selectedAddons)}
            fullWidth
            size="lg"
          >
            {t("addToCart")}
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
  lang: "es" | "en";
  activeCurrency: string;
  exchangeRate: number;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  onClose,
  onSuccess,
  lang,
  activeCurrency,
  exchangeRate,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formatCurrency = (amount: number | undefined | null) => {
    return baseFormatCurrency(amount, activeCurrency, exchangeRate);
  };

  const t = (key: keyof typeof TRANSLATIONS.es) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.es[key] || "";
  };

  const translateText = (text: string) => {
    if (lang === "es" || !text) return text;
    const dict: Record<string, string> = {
      "Pizza Margherita": "Margherita Pizza",
      "Masa delgada": "Thin crust",
      "Familiar": "Family size",
      "Queso extra": "Extra cheese",
      "Champiñones": "Mushrooms",
      "Sushi Roll": "Sushi Roll",
      "9 piezas": "9 pieces",
      "Salsa teriyaki": "Teriyaki sauce",
      "Salsa spicy": "Spicy sauce",
      "Hamburguesa Clásica": "Classic Burger",
      "Simple": "Single patty",
      "Doble": "Double patty",
      "Papas fritas": "French fries",
      "Bebida": "Soft Drink",
      "Normal": "Regular",
      "Zero": "Zero sugar",
    };
    return dict[text] || text;
  };

  // Calculate pricing (VAT inclusive)
  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const subtotal = total / 1.19;
  const tax = total - subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError(t("errorName"));
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/[\s\-()]/g, "").length < 8) {
      setError(t("errorPhone"));
      return;
    }

    if (orderType === "table" && !tableNumber.trim()) {
      setError(t("errorTable"));
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
      setError(orderError?.message || t("errorSubmit"));
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
      <Modal isOpen={isOpen} onClose={onClose} title={t("orderSent")} size="md">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">
            {t("orderSuccess")}
          </h3>
          <p className="text-text-secondary mb-6">
            {t("orderSuccessDesc")}
          </p>
          <Button onClick={onClose} fullWidth>
            {t("close")}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("sendOrder")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-3">{t("deliveryOption")}</label>
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
              {t("dineIn")}
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
              {t("takeaway")}
            </button>
          </div>
        </div>

        {/* Table Number (only for table orders) */}
        {orderType === "table" && (
          <Input
            label={t("tableNumber")}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder={t("tableNumberPlaceholder")}
            required
          />
        )}

        {/* Customer Details */}
        <Input
          label={t("yourName")}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t("yourNamePlaceholder")}
          required
        />

        <Input
          label={t("phoneNumber")}
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder={t("phoneNumberPlaceholder")}
          required
          helperText={t("phoneHelper")}
        />

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">{t("specialInstructions")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("specialInstructionsPlaceholder")}
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">{t("orderSummary")}</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {translateText(item.name)}
                {item.selectedSize && ` (${translateText(item.selectedSize.name)})`}
              </span>
              <span className="text-text">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-text-secondary text-xs">
              <span>{t("subtotal")}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary text-xs">
              <span>{t("tax")}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-text pt-2 border-t border-border">
              <span>{t("total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {t("confirmOrder")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
