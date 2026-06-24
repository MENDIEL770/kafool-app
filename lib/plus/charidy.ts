// ============================================================================
// Charidy donations integration (abstraction).
//
// The caller pastes their personal Charidy link; we read who actually donated
// to their team, live. In MVP this SIMULATES a live-growing feed derived from
// the link (no credentials needed). When the real integration lands, replace
// the body of fetchCharidyDonations() with a call to the Charidy public API
// (campaign/team resolved from the link) — the UI does not change.
// ============================================================================

export interface CharidyDonation {
  id: string;
  donor: string;
  amount: number;
  at: string; // ISO
  anonymous?: boolean;
}

export interface CharidyResult {
  ok: boolean;
  campaignTitle?: string;
  total: number;
  count: number;
  goal?: number;
  donations: CharidyDonation[];
  fetchedAt: string;
  error?: string;
}

/**
 * Fetch real donations for a Charidy link via our server proxy
 * (/api/plus/charidy), which resolves the vanity slug → campaign id (and team)
 * and reads the Charidy public API. The UI shape is unchanged.
 */
export async function fetchCharidyDonations(link: string): Promise<CharidyResult> {
  if (!link || !/charidy/i.test(link)) {
    return { ok: false, total: 0, count: 0, donations: [], fetchedAt: new Date().toISOString(),
      error: "הקישור אינו נראה כקישור Charidy תקין" };
  }
  try {
    const res = await fetch(`/api/plus/charidy?link=${encodeURIComponent(link)}`, { cache: "no-store" });
    return (await res.json()) as CharidyResult;
  } catch (e) {
    return { ok: false, total: 0, count: 0, donations: [], fetchedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "שגיאת רשת" };
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "כעת";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}
