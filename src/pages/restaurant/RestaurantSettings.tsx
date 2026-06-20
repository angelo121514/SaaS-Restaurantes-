import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink, LifeBuoy, Copy, Check, Lock, CreditCard, Globe, Coins, Hourglass, HelpCircle } from "lucide-react";
import { Card, Button, Loading, Alert, Input } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";
import { useAuth, useRestaurantId } from "../../hooks/useAuth";

const getTrialDaysLeft = (endsAt: string | null | undefined): number => {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const RestaurantSettings: React.FC = () => {
  const { profile, refresh } = useAuth();
  const restaurantId = useRestaurantId();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Local settings state
  const [configData, setConfigData] = useState({
    currency: "CLP",
    usdExchangeRate: 950,
    defaultLanguage: "es",
    defaultPrepTime: 15,
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Billing state
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvc: "",
  });
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleCopyId = async () => {
    if (!restaurant) return;
    try {
      await navigator.clipboard.writeText(restaurant.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "Las contraseñas nuevas no coinciden",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        setPasswordStatus({
          type: "error",
          message: updateError.message || "Error al actualizar la contraseña",
        });
      } else {
        setPasswordStatus({
          type: "success",
          message: "¡Contraseña actualizada exitosamente!",
        });
        setPasswordData({
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (err: any) {
      setPasswordStatus({
        type: "error",
        message: err.message || "Ocurrió un error inesperado",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        if (profile?.role === "admin") {
          setLoading(false);
          return;
        }

        if (!restaurantId) {
          setError("ID del restaurante no encontrado");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", restaurantId)
          .single();

        if (fetchError) throw fetchError;
        setRestaurant(data);
      } catch (err) {
        setError("Error al cargar los detalles del restaurante");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId, profile]);

  useEffect(() => {
    if (restaurant) {
      setConfigData({
        currency: restaurant.currency || "CLP",
        usdExchangeRate: restaurant.usd_exchange_rate || 950,
        defaultLanguage: restaurant.default_language || "es",
        defaultPrepTime: restaurant.default_prep_time || 15,
      });
    }
  }, [restaurant]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigStatus(null);
    setConfigLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          currency: configData.currency,
          usd_exchange_rate: Number(configData.usdExchangeRate),
          default_language: configData.defaultLanguage,
          default_prep_time: Number(configData.defaultPrepTime),
        })
        .eq("id", restaurantId);

      if (updateError) {
        setConfigStatus({
          type: "error",
          message: updateError.message || "Error al guardar la configuración.",
        });
      } else {
        setConfigStatus({
          type: "success",
          message: "¡Configuración de local guardada exitosamente!",
        });
        if (refresh) await refresh();
      }
    } catch (err: any) {
      setConfigStatus({
        type: "error",
        message: err.message || "Ocurrió un error inesperado al guardar.",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleUpgradePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setBillingStatus(null);
    setBillingLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          subscription_plan: selectedPlan,
          status: "active",
          trial_ends_at: null,
        })
        .eq("id", restaurantId);

      if (updateError) {
        setBillingStatus({
          type: "error",
          message: updateError.message || "Error al activar la suscripción.",
        });
      } else {
        setBillingStatus({
          type: "success",
          message: `¡Pago simulado procesado exitosamente! Tu local ahora cuenta con una suscripción activa al plan ${selectedPlan.toUpperCase()}.`,
        });
        setSelectedPlan(null);
        setPaymentData({
          cardNumber: "",
          cardName: "",
          cardExpiry: "",
          cardCvc: "",
        });
        if (refresh) await refresh();
        // Recargar localmente
        const { data: updatedRest } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", restaurantId)
          .single();
        if (updatedRest) setRestaurant(updatedRest);
      }
    } catch (err: any) {
      setBillingStatus({
        type: "error",
        message: err.message || "Ocurrió un error inesperado al procesar el pago.",
      });
    } finally {
      setBillingLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!restaurant) return;

    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `codigo-qr-${restaurant.slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return <Loading text="Cargando configuración..." />;
  }

  if (profile?.role !== "admin" && (error || !restaurant)) {
    return <Alert type="error" message={error || "Restaurante no encontrado"} />;
  }

  const menuUrl = restaurant ? `${window.location.origin}/menu/${restaurant.slug}` : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Configuración</h2>
        <p className="text-text-secondary">
          Administra tu perfil, código QR de menú digital y seguridad
        </p>
      </div>

      {/* QR Code Section */}
      {profile?.role === "admin" ? (
        <Card>
          <div className="flex items-start space-x-3">
            <QrCodeIcon className="w-6 h-6 text-zinc-500" />
            <div>
              <h3 className="text-xl font-bold text-text">Cuenta de Administrador Global</h3>
              <p className="text-text-secondary text-sm mt-1">
                Has iniciado sesión como administrador SaaS global de la plataforma CMOR FLOW. Las configuraciones de local, códigos QR de mesas y menú de clientes no aplican a tu tipo de cuenta.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        restaurant && (
          <Card>
            <div className="flex items-start space-x-3 mb-4">
              <QrCodeIcon className="w-6 h-6 text-accent" />
              <div>
                <h3 className="text-xl font-bold text-text">Código QR del Menú</h3>
                <p className="text-text-secondary text-sm">
                  Tus clientes pueden escanear este código con su teléfono para ver tu menú en tiempo real
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code Display */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-6 rounded-lg shadow-md border border-border">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={menuUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <Button
                  icon={<Download className="w-5 h-5" />}
                  onClick={downloadQRCode}
                  fullWidth
                >
                  Descargar Código QR (PNG)
                </Button>
              </div>

              {/* QR Code Info */}
              <div className="space-y-4">
                <div>
                  <label className="label mb-2">ID del Restaurante</label>
                  <div className="p-3 bg-bg-subtle rounded-lg flex items-center justify-between text-text font-mono text-sm border border-border">
                    <span className="truncate select-all">{restaurant.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-accent hover:text-accent-secondary p-1 rounded hover:bg-bg-subtle transition-colors ml-2"
                      title="Copiar ID"
                    >
                      {copiedId ? (
                        <Check className="w-4 h-4 text-success animate-pulse" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Nombre del Local</label>
                  <div className="p-3 bg-bg-subtle rounded-lg text-text font-medium">
                    {restaurant.name}
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Enlace Directo del Menú</label>
                  <div className="p-3 bg-bg-subtle rounded-lg break-all text-text-secondary text-sm">
                    {menuUrl}
                  </div>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-accent hover:text-accent-secondary mt-2 text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir menú digital</span>
                  </a>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <h4 className="font-semibold text-text mb-2">¿Cómo utilizarlo?:</h4>
                  <ol className="space-y-2 text-text-secondary text-sm">
                    <li>1. Descarga la imagen de tu código QR.</li>
                    <li>2. Imprímelo y colócalo en las mesas, barras o en la entrada de tu local.</li>
                    <li>3. Los comensales lo escanean directamente con la cámara de sus celulares.</li>
                    <li>4. Podrán pedir de forma instantánea sin descargar aplicaciones.</li>
                  </ol>
                </div>

                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <p className="text-success text-sm">
                    ✓ Cualquier cambio en los platos del menú se actualiza al instante.
                  </p>
                  <p className="text-success text-sm">
                    ✓ No requiere descargas ni registros para tus clientes.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )
      )}

      {/* Change Password Card */}
      <Card>
        <div className="flex items-start space-x-3 mb-4">
          <Lock className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Cambiar Contraseña</h3>
            <p className="text-text-secondary text-sm">
              Actualiza la contraseña de tu cuenta para mantener tu acceso seguro
            </p>
          </div>
        </div>

        {passwordStatus && (
          <Alert
            type={passwordStatus.type}
            message={passwordStatus.message}
            className={
              passwordStatus.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
            }
          />
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="Nueva Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
            minLength={6}
          />

          <Input
            label="Confirmar Nueva Contraseña"
            type="password"
            placeholder="Repite la nueva contraseña"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            required
            minLength={6}
          />

          <Button
            type="submit"
            loading={passwordLoading}
            className="bg-red-650 hover:bg-red-750 text-white font-bold border-0 shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            Actualizar Contraseña
          </Button>
        </form>
      </Card>

      {/* Soporte Tecnico (Pro Plan) */}
      <Card>
        <div className="flex items-start space-x-3 mb-4">
          <LifeBuoy className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Soporte Técnico Especializado</h3>
            <p className="text-text-secondary text-sm">
              Tu suscripción incluye soporte de primera línea con el equipo de **CMOR FLOW**.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <a href="mailto:soporte@cmorflow.cl" className="block w-full">
            <Button variant="outline" fullWidth>
              Enviar Email a Soporte
            </Button>
          </a>
          <a href="https://wa.me/56987654321" target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button variant="secondary" fullWidth>
              WhatsApp Soporte (24/7)
            </Button>
          </a>
        </div>
      </Card>

      {/* Configuración de Local */}
      {profile?.role !== "admin" && restaurant && (
        <Card>
          <div className="flex items-start space-x-3 mb-4">
            <Globe className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-xl font-bold text-text">Configuración del Local</h3>
              <p className="text-text-secondary text-sm">
                Ajusta las preferencias de moneda, idioma de la carta y tiempos límites de cocina.
              </p>
            </div>
          </div>

          {configStatus && (
            <Alert
              type={configStatus.type}
              message={configStatus.message}
              className={
                configStatus.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                  : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
              }
            />
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">Moneda Principal</label>
                <select
                  value={configData.currency}
                  onChange={(e) => setConfigData({ ...configData, currency: e.target.value as any })}
                  className="input w-full bg-bg border border-border text-text rounded-lg p-2.5"
                >
                  <option value="CLP">Pesos Chilenos (CLP)</option>
                  <option value="USD">Dólares Americanos (USD)</option>
                </select>
              </div>

              <div>
                <Input
                  label="Tipo de Cambio (1 USD a CLP)"
                  type="number"
                  placeholder="950"
                  value={configData.usdExchangeRate}
                  onChange={(e) => setConfigData({ ...configData, usdExchangeRate: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={configData.currency !== "USD"}
                />
              </div>

              <div>
                <label className="label mb-2">Idioma Predeterminado de la Carta</label>
                <select
                  value={configData.defaultLanguage}
                  onChange={(e) => setConfigData({ ...configData, defaultLanguage: e.target.value as any })}
                  className="input w-full bg-bg border border-border text-text rounded-lg p-2.5"
                >
                  <option value="es">Español (ES)</option>
                  <option value="en">Inglés (EN)</option>
                </select>
              </div>

              <div>
                <Input
                  label="Tiempo Límite de Cocina por Defecto (Minutos)"
                  type="number"
                  placeholder="15"
                  value={configData.defaultPrepTime}
                  onChange={(e) => setConfigData({ ...configData, defaultPrepTime: parseInt(e.target.value) || 0 })}
                  required
                  min={1}
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={configLoading}
              className="bg-accent hover:bg-accent/90 text-white font-bold px-6 border-0 shadow-md transition-all active:scale-[0.98]"
            >
              Guardar Configuración
            </Button>
          </form>
        </Card>
      )}

      {/* Suscripción y Facturación */}
      {profile?.role !== "admin" && restaurant && (
        <Card>
          <div className="flex items-start space-x-3 mb-4">
            <CreditCard className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-xl font-bold text-text">Suscripción y Facturación</h3>
              <p className="text-text-secondary text-sm">
                Gestiona tu plan actual, revisa el estado de tu período de prueba y sube de plan.
              </p>
            </div>
          </div>

          {billingStatus && (
            <Alert
              type={billingStatus.type}
              message={billingStatus.message}
              className={
                billingStatus.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                  : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
              }
            />
          )}

          {/* Estado del plan actual */}
          <div className="p-4 rounded-xl border border-border bg-bg-subtle mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary font-medium">Plan actual:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${
                  restaurant.subscription_plan === "free_trial"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-success/10 text-success border-success/20"
                }`}>
                  {restaurant.subscription_plan === "free_trial" ? "Prueba Gratuita" : restaurant.subscription_plan}
                </span>
              </div>
              {restaurant.subscription_plan === "free_trial" && (
                <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                  <Hourglass className="w-4 h-4 text-amber-500" />
                  <span>
                    Te quedan{" "}
                    <strong className="text-text font-bold">
                      {getTrialDaysLeft(restaurant.trial_ends_at)} días
                    </strong>{" "}
                    de prueba.
                  </span>
                </div>
              )}
            </div>
            
            {restaurant.subscription_plan === "free_trial" && getTrialDaysLeft(restaurant.trial_ends_at) === 0 && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-3 text-error text-xs max-w-md">
                ⚠️ **Prueba Expirada:** Tu período de prueba ha terminado. El POS de ventas y el Menú digital se encuentran bloqueados para pedidos de clientes. Contrata un plan a continuación.
              </div>
            )}
          </div>

          {/* Selector de Planes de Pago */}
          <div className="space-y-4">
            <h4 className="font-semibold text-text text-md">Planes de Suscripción Disponibles:</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  key: "starter",
                  name: "Básico (Starter)",
                  priceCLP: "$19.990 / mes",
                  priceUSD: "$25.00 / mes",
                  features: ["Pedidos ilimitados", "Menú básico", "POS + Código QR", "Soporte por correo"],
                },
                {
                  key: "pro",
                  name: "Pro",
                  priceCLP: "$39.990 / mes",
                  priceUSD: "$49.00 / mes",
                  features: ["Todo del Starter", "CRM de Clientes", "Recomendaciones con IA", "Soporte Premium 24/7"],
                },
                {
                  key: "enterprise",
                  name: "Enterprise",
                  priceCLP: "$79.990 / mes",
                  priceUSD: "$99.00 / mes",
                  features: ["Todo del Pro", "Multi-sucursal", "Facturación integrada", "SLA garantizado"],
                },
              ].map((p) => {
                const isSelected = selectedPlan === p.key;
                const isCurrent = restaurant.subscription_plan === p.key;
                return (
                  <div
                    key={p.key}
                    onClick={() => !isCurrent && setSelectedPlan(p.key)}
                    className={`border-2 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                      isCurrent
                        ? "border-success bg-success/5 cursor-default"
                        : isSelected
                        ? "border-accent bg-accent/5 shadow-md shadow-accent/5"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-text">{p.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-success text-white px-2 py-0.5 rounded-full font-bold">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-extrabold text-accent mb-3">
                        {configData.currency === "USD" ? p.priceUSD : p.priceCLP}
                      </div>
                      <ul className="space-y-1.5 text-xs text-text-secondary">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1">
                            ✓ {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulario de Pago Simulado si hay un plan seleccionado */}
            {selectedPlan && (
              <div className="bg-bg-subtle p-6 rounded-xl border border-border mt-6 space-y-4 max-w-md animate-fadeIn">
                <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <h5 className="font-bold text-text">Pagar con Tarjeta de Crédito/Débito</h5>
                </div>
                <form onSubmit={handleUpgradePlan} className="space-y-3">
                  <Input
                    label="Nombre del Titular"
                    placeholder="Juan Pérez"
                    value={paymentData.cardName}
                    onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value })}
                    required
                  />
                  <Input
                    label="Número de la Tarjeta"
                    placeholder="4111 2222 3333 4444"
                    value={paymentData.cardNumber}
                    onChange={(e) => {
                      // Formatear espaciado de tarjeta
                      const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                      const matches = val.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || "";
                      const parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      setPaymentData({ ...paymentData, cardNumber: parts.length > 0 ? parts.join(" ") : val });
                    }}
                    required
                    maxLength={19}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiración"
                      placeholder="MM/AA"
                      value={paymentData.cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\//g, "").replace(/[^0-9]/gi, "");
                        if (val.length >= 2) {
                          val = val.substring(0, 2) + "/" + val.substring(2, 4);
                        }
                        setPaymentData({ ...paymentData, cardExpiry: val });
                      }}
                      required
                      maxLength={5}
                    />
                    <Input
                      label="CVC"
                      placeholder="123"
                      type="password"
                      value={paymentData.cardCvc}
                      onChange={(e) => setPaymentData({ ...paymentData, cardCvc: e.target.value.replace(/[^0-9]/gi, "") })}
                      required
                      maxLength={4}
                    />
                  </div>
                  <div className="pt-2 flex gap-3">
                    <Button
                      type="submit"
                      loading={billingLoading}
                      className="bg-success hover:bg-success-dark text-white font-bold border-0 shadow-lg active:scale-[0.98]"
                    >
                      Pagar y Activar Suscripción
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlan(null);
                        setPaymentData({ cardNumber: "", cardName: "", cardExpiry: "", cardCvc: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RestaurantSettings;
