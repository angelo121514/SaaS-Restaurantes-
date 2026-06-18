import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle, 
  Sparkles, 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Zap, 
  Check, 
  HelpCircle 
} from "lucide-react";
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
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  
  // Registration data
  const [createdRequestId, setCreatedRequestId] = useState("");
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

  // Payment states
  const [selectedPlan, setSelectedPlan] = useState<"free_trial" | "starter" | "pro">("pro");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const checkGoogleSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.user) {
          // Check if they already have a profile with a restaurant
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .single();

          if (profile?.restaurant_id) {
            // Already registered and linked! Redirect to dashboard
            window.location.href = "/restaurant";
            return;
          }

          // Not linked to any restaurant yet. Pre-fill their profile info!
          setIsGoogleSignUp(true);
          setFormData((prev) => ({
            ...prev,
            email: session.user.email || "",
            owner_name: session.user.user_metadata?.full_name || prev.owner_name,
          }));
        }
      } catch (err) {
        console.error("Error checking Google session:", err);
      }
    };
    checkGoogleSession();
  }, []);

  const handleGoogleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/register",
        },
      });

      if (oAuthError) {
        console.error("Google register error:", oAuthError);
        setError(`Error al iniciar registro con Google: ${oAuthError.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Catch Google register error:", err);
      setError(`Error al conectar con Google: ${err?.message || err}`);
      setLoading(false);
    }
  };

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
      const requestId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert([
          {
            id: requestId,
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

      setCreatedRequestId(requestId);
      setStep("payment");
    } catch (err: any) {
      console.error("Error de registro:", err);
      setError(
        err.message || "No se pudo enviar el registro. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");

    if (selectedPlan !== "free_trial") {
      if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
        setPaymentError("Por favor completa todos los campos de pago");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setPaymentError("Número de tarjeta inválido");
        return;
      }
    }

    setPaymentLoading(true);

    // Simulate online gateway processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const planConfig = APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans];
      const amount = planConfig ? planConfig.price : 0;
      const provider = selectedPlan === "free_trial" ? "simulator" : "credit_card";
      const txId = (selectedPlan === "free_trial" ? "trial_" : "sim_") + Math.random().toString(36).substring(2, 11);

      // Call our secure RPC that automatically approves, activates and links profiles
      const { data, error: rpcErr } = await supabase.rpc("auto_approve_registration_v2", {
        p_request_id: createdRequestId,
        p_plan: selectedPlan,
        p_payment_provider: provider,
        p_transaction_id: txId,
        p_amount: amount,
      });

      if (rpcErr) throw rpcErr;

      if (data && data.length > 0 && !data[0].success) {
        throw new Error(data[0].message || "Error al activar el restaurante");
      }

      setStep("success");
    } catch (err: any) {
      console.error("Payment error:", err);
      setPaymentError(err.message || "Error al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setPaymentLoading(false);
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

  // Card formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ").substring(0, 19);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    let formatted = val;
    if (val.length > 2) {
      formatted = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardExpiry(formatted.substring(0, 5));
  };

  // ==========================================
  // STEP 3: SUCCESS SCREEN
  // ==========================================
  if (step === "success") {
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
            ¡Suscripción y Cuenta Activadas!
          </h1>
          
          <p className="text-text-secondary text-sm leading-relaxed">
            {isGoogleSignUp ? (
              <span>
                ¡Felicitaciones! Tu restaurante <strong className="text-text">{formData.restaurant_name}</strong> ha sido activado y vinculado a tu cuenta de Google. Ya puedes comenzar a utilizar el sistema inmediatamente.
              </span>
            ) : (
              <span>
                El pago de tu plan <strong className="text-text">{APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans]?.name}</strong> se ha procesado exitosamente. Hemos enviado un correo electrónico de invitación a <strong className="text-text">{formData.email}</strong> para que configures tu contraseña y accedas.
              </span>
            )}
          </p>

          <div className="space-y-4 w-full pt-2">
            <div className="bg-bg border border-border rounded-xl p-5 text-left">
              <h3 className="font-semibold text-text mb-3 flex items-center space-x-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>¿Cómo ingresar al sistema?</span>
              </h3>
              
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
                {isGoogleSignUp ? (
                  <li className="flex items-start">
                    <span className="text-red-500 font-bold mr-2">✓</span>
                    <span>Presiona el botón "Ir al Panel" a continuación. Iniciarás sesión directamente con tu cuenta de Google.</span>
                  </li>
                ) : (
                  <>
                    <li className="flex items-start">
                      <span className="text-red-500 font-bold mr-2">1.</span>
                      <span>Busca en tu bandeja de entrada el correo con asunto <strong>"Tu acceso a CMOR FLOW"</strong>.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 font-bold mr-2">2.</span>
                      <span>Haz clic en el botón de confirmación en el correo para crear tu contraseña segura.</span>
                    </li>
                  </>
                )}
                <li className="flex items-start">
                  <span className="text-red-500 font-bold mr-2">{isGoogleSignUp ? "✓" : "3."}</span>
                  <span>Podrás configurar tu menú, generar tu código QR y comenzar a recibir pedidos en tu local.</span>
                </li>
              </ul>
            </div>

            {isGoogleSignUp ? (
              <Button 
                onClick={() => window.location.href = "/restaurant"}
                fullWidth
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all border-0 shadow-lg"
              >
                Ir a mi Panel de Restaurant
              </Button>
            ) : (
              <Link to="/login" className="block w-full">
                <Button 
                  fullWidth
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg"
                >
                  Ir al Inicio de Sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2: SELECT PLAN & ONLINE CHECKOUT
  // ==========================================
  if (step === "payment") {
    const activePlan = APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans];

    return (
      <div className="min-h-screen bg-bg text-text py-12 px-4 relative overflow-hidden font-sans transition-colors duration-200">
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

        <div className="max-w-3xl mx-auto relative z-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <CmorFlowLogo size="md" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Paso 2: Activa tu Plan de Suscripción
            </h1>
            <p className="text-text-secondary text-sm max-w-lg mx-auto">
              Estás registrando <strong className="text-text">{formData.restaurant_name}</strong>. Elige el plan que mejor se adapte a tu local y activa tu cuenta de forma instantánea.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Plan selector cards */}
            {/* Free Trial */}
            <div 
              onClick={() => setSelectedPlan("free_trial")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                selectedPlan === "free_trial" 
                  ? "bg-bg-subtle border-red-600 shadow-lg scale-[1.02]" 
                  : "bg-bg-subtle/40 border-border opacity-80 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg text-text">Demo 30 Días</h3>
                <p className="text-xs text-text-secondary mt-1">Prueba gratis inicial</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-text">$0</span>
                  <span className="text-xs text-text-secondary font-medium"> / mes</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> 50 pedidos/mes</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Menú QR básico</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "free_trial" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "free_trial" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>

            {/* Básico */}
            <div 
              onClick={() => setSelectedPlan("starter")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                selectedPlan === "starter" 
                  ? "bg-bg-subtle border-red-600 shadow-lg scale-[1.02]" 
                  : "bg-bg-subtle/40 border-border opacity-80 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg text-text">Starter</h3>
                <p className="text-xs text-text-secondary mt-1">Esencial para locales</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-text">$40.000</span>
                  <span className="text-xs text-text-secondary font-medium"> / mes</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Pedidos ilimitados</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Menú digital QR</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Soporte WhatsApp</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "starter" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "starter" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>

            {/* Pro */}
            <div 
              onClick={() => setSelectedPlan("pro")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 relative ${
                selectedPlan === "pro" 
                  ? "bg-bg-subtle border-red-600 shadow-xl scale-[1.04]" 
                  : "bg-bg-subtle/40 border-border opacity-85 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div className="absolute -top-3 right-4 bg-amber-500 text-bg text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow">
                Recomendado
              </div>
              <div>
                <h3 className="font-bold text-lg text-text flex items-center gap-1.5">
                  Pro <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-text-secondary mt-1">Multi-sucursal e IA</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-text">$120.000</span>
                  <span className="text-xs text-text-secondary font-medium"> / mes</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Todo lo del plan Básico</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Web con SEO en Google</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Recomendaciones IA</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "pro" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "pro" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>
          </div>

          {/* Payment execution area */}
          <div className="bg-bg-subtle border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            {paymentError && (
              <Alert type="error" message={paymentError} className="mb-6 bg-red-950/40 border-red-800/50 text-red-200" />
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {selectedPlan === "free_trial" ? (
                // Free Trial execution UI
                <div className="space-y-4 text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-2">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-text text-lg">Activación de Prueba Gratuita</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">
                    Tendrás acceso completo al sistema durante 30 días para evaluar la plataforma en tu local. No se requiere tarjeta de crédito.
                  </p>
                  <Button 
                    type="submit" 
                    loading={paymentLoading} 
                    fullWidth 
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg max-w-sm mx-auto"
                  >
                    Activar mi Cuenta Demo
                  </Button>
                </div>
              ) : (
                // Credit Card Simulation UI
                <div className="space-y-6">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <h2 className="text-base font-bold text-text flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-red-500" />
                      <span>Pago en Línea con Tarjeta</span>
                    </h2>
                    <span className="text-xs text-text-secondary bg-bg px-2.5 py-1 border border-border rounded-full flex items-center">
                      <Lock className="w-3 h-3 text-emerald-500 mr-1" /> Transacción Encriptada
                    </span>
                  </div>

                  {/* Visual Credit Card Mockup */}
                  <div className="max-w-sm mx-auto w-full aspect-[1.586/1] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-zinc-700/50 rounded-xl p-5 text-white flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/10 rounded-full filter blur-3xl pointer-events-none" />
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Socio Proveedor</p>
                        <CmorFlowLogo size="sm" showText={false} />
                      </div>
                      <div className="h-6 w-9 bg-zinc-700/50 rounded opacity-85" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-mono text-lg tracking-widest text-center text-zinc-200">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Titular de Tarjeta</p>
                        <p className="font-medium text-xs tracking-wider uppercase text-zinc-300 truncate max-w-[150px]">
                          {cardName || "NOMBRE TITULAR"}
                        </p>
                      </div>
                      <div className="flex space-x-4">
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Vence</p>
                          <p className="font-mono text-xs text-zinc-300">{cardExpiry || "MM/AA"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">CVV</p>
                          <p className="font-mono text-xs text-zinc-300">{cardCvv || "•••"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <Input
                      label="Número de la Tarjeta"
                      name="cardNumber"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      icon={<CreditCard className="w-4 h-4" />}
                      required
                    />

                    <Input
                      label="Nombre del Titular"
                      name="cardName"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.substring(0, 30))}
                      placeholder="Como aparece en la tarjeta"
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fecha de Vencimiento"
                        name="cardExpiry"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                      />

                      <Input
                        label="Código de Seguridad (CVV)"
                        name="cardCvv"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Button */}
                  <Button 
                    type="submit" 
                    loading={paymentLoading} 
                    fullWidth 
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>Simular Pago Seguro de {APP_CONFIG.defaultCurrency} {activePlan?.price.toLocaleString("es-CL")}</span>
                  </Button>

                  <div className="flex items-center justify-center space-x-1 text-xs text-text-secondary">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Conexión cifrada de 256 bits mediante pasarela integrada.</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 1: FORM REGISTER
  // ==========================================
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

          {isGoogleSignUp ? (
            <div className="bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 rounded-xl p-4 text-sm flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>
                Autenticado con Google: <strong>{formData.email}</strong>. Completa los datos de tu local para finalizar el registro.
              </span>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                size="lg"
                onClick={handleGoogleRegister}
                loading={loading}
                className="border border-border text-text hover:bg-bg-subtle font-bold flex items-center justify-center transition-all duration-200 bg-bg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35 11.1H12v2.7h5.38c-0.24 1.28-0.96 2.37-2.04 3.1v2.6h3.28c1.92-1.77 3.03-4.37 3.03-7.4 0-.74-.07-1.4-.32-2z" fill="#4285F4" />
                  <path d="M12 20.5c2.3 0 4.23-.76 5.64-2.08l-3.28-2.6c-.9.6-2.06.98-3.36.98-2.58 0-4.78-1.74-5.56-4.07H2.07v2.7c1.45 2.88 4.41 4.87 7.93 4.87z" fill="#34A853" />
                  <path d="M6.44 12.73c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V6.23H2.07c-.66 1.32-1.07 2.81-1.07 4.6 0 1.79.41 3.28 1.07 4.6l3.37-2.7z" fill="#FBBC05" />
                  <path d="M12 4.73c1.25 0 2.37.43 3.25 1.27l2.43-2.43C16.22 2.2 14.28 1.5 12 1.5c-3.52 0-6.48 1.99-7.93 4.87l4.37 2.7c.78-2.33 2.98-4.07 5.56-4.07z" fill="#EA4335" />
                </svg>
                <span>Registrarse con Google</span>
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs text-text-secondary uppercase tracking-wider font-bold">
                  o completa el formulario
                </span>
                <div className="flex-grow border-t border-border"></div>
              </div>
            </>
          )}

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
                    readOnly={isGoogleSignUp}
                    className={isGoogleSignUp ? "opacity-75 bg-bg-subtle cursor-not-allowed" : ""}
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
              Continuar al Pago y Activación
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
