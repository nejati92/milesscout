import Anthropic from '@anthropic-ai/sdk'
import type { ParsedQuery, AvailabilityResult, Recommendation } from '../../../shared/types.js'

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

// Common IATA codes so the LLM can map airline names → codes
const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad', SQ: 'Singapore Airlines',
  BA: 'British Airways', AF: 'Air France', KL: 'KLM', LH: 'Lufthansa',
  QF: 'Qantas', CX: 'Cathay Pacific', TG: 'Thai Airways', NH: 'ANA',
  JL: 'Japan Airlines', TK: 'Turkish Airlines', UA: 'United', AA: 'American',
  DL: 'Delta', AC: 'Air Canada', VS: 'Virgin Atlantic', IB: 'Iberia',
  MH: 'Malaysia Airlines', AI: 'Air India', MS: 'EgyptAir', RJ: 'Royal Jordanian',
}

export interface ChatAction {
  type: 'filter' | 'sort' | 'newSearch' | 'highlight'
  // filter
  program?: string | null
  airline?: string | null
  cabin?: string | null
  directOnly?: boolean
  dateFrom?: string | null
  dateTo?: string | null
  // sort
  key?: 'pointsCost' | 'date' | 'taxesCashGbp'
  dir?: 'asc' | 'desc'
  // newSearch
  query?: string
  // highlight
  ids?: string[]
}

export interface AdvisorResponse {
  answer: string
  action?: ChatAction
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AskOptions {
  question: string
  context: {
    query?: string
    parsed?: ParsedQuery
    rawResults?: AvailabilityResult[]
    recommendations?: Recommendation[]
    advice?: string
    activeFilters?: string
  }
  history: Message[]
}

const ACTION_TOOL: Anthropic.Tool = {
  name: 'apply_action',
  description: 'Apply a filter, sort, new search, or highlight to the results table. Call this whenever the user wants to filter, sort, search, or navigate results — even if just partially. Always prefer acting over explaining.',
  input_schema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['filter', 'sort', 'newSearch', 'highlight'],
        description: 'filter = narrow the table; sort = reorder; newSearch = run a completely new query; highlight = call out specific rows',
      },
      program: { type: 'string', description: 'Loyalty program source ID to filter to (e.g. "aeroplan", "avios", "flyingblue"). Use null to clear.' },
      airline: { type: 'string', description: 'IATA airline code to filter to (e.g. "EK" for Emirates, "SQ" for Singapore). Use null to clear.' },
      cabin: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'], description: 'Cabin class filter. Use null to clear.' },
      directOnly: { type: 'boolean', description: 'True = show only non-stop flights.' },
      dateFrom: { type: 'string', description: 'ISO date string YYYY-MM-DD to filter results from. Use null to clear.' },
      dateTo: { type: 'string', description: 'ISO date string YYYY-MM-DD to filter results to. Use null to clear.' },
      key: { type: 'string', enum: ['pointsCost', 'date', 'taxesCashGbp'], description: 'Column to sort by (required when type=sort).' },
      dir: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc).' },
      query: { type: 'string', description: 'Full natural-language search query when type=newSearch. Include origin, destination, dates, cabin, and any preferences.' },
      ids: { type: 'array', items: { type: 'string' }, description: 'Result IDs to highlight when type=highlight.' },
    },
    required: ['type'],
  },
}

