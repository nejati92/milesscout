import { publicProcedure } from '../../trpc.js'
import { RawQuery, SearchResponse } from '../../../shared/types.js'
import { parseQuery } from '../../services/llm/parseQuery.js'
import { searchAvailability } from '../../services/seatsAero.js'
import { PROGRAMS } from '../../data/programs.js'
import { AvailabilitySearchError } from '../../shared/errors.js'

export const searchProcedure = publicProcedure
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

    const isReturn = !!(parsed.returnDateFrom && parsed.returnDateTo)

    try {
      const [outbound, inbound] = await Promise.all([
        searchAvailability({
          origins: parsed.originAirports,
          destinations: parsed.destinationAirports,
          startDate: parsed.departureDateFrom,
          endDate: parsed.departureDateTo,
          cabin: parsed.cabin,
          programs: parsed.programsToSearch,
        }),
        isReturn
          ? searchAvailability({
              origins: parsed.destinationAirports,
              destinations: parsed.originAirports,
              startDate: parsed.returnDateFrom!,
              endDate: parsed.returnDateTo!,
              cabin: parsed.cabin,
              programs: parsed.programsToSearch,
            })
          : Promise.resolve(null),
      ])

      return {
        parsed,
        rawResults: outbound.results,
        inboundResults: inbound?.results,
        cacheHit: outbound.cacheHit,
      }
    } catch {
      throw new AvailabilitySearchError()
    }
  })
