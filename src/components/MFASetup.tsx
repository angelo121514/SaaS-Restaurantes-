import { useState, useEffect } from "react";
import { enrollMFA, verifyMFA, listMFAFactors, unenrollMFA } from "../services/mfaService";

export const MFASetup = () => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkExistingMFA();
  }, []);

  const checkExistingMFA = async () => {
    const { totp } = await listMFAFactors();
    const verified = totp.find((f: any) => f.status === "verified");
    if (verified) {
      setVerified(true);
      setFactorId(verified.id);
    }
  };

  const handleEnroll = async () => {
    setError("");
    const result = await enrollMFA();
    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
      setSecret(result.secret || "");
      const { totp } = await listMFAFactors();
      const pending = totp.find((f: any) => f.status === "unverified");
      if (pending) setFactorId(pending.id);
    } else {
      setError(result.error || "Error al generar QR");
    }
  };

  const handleVerify = async () => {
    setError("");
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    const result = await verifyMFA(factorId, code);
    if (result.success) {
      setVerified(true);
      setQrCode("");
      setCode("");
    } else {
      setError(result.error || "Código inválido");
    }
  };

  const handleUnenroll = async () => {
    if (!confirm("¿Desactivar 2FA? Esto reduce la seguridad de tu cuenta.")) return;
    const result = await unenrollMFA(factorId);
    if (result.success) {
      setVerified(false);
      setFactorId("");
    } else {
      setError(result.error || "Error al desactivar");
    }
  };

  if (verified) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-text">
        <h3 className="font-bold text-green-800">✅ 2FA activo</h3>
        <p className="text-sm text-green-700 mt-1">
          Tu cuenta está protegida con autenticación de dos factores.
        </p>
        <button
          onClick={handleUnenroll}
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Desactivar 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-text">
      <h3 className="font-bold text-yellow-800">🔒 Activar 2FA (recomendado)</h3>

      {!qrCode ? (
        <div className="mt-3">
          <p className="text-sm text-yellow-700 mb-3">
            Protege tu cuenta con un código de 6 dígitos desde tu teléfono.
          </p>
          <button
            onClick={handleEnroll}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Activar 2FA
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-yellow-700">
            1. Escanea este QR con Google Authenticator, 1Password o similar:
          </p>
          <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48 bg-white p-1 rounded" />
          <p className="text-xs text-gray-600">
            O ingresa este código manualmente: <code className="bg-gray-100 px-1">{secret}</code>
          </p>
          <p className="text-sm text-yellow-700">2. Ingresa el código de 6 dígitos:</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-32 text-center text-2xl tracking-widest border-2 border-yellow-300 rounded-lg p-2 bg-white text-black"
          />
          <button
            onClick={handleVerify}
            disabled={code.length !== 6}
            className="block w-full bg-green-600 text-white py-2 rounded-lg disabled:bg-gray-300 transition-colors"
          >
            Verificar y activar
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
