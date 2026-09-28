-- Price-based email products are paused until their evidence and opt-out flow are reviewed.
-- Keep existing rows for a separate retention decision; stop new public submissions.
REVOKE INSERT ON public.pro_signups FROM anon, authenticated;
DROP POLICY IF EXISTS "Guests insert null user, users insert self" ON public.pro_signups;
DROP POLICY IF EXISTS "Anyone can insert pro signup" ON public.pro_signups;

REVOKE INSERT ON public.digest_signups FROM anon, authenticated;
DROP POLICY IF EXISTS "digest insert" ON public.digest_signups;

-- The previous OR user_id IS NULL predicate exposed all guest email addresses
-- to every authenticated user. Only the account owner may read their row.
DROP POLICY IF EXISTS "digest self select" ON public.digest_signups;
CREATE POLICY "digest self select" ON public.digest_signups
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
