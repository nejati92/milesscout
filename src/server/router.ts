import { router } from './trpc.js'
import { searchRouter } from './routers/search.js'

export const appRouter = router({
  search: searchRouter,
})

export type AppRouter = typeof appRouter
