import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fastifyWebsocket from '@fastify/websocket'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { initDatabase, getSetting } from './database/index.js'
import { initDouyinHandler } from './services/douyin.js'
import { initScheduler } from './services/scheduler.js'
import { initAuth, validateToken } from './services/auth.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerSettingsRoutes } from './routes/settings.js'
import { registerUserRoutes } from './routes/users.js'
import { registerTaskRoutes } from './routes/tasks.js'
import { registerPostRoutes } from './routes/posts.js'
import { registerDownloadRoutes } from './routes/download.js'
import { registerSyncRoutes } from './routes/sync.js'
import { registerAnalysisRoutes } from './routes/analysis.js'
import { registerSystemRoutes } from './routes/system.js'
import { registerWsHandler } from './ws/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const server = Fastify({ logger: true })

async function start(): Promise<void> {
  // Initialize core services first (DB must be ready before getSetting)
  initAuth()
  initDatabase()
  initDouyinHandler()
  initScheduler()

  // Plugins
  await server.register(cors, { origin: true })
  await server.register(fastifyWebsocket)

  // Static file serving for media
  const downloadPath = getMediaBasePath()
  await server.register(fastifyStatic, {
    root: downloadPath,
    prefix: '/media/',
    decorateReply: true,
    acceptRanges: true
  })

  // Auth: public routes first, then middleware
  registerAuthRoutes(server)
  server.addHook('onRequest', async (request, reply) => {
    if (
      request.url === '/api/auth/login' ||
      request.url === '/api/auth/check' ||
      !request.url.startsWith('/api/')
    ) return
    const auth = request.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!validateToken(token)) {
      reply.code(401).send({ success: false, error: '未登录' })
    }
  })

  // Register REST routes
  registerSettingsRoutes(server)
  registerUserRoutes(server)
  registerTaskRoutes(server)
  registerPostRoutes(server)
  registerDownloadRoutes(server)
  registerSyncRoutes(server)
  registerAnalysisRoutes(server)
  registerSystemRoutes(server)

  // Register WebSocket
  registerWsHandler(server)

  // Serve frontend build in production
  const frontendPath = [
    join(__dirname, '../../web/dist'),
    join(__dirname, '../../../../web/dist')
  ].find(p => existsSync(p)) ?? ''
  if (frontendPath) {
    await server.register(fastifyStatic, {
      root: frontendPath,
      prefix: '/',
      decorateReply: false,
      wildcard: false
    })
    server.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html', frontendPath)
    })
  }

  // Start server
  const port = parseInt(process.env.PORT || '4000')
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`[Server] Running on http://localhost:${port}`)
}

function getMediaBasePath(): string {
  const customPath = getSetting('download_path')
  if (customPath?.trim()) return customPath
  return join(process.env.DYM_DATA_DIR!, 'Download', 'post')
}

start().catch((err) => {
  console.error('[Server] Fatal error:', err)
  process.exit(1)
})
