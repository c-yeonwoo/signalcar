import { supabase } from "@/integrations/supabase/client";
import { BRAIN_VERSION } from "./version";
import type { OutcomeEventInput } from "./types";

const SESSION_KEY = "sc.session.v1";

function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** best-effort outcome 로깅 — 실패해도 UI에 영향 없음 */
export async function logOutcome(input: OutcomeEventInput): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sessionId = input.sessionId ?? getOrCreateSessionId();
    await supabase.from("outcome_events").insert({
      user_id: user?.id ?? null,
      session_id: sessionId,
      event_type: input.eventType,
      trim_id: input.trimId ?? null,
      car_slug: input.carSlug ?? null,
      payload: (input.payload ?? {}) as import("@/integrations/supabase/types").Json,
      brain_version: BRAIN_VERSION,
    });
  } catch {
    /* silent */
  }
}
