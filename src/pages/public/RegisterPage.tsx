import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import {
  Button,
  Input,
  Select,
  Textarea,
  Alert,
} from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail } from "../../utils/helpers";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  restaurant_type: string;
  heard_from: string;
  notes: string;
}

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    restaurant_type: "",
    heard_from: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "El nombre del restaurante es obligatorio";
    }

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "El nombre del dueño es obligatorio";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El número de teléfono es obligatorio";
    } else if (formData.phone.replace(/[\s\-()]/g, "").length < 8) {
      newErrors.phone = "Por favor ingresa un número de teléfono válido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido";
    }

    if (!formData.city.trim()) {
      newErrors.city = "La ciudad es obligatoria";
    }

    if (!formData.restaurant_type) {
      newErrors.restaurant_type = "El tipo de restaurante es obligatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert([
          {
            restaurant_name: formData.restaurant_name.trim(),
            owner_name: formData.owner_name.trim(),
            phone: formData.phone.replace(/[\s\-()]/g, ""),
            email: formData.email.trim() || null,
            city: formData.city.trim(),
            address: formData.address.trim() || null,
            restaurant_type: formData.restaurant_type,
            heard_from: formData.heard_from || null,
            notes: formData.notes.trim() || null,
            status: "pending",
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Error de registro:", err);
      setError(
        err.message || "No se pudo enviar el registro. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 relative overflow-hidden font-sans transition-colors duration-200">
        {/* Background Blobs */}
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

        <div className="max-w-lg w-full text-center flex flex-col items-center bg-bg-subtle/90 backdrop-blur-md border border-border p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-2">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">
            ¡Registro Enviado Exitosamente!
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            ¡Muchas gracias por tu interés en <strong className="text-text">CMOR FLOW</strong>! Nuestro equipo verificará los detalles y se pondrá en contacto contigo dentro de las próximas 24 horas al número{" "}
            <strong className="text-text">{formData.phone}</strong>
            {formData.email && ` o al correo ${formData.email}`}.
          </p>
          <div className="space-y-4 w-full">
            <div className="bg-bg border border-border rounded-xl p-5 text-left">
              <h3 className="font-semibold text-text mb-3 flex items-center space-x-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>¿Qué sucede ahora?</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
                <li className="flex items-start">
                  <span className="text-red-400 font-bold mr-2">1.</span>
                  <span>Nuestro equipo revisará tu solicitud de registro de forma prioritaria.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 font-bold mr-2">2.</span>
                  <span>Te llamaremos para verificar datos y explicarte el funcionamiento del sistema.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 font-bold mr-2">3.</span>
                  <span>Una vez verificado, recibirás tus credenciales de acceso vía WhatsApp/SMS.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 font-bold mr-2">4.</span>
                  <span>¡Podrás iniciar tu prueba gratuita de 30 días al instante con todas las funciones Pro!</span>
                </li>
              </ul>
            </div>
            <Link to="/" className="block w-full">
              <Button 
                variant="outline" 
                fullWidth
                className="border-border text-text-secondary hover:bg-bg-subtle hover:text-text"
              >
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text py-12 px-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-text transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <CmorFlowLogo size="sm" showText={true} layout="row" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
                Registra tu Restaurante
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Comienza tu camino digital hoy mismo
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-bg-subtle/90 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 [&_label]:!text-text-secondary [&_input]:!bg-bg [&_input]:!border-border [&_input]:!text-text [&_input]:placeholder-text-secondary focus-within:[&_input]:!ring-red-600 [&_select]:!bg-bg [&_select]:!border-border [&_select]:!text-text focus-within:[&_select]:!ring-red-650 [&_textarea]:!bg-bg [&_textarea]:!border-border [&_textarea]:!text-text focus-within:[&_textarea]:!ring-red-650 transition-colors duration-200">
          {error && <Alert type="error" message={error} className="bg-red-950/40 border-red-800/50 text-red-200" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Restaurant Details */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>Detalles del Restaurante</span>
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nombre del Restaurante"
                  name="restaurant_name"
                  value={formData.restaurant_name}
                  onChange={handleChange}
                  error={errors.restaurant_name}
                  placeholder="Ej: Pizzería Don Mario"
                  required
                />

                <Select
                  label="Tipo de Restaurante"
                  name="restaurant_type"
                  value={formData.restaurant_type}
                  onChange={handleChange}
                  error={errors.restaurant_type}
                  options={APP_CONFIG.restaurantTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Ciudad"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="Ej: Santiago"
                    required
                  />

                  <Input
                    label="Dirección (Opcional)"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Ej: Av. Vitacura 3400"
                  />
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>Detalles del Propietario</span>
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nombre del Dueño"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  error={errors.owner_name}
                  placeholder="Tu nombre completo"
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Número de Teléfono"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="Ej: +56912345678"
                    required
                  />

                  <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="ejemplo@correo.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>Información Adicional</span>
              </h2>
              <div className="space-y-4">
                <Select
                  label="¿Cómo te enteraste de nosotros?"
                  name="heard_from"
                  value={formData.heard_from}
                  onChange={handleChange}
                  options={APP_CONFIG.heardFromOptions.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />

                <Textarea
                  label="Notas Adicionales (Opcional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Cualquier requerimiento especial o consulta..."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-bg border border-border rounded-xl p-4 text-xs text-text-secondary leading-relaxed transition-colors">
              Al enviar este formulario, aceptas nuestros Términos de Servicio y nuestra Política de Privacidad. Nuestro equipo se pondrá en contacto contigo a la brevedad.
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              loading={loading} 
              fullWidth 
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg shadow-red-900/20 active:scale-[0.98]"
            >
              Enviar Solicitud de Registro
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-text-secondary">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-red-500 font-semibold hover:text-red-600 transition-colors hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
