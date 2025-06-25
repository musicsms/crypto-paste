/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { cors } from 'hono/cors'

export interface Env {
  PASTES_KV: KVNamespace
  ENVIRONMENT?: string
}

interface PasteData {
  content: string
  expiresAt?: number
  burnAfterRead?: boolean
  createdAt: number
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin || '*'
    }
    // Allow any .pages.dev domain (Cloudflare Pages)
    if (origin.endsWith('.pages.dev')) {
      return origin
    }
    // Allow custom domains (you can add your domain here)
    const allowedDomains: string[] = [
      'https://paste.bopbap.co'
    ]
    return allowedDomains.includes(origin) ? origin : null
  },
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}))

app.post('/api/pastes', async (c) => {
  try {
    const { content, expiresAt, burnAfterRead } = await c.req.json()
    
    if (!content || typeof content !== 'string') {
      return c.json({ error: 'Content is required' }, 400)
    }

    const id = generateId()
    const pasteData: PasteData = {
      content,
      expiresAt,
      burnAfterRead: burnAfterRead || false,
      createdAt: Date.now()
    }

    const ttl = expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined
    await c.env.PASTES_KV.put(id, JSON.stringify(pasteData), { expirationTtl: ttl })

    return c.json({ id, url: `${new URL(c.req.url).origin}/${id}` })
  } catch {
    return c.json({ error: 'Failed to create paste' }, 500)
  }
})

app.get('/api/pastes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const pasteJson = await c.env.PASTES_KV.get(id)
    
    if (!pasteJson) {
      return c.json({ error: 'Paste not found' }, 404)
    }

    const paste: PasteData = JSON.parse(pasteJson)
    
    if (paste.expiresAt && paste.expiresAt < Date.now()) {
      await c.env.PASTES_KV.delete(id)
      return c.json({ error: 'Paste has expired' }, 404)
    }

    if (paste.burnAfterRead) {
      await c.env.PASTES_KV.delete(id)
    }

    return c.json({
      content: paste.content,
      burnAfterRead: paste.burnAfterRead,
      createdAt: paste.createdAt
    })
  } catch {
    return c.json({ error: 'Failed to retrieve paste' }, 500)
  }
})

app.delete('/api/pastes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.PASTES_KV.delete(id)
    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Failed to delete paste' }, 500)
  }
})

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default app