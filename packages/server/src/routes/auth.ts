import type { FastifyInstance } from 'fastify'
import { login, validateToken } from '../services/auth.js'

export function registerAuthRoutes(server: FastifyInstance): void {
  server.post<{ Body: { password: string } }>('/api/auth/login', async (request, reply) => {
    const { password } = (request.body || {}) as { password: string }
    const token = login(password ?? '')
    if (!token) {
      reply.code(401)
      return { success: false, error: '密码错误' }
    }
    return { success: true, data: { token } }
  })

  server.get('/api/auth/check', async (request, reply) => {
    const auth = request.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!validateToken(token)) {
      reply.code(401)
      return { success: false, error: '未登录' }
    }
    return { success: true, data: null }
  })
}
