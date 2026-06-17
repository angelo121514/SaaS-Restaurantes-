import React from "react";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Card } from "../../components/ui";

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Métricas Globales (Analytics)</h2>
        <p className="text-text-secondary">Rendimiento e informes de la plataforma SaaS</p>
      </div>

      {/* Coming Soon */}
      <Card className="text-center py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center space-x-4 mb-6">
            <TrendingUp className="w-12 h-12 text-accent opacity-50" />
            <DollarSign className="w-12 h-12 text-success opacity-50" />
            <ShoppingCart className="w-12 h-12 text-accent-secondary opacity-50" />
            <Users className="w-12 h-12 text-warning opacity-50" />
          </div>
          <h3 className="text-2xl font-bold text-text mb-3">
            Panel de Estadísticas Avanzadas próximamente
          </h3>
          <p className="text-text-secondary text-lg mb-6">
            Las estadísticas avanzadas de transacciones, uso y facturación están en desarrollo.
          </p>
          <div className="bg-bg-subtle rounded-lg p-6 text-left">
            <h4 className="font-semibold text-text mb-3">Características Planificadas:</h4>
            <ul className="space-y-2 text-text-secondary">
              <li>• Tendencias de ingresos de la red y proyecciones de cobros</li>
              <li>• Comparativa de rendimiento entre restaurantes y sucursales</li>
              <li>• Volumen de órdenes por hora y horas peak</li>
              <li>• Hábitos de consumo y recurrencia de comensales</li>
              <li>• Métricas de suscripción (MRR, LTV, Tasa de abandono)</li>
              <li>• Descarga de reportes integrales en formatos PDF y Excel</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
