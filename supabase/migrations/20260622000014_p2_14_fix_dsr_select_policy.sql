-- =====================================================
-- Fix DSR Select Self Policy
-- Resolves 'permission denied for table users' when
-- inserting/selecting from data_subject_requests as anon/authenticated.
-- =====================================================

BEGIN;

DROP POLICY IF EXISTS dsr_select_self ON public.data_subject_requests;

CREATE POLICY dsr_select_self ON public.data_subject_requests
  FOR SELECT USING (
    subject_id = auth.uid()
    OR subject_email = coalesce(auth.jwt() ->> 'email', '')
  );

COMMIT;
