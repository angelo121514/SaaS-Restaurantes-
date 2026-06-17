import React, { useEffect, useState } from "react";
import { ShoppingBag, UtensilsCrossed, DollarSign, Clock } from "lucide-react";
import { Card, Badge, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";
import { useRestaurantId } from "../../hooks/useAuth";

type RestaurantStats = Awaited<ReturnType<typeof getRestaurantStats>>;

const RestaurantHome: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!restaurantId) return;
    const data = await getRestaurantStats(restaurantId);
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  if (loading) {
    return <Loading text="Cargando resumen del panel..." />;
  }

  const statCards = [
    {
      title: "Pedidos Pendientes",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pedidos de Hoy",
      value: stats?.completedToday || 0,
      icon: ShoppingBag,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Ingresos de Hoy",
      value: formatCurrency(stats?.revenueToday || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pedidos Históricos",
      value: stats?.totalOrders || 0,
      icon: UtensilsCrossed,
      color: "text-accent-secondary",
      bgColor: "bg-accent-secondary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Panel de Control</h2>
        <p className="text-text-secondary">
          ¡Hola de nuevo! Aquí tienes un resumen general de tu local.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Acciones Rápidas</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href="/restaurant/orders"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Pedidos</p>
            <p className="text-sm text-text-secondary">
              Gestiona órdenes en cocina
            </p>
          </a>
          <a
            href="/restaurant/menu"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Administrar Menú</p>
            <p className="text-sm text-text-secondary">Actualiza platos y precios</p>
          </a>
          <a
            href="/restaurant/reports"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Reportes</p>
            <p className="text-sm text-text-secondary">Ventas e informes</p>
          </a>
        </div>
      </Card>
    </div>
  );
};

export default RestaurantHome;
