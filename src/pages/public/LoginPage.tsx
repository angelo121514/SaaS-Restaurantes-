import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, AlertCircle, Sparkles } from "lucide-react";
import { Button, Input, Alert } from "../../components/ui";
import { supabase } from "../../config/authClient";
import { isValidEmail } from "../../utils/helpers";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Tras volver de Google OAuth, la sesión JWT ya está establecida.
    // onAuthStateChange (gestionado por useAuth) resuelve el perfil; aquí
    // solo validamos pertenencia a un restaurante activo y navegamos.
    const checkOAuthReturn = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session?.user?.id) return;

        setLoading(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id, role")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          setError(
            "Tu cuenta de Google no está asociada a ningún restaurante registrado. Por favor regístrate primero."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profile.role === "admin") {
          navigate("/admin");
          return;
        }

        if (profile.restaurant_id) {
          const { data: rest } = await supabase
            .from("restaurants")
            .select("is_active")
            .eq("id", profile.restaurant_id)
            .single();
          if (rest && rest.is_active === false) {
            setError(
              "Tu cuenta de restaurante ha sido desactivada. Por favor contacta al soporte de CMOR FLOW."
            );
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }

        // El hook useAuth actualiza el estado global; navegamos al panel.
        navigate("/restaurant");
      } catch {
        // Errores de red al validar OAuth: no bloqueamos el render.
      } finally {
        setLoading(false);
      }
    };

    checkOAuthReturn();
    // Solo al montar / regresar de OAuth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/login",
        },
      });

      if (oAuthError) {
        console.error("Google login error:", oAuthError);
        setError(`Error al iniciar sesión con Google: ${oAuthError.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Catch Google login error:", err);
      setError(`Error al conectar con Google: ${err?.message || err}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Por favor ingresa tu correo y contraseña");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Por favor ingresa una dirección de correo válida");
      return;
    }

    setLoading(true);

    try {
      // --- Supabase Auth real (email + password) ---
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.toLowerCase(),
        password: formData.password,
      });

      if (signInError) {
        // Mensaje amistoso para credenciales inválidas
        const msg = signInError.message || "";
        if (
          msg.toLowerCase().includes("invalid login") ||
          msg.toLowerCase().includes("invalid credentials")
        ) {
          // Comprobar si el correo corresponde a un registro pendiente
          const { data: registrationData } = await supabase
            .from("registration_requests")
            .select("status")
            .eq("email", formData.email.toLowerCase())
            .single();
          if (registrationData && registrationData.status === "pending") {
            setError("pending");
          } else {
            setError("Correo o contraseña incorrectos");
          }
        } else {
          setError(`Error al iniciar sesión: ${msg}`);
        }
        setLoading(false);
        return;
      }

      // Login correcto. Validar que el restaurante esté activo (si aplica).
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id, role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          navigate("/admin");
          return;
        }

        if (profile?.restaurant_id) {
          const { data: rest } = await supabase
            .from("restaurants")
            .select("is_active")
            .eq("id", profile.restaurant_id)
            .single();
          if (rest && rest.is_active === false) {
            await supabase.auth.signOut();
            setError(
              "Tu cuenta de restaurante ha sido desactivada. Por favor contacta al soporte de CMOR FLOW."
            );
            setLoading(false);
            return;
          }
        }
      }

      // onAuthStateChange gestiona la navegación; forzamos por si acaso.
      navigate("/restaurant");
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        err?.toString() ||
        "Error de red. Por favor revisa tu conexión.";
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-stretch selection:bg-red-650 selection:text-white relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Left Panel: Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-bg-subtle flex-col justify-between p-12 z-10 border-r border-border">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-65 scale-105 hover:scale-100 transition-transform duration-[8000ms] ease-out"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80')`,
          }}
        />
        {/* Dark Overlays (only visible to contrast the image) */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/90 via-zinc-900/40 to-black/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-subtle via-transparent to-zinc-950/20 transition-colors duration-200" />

        {/* Top Header */}
        <div className="relative z-10 dark">
          <Link to="/" className="inline-flex items-center text-zinc-300 hover:text-white transition-colors">
            <CmorFlowLogo size="sm" showText={true} layout="row" />
          </Link>
        </div>

        {/* Bottom Quote & Value Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center space-x-2 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1 text-xs text-red-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestión Gastronómica de Vanguardia</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            La perfección del sushi llevada a la gestión digital.
          </h2>
          <p className="text-zinc-200 text-sm leading-relaxed">
            Administra pedidos, menú digital, POS de caja y CRM potenciado con Inteligencia Artificial. Todo desde un solo panel integrado para potenciar las ventas de tu restaurante.
          </p>
          <div className="pt-4 border-t border-zinc-800/80 flex items-center space-x-6 text-xs text-zinc-400">
            <div>
              <span className="block text-xl font-bold text-white">100%</span>
              <span>En Español</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-white">es-CL</span>
              <span>Moneda CLP ($)</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-white">AI ready</span>
              <span>Recomendador Inteligente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Form (Full width on mobile) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 py-12 z-10 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Logo on mobile view */}
          <div className="flex flex-col items-center lg:hidden space-y-4 text-center">
            <Link to="/">
              <CmorFlowLogo size="md" showText={true} layout="row" />
            </Link>
            <p className="text-xs text-text-secondary">Portal del restaurante</p>
          </div>

          {/* Form Header */}
          <div className="text-center lg:text-left space-y-2">
            <Link
              to="/"
              className="inline-flex items-center text-text-secondary hover:text-text transition-colors text-sm font-medium mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Link>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              Bienvenido de nuevo
            </h1>
            <p className="text-text-secondary text-sm">
              Inicia sesión en tu cuenta de restaurante para comenzar.
            </p>
          </div>

          {/* Form Box */}
          <div className="bg-bg-subtle/90 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 [&_label]:!text-text-secondary [&_input]:!bg-bg [&_input]:!border-border [&_input]:!text-text [&_input]:placeholder-text-secondary focus-within:[&_input]:!ring-red-650 transition-colors duration-200">
            {/* Pending Registration Alert */}
            {error === "pending" && (
              <Alert
                type="warning"
                title="Cuenta Pendiente de Verificación"
                message="Tu registro está bajo revisión. Nuestro equipo te contactará dentro de 24 horas para completar la configuración."
                className="bg-amber-950/40 border-amber-800/50 text-amber-200"
              />
            )}

            {/* Error Alert */}
            {error && error !== "pending" && (
              <Alert type="error" message={error} className="bg-red-950/40 border-red-800/50 text-red-200" />
            )}

            {/* Demo Credentials Box — only exposed in development builds */}
            {import.meta.env.DEV && (
              <div className="p-4 bg-bg border border-border rounded-xl space-y-2 relative overflow-hidden group transition-colors duration-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full filter blur-md -mr-4 -mt-4 transition-all duration-300 group-hover:bg-red-650/10" />
                <p className="text-xs font-semibold text-red-500 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span>🎯 Acceso Demo Instantáneo (solo desarrollo)</span>
                </p>
                <div className="text-xs text-text-secondary space-y-1">
                  <p>
                    <span className="font-medium text-text-secondary">Correo:</span>{" "}
                    <code className="text-text font-mono">demorestaurant@gmail.com</code>
                  </p>
                  <p>
                    <span className="font-medium text-text-secondary">Contraseña:</span>{" "}
                    <code className="text-text font-mono">ATVSW679</code>
                  </p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Correo Electrónico"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                icon={<Mail className="w-5 h-5 text-text-secondary" />}
                required
                autoComplete="email"
              />

              <Input
                label="Contraseña"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5 text-text-secondary" />}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                <label className="flex items-center text-text-secondary cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="mr-2 rounded border-border bg-bg text-red-600 focus:ring-red-600 focus:ring-offset-0 focus:ring-1 transition-colors duration-200" 
                  />
                  Recordarme
                </label>
                <a href="#" className="text-red-500 hover:text-red-600 transition-colors font-medium hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <Button 
                type="submit" 
                loading={loading} 
                fullWidth 
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg shadow-red-900/20 active:scale-[0.98]"
              >
                Iniciar Sesión
              </Button>
            </form>

            {/* OAuth Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-xs text-text-secondary uppercase tracking-wider font-bold">
                o continuar con
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="ghost"
              fullWidth
              size="lg"
              onClick={handleGoogleLogin}
              loading={loading}
              className="border border-border text-text hover:bg-bg-subtle font-bold flex items-center justify-center transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35 11.1H12v2.7h5.38c-0.24 1.28-0.96 2.37-2.04 3.1v2.6h3.28c1.92-1.77 3.03-4.37 3.03-7.4 0-.74-.07-1.4-.32-2z" fill="#4285F4" />
                <path d="M12 20.5c2.3 0 4.23-.76 5.64-2.08l-3.28-2.6c-.9.6-2.06.98-3.36.98-2.58 0-4.78-1.74-5.56-4.07H2.07v2.7c1.45 2.88 4.41 4.87 7.93 4.87z" fill="#34A853" />
                <path d="M6.44 12.73c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V6.23H2.07c-.66 1.32-1.07 2.81-1.07 4.6 0 1.79.41 3.28 1.07 4.6l3.37-2.7z" fill="#FBBC05" />
                <path d="M12 4.73c1.25 0 2.37.43 3.25 1.27l2.43-2.43C16.22 2.2 14.28 1.5 12 1.5c-3.52 0-6.48 1.99-7.93 4.87l4.37 2.7c.78-2.33 2.98-4.07 5.56-4.07z" fill="#EA4335" />
              </svg>
              <span>Continuar con Google</span>
            </Button>

            {/* Register Link */}
            <div className="text-center text-sm text-text-secondary">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                className="text-red-500 font-semibold hover:text-red-600 transition-colors hover:underline"
              >
                Registra tu restaurante
              </Link>
            </div>

            {/* Admin Login Divider */}
            <div className="pt-6 border-t border-border text-center">
              <Link
                to="/admin/login"
                className="text-xs text-text-secondary hover:text-text transition-colors flex items-center justify-center space-x-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Acceso Administrador (SaaS)</span>
              </Link>
            </div>
          </div>

          {/* Help Info */}
          <p className="text-center text-xs text-text-secondary">
            ¿Necesitas ayuda? Escríbenos a{" "}
            <a href="mailto:soporte@cmorflow.cl" className="text-text hover:underline">
              soporte@cmorflow.cl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
