import React, { useState } from "react";
import { Send } from "lucide-react";
import { Card, Button, Input, Select, Alert } from "../ui";
import {
  requestAccess,
  requestRectify,
  requestErase,
  requestObject,
  requestExport,
} from "../../services/privacyService";
import type { ConsentScope, DsarType } from "../../config/supabase";

interface DsarFormProps {
  defaultEmail?: string;
  onSubmitted?: () => void;
}

const TYPE_OPTIONS: { value: DsarType; label: string }[] = [
  { value: "access", label: "Acceso — ver mis datos" },
  { value: "rectify", label: "Rectificación — corregir datos" },
  { value: "erase", label: "Supresión — borrar mis datos" },
  { value: "object", label: "Oposición — detener un tratamiento" },
  { value: "export", label: "Portabilidad — exportar mis datos" },
];

const SCOPE_OPTIONS: { value: ConsentScope; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "analytics", label: "Analítica" },
  { value: "ai_profiling", label: "Perfilado IA" },
  { value: "third_party_share", label: "Compartir con terceros" },
];

interface RectifyRow {
  field: string;
  current: string;
  correct: string;
}

export const DsarForm: React.FC<DsarFormProps> = ({
  defaultEmail = "",
  onSubmitted,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [type, setType] = useState<DsarType>("access");
  const [scope, setScope] = useState<ConsentScope>("marketing");
  const [rectifyRows, setRectifyRows] = useState<RectifyRow[]>([
    { field: "", current: "", correct: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setResult(null);
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido." });
      return;
    }

    setLoading(true);
    let res;
    if (type === "access") res = await requestAccess(email);
    else if (type === "erase") res = await requestErase(email);
    else if (type === "export") res = await requestExport(email);
    else if (type === "object") res = await requestObject(email, scope);
    else {
      const valid = rectifyRows.filter((r) => r.field && r.correct);
      if (!valid.length) {
        setResult({
          success: false,
          message: "Agrega al menos un campo a rectificar.",
        });
        setLoading(false);
        return;
      }
      res = await requestRectify(email, { fields: valid });
    }
    setLoading(false);

    setResult({
      success: res.success,
      message:
        res.message ||
        (res.success
          ? "Solicitud enviada."
          : res.error || "Error al enviar la solicitud."),
    });
    if (res.success) onSubmitted?.();
  };

  const updateRow = (i: number, patch: Partial<RectifyRow>) =>
    setRectifyRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-text">Ejercer un derecho (DSAR)</h3>
      <p className="text-sm text-text-secondary">
        Ley 19.628 / Ley 21.719. Plazo de respuesta: 30 días (15 días
        rectificación).
      </p>

      <Input
        label="Tu email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Select
        label="Tipo de solicitud"
        value={type}
        onChange={(e) => setType(e.target.value as DsarType)}
        options={TYPE_OPTIONS}
      />

      {type === "object" && (
        <Select
          label="Tratamiento al que te opones"
          value={scope}
          onChange={(e) => setScope(e.target.value as ConsentScope)}
          options={SCOPE_OPTIONS}
        />
      )}

      {type === "rectify" && (
        <div className="space-y-3">
          <label className="label">Campos a rectificar</label>
          {rectifyRows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Campo (ej. phone)"
                value={row.field}
                onChange={(e) => updateRow(i, { field: e.target.value })}
              />
              <Input
                placeholder="Valor actual"
                value={row.current}
                onChange={(e) => updateRow(i, { current: e.target.value })}
              />
              <Input
                placeholder="Valor correcto"
                value={row.correct}
                onChange={(e) => updateRow(i, { correct: e.target.value })}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRectifyRows((prev) => [
                ...prev,
                { field: "", current: "", correct: "" },
              ])
            }
          >
            + Agregar campo
          </Button>
        </div>
      )}

      {result && (
        <Alert
          type={result.success ? "success" : "error"}
          message={result.message}
        />
      )}

      <Button
        onClick={handleSubmit}
        loading={loading}
        icon={<Send className="w-4 h-4" />}
      >
        Enviar solicitud
      </Button>
    </Card>
  );
};

export default DsarForm;
