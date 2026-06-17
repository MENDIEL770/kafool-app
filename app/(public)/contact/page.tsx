import { createClient } from '@/lib/supabase/server'
import Footer from '../_components/Footer'
import ContactForm from './ContactForm'
import { Phone, Mail, Clock, MessageCircle } from 'lucide-react'

interface ContactSettings {
  phone: string
  email: string
  hours: string
}

const CONTACT_DEFAULTS: ContactSettings = {
  phone: '0535035770',
  email: 'mendielharar@gmail.com',
  hours: "ימים א'–ה', 09:00–18:00",
}

const WA_PHONE = '972535035770'
const WA_MESSAGE = encodeURIComponent("שלום, אני מעוניין בפרטים על הקמת דף גיוס ב׳כפול׳")

async function getContactSettings(): Promise<ContactSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('contact_settings')
      .select('phone, email, hours')
      .limit(1)
      .single()
    if (!data) return CONTACT_DEFAULTS
    return {
      phone: data.phone || CONTACT_DEFAULTS.phone,
      email: data.email || CONTACT_DEFAULTS.email,
      hours: data.hours || CONTACT_DEFAULTS.hours,
    }
  } catch {
    return CONTACT_DEFAULTS
  }
}

export default async function ContactPage() {
  const settings = await getContactSettings()

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">צור קשר</h1>
          <p className="text-lg text-gray-600">נשמח לשמוע מכם — שאלה, בקשה, או סתם שלום</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-black text-gray-900 mb-5">פרטי יצירת קשר</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">טלפון</p>
                    <a
                      href={`tel:${settings.phone}`}
                      className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">אימייל</p>
                    <a
                      href={`mailto:${settings.email}`}
                      className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {settings.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">שעות פעילות</p>
                    <p className="text-sm font-bold text-gray-800">{settings.hours}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp button */}
            <a
              href={`https://wa.me/${WA_PHONE}?text=${WA_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-[#25D366] hover:bg-[#20bc59] text-white font-bold px-5 py-4 rounded-2xl transition-colors shadow-sm"
            >
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black">צ׳אט בוואטסאפ</p>
                <p className="text-xs text-green-100">תגובה מהירה</p>
              </div>
            </a>
          </div>

          {/* Form */}
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6">שלחו לנו הודעה</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    <Footer />
    </div>
  )
}
