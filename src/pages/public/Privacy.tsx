import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, FileText } from "lucide-react";
import { Button, Card, Badge } from "../../components/ui";
import { PrivacyPolicyModal } from "../../components/privacy/PrivacyPolicyModal";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

const PrivacyPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-accent">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">
            Política de Privacidad
          </h1>
        </div>
        <Badge variant="accent-secondary">
          Versión {CURRENT_POLICY_VERSION}
        </Badge>

        <Card className="p-6 mt-6 space-y-4 text-text">
          <section>
            <h2 className="text-xl font-semibold mb-2">Responsable</h2>
            <p className="text-text-secondary">
              CMOR FLOW (Cmor Flow SpA) — responsable del tratamiento de los
              datos de owners, staff y administradores. Para los datos de
              clientes finales, el restaurante es responsable y CMOR FLOW actúa
              como encargado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Finalidades</h2>
            <ul className="list-disc pl-5 text-text-secondary space-y-1">
              <li>Prestación del servicio SaaS de pedidos y gestión.</li>
              <li>Analítica de uso (con consentimiento).</li>
              <li>Comunicaciones comerciales (con consentimiento).</li>
              <li>Cumplimiento de obligaciones legales y tributarias (SII).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Tus derechos</h2>
            <p className="text-text-secondary">
              Acceso, rectificación, supresión, oposición, portabilidad y
              revocación del consentimiento (Ley 19.628 / Ley 21.719 art. 19).
              Plazo máximo de respuesta: 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Conservación</h2>
            <p className="text-text-secondary">
              Los documentos tributarios (pedidos) se conservan 6 años por
              obligación del SII, anonimizando los datos personales al expirar
              el plazo. El resto según la categoría documentada.
            </p>
          </section>
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            variant="outline"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Ver política completa
          </Button>
          <Link to="/legal/contacto-dpo">
            <Button variant="ghost" icon={<Mail className="w-4 h-4" />}>
              Contactar al DPO
            </Button>
          </Link>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default PrivacyPage;
