'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = { boxSizing: 'border-box', width: '100%', minHeight: 54, padding: '0 18px', border: '1px solid #6B7290', borderRadius: 16, background: '#FFFFFF', color: '#14204A', font: 'inherit', fontSize: 17 }

// Sends the request to /api/services/contact, which saves it, SMSes the admin
// the details and SMSes the person a confirmation.
export default function ContactForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [org, setOrg] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')

  const digits = phone.replace(/\D/g, '').length
  const phoneBad = digits > 0 && digits < 9

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    if (!name.trim()) { setErr('כתבו שם מלא.'); return }
    if (digits < 9) { setErr('בדקו את מספר הטלפון.'); return }
    setErr(''); setState('sending')
    try {
      const res = await fetch('/api/services/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), org: org.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) setState('done')
      else { setErr(data.error || 'לא הצלחנו לשלוח. נסו שוב.'); setState('idle') }
    } catch {
      setErr('לא הצלחנו להתחבר לשרת. בדקו את החיבור ונסו שוב.')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div className="split-body" role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#E3F6EC', color: '#176A3C' }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <h3 style={{ margin: 0, fontSize: 'clamp(24px,2.6vw,30px)', fontWeight: 500 }}>הפנייה התקבלה</h3>
        <p style={{ margin: 0, fontSize: 18, color: 'rgba(255,255,255,.88)' }}>תודה {name.trim()}, נציג יחזור אליכם בהקדם.</p>
      </div>
    )
  }

  return (
    <form className="split-body rv d1" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} onSubmit={submit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="lead-name" style={{ fontSize: 16 }}>שם מלא</label>
        <input id="lead-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="lead-phone" style={{ fontSize: 16 }}>טלפון</label>
        <input id="lead-phone" type="tel" dir="rtl" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        {phoneBad ? <p role="status" style={{ margin: 0, fontSize: 15, color: '#FF7A63' }}>נראה שחסרות ספרות במספר</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="lead-org" style={{ fontSize: 16 }}>המוסד והקמפיין</label>
        <input id="lead-org" type="text" value={org} onChange={(e) => setOrg(e.target.value)} style={inputStyle} />
      </div>
      {err ? <p role="alert" style={{ margin: 0, fontSize: 16, color: '#FF7A63' }}>{err}</p> : null}
      <button className="pill" type="submit" disabled={state === 'sending'} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 64, padding: '10px 24px', boxSizing: 'border-box', border: 0, borderRadius: 1000, background: '#FF7A63', color: '#0E1430', font: 'inherit', fontSize: 'clamp(18px,2vw,21px)', fontWeight: 500, cursor: 'pointer', opacity: state === 'sending' ? 0.7 : 1 }}>{state === 'sending' ? 'שולחים…' : 'קדימה אני רוצה לגייס כפול >'}</button>
    </form>
  )
}
