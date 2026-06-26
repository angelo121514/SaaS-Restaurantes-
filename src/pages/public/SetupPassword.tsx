import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Mail, CreditCard, Calendar, Receipt } from "lucide-react";
import { Button, Input, Alert, Loading } from "../../components/ui";
import { supabase } from "../../config/authClient";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

/**
 * Página de definición de contraseña (destino del magic link de invitación o redirección directa Webpay).
 *
 * Flujo:
 *  1. Si hay sesión, mostramos el formulario para definir la contraseña (flujo invitación).
 *  2. Si la URL trae datos de pago directo (tras éxito en Webpay), se muestra un comprobante
 *     de pago detallado para las evidencias de Transbank, y se permite definir la contraseña
 *     directamente mediante signUp.
 *  3. Tras actualizar o crear la cuenta, redirigimos a /restaurant.
 */
const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parámetros de invitación
  const inviteToken = searchParams.get("token");

  // Parámetros de Webpay (para evidencias de certificación)
  const emailParam = searchParams.get("email") || "";
  const ownerNameParam = searchParams.get("owner_name") || "";
  const buyOrder = searchParams.get("buy_order") || "";
  const amount = searchParams.get("amount") || "";
  const authCode = searchParams.get("authorization_code") || "";
  const cardNumber = searchParams.get("card_number") || "";
  const txDate = searchParams.get("transaction_date") || "";
  const paymentTypeCode = searchParams.get("payment_type_code") || "";
  const restaurantId = searchParams.get("restaurant_id") || "";

  const [checkingSession, setCheckingSession] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Mapeo del tipo de pago para Webpay
  const getPaymentType = (code: string) => {
    switch (code?.toUpperCase()) {
      case "VD": return "Tarjeta de Débito (Redcompra)";
      case "VN": return "Tarjeta de Crédito (Sin Cuotas)";
      case "VC": return "Tarjeta de Crédito (Con Cuotas)";
      case "SI": return "Tarjeta de Crédito (Sin Interés)";
      case "S2": return "Tarjeta de Crédito (3 Cuotas Sin Interés)";
      case "NC": return "Tarjeta de Crédito (Con Cuotas)";
      default: return "Tarjeta Bancaria";
    }
  };

  // Formatear fecha de la transacción
  const formatTxDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("es-CL", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // 1. Verificar la sesión o los parámetros de redirección directa de Webpay.
  useEffect(() => {
    let active = true;

    const processSession = async (session: any) => {
      if (!session?.user?.email) return false;
      if (active) {
        setAuthorized(true);
        setInvitedEmail(session.user.email);
        setCheckingSession(false);

        // 3. Consumir la invitación si hay token.
        if (inviteToken) {
          try {
            await supabase.rpc("consume_invitation", { p_token: inviteToken });
          } catch (e) {
            console.error("Error consuming invitation:", e);
          }
        }
      }
      return true;
    };

    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        processSession(data.session);
      } else if (emailParam && restaurantId) {
        // Flujo directo tras pago exitoso en Webpay
        if (active) {
          setAuthorized(true);
          setInvitedEmail(emailParam);
          setCheckingSession(false);
        }
      }
    });

    // Escuchar cambios de auth (cuando se procesa el hash del magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await processSession(session);
        }
      }
    );

    // Timeout de fallback para dejar de verificar si no hay sesión
    const timeout = setTimeout(() => {
      if (active) {
        if (emailParam && restaurantId) {
          setAuthorized(true);
          setInvitedEmail(emailParam);
        }
        setCheckingSession(false);
      }
    }, 2500);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [inviteToken, emailParam, restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session) {
        // Flujo 1: El usuario ya está autenticado (magic link), actualiza su contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) {
          setError(updateError.message || "No se pudo actualizar la contraseña.");
          setLoading(false);
          return;
        }
      } else if (emailParam && restaurantId) {
        // Flujo 2: Pago exitoso directo, registramos la cuenta en Supabase
        const { error: signUpError } = await supabase.auth.signUp({
          email: emailParam.toLowerCase(),
          password,
          options: {
            data: {
              full_name: ownerNameParam || "Socio CMOR FLOW",
              role: "owner",
              restaurant_id: restaurantId,
            },
          },
        });
        if (signUpError) {
          setError(signUpError.message || "No se pudo crear tu cuenta de usuario.");
          setLoading(false);
          return;
        }
      } else {
        setError("No se encontró una sesión activa ni parámetros de activación válidos.");
        setLoading(false);
        return;
      }

      setDone(true);
      // Navegación automática al dashboard después de crear la contraseña
      setTimeout(() => navigate("/restaurant"), 1500);
    } catch (err: any) {
      setError(err?.message || "Error inesperado al configurar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <Loading text="Verificando activación de cuenta…" />;
  }

  // Sin sesión ni parámetros de activación: enlace inválido/expirado.
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-warning mx-auto" />
          <h1 className="text-xl font-bold text-text">
            Enlace inválido o expirado
          </h1>
          <p className="text-text-secondary text-sm">
            El enlace de invitación no es válido, ha expirado o ya fue utilizado para activar tu restaurante.
          </p>
          <Button onClick={() => navigate("/login")} variant="outline">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-success mx-auto" />
          <h1 className="text-xl font-bold text-text">¡Cuenta Activada!</h1>
          <p className="text-text-secondary text-sm">
            Tu contraseña se ha configurado correctamente. Redirigiéndote a tu panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 py-12 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <CmorFlowLogo size="lg" />
          <div>
            <h1 className="text-2xl font-black text-text tracking-tight">Activa tu Cuenta</h1>
            <p className="text-text-secondary text-xs mt-1">
              Completa el registro de tu restaurante en CMOR FLOW definiendo tu contraseña.
            </p>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* COMPROBANTE DE PAGO WEBPAY (EVIDENCIA DE CERTIFICACIÓN) */}
        {/* ──────────────────────────────────────────────────────── */}
        {buyOrder && (
          <div className="bg-bg-subtle/50 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex items-center space-x-2.5 border-b border-border pb-3 mb-3.5">
              <Receipt className="w-5 h-5 text-emerald-500" />
              <div className="text-left">
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Comprobante de Pago</h3>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-bold">APROBADA</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-secondary">Comercio:</span>
                <span className="text-text font-semibold">CMOR FLOW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Orden de Compra:</span>
                <span className="text-text font-bold">{buyOrder}</span>
              </div>
              {authCode && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Cod. Autorización:</span>
                  <span className="text-text font-bold text-emerald-500">{authCode}</span>
                </div>
              )}
              {amount && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Monto:</span>
                  <span className="text-text font-bold">${Number(amount).toLocaleString("es-CL")} CLP</span>
                </div>
              )}
              {txDate && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fecha y Hora:</span>
                  <span className="text-text font-semibold">{formatTxDate(txDate)}</span>
                </div>
              )}
              {cardNumber && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tarjeta (Últimos 4):</span>
                  <span className="text-text font-semibold">**** **** **** {cardNumber}</span>
                </div>
              )}
              {paymentTypeCode && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tipo de Pago:</span>
                  <span className="text-text font-semibold">{getPaymentType(paymentTypeCode)}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3.5 pt-2.5 border-t border-border/60 text-[10px] text-text-secondary text-center">
              Transacción procesada de forma segura mediante Webpay Plus.
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} />}

        <div className="bg-bg-subtle/20 border border-border rounded-2xl p-5 shadow-sm">
          {invitedEmail && (
            <div className="mb-4 text-center">
              <span className="text-xs text-text-secondary">Usuario:</span>
              <p className="text-sm font-bold text-text flex items-center justify-center gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-primary" /> {invitedEmail}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Establecer contraseña y Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
