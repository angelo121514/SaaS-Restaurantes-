import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { Card, Badge } from "../../components/ui";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-bg-subtle">
        <div className="container-custom h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-text">
            CMOR FLOW
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-accent">
              Volver al inicio
            </Link>
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/");
                }
              }}
              className="p-1 rounded-full text-text-secondary hover:text-text hover:bg-bg/20 transition-all"
              aria-label="Cerrar"
              title="Cerrar y volver"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="container-custom py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-text">
            Términos y Condiciones
          </h1>
        </div>
        <Badge variant="accent-secondary">
          Versión {CURRENT_POLICY_VERSION}
        </Badge>

        <p className="text-sm text-text-secondary mt-2 italic">
          &gt; DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.
        </p>

        <Card className="p-6 mt-6 space-y-6 text-text">
          <section className="space-y-4">
            <p className="text-text-secondary">
              Estos Términos regulan el uso de la plataforma SaaS de pedidos para restaurantes proporcionada por Cmor Flow e incorporan, en su Anexo A, el acuerdo de tratamiento de datos personales (DPA cliente) que define la relación entre el restaurante (responsable de los datos de sus clientes finales) y Cmor Flow (encargado).
            </p>
          </section>

          <section className="border-t border-border pt-4">
            <h2 className="text-xl font-bold mb-4 text-accent">Parte I — Términos del Servicio</h2>
            <div className="space-y-4 text-text-secondary">
              <div>
                <h3 className="font-semibold text-text">1. Objeto</h3>
                <p>Cmor Flow pone a disposición del restaurante una plataforma SaaS de pedidos para restaurantes (carta digital por QR, panel de administración, POS, CRM y reportes), alojada en Vercel y Supabase, accesible mediante navegador web.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">2. Aceptación</h3>
                <p>Al registrarse, el restaurante declara tener capacidad legal para contratar y aceptar estos Términos y el Anexo A (DPA cliente). Si el restaurante no acepta algún término, no debe usar la plataforma.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">3. Obligaciones del restaurante</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Proporcionar información veraz en el registro y mantenerla actualizada.</li>
                  <li>Ser responsable del tratamiento de los datos personales de sus clientes finales, conforme a la Ley N° 19.628 y la Ley N° 21.719.</li>
                  <li>Utilizar la plataforma conforme a la ley y a estos Términos; en particular, no cargar contenido ilícito ni datos personales que no tenga derecho a tratar.</li>
                  <li>Mantener la confidencialidad de sus credenciales y activar los mecanismos de autenticación de varios factores (MFA) cuando Cmor Flow lo exija para roles admin y owner.</li>
                  <li>Responder por las instrucciones que entregue a Cmor Flow como encargado.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-text">4. Obligaciones de Cmor Flow</h3>
                <p>Prestar el servicio con niveles razonables de disponibilidad y soporte. Tratar los datos del restaurante y de sus clientes finales como encargado, únicamente según las instrucciones del restaurante y el Anexo A. Mantener las medidas de seguridad técnicas y organizativas descritas en el Anexo A.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">5. Tarifas y facturación</h3>
                <p>Las tarifas, modalidades de cobro y condiciones económicas se rigen por el acuerdo comercial suscrito entre las partes. En ausencia de acuerdo comercial específico, el registro en la plataforma no genera obligación de pago hasta la contratación efectiva de un plan.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">6. Propiedad intelectual</h3>
                <p>Cmor Flow conserva los derechos sobre la plataforma, su código y sus marcas. El restaurante conserva la propiedad de los datos que carga y de los contenidos propios (carta, logos).</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">7. Suspensión y término</h3>
                <p>Cmor Flow puede suspender el acceso ante incumplimiento grave de estos Términos o por razones de seguridad, previa comunicación salvo urgencia. El restaurante puede terminar el servicio en cualquier momento. A la terminación, los datos se conservan o suprimen conforme al Anexo A.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">8. Limitación de responsabilidad</h3>
                <p>Salvo dolo o culpa grave, la responsabilidad de Cmor Flow por el servicio se limita, en conjunto, a las tarifas facturadas en los 12 meses anteriores al hecho generador. No se responde por lucro cesante indirecto.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">9. Modificaciones</h3>
                <p>Cmor Flow puede modificar estos Términos; los cambios sustantivos se comunican con antelación razonable y exigen nueva aceptación. La versión vigente se publica en docs/legal/VERSION.md.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">10. Ley aplicable</h3>
                <p>Estos Términos se rigen por el derecho chileno. Las partes se someten a los tribunales de Santiago de Chile, sin perjuicio de las acciones que pudieran ejercerse ante la autoridad competente en protección de datos.</p>
              </div>
            </div>
          </section>

          <section className="border-t border-border pt-4">
            <h2 className="text-xl font-bold mb-4 text-accent">Anexo A — DPA Cliente (Cláusulas de Tratamiento)</h2>
            <div className="space-y-4 text-text-secondary">
              <div>
                <h3 className="font-semibold text-text">A.1 Objeto y roles</h3>
                <p>El Encargado trata datos personales por cuenta del Responsable, en su calidad de proveedor de la plataforma. El Responsable determina las finalidades y medios del tratamiento respecto de los datos de clientes finales; el Encargado los trata únicamente según las instrucciones documentadas del Responsable.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.2 Finalidad</h3>
                <p>El tratamiento por parte del Encargado se limita a la prestación del servicio contratado (gestión de pedidos, CRM del restaurante, reportes) y a las finalidades derivadas de la Ley N° 19.628 y la Ley N° 21.719.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.3 Duración</h3>
                <p>Por el tiempo que dure el servicio contratado y, posteriormente, por los plazos de conservación exigidos por ley (p. ej., el registro tributario del SII) o hasta la devolución/borrado previsto en A.10.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.4 Instrucciones del Responsable</h3>
                <p>El Encargado documentará y seguirá las instrucciones del Responsable. Las instrucciones que pudieran violar la Ley N° 19.628 o la Ley N° 21.719 se comunican al Responsable para su aclaración antes de ejecutarse.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.5 Confidencialidad</h3>
                <p>El personal del Encargado con acceso a datos personales está sujeto a obligaciones de confidencialidad, con acceso basado en el principio de menor privilegio.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.6 Medidas de seguridad</h3>
                <p>El Encargado mantiene medidas técnicas y organizativas apropiadas: cifrado en tránsito (TLS 1.2+) y en reposo (AES-256), control de acceso basado en roles (RLS), autenticación multifactor para roles privilegiados, registro de auditoría inmutable y revisiones periódicas (scripts/security-check.ts).</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.7 Subencargados</h3>
                <p>El Encargado autoriza a Vercel y Supabase como subencargados, ubicados en Estados Unidos, bajo Cláusulas Contractuales Tipo (SCC). La lista vigente se mantiene en docs/contratos/DPA_proveedores.md.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.8 Transferencias internacionales</h3>
                <p>Las transferencias a Estados Unidos se documentan y mitigan conforme a docs/privacidad/transferencias_internacionales.md.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.9 Notificación de brechas (72 horas)</h3>
                <p>El Encargado notifica al Responsable cualquier brecha de seguridad que afecte a los datos personales del Responsable sin demora indebida y, en todo caso, dentro de las 72 horas siguientes a su detección, proporcionando la información necesaria para que el Responsable cumpla sus propias obligaciones de notificación.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.10 Devolución y borrado</h3>
                <p>A la terminación del servicio, el Encargado devuelve o suprime los datos personales del Responsable, salvo obligación legal de conservación (p. ej., SII). Los backups se gestionan conforme al principio de expiración natural (7-30 días) y los campos personales afectados por una supresión se anonimizan.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.11 Derechos de los titulares</h3>
                <p>El Encargado asiste al Responsable, en la medida de lo posible, en la atención de las solicitudes de los titulares (art. 19 Ley N° 19.628), poniendo a disposición los mecanismos técnicos para el ejercicio de los derechos (Edge Functions privacy/*).</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.12 Auditoría</h3>
                <p>El Responsable puede auditar el cumplimiento del Encargado una vez al año, previa notificación razonable. La auditoría se realizará sin interrumpir el servicio y se apoya en los reportes de seguridad y los registros de auditoría que el Encargado mantiene.</p>
              </div>
              <div>
                <h3 className="font-semibold text-text">A.13 Responsabilidad</h3>
                <p>Cada parte responde por el incumplimiento de sus obligaciones bajo este Anexo. La responsabilidad del Encargado se rige por la limitación del Apartado 8 de la Parte I, salvo dolo o culpa grave.</p>
              </div>
            </div>
          </section>
        </Card>
      </div>
    </div>
  );
};

export default TermsPage;
