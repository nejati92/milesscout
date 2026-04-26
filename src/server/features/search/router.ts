import { router } from '../../trpc.js'
import { searchProcedure } from './search.procedure.js'
import { reasonProcedure } from './reason.procedure.js'
import { askProcedure } from './ask.procedure.js'
import { tripDetailsProcedure } from './tripDetails.procedure.js'
import { seatmapImageProcedure } from './seatmapImage.procedure.js'
import { programsProcedure } from './programs.procedure.js'

export const searchRouter = router({
  search: searchProcedure,
  reason: reasonProcedure,
  ask: askProcedure,
  tripDetails: tripDetailsProcedure,
  seatmapImage: seatmapImageProcedure,
  programs: programsProcedure,
})
