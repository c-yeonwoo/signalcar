import { describe, expect, test } from "bun:test";
import { buildVerifiedPriceSignalRows } from "./aggregate-signals";

const computedAt = "2026-09-29T00:00:00.000Z";
const trimId = "22222222-2222-2222-2222-222222220001";

describe("verified price signal aggregation", () => {
  test("excludes unverified, flagged, invalid and out-of-month reports", () => {
    const rows = buildVerifiedPriceSignalRows(
      [
        { trim_id: trimId, contract_price: 40_000_000, contract_month: "2026-09-05", verification_status: "receipt_verified" },
        { trim_id: trimId, contract_price: 42_000_000, contract_month: "2026-09-20", verification_status: "receipt_verified" },
        { trim_id: trimId, contract_price: 10_000_000, contract_month: "2026-09-10", verification_status: "unverified" },
        { trim_id: trimId, contract_price: 20_000_000, contract_month: "2026-09-11", verification_status: "flagged" },
        { trim_id: trimId, contract_price: 0, contract_month: "2026-09-12", verification_status: "receipt_verified" },
        { trim_id: trimId, contract_price: 30_000_000, contract_month: "2026-13-01", verification_status: "receipt_verified" },
      ],
      computedAt,
    );

    expect(rows).toEqual([
      {
        trim_id: trimId,
        month: "2026-09-01",
        median_deal_price: 41_000_000,
        sample_size: 2,
        promo_percentile: null,
        timing_verdict: "neutral",
        evidence_kind: "verified_contract",
        computed_at: computedAt,
      },
    ]);
  });

  test("keeps each trim and month in a separate cohort", () => {
    const otherTrim = "22222222-2222-2222-2222-222222220002";
    const rows = buildVerifiedPriceSignalRows(
      [
        { trim_id: trimId, contract_price: 40_000_000, contract_month: "2026-08-03", verification_status: "receipt_verified" },
        { trim_id: trimId, contract_price: 42_000_000, contract_month: "2026-09-03", verification_status: "receipt_verified" },
        { trim_id: otherTrim, contract_price: 45_000_000, contract_month: "2026-09-03", verification_status: "receipt_verified" },
      ],
      computedAt,
    );

    expect(rows).toHaveLength(3);
    expect(rows.map(({ trim_id, month, sample_size }) => [trim_id, month, sample_size])).toEqual([
      [trimId, "2026-08-01", 1],
      [trimId, "2026-09-01", 1],
      [otherTrim, "2026-09-01", 1],
    ]);
  });
});
