import { randomBytes } from 'crypto'

let password = ''
const tokens = new Set<string>()

export function initAuth(): void {
  const envPw = process.env.DYM_PASSWORD
  if (envPw?.trim()) {
    password = envPw.trim()
    console.log('[Auth] 使用环境变量中的密码')
  } else {
    password = randomBytes(6).toString('hex')
    console.log('='.repeat(40))
    console.log(`[Auth] 自动生成密码: ${password}`)
    console.log('='.repeat(40))
  }
}

export function login(input: string): string | null {
  if (input !== password) return null
  const token = randomBytes(32).toString('hex')
  tokens.add(token)
  return token
}

export function validateToken(token: string): boolean {
  return tokens.has(token)
}
