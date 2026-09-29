-- Legacy report_unlocks rows have no payment or verified-report provenance.
-- Preserve them for audit, but they must not authorize a consumer feature.
DROP TRIGGER IF EXISTS trg_unlock_on_deal_report ON public.deal_reports;
DROP FUNCTION IF EXISTS public.grant_unlock_on_deal_report();
DROP FUNCTION IF EXISTS public.unlock_briefing_with_credit(uuid);

REVOKE ALL ON public.report_unlocks FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "unlocks self select" ON public.report_unlocks;

COMMENT ON TABLE public.report_unlocks IS
  'Legacy unlock claims retained for service-role audit only. No consumer entitlement may be inferred from these rows.';
