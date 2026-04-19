import 'dotenv/config'
import Fastify from 'fastify'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import path from 'path'
import { appRouter } from './router.js'
import { createContext } from './trpc.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const server = Fastify({ logger: { level: 'info' } })

// Basic auth — set APP_PASSWORD env var to enable
const appPassword = process.env.APP_PASSWORD
if (appPassword) {
  const expected = 'Basic ' + Buffer.from(`milescout:${appPassword}`).toString('base64')
  server.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return
    if (req.headers.authorization === expected) return
    reply.header('WWW-Authenticate', 'Basic realm="MileScout"')
    reply.code(401).send('Unauthorised')
  })
}

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
})

server.get('/health', async () => ({ ok: true }))

// Voice transcription — needs GROQ_API_KEY (free) or OPENAI_API_KEY
server.post('/api/transcribe', {
  bodyLimit: 4 * 1024 * 1024,
}, async (req, reply) => {
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const apiKey = groqKey ?? openaiKey
  if (!apiKey) return reply.code(503).send({ error: 'transcription_not_configured' })

  const baseUrl = groqKey
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'
  const model = groqKey ? 'whisper-large-v3-turbo' : 'whisper-1'
  console.log('model', model)
  const { audio, mimeType = 'audio/webm' } = req.body as { audio: string; mimeType?: string }
  if (!audio) return reply.code(400).send({ error: 'missing_audio' })

  const buffer = Buffer.from(audio, 'base64')
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`)
  form.append('model', model)
  form.append('language', 'en')

  const resp = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!resp.ok) {
    server.log.error(`[transcribe] ${resp.status} ${await resp.text()}`)
    return reply.code(500).send({ error: 'transcription_failed' })
  }

  const json = await resp.json() as { text: string }
  return { transcript: json.text?.trim() ?? '' }
})

if (process.env.NODE_ENV === 'production') {
  await server.register(fastifyStatic, {
    root: path.join(__dirname, '../../dist/client'),
    wildcard: false,
  })

  server.get('/*', (_req, reply) => {
    reply.sendFile('index.html')
  })
}

const port = Number(process.env.PORT) || 3000

server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
  server.log.info(`MileScout server running at ${address}`)
})
