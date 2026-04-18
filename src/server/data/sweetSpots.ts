export interface SweetSpot {
  program: string
  description: string
  routePattern: Record<string, unknown>
  cabin: string
  typicalPoints: number | null
  note: string
}

export const SWEET_SPOTS: SweetSpot[] = [
  {
    program: 'avios',
    description: 'Finnair LHR/MAN → HEL → Asia',
    routePattern: { originRegion: 'uk', stopover: 'HEL', destinationRegion: 'asia' },
    cabin: 'economy',
    typicalPoints: 40000,
    note: 'Criminally underused. Finnair is an Avios partner with no fuel surcharges. HEL is a clean routing with no Middle East airspace.',
  },
  {
    program: 'aeroplan',
    description: 'Aeroplan partner awards — no fuel surcharges',
    routePattern: { any: true },
    cabin: 'any',
    typicalPoints: null,
    note: 'Aeroplan never passes fuel surcharges to the customer on partner awards. On routes where BA/LH/SQ charge £300+ in fees, Aeroplan often charges ~£30.',
  },
  {
    program: 'flying_blue',
    description: 'Flying Blue Monthly Promo Awards',
    routePattern: { any: true },
    cabin: 'any',
    typicalPoints: null,
    note: 'Flying Blue runs monthly promo awards with 25-50% discount on specific routes. Check flyingblue.com/en/promo-awards each month.',
  },
]
