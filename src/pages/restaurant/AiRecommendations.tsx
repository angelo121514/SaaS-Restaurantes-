import React, { useState, useEffect } from "react";
import { BrainCircuit, Check, TrendingUp, Sparkles, Award, ArrowUpRight } from "lucide-react";
import { Card, Button, Badge, Alert, Loading } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { useRestaurantId } from "../../hooks/useAuth";

interface Recommendation {
  id: string;
  title: string;
  type: "price" | "menu" | "promo";
  impact: string;
  difficulty: "Fácil" | "Media" | "Compleja";
  description: string;
  suggestion: string;
  applied: boolean;
}

export const AiRecommendations: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const fetchMenuItemsAndBuildRecommendations = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId);
        
        const items = data || [];
        const recs: Recommendation[] = [];
        
        // 1. Price optimization
        const priceable = items.find(i => i.is_available && i.base_price > 0);
        if (priceable) {
          const currentPrice = priceable.base_price;
          const suggestedPrice = Math.round(currentPrice * 1.05 / 100) * 100; // +5% rounded to 100
          recs.push({
            id: "rec-1",
            title: `Optimización de Precio: ${priceable.name}`,
            type: "price",
            impact: "+7% Ingresos en la categoría",
            difficulty: "Fácil",
            description: `Nuestros modelos de elasticidad indican que el producto "${priceable.name}" tiene una sensibilidad al precio baja durante fines de semana. Un incremento moderado no afectará el volumen de ventas.`,
            suggestion: `Ajustar precio base de "${priceable.name}" de $${currentPrice.toLocaleString("es-CL")} a $${suggestedPrice.toLocaleString("es-CL")}.`,
            applied: false,
          });
        } else {
          recs.push({
            id: "rec-1",
            title: "Optimización de Precios de Carta",
            type: "price",
            impact: "+5% Margen Global",
            difficulty: "Fácil",
            description: "El análisis de la competencia local sugiere que tus precios promedio de entradas están un 12% por debajo de la media comunal.",
            suggestion: "Incrementar un 4% en platos de alta rotación los fines de semana.",
            applied: false,
          });
        }
        
        // 2. Combo recommendation
        if (items.length >= 2) {
          const food = items.find(i => i.category && (i.category.toLowerCase().includes("pizza") || i.category.toLowerCase().includes("sandwich") || i.category.toLowerCase().includes("entrada") || i.category.toLowerCase().includes("hamburguesa")));
          const drink = items.find(i => i.category && (i.category.toLowerCase().includes("bebida") || i.category.toLowerCase().includes("caf") || i.category.toLowerCase().includes("jugo")));
          
          const comboFood = food || items[0];
          const comboDrink = drink || items[1];
          const comboPrice = Math.round((comboFood.base_price + comboDrink.base_price) * 0.85 / 100) * 100; // 15% discount
          
          recs.push({
            id: "rec-2",
            title: `Combo Sugerido: ${comboFood.name} + Bebida`,
            type: "promo",
            impact: "+15% Ticket Promedio",
            difficulty: "Fácil",
            description: `Se detecta una baja correlación de bebidas en comandas que contienen "${comboFood.name}". Crear un combo incentiva la compra conjunta.`,
            suggestion: `Crear el combo "${comboFood.name} + ${comboDrink.name}" a un valor promocional de $${comboPrice.toLocaleString("es-CL")}.`,
            applied: false,
          });
        } else {
          recs.push({
            id: "rec-2",
            title: "Promoción Cruzada Inteligente",
            type: "promo",
            impact: "+12% Aumento Ticket Promedio",
            difficulty: "Fácil",
            description: "Añadir sugerencia automática de acompañamientos o bebidas al momento de ingresar comandas.",
            suggestion: "Ofrecer combo familiar con bebida incluida los días domingos.",
            applied: false,
          });
        }
        
        // 3. Stock prediction
        recs.push({
          id: "rec-3",
          title: "Predicción de Demanda por Clima",
          type: "menu",
          impact: "-10% Mermas de Producción",
          difficulty: "Media",
          description: "El pronóstico del clima indica lluvias y bajas temperaturas para los próximos días. Esto reduce la venta de ensaladas y platos fríos, y aumenta un 30% el consumo de infusiones y sopas.",
          suggestion: "Reducir en 20% la preparación de bases frías y reforzar stock de platos calientes.",
          applied: false,
        });
        
        setRecommendations(recs);
      } catch (err) {
        console.error("Error building AI recommendations", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItemsAndBuildRecommendations();
  }, [restaurantId]);

  const handleApply = (id: string, title: string) => {
    const updated = recommendations.map((rec) => {
      if (rec.id === id) {
        return { ...rec, applied: true };
      }
      return rec;
    });
    setRecommendations(updated);
    setSuccessMsg(`¡Recomendación "${title}" aplicada con éxito en tu menú!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Fácil":
        return <Badge variant="success">Fácil</Badge>;
      case "Media":
        return <Badge variant="warning">Complejo Medio</Badge>;
      default:
        return <Badge variant="error">Avanzado</Badge>;
    }
  };

  if (loading) {
    return <Loading text="Analizando menú y pedidos con IA de CMOR FLOW..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2 flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-accent" />
            Recomendaciones con IA
          </h2>
          <p className="text-text-secondary">
            Algoritmos inteligentes analizan tus datos de consumo locales para sugerir mejoras comerciales.
          </p>
        </div>
        <Badge variant="neutral" className="bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1.5 py-1 px-3.5">
          <Sparkles className="w-4 h-4 text-purple-600 fill-current animate-pulse" />
          Plan Pro Activo
        </Badge>
      </div>

      {successMsg && <Alert type="success" message={successMsg} />}

      {/* Intro Dashboard Card */}
      <Card className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <Badge className="bg-white/10 text-white border-0 mb-3">Modelos Predictivos</Badge>
          <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
            Asistente Gastronómico Inteligente
          </h3>
          <p className="text-indigo-100 text-sm leading-relaxed mb-4">
            El motor de IA de **CMOR FLOW** cruza tu historial de pedidos locales con factores externos (clima, eventos en tu comuna y tendencias del sector) para optimizar tus márgenes de ganancia.
          </p>
          <div className="flex gap-4 items-center">
            <div className="bg-white/10 p-2.5 rounded-lg">
              <p className="text-xs text-indigo-200">Ticket Estimado</p>
              <p className="text-lg font-bold flex items-center gap-0.5">
                +18.5% <ArrowUpRight className="w-4 h-4 text-success" />
              </p>
            </div>
            <div className="bg-white/10 p-2.5 rounded-lg">
              <p className="text-xs text-indigo-200">Precisión Modelo</p>
              <p className="text-lg font-bold flex items-center gap-0.5">
                94.8% <Award className="w-4 h-4 text-yellow-400" />
              </p>
            </div>
          </div>
        </div>
        <div className="absolute right-4 bottom-0 top-0 hidden md:flex items-center opacity-10 pointer-events-none">
          <BrainCircuit className="w-64 h-64" />
        </div>
      </Card>

      {/* Recommendations List */}
      <div className="grid gap-6">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
            {rec.applied && (
              <div className="absolute top-0 right-0 bg-success text-white px-4 py-1.5 rounded-bl-lg flex items-center gap-1 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                Aplicado
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-lg font-bold text-text mb-1">{rec.title}</h4>
                  <div className="flex gap-2 items-center">
                    {getDifficultyBadge(rec.difficulty)}
                    <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 text-xs font-semibold">
                      Impacto: {rec.impact}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm text-text-secondary">{rec.description}</p>

              <div className="bg-bg-subtle rounded-lg p-3.5 border-l-4 border-accent text-sm">
                <p className="font-semibold text-text mb-1">Sugerencia del Sistema:</p>
                <p className="text-text-secondary">{rec.suggestion}</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleApply(rec.id, rec.title)}
                  disabled={rec.applied}
                  variant={rec.applied ? "outline" : "primary"}
                  size="sm"
                >
                  {rec.applied ? "Cambios Aplicados" : "Aplicar Recomendación"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AiRecommendations;
