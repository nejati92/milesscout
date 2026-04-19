import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { verifyToken } from '@clerk/backend'

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  let userId: string | null = null
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const token = auth.slice(7)
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })
      userId = payload.sub
    } catch {
      // invalid token — treat as unauthenticated
    }
  }
  return { req, res, userId }
}

type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
