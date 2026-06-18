-- Migration: Create restaurant_customers table and link to orders
CREATE TABLE IF NOT EXISTS restaurant_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);

-- Enable RLS for restaurant_customers
ALTER TABLE restaurant_customers ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for restaurant owners and staff
DROP POLICY IF EXISTS "Restaurant staff can manage customers" ON restaurant_customers;
CREATE POLICY "Restaurant staff can manage customers" ON restaurant_customers
  FOR ALL USING (public.is_my_restaurant(restaurant_id)) WITH CHECK (public.is_my_restaurant(restaurant_id));

-- Link orders to customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES restaurant_customers(id) ON DELETE SET NULL;
