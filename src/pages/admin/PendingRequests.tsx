import React, { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Store as StoreIcon,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  Copy,
} from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Loading,
} from "../../components/ui";
import {
  subscribeToPendingRequests,
  createRestaurantAccount,
  rejectRegistrationRequest,
} from "../../services/adminService";
import type { RegistrationRequest } from "../../config/supabase";
import { formatDateTime, copyToClipboard } from "../../utils/helpers";
import { APP_CONFIG } from "../../config/config";

const PendingRequests: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<RegistrationRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  // Real-time subscription
  useEffect(() => {
    const subscription = subscribeToPendingRequests((data) => {
      setRequests(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCreateAccount = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setShowCreateModal(true);
  };

  const handleReject = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  if (loading) {
    return <Loading text="Cargando solicitudes pendientes..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">
            Solicitudes Pendientes
          </h2>
          <p className="text-text-secondary">
            Revisa y aprueba las solicitudes de registro de nuevos restaurantes
          </p>
        </div>
        <Badge variant="warning" className="text-lg px-4 py-2">
          {requests.length} Pendiente{requests.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Real-time indicator */}
      {requests.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-success">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>Actualizaciones en tiempo real activas</span>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text mb-2">
            ¡Todo al día!
          </h3>
          <p className="text-text-secondary">
            No hay solicitudes de registro pendientes en este momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Request Details */}
                <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-text mb-1">
                        {request.restaurant_name}
                      </h3>
                      <Badge variant="neutral">{request.restaurant_type}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary flex items-center justify-end">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDateTime(request.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <StoreIcon className="w-4 h-4" />
                      <span className="font-medium text-text">
                        {request.owner_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${request.phone}`}
                        className="text-accent hover:underline"
                      >
                        {request.phone}
                      </a>
                    </div>
                    {request.email && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Mail className="w-4 h-4" />
                        <a
                          href={`mailto:${request.email}`}
                          className="text-accent hover:underline truncate"
                        >
                          {request.email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {request.city}
                        {request.address && `, ${request.address}`}
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(request.heard_from || request.notes) && (
                    <div className="bg-bg-subtle rounded-lg p-3 space-y-2 text-sm">
                      {request.heard_from && (
                        <p className="text-text-secondary">
                          <strong className="text-text">Cómo nos conoció:</strong>{" "}
                          {request.heard_from}
                        </p>
                      )}
                      {request.notes && (
                        <p className="text-text-secondary">
                          <strong className="text-text">Notas adicionales:</strong>{" "}
                          {request.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 md:min-w-[140px]">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handleCreateAccount(request)}
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<X className="w-4 h-4" />}
                    onClick={() => handleReject(request)}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={showCreateModal}
        request={selectedRequest}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedRequest(null);
        }}
        onSuccess={(creds) => {
          setShowCreateModal(false);
          setCredentials(creds);
          setShowCredentialsModal(true);
        }}
      />

      {/* Reject Modal */}
      <RejectModal
        isOpen={showRejectModal}
        request={selectedRequest}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
        }}
      />

      {/* Credentials Display Modal */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        credentials={credentials}
        onClose={() => {
          setShowCredentialsModal(false);
          setCredentials(null);
        }}
      />
    </div>
  );
};

// Create Account Modal Component
interface CreateAccountModalProps {
  isOpen: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onSuccess: (credentials: any) => void;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    subscriptionPlan: "pro", // Default to Pro as requested
    internalNotes: "",
    sendViaSMS: true,
    sendViaWhatsApp: true,
    sendViaEmail: true,
  });

  useEffect(() => {
    if (request) {
      setFormData((prev) => ({
        ...prev,
        email: request.email || "",
      }));
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email) {
      setError("El correo es obligatorio");
      return;
    }

    if (!request) return;

    setLoading(true);
    const result = await createRestaurantAccount(request.id, {
      email: formData.email,
      subscriptionPlan: formData.subscriptionPlan,
      internalNotes: formData.internalNotes,
    });

    setLoading(false);

    if (result.success && (result.credentials || result.invite)) {
      // En Auth real solo hay `invite`; en mock hay `credentials`.
      onSuccess(result.invite ? { invite: result.invite, email: result.invite.email } : result.credentials);
    } else {
      setError(result.error || "No se pudo crear la cuenta");
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Cuenta de Restaurante"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Restaurant Info */}
        <div className="bg-bg-subtle rounded-lg p-4">
          <h4 className="font-semibold text-text mb-2">Detalles del Local</h4>
          <div className="space-y-1 text-sm">
            <p className="text-text">
              <strong>Nombre:</strong> {request.restaurant_name}
            </p>
            <p className="text-text-secondary">
              <strong>Dueño:</strong> {request.owner_name}
            </p>
            <p className="text-text-secondary">
              <strong>Teléfono:</strong> {request.phone}
            </p>
            <p className="text-text-secondary">
              <strong>Ciudad:</strong> {request.city}
            </p>
          </div>
        </div>

        {/* Account Details */}
        <Input
          label="Dirección de Correo Electrónico"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="dueño@restaurante.com"
          required
          helperText="Este correo se utilizará para iniciar sesión"
        />

        <Select
          label="Plan de Suscripción"
          value={formData.subscriptionPlan}
          onChange={(e) =>
            setFormData({ ...formData, subscriptionPlan: e.target.value })
          }
          options={Object.keys(APP_CONFIG.plans).map((key) => ({
            value: key,
            label: APP_CONFIG.plans[key as keyof typeof APP_CONFIG.plans].name,
          }))}
        />

        <Textarea
          label="Notas Internas (Opcional)"
          value={formData.internalNotes}
          onChange={(e) =>
            setFormData({ ...formData, internalNotes: e.target.value })
          }
          placeholder="Agregar comentarios internos..."
          rows={2}
        />

        {/* Send Credentials Via */}
        <div>
          <label className="label mb-3">Enviar Credenciales Por</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaSMS}
                onChange={(e) =>
                  setFormData({ ...formData, sendViaSMS: e.target.checked })
                }
                className="rounded border-border"
              />
              <span className="text-text">SMS</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaWhatsApp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sendViaWhatsApp: e.target.checked,
                  })
                }
                className="rounded border-border"
              />
              <span className="text-text">WhatsApp</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaEmail}
                onChange={(e) =>
                  setFormData({ ...formData, sendViaEmail: e.target.checked })
                }
                className="rounded border-border"
              />
              <span className="text-text">Email</span>
            </label>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-accent-secondary inline mr-2" />
          <span className="text-text-secondary">
            Se generará automáticamente una contraseña provisoria y se le enviará al restaurante. Podrán cambiarla tras su primer ingreso.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Crear Cuenta y Enviar Accesos
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Reject Modal Component
interface RejectModalProps {
  isOpen: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
}

const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  request,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Por favor detalla un motivo de rechazo");
      return;
    }

    if (!request) return;

    setLoading(true);
    const success = await rejectRegistrationRequest(request.id, reason);
    setLoading(false);

    if (success) {
      onClose();
      setReason("");
    } else {
      setError("Error al rechazar la solicitud");
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rechazar Registro"
      size="md"
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <p className="text-text-secondary">
          ¿Estás seguro que deseas rechazar la solicitud de registro para{" "}
          <strong className="text-text">{request.restaurant_name}</strong>?
        </p>

        <Textarea
          label="Motivo del Rechazo"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError("");
          }}
          placeholder="Escribe el motivo..."
          required
          rows={3}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            loading={loading}
            fullWidth
          >
            Confirmar Rechazo
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Credentials / Invitation Display Modal
interface CredentialsModalProps {
  isOpen: boolean;
  credentials: any;
  onClose: () => void;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  credentials,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Modo Auth real: solo hay `invite` (sin contraseña).
  const isInvite = !!credentials?.invite;
  const invite = credentials?.invite;

  const handleCopy = async () => {
    let text: string;
    if (isInvite) {
      text = `Acceso a CMOR FLOW:\n\nHemos enviado una invitación a ${invite.email}.\nEl dueño recibirá un enlace por correo para definir su contraseña y acceder.`;
    } else {
      text = `Credenciales de Acceso:\n\nCorreo: ${credentials?.email}\nContraseña: ${credentials?.password}\nEnlace de acceso: ${credentials?.loginUrl}`;
    }
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      // Limpiar el timer al desmontar para evitar setState tras unmount.
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  };

  if (!credentials) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¡Cuenta Creada Exitosamente!"
      size="md"
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <p className="text-text-secondary">
            {isInvite
              ? "La cuenta del restaurante ha sido configurada y la invitación ha sido enviada por correo."
              : "La cuenta del restaurante ha sido configurada y los accesos han sido despachados."}
          </p>
        </div>

        {/* Credentials / Invitation */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-text mb-3">
            {isInvite ? "Invitación" : "Datos de Ingreso"}
          </h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">Correo</label>
              <p className="font-mono text-text">
                {isInvite ? invite.email : credentials.email}
              </p>
            </div>
            {isInvite ? (
              <div>
                <label className="text-xs text-text-secondary">Estado</label>
                <p className="text-text font-medium">
                  {invite.message || "Invitación enviada por correo."}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-text-secondary">
                    Contraseña Temporal
                  </label>
                  <p className="font-mono text-text font-bold">
                    {credentials.password}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-text-secondary">URL de Acceso</label>
                  <p className="font-mono text-text text-sm break-all">
                    {credentials.loginUrl}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Copy Button */}
        <Button
          variant="outline"
          fullWidth
          icon={<Copy className="w-4 h-4" />}
          onClick={handleCopy}
        >
          {copied ? "¡Copiado!" : "Copiar Todas las Credenciales"}
        </Button>

        {/* Info */}
        <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-accent-secondary inline mr-2" />
          <span className="text-text-secondary">
            Se ha enviado un aviso de forma directa al dueño utilizando los canales seleccionados (SMS/WhatsApp/Email).
          </span>
        </div>

        <Button onClick={onClose} fullWidth>
          Finalizar
        </Button>
      </div>
    </Modal>
  );
};

export default PendingRequests;
