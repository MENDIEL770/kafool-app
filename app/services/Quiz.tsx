'use client'

import { useRef, useState } from 'react'
import { type Answers, visibleQuestions } from '@/lib/services/readiness'

type Step = 'intro' | 'q' | 'lead' | 'sending' | 'done' | 'error'

function colsFor(options: string[]): string {
  const longest = Math.max(...options.map((o) => o.length))
  const n = options.length
  if (longest > 22) return 'c1'
  if (n === 3 || n === 5 || n === 6 || n === 7) return 'c3'
  if (n > 7) return 'c4'
  return 'c2'
}

export default function Quiz() {
  const [step, setStep] = useState<Step>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [org, setOrg] = useState('')
  const [errName, setErrName] = useState(false)
  const [errPhone, setErrPhone] = useState(false)
  const [errOrg, setErrOrg] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [sendErr, setSendErr] = useState('')
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const list = visibleQuestions(answers)
  const idx = Math.min(qIndex, list.length - 1)
  const q = list[idx]

  const focus = () => {
    if (typeof document === 'undefined') return
    const card = document.getElementById('quiz-card')
    if (!card) return
    const top = card.getBoundingClientRect().top
    if (top < 84 || top > window.innerHeight * 0.6) card.scrollIntoView({ block: 'start' })
  }

  const pick = (id: string, i: number) => {
    const next = { ...answers, [id]: i }
    setAnswers(next)
    if (pickTimer.current) clearTimeout(pickTimer.current)
    pickTimer.current = setTimeout(() => {
      const l = visibleQuestions(next)
      const at = l.findIndex((x) => x.id === id)
      if (at + 1 < l.length) setQIndex(at + 1)
      else setStep('lead')
      focus()
    }, 170)
  }

  const back = () => {
    if (step === 'lead') { setStep('q'); setQIndex(visibleQuestions(answers).length - 1) }
    else if (qIndex === 0) setStep('intro')
    else setQIndex(qIndex - 1)
    focus()
  }

  const restart = () => {
    setStep('intro'); setQIndex(0); setAnswers({}); setToken(null); setSendErr('')
    focus()
  }

  const submit = async (retry = false) => {
    const eName = !name.trim()
    const ePhone = phone.replace(/\D/g, '').length < 9
    const eOrg = !org.trim()
    setErrName(eName); setErrPhone(ePhone); setErrOrg(eOrg)
    if (eName || ePhone || eOrg) return
    setStep('sending'); setSendErr('')
    try {
      const res = await fetch('/api/services/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, name: name.trim(), phone: phone.trim(), org: org.trim(), source: 'services', token: retry ? token : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.token) setToken(data.token)
      if (res.ok && data.ok) { setStep('done'); setTimeout(focus, 30) }
      else { setSendErr(data.error || 'שליחת ה-SMS נכשלה.'); setStep('error') }
    } catch {
      setSendErr('לא הצלחנו להתחבר לשרת. בדקו את החיבור ונסו שוב.')
      setStep('error')
    }
  }

  const pct = Math.round((idx / list.length) * 100)

  return (
    <div id="quiz-card" className="qcard" style={{ textAlign: 'right' }}>
      {step === 'intro' && (
        <div className="q-center">
          <ul className="q-benefits" style={{ width: '100%' }}>
            <li>ציון מוכנות מתוך 100</li>
            <li>טווח גיוס משוער לפי האנשים שיש לכם</li>
            <li>טבלה של מה שחסר כדי להגיע ליעד</li>
          </ul>
          <button className="q-hot pill" type="button" onClick={() => { setStep('q'); setQIndex(0); focus() }}>בואו נתחיל</button>
          <p style={{ margin: '14px 0 0', fontSize: 15, color: '#4A5375' }}>כ-3 דקות. כל התשובות בבחירה מרובה.</p>
        </div>
      )}

      {step === 'q' && q && (
        <div className={'q-center ' + (idx % 2 ? 'q-a' : 'q-b')}>
          <div className="q-progress" aria-hidden="true"><div style={{ width: pct + '%' }} /></div>
          <div className="q-meta"><span>{q.group}</span><span>שאלה {idx + 1} מתוך {list.length}</span></div>
          <h3 className="q-title">{q.title}</h3>
          <div className={'qopts ' + colsFor(q.options)}>
            {q.options.map((label, i) => (
              <button type="button" key={i} className={'qopt' + (answers[q.id] === i ? ' sel' : '')} onClick={() => pick(q.id, i)}>{label}</button>
            ))}
          </div>
          <button className="q-back" type="button" onClick={back}>חזרה</button>
        </div>
      )}

      {step === 'lead' && (
        <div className="q-center q-a">
          <h3 className="q-title">הדוח שלכם מוכן</h3>
          <p style={{ margin: '8px 0 0', color: '#4A5375' }}>לאיזה מספר לשלוח את הקישור לדוח?</p>
          <div className="q-form">
            <div className="q-field">
              <label htmlFor="q-name">שם מלא</label>
              <input id="q-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              {errName ? <p className="q-err" role="alert">כתבו שם מלא.</p> : null}
            </div>
            <div className="q-field">
              <label htmlFor="q-phone">טלפון נייד לקבלת הדוח</label>
              <input id="q-phone" type="tel" dir="rtl" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {errPhone ? <p className="q-err" role="alert">בדקו את מספר הטלפון. חסרות בו ספרות.</p> : null}
            </div>
            <div className="q-field">
              <label htmlFor="q-org">שם המוסד</label>
              <input id="q-org" type="text" autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} />
              {errOrg ? <p className="q-err" role="alert">כתבו את שם המוסד.</p> : null}
            </div>
            <button className="q-hot pill" type="button" onClick={() => submit(false)}>שלחו לי את הדוח</button>
          </div>
          <button className="q-back" type="button" onClick={back}>חזרה</button>
        </div>
      )}

      {step === 'sending' && (
        <div className="q-center q-a" style={{ padding: '24px 0' }}>
          <h3 className="q-title">שולחים לכם את הדוח…</h3>
          <p style={{ margin: '10px 0 0', color: '#4A5375' }}>רגע אחד.</p>
        </div>
      )}

      {step === 'done' && (
        <div className="q-center q-a">
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: '#E3F6EC', color: '#176A3C' }}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <h3 className="q-title" style={{ marginTop: 18 }}>הקישור בדרך אליכם</h3>
          <p style={{ margin: '10px 0 0', color: '#4A5375', maxWidth: 480 }}>שלחנו ל-<span dir="ltr">{phone.trim()}</span> SMS עם קישור לדוח המוכנות האישי שלכם. אפשר גם לפתוח אותו עכשיו:</p>
          {token ? <a className="q-hot pill" style={{ marginTop: 20 }} href={`/report/${token}`}>לצפייה בדוח עכשיו »</a> : null}
          <button className="q-back" type="button" onClick={restart}>מילוי מחדש</button>
        </div>
      )}

      {step === 'error' && (
        <div className="q-center q-a">
          <div className="q-note" style={{ maxWidth: 480 }}>{sendErr}</div>
          <button className="q-hot pill" style={{ marginTop: 20 }} type="button" onClick={() => submit(true)}>נסו שוב</button>
          <button className="q-back" type="button" onClick={() => setStep('lead')}>חזרה לפרטים</button>
        </div>
      )}
    </div>
  )
}
