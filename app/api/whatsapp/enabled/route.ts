import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callerWhatsappPilot } from '@/lib/whatsapp-pilot'

// Whether the WhatsApp feature is available to the caller's org (pilot gate).
export async function GET() {
  const supabase = await createClient()
  const { pilot } = await callerWhatsappPilot(supabase)
  return NextResponse.json({ enabled: pilot })
}
