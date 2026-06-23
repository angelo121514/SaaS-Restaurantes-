/**
 * Sentry initialization — Fase 0 Setup
 * Importar ANTES que App.tsx en src/main.tsx
 *
 * Captura errores frontend con redacción de PII.
 * Release tracking activado para asociar errores a deploys.
 */
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// No inicializar Sentry si no hay DSN (modo dev sin monitoreo)
if (SENTRY_DSN && SENTRY_DSN.startsWith("https://")) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `cmor-flow@${APP_VERSION}`,
    // 10% de transacciones para performance monitoring
    tracesSampleRate: 0.1,
    // Capturar sesiones con errores para replays
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Redactar texto de inputs y textareas
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Redactar PII antes de enviar
    beforeSend(event) {
      // Redactar Authorization header
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[REDACTED]";
      }
      // Redactar cookies
      if (event.request?.cookies) {
        event.request.cookies = { redacted: "[REDACTED]" } as any;
      }
      // Redactar query params que puedan contener tokens
      if (event.request?.query_string) {
        event.request.query_string = String(event.request.query_string)
          .replace(/token=[^&]*/gi, "token=[REDACTED]")
          .replace(/access_token=[^&]*/gi, "access_token=[REDACTED]");
      }
      // Redactar emails en breadcrumbs (muy común filtrar PII aquí)
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.message) {
            crumb.message = crumb.message.replace(
              /[\w.+-]+@[\w-]+\.[\w.-]+/g,
              "[email redacted]"
            );
          }
          return crumb;
        });
      }
      return event;
    },
    // Ignorar errores conocidos que no aportan valor
    ignoreErrors: [
      // Extensiones de navegador
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      // Network errors que el usuario ya ve
      "Network request failed",
      "Failed to fetch",
      // Cancelaciones de fetch
      "AbortError",
    ],
  });
}

export { Sentry };
