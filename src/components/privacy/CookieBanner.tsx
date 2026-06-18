import React, { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "../ui";
import { Modal } from "../ui";
import { grantConsent } from "../../services/privacyService";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";
import type { ConsentScope } from "../../config/supabase";

interface ScopeChoice {
  scope: ConsentScope;
  label: string;
  description: string;
  legal_basis: "consent" | "legitimate_interest";
}

const CHOICES: ScopeChoice[] = [
  {
    scope: "analytics",
    label: "Analítica de uso",
    description: "Métricas anónimas para mejorar el producto.",
    legal_basis: "consent",
  },
  {
    scope: "marketing",
    label: "Marketing",
    description: "Comunicaciones comerciales y promociones.",
    legal_basis: "consent",
  },
  {
    scope: "ai_profiling",
    label: "Perfilado con IA",
    description: "Recomendaciones basadas en tu actividad.",
    legal_basis: "consent",
  },
];

const STORAGE_KEY = "cmor_cookie_consent";

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(
    () => typeof localStorage !== "undefined" && !localStorage.getItem(STORAGE_KEY)
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [scopes, setScopes] = useState<Record<ConsentScope, boolean>>({
    analytics: false,
    marketing: false,
    ai_profiling: false,
    third_party_share: false,
    cookies: true,
  });
  const [emailInput, setEmailInput] = useState("");

  const persist = async (grantedScopes: ConsentScope[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_POLICY_VERSION,
        grantedAt: new Date().toISOString(),
        scopes: grantedScopes,
      })
    );
    const email = emailInput.trim();
    // Si hay email, persistir prueba legal en la tabla consents.
    if (email) {
      for (const s of grantedScopes) {
        await grantConsent({
          subjectId: null,
          subjectEmail: email,
          scope: s,
          purpose: `Consentimiento ${s} vía banner de cookies`,
          legalBasis: "consent",
          granted: true,
          via: "cookie_banner",
        });
      }
    }
  };

  const acceptAll = async () => {
    await persist(["analytics", "marketing", "ai_profiling"]);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const onlyNecessary = async () => {
    await persist([]);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const saveCustom = async () => {
    const granted = (Object.keys(scopes) as ConsentScope[]).filter(
      (k) => scopes[k] && k !== "cookies"
    );
    await persist(granted);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const toggle = (scope: ConsentScope) =>
    setScopes((prev) => ({ ...prev, [scope]: !prev[scope] }));

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-bg border-t border-border shadow-lg">
        <div className="container-custom flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text">
              <p className="font-semibold text-text">
                Usamos cookies para mejorar tu experiencia.
              </p>
              <p className="text-text-secondary">
                Las necesarias son obligatorias. Puedes aceptar todas o
                personalizar. Política:{" "}
                <a
                  href="/legal/privacidad"
                  className="text-accent underline"
                >
                  ver política de privacidad
                </a>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onlyNecessary}>
              Solo necesarias
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
              Personalizar
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Aceptar todo
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Personalizar consentimiento"
        size="md"
      >
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Tu email (para registro legal del consentimiento, opcional)"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="input"
          />
          {CHOICES.map((c) => (
            <label
              key={c.scope}
              className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-bg-subtle"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={scopes[c.scope]}
                onChange={() => toggle(c.scope)}
              />
              <div>
                <p className="font-medium text-text">{c.label}</p>
                <p className="text-sm text-text-secondary">{c.description}</p>
              </div>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onlyNecessary}>
              Solo necesarias
            </Button>
            <Button onClick={saveCustom}>Guardar preferencias</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CookieBanner;
