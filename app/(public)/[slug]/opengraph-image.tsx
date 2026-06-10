import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 3600 // re-generate every hour
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title, goal_amount, raised_amount, settings, org_id')
    .eq('slug', slug)
    .single()

  const { data: org } = campaign
    ? await supabase
        .from('organizations')
        .select('name, logo_url')
        .eq('id', campaign.org_id)
        .single()
    : { data: null }

  const title     = campaign?.title     ?? 'קמפיין גיוס'
  const orgName   = org?.name           ?? 'Kafool'
  const raised    = campaign?.raised_amount ?? 0
  const goal      = campaign?.goal_amount   ?? 0
  const pct       = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const primaryColor = (campaign?.settings as { primary_color?: string } | null)?.primary_color ?? '#2563eb'
  const tagline   = (campaign?.settings as { tagline?: string } | null)?.tagline ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          fontFamily: 'sans-serif',
          direction: 'rtl',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '480px', height: '480px',
          borderRadius: '50%',
          background: `${primaryColor}12`,
          transform: 'translate(30%, -30%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0,
          width: '320px', height: '320px',
          borderRadius: '50%',
          background: `${primaryColor}08`,
          transform: 'translate(-30%, 30%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Top: org name + kafool */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#374151',
            }}>
              {orgName}
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: '900',
              color: primaryColor,
              letterSpacing: '-0.5px',
            }}>
              KAFOOL
            </div>
          </div>

          {/* Center: title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              fontSize: title.length > 30 ? '52px' : '64px',
              fontWeight: '900',
              color: '#111827',
              lineHeight: 1.15,
              maxWidth: '800px',
            }}>
              {title}
            </div>
            {tagline && (
              <div style={{
                fontSize: '26px',
                color: '#6b7280',
                fontWeight: '400',
              }}>
                {tagline}
              </div>
            )}
          </div>

          {/* Bottom: stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '12px',
              background: '#f3f4f6',
              borderRadius: '999px',
              overflow: 'hidden',
              display: 'flex',
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: primaryColor,
                borderRadius: '999px',
                display: 'flex',
              }} />
            </div>

            {/* Numbers */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '48px', fontWeight: '900', color: primaryColor }}>
                  ₪{raised.toLocaleString()}
                </span>
                <span style={{ fontSize: '22px', color: '#9ca3af', fontWeight: '400' }}>
                  גויסו מתוך ₪{goal.toLocaleString()}
                </span>
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                color: '#fff',
                background: primaryColor,
                padding: '6px 18px',
                borderRadius: '999px',
              }}>
                {pct}%
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
