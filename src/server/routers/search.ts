import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { RawQuery, SearchResponse, ParsedQuery, Recommendation, AvailabilityResult } from '../../shared/types.js'
import { parseQuery } from '../services/llm/parseQuery.js'
import { searchAvailability } from '../services/seatsAero.js'
import { reasonResults } from '../services/llm/reasonResults.js'
import { askAdvisor } from '../services/llm/askAdvisor.js'
import { PROGRAMS } from '../data/programs.js'

export const searchRouter = router({
  search: publicProcedure
    .input(RawQuery)
    .output(SearchResponse)
    .mutation(async ({ input }) => {
      const parsed = await parseQuery(input.text, {
        pointsBalances: input.pointsBalances,
        preferences: input.preferences,
        programs: PROGRAMS,
        todayDate: new Date().toISOString().split('T')[0],
      })

      console.log('parsed', parsed)

      if (parsed.parseConfidence === 'low' && parsed.clarificationNeeded) {
        return { parsed, rawResults: [], recommendations: [], filteredCount: 0, advice: parsed.clarificationNeeded, cacheHit: false }
      }

      const { results: rawResults, partial, cacheHit } = await searchAvailability({
        origins: parsed.originAirports,
        destinations: parsed.destinationAirports,
        startDate: parsed.departureDateFrom,
        endDate: parsed.departureDateTo,
        cabin: parsed.cabin,
        programs: parsed.programsToSearch,
      })

      const { recommendations, advice } = await reasonResults({ parsed, rawResults, pointsBalances: input.pointsBalances })

      const filteredCount = recommendations.filter(
        (r) => r.verdict === 'avoid' || r.flags.some((f) => f.type === 'exclusion_violation')
      ).length

      return {
        parsed, rawResults, recommendations, filteredCount,
        advice: advice + (partial ? ' (some programs unavailable)' : ''),
        cacheHit,
      }
    }),

  ask: publicProcedure
    .input(z.object({
      question: z.string().min(1),
      context: z.object({
        query: z.string(),
        advice: z.string(),
        parsed: ParsedQuery,
        rawResults: z.array(AvailabilityResult),
        recommendations: z.array(Recommendation),
        activeFilters: z.string().optional(),
      }),
      history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).default([]),
    }))
    .output(z.object({
      answer: z.string(),
      action: z.object({
        type: z.enum(['filter', 'sort', 'newSearch', 'highlight']),
        program: z.string().nullable().optional(),
        airline: z.string().nullable().optional(),
        cabin: z.string().nullable().optional(),
        directOnly: z.boolean().optional(),
        dateFrom: z.string().nullable().optional(),
        dateTo: z.string().nullable().optional(),
        key: z.enum(['pointsCost', 'date', 'taxesCashGbp']).optional(),
        dir: z.enum(['asc', 'desc']).optional(),
        query: z.string().optional(),
        ids: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      return askAdvisor({
        question: input.question,
        context: input.context,
        history: input.history,
      })
    }),

  programs: publicProcedure
    .input(z.void())
    .query(() => PROGRAMS),
})
