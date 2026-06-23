-- =====================================================
-- Force MFA for Admin Users
-- Optional recommendation from P1-3 (2FA Setup)
-- =====================================================

BEGIN;

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{mfa_required}',
  'true'
)
WHERE raw_app_meta_data->>'role' = 'admin';

COMMIT;
