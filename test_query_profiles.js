import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env file manually
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfiles() {
  console.log("Consultando perfiles públicos existentes en la base de datos...");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name");
  
  if (error) {
    console.log("❌ Error al consultar perfiles:", error.message);
  } else {
    console.log("\n👥 Perfiles encontrados en la base de datos:");
    console.table(data);
  }
}

inspectProfiles();
