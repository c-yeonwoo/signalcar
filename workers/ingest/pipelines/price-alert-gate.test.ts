import { expect, test } from "bun:test";
import { buildSignalAlerts } from "./signal-alerts";
import { sendPendingAlerts } from "./send-alerts";

test("price alert queues and delivery stay paused without explicit enablement", async () => {
  const before = {
    flag: process.env.SIGNALCAR_PRICE_ALERTS_ENABLED,
    url: process.env.SUPABASE_URL,
    viteUrl: process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  try {
    delete process.env.SIGNALCAR_PRICE_ALERTS_ENABLED;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await buildSignalAlerts({ dryRun: false })).toMatchObject({ queued: 0, inserted: 0, outPath: "" });
    expect(await sendPendingAlerts({ dryRun: false, weekly: true })).toMatchObject({
      pending: 0, weeklyQueued: 0, sent: 0, outPath: "",
    });
  } finally {
    for (const [key, value] of [
      ["SIGNALCAR_PRICE_ALERTS_ENABLED", before.flag],
      ["SUPABASE_URL", before.url],
      ["VITE_SUPABASE_URL", before.viteUrl],
      ["SUPABASE_SERVICE_ROLE_KEY", before.key],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
