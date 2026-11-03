'use client'

import { useState } from 'react'

const NUMBER = '972535035770'
const inputStyle: React.CSSProperties = { boxSizing: 'border-box', width: '100%', minHeight: 54, padding: '0 18px', border: '1px solid #6B7290', borderRadius: 16, background: '#FFFFFF', color: '#14204A', font: 'inherit', fontSize: 17 }

// The contact form just composes a WhatsApp message (no backend) — same as the
// prototype. The campaign-readiness quiz is the lead-capture path.
export default function ContactForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [org, setOrg] = useState('')

  const digits = phone.replace(/\D/g, '').length
  const phoneBad = digits > 0 && digits < 9
  const lines = ['שלום, אני רוצה לשמוע על שירות הקמפיין המלא של כפול.']
  if (name) lines.push('שם: ' + name)
  if (phone) lines.push('טלפון: ' + phone)
  if (org) lines.push('המוסד והקמפיין: ' + org)
  const formUrl = 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(lines.join('\n'))

  return (
    <form className="split-body rv d1" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} onSubmit={(e) => e.preventDefault()}>
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
      <a className="pill" href={formUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 64, padding: '10px 24px', boxSizing: 'border-box', borderRadius: 1000, background: '#FF7A63', color: '#0E1430', fontSize: 'clamp(18px,2vw,21px)', fontWeight: 500, textDecoration: 'none' }}>קדימה אני רוצה לגייס כפול &gt;</a>
    </form>
  )
}
