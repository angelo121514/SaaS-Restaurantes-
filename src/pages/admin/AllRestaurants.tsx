import React, { useEffect, useState } from "react";
import {
  Search,
  Eye,
  Ban,
  CheckCircle,
  Store as StoreIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Crown,
  Trash2,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
  Select,
  Textarea,
} from "../../components/ui";
import {
  subscribeToRestaurants,
  toggleRestaurantStatus,
  deleteRestaurant,
} from "../../services/adminService";
import type { Restaurant } from "../../config/supabase";
import { formatDateTime } from "../../utils/helpers";
import { APP_CONFIG } from "../../config/config";

const AllRestaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const getTrialDaysLeft = (endsAt?: string) => {
    if (!endsAt) return 0;
    const diff = new Date(endsAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDeleteModal(true);
  };

  // Real-time subscription
  useEffect(() => {
    const subscription = subscribeToRestaurants((data) => {
      setRestaurants(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter restaurants
  useEffect(() => {
    let filtered = restaurants;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.owner_name?.toLowerCase().includes(term) ||
          r.phone?.toLowerCase().includes(term) ||
          r.city?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRestaurants(filtered);
  }, [restaurants, searchTerm, statusFilter]);

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
  };

  const handleToggleBlock = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowBlockModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Activo</Badge>;
      case "blocked":
        return <Badge variant="error">Bloqueado</Badge>;
      case "trial":
        return <Badge variant="warning">Prueba</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planConfig = APP_CONFIG.plans[plan as keyof typeof APP_CONFIG.plans];
    if (!planConfig) return null;

    return (
      <Badge
        variant={plan === "pro" ? "success" : "neutral"}
        className="flex items-center space-x-1"
      >
        {plan === "pro" && <Crown className="w-3 h-3 text-yellow-500" />}
        <span>{planConfig.name}</span>
      </Badge>
    );
  };

  if (loading) {
    return <Loading text="Cargando restaurantes registrados..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Restaurantes Registrados</h2>
          <p className="text-text-secondary">
            Administra el estado y los accesos de todos tus clientes
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="neutral" className="text-lg px-4 py-2">
            {restaurants.length} Total
          </Badge>
          <Badge variant="success" className="text-lg px-4 py-2">
            {restaurants.filter((r) => r.status === "active").length} Activos
          </Badge>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Actualizaciones en tiempo real activas</span>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, dueño, teléfono o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "Todos los Estados" },
                { value: "active", label: "Activos" },
                { value: "blocked", label: "Bloqueados" },
                { value: "trial", label: "Prueba" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Restaurants List Grouped by Owner Email */}
      {filteredRestaurants.length === 0 ? (
        <Card className="text-center py-12">
          <StoreIcon className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No se encontraron restaurantes
          </h3>
          <p className="text-text-secondary">
            {searchTerm || statusFilter !== "all"
              ? "Prueba cambiando las opciones de búsqueda"
              : "No hay restaurantes registrados en la plataforma."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {(() => {
            const groupedByEmail: Record<string, Restaurant[]> = {};
            filteredRestaurants.forEach((r) => {
              const email = (r.email || "sin-correo").toLowerCase().trim();
              if (!groupedByEmail[email]) {
                groupedByEmail[email] = [];
              }
              groupedByEmail[email].push(r);
            });

            return Object.entries(groupedByEmail).map(([email, groupRestaurants]) => {
              const isMultiRestaurant = groupRestaurants.length > 1;
              const ownerName = groupRestaurants[0].owner_name || "Propietario";

              return (
                <div key={email} className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/5 rounded-lg text-accent">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text text-md flex items-center gap-2">
                          <span>{email}</span>
                          {isMultiRestaurant && (
                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                              Multi-Restaurante ({groupRestaurants.length})
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Propietario: <strong className="text-text">{ownerName}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Restaurants */}
                  <div className="grid gap-3">
                    {groupRestaurants.map((restaurant) => {
                      const daysLeft = getTrialDaysLeft(restaurant.trial_ends_at);
                      return (
                        <div
                          key={restaurant.id}
                          className="bg-bg-subtle hover:bg-border/10 p-4 rounded-lg border border-border/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-text text-sm flex items-center gap-1.5">
                                <StoreIcon className="w-4 h-4 text-accent" />
                                {restaurant.name}
                              </h4>
                              {getStatusBadge(restaurant.status)}
                              {restaurant.subscription_plan &&
                                getPlanBadge(restaurant.subscription_plan)}
                              {restaurant.subscription_plan === "free_trial" && (
                                <Badge variant="warning" className="text-xs">
                                  Prueba ({daysLeft} días restantes)
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs text-text-secondary">
                              <p><strong>Tipo:</strong> {restaurant.restaurant_type}</p>
                              {restaurant.phone && <p><strong>Teléfono:</strong> {restaurant.phone}</p>}
                              {restaurant.city && <p><strong>Ciudad:</strong> {restaurant.city}</p>}
                              <p><strong>Registrado:</strong> {formatDateTime(restaurant.created_at)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 w-full md:min-w-[380px] items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidth
                              icon={<Eye className="w-4 h-4" />}
                              onClick={() => handleViewDetails(restaurant)}
                            >
                              Ver Ficha
                            </Button>
                            <Button
                              variant={
                                restaurant.status === "blocked" ? "secondary" : "danger"
                              }
                              size="sm"
                              fullWidth
                              icon={
                                restaurant.status === "blocked" ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )
                              }
                              onClick={() => handleToggleBlock(restaurant)}
                            >
                              {restaurant.status === "blocked" ? "Desbloquear" : "Bloquear"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidth
                              className="border-danger/30 hover:bg-danger/10 hover:border-danger text-danger font-semibold"
                              icon={<Trash2 className="w-4 h-4 text-danger" />}
                              onClick={() => handleDeleteClick(restaurant)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Details Modal */}
      <DetailsModal
        isOpen={showDetailsModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRestaurant(null);
        }}
      />

      {/* Block/Unblock Modal */}
      <BlockModal
        isOpen={showBlockModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowBlockModal(false);
          setSelectedRestaurant(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRestaurant(null);
        }}
      />
    </div>
  );
};

// Details Modal Component
interface DetailsModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({
  isOpen,
  restaurant,
  onClose,
}) => {
  if (!restaurant) return null;

  const planConfig =
    APP_CONFIG.plans[
      restaurant.subscription_plan as keyof typeof APP_CONFIG.plans
    ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha del Restaurante"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-text mb-2">
              {restaurant.name}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="neutral">{restaurant.restaurant_type}</Badge>
              {restaurant.subscription_plan && planConfig && (
                <Badge variant="success">{planConfig.name}</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            {restaurant.status === "active" ? (
              <Badge variant="success">Activo</Badge>
            ) : restaurant.status === "blocked" ? (
              <Badge variant="error">Bloqueado</Badge>
            ) : (
              <Badge variant="warning">{restaurant.status}</Badge>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoItem label="Propietario" value={restaurant.owner_name} />
          <InfoItem
            label="Teléfono"
            value={restaurant.phone}
            link={`tel:${restaurant.phone}`}
          />
          <InfoItem
            label="Correo Electrónico"
            value={restaurant.email}
            link={`mailto:${restaurant.email}`}
          />
          <InfoItem label="Ciudad" value={restaurant.city} />
          <InfoItem label="Dirección" value={restaurant.address} fullWidth />
          <InfoItem
            label="Fecha Registro"
            value={formatDateTime(restaurant.created_at)}
          />
          <InfoItem
            label="Última Actualización"
            value={formatDateTime(restaurant.updated_at)}
          />
        </div>

        {/* Subscription Details */}
        {planConfig && (
          <div className="bg-bg-subtle rounded-lg p-4">
            <h4 className="font-semibold text-text mb-3">
              Detalles del Plan de Cobros
            </h4>
            <div className="space-y-2 text-sm">
              <p className="text-text-secondary">
                <strong className="text-text">Plan asignado:</strong> {planConfig.name}{" "}
                ({APP_CONFIG.defaultCurrency} {planConfig.price.toLocaleString("es-CL")} {planConfig.duration})
              </p>
              <p className="text-text-secondary">
                <strong className="text-text">Características incluidas:</strong>{" "}
                {planConfig.features.join(", ")}
              </p>
              {restaurant.trial_ends_at && (
                <p className="text-warning">
                  <strong>Fin Período de Prueba:</strong>{" "}
                  {formatDateTime(restaurant.trial_ends_at)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Internal Notes */}
        {restaurant.internal_notes && (
          <div className="bg-bg-subtle rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Comentarios Internos</h4>
            <p className="text-text-secondary text-sm">
              {restaurant.internal_notes}
            </p>
          </div>
        )}

        {/* Block Reason (if blocked) */}
        {restaurant.status === "blocked" && restaurant.block_reason && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
            <h4 className="font-semibold text-danger mb-2">Motivo de Bloqueo</h4>
            <p className="text-text-secondary text-sm">
              {restaurant.block_reason}
            </p>
          </div>
        )}

        <Button onClick={onClose} fullWidth>
          Cerrar Ficha
        </Button>
      </div>
    </Modal>
  );
};

// Block Modal Component
interface BlockModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  restaurant,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isBlocked = restaurant?.status === "blocked";

  const handleToggle = async () => {
    if (!isBlocked && !reason.trim()) {
      setError("Por favor detalla un motivo para bloquear la cuenta");
      return;
    }

    if (!restaurant) return;

    setLoading(true);
    const success = await toggleRestaurantStatus(
      restaurant.id,
      isBlocked,
      reason
    );
    setLoading(false);

    if (success) {
      onClose();
      setReason("");
    } else {
      setError(`Error al ${isBlocked ? "desbloquear" : "bloquear"} el restaurante`);
    }
  };

  if (!restaurant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBlocked ? "Desbloquear Restaurante" : "Bloquear Restaurante"}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <p className="text-text-secondary">
          {isBlocked ? (
            <>
              ¿Estás seguro que deseas desbloquear a{" "}
              <strong className="text-text">{restaurant.name}</strong>? Podrá volver a acceder a su panel de administración inmediatamente.
            </>
          ) : (
            <>
              ¿Estás seguro que deseas bloquear a{" "}
              <strong className="text-text">{restaurant.name}</strong>? Perderá acceso a su panel y su menú digital quedará desactivado de forma inmediata.
            </>
          )}
        </p>

        {!isBlocked && (
          <Textarea
            label="Motivo del Bloqueo"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            placeholder="Describe el motivo de la suspensión..."
            required
            rows={3}
          />
        )}

        {isBlocked && restaurant.block_reason && (
          <div className="bg-bg-subtle rounded-lg p-3 text-sm">
            <p className="text-text-secondary">
              <strong className="text-text">Anteriormente bloqueado por:</strong>{" "}
              {restaurant.block_reason}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant={isBlocked ? "secondary" : "danger"}
            onClick={handleToggle}
            loading={loading}
            fullWidth
          >
            {isBlocked ? "Desbloquear" : "Bloquear"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Delete Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  restaurant,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!restaurant) return;
    
    if (confirmName.trim().toLowerCase() !== restaurant.name.trim().toLowerCase()) {
      setError("El nombre del restaurante no coincide");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await deleteRestaurant(restaurant.id);
      if (success) {
        onClose();
        setConfirmName("");
      } else {
        setError("No se pudo eliminar el restaurante de la base de datos.");
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al eliminar.");
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar Restaurante"
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger font-medium">
            {error}
          </div>
        )}

        <div className="bg-danger/5 border border-danger/10 rounded-xl p-4 text-sm text-danger space-y-2">
          <p className="font-extrabold flex items-center gap-1.5">
            ⚠️ ¡ATENCIÓN! ACCIÓN IRREVERSIBLE
          </p>
          <p className="leading-relaxed text-xs">
            Esta acción eliminará de forma permanente al restaurante <strong>{restaurant.name}</strong>, incluyendo su catálogo de menús, códigos QR, historial de pedidos, perfiles de personal e información vinculada en cascada.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-text-secondary font-semibold">
            Para confirmar, escribe el nombre del restaurante: <strong className="text-text font-bold select-all">{restaurant.name}</strong>
          </label>
          <Input
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setError("");
            }}
            placeholder="Escribe el nombre aquí..."
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={confirmName.trim().toLowerCase() !== restaurant.name.trim().toLowerCase()}
            loading={loading}
            fullWidth
            className="bg-danger hover:bg-danger/90 text-white font-bold transition-all border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Eliminar Permanentemente
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Helper Component
interface InfoItemProps {
  label: string;
  value?: string | null;
  link?: string;
  fullWidth?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  link,
  fullWidth,
}) => {
  if (!value) return null;

  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="text-xs text-text-secondary">{label}</label>
      {link ? (
        <a href={link} className="block text-text hover:text-accent truncate font-medium">
          {value}
        </a>
      ) : (
        <p className="text-text font-medium">{value}</p>
      )}
    </div>
  );
};

export default AllRestaurants;
