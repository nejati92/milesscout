import { router } from './trpc.js'
import { searchRouter } from './features/search/router.js'

export const appRouter = router({
  search: searchRouter,
})

export type AppRouter = typeof appRouter
