-- Migration: Add missing `expires_at` column to `payment_sessions`.
--
-- The application code (GET /api/payments/session/:id and the webhook) reads
-- `expires_at` to determine QR validity. If the table already existed before
-- the schema was applied, this column is missing. Run this in the Supabase
-- SQL editor to add the column idempotently.

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- For completeness, ensure the other callback-related columns exist too.
ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS gateway_signature TEXT;
