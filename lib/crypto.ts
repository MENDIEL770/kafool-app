import 'server-only'
import crypto from 'crypto'

// AES-256-GCM encryption for secrets at rest (Stripe keys, etc.). The master key
// comes from SECRETS_ENCRYPTION_KEY (32 bytes, hex or base64). Encrypted values
// carry an "enc:v1:" prefix so we can tell them from any legacy plaintext and
// migrate transparently. If the master key isn't set, values are stored as-is
// (so nothing breaks) — set the key to actually encrypt.
const PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const raw = (process.env.SECRETS_ENCRYPTION_KEY || '').trim()
  if (!raw) return null
  let buf: Buffer
  try {
    buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  } catch { return null }
  return buf.length === 32 ? buf : null
}

/** Encrypt a secret for storage. Returns plaintext unchanged if no key is set. */
export function encryptSecret(plain: string): string {
  if (!plain) return plain
  const key = getKey()
  if (!key) return plain
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64')
}

/** Decrypt a stored secret. Passes through legacy plaintext (no prefix). */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value // legacy plaintext
  const key = getKey()
  if (!key) return null
  try {
    const data = Buffer.from(value.slice(PREFIX.length), 'base64')
    const iv = data.subarray(0, 12)
    const tag = data.subarray(12, 28)
    const ct = data.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
