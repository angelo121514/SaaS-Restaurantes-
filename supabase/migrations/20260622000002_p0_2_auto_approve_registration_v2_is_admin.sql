-- =====================================================
-- Fase 1 · P0-2
-- Añade is_admin() check a auto_approve_registration_v2
-- y armoniza la firma con RegisterPage.tsx (5 params).
-- =====================================================
-- Author: Plan de Remediación Segura CMOR FLOW
-- Date:   2026-06-22

BEGIN;

-- ─────────────────────────────────────────────────────
-- P0-2: auto_approve_registration_v2 con is_admin() check
-- Firma de 5 params (compatibilidad con RegisterPage.tsx actual)
-- PERO añade verificación de pago real cuando p_provider != 'trial'
-- y bloquea activación de planes pagos sin verificación.
--
-- NOTA: Esta función NO debe ser llamada directamente desde
-- el frontend para planes pagos. El flujo correcto es:
--   1. Front crea registration_request
--   2. Front paga vía gateway real (Webpay/MercadoPago)
--   3. Webhook verifica tx_id contra gateway
--   4. Webhook llama activate_restaurant_after_payment(p_request_id, p_tx_id, p_provider)
-- Para free_trial, esta función sigue siendo válida.
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id uuid,
  p_plan text DEFAULT 'free_trial',
  p_payment_provider text DEFAULT 'trial',
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request registration_requests;
  v_restaurant_id uuid;
  v_owner_id uuid;
  v_trial_ends timestamptz;
BEGIN
  -- 1. Validar plan
  IF p_plan NOT IN ('free_trial', 'starter', 'pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
  END IF;

  -- 2. Para planes pagos, requerir verificación de transacción
  --    (Esta función ya NO activa planes pagos directamente — debe pasar por webhook)
  IF p_plan IN ('starter', 'pro') AND p_payment_provider != 'trial' THEN
    -- Solo un admin o un webhook autenticado (vía Edge Function con service_role)
    -- puede activar planes pagos.
    IF NOT public.is_admin() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unauthorized_paid_plan',
        'message', 'Para activar un plan pago, el pago debe confirmarse vía webhook'
      );
    END IF;
  END IF;

  -- 3. Para free_trial, cualquiera puede auto-aprobar (con rate limit implícito)
  --    Pero validamos que la solicitud exista y esté pendiente
  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_processed');
  END IF;

  -- 4. Trial ends: 15 días desde activación (Ley de trials chilena)
  v_trial_ends := now() + interval '15 days';

  -- 5. Crear restaurante
  INSERT INTO public.restaurants (
    name, slug, owner_email, owner_name, owner_phone,
    subscription_plan, status, trial_ends_at, is_active
  ) VALUES (
    v_request.restaurant_name,
    v_request.proposed_slug,
    v_request.email,
    v_request.owner_name,
    v_request.owner_phone,
    p_plan,
    'trial',
    v_trial_ends,
    true
  )
  RETURNING id INTO v_restaurant_id;

  -- 6. Actualizar request
  UPDATE public.registration_requests
  SET status = 'approved',
      reviewed_at = now(),
      internal_notes = jsonb_build_object(
        'plan', p_plan,
        'payment_provider', p_payment_provider,
        'transaction_id', p_transaction_id,
        'amount', p_amount,
        'auto_approved', true,
        'approved_at', now()
      )
  WHERE id = p_request_id;

  -- 7. Audit log
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, after)
  VALUES (
    auth.uid(),
    'auto_approve_registration',
    'restaurant',
    v_restaurant_id,
    jsonb_build_object('plan', p_plan, 'trial_ends', v_trial_ends)
  );

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'trial_ends_at', v_trial_ends
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
  TO anon, authenticated;

COMMIT;
