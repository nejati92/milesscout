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
    if (req.headers.authorization === expected) return
    reply.header('WWW-Authenticate', 'Basic realm="MileScout"')
    reply.code(401).send('Unauthorised')
  })
}

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
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
