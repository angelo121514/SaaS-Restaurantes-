import React from "react";
import { FileText } from "lucide-react";
import { Modal, Button, Badge } from "../ui";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Texto de la política. Por defecto muestra el resumen B2B. */
  policyText?: string;
  title?: string;
}

const DEFAULT_TEXT = `
Responsable del tratamiento: CMOR FLOW (Cmor Flow SpA).
Contacto del DPO: dpo@cmorflow.cl.

Finalidades: prestación del servicio SaaS de pedidos y gestión para
restaurantes; analítica de uso; comunicaciones comerciales (con
consentimiento); cumplimiento de obligaciones legales (SII).

Categorías de datos: identidad, contacto, autenticación,
transaccional, operativos.

Destinatarios: Vercel (hosting), Supabase (DB/Auth/Storage), proveedor
de email. Transferencias internacionales a EE. UU. con Cláusulas
Contractuales Tipo (SCC) y cifrado.

Derechos del titular (Ley 19.628 / Ley 21.719): acceso, rectificación,
cancelación (supresión), oposición, portabilidad y revocación del
consentimiento. Plazo máximo de respuesta: 30 días (15 días para
rectificación).

Conservación: según categorías; los documentos tributarios (pedidos)
se conservan 6 años por obligación del SII, anonimizando los datos
personales al expirar.

Reclamación: ante la autoridad competente en materia de protección de
datos personales.
`;

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  policyText = DEFAULT_TEXT,
  title = "Política de Privacidad",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          <Badge variant="accent-secondary">
            Versión {CURRENT_POLICY_VERSION}
          </Badge>
        </div>
        <div className="prose prose-sm max-w-none text-text whitespace-pre-line">
          {policyText}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
