# P1-3 · 2FA TOTP — Configuración

## Cómo activar 2FA para admins y owners Pro

### Paso 1: Activar MFA en Supabase Dashboard

1. Ve a https://supabase.com/dashboard/project/clsgoknzyhkxtogxoshz
2. **Authentication** → **Settings** → **MFA**
3. Activar **TOTP MFA**
4. Guardar

### Paso 2: Forzar MFA para admins (opcional, recomendado)

En el SQL Editor:

```sql
-- Crear policy que requiere MFA para admins
-- (Supabase Auth maneja esto vía app_metadata)

-- Marcar usuarios admin como requeridos de MFA
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{mfa_required}',
  'true'
)
WHERE raw_app_meta_data->>'role' = 'admin';
```

### Paso 3: UI de activación

Crear componente `MFASetup.tsx` que use `mfaService.ts`:

```tsx
import { useState } from "react";
import { enrollMFA, verifyMFA } from "../services/mfaService";

export const MFASetup = () => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);

  const handleEnroll = async () => {
    const result = await enrollMFA();
    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
      setSecret(result.secret || "");
      // factorId se obtiene de listMFAFactors después del enroll
      const { totp } = await listMFAFactors();
      setFactorId(totp[0]?.id || "");
    }
  };

  const handleVerify = async () => {
    const result = await verifyMFA(factorId, code);
    if (result.success) {
      setVerified(true);
      alert("2FA activado correctamente");
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      {!qrCode && <button onClick={handleEnroll}>Activar 2FA</button>}
      {qrCode && !verified && (
        <>
          <img src={qrCode} alt="QR Code" />
          <p>Secret: {secret}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            maxLength={6}
          />
          <button onClick={handleVerify}>Verificar</button>
        </>
      )}
      {verified && <p>✅ 2FA activo</p>}
    </div>
  );
};
```

### Paso 4: Login flow con MFA

Modificar `LoginPage.tsx` para detectar MFA required:

```tsx
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error?.message.includes("MFA")) {
  // Mostrar input de código TOTP
  setShowMFAInput(true);
}
```

### Paso 5: Generar backup codes

Tras verificar MFA, generar 10 códigos de un solo uso:

```sql
-- Función para generar backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(p_user_id uuid)
RETURNS text[] AS $$
DECLARE
  v_codes text[] := ARRAY[]::text[];
  v_code text;
BEGIN
  FOR i IN 1..10 LOOP
    v_code := substr(encode(gen_random_bytes(6), 'hex'), 1, 8);
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  INSERT INTO user_backup_codes (user_id, codes, used_codes)
  VALUES (p_user_id, v_codes, ARRAY[]::text[])
  ON CONFLICT (user_id) DO UPDATE SET codes = v_codes, used_codes = ARRAY[]::text[];

  RETURN v_codes;
END;
$$ LANGUAGE plpgsql;
```

### Recomendaciones

- **Admins:** 2FA OBLIGATORIO desde el día 1
- **Owners Pro:** 2FA opcional pero recomendado (badge "Cuenta segura" en perfil)
- **Owners Free / Staff:** 2FA no disponible (mejorar UX antes)
- **Backup codes:** generar 10, mostrar UNA vez, pedir guardar offline
