// =====================================================================
// Helper MFA / 2FA TOTP — P1-3
// Usa Supabase Auth MFA nativo (TOTP RFC 6238).
// =====================================================================
// Flujo:
//   1. Usuario activa MFA → llama enroll()
//   2. Supabase retorna QR code + secret
//   3. Usuario escanea con Google Authenticator / 1Password / etc.
//   4. Usuario ingresa código de 6 dígitos → llama verify()
//   5. Supabase marca MFA activo
//   6. En próximos logins, frontend detecta MFA required → pide código
// =====================================================================

import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

export interface MFAEnrollResult {
  success: boolean;
  qrCode?: string;  // data URL para mostrar en <img src={qrCode}>
  secret?: string;   // para mostrar como texto (backup)
  backupCodes?: string[]; // códigos de un solo uso
  error?: string;
}

export interface MFAVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Inicia el enrolamiento MFA TOTP para el usuario autenticado.
 * Retorna QR code y secret.
 */
export const enrollMFA = async (): Promise<MFAEnrollResult> => {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "CMOR FLOW",
      friendlyName: "CMOR FLOW",
    });

    if (error) {
      logger.error("MFA enroll error", { message: error.message });
      return { success: false, error: error.message };
    }

    // data.totp contiene: qr_code, secret, uri
    const totp = (data as any)?.totp;
    if (!totp?.qr_code) {
      return { success: false, error: "No se pudo generar QR code" };
    }

    return {
      success: true,
      qrCode: totp.qr_code,  // data:image/svg+xml;base64,...
      secret: totp.secret,
    };
  } catch (err: any) {
    logger.error("MFA enroll exception", { message: err.message });
    return { success: false, error: "Error al activar 2FA" };
  }
};

/**
 * Verifica el código TOTP de 6 dígitos para completar el enrolamiento.
 */
export const verifyMFA = async (factorId: string, code: string): Promise<MFAVerifyResult> => {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const challengeId = (data as any)?.id;
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (verifyError) {
      return { success: false, error: "Código inválido. Intenta de nuevo." };
    }

    return { success: true };
  } catch (err: any) {
    logger.error("MFA verify exception", { message: err.message });
    return { success: false, error: "Error al verificar código" };
  }
};

/**
 * Desactiva MFA para el usuario autenticado.
 * Requiere código TOTP actual.
 */
export const unenrollMFA = async (factorId: string): Promise<MFAVerifyResult> => {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    logger.error("MFA unenroll exception", { message: err.message });
    return { success: false, error: "Error al desactivar 2FA" };
  }
};

/**
 * Lista los factores MFA del usuario autenticado.
 */
export const listMFAFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    return { totp: [] as any[], error: error.message };
  }
  return { totp: (data?.totp || []) as any[], error: null };
};

/**
 * Verifica si el usuario actual tiene MFA activo.
 * Útil para mostrar badge "2FA activo" en el perfil.
 */
export const hasMFAEnabled = async (): Promise<boolean> => {
  const { totp } = await listMFAFactors();
  return totp.some((f: any) => f.status === "verified");
};

/**
 * Flujo de login con MFA:
 * 1. Usuario hace signInWithPassword
 * 2. Si requiere MFA, Supabase retorna error mfa_required
 * 3. Frontend pide código TOTP
 * 4. Llama a challenge + verify
 */
export const completeMFALogin = async (
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: (challengeData as any).id,
      code,
    });

    if (verifyError) {
      return { success: false, error: "Código TOTP inválido" };
    }

    return { success: true };
  } catch (err: any) {
    logger.error("MFA login exception", { message: err.message });
    return { success: false, error: "Error en verificación MFA" };
  }
};
