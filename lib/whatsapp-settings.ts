import type { SupabaseClient } from '@supabase/supabase-js'

// Platform-wide WhatsApp add-on settings, editable by the super-admin and stored
// in page_content (page='whatsapp_settings'): the daily price shown to managers
// and how many idle days before an unused instance is auto-deleted.
export interface WhatsappSettings { dailyRate: number; idleDeleteDays: number; featureEnabled: boolean }

export async function getWhatsappSettings(supabase: SupabaseClient): Promise<WhatsappSettings> {
  const fallback: WhatsappSettings = {
    dailyRate: Number(process.env.WHATSAPP_DAILY_RATE) || 20,
    idleDeleteDays: 3,
    featureEnabled: true, // launched by default
  }
  try {
    const { data } = await supabase.from('page_content').select('key, value').eq('page', 'whatsapp_settings')
    const map = new Map((data || []).map(r => [r.key as string, r.value as string]))
    return {
      dailyRate: Number(map.get('daily_rate')) || fallback.dailyRate,
      idleDeleteDays: Number(map.get('idle_delete_days')) || fallback.idleDeleteDays,
      featureEnabled: map.get('feature_enabled') !== 'false', // absent/anything-but-false = on
    }
  } catch {
    return fallback
  }
}
