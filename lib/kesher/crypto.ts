// Client-safe encryption helpers (no server imports)
const ENC_KEY = process.env.KESHER_ENCRYPTION_KEY || 'kafool-default-key-32chars-padded'

export function encryptPassword(plain: string): string {
  const key = ENC_KEY.slice(0, 32).padEnd(32, '0')
  const buf = Buffer.from(plain, 'utf8')
  const keyBuf = Buffer.from(key, 'utf8')
  const xored = buf.map((b, i) => b ^ keyBuf[i % keyBuf.length])
  return Buffer.from(xored).toString('base64')
}

export function decryptPassword(encrypted: string): string {
  try {
    const key = ENC_KEY.slice(0, 32).padEnd(32, '0')
    const buf = Buffer.from(encrypted, 'base64')
    const keyBuf = Buffer.from(key, 'utf8')
    const xored = buf.map((b, i) => b ^ keyBuf[i % keyBuf.length])
    return Buffer.from(xored).toString('utf8')
  } catch {
    return ''
  }
}
