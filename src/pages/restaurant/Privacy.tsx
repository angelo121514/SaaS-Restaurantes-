import React, { useEffect, useState } from "react";
import { Download, ChevronDown, ChevronUp, Shield, FileText, Scale } from "lucide-react";
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
  const [expandedDoc, setExpandedDoc] = useState<"terms" | "privacy" | null>(null);

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

      {/* Sección de Documentos Legales */}
      <Card className="p-6">
        <div className="flex items-start space-x-3 mb-6 border-b border-border pb-4">
          <Scale className="w-6 h-6 text-accent flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-text">Documentos Legales y de Cumplimiento</h3>
            <p className="text-text-secondary text-sm">
              Consulta los términos de uso y políticas vigentes para el tratamiento de tus datos y los de tus clientes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Términos del Servicio */}
          <div className="border border-border rounded-xl overflow-hidden transition-all duration-200">
            <button
              onClick={() => setExpandedDoc(expandedDoc === "terms" ? null : "terms")}
              className="w-full flex items-center justify-between p-4 bg-bg-subtle/40 hover:bg-bg-subtle/80 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-accent" />
                <div>
                  <span className="font-bold text-text text-sm">Términos y Condiciones del Servicio</span>
                  <span className="block text-[10px] text-text-secondary">Incluye Anexo A: Acuerdo de Tratamiento de Datos (DPA)</span>
                </div>
              </div>
              {expandedDoc === "terms" ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>

            {expandedDoc === "terms" && (
              <div className="p-4 border-t border-border bg-bg/50 max-h-96 overflow-y-auto space-y-4 text-xs text-text-secondary leading-relaxed">
                <div>
                  <h4 className="font-bold text-text text-sm mb-1">Términos de Uso del SaaS</h4>
                  <p className="mb-2"><strong>1. Objeto:</strong> CMOR FLOW pone a disposición la plataforma SaaS para la gestión digital de restaurantes (pedidos por QR, menú, POS y CRM).</p>
                  <p className="mb-2"><strong>2. Capacidad y Registro:</strong> El restaurante declara poseer la capacidad legal y la autoridad para vincularse al servicio. Se compromete a mantener claves seguras.</p>
                  <p className="mb-2"><strong>3. Tarifas y Planes:</strong> El uso comercial está sujeto al pago de las tarifas del plan contratado (Básico/Pro) y el ciclo de facturación (mensual/anual).</p>
                </div>
                
                <div className="border-t border-border/50 pt-3">
                  <h4 className="font-bold text-text text-sm mb-1">Anexo A: Acuerdo de Tratamiento de Datos (DPA)</h4>
                  <p className="mb-2"><strong>1. Roles del Tratamiento:</strong> El restaurante actúa como el <strong>Responsable del Tratamiento</strong> de los datos personales de sus clientes finales. CMOR FLOW actúa únicamente como el <strong>Encargado del Tratamiento</strong> bajo las instrucciones del restaurante.</p>
                  <p className="mb-2"><strong>2. Medidas de Seguridad:</strong> El Encargado garantiza la aplicación de salvaguardas tecnológicas (cifrado TLS en tránsito, hashing de contraseñas, RLS a nivel de base de datos en Supabase y segregación estricta de inquilinos).</p>
                  <p className="mb-2"><strong>3. Notificación de Incidentes:</strong> En caso de detectarse cualquier brecha de seguridad que afecte los datos del restaurante, CMOR FLOW lo notificará dentro de las 72 horas hábiles correspondientes.</p>
                  <p className="mb-2"><strong>4. Subencargados Autorizados:</strong> Se autoriza el uso de infraestructura de proveedores líderes de nube (Supabase Inc. y Vercel Inc.) con políticas estrictas de privacidad.</p>
                </div>
              </div>
            )}
          </div>

          {/* Política de Privacidad */}
          <div className="border border-border rounded-xl overflow-hidden transition-all duration-200">
            <button
              onClick={() => setExpandedDoc(expandedDoc === "privacy" ? null : "privacy")}
              className="w-full flex items-center justify-between p-4 bg-bg-subtle/40 hover:bg-bg-subtle/80 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <span className="font-bold text-text text-sm">Política de Privacidad de Datos</span>
                  <span className="block text-[10px] text-text-secondary">Cumplimiento con Ley 19.628 y Ley 21.719</span>
                </div>
              </div>
              {expandedDoc === "privacy" ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>

            {expandedDoc === "privacy" && (
              <div className="p-4 border-t border-border bg-bg/50 max-h-96 overflow-y-auto space-y-4 text-xs text-text-secondary leading-relaxed">
                <div>
                  <h4 className="font-bold text-text text-sm mb-1">Tratamiento de Información de Clientes y Personal</h4>
                  <p className="mb-2"><strong>1. Datos Recopilados:</strong> Información de contacto de los owners y personal (nombre, email, teléfono) y datos mínimos de pedidos de clientes para la facturación e historial comercial.</p>
                  <p className="mb-2"><strong>2. Finalidades:</strong> Mantenimiento del servicio SaaS, soporte técnico de incidencias, y envío de comunicaciones operativas.</p>
                  <p className="mb-2"><strong>3. Derechos ARCO:</strong> Garantizamos a todos los titulares la capacidad de ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a nuestro DPO a <strong>dpo@cmorflow.cl</strong>.</p>
                  <p className="mb-2"><strong>4. Conservación:</strong> Los datos de comandas y transacciones se mantienen durante un periodo de 6 años para dar cumplimiento a las normativas de fiscalización del Servicio de Impuestos Internos (SII), tras lo cual se aplican procesos de anonimización.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RestaurantPrivacyPage;
