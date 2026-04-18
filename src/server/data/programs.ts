export interface Program {
  id: string           // Seats.aero source ID (exact match required)
  name: string
  airline: string
  alliance: string
  typicalCppGbp: number
}

export const PROGRAMS: Program[] = [
  { id: 'aeroplan',       name: 'Air Canada Aeroplan',          airline: 'AC',    alliance: 'star-alliance', typicalCppGbp: 0.014 },
  { id: 'united',         name: 'United MileagePlus',           airline: 'UA',    alliance: 'star-alliance', typicalCppGbp: 0.012 },
  { id: 'flyingblue',     name: 'Air France/KLM Flying Blue',   airline: 'AF/KL', alliance: 'skyteam',       typicalCppGbp: 0.013 },
  { id: 'avios',          name: 'British Airways Avios',        airline: 'BA',    alliance: 'oneworld',      typicalCppGbp: 0.011 },
  { id: 'emirates',       name: 'Emirates Skywards',            airline: 'EK',    alliance: 'none',          typicalCppGbp: 0.013 },
  { id: 'alaska',         name: 'Alaska Mileage Plan',          airline: 'AS',    alliance: 'oneworld',      typicalCppGbp: 0.016 },
  { id: 'singapore',      name: 'Singapore KrisFlyer',          airline: 'SQ',    alliance: 'star-alliance', typicalCppGbp: 0.015 },
  { id: 'delta',          name: 'Delta SkyMiles',               airline: 'DL',    alliance: 'skyteam',       typicalCppGbp: 0.010 },
  { id: 'american',       name: 'American AAdvantage',          airline: 'AA',    alliance: 'oneworld',      typicalCppGbp: 0.013 },
  { id: 'qatar',          name: 'Qatar Privilege Club',         airline: 'QR',    alliance: 'oneworld',      typicalCppGbp: 0.012 },
  { id: 'virginatlantic', name: 'Virgin Atlantic Flying Club',  airline: 'VS',    alliance: 'none',          typicalCppGbp: 0.015 },
  { id: 'finnair',        name: 'Finnair Plus',                 airline: 'AY',    alliance: 'oneworld',      typicalCppGbp: 0.013 },
  { id: 'jetblue',        name: 'JetBlue TrueBlue',             airline: 'B6',    alliance: 'none',          typicalCppGbp: 0.011 },
]
