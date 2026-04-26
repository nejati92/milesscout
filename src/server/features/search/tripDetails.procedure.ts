import { z } from 'zod'
import { publicProcedure } from '../../trpc.js'
import { fetchTripDetails } from '../../services/seatsAero.js'

export const tripDetailsProcedure = publicProcedure
  .input(z.object({ id: z.string(), cabin: z.string(), source: z.string() }))
  .query(async ({ input }) => {
    const { trips: all, bookingLinks } = await fetchTripDetails(input.id)

    const cabinNorm = (c: string) => c.replace('premium_economy', 'premium').toLowerCase()
    const trips = all.filter((t) => cabinNorm(t.Cabin ?? '') === cabinNorm(input.cabin))

    const sourceLower = input.source.toLowerCase()
    const relevant =
      bookingLinks.find((b) => b.label.toLowerCase().includes(sourceLower)) ??
      bookingLinks.find((b) => b.primary) ??
      bookingLinks[0] ??
      null

    const others = bookingLinks.filter((b) => b !== relevant)

    return { trips: trips.length ? trips : all, relevant, others }
  })
