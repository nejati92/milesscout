import { router, publicProcedure } from '../trpc.js'
import { PROGRAMS } from '../data/programs.js'

export const programsRouter = router({
  list: publicProcedure.query(() => PROGRAMS),
})
