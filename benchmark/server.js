#!/usr/bin/env node
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

const PUBLIC_DIR = path.resolve(import.meta.dirname)
const DEFAULT_PAGE = 'chart.html'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function resolvePath(requestedPath) {
  const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '')
  const base = normalized === '/' ? `/${DEFAULT_PAGE}` : normalized
  return path.join(PUBLIC_DIR, base)
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const target = resolvePath(url.pathname)

    if (!target.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      res.end('Access denied')
      return
    }

    const data = await fs.readFile(target)
    res.writeHead(200, {
      'Content-Type': getContentType(target),
      'Cache-Control': 'no-cache',
    })
    res.end(data)
  } catch (err) {
    if (err?.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Unexpected error')
  }
})

server.listen(0, () => {
  const address = server.address()
  const port = typeof address === 'object' ? address.port : address
  console.log(`Serving ${PUBLIC_DIR} on http://localhost:${port}/${DEFAULT_PAGE}`)
})
