import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
  AlertTriangle,
  Volume2,
  VolumeX,
  PlusCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToOrders,
  updateOrderStatus,
} from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

// Componente de temporizador de cocina con cuenta regresiva y alarma
interface OrderTimerProps {
  order: Order;
  defaultPrepMinutes: number;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ order, defaultPrepMinutes }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [extraMinutes, setExtraMinutes] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  const calculateRemainingSeconds = () => {
    const startTimeStr = order.accepted_at || order.created_at;
    const startTime = new Date(startTimeStr).getTime();
    const durationMs = (defaultPrepMinutes + extraMinutes) * 60 * 1000;
    const endTime = startTime + durationMs;
    const diffSeconds = Math.ceil((endTime - Date.now()) / 1000);
    return diffSeconds;
  };
  
  useEffect(() => {
    setTimeLeft(calculateRemainingSeconds());
    
    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setTimeLeft(remaining);
      
      // Si el tiempo es menor o igual a cero, hacer sonar alarma cada 10 segundos
      if (remaining <= 0 && remaining % 10 === 0 && !isMuted) {
        triggerBeepAlarm();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [order.accepted_at, order.created_at, defaultPrepMinutes, extraMinutes, isMuted]);
  
  const triggerBeepAlarm = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (startOffset: number, duration: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startOffset);
        osc.stop(ctx.currentTime + startOffset + duration);
      };
      
      // Tono triple agudo
      playTone(0, 0.15, 880);
      playTone(0.2, 0.15, 880);
      playTone(0.4, 0.15, 880);
    } catch (e) {
      console.warn("Autoplay bloqueado por el navegador", e);
    }
  };
  
  const handleAddMinutes = () => {
    setExtraMinutes(prev => prev + 5);
  };
  
  const formatTimeLeft = (sec: number) => {
    const isNegative = sec < 0;
    const absSeconds = Math.abs(sec);
    const m = Math.floor(absSeconds / 60);
    const s = absSeconds % 60;
    const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return isNegative ? `-${formatted}` : formatted;
  };
  
  const isExpired = timeLeft <= 0;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
      isExpired 
        ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
        : "bg-bg-subtle border-border text-text"
    }`}>
      <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
        <Clock className={`w-4 h-4 ${isExpired ? "text-red-500 animate-spin" : "text-accent"}`} />
        <span>{formatTimeLeft(timeLeft)}</span>
      </div>
      
      {isExpired && (
        <span title="¡Tiempo Excedido!">
          <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
        </span>
      )}
      
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={handleAddMinutes}
          className="p-1 hover:bg-bg rounded transition-colors text-success"
          title="Agregar 5 minutos"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsMuted(prev => !prev)}
          className="p-1 hover:bg-bg rounded transition-colors text-text-secondary"
          title={isMuted ? "Activar alarma" : "Silenciar alarma"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-error" />
          ) : (
            <Volume2 className="w-4 h-4 text-accent-secondary" />
          )}
        </button>
      </div>
    </div>
  );
};

const Orders: React.FC = () => {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id || null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [transactionId, setTransactionId] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  // IDs de pedidos ya vistos (evita el stale closure sobre `orders`).
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    seenOrderIdsRef.current = new Set();
    firstLoadRef.current = true;

    const subscription = subscribeToOrders(restaurantId, (data) => {
      // Detectar pedidos nuevos (no vistos antes) tras la primera carga.
      if (!firstLoadRef.current) {
        const fresh = data.filter(
          (o) => o.status === "pending" && !seenOrderIdsRef.current.has(o.id)
        );
        if (fresh.length > 0) {
          playSound("notification");
        }
      }
      data.forEach((o) => seenOrderIdsRef.current.add(o.id));
      firstLoadRef.current = false;
      setOrders(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const filteredOrders = orders
    .filter((order) => order.status === statusFilter)
    .sort((a, b) => {
      // Oldest first (FIFO)
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (!success) {
      alert("Error al actualizar el estado del pedido");
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setPaymentSubmitting(true);
    const success = await updateOrderStatus(selectedOrder.id, "completed", {
      paymentMethod,
      transactionId: transactionId.trim() || undefined,
    });
    setPaymentSubmitting(false);
    if (success) {
      setShowPaymentModal(false);
      setSelectedOrder(null);
    } else {
      alert("Error al registrar el pago");
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      accepted: "Preparando",
      completed: "Completado",
      cancelled: "Cancelado",
      rejected: "Rechazado",
    };
    const variants: Record<string, any> = {
      pending: "warning",
      accepted: "accent-secondary",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    return <Badge variant={variants[status] || "neutral"}>{labels[status] || status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "accepted":
        return <Package className="w-5 h-5 text-accent-secondary" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <Clock className="w-5 h-5 text-text-secondary" />;
    }
  };

  if (loading) {
    return <Loading text="Cargando pedidos en tiempo real..." />;
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Pedidos Recibidos</h2>
          <p className="text-text-secondary">
            Administra y despacha las órdenes de tus clientes en tiempo real
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
            {pendingCount} Pendiente{pendingCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Actualizaciones en vivo • Alertas sonoras habilitadas</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending", label: "Pendientes" },
          { key: "accepted", label: "En Cocina" },
          { key: "completed", label: "Completados" },
          { key: "cancelled", label: "Cancelados" },
        ].map((status) => (
          <button
            key={status.key}
            onClick={() => setStatusFilter(status.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status.key
                ? "bg-accent text-white"
                : "bg-white text-text-secondary border border-border hover:bg-bg-subtle"
            }`}
          >
            {status.label}
            {status.key === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No se encontraron pedidos
          </h3>
          <p className="text-text-secondary">
            No tienes pedidos en esta categoría por el momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`hover:shadow-lg transition-shadow ${
                order.status === "pending" ? "border-l-4 border-l-warning" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="text-lg font-bold text-text">
                          Pedido #{order.order_number}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Temporizador de cocina en pedidos aceptados (En Cocina) */}
                  {order.status === "accepted" && (
                    <div className="mt-1 mb-2">
                      <OrderTimer order={order} defaultPrepMinutes={restaurant?.default_prep_time || 15} />
                    </div>
                  )}

                  {/* Details */}
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Package className="w-4 h-4" />
                      <span>
                        Canal: QR •{" "}
                        {order.table_number && `${order.table_number}`}
                        {!order.table_number && "Para Llevar"}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-accent hover:underline"
                        >
                          {order.customer_phone}
                        </a>
                      </div>
                    )}
                    {order.customer_name && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <User className="w-4 h-4" />
                        <span>{order.customer_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <span className="font-semibold text-text">
                        {order.items?.length || 0} plato{order.items?.length !== 1 ? "s" : ""}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-text text-lg">
                        {formatCurrency(order.total, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Platos directamente en la tarjeta de Cocina o Pendientes */}
                  {(order.status === "accepted" || order.status === "pending") && order.items && (
                    <div className="mt-3 p-3 bg-bg-subtle rounded-xl space-y-2 border border-border">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Platos del Pedido:
                      </p>
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between text-sm">
                          <div className="flex-1">
                            <span className="font-semibold text-text">{item.quantity}x {item.name}</span>
                            {item.selected_size && (
                              <span className="text-xs text-text-secondary ml-1.5">
                                ({item.selected_size.name})
                              </span>
                            )}
                            {item.selected_addons && item.selected_addons.length > 0 && (
                              <p className="text-[11px] text-text-secondary leading-normal">
                                + {item.selected_addons.map((a: any) => a.name).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer Notes */}
                  {order.customer_notes && (
                    <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                      <div>
                        <p className="font-medium text-text">Notas del Cliente:</p>
                        <p className="text-text-secondary">
                          {order.customer_notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleViewDetails(order)}
                  >
                    Ver Detalles
                  </Button>

                  {order.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => handleStatusUpdate(order.id, "accepted")}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}

                  {order.status === "accepted" && (
                    <>
                      {order.payment_status === "paid" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => handleStatusUpdate(order.id, "completed")}
                          className="!bg-emerald-600 hover:!bg-emerald-700 text-white font-bold border-0"
                        >
                          Listo
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setSelectedOrder(order);
                            setPaymentMethod((order.payment_method as any) || "cash");
                            setTransactionId(order.payment_transaction_id || "");
                            setShowPaymentModal(true);
                          }}
                        >
                          Pagar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        order={selectedOrder}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
      />

      {/* Reject Modal */}
      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOrder(null);
        }}
        onReject={handleStatusUpdate}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          title={`Procesar Pago - Pedido #${selectedOrder.order_number}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-bg-subtle p-4 rounded-xl text-center space-y-1">
              <span className="text-xs text-text-secondary uppercase tracking-wider block font-bold">Monto Total a Cobrar</span>
              <span className="text-2xl font-extrabold text-accent">{formatCurrency(selectedOrder.total, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 font-bold text-text focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="cash">💵 Efectivo</option>
                  <option value="card">💳 Tarjeta (POS)</option>
                  <option value="transfer">🏦 Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">ID de Transacción (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Nro de voucher, transferencia, etc."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                type="button"
                loading={paymentSubmitting}
                onClick={handleConfirmPayment}
                className="bg-red-650 hover:bg-red-750 text-white font-bold border-0"
                fullWidth
              >
                Confirmar Pago
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Order Details Modal Component
interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  const { restaurant } = useAuth();
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Pedido #${order.order_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
          <span className="font-medium text-text">Estado del Pedido</span>
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                ? "warning"
                : "neutral"
            }
          >
            {order.status === "pending" ? "Pendiente" : order.status === "accepted" ? "En cocina" : order.status === "completed" ? "Completado" : order.status}
          </Badge>
        </div>

        {/* Customer Info */}
        <div>
          <h4 className="font-semibold text-text mb-3">Información del Cliente</h4>
          <div className="space-y-2 text-sm">
            {order.customer_name && (
              <p className="text-text-secondary">
                <strong className="text-text">Nombre:</strong>{" "}
                {order.customer_name}
              </p>
            )}
            {order.customer_phone && (
              <p className="text-text-secondary">
                <strong className="text-text">Teléfono:</strong>{" "}
                {order.customer_phone}
              </p>
            )}
            <p className="text-text-secondary">
              <strong className="text-text">Mesa / Entrega:</strong>{" "}
              {order.table_number || "Para Llevar"}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h4 className="font-semibold text-text mb-3">Platos Solicitados</h4>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    {item.quantity}x {item.name}
                  </p>
                  {item.selected_size && (
                    <p className="text-sm text-text-secondary">
                      Tamaño: {item.selected_size.name}
                    </p>
                  )}
                  {item.selected_addons && item.selected_addons.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Agregados: {item.selected_addons.map((a: any) => a.name).join(", ")}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-text">
                  {formatCurrency(item.item_total || item.subtotal || 0, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>IVA (19%)</span>
            <span>{formatCurrency(order.tax, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}</span>
          </div>
          {order.discount && order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Descuento</span>
              <span>-{formatCurrency(order.discount, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-text pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(order.total, restaurant?.currency || "CLP", restaurant?.usd_exchange_rate || 950)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.customer_notes && (
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Comentarios del Cliente</h4>
            <p className="text-text-secondary text-sm">
              {order.customer_notes}
            </p>
          </div>
        )}

        {/* Payment Info */}
        {order.payment_method && (
          <div>
            <h4 className="font-semibold text-text mb-2">Pago</h4>
            <p className="text-text-secondary text-sm">
              Método: {order.payment_method}
            </p>
            {order.payment_transaction_id && (
              <p className="text-text-secondary text-sm">
                ID Transacción: {order.payment_transaction_id}
              </p>
            )}
          </div>
        )}

        <Button onClick={onClose} fullWidth>
          Cerrar Detalle
        </Button>
      </div>
    </Modal>
  );
};

// Cancel Order Modal Component
interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string, status: string, notes?: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id, "cancelled", reason);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Pedido" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message="¿Estás seguro de que deseas cancelar esta orden? Esta acción quitará la orden de la cocina y no se puede deshacer."
        />

        <Textarea
          label="Motivo de la Cancelación (Opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Ingrediente agotado, local cerrado, etc..."
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Volver
          </Button>
          <Button variant="danger" onClick={handleCancel} fullWidth>
            Confirmar Cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Orders;
