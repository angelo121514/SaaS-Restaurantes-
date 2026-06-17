import React, { useState } from "react";
import { BrainCircuit, Check, TrendingUp, Sparkles, Award, ArrowUpRight } from "lucide-react";
import { Card, Button, Badge, Alert } from "../../components/ui";

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
  const [successMsg, setSuccessMsg] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: "rec-1",
      title: "Optimización de Precio en Pizza Margherita",
      type: "price",
      impact: "+8% Ingresos Semanales",
      difficulty: "Fácil",
      description: "El análisis de ventas muestra que los clientes de los viernes por la noche tienen baja sensibilidad al precio en pizzas medianas. Se sugiere un incremento estratégico.",
      suggestion: "Aumentar precio base de Pizza Margherita (Mediana) de $8.500 a $8.900.",
      applied: false,
    },
    {
      id: "rec-2",
      title: "Promoción Cruzada Inteligente",
      type: "promo",
      impact: "+15% Aumento Ticket Promedio",
      difficulty: "Fácil",
      description: "Se detectó que el 72% de los clientes que piden 'Hamburguesa Vegana Crujiente' no agregan bebida. Crear un combo incentiva la compra conjunta.",
      suggestion: "Crear combo 'Hamburguesa + Macchiato Helado' por un precio especial de $9.500.",
      applied: false,
    },
    {
      id: "rec-3",
      title: "Predicción de Abastecimiento",
      type: "menu",
      impact: "-12% Desperdicio de Insumos",
      difficulty: "Media",
      description: "Los días lunes de la próxima semana se pronostica lluvia moderada en Santiago. Históricamente, las ventas de ensaladas caen un 40% y las entradas calientes aumentan un 25%.",
      suggestion: "Reducir compra de vegetales frescos en 20% y aumentar stock de panes/salsas calientes.",
      applied: false,
    },
  ]);

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
