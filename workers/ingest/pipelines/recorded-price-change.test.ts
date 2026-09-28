import { expect, test } from "bun:test";
import { recordedPriceChangeFor, type MockCar } from "../../../src/lib/mock-cars";

test("does not infer price movement from an unverified or single record", () => {
  const unverified = recordedPriceChangeFor({ history: [4000, 3900], priceEvidence: "unverified" } as MockCar);
  const single = recordedPriceChangeFor({ history: [3900], priceEvidence: "verified_contract" } as MockCar);
  expect(unverified.comparable).toBe(false);
  expect(single.comparable).toBe(false);
  expect(unverified.headline).not.toContain("이번주");
});

test("compares only the last two verified records without claiming a week or promotion update", () => {
  const change = recordedPriceChangeFor({
    history: [4200, 4100, 4000],
    priceEvidence: "verified_contract",
    promoThisMonth: { label: "큰 할인", amount: 2_000_000, note: "" },
    promoPercentile: 90,
  } as MockCar);
  expect(change).toMatchObject({ comparable: true, direction: "down", priceDelta: -100 });
  expect(change.headline).toContain("이전 기록 대비");
  expect(change.headline).not.toContain("갱신");
});
