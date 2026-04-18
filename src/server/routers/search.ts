import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { RawQuery, SearchResponse, ReasonResponse, ParsedQuery, Recommendation, AvailabilityResult } from '../../shared/types.js'
import { parseQuery } from '../services/llm/parseQuery.js'
import { searchAvailability, fetchTripDetails, type BookingLink } from '../services/seatsAero.js'
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
        return { parsed, rawResults: [], cacheHit: false }
      }

      const { results: rawResults, cacheHit } = await searchAvailability({
        origins: parsed.originAirports,
        destinations: parsed.destinationAirports,
        startDate: parsed.departureDateFrom,
        endDate: parsed.departureDateTo,
        cabin: parsed.cabin,
        programs: parsed.programsToSearch,
      })

      return { parsed, rawResults, cacheHit }
    }),

  reason: publicProcedure
    .input(z.object({
      parsed: ParsedQuery,
      rawResults: z.array(AvailabilityResult),
      pointsBalances: z.record(z.string(), z.number()).optional(),
      partial: z.boolean().optional(),
    }))
    .output(ReasonResponse)
    .mutation(async ({ input }) => {
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

  tripDetails: publicProcedure
    .input(z.object({ id: z.string(), cabin: z.string(), source: z.string() }))
    .query(async ({ input }) => {
      const { trips: all, bookingLinks } = await fetchTripDetails(input.id)
      const cabinNorm = (c: string) => c.replace('premium_economy', 'premium').toLowerCase()
      const trips = all.filter((t) => cabinNorm(t.Cabin ?? '') === cabinNorm(input.cabin))

      // Pick the most relevant booking link: match by source program label, then primary, then first
      const sourceLower = input.source.toLowerCase()
      const relevant = bookingLinks.find((b) => b.label.toLowerCase().includes(sourceLower))
        ?? bookingLinks.find((b) => b.primary)
        ?? bookingLinks[0]
        ?? null

      const others = bookingLinks.filter((b) => b !== relevant)

      return { trips: trips.length ? trips : all, relevant, others }
    }),

  programs: publicProcedure
    .input(z.void())
    .query(() => PROGRAMS),
})
