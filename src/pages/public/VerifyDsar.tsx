import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "../../config/supabase";

type Status = "loading" | "success" | "error" | "expired";

export const VerifyDsar: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [requestType, setRequestType] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificación no proporcionado.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-dsar", {
          body: { token },
        });

        if (error) {
          const status = (error as any)?.context?.status || 500;
          if (status === 410) {
            setStatus("expired");
            setMessage("El enlace de verificación ha expirado (24 horas). Solicita uno nuevo.");
          } else if (status === 404) {
            setStatus("error");
            setMessage("Token inválido o ya utilizado. Si crees que es un error, contacta a dpo@cmorflow.cl.");
          } else {
            setStatus("error");
            setMessage("Ocurrió un error al verificar tu solicitud.");
          }
          return;
        }

        if (data?.success) {
          setStatus("success");
          setRequestType(data.request_type || "");
          setMessage(data.message || "Tu solicitud fue verificada y ejecutada.");
        } else {
          setStatus("error");
          setMessage(data?.error || "Error desconocido.");
        }
      } catch (err) {
        console.error("verify-dsar error:", err);
        setStatus("error");
        setMessage("No se pudo conectar con el servidor.");
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-border p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Verificando tu solicitud...
            </h1>
            <p className="text-sm text-text-secondary">
              Estamos confirmando tu identidad y ejecutando tu solicitud de derechos.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Solicitud completada
            </h1>
            <p className="text-sm text-text-secondary mb-4">{message}</p>
            {requestType && (
              <div className="bg-zinc-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-text-secondary">Tipo de solicitud</p>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {requestType.replace("-", " ")}
                </p>
              </div>
            )}
            <button
              onClick={() => navigate("/")}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Volver al inicio
            </button>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Enlace expirado
            </h1>
            <p className="text-sm text-text-secondary mb-4">{message}</p>
            <button
              onClick={() => navigate("/legal/contacto-dpo")}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Solicitar uno nuevo
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Error de verificación
            </h1>
            <p className="text-sm text-text-secondary mb-4">{message}</p>
            <button
              onClick={() => navigate("/legal/contacto-dpo")}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Contactar al DPO
            </button>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-text-secondary">
            CMOR FLOW · DPO: <a href="mailto:dpo@cmorflow.cl" className="text-accent hover:underline">dpo@cmorflow.cl</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyDsar;
