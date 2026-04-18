import { AvailabilityResult } from '../../shared/types.js'
import { PROGRAMS } from '../data/programs.js'
import { cacheGet, cacheSet, makeCacheKey } from './cache.js'

const BASE_URL = 'https://seats.aero/partnerapi'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// Seats.aero cabin codes
const CABIN_MAP: Record<string, string> = {
  economy: 'economy',
  premium_economy: 'premium',
  business: 'business',
  first: 'first',
}

// Seats.aero cabin field prefixes in the response
const CABIN_PREFIX: Record<string, string> = {
  economy: 'Y',
  premium: 'W',
  business: 'J',
  first: 'F',
}

interface SearchParams {
  origins: string[]
  destinations: string[]
  startDate: string
  endDate: string
  cabin: string
  programs: string[]
  onlyDirect?: boolean
}

interface SeatsAeroAvailability {
  ID: string
  RouteID: string
  Route: {
    OriginAirport: string
    DestinationAirport: string
    Source: string
    Distance?: number
  }
  Date: string
  Source: string
  YAvailable: boolean
  WAvailable: boolean
  JAvailable: boolean
  FAvailable: boolean
  YMileageCost: string
  WMileageCost: string
  JMileageCost: string
  FMileageCost: string
  YRemainingSeats: number
  WRemainingSeats: number
  JRemainingSeats: number
  FRemainingSeats: number
  YAirlines: string
  WAirlines: string
  JAirlines: string
  FAirlines: string
  YDirect: boolean
  WDirect: boolean
  JDirect: boolean
  FDirect: boolean
}

interface SeatsAeroResponse {
  count: number
  data: SeatsAeroAvailability[]
  hasMore?: boolean
}

function getProgramName(sourceId: string): string {
  return PROGRAMS.find((p) => p.id === sourceId)?.name ?? sourceId
}

function normaliseResult(
  raw: SeatsAeroAvailability,
  cabin: string
): AvailabilityResult | null {
  const prefix = CABIN_PREFIX[cabin] ?? 'Y'
  const availKey = `${prefix}Available` as keyof SeatsAeroAvailability
  const milesKey = `${prefix}MileageCost` as keyof SeatsAeroAvailability
  const seatsKey = `${prefix}RemainingSeats` as keyof SeatsAeroAvailability
  const airlinesKey = `${prefix}Airlines` as keyof SeatsAeroAvailability

  if (!raw[availKey]) return null

  const milesCost = Number(raw[milesKey])
  if (!milesCost || isNaN(milesCost)) return null

  const airlinesRaw = String(raw[airlinesKey] ?? '')
  const airlines = airlinesRaw ? airlinesRaw.split(',').map((a) => a.trim()).filter(Boolean) : []

  const source = raw.Source ?? raw.Route?.Source ?? 'unknown'

  // Taxes are stored in pennies (e.g. 71979 = £719.79)
  const taxesRawKey = `${prefix}TotalTaxes` as keyof SeatsAeroAvailability
  const taxesPennies = Number(raw[taxesRawKey])
  const taxesCashGbp = taxesPennies > 0 ? Math.round(taxesPennies / 100) : undefined

  const directKey = `${prefix}Direct` as keyof SeatsAeroAvailability
  const isDirect = raw[directKey] === true
  const stops = isDirect ? 0 : 1

  return {
    id: raw.ID,
    source,
    programName: getProgramName(source),
    originAirport: raw.Route?.OriginAirport ?? '',
    destinationAirport: raw.Route?.DestinationAirport ?? '',
    date: raw.Date?.split('T')[0] ?? '',
    cabin,
    pointsCost: milesCost,
    taxesCashGbp,
    remainingSeats: Number(raw[seatsKey]) || undefined,
    airlines,
    stops,
    rawTrips: undefined,
  }
}

