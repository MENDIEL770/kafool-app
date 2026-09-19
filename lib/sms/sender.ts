interface SmsOptions {
  to: string
  message: string
}

interface SmsResult {
  success: boolean
  providerId?: string
  error?: string
}

// Fill placeholders in an SMS template. Supports both the Hebrew double-brace
// tokens the automation editor inserts ({{שם}}, {{סכום}}, {{קמפיין}}, {{טלפון}},
// {{הקדשה}}) and legacy single-brace ASCII keys ({donor_name}). Unknown tokens
// are dropped (so a donor never sees a raw {{...}} in the message).
export function renderTemplate(template: string, vars: Record<string, string>): string {
  const alias: Record<string, string> = {
    'שם': 'donor_name', 'סכום': 'amount', 'קמפיין': 'campaign_title',
    'הקדשה': 'dedication', 'טלפון': 'phone', 'donor_phone': 'phone',
    'קישור': 'link', 'קבוצה': 'group',
  }
  return template.replace(/\{\{?\s*([^{}]+?)\s*\}\}?/g, (_m, raw) => {
    const key = String(raw).trim()
    const mapped = alias[key] || key
    const val = vars[key] ?? vars[mapped]
    return val != null ? val : ''
  })
}

export async function sendSms(options: SmsOptions): Promise<SmsResult> {
  const apiKey = process.env.SMS_API_KEY
  const sender = process.env.SMS_SENDER || 'Kafool'

  if (!apiKey) {
    console.warn('SMS_API_KEY not configured')
    return { success: false, error: 'SMS not configured' }
  }

  try {
    // Using Inforu SMS API (common in Israel) — swap for any provider
    const response = await fetch('https://api.inforu.co.il/SendMessageXml.ashx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        InforuXML: `<Inforu>
          <User>
            <Username>${process.env.SMS_USERNAME || ''}</Username>
            <ApiKey>${apiKey}</ApiKey>
          </User>
          <Content Type="sms">
            <Message>${options.message}</Message>
          </Content>
          <Recipients>
            <PhoneNumber>${options.to}</PhoneNumber>
          </Recipients>
          <Settings>
            <Sender>${sender}</Sender>
          </Settings>
        </Inforu>`,
      }),
    })

    const text = await response.text()
    const success = text.includes('Status=1') || text.includes('OK')

    return { success, providerId: text.match(/MessageID=(\w+)/)?.[1] }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
