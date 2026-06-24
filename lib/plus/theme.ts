import type { CampaignBranding } from "./types";

// ============================================================================
// Theme = data. We inject branding as CSS custom properties on the root,
// so a single variable change re-skins every component (powers live preview).
// ============================================================================

export function brandingToCssVars(b: Partial<CampaignBranding>): Record<string, string> {
  const dark = b.background_style === "dark";
  return {
    "--primary": b.primary_color ?? "#1e3a8a",
    "--secondary": b.secondary_color ?? "#3b82f6",
    "--accent": b.accent_color ?? "#f59e0b",
    "--bg": dark ? "#0f172a" : "#f8fafc",
    "--surface": dark ? "#1e293b" : "#ffffff",
    "--text": dark ? "#f1f5f9" : "#0f172a",
    "--muted": dark ? "#94a3b8" : "#64748b",
    "--border": dark ? "#334155" : "#e2e8f0",
  };
}

export function cssVarStyle(b: Partial<CampaignBranding>): React.CSSProperties {
  return brandingToCssVars(b) as React.CSSProperties;
}
