DROP POLICY "Anyone can insert pro signup" ON public.pro_signups;

CREATE POLICY "Guests insert null user, users insert self"
  ON public.pro_signups FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);