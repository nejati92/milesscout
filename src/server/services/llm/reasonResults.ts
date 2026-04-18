import Anthropic from '@anthropic-ai/sdk'
import { Recommendation, AvailabilityResult } from '../../../shared/types.js'
import type { ParsedQuery } from '../../../shared/types.js'
import { buildStaticPrompt, buildDynamicPrompt } from './buildPrompt.js'
import { TRANSFER_PARTNERS } from '../../data/transferPartners.js'
import { SWEET_SPOTS } from '../../data/sweetSpots.js'
import { ROUTING_RULES } from '../../data/routingRules.js'
import { PROGRAMS } from '../../data/programs.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'

interface ReasonResultsOptions {
  parsed: ParsedQuery
  rawResults: AvailabilityResult[]
  pointsBalances?: Record<string, number>
}

interface ReasonResultsOutput {
  recommendations: Recommendation[]
  advice: string
}

interface RawRecommendation {
  rank: number
  resultIndex: number
  verdict: 'recommended' | 'consider' | 'avoid'
  headline: string
  explanation: string
  flags: Array<{ type: string; message: string }>
  estimatedCashValueGbp?: number
  cppGbp?: number
}

export async function reasonResults(
  options: ReasonResultsOptions
): Promise<ReasonResultsOutput> {
  const { parsed, rawResults, pointsBalances } = options

  if (rawResults.length === 0) {
    return {
      recommendations: [],
      advice: 'No award availability was found for this search. Try widening your date range, searching different programs, or checking alternative origin airports.',
    }
  }

  // Cap at 15 results — we only surface 3 recommendations
  const resultsToReason = rawResults.slice(0, 15)

  const staticPrompt = buildStaticPrompt({
    transferPartners: TRANSFER_PARTNERS,
    sweetSpots: SWEET_SPOTS,
    routingRules: ROUTING_RULES,
    programs: PROGRAMS,
  })
  const dynamicPrompt = buildDynamicPrompt(parsed, resultsToReason, pointsBalances)

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 1200,
      system: [
        // Static knowledge base — cached after first request (10x cheaper on hits)
        { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
        // Dynamic per-request context — never cached
        { type: 'text', text: dynamicPrompt },
      ],
      messages: [
        {
          role: 'user',
          content: 'Analyse and recommend.',
        },
      ],
    }, {
      headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')

    const raw = textBlock.text
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    const parsed_json = JSON.parse(raw) as { recommendations: RawRecommendation[]; advice: string }

    const recommendations: Recommendation[] = parsed_json.recommendations
      .slice(0, 3)
      .map((rec: RawRecommendation) => {
        const result = rawResults[rec.resultIndex] ?? rawResults[0]
        return Recommendation.parse({
          rank: rec.rank,
          result,
          verdict: rec.verdict,
          headline: rec.headline,
          explanation: rec.explanation,
          flags: rec.flags.map((f) => ({
            type: f.type,
            message: f.message,
          })),
          estimatedCashValueGbp: rec.estimatedCashValueGbp,
          cppGbp: rec.cppGbp,
        })
      })

    return {
      recommendations,
      advice: parsed_json.advice ?? '',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[reasonResults] failed:', message)

    return {
      recommendations: [],
      advice: 'Unable to analyse results — showing raw availability below. Please try again.',
    }
  }
}
