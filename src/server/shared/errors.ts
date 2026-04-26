import { TRPCError } from '@trpc/server'

export class AvailabilitySearchError extends TRPCError {
  constructor(message = 'Failed to search award availability') {
    super({ code: 'INTERNAL_SERVER_ERROR', message })
  }
}

export class ReasoningError extends TRPCError {
  constructor(message = 'Failed to analyse results') {
    super({ code: 'INTERNAL_SERVER_ERROR', message })
  }
}

export class AdvisorError extends TRPCError {
  constructor(message = 'Failed to get advisor response') {
    super({ code: 'INTERNAL_SERVER_ERROR', message })
  }
}

export class TripNotFoundError extends TRPCError {
  constructor(id: string) {
    super({ code: 'NOT_FOUND', message: `Trip details not found for ${id}` })
  }
}
