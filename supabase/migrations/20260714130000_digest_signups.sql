-- Weekly signal digest email waitlist (send pipeline = Sprint K)
CREATE TABLE IF NOT EXISTS public.digest_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

GRANT INSERT ON public.digest_signups TO anon, authenticated;
GRANT SELECT ON public.digest_signups TO authenticated;
GRANT ALL ON public.digest_signups TO service_role;

ALTER TABLE public.digest_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "digest insert" ON public.digest_signups;
CREATE POLICY "digest insert" ON public.digest_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "digest self select" ON public.digest_signups;
CREATE POLICY "digest self select" ON public.digest_signups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS digest_signups_email_idx ON public.digest_signups (email);
