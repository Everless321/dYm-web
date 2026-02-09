import type { FastifyInstance } from 'fastify'
import { join } from 'path'
import { existsSync, readdirSync, statSync, rmSync } from 'fs'
import {
  getPostsByUserId,
  getUserById,
  deletePost as dbDeletePost,
  deletePostsByUserId,
  getSetting
} from '../database/index.js'

function getDownloadPath(): string {
  const customPath = getSetting('download_path')
  if (customPath?.trim()) return customPath
  return join(process.env.DYM_DATA_DIR!, 'Download', 'post')
}

function getDirSize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0
  let total = 0
  const items = readdirSync(dirPath, { withFileTypes: true })
  for (const item of items) {
    const fullPath = join(dirPath, item.name)
    if (item.isDirectory()) {
      total += getDirSize(fullPath)
    } else {
      total += statSync(fullPath).size
    }
  }
  return total
}

export function registerFilesRoutes(server: FastifyInstance): void {
  server.get<{ Params: { userId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/api/files/users/:userId/posts',
    async (request) => {
      try {
        const userId = parseInt(request.params.userId)
        const page = parseInt(request.query.page || '1')
        const pageSize = parseInt(request.query.pageSize || '50')
        const result = getPostsByUserId(userId, page, pageSize)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  server.get<{ Params: { secUid: string } }>(
    '/api/files/:secUid/sizes',
    async (request) => {
      try {
        const { secUid } = request.params
        const downloadPath = getDownloadPath()
        const userDir = join(downloadPath, secUid)
        if (!existsSync(userDir)) {
          return { success: true, data: { totalSize: 0, folderCount: 0 } }
        }
        const folders = readdirSync(userDir, { withFileTypes: true }).filter((d) => d.isDirectory())
        const totalSize = getDirSize(userDir)
        return { success: true, data: { totalSize, folderCount: folders.length } }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  server.delete<{ Params: { postId: string } }>(
    '/api/files/posts/:postId',
    async (request) => {
      try {
        const postId = parseInt(request.params.postId)
        const post = dbDeletePost(postId)
        if (!post) return { success: true, data: false }
        const downloadPath = getDownloadPath()
        const postDir = join(downloadPath, post.sec_uid, post.folder_name)
        if (existsSync(postDir)) {
          rmSync(postDir, { recursive: true, force: true })
        }
        return { success: true, data: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  server.delete<{ Params: { userId: string; secUid: string } }>(
    '/api/files/users/:userId/:secUid',
    async (request) => {
      try {
        const userId = parseInt(request.params.userId)
        const { secUid } = request.params
        const deleted = deletePostsByUserId(userId)
        const downloadPath = getDownloadPath()
        const userDir = join(downloadPath, secUid)
        if (existsSync(userDir)) {
          rmSync(userDir, { recursive: true, force: true })
        }
        return { success: true, data: deleted }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )
}
