import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import CryptoJS from "crypto-js";

// Database types
export interface RegistrationRequest {
  id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  restaurant_type: string;
  heard_from?: string;
  notes?: string;
  status: "pending" | "contacted" | "verified" | "rejected";
  contacted_at?: string;
  rejection_reason?: string;
  internal_notes?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  registration_request_id?: string;
  name: string;
  slug: string;
  owner_name?: string;
  phone: string;
  email: string;
  city?: string;
  address?: string;
  restaurant_type?: string;
  logo_url?: string;
  qr_code_url?: string;
  subscription_plan: "free_trial" | "starter" | "pro" | "enterprise";
  status: "active" | "blocked" | "trial";
  is_active: boolean;
  internal_notes?: string;
  block_reason?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
  currency?: "CLP" | "USD";
  usd_exchange_rate?: number;
  default_language?: "es" | "en";
  default_prep_time?: number;
}

export interface User {
  id: string;
  restaurant_id?: string;
  email: string;
  password_hash: string;
  temp_password: boolean;
  role: "owner" | "staff";
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  base_price: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  sizes?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  created_at: string;
  image_urls?: string[];
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  order_number: string;
  order_type: "qr" | "counter" | "phone" | "table";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "rejected";
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  customer_notes?: string;
  internal_notes?: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  base_price: number;
  selected_size?: { name: string; price: number };
  selected_addons?: { name: string; price: number }[];
  item_total: number;
  special_instructions?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
}

// --------------------------------------------------------------------
// Privacidad (Ley 19.628 / Ley 21.719) — Capa 2
// --------------------------------------------------------------------

export type ConsentScope =
  | "cookies"
  | "marketing"
  | "ai_profiling"
  | "analytics"
  | "third_party_share";

export type ConsentLegalBasis =
  | "consent"
  | "contract"
  | "legal_obligation"
  | "legitimate_interest";

/** Fila de public.consents (Capa 1, 03_privacy_consents.sql). */
export interface Consent {
  id: string;
  subject_id: string | null;
  subject_email: string;
  scope: ConsentScope;
  purpose: string;
  legal_basis: ConsentLegalBasis;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  proof: {
    ip?: string;
    user_agent?: string;
    via?: "cookie_banner" | "first_login_modal" | "dsar" | "account_panel";
    policy_version?: string;
  } | null;
  privacy_policy_version: string;
  created_at: string;
}

export type DsarType =
  | "access"
  | "rectify"
  | "erase"
  | "object"
  | "export"
  | "revoke-consent"
  | "contact";

export type DsarStatus =
  | "pending"
  | "verified"
  | "in_progress"
  | "fulfilled"
  | "rejected"
  | "cancelled";

/** Fila de public.data_subject_requests (Capa 1, 07_data_subject_requests.sql). */
export interface DataSubjectRequest {
  id: string;
  request_type: DsarType;
  subject_id: string | null;
  subject_email: string;
  verification_token: string;
  token_expires_at: string;
  status: DsarStatus;
  payload: Record<string, unknown> | null;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  result_metadata: Record<string, unknown> | null;
  rejection_reason: string | null;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
}

/** Versión vigente de la política de privacidad (docs/legal/VERSION.md). */
export const CURRENT_POLICY_VERSION = "2026-06-01";

/** Email de contacto del DPO (placeholder editable). */
export const DPO_EMAIL = "dpo@cmorflow.cl";

// Export real Supabase client (Mock mode is completely disabled)
const isMockMode = false;

const activeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const supabase = activeClient;
