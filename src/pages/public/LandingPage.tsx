import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  QrCode,
  Smartphone,
  TrendingUp,
  Clock,
  Check,
  Menu as MenuIcon,
  X,
  Sparkles,
  Award,
  ChevronRight,
  Utensils
} from "lucide-react";
import { Button } from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { ThemeToggle } from "../../components/ThemeToggle";

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-red-600 selection:text-white relative overflow-x-hidden transition-colors duration-200">
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-24 left-10 w-80 h-80 bg-red-600/5 rounded-full filter blur-[80px] pointer-events-none -z-10" />

      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-bg/90 backdrop-blur-md z-50 transition-colors duration-200">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <CmorFlowLogo size="sm" showText={true} layout="row" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <a
                href="#features"
                className="text-text-secondary hover:text-red-500 transition-colors text-sm font-medium"
              >
                Características
              </a>
              <a
                href="#pricing"
                className="text-text-secondary hover:text-red-500 transition-colors text-sm font-medium"
              >
                Precios
              </a>
              <a
                href="#how-it-works"
                className="text-text-secondary hover:text-red-500 transition-colors text-sm font-medium"
              >
                Cómo Funciona
              </a>
              <ThemeToggle />
              <Link
                to="/login"
                className="text-text-secondary hover:text-red-500 transition-colors text-sm font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-0">Comenzar</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t border-border bg-bg px-2">
              <a
                href="#features"
                className="block py-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Características
              </a>
              <a
                href="#pricing"
                className="block py-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Precios
              </a>
              <a
                href="#how-it-works"
                className="block py-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Cómo Funciona
              </a>
              <Link
                to="/login"
                className="block py-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Iniciar Sesión
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth className="bg-red-600 hover:bg-red-700 text-white border-0">Comenzar</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-28">
        <div className="container-custom">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                La Revolución Digital Gastronómica
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-text leading-tight tracking-tight">
                Digitaliza tu Menú de <span className="text-red-500">Sushi</span> & Restaurantes en Minutos
              </h1>
              <p className="text-base sm:text-lg text-text-secondary max-w-xl">
                Crea una experiencia premium para tus comensales mediante menús digitales autogestionables y pedidos por códigos QR directos a la cocina. Reduce tiempos de espera y eleva tus ventas de forma inmediata.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link to="/register">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white border-0 px-8 flex items-center gap-2 font-bold shadow-lg shadow-red-600/20">
                    Iniciar Prueba Gratis 15 Días
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-border text-text-secondary hover:bg-bg-subtle hover:text-text px-8 font-semibold">
                    Ver Cómo Funciona
                  </Button>
                </a>
              </div>

              {/* Stats / Trust Badges */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border max-w-lg">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text">50+</div>
                  <div className="text-xs text-text-secondary font-medium mt-1">Locales Activos</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text">10k+</div>
                  <div className="text-xs text-text-secondary font-medium mt-1">Pedidos Procesados</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text">4.9/5</div>
                  <div className="text-xs text-text-secondary font-medium mt-1">Soporte VIP</div>
                </div>
              </div>
            </div>

            {/* Right Column Image Mockup */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-[400px] aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-bg-subtle p-3 shadow-2xl shadow-red-500/5 group">
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent z-10 opacity-70" />
                <img
                  src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1000&q=80"
                  alt="Premium Sushi Digital Menu"
                  // Hero image is above the fold — keep it eager, but hint the
                  // browser to prioritize it and reserve space (less CLS).
                  fetchPriority="high"
                  width={1000}
                  height={1250}
                  className="w-full h-full object-cover rounded-xl transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Floating QR Badge */}
                <div className="absolute top-8 right-8 bg-bg/90 backdrop-blur-md border border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xl z-20 animate-bounce">
                  <div className="p-2 bg-red-600/10 rounded-lg text-red-500">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black">Menú Escaneable</p>
                    <p className="text-xs font-bold text-text">Prueba en Mesa 04</p>
                  </div>
                </div>

                {/* Floating Order Completed Badge */}
                <div className="absolute bottom-12 left-8 right-8 bg-bg/95 backdrop-blur-md border border-border p-4 rounded-xl flex items-center justify-between shadow-xl z-20">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-500">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">Orden Recibida</p>
                      <p className="text-xs font-extrabold text-text">1x Combo Roll Premium</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-red-500">$18.900</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-y border-border bg-bg-subtle transition-colors duration-200">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight">
              Todo lo que necesitas para tu Local Gastronómico
            </h2>
            <p className="text-base text-text-secondary">
              Un sistema completo y ágil diseñado para optimizar las operaciones de sushi bars, restaurantes modernos y cafeterías.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: QrCode,
                title: "Pedidos por Código QR",
                description:
                  "Tus clientes escanean el código QR en la mesa para ver el menú y pedir al instante sin descargar apps.",
                color: "text-red-500 bg-red-500/10 border-red-500/20"
              },
              {
                icon: Smartphone,
                title: "Diseño Mobile-First Premium",
                description:
                  "Una interfaz ultra-rápida, atractiva y amigable que resalta las fotos de tus platos favoritos.",
                color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
              },
              {
                icon: TrendingUp,
                title: "Control en Tiempo Real",
                description:
                  "Recibe notificaciones automáticas de pedidos y modifica la disponibilidad del menú al instante.",
                color: "text-red-500 bg-red-500/10 border-red-500/20"
              },
              {
                icon: Clock,
                title: "Optimización del Servicio",
                description:
                  "Ahorra tiempo en la atención de mesas y agiliza la entrega de comandas directo a la cocina.",
                color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
              },
            ].map((feature, index) => (
              <div key={index} className="bg-bg/40 border border-border p-6 rounded-xl hover:border-zinc-500 transition-all duration-300 group flex flex-col items-center text-center">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 border ${feature.color} transition-transform group-hover:scale-110`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2 group-hover:text-red-500 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight">
              Planes Simples y Transparentes
            </h2>
            <p className="text-base text-text-secondary">
              Comienza hoy mismo con una prueba completamente gratuita por 15 días. Sin tarjetas obligatorias.
            </p>
          </div>

          {/* Monthly / Annual Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-14">
            <span className={`text-sm font-semibold transition-colors ${billingPeriod === "monthly" ? "text-red-500" : "text-text-secondary"}`}>
              Facturación Mensual
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
              className="relative w-14 h-8 bg-zinc-800 dark:bg-zinc-800 border border-border rounded-full transition-colors focus:outline-none p-1 flex items-center"
              aria-label="Alternar ciclo de facturación"
            >
              <div className={`w-6 h-6 rounded-full transition-all duration-300 transform ${billingPeriod === "annual" ? "translate-x-6 bg-amber-500" : "translate-x-0 bg-red-500"}`} />
            </button>
            <span className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${billingPeriod === "annual" ? "text-amber-500" : "text-text-secondary"}`}>
              Facturación Anual
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Ahorra 15%
              </span>
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {Object.entries(APP_CONFIG.plans).map(([key, plan]) => {
              const isStarter = key === "starter";
              const isPro = key === "pro";
              const isFree = key === "free_trial";

              // Calculate price based on selected billingPeriod
              let displayPrice = plan.price;
              let subText = plan.duration;
              let yearlyTotalLabel = "";

              if (billingPeriod === "annual" && plan.price_annual !== undefined) {
                displayPrice = plan.price_annual / 12; // Show monthly equivalent
                yearlyTotalLabel = `Facturado anualmente: $${plan.price_annual.toLocaleString("es-CL")}`;
                subText = "al mes equivalentemente";
              }

              return (
                <div
                  key={key}
                  className={`bg-bg-subtle/60 border rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-[1.02] relative ${
                    isStarter
                      ? "border-red-500 ring-1 ring-red-500/50 shadow-xl shadow-red-500/5 bg-bg/80 hover:shadow-2xl hover:shadow-red-500/15"
                      : isPro
                      ? "border-border bg-bg/40 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/15"
                      : "border-border bg-bg/40 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/15"
                  }`}
                >
                  {isStarter && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                      Recomendado
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-black text-text uppercase tracking-wider mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mt-4">
                        <span className="text-4xl font-extrabold text-text">
                          {APP_CONFIG.defaultCurrency}
                          {displayPrice.toLocaleString("es-CL")}
                        </span>
                        {displayPrice > 0 && (
                          <span className="text-xs text-text-secondary font-medium">
                            /{subText}
                          </span>
                        )}
                      </div>
                      
                      {yearlyTotalLabel && (
                        <p className="text-xs text-amber-500 font-semibold mt-2">
                          {yearlyTotalLabel}
                        </p>
                      )}

                      {isFree && (
                        <p className="text-xs text-red-400 font-medium mt-2">
                          Acceso total por {plan.duration}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 pt-6 border-t border-border">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isStarter ? "text-red-500" : "text-emerald-500"}`} />
                          <span className="text-sm text-text-secondary text-left leading-normal">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8 mt-auto">
                    <Link to="/register">
                      <Button
                        variant={isStarter ? "primary" : "outline"}
                        fullWidth
                        className={`font-bold transition-all ${
                          isStarter
                            ? "bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/10"
                            : "border-border text-text hover:bg-bg-subtle hover:text-text"
                        }`}
                      >
                        {isFree ? "Iniciar Demo Gratis" : "Adquirir Plan"}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 border-t border-border bg-bg-subtle transition-colors duration-200">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight">
              Digitaliza tu Local en 3 Simples Pasos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Registra tu Negocio",
                description:
                  "Completa el formulario en un minuto. Tu cuenta se activará con una prueba Pro gratuita de 15 días automáticamente.",
              },
              {
                step: "02",
                title: "Carga tus Platos",
                description:
                  "Sube tus sushi rolls, platos de fondo, precios y fotos arrastrándolas directamente desde tu computadora en segundos.",
              },
              {
                step: "03",
                title: "Imprime y Recibe Pedidos",
                description:
                  "Genera los códigos QR autoinstalables, ponlos en tus mesas y deja que tus comensales envíen órdenes en directo.",
              },
            ].map((item, index) => (
              <div key={index} className="bg-bg/20 border border-border p-8 rounded-xl text-center relative group hover:border-zinc-500 transition-colors">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-red-600 text-white text-lg font-black flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-text mt-4 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-3xl p-8 md:p-14 text-center text-white relative overflow-hidden shadow-xl shadow-red-950/20">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              ¿Listo para subir el nivel de tu carta?
            </h2>
            <p className="text-base md:text-lg mb-8 text-red-100 max-w-2xl mx-auto font-medium">
              Obtén acceso completo por 15 días. Automatiza la toma de pedidos, fideliza clientes con el CRM Pro y optimiza costos.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-red-700 border-0 hover:bg-red-50 hover:text-red-700 px-8 py-3.5 font-bold shadow-lg"
              >
                Comenzar Gratis Ahora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-bg-subtle transition-colors duration-200">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="flex flex-col items-start space-y-4">
              <Link to="/">
                <CmorFlowLogo size="sm" showText={true} layout="row" />
              </Link>
              <p className="text-sm text-text-secondary leading-relaxed">
                Gestión digital inteligente de pedidos para la gastronomía moderna chilena.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-text text-sm uppercase tracking-wider mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#features" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Cómo Funciona
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text text-sm uppercase tracking-wider mb-4">Empresa</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Soporte Técnico
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text text-sm uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/legal/terminos" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link to="/legal/privacidad" className="text-sm text-text-secondary hover:text-red-500 transition-colors">
                    Política de Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-xs text-text-secondary">
            © {new Date().getFullYear()} CMOR FLOW. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