async function fetchProgram(
  program: string,
  params: SearchParams,
  apiKey: string
): Promise<{ results: AvailabilityResult[]; partial: boolean }> {
  const cabin = CABIN_MAP[params.cabin] ?? 'economy'

  const url = new URL(`${BASE_URL}/search`)
  url.searchParams.set('origin_airport', params.origins.join(','))
  url.searchParams.set('destination_airport', params.destinations.join(','))
  url.searchParams.set('start_date', params.startDate)
  url.searchParams.set('end_date', params.endDate)
  url.searchParams.set('cabins', cabin)
  url.searchParams.set('sources', program)
  url.searchParams.set('order_by', 'lowest_mileage')
  url.searchParams.set('take', '20')
  if (params.onlyDirect) url.searchParams.set('only_direct_flights', 'true')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Partner-Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 429) {
      console.warn(`[seatsAero] rate limited on program ${program}`)
      return { results: [], partial: true }
    }

    if (!response.ok) {
      console.warn(`[seatsAero] ${response.status} on program ${program}`)
      return { results: [], partial: true }
    }

    const json = (await response.json()) as SeatsAeroResponse

    const results = (json.data ?? [])
      .map((raw) => normaliseResult(raw, cabin))
      .filter((r): r is AvailabilityResult => r !== null)
    
    return { results, partial: false }
  } catch (err) {
    console.warn(`[seatsAero] fetch failed for ${program}:`, err)
    return { results: [], partial: true }
  }
}

export interface TripSegment {
  OriginAirport: string
  DestinationAirport: string
  DepartsAt: string
  ArrivesAt: string
  FlightNumber: string
  Duration: number
  AircraftName: string
  Cabin: string
  FareClass: string
  Order: number
}

export interface Trip {
  ID: string
  AvailabilityID: string
  AvailabilitySegments: TripSegment[]
  TotalDuration: number
  Stops: number
  FlightNumbers: string
  DepartsAt: string
  ArrivesAt: string
  MileageCost: number
  TotalTaxes: number
  TaxesCurrency: string
  RemainingSeats: number
  Source: string
  Cabin: string
  BookingLink?: string
}

export async function fetchTripDetails(availabilityId: string): Promise<Trip[]> {
  const apiKey = process.env.SEATS_AERO_API_KEY ?? ''
  if (!apiKey) return []

  const cacheKey = makeCacheKey({ tripId: availabilityId })
  const cached = cacheGet<Trip[]>(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(`${BASE_URL}/trips/${availabilityId}`, {
      headers: { 'Partner-Authorization': apiKey, 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      console.warn(`[seatsAero] trips ${response.status} for ${availabilityId}`)
      return []
    }
    const json = await response.json() as { data: Trip[] }
    const trips = json.data ?? []
    cacheSet(cacheKey, trips, CACHE_TTL_MS)
    return trips
  } catch (err) {
    console.warn(`[seatsAero] trips fetch failed:`, err)
    return []
  }
}

export interface SearchAvailabilityResult {
  results: AvailabilityResult[]
  partial: boolean // true if some programs failed / were rate limited
  cacheHit: boolean
}

export async function searchAvailability(
  params: SearchParams
): Promise<SearchAvailabilityResult> {
  const apiKey = process.env.SEATS_AERO_API_KEY ?? ''

  if (!apiKey) {
    console.warn('[seatsAero] SEATS_AERO_API_KEY not set — returning empty results')
    return { results: [], partial: true, cacheHit: false }
  }

  const cacheKey = makeCacheKey({
    origins: [...params.origins].sort(),
    destinations: [...params.destinations].sort(),
    startDate: params.startDate,
    endDate: params.endDate,
    cabin: params.cabin,
    programs: [...params.programs].sort(),
    onlyDirect: params.onlyDirect ?? false,
  })

  const cached = cacheGet<SearchAvailabilityResult>(cacheKey)
  if (cached) return { ...cached, cacheHit: true }

  // Parallel requests per program
  const settled = await Promise.allSettled(
    params.programs.map((p) => fetchProgram(p, params, apiKey))
  )

  let partial = false
  const allResults: AvailabilityResult[] = []

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      allResults.push(...outcome.value.results)
      if (outcome.value.partial) partial = true
    } else {
      partial = true
    }
  }

  // Deduplicate by id, sort by points ascending
  const seen = new Set<string>()
  const deduped = allResults
    .filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    .sort((a, b) => a.pointsCost - b.pointsCost)

  const outcome = { results: deduped, partial, cacheHit: false }
  cacheSet(cacheKey, outcome, CACHE_TTL_MS)
  console.log(`[seatsAero] outcome:`, outcome)
  return outcome
}