export async function askAdvisor(options: AskOptions): Promise<AdvisorResponse> {
  const { question, context, history } = options
  const hasSearchData = !!(context.rawResults && context.rawResults.length > 0)

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: question },
  ]

  // General mode — no search results loaded yet
  if (!hasSearchData) {
    const systemPrompt = `You are MileScout, an expert award travel advisor with deep knowledge of:
- All major frequent flyer programs (Avios, Aeroplan, Flying Blue, Velocity, Krisflyer, Miles & More, Virgin Points, Chase UR, Amex MR, Citi TY, Capital One, etc.)
- Points/miles transfers: which credit card points transfer to which airlines, transfer ratios, bonuses
- Award sweet spots, partner redemptions, and how to get outsized value
- Airline alliances (Star Alliance, oneworld, SkyTeam) and which programs can book which airlines
- Fuel surcharges, carrier-imposed fees, and how to avoid them
- Positioning flights, open-jaws, stopovers, and round-the-world awards

Answer conversationally and helpfully. Be specific — give real transfer partners, ratios, and tips. Keep answers concise (2-4 sentences) unless the question warrants more detail.

If the user describes a trip they want to search for, suggest they type it into the search box above.`

    try {
      const response = await getClient().messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      })
      const text = response.content.find((b) => b.type === 'text')
      return { answer: text?.type === 'text' ? text.text.trim() : 'Sorry, something went wrong.' }
    } catch (err) {
      console.error('[askAdvisor] failed:', err)
      return { answer: 'Sorry, something went wrong. Please try again.' }
    }
  }

  // Search-context mode — results are loaded
  const rawResults = context.rawResults!
  const recommendations = context.recommendations ?? []

  const airlinesInResults = [...new Set(rawResults.flatMap(r => r.airlines))]
  const airlinesWithNames = airlinesInResults
    .map(code => `${code}${AIRLINE_NAMES[code] ? ` (${AIRLINE_NAMES[code]})` : ''}`)
    .join(', ')

  const programsList = [...new Set(rawResults.map(r => r.source))].join(', ')

  const resultDates = [...new Set(rawResults.map(r => r.date))].sort()
  const dateRangeInResults = resultDates.length > 0
    ? `${resultDates[0]} to ${resultDates[resultDates.length - 1]}`
    : 'none'

  const resultsList = rawResults.slice(0, 30).map((r, i) => {
    const airlineNames = r.airlines.map(c => AIRLINE_NAMES[c] ? `${c}/${AIRLINE_NAMES[c]}` : c).join(',')
    return `[${i}] id:${r.id} | ${r.programName} (${r.source}) | ${r.originAirport}→${r.destinationAirport} | ${r.date} | ${r.cabin} | ${r.stops === 0 ? 'direct' : `${r.stops}+ stop`} | ${r.pointsCost.toLocaleString()}pts | £${r.taxesCashGbp ?? '?'} taxes | airlines:${airlineNames}`
  }).join('\n')

  const staticInstructions = `You are MileScout, an expert award travel advisor. You directly control the results table. Your job is to answer questions AND act on the table simultaneously.

ALWAYS call apply_action when the user wants to:
- See specific airlines, programs, cabins, or dates → filter
- Change the order → sort
- Ask about a different route, destination, or add a new destination → newSearch
- Identify the best/cheapest/specific rows → highlight

NEVER say you can't filter or sort. NEVER tell the user to re-run a search manually.

For general questions (why is X better, how do transfers work, what is fuel surcharge etc.) answer helpfully in 2-4 sentences — no action needed.

Keep your text answer concise. Use the action to do the work when applicable.`

  const dynamicContext = `CURRENT SEARCH: "${context.query ?? ''}"
ROUTE: ${context.parsed ? `${context.parsed.originAirports.join('/')} → ${context.parsed.destinationAirports.join('/')} | ${context.parsed.departureDateFrom}–${context.parsed.departureDateTo} | ${context.parsed.cabin}` : 'unknown'}
RESULTS DATE RANGE: ${dateRangeInResults}
ACTIVE FILTERS: ${context.activeFilters ?? 'none'}
AVAILABLE PROGRAMS: ${programsList}
AVAILABLE AIRLINES: ${airlinesWithNames}

TOP RECOMMENDATIONS:
${recommendations.slice(0, 3).map((r, i) =>
    `${i + 1}. ${r.result.programName} | ${r.result.date} | ${r.result.pointsCost.toLocaleString()}pts + £${r.result.taxesCashGbp ?? '?'} | ${r.result.airlines.map(c => AIRLINE_NAMES[c] ?? c).join(',')} | ${r.verdict} | ${r.result.stops === 0 ? 'direct' : 'connecting'}`
  ).join('\n') || 'None'}

ALL RESULTS (${rawResults.length} total):
${resultsList}

ADVICE: ${context.advice ?? ''}`

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: [
        { type: 'text', text: staticInstructions, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicContext },
      ],
      tools: [ACTION_TOOL],
      tool_choice: { type: 'auto' },
      messages,
    }, {
      headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const toolBlock = response.content.find((b) => b.type === 'tool_use')

    const answer = textBlock?.type === 'text' && textBlock.text.trim()
      ? textBlock.text.trim()
      : '' // action chip in the UI replaces the need for text when tool-only

    let action: ChatAction | undefined
    if (toolBlock?.type === 'tool_use') {
      action = toolBlock.input as ChatAction
    }

    return { answer, action }
  } catch (err) {
    console.error('[askAdvisor] failed:', err)
    if (err instanceof Error) console.error('[askAdvisor] detail:', err.message)
    return { answer: 'Sorry, something went wrong. Please try again.' }
  }
}
