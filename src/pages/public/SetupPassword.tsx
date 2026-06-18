import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Button, Input, Alert, Loading } from "../../components/ui";
import { supabase } from "../../config/authClient";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

/**
 * Página de definición de contraseña (destino del magic link de invitación).
 *
 * Flujo:
 *  1. Supabase redirige aquí con la sesión OTP ya establecida en la URL
 *     (#access_token=...). Al montar, comprobamos getSession().
 *  2. Si hay sesión, mostramos el formulario para definir la contraseña.
 *  3. Si la URL trae ?token=<invitation_token>, llamamos a consume_invitation
 *     para marcar la invitación como consumida (el profile ya se creó vía el
 *     app_metadata que pasó la Edge Function al invitar).
 *  4. Tras actualizar la contraseña, redirigimos a /restaurant.
 */
const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [checkingSession, setCheckingSession] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // 1. Verificar la sesión que trae el magic link.
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
      }
    });

    // Escuchar cambios de auth (cuando se procesa el hash del link)
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
        setCheckingSession(false);
      }
    }, 2500);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [inviteToken]);

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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }
      setDone(true);
      // onAuthStateChange mantendrá la sesión; navegamos al panel.
      setTimeout(() => navigate("/restaurant"), 1500);
    } catch (err: any) {
      setError(err?.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <Loading text="Verificando invitación…" />;
  }

  // Sin sesión OTP: invitación inválida/expirada.
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-warning mx-auto" />
          <h1 className="text-xl font-bold text-text">
            Enlace inválido o expirado
          </h1>
          <p className="text-text-secondary text-sm">
            El enlace de invitación no es válido o ya fue utilizado. Solicita
            uno nuevo al administrador de CMOR FLOW.
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
          <h1 className="text-xl font-bold text-text">¡Contraseña creada!</h1>
          <p className="text-text-secondary text-sm">
            Redirigiéndote a tu panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <CmorFlowLogo size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-text">Define tu contraseña</h1>
            {invitedEmail && (
              <p className="text-text-secondary text-sm mt-1 flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4" /> {invitedEmail}
              </p>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nueva contraseña"
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
            placeholder="Repite la contraseña"
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Crear contraseña y continuar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SetupPassword;
