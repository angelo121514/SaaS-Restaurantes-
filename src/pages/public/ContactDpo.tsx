import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { Button, Card, Input, Textarea, Alert } from "../../components/ui";
import { contactDpo } from "../../services/privacyService";
import { DPO_EMAIL } from "../../config/supabase";

const ContactDpoPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setResult(null);
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido." });
      return;
    }
    if (!message.trim()) {
      setResult({ success: false, message: "El mensaje es obligatorio." });
      return;
    }

    setLoading(true);
    const res = await contactDpo(email, message, name);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? "Tu mensaje fue enviado al DPO. Responderemos en un máximo de 30 días."
        : res.error || "Error al enviar.",
    });
    if (res.success) {
      setName("");
      setEmail("");
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-accent">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">Contacto DPO</h1>
        </div>
        <p className="text-text-secondary">
          Delegado de Protección de Datos:{" "}
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="text-accent underline"
          >
            {DPO_EMAIL}
          </a>
        </p>

        <Card className="p-6 mt-6 space-y-4">
          <Input
            label="Nombre (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Textarea
            label="Mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
          {result && (
            <Alert
              type={result.success ? "success" : "error"}
              message={result.message}
            />
          )}
          <Button
            onClick={handleSubmit}
            loading={loading}
            icon={<Send className="w-4 h-4" />}
          >
            Enviar mensaje
          </Button>
        </Card>

        <p className="text-xs text-text-secondary mt-4">
          SLA de respuesta: 30 días máximo.
        </p>
      </div>
    </div>
  );
};

export default ContactDpoPage;
