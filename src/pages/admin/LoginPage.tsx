import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { Button, Input, Alert, Card } from "../../components/ui";
import { supabase } from "../../config/authClient";
import { isValidEmail } from "../../utils/helpers";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
      // --- Supabase Auth real ---
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.toLowerCase(),
        password: formData.password,
      });

      if (signInError || !data.user) {
        setError("Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      // Validar rol admin via profiles (RLS lo permite para el propio user).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setError("Esta cuenta no tiene permisos de administrador.");
        setLoading(false);
        return;
      }

      // onAuthStateChange gestiona la sesión; navegamos al panel.
      navigate("/admin");
    } catch (err: any) {
      setError("Ha ocurrido un error. Por favor intenta de nuevo.");
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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center text-text-secondary hover:text-text mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Link>

        {/* Login Card */}
        <Card>
          {/* Logo and Title */}
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="mb-4">
              <CmorFlowLogo size="md" showText={true} />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Portal de Administración</h1>
            <p className="text-text-secondary">Acceso exclusivo para el equipo de soporte de CMOR FLOW</p>
          </div>

          {/* Error Alert */}
          {error && <Alert type="error" message={error} className="mb-6" />}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@cmorflow.cl"
              icon={<Mail className="w-5 h-5" />}
              required
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña de admin"
              icon={<Lock className="w-5 h-5" />}
              required
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              Ingresar como Administrador
            </Button>
          </form>

          {/* Info Box — demo credentials are only exposed in development builds */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-bg-subtle rounded-lg text-sm text-left">
              <p className="text-sm text-text-secondary">
                <strong>Credenciales por defecto (Demo — solo en desarrollo):</strong>
                <br />
                Email: <code className="bg-white/80 px-1 py-0.5 rounded">admin@foodorder.com</code>
                <br />
                Password: <code className="bg-white/80 px-1 py-0.5 rounded">admin123</code>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
