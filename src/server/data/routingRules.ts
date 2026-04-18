export interface RoutingRule {
  trigger: string
  risk: 'codeshare' | 'routing' | 'surcharge'
  message: string
  affectedRoutes: string[]
}

export const ROUTING_RULES: RoutingRule[] = [
  {
    trigger: 'BA',
    risk: 'codeshare',
    message: 'BA codeshares extensively with Qatar Airways (QR) on routes to Asia and beyond. Tickets sold as BA may be operated by QR and route via DOH. Always check the operating carrier at booking.',
    affectedRoutes: ['Asia', 'Middle East', 'Africa'],
  },
  {
    trigger: 'IB',
    risk: 'codeshare',
    message: 'Iberia partners with Qatar Airways as fellow Oneworld members. Some IB-ticketed flights to Asia operate as QR codeshares via DOH.',
    affectedRoutes: ['Asia'],
  },
  {
    trigger: 'aeroplan_ca',
    risk: 'routing',
    message: 'Aeroplan bookings on Air China (CA) route via Chinese hubs. If user excludes China this is a violation even though the ticket is issued by Aeroplan.',
    affectedRoutes: ['Asia'],
  },
]
