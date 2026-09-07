import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from '../crypto'
import type { CardcomCreds } from './client'

/** Resolve an org's CardCom credentials (terminal plain, api name/password decrypted).
 *  Returns null when not configured/active. */
export async function getOrgCardcom(
  supabase: SupabaseClient,
  orgId: string,
): Promise<CardcomCreds | null> {
  const { data } = await supabase
    .from('organizations')
    .select('cardcom_terminal, cardcom_api_name, cardcom_api_password, cardcom_active')
    .eq('id', orgId)
    .maybeSingle()
  if (!data) return null
  const terminal = Number(String((data as Record<string, unknown>).cardcom_terminal || '').trim())
  const apiName = (decryptSecret((data as Record<string, string>).cardcom_api_name) || '').trim()
  const apiPassword = (decryptSecret((data as Record<string, string>).cardcom_api_password) || '').trim()
  if (!terminal || !apiName) return null
  return { terminal, apiName, apiPassword: apiPassword || undefined }
}

/** Is CardCom the org's active provider with valid creds? */
export async function orgCardcomActive(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await supabase.from('organizations').select('cardcom_active').eq('id', orgId).maybeSingle()
  return !!(data as { cardcom_active?: boolean })?.cardcom_active
}
