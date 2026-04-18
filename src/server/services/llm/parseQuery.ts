import Anthropic from '@anthropic-ai/sdk'
import { ParsedQuery } from '../../../shared/types.js'
import type { Program } from '../../data/programs.js'

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

const MODEL = 'claude-haiku-4-5-20251001'

// Static part of the system prompt — cacheable
const STATIC_PROMPT = `You are a flight search parser for an award travel app.
Extract structured search parameters from the user's natural language query.
Return ONLY valid JSON matching the schema. No markdown, no explanation, no preamble.

PROGRAM ALIASES (user may say these, map to the correct source ID):
- "Flying Blue" or "AF/KLM" → flyingblue
- "Avios" or "BA" → avios (also include aeroplan — it's a transfer partner with no fuel surcharges)
- "Aeroplan" or "Air Canada" → aeroplan
- "Virgin" or "VS" → virginatlantic
- "Alaska" or "AS" → alaska
- "Finnair" or "AY" → finnair
- If user says "all programs" include everything.

REGION EXPANSION RULES:
- "Middle East" or "Gulf" → type: "region", normalised: ["QR","EK","EY","GF","SV","FZ","WY","DOH","DXB","AUH","BAH","RUH","JED","MCT"]
- "China" → type: "country", normalised: ["CA","MU","CZ","HU","PEK","PVG","CAN","CTU","SZX"]
- "Russia" → type: "country", normalised: ["SU","S7","SVO","LED","SVX"]
- "Turkey" → type: "country", normalised: ["TK","IST","SAW","ESB"]
- A specific airline like "Qatar" or "QR" → type: "airline", normalised: ["QR","DOH"]

CODESHARE AWARENESS:
- BA codeshares extensively with QR on Asian routes
- IB (Iberia) also partners with QR

CITY TO AIRPORT EXPANSION (always expand, never return just one airport for multi-airport cities):
- "London" → ["LHR","LGW","LCY","LTN","STN"]
- "New York" or "NYC" → ["JFK","EWR","LGA"]
- "Paris" → ["CDG","ORY"]
- "Tokyo" → ["NRT","HND"]
- "Milan" → ["MXP","LIN","BGY"]
- "Rome" → ["FCO","CIA"]
- "Chicago" → ["ORD","MDW"]
- "Los Angeles" or "LA" → ["LAX","SNA","BUR","LGB","ONT"]
- "San Francisco" or "SF" → ["SFO","OAK","SJC"]
- "Washington" or "DC" → ["IAD","DCA","BWI"]
- "Bangkok" → ["BKK","DMK"]
- "Dubai" → ["DXB","DWC"]
- "Oslo" → ["OSL","TRF"]
- "Stockholm" → ["ARN","BMA","NYO"]
If the user specifies a specific airport (e.g. "Heathrow", "Gatwick", "JFK") use only that airport.

DEFAULTS:
- If origin is missing, default to ["LHR","LGW","LCY","LTN","STN"] — UK-targeted product
- If month mentioned without year, use next upcoming occurrence of that month
- If no programs mentioned and no points balances provided, include all programs
- cabin: "business" → "business", "economy" → "economy", "first" → "first", "premium economy" → "premium_economy"

OUTPUT SCHEMA (return JSON matching this exactly):
{
  "originAirports": string[],
  "destinationAirports": string[],
  "departureDateFrom": string,
  "departureDateTo": string,
  "returnDateFrom": string | null,
  "returnDateTo": string | null,
  "cabin": "economy" | "premium_economy" | "business" | "first",
  "adults": number,
  "programsToSearch": string[],
  "exclusions": [{ "raw": string, "type": "region"|"country"|"airport"|"airline"|"airspace"|"alliance", "normalised": string[] }],
  "pointsContext": string,
  "parseConfidence": "high" | "medium" | "low",
  "clarificationNeeded": string | null
}`

interface ParseQueryOptions {
  pointsBalances?: Record<string, number>
  preferences?: {
    cabinPreference?: string
    maxStops?: number
    flexibleDates?: boolean
  }
  programs: Program[]
  todayDate: string
}

export async function parseQuery(
  text: string,
  options: ParseQueryOptions
): Promise<ParsedQuery> {
  const programsList = options.programs
    .map((p) => `  ${p.id} — ${p.name}`)
    .join('\n')

  const pointsContext = options.pointsBalances
    ? Object.entries(options.pointsBalances)
        .map(([prog, bal]) => `${prog}: ${bal.toLocaleString()}`)
        .join(', ')
    : 'No points balances provided'

  const userMessage = [
    `Today's date: ${options.todayDate}`,
    `Query: ${text}`,
    options.pointsBalances ? `Points balances: ${pointsContext}` : null,
    options.preferences?.cabinPreference ? `Cabin preference: ${options.preferences.cabinPreference}` : null,
    options.preferences?.maxStops != null ? `Max stops: ${options.preferences.maxStops}` : null,
  ].filter(Boolean).join('\n')

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [
        // Static block — cached after first request, 10x cheaper on cache hits
        {
          type: 'text',
          text: STATIC_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
        // Dynamic block — programs list (static in practice, but small so fine uncached)
        {
          type: 'text',
          text: `\nSUPPORTED PROGRAMS (use exact IDs):\n${programsList}`,
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }, {
      headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')

    const raw = textBlock.text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(raw)

    if (parsed.returnDateFrom === null) delete parsed.returnDateFrom
    if (parsed.returnDateTo === null) delete parsed.returnDateTo
    if (parsed.clarificationNeeded === null) delete parsed.clarificationNeeded
    if (!parsed.pointsContext) parsed.pointsContext = 'No points context provided'
    if (!parsed.adults) parsed.adults = 1

    return ParsedQuery.parse(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[parseQuery] failed:', message)

    return ParsedQuery.parse({
      originAirports: ['LHR'],
      destinationAirports: [],
      departureDateFrom: options.todayDate,
      departureDateTo: options.todayDate,
      cabin: options.preferences?.cabinPreference ?? 'economy',
      adults: 1,
      programsToSearch: options.programs.map((p) => p.id),
      exclusions: [],
      pointsContext,
      parseConfidence: 'low',
      clarificationNeeded: "I couldn't fully understand your request. Could you clarify the destination and travel dates?",
    })
  }
}
