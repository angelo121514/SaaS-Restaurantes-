import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  ArrowLeft,
  Mail
} from "lucide-react";
import { Button } from "../../components/ui";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

interface ErrorDetails {
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
}

const ERROR_MAPPING: Record<string, ErrorDetails> = {
  user_cancelled: {
    title: "Transacción Cancelada",
    description: "Cancelaste la transacción en el portal de Webpay. No se ha realizado ningún cobro en tu tarjeta.",
    severity: "warning",
  },
  confirm_failed: {
    title: "Error de Confirmación",
    description: "No pudimos confirmar el pago con la entidad bancaria. Si ves el cobro reflejado en tu cuenta, por favor no vuelvas a pagar y contáctanos de inmediato.",
    severity: "error",
  },
  no_token: {
    title: "Token de Pago Inválido",
    description: "No se recibió un token de pago válido desde Transbank. Por seguridad, la transacción no puede procesarse.",
    severity: "error",
  },
  intent_not_found: {
    title: "Transacción Expirada",
    description: "No pudimos encontrar el registro de tu intención de pago o esta ha expirado. Por favor, inicia el registro de nuevo.",
    severity: "error",
  },
  amount_mismatch: {
    title: "Diferencia de Montos",
    description: "El monto cobrado por la entidad bancaria no coincide con el valor del plan seleccionado. La transacción fue rechazada por seguridad.",
    severity: "error",
  },
  activate_failed: {
    title: "Problema en Activación",
    description: "Tu pago fue recibido y aprobado, pero tuvimos un inconveniente técnico al activar tu restaurante en el sistema. Nuestro equipo ha sido notificado y tu cuenta será habilitada manualmente a la brevedad. No intentes pagar de nuevo.",
    severity: "warning",
  },
  // Códigos de error de Transbank
  REJECTED: {
    title: "Pago Rechazado",
    description: "La transacción fue rechazada por el banco emisor o por Transbank. Por favor, verifica el cupo de tu tarjeta, que los datos ingresados sean correctos, o intenta con otro medio de pago.",
    severity: "error",
  },
};

const DEFAULT_ERROR: ErrorDetails = {
  title: "Pago Fallido",
  description: "Ocurrió un problema inesperado al procesar tu transacción de pago con Webpay. Por favor, intenta de nuevo o utiliza otra tarjeta.",
  severity: "error",
};

const PaymentErrorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get("reason") || "";
  const buyOrder = searchParams.get("buy_order") || "";
  const amount = searchParams.get("amount") || "";
  
  const errorDetails = ERROR_MAPPING[reason] || DEFAULT_ERROR;

  const handleRetry = () => {
    navigate("/register");
  };

  const getIcon = () => {
    switch (errorDetails.severity) {
      case "warning":
        return <AlertTriangle className="w-16 h-16 text-amber-500 animate-pulse" />;
      case "error":
      default:
        return <XCircle className="w-16 h-16 text-red-600 animate-pulse" />;
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text py-12 px-4 relative overflow-hidden font-sans flex flex-col justify-center items-center transition-colors duration-200">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      <div className="w-full max-w-md bg-bg-subtle/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <CmorFlowLogo />
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
          {getIcon()}
          <h1 className="text-2xl font-black text-text mt-4 tracking-tight">
            {errorDetails.title}
          </h1>
        </div>

        <div className="bg-bg border border-border rounded-2xl p-5 mb-8 text-sm leading-relaxed text-text-secondary text-left">
          <p className="mb-3">{errorDetails.description}</p>
          
          {(buyOrder || amount || reason) && (
            <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs font-mono">
              {buyOrder && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Orden de Compra:</span>
                  <span className="text-text font-bold">{buyOrder}</span>
                </div>
              )}
              {amount && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Monto:</span>
                  <span className="text-text font-bold">${Number(amount).toLocaleString("es-CL")} CLP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Resultado / Motivo:</span>
                <span className="bg-bg-subtle px-2 py-0.5 border border-border rounded text-text font-bold uppercase">
                  {reason === "user_cancelled" ? "ANULADA_POR_USUARIO" : (reason || "RECHAZADA")}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            fullWidth
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4 mr-2 animate-spin-hover" />
            <span>Volver a Intentar</span>
          </Button>

          <a
            href="mailto:soporte@cmorflow.cl?subject=Problema con Pago Webpay"
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-border hover:bg-bg-subtle/60 text-text text-sm font-bold rounded-xl transition-all"
          >
            <Mail className="w-4 h-4 mr-2" />
            <span>Contactar Soporte</span>
          </a>

          <button
            onClick={() => navigate("/")}
            className="w-full text-xs text-text-secondary hover:text-text transition-all pt-2 flex items-center justify-center space-x-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Volver al inicio</span>
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-text-secondary relative z-10 flex items-center justify-center space-x-2">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span>Transacción protegida por Webpay Plus de Transbank</span>
      </div>
    </div>
  );
};

// Simple inline Lock icon to avoid external dependency issues if lucide-react changes
const Lock = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default PaymentErrorPage;
