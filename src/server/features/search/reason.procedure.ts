import { z } from 'zod'
import { publicProcedure } from '../../trpc.js'
import { ParsedQuery, AvailabilityResult, ReasonResponse } from '../../../shared/types.js'
import { reasonResults } from '../../services/llm/reasonResults.js'
import { ReasoningError } from '../../shared/errors.js'

export const reasonProcedure = publicProcedure
  .input(z.object({
    parsed: ParsedQuery,
    rawResults: z.array(AvailabilityResult),
    pointsBalances: z.record(z.string(), z.number()).optional(),
    partial: z.boolean().optional(),
  }))
  .output(ReasonResponse)
  .mutation(async ({ input }) => {
    try {
      const { recommendations, advice } = await reasonResults({
        parsed: input.parsed,
        rawResults: input.rawResults,
        pointsBalances: input.pointsBalances,
      })

      const filteredCount = recommendations.filter(
        (r) => r.verdict === 'avoid' || r.flags.some((f) => f.type === 'exclusion_violation')
      ).length

      return {
        recommendations,
        filteredCount,
        advice: advice + (input.partial ? ' (some programs unavailable)' : ''),
      }
    } catch {
      throw new ReasoningError()
    }
  })
