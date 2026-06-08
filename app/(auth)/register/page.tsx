'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    agreeTerms: false,
  })

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.agreeTerms) { setError('יש לאשר את תנאי השימוש'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: `${form.firstName} ${form.lastName}`,
          phone: form.phone,
          role: 'admin',
        },
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered' ? 'אימייל זה כבר רשום' : authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold">הבקשה נשלחה!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              קיבלנו את פרטיך. נעבור על הבקשה ונחזור אליך בהקדם עם אישור גישה למערכת.
            </p>
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>חזרה לכניסה</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-3xl font-bold text-blue-600">Kafool</div>
          <CardTitle className="text-xl">פתיחת חשבון</CardTitle>
          <CardDescription>מלא את הפרטים האישיים שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">שם</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">שם משפחה</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">טלפון</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" placeholder="050-0000000" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" placeholder="you@example.com" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} dir="ltr" placeholder="לפחות 8 תווים" required minLength={8} />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => set('agreeTerms', e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0"
                required
              />
              <span className="text-sm text-gray-600">
                אני מסכים ל<a href="#" className="text-blue-600 hover:underline">תנאי השימוש</a> של Kafool
              </span>
            </label>

            {error && <div className="text-sm text-red-500 text-center bg-red-50 rounded-lg p-2">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'שולח...' : 'שלח בקשת הרשמה'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">כניסה</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
