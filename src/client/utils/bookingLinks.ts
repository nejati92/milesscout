const BOOKING_URLS: Record<string, string> = {
  avios:          'https://www.britishairways.com/en-gb/executive-club/spending-avios/redeem-on-flights',
  aeroplan:       'https://www.aircanada.com/aeroplan/redeem/',
  flyingblue:     'https://www.flyingblue.com/en/spend/flights/search',
  qatar:          'https://www.qatarairways.com/en-gb/privilege-club/redeem-avios.html',
  virginatlantic: 'https://flywith.virginatlantic.com/gb/en/book-with-miles.html',
  alaska:         'https://www.alaskaair.com/account/login',
  finnair:        'https://www.finnair.com/gb/en/finnair-plus/spend-points/flights',
  emirates:       'https://www.emirates.com/uk/english/skywards/use-your-miles/',
  united:         'https://www.united.com/en/us/book-flight/united-mileageplus/award-travel',
  delta:          'https://www.delta.com/us/en/skymiles/overview',
  american:       'https://www.aa.com/i18n/aadvantage-program/miles/redeem/redeem-miles.jsp',
  singapore:      'https://www.singaporeair.com/en_UK/plan-and-book/ways-to-pay/krisflyer-miles/',
  jetblue:        'https://www.jetblue.com/trueblue/redeem',
}

export function getBookingUrl(source: string): string | null {
  return BOOKING_URLS[source] ?? null
}
