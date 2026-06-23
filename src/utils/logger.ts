/**
 * Logger estructurado — Fase 0 Setup
 * Reemplaza console.log/error en producción.
 * En desarrollo, usa console normal.
 * En producción, envía a Sentry sin PII.
 */
import { Sentry } from "../instrumentation";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// PII a redactar en logs
const PII_KEYS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "authorization",
  "email",
  "phone",
  "customer_name",
  "customer_phone",
];

function redactPii(context: LogContext): LogContext {
  const redacted: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (PII_KEYS.some((pii) => key.toLowerCase().includes(pii.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactPii(value as LogContext);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const redactedContext = context ? redactPii(context) : undefined;
  if (redactedContext && Object.keys(redactedContext).length > 0) {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(redactedContext)}`;
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.log(formatMessage("info", message, context));
    }
    // En prod, no enviar info a Sentry (mucho ruido)
  },

  warn(message: string, context?: LogContext): void {
    if (isDev) {
      console.warn(formatMessage("warn", message, context));
    }
    if (isProd) {
      Sentry.captureMessage(message, {
        level: "warning",
        extra: context ? redactPii(context) : undefined,
      });
    }
  },

  error(message: string, context?: LogContext, error?: Error): void {
    if (isDev) {
      console.error(formatMessage("error", message, context), error);
    }
    if (isProd) {
      Sentry.captureException(error || new Error(message), {
        extra: context ? redactPii(context) : undefined,
      });
    }
  },

  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.debug(formatMessage("debug", message, context));
    }
    // Debug nunca se envía a Sentry en prod
  },
};
