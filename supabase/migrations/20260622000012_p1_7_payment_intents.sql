-- =====================================================
-- Fase 2 · P1-7
-- Tabla payment_intents para tracking de pagos Webpay.
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_request_id uuid REFERENCES public.registration_requests(id),
  buy_order text UNIQUE NOT NULL,
  session_id text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  plan text NOT NULL CHECK (plan IN ('starter', 'pro')),
  webpay_token text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'rejected', 'cancelled', 'refunded')),
  provider text NOT NULL DEFAULT 'webpay',
  webpay_response jsonb,
  authorized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Solo admin puede ver todos los payment intents
CREATE POLICY "Admin can read payment_intents" ON public.payment_intents
  FOR SELECT TO authenticated USING (public.is_admin());

-- Anon puede INSERT (crea intent desde el form de registro)
CREATE POLICY "Anon can insert payment_intents" ON public.payment_intents
  FOR INSERT TO anon WITH CHECK (true);

-- Solo service_role (webhook) puede UPDATE
-- (los webhooks usan service_role key, que bypassa RLS)

CREATE INDEX idx_payment_intents_buy_order ON public.payment_intents(buy_order);
CREATE INDEX idx_payment_intents_request ON public.payment_intents(registration_request_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);

COMMIT;
