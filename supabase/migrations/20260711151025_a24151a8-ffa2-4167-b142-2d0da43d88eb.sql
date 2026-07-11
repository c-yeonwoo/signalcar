CREATE TABLE public.pro_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  source TEXT,
  car_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pro_signups TO authenticated;
GRANT INSERT ON public.pro_signups TO anon;
GRANT ALL ON public.pro_signups TO service_role;

ALTER TABLE public.pro_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pro signup"
  ON public.pro_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own pro signups"
  ON public.pro_signups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX pro_signups_email_idx ON public.pro_signups (email);
CREATE INDEX pro_signups_user_idx ON public.pro_signups (user_id);