import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink, LifeBuoy, Copy, Check } from "lucide-react";
import { Card, Button, Loading, Alert } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";
import { useRestaurantId } from "../../hooks/useAuth";

const RestaurantSettings: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

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

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
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
  }, [restaurantId]);

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

  if (error || !restaurant) {
    return <Alert type="error" message={error || "Restaurante no encontrado"} />;
  }

  const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Configuración</h2>
        <p className="text-text-secondary">
          Administra el código QR de tu menú digital y accesos
        </p>
      </div>

      {/* QR Code Section */}
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

      {/* Additional Settings Placeholder */}
      <Card className="bg-bg-subtle">
        <h3 className="text-lg font-bold text-text mb-3">
          Configuración Adicional (Próximamente)
        </h3>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li>• Editar perfil comercial y horarios de atención</li>
          <li>• Subir logotipo de la tienda y portada personalizada</li>
          <li>• Cambiar colores de marca en la carta de clientes</li>
          <li>• Ajustar porcentaje de propina sugerida e impuestos locales</li>
          <li>• Habilitar/deshabilitar pagos en línea integrados</li>
          <li>• Cambiar contraseña y opciones de seguridad de la cuenta</li>
        </ul>
      </Card>
    </div>
  );
};

export default RestaurantSettings;
