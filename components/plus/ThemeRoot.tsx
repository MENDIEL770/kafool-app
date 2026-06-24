"use client";

import { useStore } from "@/lib/plus/store";
import { cssVarStyle } from "@/lib/plus/theme";
import type { CampaignBranding } from "@/lib/plus/types";

/**
 * Applies the active campaign's branding as CSS variables.
 * Pass `override` for the Branding Studio live preview (unsaved values).
 */
export default function ThemeRoot({
  children,
  campaignId,
  override,
  className = "",
}: {
  children: React.ReactNode;
  campaignId?: string | null;
  override?: Partial<CampaignBranding>;
  className?: string;
}) {
  const branding = useStore((s) => s.branding);
  const campaigns = useStore((s) => s.campaigns);

  // resolve branding: explicit campaign → its parent → first available
  let b: Partial<CampaignBranding> | undefined;
  if (campaignId) {
    b = branding.find((x) => x.campaign_id === campaignId);
    if (!b) {
      const camp = campaigns.find((c) => c.id === campaignId);
      if (camp?.parent_campaign_id) b = branding.find((x) => x.campaign_id === camp.parent_campaign_id);
    }
  }
  if (!b) b = branding[0];
  const merged = { ...b, ...override };

  return (
    <div style={cssVarStyle(merged)} className={`min-h-screen themed-transition ${className}`}>
      {children}
    </div>
  );
}
