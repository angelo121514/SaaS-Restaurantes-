import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, FileText, X } from "lucide-react";
import { Button, Card, Badge } from "../../components/ui";
import { PrivacyPolicyModal } from "../../components/privacy/PrivacyPolicyModal";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

const CLIENT_TEXT = `
Responsable: el restaurante donde realizas tu pedido es responsable de
tus datos de cliente; CMOR FLOW actúa como encargado del tratamiento
(alimenta/procesa en Supabase lo que el restaurante introduce).

Finalidades: gestión de pedidos, atención al cliente, historial de
compras, comunicaciones sobre tu pedido.

Categorías: nombre, teléfono, email, notas de pedido, historial de
pedidos.

Derechos: acceso, rectificación, supresión, oposición, portabilidad.
Para ejercerlos, contacta al restaurante o a dpo@cmorflow.cl.

Conservación: historial de pedidos 24 meses sin actividad; los datos
financieros del pedido se conservan 6 años por obligación tributaria
(SII), anonimizando tu identidad al expirar.

IA: el chatbot de recomendaciones es stateless. Tus mensajes no se
persisten ni se usan para entrenar modelos.
`;

const PrivacyClientsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-accent">
              Volver al inicio
            </Link>
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/");
                }
              }}
              className="p-1 rounded-full text-text-secondary hover:text-text hover:bg-bg/20 transition-all"
              aria-label="Cerrar"
              title="Cerrar y volver"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">
            Privacidad de Clientes
          </h1>
        </div>
        <Badge variant="accent-secondary">
          Versión {CURRENT_POLICY_VERSION}
        </Badge>

        <Card className="p-6 mt-6">
          <p className="text-text-secondary whitespace-pre-line">
            {CLIENT_TEXT}
          </p>
        </Card>

        <div className="mt-6">
          <Button
            variant="outline"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Ver aviso completo
          </Button>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        policyText={CLIENT_TEXT}
        title="Aviso de Privacidad — Clientes"
      />
    </div>
  );
};

export default PrivacyClientsPage;
