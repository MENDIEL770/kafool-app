'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    orgName: '',
    slug: '',
    registrationNumber: '',
    receiptName: '',
    wantsSms: false,
  })

  function set(key: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'orgName' && !prev.slug) {
        updated.slug = (value as string)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: form.orgName,
        slug: form.slug,
        owner_id: user.id,
        registration_number: form.registrationNumber || null,
        receipt_name: form.receiptName || null,
        wants_sms: form.wantsSms,
        status: 'pending',
      })
      .select()
      .single()

    if (orgError) {
      setError(orgError.code === '23505' ? 'הכתובת הזו כבר תפוסה, בחר כתובת אחרת' : orgError.message)
      setLoading(false)
      return
    }

    // Link profile to org
    await supabase.from('profiles').update({ org_id: org.id }).eq('id', user.id)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">Kafool</div>
          <CardTitle className="text-xl">השלמת הרשמה</CardTitle>
          <CardDescription>מלא את פרטי הארגון שלך כדי להתחיל</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>שם הארגון / הקמפיין</Label>
                <Input
                  value={form.orgName}
                  onChange={(e) => set('orgName', e.target.value)}
                  placeholder="לדוגמא: בית חב״ד יצהר"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>כתובת הדף שלך</Label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-l border-gray-200 shrink-0">
                    kafool.com/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^\w-]/g, ''))}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                    dir="ltr"
                    placeholder="chabad-yitzhar"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400">
                  כתובת זו תהיה הדף הציבורי שלך לתרומות
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">פרטים לקבלות (אופציונלי)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>ח.פ / ע.ר</Label>
                  <Input
                    value={form.registrationNumber}
                    onChange={(e) => set('registrationNumber', e.target.value)}
                    dir="ltr"
                    placeholder="580000000"
                  />
                </div>
                <div className="space-y-1">
                  <Label>שם לקבלה</Label>
                  <Input
                    value={form.receiptName}
                    onChange={(e) => set('receiptName', e.target.value)}
                    placeholder="עמותת..."
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.wantsSms}
                onChange={(e) => set('wantsSms', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">אני מעוניין בשירות SMS לתורמים</span>
            </label>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'יוצר חשבון...' : 'סיום והתחלת עבודה'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
