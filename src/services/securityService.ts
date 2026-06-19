// src/services/securityService.ts
// Servicio para la UI admin de seguridad (/admin/security).
// Lee breach_register y agrega anomalias del audit_log.
// Sigue el patron de adminService.ts (funciones nombradas, supabase desde config).

import { supabase } from "../config/supabase";

export type BreachSeverity = "low" | "medium" | "high" | "critical";
export type BreachStatus =
  | "detected"
  | "investigating"
  | "contained"
  | "notified"
  | "closed";

export interface BreachRecord {
  id: string;
  detected_at: string;
  reported_at: string | null;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  affected_data_categories: string[] | null;
  affected_subjects_count: number | null;
  containment_measures: string | null;
  root_cause: string | null;
  authority_notified_at: string | null;
  subjects_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnomalyResult {
  key: string;
  label: string;
  count: number;
  window_hours: number;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function listBreaches(filters?: {
  severity?: BreachSeverity | "all";
  status?: BreachStatus | "all";
}): Promise<ServiceResult<BreachRecord[]>> {
  let query = supabase
    .from("breach_register")
    .select("*")
    .order("detected_at", { ascending: false });

  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data || []) as BreachRecord[], error: null };
}

export async function createBreach(input: {
  severity: BreachSeverity;
  description: string;
  affected_data_categories?: string[];
  affected_subjects_count?: number | null;
  containment_measures?: string | null;
}): Promise<ServiceResult<BreachRecord>> {
  const { data, error } = await supabase
    .from("breach_register")
    .insert({
      severity: input.severity,
      status: "detected",
      description: input.description,
      affected_data_categories: input.affected_data_categories ?? null,
      affected_subjects_count: input.affected_subjects_count ?? null,
      containment_measures: input.containment_measures ?? null,
    })
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as BreachRecord, error: null };
}

export async function updateBreach(
  id: string,
  patch: Partial<
    Pick<
      BreachRecord,
      | "status"
      | "containment_measures"
      | "root_cause"
      | "authority_notified_at"
      | "subjects_notified_at"
      | "reported_at"
    >
  >
): Promise<ServiceResult<BreachRecord>> {
  const { data, error } = await supabase
    .from("breach_register")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as BreachRecord, error: null };
}

const ANOMALY_QUERIES: {
  key: string;
  label: string;
  window_hours: number;
  actions: string[];
  threshold: number;
}[] = [
  { key: "failed_logins", label: "Logins fallidos (> 10 en 1h)", window_hours: 1, actions: ["login_failed", "auth_failed"], threshold: 10 },
  { key: "massive_exports", label: "Exportaciones de datos (> 5 en 24h)", window_hours: 24, actions: ["export_data"], threshold: 5 },
  { key: "rls_denials", label: "Rechazos de RLS (> 20 en 1h)", window_hours: 1, actions: ["rls_denied"], threshold: 20 },
  { key: "security_events", label: "Eventos de seguridad (24h)", window_hours: 24, actions: ["security_event", "breach_detected"], threshold: 1 },
];

export async function listAnomalies(): Promise<ServiceResult<AnomalyResult[]>> {
  const now = new Date();
  const results: AnomalyResult[] = [];

  for (const q of ANOMALY_QUERIES) {
    const since = new Date(
      now.getTime() - q.window_hours * 60 * 60 * 1000
    ).toISOString();
    const { count, error } = await supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .in("action", q.actions)
      .gte("created_at", since);
    if (error) {
      results.push({ key: q.key, label: q.label, count: 0, window_hours: q.window_hours });
      continue;
    }
    results.push({ key: q.key, label: q.label, count: count || 0, window_hours: q.window_hours });
  }

  return { data: results, error: null };
}

export async function listRecentAuditEvents(limit = 100): Promise<
  ServiceResult<
    {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[]
  >
> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, table_name, created_at, ip")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: error.message };
  return {
    data: (data || []) as {
      id: number;
      actor_email: string | null;
      action: string;
      table_name: string | null;
      created_at: string;
      ip: string | null;
    }[],
    error: null,
  };
}

export function severityToBadgeVariant(
  s: BreachSeverity
): "success" | "warning" | "error" | "neutral" {
  switch (s) {
    case "low":
      return "neutral";
    case "medium":
      return "warning";
    case "high":
    case "critical":
      return "error";
    default:
      return "neutral";
  }
}
