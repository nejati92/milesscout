import { z } from 'zod'
import { publicProcedure } from '../../trpc.js'
import { ParsedQuery, AvailabilityResult, Recommendation } from '../../../shared/types.js'
import { askAdvisor } from '../../services/llm/askAdvisor.js'
import { AdvisorError } from '../../shared/errors.js'

export const askProcedure = publicProcedure
  .input(z.object({
    question: z.string().min(1),
    context: z.object({
      query: z.string().optional(),
      advice: z.string().optional(),
      parsed: ParsedQuery.optional(),
      rawResults: z.array(AvailabilityResult).optional(),
      recommendations: z.array(Recommendation).optional(),
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
    try {
      return await askAdvisor({
        question: input.question,
        context: input.context,
        history: input.history,
      })
    } catch {
      throw new AdvisorError()
    }
  })
