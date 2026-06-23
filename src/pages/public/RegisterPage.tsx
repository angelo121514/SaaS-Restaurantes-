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
  HelpCircle,
  Copy
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
import { isValidEmail, copyToClipboard } from "../../utils/helpers";
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
  password?: string;
  delivery_channel: "email" | "whatsapp";
}

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [userPassword, setUserPassword] = useState("");
  
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
    password: "",
    delivery_channel: "email",
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

    if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
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

    const definedPass = formData.password?.trim() || "";
    const finalPass = definedPass || `CMOR-${Math.floor(100000 + Math.random() * 900000)}`;
    setUserPassword(finalPass);

    try {
      const requestId = crypto.randomUUID();
      const notesWithDelivery = [
        formData.notes?.trim(),
        `[Canal: ${formData.delivery_channel.toUpperCase()}]`,
        `[PasswordDefinida: ${definedPass ? "true" : "false"}]`
      ].filter(Boolean).join("\n");

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
            notes: notesWithDelivery,
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

    // P0-2 Remediación: el flujo de pago real se implementará en P1-7.
    // Por ahora, solo free_trial se auto-activa; starter/pro requieren
    // que el webhook de la gateway llame a auto_approve_registration_v2.
    // (La RPC rechaza planes pagos si no es admin o webhook autenticado.)
    try {
      const planConfig = APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans];
      const amount = planConfig ? planConfig.price : 0;
      const provider = "trial"; // solo trial se auto-activa
      const txId = "trial_" + Math.random().toString(36).substring(2, 11);

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
        // P0-2: si la RPC rechaza por plan pago no autorizado, redirigir a flujo de pago
        if (data[0].error === "unauthorized_paid_plan") {
          throw new Error(
            "Para activar el plan " + selectedPlan + " debes completar el pago. " +
            "El flujo de pago real será implementado próximamente. " +
            "Por ahora, regístrate con plan Free Trial y contacta a ventas@cmorflow.cl para upgrade."
          );
        }
        throw new Error(data[0].message || data[0].error || "Error al activar el restaurante");
      }

      const createdRestaurantId = data[0].restaurant_id;

      // Register user in Supabase Auth with metadata linking to restaurant
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: userPassword,
        options: {
          data: {
            full_name: formData.owner_name,
            role: "owner",
            restaurant_id: createdRestaurantId,
          },
        },
      });

      if (signUpError) {
        // If user already exists (retry scenario), don't break the flow
        if (!signUpError.message.toLowerCase().includes("already registered")) {
          throw new Error(`Error al registrar credenciales: ${signUpError.message}`);
        }
      }

      // If user chose Email and it is not mock mode, invoke the invitation trigger
      if (formData.delivery_channel === "email" && typeof (supabase as any).auth?.onAuthStateChange === "function") {
        try {
          await supabase.functions.invoke("invite-owner");
        } catch (funcErr) {
          console.error("Error al disparar Edge Function de invitaciones:", funcErr);
        }
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
    const activePlan = APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans];
    const isTrial = selectedPlan === "free_trial";

    const handleAutoLogin = async () => {
      setLoading(true);
      setError("");
      try {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: formData.email.toLowerCase(),
          password: userPassword,
        });
        if (loginErr) throw loginErr;
        window.location.href = "/restaurant";
      } catch (err: any) {
        console.error("Auto login failed:", err);
        window.location.href = `/login?email=${encodeURIComponent(formData.email)}`;
      } finally {
        setLoading(false);
      }
    };

    const whatsappMessage = `¡Hola! Acabo de registrar mi restaurante en Cmor Flow. Mis credenciales de acceso son:\n\n📧 Correo: ${formData.email.toLowerCase()}\n🔑 Contraseña: ${userPassword}\n\nAcceder al panel: ${window.location.origin}/login`;
    const cleanPhone = formData.phone.replace(/[\s\-()+]/g, "");

    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 relative overflow-hidden font-sans transition-colors duration-200">
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

        <div className="max-w-lg w-full text-center flex flex-col items-center bg-bg-subtle/90 backdrop-blur-md border border-border p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-2 animate-bounce">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-text tracking-tight">
            {isTrial ? "¡Cuenta Demo Activada!" : "¡Suscripción y Cuenta Activadas!"}
          </h1>
          
          <p className="text-text-secondary text-sm leading-relaxed">
            Tu restaurante <strong className="text-text">{formData.restaurant_name}</strong> ha sido registrado con éxito. 
            {isTrial 
              ? " Tu período de prueba de 15 días ha comenzado. " 
              : ` El pago de tu plan ${activePlan?.name} fue procesado correctamente.`}
          </p>

          <div className="space-y-4 w-full text-left">
            {/* Credentials Card */}
            <div className="bg-bg border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-text text-sm flex items-center gap-1.5 border-b border-border pb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Credenciales de Acceso</span>
              </h3>
              
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center bg-bg-subtle/50 p-2 rounded border border-border/50">
                  <span className="text-text-secondary">Correo:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-text font-semibold">{formData.email.toLowerCase()}</span>
                    <button 
                      onClick={() => copyToClipboard(formData.email.toLowerCase())}
                      className="text-red-500 hover:text-red-600 transition-colors p-1"
                      title="Copiar Correo"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-bg-subtle/50 p-2 rounded border border-border/50">
                  <span className="text-text-secondary">Contraseña:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-text font-semibold">{userPassword}</span>
                    <button 
                      onClick={() => copyToClipboard(userPassword)}
                      className="text-red-500 hover:text-red-600 transition-colors p-1"
                      title="Copiar Contraseña"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Delivery Info */}
            {formData.delivery_channel === "whatsapp" ? (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Como elegiste recibir tus accesos por WhatsApp, puedes pulsar el botón de abajo para enviar las credenciales a tu chat y guardarlas.
                </p>
                <a 
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button 
                    fullWidth
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all border-0 shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 2c-5.514 0-9.989 4.443-9.989 9.924 0 2.096.654 4.041 1.765 5.67l-1.15 4.218 4.364-1.127a9.924 9.924 0 004.981 1.341c5.512 0 9.988-4.443 9.988-9.924C22 6.443 17.525 2 12.031 2zm0 18.06c-1.8 0-3.486-.514-4.93-1.405l-.353-.217-2.613.675.696-2.557-.253-.399a8.106 8.106 0 01-1.343-4.57c0-4.52 3.693-8.196 8.232-8.196 4.538 0 8.231 3.676 8.231 8.196s-3.692 8.196-8.231 8.196zm4.846-5.834c-.266-.131-1.571-.762-1.815-.849-.243-.087-.421-.131-.599.131-.177.262-.689.849-.846 1.025-.156.175-.314.197-.579.066-.266-.131-1.122-.407-2.138-1.298-.79-.693-1.324-1.549-1.479-1.811-.156-.262-.016-.404.116-.534.12-.117.266-.306.399-.459.132-.153.177-.262.266-.437.089-.175.044-.328-.022-.459-.066-.131-.599-1.42-.821-1.944-.217-.514-.455-.443-.623-.451-.157-.008-.337-.009-.517-.009a.994.994 0 00-.719.328c-.244.262-.931.896-.931 2.186 0 1.29.954 2.535 1.087 2.71.133.175 1.878 2.825 4.55 3.953.636.269 1.132.429 1.519.55.639.2 1.22.172 1.68.104.512-.076 1.571-.634 1.792-1.246.222-.612.222-1.137.156-1.246-.067-.109-.244-.175-.51-.306z"/>
                    </svg>
                    <span>Enviar a mi WhatsApp</span>
                  </Button>
                </a>
              </div>
            ) : (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
                ¡Perfecto! Hemos registrado tu canal preferido. Si estás en modo real, se ha enviado un correo corporativo personalizado con el logotipo de Cmor Flow a <strong className="text-text">{formData.email}</strong>. Puedes utilizar las credenciales de arriba para acceder inmediatamente.
              </div>
            )}
          </div>

          <div className="w-full pt-2">
            <Button 
              onClick={handleAutoLogin}
              loading={loading}
              fullWidth
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg flex items-center justify-center gap-2"
            >
              <span>Entrar al Panel de Restaurant</span>
            </Button>
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
                <h3 className="font-bold text-lg text-text">Demo 15 Días</h3>
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
                    Tendrás acceso completo al sistema durante 15 días para evaluar la plataforma en tu local. No se requiere tarjeta de crédito.
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
                // Transbank Webpay Plus Portal Simulation
                <div className="space-y-6">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <h2 className="text-base font-bold text-text flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="text-red-600 font-extrabold tracking-wide">Webpay Plus (Transbank)</span>
                    </h2>
                    <span className="text-xs text-text-secondary bg-bg px-2.5 py-1 border border-border rounded-full flex items-center">
                      <Lock className="w-3 h-3 text-emerald-500 mr-1" /> Portal Seguro Transbank
                    </span>
                  </div>

                  <div className="bg-bg border border-border rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Comercio:</span>
                      <strong className="text-text font-bold">Cmor Flow SaaS</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Plan Solicitado:</span>
                      <strong className="text-text uppercase font-semibold">{activePlan?.name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Orden de Compra:</span>
                      <span className="font-mono text-text text-xs">{createdRequestId.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg pt-1">
                      <span className="text-text font-semibold">Total a Pagar:</span>
                      <strong className="text-red-500 font-black text-xl">
                        {APP_CONFIG.defaultCurrency} {activePlan?.price.toLocaleString("es-CL")}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
                    Serás redirigido al portal simulado de Transbank para autorizar el cargo. Una vez procesado, el comercio activará tu panel y credenciales al instante.
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="submit"
                      loading={paymentLoading}
                      fullWidth
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg"
                    >
                      Pagar (Simular Éxito)
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setPaymentError("Transacción rechazada por el usuario en el portal de Webpay.");
                      }}
                      variant="outline"
                      fullWidth
                      size="lg"
                      className="border-border hover:bg-bg-subtle text-text"
                    >
                      Cancelar Transacción
                    </Button>
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

                  {!isGoogleSignUp && (
                    <Input
                      label="Contraseña"
                      name="password"
                      type="password"
                      value={formData.password || ""}
                      onChange={handleChange}
                      error={errors.password}
                      placeholder="Mínimo 6 caracteres (Opcional, se auto-generará si se deja en blanco)"
                    />
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                      ¿Cómo prefieres recibir tus credenciales de acceso?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, delivery_channel: "email" }))}
                        className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                          formData.delivery_channel === "email"
                            ? "bg-red-500/10 border-red-500 text-red-500"
                            : "bg-bg border-border text-text-secondary hover:border-text-secondary"
                        }`}
                      >
                        <span className="font-semibold text-sm">Correo Electrónico</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.delivery_channel === "email" ? "border-red-500" : "border-border"}`}>
                          {formData.delivery_channel === "email" && <div className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                      </div>
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, delivery_channel: "whatsapp" }))}
                        className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                          formData.delivery_channel === "whatsapp"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                            : "bg-bg border-border text-text-secondary hover:border-text-secondary"
                        }`}
                      >
                        <span className="font-semibold text-sm">WhatsApp (Gratuito)</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.delivery_channel === "whatsapp" ? "border-emerald-500" : "border-border"}`}>
                          {formData.delivery_channel === "whatsapp" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
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
              Al enviar este formulario, aceptas nuestros{" "}
              <Link to="/legal/terminos" target="_blank" className="text-accent underline hover:text-accent-secondary">
                Términos de Servicio
              </Link>{" "}
              y nuestra{" "}
              <Link to="/legal/privacidad" target="_blank" className="text-accent underline hover:text-accent-secondary">
                Política de Privacidad
              </Link>
              . Nuestro equipo se pondrá en contacto contigo a la brevedad.
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
