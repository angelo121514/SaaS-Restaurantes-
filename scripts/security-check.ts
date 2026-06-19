// =====================================================================
// scripts/security-check.ts
// ---------------------------------------------------------------------
// Validaciones operacionales de seguridad (spec §4.5):
//   1. RLS habilitada en todas las tablas con datos personales.
//   2. Ningun SECURITY DEFINER sin chequeo is_admin() (escanea pg_proc).
//   3. .env no commiteado (no aparece en `git ls-files`).
//   4. admin_users sin grants a anon/authenticated (post-deprecation).
//
// Requiere:
//   - Node con soporte ESM (package.json "type":"module" ya configurado).
//   - @supabase/supabase-js instalado en node_modules.
//   - Variables de entorno:
//       SUPABASE_URL=https://xxxx.supabase.co
//       SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// Uso:  npm run security-check
// Salida: 0 si todas pasan, 1 si alguna falla.
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Faltan variables de entorno. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
  );
  console.error(
    "En PowerShell: $env:SUPABASE_URL='...'; $env:SUPABASE_SERVICE_ROLE_KEY='...'; npm run security-check"
  );
  console.error(
    "En bash: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run security-check"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CheckResult = { name: string; passed: boolean; detail: string };

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

const TABLES_WITH_PERSONAL_DATA: string[] = [
  "consents",
  "audit_log",
  "data_subject_requests",
  "breach_register",
  "profiles",
  "restaurants",
  "orders",
  "restaurant_customers",
  "invitations",
  "registration_requests",
  "notifications",
];

async function checkRlsEnabled() {
  const { data, error } = await supabase.rpc("security_check_rls_status");
  if (error) {
    record(
      "RLS habilitada",
      false,
      `No se pudo consultar RLS via RPC 'security_check_rls_status': ${error.message}. Crea la RPC (ver Step 2) o ajusta el nombre en el script.`
    );
    return;
  }
  const rows = (data || []) as { table_name: string; rls_enabled: boolean }[];
  const sinRls = TABLES_WITH_PERSONAL_DATA.filter((t) => {
    const row = rows.find((r) => r.table_name === t);
    return !row || row.rls_enabled !== true;
  });
  if (sinRls.length === 0) {
    record(
      "RLS habilitada",
      true,
      `Las ${TABLES_WITH_PERSONAL_DATA.length} tablas con datos personales tienen RLS activa.`
    );
  } else {
    record(
      "RLS habilitada",
      false,
      `Tablas sin RLS o no encontradas: ${sinRls.join(", ")}`
    );
  }
}

async function checkSecurityDefiner() {
  const { data, error } = await supabase.rpc("security_check_security_definer");
  if (error) {
    record(
      "SECURITY DEFINER sin is_admin()",
      false,
      `No se pudo consultar via RPC 'security_check_security_definer': ${error.message}.`
    );
    return;
  }
  const offenders = (data || []) as { proname: string }[];
  if (offenders.length === 0) {
    record(
      "SECURITY DEFINER sin is_admin()",
      true,
      "Toda funcion SECURITY DEFINER incluye chequeo is_admin() o es interna segura."
    );
  } else {
    record(
      "SECURITY DEFINER sin is_admin()",
      false,
      `Funciones potencialmente inseguras: ${offenders
        .map((o) => o.proname)
        .join(", ")}`
    );
  }
}

function checkEnvNotCommitted() {
  try {
    const out = execSync("git ls-files", {
      cwd: "C:/Users/angel/Desktop/Code/SaaS suchi",
      encoding: "utf8",
    });
    const tracked = out.split(/\r?\n/);
    const envFiles = tracked.filter((f) => f && f.endsWith(".env"));
    if (envFiles.length === 0) {
      record(
        ".env no commiteado",
        true,
        "Ningun archivo .env aparece en `git ls-files`."
      );
    } else {
      record(
        ".env no commiteado",
        false,
        `Archivos .env commiteados: ${envFiles.join(", ")}`
      );
    }
  } catch (e) {
    record(
      ".env no commiteado",
      false,
      `No se pudo ejecutar 'git ls-files': ${String(e)}`
    );
  }
}

async function checkAdminUsersGrants() {
  const { data, error } = await supabase.rpc("security_check_admin_users_grants");
  if (error) {
    record(
      "admin_users sin grants anon/auth",
      false,
      `No se pudo consultar via RPC 'security_check_admin_users_grants': ${error.message}.`
    );
    return;
  }
  const row = (data || [{}])[0] as {
    anon_select?: boolean;
    auth_select?: boolean;
  };
  const anonOk = row.anon_select === false;
  const authOk = row.auth_select === false;
  if (anonOk && authOk) {
    record(
      "admin_users sin grants anon/auth",
      true,
      "admin_users no concede SELECT a anon ni a authenticated (D9 OK)."
    );
  } else {
    record(
      "admin_users sin grants anon/auth",
      false,
      `admin_users concede SELECT a anon=${row.anon_select}, authenticated=${row.auth_select}. Aplica database/06_password_deprecation.sql.`
    );
  }
}

async function main() {
  console.log("== security-check — Cmor Flow ==");
  console.log(`Endpoint: ${SUPABASE_URL}`);
  console.log("");
  await checkRlsEnabled();
  await checkSecurityDefiner();
  checkEnvNotCommitted();
  await checkAdminUsersGrants();

  console.log("");
  for (const r of results) {
    const tag = r.passed ? "PASS" : "FAIL";
    console.log(`[${tag}] ${r.name}`);
    console.log(`        ${r.detail}`);
  }
  console.log("");
  const failed = results.filter((r) => !r.passed).length;
  if (failed === 0) {
    console.log(
      `Resultado: TODAS LAS VALIDACIONES PASARON (${results.length}/${results.length}).`
    );
    process.exit(0);
  } else {
    console.log(
      `Resultado: ${failed} validacion(es) fallaron de ${results.length}.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error inesperado en security-check:", err);
  process.exit(1);
});
