import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Activity, Plus, RefreshCw } from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Badge,
  Select,
  Alert,
  Loading,
  Input,
  Textarea,
} from "../../components/ui";
import {
  listBreaches,
  createBreach,
  listAnomalies,
  listRecentAuditEvents,
  severityToBadgeVariant,
  type BreachRecord,
  type BreachSeverity,
  type BreachStatus,
  type AnomalyResult,
} from "../../services/securityService";

const SEVERITY_OPTIONS: { value: BreachSeverity | "all"; label: string }[] = [
  { value: "all", label: "Todas las severidades" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const STATUS_OPTIONS: { value: BreachStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "detected", label: "Detectada" },
  { value: "investigating", label: "Investigando" },
  { value: "contained", label: "Contenida" },
  { value: "notified", label: "Notificada" },
  { value: "closed", label: "Cerrada" },
];

const STATUS_LABEL: Record<BreachStatus, string> = {
  detected: "Detectada",
  investigating: "Investigando",
  contained: "Contenida",
  notified: "Notificada",
  closed: "Cerrada",
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso;
  }
}

const Security: React.FC = () => {
  const [breaches, setBreaches] = useState<BreachRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [recent, setRecent] = useState<
    {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<BreachSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<BreachStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const [b, a, r] = await Promise.all([
      listBreaches({ severity: filterSeverity, status: filterStatus }),
      listAnomalies(),
      listRecentAuditEvents(100),
    ]);
    if (b.error) setError(b.error);
    if (a.error && !error) setError(a.error);
    if (r.error && !error) setError(r.error);
    setBreaches(b.data || []);
    setAnomalies(a.data || []);
    setRecent(r.data || []);
    setLoading(false);
  }, [filterSeverity, filterStatus, error]);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSeverity, filterStatus]);

  if (loading && breaches.length === 0) {
    return <Loading text="Cargando panel de seguridad..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2 flex items-center">
            <ShieldAlert className="w-7 h-7 mr-2 text-error" />
            Seguridad
          </h2>
          <p className="text-text-secondary">
            Brechas registradas y anomalías del audit_log. Ley 21.719 req. 10.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={reload}
          >
            Actualizar
          </Button>
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreate(true)}
          >
            Registrar brecha
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div>
        <h3 className="text-lg font-semibold text-text mb-3 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-accent-secondary" />
          Anomalías (audit_log)
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {anomalies.map((a) => {
            const hot = a.count > 0;
            return (
              <Card key={a.key} className={hot ? "border-error" : ""}>
                <p className="text-sm text-text-secondary mb-1">{a.label}</p>
                <p className={`text-3xl font-bold ${hot ? "text-error" : "text-text"}`}>
                  {a.count}
                </p>
                <p className="text-xs text-text-secondary mt-1">Últimas {a.window_hours}h</p>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Severidad"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as BreachSeverity | "all")}
          options={SEVERITY_OPTIONS}
        />
        <Select
          label="Estado"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as BreachStatus | "all")}
          options={STATUS_OPTIONS}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text mb-3">Brechas ({breaches.length})</h3>
        {breaches.length === 0 ? (
          <Card className="text-center py-12">
            <ShieldAlert className="w-12 h-12 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">No hay brechas que coincidan con los filtros.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {breaches.map((b) => (
              <Card key={b.id}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityToBadgeVariant(b.severity)}>
                        {b.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="neutral">{STATUS_LABEL[b.status]}</Badge>
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(b.detected_at)}
                      </span>
                    </div>
                    <p className="text-text">{b.description}</p>
                    {b.affected_data_categories && b.affected_data_categories.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        <strong>Categorías afectadas:</strong>{" "}
                        {b.affected_data_categories.join(", ")}
                      </p>
                    )}
                    {b.affected_subjects_count != null && (
                      <p className="text-sm text-text-secondary">
                        <strong>Titulares afectados:</strong> {b.affected_subjects_count}
                      </p>
                    )}
                    {b.root_cause && (
                      <p className="text-sm text-text-secondary">
                        <strong>Causa raíz:</strong> {b.root_cause}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary md:text-right space-y-1">
                    {b.authority_notified_at && (
                      <p>Autoridad: {formatDateTime(b.authority_notified_at)}</p>
                    )}
                    {b.subjects_notified_at && (
                      <p>Titulares: {formatDateTime(b.subjects_notified_at)}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text mb-3">Eventos recientes (audit_log)</h3>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Acción</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Tabla</th>
                <th className="py-2 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-secondary">
                    Sin eventos recientes.
                  </td>
                </tr>
              ) : (
                recent.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-text-secondary">{formatDateTime(e.created_at)}</td>
                    <td className="py-2 pr-4 font-mono text-text">{e.action}</td>
                    <td className="py-2 pr-4 text-text">{e.actor_email || "—"}</td>
                    <td className="py-2 pr-4 text-text-secondary">{e.table_name || "—"}</td>
                    <td className="py-2 pr-4 text-text-secondary">{e.ip || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <CreateBreachModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          reload();
        }}
      />
    </div>
  );
};

interface CreateBreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateBreachModal: React.FC<CreateBreachModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [severity, setSeverity] = useState<BreachSeverity>("medium");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [subjectsCount, setSubjectsCount] = useState("");
  const [containment, setContainment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!description.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    setLoading(true);
    const cats = categories.split(",").map((s) => s.trim()).filter(Boolean);
    const result = await createBreach({
      severity,
      description: description.trim(),
      affected_data_categories: cats.length ? cats : undefined,
      affected_subjects_count: subjectsCount ? Number(subjectsCount) : null,
      containment_measures: containment.trim() || null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDescription("");
    setCategories("");
    setSubjectsCount("");
    setContainment("");
    onCreated();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar nueva brecha" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Alert
          type="info"
          message="Al registrar una brecha con severidad media o superior, el DPO debe activar el playbook de notificación dentro de 72h (docs/seguridad/playbook_respuesta_incidentes.md)."
        />
        <Select
          label="Severidad"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as BreachSeverity)}
          options={[
            { value: "low", label: "Baja" },
            { value: "medium", label: "Media" },
            { value: "high", label: "Alta" },
            { value: "critical", label: "Crítica" },
          ]}
          required
        />
        <Textarea
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué ocurrió, cómo se detectó, qué tablas o datos están involucrados."
          rows={4}
          required
        />
        <Input
          label="Categorías afectadas (separadas por coma)"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="identidad B2B, contacto B2B, autenticación"
          helperText="Ver categorías en spec §1.3."
        />
        <Input
          label="Nº de titulares afectados (aprox.)"
          type="number"
          min={0}
          value={subjectsCount}
          onChange={(e) => setSubjectsCount(e.target.value)}
        />
        <Textarea
          label="Medidas de contención"
          value={containment}
          onChange={(e) => setContainment(e.target.value)}
          placeholder="Qué se hizo para frenar el incidente."
          rows={3}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" loading={loading} fullWidth>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default Security;
