import { supabase } from "../config/supabase";
import type {
  Consent,
  ConsentScope,
  DataSubjectRequest,
  DsarType,
} from "../config/supabase";
import { CURRENT_POLICY_VERSION } from "../config/supabase";

// --------------------------------------------------------------------
// Helpers de invocación a Edge Functions (privacy/*)
// Cada función devuelve { success, data, error, message }.
// --------------------------------------------------------------------

interface InvokeResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

async function invokePrivacy<T = unknown>(
  fn: string,
  body: Record<string, unknown>
): Promise<InvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      return {
        success: false,
        data: null,
        error: error.message,
        message: null,
      };
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    return {
      success: payload.success !== false,
      data: (payload.data ?? payload) as T,
      error: (payload.error as string) ?? null,
      message: (payload.message as string) ?? null,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: String(err),
      message: null,
    };
  }
}

// --------------------------------------------------------------------
// DSAR — los 6 derechos del titular
// --------------------------------------------------------------------

export const requestAccess = (email: string) =>
  invokePrivacy("privacy-access", { email, type: "access" });

export const requestRectify = (
  email: string,
  payload: { fields: { field: string; current: string; correct: string }[] }
) => invokePrivacy("privacy-rectify", { email, type: "rectify", payload });

export const requestErase = (email: string) =>
  invokePrivacy("privacy-erase", { email, type: "erase" });

export const requestObject = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-object", {
    email,
    type: "object",
    payload: { scope },
  });

export const requestExport = (email: string) =>
  invokePrivacy<{ json: unknown; csv: string }>("privacy-export", {
    email,
    type: "export",
  });

export const requestRevokeConsent = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-revoke-consent", {
    email,
    type: "revoke-consent",
    payload: { scope },
  });

// --------------------------------------------------------------------
// Contacto DPO (graba en data_subject_requests con type='contact')
// --------------------------------------------------------------------

export const contactDpo = async (
  email: string,
  message: string,
  name?: string
): Promise<InvokeResult> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .insert([
      {
        request_type: "contact",
        subject_email: email,
        status: "pending",
        sla_due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payload: { name: name ?? null, message },
      },
    ])
    .select("id")
    .single();

  if (error) {
    return { success: false, data: null, error: error.message, message: null };
  }
  return {
    success: true,
    data: data as unknown,
    error: null,
    message: "Mensaje enviado al DPO.",
  };
};

// --------------------------------------------------------------------
// Consulta de estado (RLS: el titular ve solo los suyos)
// --------------------------------------------------------------------

export const listMyDsars = async (email: string): Promise<DataSubjectRequest[]> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listMyDsars error:", error);
    return [];
  }
  return (data ?? []) as unknown as DataSubjectRequest[];
};

export const listAllDsars = async (): Promise<DataSubjectRequest[]> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAllDsars error:", error);
    return [];
  }
  return (data ?? []) as unknown as DataSubjectRequest[];
};

export const updateDsarStatus = async (
  dsarId: string,
  status: DataSubjectRequest["status"],
  notes?: { rejection_reason?: string; result_metadata?: Record<string, unknown> }
): Promise<boolean> => {
  const update: Record<string, unknown> = {
    status,
    fulfilled_at: ["fulfilled", "rejected", "cancelled"].includes(status)
      ? new Date().toISOString()
      : null,
  };
  if (notes?.rejection_reason) update.rejection_reason = notes.rejection_reason;
  if (notes?.result_metadata) update.result_metadata = notes.result_metadata;

  const { error } = await supabase
    .from("data_subject_requests")
    .update(update)
    .eq("id", dsarId);
  return !error;
};

// --------------------------------------------------------------------
// Consentimientos
// --------------------------------------------------------------------

export const getMyConsents = async (email: string): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

export const grantConsent = async (params: {
  subjectId: string | null;
  subjectEmail: string;
  scope: ConsentScope;
  purpose: string;
  legalBasis: Consent["legal_basis"];
  granted: boolean;
  via: NonNullable<NonNullable<Consent["proof"]>["via"]>;
}): Promise<boolean> => {
  const { error } = await supabase.from("consents").insert([
    {
      subject_id: params.subjectId,
      subject_email: params.subjectEmail,
      scope: params.scope,
      purpose: params.purpose,
      legal_basis: params.legalBasis,
      granted: params.granted,
      granted_at: params.granted ? new Date().toISOString() : null,
      privacy_policy_version: CURRENT_POLICY_VERSION,
      proof: {
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        via: params.via,
        policy_version: CURRENT_POLICY_VERSION,
      },
    },
  ]);
  return !error;
};

export const revokeConsentScope = async (
  email: string,
  scope: ConsentScope
): Promise<boolean> => {
  const { error } = await supabase
    .from("consents")
    .update({ granted: false, revoked_at: new Date().toISOString() })
    .eq("subject_email", email)
    .eq("scope", scope)
    .eq("granted", true);
  return !error;
};

export const listAllConsents = async (): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listAllConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

// --------------------------------------------------------------------
// Utilidad: ¿el titular ya tiene algún consentimiento registrado?
// (para decidir si mostrar el modal de primer login)
// --------------------------------------------------------------------

export const hasAnyConsent = async (email: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("consents")
    .select("*", { count: "exact", head: true })
    .eq("subject_email", email);
  if (error) return false;
  return (count ?? 0) > 0;
};

// `DsarType` se re-exporta implícitamente desde el import para que los
// consumidores (DsarForm) puedan importarlo desde config/supabase.
export type { DsarType };
