import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Modal, Button, Alert } from "../ui";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import {
  hasAnyConsent,
  grantConsent,
} from "../../services/privacyService";
import { useAuth } from "../../hooks/useAuth";

interface FirstLoginPrivacyModalProps {
  /** Forzar visible (debug). Por defecto se muestra solo si no hay consentimientos. */
  forceOpen?: boolean;
}

/**
 * Modal obligatorio al primer login owner/staff (Ley 21.719 — transparencia).
 * Se muestra si no existe ningún consentimiento para el email del usuario.
 * Registra en `consents` con proof { via: 'first_login_modal' }.
 */
export const FirstLoginPrivacyModal: React.FC<FirstLoginPrivacyModalProps> = ({
  forceOpen = false,
}) => {
  const { user, profile } = useAuth();
  const email = user?.email ?? "";
  const subjectId = user?.id ?? null;

  const [open, setOpen] = useState(forceOpen);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || forceOpen) {
      setOpen(forceOpen);
      return;
    }
    let active = true;
    (async () => {
      const exists = await hasAnyConsent(email);
      if (active) setOpen(!exists);
    })();
    return () => {
      active = false;
    };
  }, [email, forceOpen]);

  const handleAccept = async () => {
    setError(null);
    if (!acceptedTerms) {
      setError("Debes aceptar la política para continuar.");
      return;
    }
    if (!email) {
      setError("No se pudo resolver tu email.");
      return;
    }
    setSaving(true);

    // Servicio (necesario, contract): siempre granted.
    const ok1 = await grantConsent({
      subjectId,
      subjectEmail: email,
      scope: "cookies",
      purpose:
        "Tratamiento necesario para la prestación del servicio (base: contrato).",
      legalBasis: "contract",
      granted: true,
      via: "first_login_modal",
    });

    let ok2 = true;
    if (marketing) {
      ok2 = await grantConsent({
        subjectId,
        subjectEmail: email,
        scope: "marketing",
        purpose: "Comunicaciones comerciales.",
        legalBasis: "consent",
        granted: true,
        via: "first_login_modal",
      });
    }

    let ok3 = true;
    if (analytics) {
      ok3 = await grantConsent({
        subjectId,
        subjectEmail: email,
        scope: "analytics",
        purpose: "Analítica de uso.",
        legalBasis: "consent",
        granted: true,
        via: "first_login_modal",
      });
    }

    setSaving(false);

    if (ok1 && ok2 && ok3) {
      setOpen(false);
    } else {
      setError("Error al registrar el consentimiento. Intenta nuevamente.");
    }
  };

  return (
    <>
      <Modal
        isOpen={open}
        onClose={() => {
          /* No se puede cerrar sin aceptar la política */
        }}
        title="Aviso de Privacidad"
        size="lg"
        showCloseButton={false}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <p className="text-text">
              Bienvenido{profile?.display_name ? `, ${profile.display_name}` : ""}.
              Antes de continuar revisa nuestra política de privacidad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPolicyOpen(true)}
            className="text-accent underline text-sm"
          >
            Leer política de privacidad completa
          </button>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span className="text-sm text-text">
              He leído y acepto la política de privacidad. Consiento el
              tratamiento de mis datos para la prestación del servicio
              (necesario, no revocable sin cancelar la cuenta).
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span className="text-sm text-text">
              Consiento recibir comunicaciones de marketing (revocable).
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            <span className="text-sm text-text">
              Consiento la analítica de uso del producto (revocable).
            </span>
          </label>

          {error && <Alert type="error" message={error} />}

          <div className="flex justify-end">
            <Button onClick={handleAccept} loading={saving} disabled={!acceptedTerms}>
              Aceptar y continuar
            </Button>
          </div>
        </div>
      </Modal>

      <PrivacyPolicyModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
      />
    </>
  );
};

export default FirstLoginPrivacyModal;
