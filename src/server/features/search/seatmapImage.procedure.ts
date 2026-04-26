import { z } from 'zod'
import { publicProcedure } from '../../trpc.js'

export const seatmapImageProcedure = publicProcedure
  .input(z.object({ url: z.string().url() }))
  .output(z.object({ imageUrl: z.string(), pageUrl: z.string() }).nullable())
  .query(async ({ input }) => {
    try {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MileScout/1.0)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) return null
      const html = await res.text()
      const m = html.match(/\/img\/screenshots\/seatmaps\/([a-f0-9]{32})\.webp/)
      if (!m) return null
      return {
        imageUrl: `https://seatmaps.com/img/screenshots/seatmaps/${m[1]}.webp`,
        pageUrl: input.url,
      }
    } catch {
      return null
    }
  })
