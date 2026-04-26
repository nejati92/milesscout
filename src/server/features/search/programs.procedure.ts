import { z } from 'zod'
import { publicProcedure } from '../../trpc.js'
import { PROGRAMS } from '../../data/programs.js'

export const programsProcedure = publicProcedure
  .input(z.void())
  .query(() => PROGRAMS)
