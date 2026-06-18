import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, Badge, Loading } from "../../components/ui";
import { ConsentManager, DsarForm } from "../../components/privacy";
import { listMyDsars } from "../../services/privacyService";
import { useAuth } from "../../hooks/useAuth";
import type { DataSubjectRequest } from "../../config/supabase";

const RestaurantPrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [dsars, setDsars] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    const data = await listMyDsars(email);
    setDsars(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ email, generatedAt: new Date().toISOString(), dsars }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-datos-${email}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!email) return <Loading text="Cargando…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">Privacidad y datos</h2>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExport}
        >
          Descargar mis datos
        </Button>
      </div>

      <ConsentManager email={email} onChanged={load} />

      <DsarForm defaultEmail={email} onSubmitted={load} />

      <Card className="p-6">
        <h3 className="text-lg font-bold text-text mb-3">
          Mis solicitudes (DSAR)
        </h3>
        {loading ? (
          <Loading text="Cargando solicitudes…" />
        ) : dsars.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No tienes solicitudes registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {dsars.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-text">{d.request_type}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(d.created_at).toLocaleString("es-CL")}
                  </p>
                </div>
                <Badge
                  variant={
                    d.status === "fulfilled"
                      ? "success"
                      : d.status === "rejected"
                      ? "error"
                      : "warning"
                  }
                >
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RestaurantPrivacyPage;
