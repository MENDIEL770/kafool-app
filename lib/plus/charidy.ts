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

// ---- deterministic helpers (so a given link yields a stable base feed) ------
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const DONOR_NAMES = [
  "משפחת כהן", "אנונימי", "דוד לוי", "משפחת פרידמן", "רחל מ.", "יוסי ב.",
  "משפחת אזולאי", "אנונימי", "ש. רוזנברג", "תורם יקר", "משפחת דהן", "א. שפירא",
  "נדבן", "משפחת ביטון", "מ. גולדשטיין", "אנונימי",
];
const AMOUNTS = [36, 52, 100, 180, 360, 500, 720, 1000, 1800];

// module-level "live" growth per link — each refresh may add a new donation,
// so repeated refreshes feel live. Resets on full page reload (demo only).
const liveGrowth = new Map<string, CharidyDonation[]>();

function baseFeed(link: string): CharidyDonation[] {
  const seed = hash(link || "anon");
  const count = 4 + (seed % 7); // 4–10 base donations
  const out: CharidyDonation[] = [];
  for (let i = 0; i < count; i++) {
    const r = hash(`${link}:${i}`);
    out.push({
      id: `base-${seed}-${i}`,
      donor: DONOR_NAMES[r % DONOR_NAMES.length],
      amount: AMOUNTS[r % AMOUNTS.length],
      at: new Date(Date.now() - (count - i) * 3600_000).toISOString(),
      anonymous: DONOR_NAMES[r % DONOR_NAMES.length] === "אנונימי",
    });
  }
  return out;
}

/**
 * Fetch donations for a Charidy link. `simulateNew` (default true) lets a manual
 * refresh occasionally surface a brand-new donation, mimicking a live feed.
 */
export async function fetchCharidyDonations(link: string, simulateNew = true): Promise<CharidyResult> {
  // network latency feel
  await new Promise((r) => setTimeout(r, 450));

  if (!link || !/charidy/i.test(link)) {
    return {
      ok: false,
      total: 0,
      count: 0,
      donations: [],
      fetchedAt: new Date().toISOString(),
      error: "הקישור אינו נראה כקישור Charidy תקין",
    };
  }

  const base = baseFeed(link);
  const grown = liveGrowth.get(link) ?? [];

  // ~55% chance a refresh brings a fresh donation
  if (simulateNew && Math.random() < 0.55) {
    const r = hash(`${link}:${Date.now()}`);
    grown.push({
      id: `live-${Date.now()}`,
      donor: DONOR_NAMES[r % DONOR_NAMES.length],
      amount: AMOUNTS[r % AMOUNTS.length],
      at: new Date().toISOString(),
      anonymous: DONOR_NAMES[r % DONOR_NAMES.length] === "אנונימי",
    });
    liveGrowth.set(link, grown);
  }

  const donations = [...base, ...grown].sort((a, b) => b.at.localeCompare(a.at));
  const total = donations.reduce((s, d) => s + d.amount, 0);

  return {
    ok: true,
    campaignTitle: "Charidy",
    total,
    count: donations.length,
    donations,
    fetchedAt: new Date().toISOString(),
  };
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
