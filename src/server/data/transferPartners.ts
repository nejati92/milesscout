export interface TransferPartner {
  creditProgram: string
  airlinePartners: Array<{
    program: string
    ratio: string
    bonus: string | null
  }>
}

export const TRANSFER_PARTNERS: TransferPartner[] = [
  {
    creditProgram: 'Amex Membership Rewards',
    airlinePartners: [
      { program: 'avios', ratio: '1:1', bonus: null },
      { program: 'flying_blue', ratio: '1:1', bonus: null },
      { program: 'aeroplan', ratio: '1:1', bonus: null },
      { program: 'singapore', ratio: '2:1', bonus: null },
      { program: 'emirates', ratio: '1:1', bonus: null },
    ],
  },
  {
    creditProgram: 'Chase Ultimate Rewards',
    airlinePartners: [
      { program: 'avios', ratio: '1:1', bonus: null },
      { program: 'flying_blue', ratio: '1:1', bonus: null },
      { program: 'united', ratio: '1:1', bonus: null },
      { program: 'aeroplan', ratio: '1:1', bonus: null },
    ],
  },
  {
    creditProgram: 'Barclaycard Avios',
    airlinePartners: [
      { program: 'avios', ratio: '1:1', bonus: null },
    ],
  },
]
