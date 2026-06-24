import type { Lead } from "./types";

// ============================================================================
// Dialer abstraction. The caller UI only ever calls initiateCall(lead).
// MVP: opens the device dialer via tel: and records a start timestamp.
// Future (VoIP): swap the body to a Twilio/Yemot session — no UI change,
// and the calls table already has duration_seconds / answered waiting.
// ============================================================================

export type DialMode = "click_to_call" | "voip";

export interface CallSession {
  leadId: string;
  startedAt: number;
  mode: DialMode;
}

export function initiateCall(lead: Lead, mode: DialMode = "click_to_call"): CallSession {
  if (mode === "click_to_call") {
    if (typeof window !== "undefined") {
      // device dialer; call leaves from the caller's own SIM
      window.location.href = `tel:${lead.phone.replace(/[^\d+]/g, "")}`;
    }
  } else {
    // placeholder for VoIP provider integration (outbound + custom Caller ID)
    console.info("[VoIP] would dial", lead.phone);
  }
  return { leadId: lead.id, startedAt: Date.now(), mode };
}
