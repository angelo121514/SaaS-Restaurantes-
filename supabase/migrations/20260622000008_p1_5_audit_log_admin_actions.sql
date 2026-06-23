-- =====================================================
-- Fase 2 · P1-5
-- Audit log automático para RPCs admin.
-- Trigger que inserta en audit_log tras cada acción admin.
-- =====================================================

BEGIN;

-- Helper: log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    actor_id, actor_email, action, table_name, row_id, before_state, after_state, ip
  )
  SELECT
    auth.uid(),
    COALESCE(p.email, ''),
    p_action,
    p_target_type,
    p_target_id,
    p_before,
    p_after,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
  FROM (
    SELECT
      (SELECT email FROM auth.users WHERE id = auth.uid()) AS email
  ) p
  WHERE auth.uid() IS NOT NULL;

  -- Si no hay usuario autenticado (webhook con service_role),
  -- loguear como 'system'
  IF NOT FOUND THEN
    INSERT INTO public.audit_log (
      actor_email, action, table_name, row_id, before_state, after_state, ip
    ) VALUES (
      'system', p_action, p_target_type, p_target_id, p_before, p_after,
      current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated;

-- Modificar RPCs admin existentes para loguear automáticamente
-- admin_toggle_restaurant_status
CREATE OR REPLACE FUNCTION public.admin_toggle_restaurant_status(
  p_restaurant_id uuid,
  p_is_active boolean,
  p_block_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(r) INTO v_before
  FROM public.restaurants r WHERE r.id = p_restaurant_id;

  UPDATE public.restaurants
  SET is_active = p_is_active,
      block_reason = p_block_reason,
      updated_at = now()
  WHERE id = p_restaurant_id;

  PERFORM public.log_admin_action(
    'admin_toggle_restaurant_status',
    'restaurant',
    p_restaurant_id,
    v_before,
    jsonb_build_object('is_active', p_is_active, 'block_reason', p_block_reason)
  );

  RETURN TRUE;
END;
$$;

-- admin_reject_request
CREATE OR REPLACE FUNCTION public.admin_reject_request(
  p_request_id uuid,
  p_rejection_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(r) INTO v_before
  FROM public.registration_requests r WHERE r.id = p_request_id;

  UPDATE public.registration_requests
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      contacted_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_admin_action(
    'admin_reject_request',
    'registration_request',
    p_request_id,
    v_before,
    jsonb_build_object('status', 'rejected', 'rejection_reason', p_rejection_reason)
  );

  RETURN TRUE;
END;
$$;

-- Re-grant (necesario tras CREATE OR REPLACE)
-- Nota: tras P0-1, estas funciones ya NO son accesibles a anon.
-- Solo admin puede llamarlas (vía is_admin() check).
GRANT EXECUTE ON FUNCTION public.admin_toggle_restaurant_status(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_request(uuid, text) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────
-- Las funciones se restauran a su versión anterior (sin is_admin check y sin log)
-- desde un backup previo a esta migración.
