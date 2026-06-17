import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, ShoppingCart, Check } from "lucide-react";
import type { MenuItem } from "../config/supabase";
import { formatCurrency } from "../utils/helpers";

interface Message {
  sender: "user" | "bot";
  text: string;
  items?: MenuItem[];
}

interface AiChatbotProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem, selectedSize?: any, selectedAddons?: any[]) => void;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({ menuItems, onAddToCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        sender: "bot",
        text: "¡Hola! Soy tu asistente de recomendación 🍣. ¿Qué te gustaría probar hoy? Puedo sugerirte platos de nuestra carta según tus antojos (ej: rolls de salmón, algo picante, vegetariano o sugerencias del chef).",
      },
    ]);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const generateAIResponse = (userQuery: string): { text: string; items: MenuItem[] } => {
    const query = userQuery.toLowerCase().trim();
    let responseText = "";
    let recommended: MenuItem[] = [];

    // 1. Vegetarian search
    if (
      query.includes("vegetari") ||
      query.includes("veggie") ||
      query.includes("vege") ||
      query.includes("sin carne")
    ) {
      recommended = menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes("veggie") ||
          item.name.toLowerCase().includes("vegeta") ||
          item.description?.toLowerCase().includes("vegetari") ||
          item.description?.toLowerCase().includes("palta") ||
          item.description?.toLowerCase().includes("pepino")
      );
      if (recommended.length > 0) {
        responseText =
          "¡Por supuesto! Tenemos excelentes opciones vegetarianas y frescas para ti. Aquí tienes algunas recomendaciones:";
      } else {
        responseText =
          "Actualmente no encontré platos identificados como vegetarianos en el menú, pero puedes preguntar a nuestro personal si podemos adaptar alguno para ti.";
      }
    }
    // 2. Salmon search
    else if (query.includes("salmon") || query.includes("salmón")) {
      recommended = menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes("salmon") ||
          item.name.toLowerCase().includes("salmón") ||
          item.description?.toLowerCase().includes("salmon") ||
          item.description?.toLowerCase().includes("salmón")
      );
      if (recommended.length > 0) {
        responseText =
          "¡El salmón fresco es de nuestras especialidades favoritas! Te sugiero probar estas exquisitas opciones:";
      } else {
        responseText = "No encontré platos con salmón en la carta en este momento.";
      }
    }
    // 3. Spicy search
    else if (
      query.includes("picante") ||
      query.includes("spicy") ||
      query.includes("ají") ||
      query.includes("aji")
    ) {
      recommended = menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes("spicy") ||
          item.name.toLowerCase().includes("picante") ||
          item.description?.toLowerCase().includes("spicy") ||
          item.description?.toLowerCase().includes("picante") ||
          item.description?.toLowerCase().includes("ají")
      );
      if (recommended.length > 0) {
        responseText =
          "Si buscas ese toque picante y atrevido en tu paladar, te recomiendo ampliamente:";
      } else {
        responseText =
          "No encontré opciones picantes registradas, pero puedes pedir salsa spicy adicional al enviar tu orden.";
      }
    }
    // 4. Chef recommendation
    else if (
      query.includes("chef") ||
      query.includes("recomienda") ||
      query.includes("sugerencia") ||
      query.includes("especial") ||
      query.includes("mejor")
    ) {
      // Pick top 3 items (or first 3)
      recommended = menuItems.slice(0, 3);
      responseText =
        "¡Hola! Como recomendación de la casa, te sugiero probar nuestras especialidades más cotizadas y amadas por nuestros clientes:";
    }
    // 5. Cheap options
    else if (
      query.includes("barato") ||
      query.includes("econom") ||
      query.includes("precio") ||
      query.includes("promo") ||
      query.includes("descuento")
    ) {
      recommended = [...menuItems].sort((a, b) => a.base_price - b.base_price).slice(0, 3);
      responseText = "Aquí tienes algunas opciones ricas e ideales para tu presupuesto:";
    }
    // 6. Generic search by keyword
    else {
      recommended = menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );

      if (recommended.length > 0) {
        responseText = `Encontré estas deliciosas opciones que coinciden con tu búsqueda de "${userQuery}":`;
      } else {
        responseText = `No encontré platos específicos con "${userQuery}" en nuestro menú. ¿Por qué no pruebas preguntando por "rolls de salmón", "vegetariano" o "recomendación del chef"?`;
      }
    }

    return {
      text: responseText,
      items: recommended.slice(0, 3), // Limit to top 3 recommendations
    };
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInputValue("");
    setIsTyping(true);

    // Mock thinking delay
    setTimeout(() => {
      const result = generateAIResponse(query);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: result.text,
          items: result.items,
        },
      ]);
    }, 800);
  };

  const handleSuggestClick = (tag: string) => {
    handleSend(tag);
  };

  const handleAddToCartClick = (item: MenuItem) => {
    onAddToCart(item);
    
    // Trigger quick visual check feedback on the button
    setAddedItemIds(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [item.id]: false }));
    }, 2000);
  };

  const suggestions = [
    "Recomendación del chef 🌟",
    "Rolls con salmón 🍣",
    "Opciones vegetarianas 🥬",
    "Algo picante o spicy 🌶️",
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 lg:right-8 bg-gradient-to-tr from-red-650 to-amber-500 text-white p-3.5 rounded-full shadow-2xl z-40 hover:scale-105 transition-all duration-300 flex items-center justify-center animate-bounce group"
        style={{ animationDuration: "3s" }}
        title="Recomendador AI"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12" />
        <span className="absolute right-14 bg-zinc-900 text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-lg border border-zinc-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Tienes dudas? ¡Pregúntame! 🤖
        </span>
      </button>

      {/* Chat Container */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 lg:right-8 w-[calc(100vw-2rem)] sm:w-96 h-[480px] bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-tr from-zinc-950 via-zinc-900 to-red-950 p-4 border-b border-zinc-800 flex items-center justify-between text-white select-none">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-red-600/10 border border-red-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                  <span>Recomendador AI</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                </h4>
                <p className="text-[10px] text-zinc-400">Asistente digital de la casa</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Chat bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    msg.sender === "user"
                      ? "bg-zinc-900 text-white rounded-tr-none font-medium"
                      : "bg-white text-zinc-850 border border-zinc-200 shadow-sm rounded-tl-none leading-relaxed"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Recommended Items */}
                {msg.items && msg.items.length > 0 && (
                  <div className="mt-2.5 space-y-2 w-[85%] select-none">
                    {msg.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-zinc-200 p-2.5 flex items-center justify-between shadow-sm hover:border-red-500/30 transition-all"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              width={40}
                              height={40}
                              className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400 font-bold flex-shrink-0">
                              Sushi
                            </div>
                          )}
                          <div className="min-w-0 text-[11px]">
                            <h5 className="font-bold text-zinc-800 truncate">{item.name}</h5>
                            <span className="font-extrabold text-red-650">
                              {formatCurrency(item.base_price)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCartClick(item)}
                          className={`ml-2 p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                            addedItemIds[item.id]
                              ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                              : "bg-red-50/50 hover:bg-red-650 text-red-650 hover:text-white border-red-200 hover:border-transparent active:scale-95"
                          }`}
                          title="Añadir al carrito"
                        >
                          {addedItemIds[item.id] ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center space-x-1 p-2 bg-white rounded-2xl border border-zinc-200 shadow-sm w-16 justify-center">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions list */}
          {messages.length < 5 && (
            <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-150 overflow-x-auto flex gap-1.5 scrollbar-hide select-none whitespace-nowrap">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSuggestClick(tag)}
                  className="px-2.5 py-1 bg-white border border-zinc-200 rounded-full text-[10px] font-semibold text-zinc-650 hover:border-red-500/50 hover:text-red-650 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t border-zinc-200 bg-white flex items-center space-x-2">
            <input
              type="text"
              placeholder="Pregúntame algo..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent text-zinc-800"
            />
            <button
              onClick={() => handleSend()}
              className="bg-red-650 text-white p-2 rounded-xl hover:bg-red-750 transition-colors active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
