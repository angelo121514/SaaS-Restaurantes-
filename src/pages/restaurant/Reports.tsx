import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  Download,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Card, Button, Loading } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { useRestaurantId } from "../../hooks/useAuth";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscount: number;
  topItems: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  orderTypeDistribution: { type: string; count: number }[];
}

const Reports: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [dateRange, setDateRange] = useState<"1" | "7" | "30" | "90">("30");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, restaurantId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (!restaurantId) return;

      const startDate = new Date();
      if (dateRange === "1") {
        startDate.setHours(0, 0, 0, 0); // Start of today in local time
      } else {
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - parseInt(dateRange) + 1);
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate.toISOString())
        .in("status", ["completed", "ready", "preparing", "accepted"]);

      if (error) throw error;

      // Calculate metrics
      const totalRevenue =
        orders?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0;
      
      const totalSubtotal =
        orders?.reduce((sum: number, order: any) => {
          const sub = order.subtotal || (order.total ? order.total / 1.19 : 0);
          return sum + sub;
        }, 0) || 0;
      
      const totalTax =
        orders?.reduce((sum: number, order: any) => {
          const tx = order.tax || (order.total ? order.total - (order.total / 1.19) : 0);
          return sum + tx;
        }, 0) || 0;
      
      const totalDiscount =
        orders?.reduce((sum: number, order: any) => sum + (order.discount || 0), 0) || 0;

      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orders?.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { count: 0, revenue: 0 };
          }
          itemCounts[item.name].count += item.quantity || 0;
          itemCounts[item.name].revenue += item.item_total || item.subtotal || 0;
        });
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Daily revenue
      const dailyData: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString("es-CL", {
          month: "short",
          day: "numeric",
        });
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0 };
        }
        dailyData[date].revenue += (order.total || order.total_amount || 0);
        dailyData[date].orders += 1;
      });

      const dailyRevenue = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .slice(-14); // Last 14 days

      // Order type distribution
      const typeCounts: Record<string, number> = {};
      orders?.forEach((order: any) => {
        const type = order.order_type === "qr" ? "Mesa (QR)" : (order.order_type === "takeaway" ? "Llevar" : order.order_type || "Otro");
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const orderTypeDistribution = Object.entries(typeCounts).map(
        ([type, count]) => ({ type, count })
      );

      setReportData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalSubtotal,
        totalTax,
        totalDiscount,
        topItems,
        dailyRevenue,
        orderTypeDistribution,
      });
    } catch (error) {
      console.error("Error al cargar reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ["Métrica", "Valor"],
      ["Ventas Netas (Neto)", formatCurrency(reportData.totalSubtotal)],
      ["IVA Recaudado (19%)", formatCurrency(reportData.totalTax)],
      ["Descuentos Aplicados", formatCurrency(reportData.totalDiscount)],
      ["Ventas Brutas (Total)", formatCurrency(reportData.totalRevenue)],
      ["Pedidos Totales", reportData.totalOrders.toString()],
      ["Ticket Promedio", formatCurrency(reportData.avgOrderValue)],
      [""],
      ["Platos Más Vendidos", "Cantidad", "Ingresos"],
      ...reportData.topItems.map((item) => [
        item.name,
        item.count.toString(),
        formatCurrency(item.revenue),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ventas-${dateRange}-dias.csv`;
    a.click();
  };

  if (loading) {
    return <Loading text="Cargando análisis e informes..." />;
  }

  if (!reportData) {
    return (
      <div className="text-center text-text-secondary py-12">No hay datos disponibles</div>
    );
  }

  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">
            Reportes e Informes de Ventas
          </h2>
          <p className="text-text-secondary">
            Monitorea el rendimiento de tu menú y tendencias de facturación
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "1" | "7" | "30" | "90")}
            className="input rounded-lg border-border bg-white px-3 text-sm focus:outline-none"
          >
            <option value="1">Hoy</option>
            <option value="7">Últimos 7 Días (Semana)</option>
            <option value="30">Últimos 30 Días (Mes)</option>
            <option value="90">Últimos 90 Días (3 Meses)</option>
          </select>
          <Button
            icon={<Download className="w-5 h-5" />}
            onClick={exportReport}
            variant="outline"
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {formatCurrency(reportData.totalRevenue)}
          </div>
          <p className="text-text-secondary text-sm">Ventas Totales</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {reportData.totalOrders}
          </div>
          <p className="text-text-secondary text-sm">Pedidos Completados</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent-secondary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-accent-secondary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {formatCurrency(reportData.avgOrderValue)}
          </div>
          <p className="text-text-secondary text-sm">Ticket Promedio</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-warning/10 rounded-lg">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {dateRange} Días
          </div>
          <p className="text-text-secondary text-sm">Período de Reporte</p>
        </Card>
      </div>

      {/* Detailed Financial Breakdown Card */}
      <Card className="!p-6">
        <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Resumen Financiero Detallado (Desglose de IVA)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3">Concepto</th>
                <th className="py-3 text-right">Monto</th>
                <th className="py-3 text-right">Porcentaje / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              <tr>
                <td className="py-3.5 font-medium text-text">Ventas Netas (Base Imponible)</td>
                <td className="py-3.5 text-right font-bold text-text">
                  {formatCurrency(reportData.totalSubtotal)}
                </td>
                <td className="py-3.5 text-right text-text-secondary text-xs">Neto sin impuestos</td>
              </tr>
              <tr>
                <td className="py-3.5 font-medium text-text">IVA Recaudado (19%)</td>
                <td className="py-3.5 text-right font-bold text-accent-secondary">
                  {formatCurrency(reportData.totalTax)}
                </td>
                <td className="py-3.5 text-right text-text-secondary text-xs">Impuesto al valor agregado</td>
              </tr>
              {reportData.totalDiscount > 0 && (
                <tr>
                  <td className="py-3.5 font-medium text-success">Descuentos Aplicados</td>
                  <td className="py-3.5 text-right font-bold text-success">
                    -{formatCurrency(reportData.totalDiscount)}
                  </td>
                  <td className="py-3.5 text-right text-success text-xs">Rebajas y promociones</td>
                </tr>
              )}
              <tr className="bg-bg-subtle font-bold text-base">
                <td className="py-4 text-text pl-3 rounded-l-lg">Ventas Brutas (Total Facturado)</td>
                <td className="py-4 text-right text-success font-black">
                  {formatCurrency(reportData.totalRevenue)}
                </td>
                <td className="py-4 text-right text-text-secondary text-xs pr-3 rounded-r-lg">Monto final recaudado (con IVA)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">Tendencia de Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B6B"
                strokeWidth={2}
                name="Ventas ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Order Type Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">
            Distribución de Tipo de Pedido
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.orderTypeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) =>
                  `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.orderTypeDistribution.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">Platos Más Vendidos (Top)</h3>
          <Package className="w-5 h-5 text-accent" />
        </div>

        {reportData.topItems.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            Aún no hay platos vendidos en este período
          </p>
        ) : (
          <div className="space-y-3">
            {reportData.topItems.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-text">{item.name}</div>
                    <div className="text-sm text-text-secondary">
                      {item.count} unidades
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-success">
                    {formatCurrency(item.revenue)}
                  </div>
                  <div className="text-xs text-text-secondary">Recaudado</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Daily Orders Chart */}
      <Card>
        <h3 className="text-lg font-bold text-text mb-4">Cantidad de Pedidos Diarios</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="orders" fill="#4ECDC4" name="Pedidos" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Reports;
