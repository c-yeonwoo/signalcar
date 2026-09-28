-- Quote documents must never be served through a public bucket.
-- Existing objects remain in place; operations must use the Storage API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quote-docs', 'quote-docs', false, 5242880, ARRAY['image/jpeg', 'image/png']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "quote-docs owner read" ON storage.objects;
DROP POLICY IF EXISTS "quote-docs owner insert" ON storage.objects;
DROP POLICY IF EXISTS "quote-docs owner delete" ON storage.objects;

CREATE POLICY "quote-docs owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quote-docs'
    AND owner_id = (SELECT auth.uid()::text)
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "quote-docs owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quote-docs'
    AND owner_id = (SELECT auth.uid()::text)
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "quote-docs owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quote-docs'
    AND owner_id = (SELECT auth.uid()::text)
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "diagnoses self insert" ON public.quote_diagnoses;
CREATE POLICY "diagnoses self insert" ON public.quote_diagnoses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND result IS NULL
    AND (storage.foldername(doc_path))[1] = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM storage.objects AS obj
      WHERE obj.bucket_id = 'quote-docs'
        AND obj.name = doc_path
        AND obj.owner_id = (SELECT auth.uid()::text)
    )
  );

GRANT DELETE ON public.quote_diagnoses TO authenticated;
DROP POLICY IF EXISTS "diagnoses self delete" ON public.quote_diagnoses;
CREATE POLICY "diagnoses self delete" ON public.quote_diagnoses
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- A submitted report is only a claim. Grant credit after server-side receipt verification.
CREATE OR REPLACE FUNCTION public.grant_unlock_on_deal_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.verification_status = 'receipt_verified' THEN
    INSERT INTO public.report_unlocks (user_id, trim_id, source)
    VALUES (NEW.user_id, NEW.trim_id, 'deal_report')
    ON CONFLICT (user_id, trim_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_unlock_on_deal_report ON public.deal_reports;
CREATE TRIGGER trg_unlock_on_deal_report
  AFTER INSERT OR UPDATE OF verification_status ON public.deal_reports
  FOR EACH ROW EXECUTE FUNCTION public.grant_unlock_on_deal_report();

-- The legacy credit RPC is not atomic and the client used localStorage as authority.
-- Keep it unavailable until SC-017 replaces it with an audited server ledger.
REVOKE EXECUTE ON FUNCTION public.unlock_briefing_with_credit(uuid) FROM PUBLIC, anon, authenticated;
