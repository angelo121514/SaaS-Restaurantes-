import React, { useEffect, useState } from "react";
import { Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Button, Badge, Loading } from "../ui";
import {
  getMyConsents,
  revokeConsentScope,
} from "../../services/privacyService";
import type { Consent, ConsentScope } from "../../config/supabase";

interface ConsentManagerProps {
  email: string;
  onChanged?: () => void;
}

const SCOPES: { scope: ConsentScope; label: string; description: string }[] = [
  {
    scope: "analytics",
    label: "Analítica de uso",
    description: "Métricas anónimas para mejorar el producto.",
  },
  {
    scope: "marketing",
    label: "Marketing",
    description: "Comunicaciones comerciales y promociones.",
  },
  {
    scope: "ai_profiling",
    label: "Perfilado IA",
    description: "Recomendaciones basadas en tu actividad.",
  },
  {
    scope: "third_party_share",
    label: "Compartir con terceros",
    description: "Transferencia a encargados subcontratados.",
  },
];

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  email,
  onChanged,
}) => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<ConsentScope | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getMyConsents(email);
    setConsents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const isGranted = (scope: ConsentScope) =>
    consents.some((c) => c.scope === scope && c.granted);

  const handleRevoke = async (scope: ConsentScope) => {
    setRevoking(scope);
    const ok = await revokeConsentScope(email, scope);
    if (ok) {
      await load();
      onChanged?.();
    }
    setRevoking(null);
  };

  if (loading) return <Loading text="Cargando consentimientos…" />;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-text">Mis consentimientos</h3>
      </div>
      <p className="text-sm text-text-secondary">
        Gestiona qué tratamientos autorizas. Los cambios se aplican de inmediato.
      </p>

      <div className="space-y-3">
        {SCOPES.map(({ scope, label, description }) => {
          const granted = isGranted(scope);
          return (
            <div
              key={scope}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{label}</span>
                  <Badge variant={granted ? "success" : "neutral"}>
                    {granted ? "Concedido" : "Revocado"}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
              <Button
                variant={granted ? "outline" : "ghost"}
                size="sm"
                loading={revoking === scope}
                disabled={!granted}
                icon={
                  granted ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )
                }
                onClick={() => handleRevoke(scope)}
              >
                {granted ? "Revocar" : "Revocado"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary">
        Las cookies necesarias no son revocables (son imprescindibles para el
        funcionamiento del servicio).
      </p>
    </Card>
  );
};

export default ConsentManager;
