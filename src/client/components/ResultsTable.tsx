import { useMemo, useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { AvailabilityResult, Recommendation } from '../../shared/types'
import { getBookingUrl } from '../utils/bookingLinks'
import { trpc } from '../trpc'

const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad Airways', SQ: 'Singapore Airlines',
  BA: 'British Airways', AF: 'Air France', KL: 'KLM', LH: 'Lufthansa',
  QF: 'Qantas', CX: 'Cathay Pacific', TG: 'Thai Airways', NH: 'ANA',
  JL: 'Japan Airlines', TK: 'Turkish Airlines', UA: 'United Airlines',
  AA: 'American Airlines', DL: 'Delta Air Lines', AC: 'Air Canada',
  VS: 'Virgin Atlantic', IB: 'Iberia', MH: 'Malaysia Airlines',
  AI: 'Air India', MS: 'EgyptAir', RJ: 'Royal Jordanian',
  GF: 'Gulf Air', FZ: 'flydubai', WY: 'Oman Air', SV: 'Saudia',
  ET: 'Ethiopian Airlines', KE: 'Korean Air', OZ: 'Asiana Airlines',
  CI: 'China Airlines', BR: 'EVA Air', MU: 'China Eastern',
  CA: 'Air China', CZ: 'China Southern', LX: 'Swiss', OS: 'Austrian',
  SK: 'SAS', AY: 'Finnair', TP: 'TAP Air Portugal', UX: 'Air Europa',
}

export type SortKey = 'pointsCost' | 'date' | 'taxesCashGbp'
export type SortDir = 'asc' | 'desc'

export interface TableFilters {
  program: string | null
  airline: string | null
  cabin: string | null
  directOnly: boolean
  dateFrom: string | null
  dateTo: string | null
  sort: SortKey
  sortDir: SortDir
  highlighted: string[]
  expanded: string | null
}

export const DEFAULT_FILTERS: TableFilters = {
  program: null, airline: null, cabin: null, directOnly: false,
  dateFrom: null, dateTo: null,
  sort: 'pointsCost', sortDir: 'asc', highlighted: [], expanded: null,
}

const PAGE_SIZE = 10

const VERDICT_GLOW = {
  recommended: '0 0 8px rgba(52,211,153,0.7)',
  consider:    '0 0 8px rgba(251,191,36,0.7)',
  avoid:       '0 0 8px rgba(248,113,113,0.7)',
}
const VERDICT_DOT  = { recommended: 'bg-emerald-400', consider: 'bg-amber-400', avoid: 'bg-red-400' }
const VERDICT_TEXT = { recommended: 'text-emerald-400', consider: 'text-amber-400', avoid: 'text-red-400' }
const VERDICT_LABEL = { recommended: 'Recommended', consider: 'Consider', avoid: 'Avoid' }
const FLAG_STYLE: Record<string, string> = {
  sweet_spot:          'bg-indigo-500/20 text-indigo-300 light:text-indigo-700 border-indigo-500/30',
  routing_risk:        'bg-orange-500/20 text-orange-300 light:text-orange-700 border-orange-500/30',
  codeshare_risk:      'bg-red-500/20 text-red-300 light:text-red-700 border-red-500/30',
  fuel_surcharge:      'bg-yellow-500/20 text-yellow-300 light:text-yellow-700 border-yellow-500/30',
  transfer_bonus:      'bg-emerald-500/20 text-emerald-300 light:text-emerald-700 border-emerald-500/30',
  exclusion_violation: 'bg-red-500/25 text-red-300 light:text-red-700 border-red-500/40',
}
const FLAG_ICON: Record<string, string> = {
  sweet_spot: '★', routing_risk: '⚠', codeshare_risk: '⚠',
  fuel_surcharge: '£', transfer_bonus: '↑', exclusion_violation: '✕',
}

function fmtTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function fmtDuration(mins: number) {
  if (!mins) return ''
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function shortAircraft(name: string): string {
  if (!name) return ''
  // Airbus: A320, A321, A330, A350, A380 etc.
  const airbus = name.match(/A-?(\d{3})/i)
  if (airbus) return `A${airbus[1]}`
  // Boeing: 737, 747, 767, 777, 787
  const boeing = name.match(/(\d{3})/)
  if (boeing) return boeing[1]
  // Fallback: first 5 chars
  return name.slice(0, 5)
}

// Keys are shortAircraft() outputs ("A350", "777" etc.) and IATA type codes ("77W", "359" etc.)
const AIRCRAFT_SLUG: Record<string, string> = {
  // Airbus — shortAircraft keys
  'A220': 'airbus-a220-300',
  'A318': 'airbus-a318',
  'A319': 'airbus-a319',
  'A320': 'airbus-a320',
  'A321': 'airbus-a321',
  'A330': 'airbus-a330-300',
  'A340': 'airbus-a340',
  'A350': 'airbus-a350-900',
  'A380': 'airbus-a380',
  // Boeing — shortAircraft keys
  '717': 'boeing-717',
  '737': 'boeing-737-800',
  '747': 'boeing-747',
  '757': 'boeing-757-200',
  '767': 'boeing-767-300er',
  '777': 'boeing-777-300er',
  '787': 'boeing-787-9',
  // Embraer — shortAircraft keys
  'E170': 'embraer-e170',
  'E175': 'embraer-e175',
  'E190': 'embraer-e190',
  'E195': 'embraer-e195',
  // IATA aircraft type codes
  '221': 'airbus-a220-100',  '223': 'airbus-a220-300',
  '31N': 'airbus-a319neo',
  '32A': 'airbus-a320neo',   '32N': 'airbus-a320neo',
  '32Q': 'airbus-a321neo',   '32S': 'airbus-a321neo',
  '332': 'airbus-a330-200',  '333': 'airbus-a330-300',
  '338': 'airbus-a330-800neo', '339': 'airbus-a330-900neo',
  '351': 'airbus-a350-1000', '359': 'airbus-a350-900',
  '388': 'airbus-a380',
  '738': 'boeing-737-800',   '739': 'boeing-737-900',
  '7M8': 'boeing-737-max-8', '7M9': 'boeing-737-max-9',
  '744': 'boeing-747',       '748': 'boeing-747',
  '752': 'boeing-757-200',   '753': 'boeing-757-300',
  '762': 'boeing-767-200er', '763': 'boeing-767-300er', '764': 'boeing-767-400er',
  '772': 'boeing-777-200er', '77L': 'boeing-777-200lr',
  '77W': 'boeing-777-300er', '773': 'boeing-777-300er',
  '788': 'boeing-787-8',     '789': 'boeing-787-9',     '781': 'boeing-787-10',
  'E70': 'embraer-e170',     'E75': 'embraer-e175',
  'E90': 'embraer-e190',     'E95': 'embraer-e195',
  '290': 'embraer-e190-e2',  '295': 'embraer-e195-e2',
  'ER4': 'embraer-erj145',
  'CR2': 'bombardier-crj-200', 'CR7': 'bombardier-crj-700',
  'CR9': 'bombardier-crj-900', 'CRK': 'bombardier-crj1000',
  'AT4': 'atr-42-600',       'AT7': 'atr-72-600',
  'DH4': 'de-havilland-dash-8-q400',
  'SU9': 'sukhoi-ssj-100-95',
}

const SEATMAPS_SLUG: Record<string, string> = {
  '0E': '0e-north-west-aircompany', '0V': '0v-vasco', '2F': '2f-azul-conecta', '2I': '2i-star-peru',
  '2J': '2j-air-burkina', '2K': '2k-avianca-ecuador', '2L': '2l-helvetic-airways', '2M': '2m-maya-island-air',
  '2P': '2p-pal-express', '2R': '2r-sunlight-air', '2S': '2s-southwind', '2U': '2u-fly-khiva',
  '2W': '2w-world-2-fly', '3B': '3b-bestfly-cabo-verde', '3C': '3c-air-chathams', '3F': '3f-flyone-armenia',
  '3H': '3h-air-inuit', '3J': '3j-jubba-airways-ke', '3L': '3l-air-arabia-abu-dhabi', '3N': '3n-air-urga',
  '3O': '3o-air-arabia-maroc', '3P': '3p-world-2-fly-portugal', '3R': '3r-divi-divi-air', '3S': '3s*-air-antilles',
  '3U': '3u-sichuan-airlines', '3W': '3w-malawi-airlines', '4A': '4a-atsa', '4C': '4c-latam-colombia',
  '4F': '4f-freedom-airline', '4G': '4g-gazpromavia', '4H': '4h*-hi-air', '4L': '4l-oneclick',
  '4M': '4m-mga', '4N': '4n-air-north', '4R': '4r-star-east-airlines', '4S': '4s-red-sea-airlines',
  '4T': '4t-rise-air', '4Y': '4y-discover-airlines', '4Z': '4z-airlink', '5D': '5d-aeromexico-connect',
  '5E': '5e-aero', '5F': '5f-flyone', '5G': '5g-shirak-avia', '5J': '5j-cebu-pacific-air',
  '5K': '5k-hi-fly', '5L': '5l-liat-air', '5M': '5m-mel-air', '5N': '5n-smartavia',
  '5O': '5o-asl-airlines', '5Q': '5q-holiday-europe', '5T': '5t-canadian-north', '5U': '5u*-lade',
  '5W': '5w-wizz-air-abu-dhabi', '5Y': '5y-atlas-air', '5Z': '5z-cemair', '6A': '6a-armenia-airways',
  '6B': '6b-tui-fly-nordic', '6E': '6e-indigo', '6G': '6g-go2sky', '6H': '6h-israir',
  '6I': '6i-air-alsie', '6J': '6j-solaseed-air', '6L': '6l-hac', '6O': '6o-iberojet-portugal',
  '6R': '6r-alrosa', '7C': '7c-jeju-air', '7G': '7g-starflyer', '7M': '7m-map-linhas-aereas',
  '7P': '7p-air-panama', '7R': '7r-rusline', '7V': '7v-fedair', '7W': '7w-windrose-airlines',
  '7Y': '7y-mann-yadanarpon', '7Z': '7z-z-air', '8B': '8b-transnusa', '8D': '8d-fitsair',
  '8E': '8e-bering-air', '8G': '8g-aero-dili', '8H': '8h-bh-air', '8J': '8j-ecojet',
  '8L': '8l-lucky-air', '8M': '8m-myanmar-airways', '8N': '8n-regional-air-services', '8P': '8p-pacific-coastal-airlines',
  '8R': '8r-amelia-international', '8T': '8t-air-tindi', '8U': '8u-afriqiyah-airways', '8W': '8w-fly-all-ways',
  '8Y': '8y-pan-pacific-airlines', '9C': '9c-spring-airlines', '9D': '9d-genghis-khan-air', '9E': '9e-endeavor-air',
  '9G': '9g-sun-phuquoc-airways', '9H': '9h-air-changan', '9I': '9i-alliance-air', '9K': '9k-cape-air',
  '9L': '9l-airtanker', '9M': '9m-central-mountain-air', '9P': '9p-fly-jinnah', '9R': '9r-satena',
  '9S': '9s-air-samarkand', '9U': '9u-air-moldova', '9X': '9x-southern-airways-express', 'A0': 'a0-ba-euroflyer',
  'A2': 'a2-animawings', 'A3': 'a3-aegean-airlines', 'A4': 'a4-azimuth', 'A5': 'a5-air-france-hop',
  'A6': 'a6-air-travel', 'A9': 'a9-georgian-airways', 'AA': 'aa-american-airlines', 'AC': 'ac-air-canada',
  'AD': 'ad-azul', 'AE': 'ae-mandarin-airlines', 'AF': 'af-air-france', 'AFE': 'afe-airfast-indonesia',
  'AG': 'ag-aruba-airlines', 'AH': 'ah-air-algerie', 'AI': 'ai-air-india', 'AK': 'ak-airasia',
  'AL': 'al-malta-air', 'AM': 'am-aeromexico', 'AN': 'an-advanced-air', 'AP': 'ap-albastar',
  'AQ': 'aq-9-air', 'AR': 'ar-aerolineas-arg', 'AS': 'as-alaska-airlines', 'AT': 'at-royal-air-maroc',
  'ATV': 'atv*-air-uniqon', 'AV': 'av-avianca', 'AW': 'aw-africa-world', 'AWA': 'awa-air-astra',
  'AY': 'ay-finnair', 'AZ': 'az-ita-airways', 'B0': 'b0-la-compagnie', 'B2': 'b2-belavia',
  'B3': 'b3-bhutan-airlines', 'B4': 'b4-beond', 'B5': 'b5-bbn-airlines', 'B6': 'b6-jetblue-airways',
  'B7': 'b7-uni-air', 'BA': 'ba-british-airways', 'BC': 'bc-skymark-airlines', 'BER': 'ber-fly-air41',
  'BES': 'bes-bees-airlines', 'BF': 'bf-french-bee', 'BG': 'bg-biman', 'BI': 'bi-royal-brunei',
  'BJ': 'bj-nouvelair', 'BJN': 'bjn-beijing-airlines', 'BJU': 'bju-aerojet-(ukraine)', 'BK': 'bk-okay-airways',
  'BL': 'bl-pacific-airlines', 'BMA': 'bma-bermudair', 'BN': 'bn-luxwing', 'BP': 'bp-air-botswana',
  'BQ': 'bq-sky-alps', 'BR': 'br-eva-air', 'BRH': 'brh-star-air', 'BS': 'bs-us-bangla-airlines',
  'BT': 'bt-airbaltic', 'BU': 'bu-flycaa', 'BUF': 'buf-buff-air-services', 'BV': 'bv-toki-air',
  'BW': 'bw-caribbean-airlines', 'BX': 'bx-air-busan', 'BY': 'by-tui-airways', 'BZ': 'bz-blue-bird-airways',
  'C3': 'c3-trade-air', 'C5': 'c5-commuteair', 'C6': 'c6-centrum-air', 'C8': 'c8-cronos-airlines',
  'CA': 'ca-air-china', 'CAJ': 'caj-air-caraibes-atlantique', 'CAM': 'cam-airasia-cambodia', 'CAT': 'cat*-airseven',
  'CC': 'cc-cm-airlines', 'CCD': 'ccd-dalian-airlines', 'CD': 'cd-corendon-dutch', 'CE': 'ce-chalair',
  'CG': 'cg-png-air', 'CI': 'ci-china-airlines', 'CJ': 'cj-ba-cityflyer', 'CL': 'cl-lufthansa-cityline',
  'CM': 'cm-copa-airlines', 'CN': 'cn-grand-china-air', 'CNK': 'cnk-sunwest-aviation', 'CNM': 'cnm-air-china-inner-mongolia',
  'CU': 'cu-cubana', 'CX': 'cx-cathay-pacific', 'CY': 'cy-cyprus-airways', 'CZ': 'cz-china-southern',
  'D2': 'd2-severstal-aircompany', 'D3': 'd3-daallo-airlines', 'D7': 'd7-airasia-x', 'D8': 'd8-norwegian-air-sweden',
  'DA': 'da-daily-air', 'DAK': 'dak-4airways', 'DB': 'db-maleth-aero', 'DD': 'dd-nok-air',
  'DE': 'de-condor', 'DG': 'dg-cebgo', 'DI': 'di-marabu', 'DK': 'dk-sunclass-airlines',
  'DL': 'dl-delta', 'DM': 'dm-arajet', 'DN': 'dn-dan-air', 'DO': 'do-sky-high',
  'DP': 'dp-pobeda', 'DQ': 'dq-alexandria-airlines', 'DR': 'dr-ruili-airlines', 'DS': 'ds-easyjet-switzerland',
  'DT': 'dt-taag-angola', 'DV': 'dv-scat-airlines', 'DX': 'dx-dat', 'DY': 'dy-norwegian',
  'E2': 'e2-airhaifa', 'E4': 'e4-enter-air', 'E5': 'e5-air-arabia-egypt', 'E6': 'e6-eurowings-europe',
  'E9': 'e9-iberojet', 'EAF': 'eaf-electra-airways', 'EAG': 'eag-emerald-uk', 'EAQ': 'eaq-eastern-australia',
  'EB': 'eb-wamos-air', 'EC': 'ec-easyjet-europe', 'ED': 'ed-airexplore', 'EG': 'eg-aer-lingus-uk',
  'EH': 'eh-ana-wings', 'EI': 'ei*-aer-lingus-regional', 'EK': 'ek-emirates', 'EN': 'en-air-dolomiti',
  'EO': 'eo-ikar', 'EP': 'ep-iran-aseman', 'EQ': 'eq-fly-angola', 'ER': 'er-serene-air',
  'ET': 'et-ethiopian-airlines', 'EU': 'eu-chengdu-airlines', 'EW': 'ew-eurowings', 'EX': 'ex-avianca-express',
  'EY': 'ey-etihad-airways', 'EZ': 'ez-sun-air', 'EZZ': 'ezz-etf-airways', 'F2': 'f2-safarilink-aviation',
  'F3': 'f3-flyadeal', 'F7': 'f7-ifly-airlines', 'F8': 'f8-flair', 'F9': 'f9-frontier-airlines',
  'FA': 'fa*-flysafair', 'FB': 'fb-bulgaria-air', 'FC': 'fc-link-airways', 'FD': 'fd-thai-airasia',
  'FE': 'fe-748-air-services', 'FFA': 'ffa-fly4', 'FH': 'fh-freebird-airlines', 'FHM': 'fhm-freebird-airlines-europe',
  'FHS': 'fhs-flyjaya', 'FI': 'fi-icelandair', 'FJ': 'fj-fiji-airways', 'FJA': 'fja-fiji-link',
  'FM': 'fm-shanghai-airlines', 'FN': 'fn-fastjet-zimbabwe', 'FNA': 'fna-norlandair', 'FO': 'fo-flybondi',
  'FR': 'fr-ryanair', 'FRO': 'fro-frost-air', 'FS': 'fs-flyarystan', 'FSK': 'fsk-africa-charter-airline',
  'FU': 'fu-fuzhou-airlines', 'FV': 'fv-rossiya', 'FW': 'fw*-solenta-mozambique', 'FY': 'fy-firefly',
  'FZ': 'fz-flydubai', 'G3': 'g3-gol', 'G4': 'g4-allegiant-air', 'G5': 'g5-china-express-airlines',
  'G7': 'g7-gojet-airlines', 'G9': 'g9-air-arabia', 'GA': 'ga-garuda', 'GD': 'gd-nexus-airlines',
  'GE': 'ge*-lift', 'GF': 'gf-gulf-air', 'GJ': 'gj-loong-air', 'GJM': 'gjm-airhub-airlines',
  'GK': 'gk-jetstar-japan', 'GL': 'gl-air-greenland', 'GM': 'gm-chair-airlines', 'GOA': 'goa-fly91',
  'GQ': 'gq-sky-express', 'GR': 'gr-aurigny-air', 'GS': 'gs-tianjin-airlines', 'GT': 'gt-air-guilin',
  'GTR': 'gtr-galistair-malta', 'GUM': 'gum-gum-air', 'GW': 'gw-getjet-airlines', 'GX': 'gx-gx-airlines',
  'GXA': 'gxa-globalx', 'GY': 'gy-colorful-guizhou', 'GZ': 'gz-air-rarotonga', 'H2': 'h2-sky-airline',
  'H3': 'h3-hello-jets', 'H4': 'h4-hisky-europe', 'H6': 'h6-european-air-charter', 'H7': 'h7-hisky',
  'H8': 'h8-sky-peru', 'H9': 'h9-himalaya-airlines', 'HA': 'ha-hawaiian-airlines', 'HB': 'hb-gba',
  'HC': 'hc-air-senegal', 'HD': 'hd-air-do', 'HF': 'hf-air-cote-d-ivoire', 'HFM': 'hfm*-global-airlines',
  'HG': 'hg-hibernian-airlines', 'HH': 'hh-qanot-sharq', 'HJ': 'hj-humo-air', 'HK': 'hk-skippers-aviation',
  'HM': 'hm-air-seychelles', 'HMR': 'hmr-global-reach-aviation', 'HN': 'hn-heston-airlines', 'HO': 'ho-juneyao-air',
  'HOT': 'hot-valletta-airlines', 'HP': 'hp-populair', 'HRN': 'hrn*-travelcoup', 'HU': 'hu-hainan-airlines',
  'HV': 'hv-transavia', 'HX': 'hx-hong-kong-airlines', 'HY': 'hy-uzbekistan-airways', 'HZ': 'hz-aurora',
  'I2': 'i2-iberia-express', 'I5': 'i5-aix-connect', 'I8': 'i8-izhavia', 'IA': 'ia-iraqi-airways',
  'IB': 'ib-iberia', 'ID': 'id-batik-air', 'IE': 'ie-solomon-airlines', 'IF': 'if-fly-baghdad',
  'IFY': 'ify-i-fly-air', 'IJ': 'ij-spring-japan', 'IK': 'ik-air-kiribati', 'IL': 'il-trigana-air-service',
  'IN': 'in-nam-air', 'IO': 'io-iraero', 'IOS': 'ios-skybus', 'IP': 'ip-pelita-air',
  'IQ': 'iq-vietjet-qazaqstan', 'IR': 'ir-iran-air', 'IS': 'is-sepehran-airlines', 'IT': 'it-tigerair-taiwan',
  'IU': 'iu-super-air-jet', 'IV': 'iv-gp-aviation', 'IW': 'iw-wings-air', 'IX': 'ix-air-india-express',
  'IY': 'iy-yemenia', 'IZ': 'iz-arkia', 'IZG': 'izg-zagros-airlines', 'J2': 'j2-azal-azerbaijan',
  'J4': 'j4-badr-airlines', 'J6': 'j6-jetsmart-colombia', 'J7': 'j7-afrijet', 'J9': 'j9-jazeera-airways',
  'JA': 'ja-jetsmart', 'JC': 'jc-japan-air-commuter', 'JD': 'jd-capital-airlines', 'JH': 'jh-fuji-dream-airlines',
  'JJ': 'jj-latam-brasil', 'JL': 'jl-jal', 'JM': 'jm-jambojet', 'JNK': 'jnk-jonika-airlines',
  'JON': 'jon-jonair', 'JQ': 'jq-jetstar-airways', 'JR': 'jr-joy-air', 'JS': 'js-air-koryo',
  'JT': 'jt-lion-air', 'JTD': 'jtd-jettime', 'JU': 'ju-air-serbia', 'JV': 'jv-perimeter-aviation',
  'JX': 'jx-starlux', 'JY': 'jy-intercaribbean', 'JZ': 'jz-jetsmart-peru', 'K6': 'k6-air-cambodia',
  'K7': 'k7-air-kbz', 'KAE': 'kae-kangala-air-express', 'KB': 'kb-druk-air', 'KC': 'kc-air-astana',
  'KE': 'ke-korean-air', 'KG': 'kg-key-lime-air', 'KGN': 'kgn-asman-airlines', 'KK': 'kk-leav-aviation',
  'KL': 'kl-klm', 'KLJ': 'klj-klasjet', 'KM': 'km-km-malta-airlines', 'KN': 'kn-china-united-airlines',
  'KO': 'ko-komiaviatrans', 'KP': 'kp-asky-airlines', 'KQ': 'kq-kenya-airways', 'KR': 'kr-cambodia-airways',
  'KS': 'ks-aeroitalia-regional', 'KU': 'ku-kuwait-airways', 'KX': 'kx-cayman-airways', 'KY': 'ky-kunming-airlines',
  'L6': 'l6-mauritania-airlines', 'L8': 'l8-lulutai-airlines', 'L9': 'l9-lumiwings', 'LA': 'la-latam-airlines',
  'LB': 'lb-bul-air', 'LBR': 'lbr-air-borealis', 'LE': 'le-air-inter-iles', 'LF': 'lf-contour-aviation',
  'LG': 'lg-luxair', 'LH': 'lh-lufthansa', 'LIL': 'lil-fly-lili', 'LIP': 'lip-lipican-aer',
  'LIZ': 'liz-liz-aviation', 'LJ': 'lj-jin-air', 'LM': 'lm-loganair', 'LO': 'lo-lot',
  'LP': 'lp-latam-peru', 'LR': 'lr-avianca-costa-rica', 'LS': 'ls-jet2-com', 'LSJ': 'lsj-air-liaison',
  'LT': 'lt-lj-air', 'LW': 'lw-lauda-europe', 'LX': 'lx-swiss', 'LY': 'ly-el-al',
  'LZ': 'lz-legend-airlines', 'M0': 'm0-aero-mongolia', 'MD': 'md-madagascar-airlines', 'ME': 'me-mea',
  'MF': 'mf-xiamenair', 'MG': 'mg-eznis-airways', 'MH': 'mh-malaysia-airlines', 'MJ': 'mj-myway-airlines',
  'MK': 'mk-air-mauritius', 'ML': 'ml-sky-mali', 'MM': 'mm-peach', 'MNE': 'mne-air-montenegro',
  'MO': 'mo-calm-air', 'MQ': 'mq-envoy-air', 'MR': 'mr-hunnu-air', 'MRJ': 'mrj-meraj-air',
  'MS': 'ms-egyptair', 'MT': 'mt-malta-medair', 'MTL': 'mtl-raf-avia', 'MU': 'mu-china-eastern',
  'MV': 'mv-air-mediterranean', 'MX': 'mx-breeze-airways', 'MY': 'my-airborneo', 'MZ': 'mz-amakusa-airlines',
  'N0': 'n0-norse-atlantic', 'N2': 'n2-aero-contractors', 'N3': 'n3-volaris-el-salvador', 'N4': 'n4-nordwind',
  'N5': 'n5-nolinor-aviation', 'N7': 'n7-norra', 'N8': 'n8-national-airlines', 'NCB': 'ncb-north-cariboo-air',
  'NDL': 'ndl-chrono-aviation', 'NE': 'ne-nesma-airlines', 'NF': 'nf-air-vanuatu', 'NH': 'nh-ana',
  'NI': 'ni-portugalia', 'NJS': 'njs-national-jet-systems', 'NK': 'nk-spirit-airlines', 'NM': 'nm-air-moana',
  'NO': 'no-neos', 'NP': 'np-nile-air', 'NQ': 'nq-air-japan', 'NR': 'nr-manta-air',
  'NS': 'ns-hebei-airlines', 'NT': 'nt-binter-canarias', 'NU': 'nu-jta', 'NUA': 'nua-united-nigeria',
  'NWK': 'nwk-network-aviation', 'NX': 'nx-air-macau', 'NZ': 'nz-air-new-zealand', 'O8': 'o8-marathon-airlines',
  'O9': 'o9-nova-airways', 'OA': 'oa-olympic-air', 'OB': 'ob-boa', 'OC': 'oc-oriental-air-bridge',
  'OD': 'od-batik-air-malaysia', 'OF': 'of-overland-airways', 'OH': 'oh-psa-airlines', 'OJ': 'oj-nyxair',
  'OL': 'ol-samoa-airways', 'OM': 'om-miat-mongolian', 'ON': 'on-nauru-airlines', 'OO': 'oo-skywest',
  'OP': 'op-passionair', 'OQ': 'oq-chongqing-airlines', 'OR': 'or-tui-fly-nl', 'OS': 'os-austrian-airlines',
  'OTT': 'ott-ott-airlines', 'OU': 'ou-croatia-airlines', 'OV': 'ov-salamair', 'OW': 'ow-skyward-airlines',
  'OY': 'oy-omni-air-international', 'OZ': 'oz-asiana-airlines', 'OZW': 'ozw-virgin-australia-regional',
  'P0': 'p0-proflight-zambia', 'P2': 'p2-airkenya-express', 'P4': 'p4-air-peace', 'P5': 'p5-wingo',
  'P6': 'p6*-privilege-style', 'P8': 'p8-sprintair', 'PA': 'pa-airblue', 'PB': 'pb-pal-airlines',
  'PC': 'pc-pegasus', 'PD': 'pd-porter-airlines', 'PE': 'pe-people-s', 'PEA': 'pea-pan-europeenne',
  'PF': 'pf-air-sial', 'PG': 'pg-bangkok-airways', 'PJ': 'pj-air-saint-pierre', 'PK': 'pk-pia',
  'PM': 'pm-canaryfly', 'PN': 'pn-west-air', 'PQ': 'pq-skyup-airlines', 'PR': 'pr-pal',
  'PRS': 'prs-pars-air', 'PS': 'ps-ukraine-intl', 'PT': 'pt-piedmont-airlines', 'PU': 'pu-plus-ultra',
  'PW': 'pw-precision-air', 'PX': 'px-air-niugini', 'PY': 'py-surinam-airways', 'Q2': 'q2-maldivian',
  'Q6': 'q6-volaris-costa-rica', 'Q9': 'q9-green-africa', 'QF': 'qf-qantas', 'QG': 'qg-citilink',
  'QH': 'qh-bamboo-airways', 'QI': 'qi-ibom-air', 'QK': 'qk-jazz-air', 'QLK': 'qlk-qantaslink',
  'QN': 'qn-skytrans', 'QP': 'qp-akasa-air', 'QQ': 'qq-alliance-airlines', 'QR': 'qr-qatar-airways',
  'QS': 'qs-smartwings', 'QV': 'qv-lao-airlines', 'QW': 'qw-qingdao-airlines', 'QX': 'qx-horizon-air',
  'QZ': 'qz-indonesia-airasia', 'R3': 'r3-yakutia-airlines', 'R4': 'r4-rano-air', 'R5': 'r5-jordan-aviation',
  'R6': 'r6-dat-lt', 'R8': 'r8-sky-fru', 'RA': 'ra-nepal-airlines', 'RAC': 'rac-rac-ryukyu-air',
  'RC': 'rc-atlantic-airways', 'REA': 'rea-red-air', 'RER': 'rer-aeroregional', 'RF': 'rf-aero-k',
  'RGE': 'rge-regent-airways', 'RJ': 'rj-royal-jordanian', 'RK': 'rk-ryanair-uk', 'RN': 'rn-eswatini-air',
  'RNG': 'rng-renegade-air', 'RO': 'ro-tarom', 'RR': 'rr-buzz', 'RS': 'rs-air-seoul',
  'RSC': 'rsc-canair', 'RT': 'rt-uvt-aero', 'RV': 'rv-air-canada-rouge', 'RW': 'rw-royal-air',
  'RXP': 'rxp-royal-air-maroc-express', 'RY': 'ry-jiangxi-air', 'S0': 's0-aerolineas-sosa',
  'S1': 's1-saurya-airlines', 'S4': 's4-azores-airlines', 'S5': 's5-star-air-(india)', 'S7': 's7-s7-airlines',
  'S9': 's9-flybig', 'SA': 'sa-south-african-airways', 'SB': 'sb-aircalin', 'SC': 'sc-shandong-airlines',
  'SEN': 'sen-senor-air', 'SET': 'set-solenta-aviation', 'SF': 'sf-tassili-airlines', 'SG': 'sg-spicejet',
  'SHA': 'sha-shree-airlines', 'SI': 'si-blue-islands', 'SJ': 'sj-sriwijaya-air', 'SK': 'sk-sas',
  'SL': 'sl-thai-lion-air', 'SM': 'sm-air-cairo', 'SN': 'sn-brussels-airlines', 'SND': 'snd-skytraders',
  'SO': 'so-syphax', 'SP': 'sp-sata-air-acores', 'SQ': 'sq-singapore-airlines', 'SR': 'sr-sundair',
  'SS': 'ss-corsair', 'SSJ': 'ssj-krasavia', 'SSQ': 'ssq-sunstate-airlines', 'ST': 'st-air-thanlwin',
  'SU': 'su-aeroflot', 'SV': 'sv-saudia', 'SVD': 'svd-svg-air', 'SVI': 'svi-sky-vision-airlines',
  'SVS': 'svs-sas-link', 'SY': 'sy-sun-country-airlines', 'SZ': 'sz-somon-air', 'SZS': 'szs-sas-connect',
  'T3': 't3-eastern-airways', 'T5': 't5-turkmenistan-air', 'T6': 't6-airswift', 'T9': 't9-turpial-airlines',
  'TA': 'ta*-tara-air', 'TB': 'tb-tui-fly-be', 'TBZ': 'tbz-ata-airlines', 'TC': 'tc-air-tanzania',
  'TD': 'td-tbilisi-airways', 'TEZ': 'tez-tez-jet', 'TF': 'tf-bra', 'TG': 'tg-thai-airways',
  'TGA': 'tga-tga', 'TI': 'ti-tailwind-airlines', 'TK': 'tk-turkish-airlines', 'TL': 'tl-airnorth',
  'TM': 'tm-lam-mozambique', 'TMW': 'tmw-tma', 'TN': 'tn-air-tahiti-nui', 'TO': 'to-transavia-france',
  'TP': 'tp-tap', 'TR': 'tr-scoot', 'TS': 'ts-air-transat', 'TT': 'tt-braathens',
  'TU': 'tu-tunisair', 'TV': 'tv-tibet-airlines', 'TW': 'tw-t-way-air', 'TX': 'tx-air-caraibes',
  'TY': 'ty-air-caledonie', 'U2': 'u2-easyjet-uk', 'U4': 'u4-buddha-air', 'U5': 'u5-skyup-mt',
  'U6': 'u6-ural-airlines', 'U8': 'u8-tus-airways', 'UA': 'ua-united', 'UB': 'ub-myanmar-mna',
  'UD': 'ud-ur-airlines', 'UF': 'uf-petroleum-air', 'UG': 'ug-tunisair-express', 'UI': 'ui-auric-air',
  'UJ': 'uj-almasria-airlines', 'UL': 'ul-srilankan-airlines', 'UM': 'um-air-zimbabwe', 'UO': 'uo-hk-express',
  'UP': 'up-bahamasair', 'UQ': 'uq-urumqi-air', 'UR': 'ur-uganda-airlines', 'USA': 'usa-silk-avia',
  'USY': 'usy-usc', 'UT': 'ut-utair', 'UU': 'uu-air-austral', 'UVL': 'uvl-universal-air',
  'UX': 'ux-air-europa', 'V0': 'v0-conviasa', 'V3': 'v3-carpatair', 'V5': 'v5-aerovias-dap',
  'V7': 'v7-volotea', 'VA': 'va-virgin-australia', 'VAW': 'vaw-fly2sky', 'VB': 'vb-viva',
  'VC': 'vc-sterling-airways', 'VE': 've-clic', 'VF': 'vf-ajet', 'VJ': 'vj-vietjet-air',
  'VK': 'vk-valuejet', 'VL': 'vl-lufthansa-city', 'VN': 'vn-vietnam-airlines', 'VNE': 'vne-venezolana',
  'VP': 'vp-flyme', 'VQ': 'vq-novoair', 'VR': 'vr-cabo-verde-airlines', 'VRH': 'vrh-varesh-airlines',
  'VS': 'vs-virgin-atlantic', 'VT': 'vt-air-tahiti', 'VU': 'vu-vietravel-airlines', 'VY': 'vy-vueling',
  'VZ': 'vz-thai-vietjetair', 'W3': 'w3-arik-air', 'W4': 'w4-wizz-air-malta', 'W5': 'w5-mahan-air',
  'W6': 'w6-wizz-air', 'W8': 'w8-la-costena', 'W9': 'w9-wizz-air-uk', 'WA': 'wa-klm-cityhopper',
  'WB': 'wb-rwandair', 'WE': 'we-parata-air', 'WF': 'wf-wideroe', 'WH': 'wh-wingo-panama',
  'WI': 'wi-white-airways', 'WJ': 'wj-jetsmart-argentina', 'WK': 'wk-edelweiss-air', 'WL': 'wl-world-atlantic-airlines',
  'WM': 'wm-winair', 'WN': 'wn-southwest-airlines', 'WR': 'wr-westjet-encore', 'WS': 'ws-westjet',
  'WSG': 'wsg-wasaya-airways', 'WT': 'wt-swiftair', 'WU': 'wu-western-air', 'WV': 'wv-westair-aviation',
  'WX': 'wx-cityjet', 'WY': 'wy-oman-air', 'WZ': 'wz-red-wings', 'X3': 'x3-tui-fly-de',
  'X5': 'x5-air-europa-express', 'X8': 'x8-avion-express-malta', 'X9': 'x9-avion-express', 'XC': 'xc-corendon-airlines',
  'XE': 'xe-jsx-air', 'XH': 'xh-fly-cham', 'XJ': 'xj-thai-airasia-x', 'XK': 'xk-air-corsica',
  'XL': 'xl-latam-ecuador', 'XLE': 'xle-ng-eagle', 'XM': 'xm-j-air', 'XN': 'xn-mexicana',
  'XP': 'xp-avelo-airlines', 'XQ': 'xq-sunexpress', 'XR': 'xr-corendon-europe', 'XUM': 'xum-sum-air',
  'XY': 'xy-flynas', 'XZ': 'xz-aeroitalia', 'Y2': 'y2-air-century-acsa', 'Y4': 'y4-volaris',
  'Y7': 'y7-nordstar', 'Y8': 'y8-suparna-airlines', 'YB': 'yb-harbour-air-seaplanes', 'YC': 'yc-yamal-airlines',
  'YD': 'yd-ascend-airways', 'YI': 'yi-fly-oya', 'YK': 'yk-avia-traffic-company', 'YN': 'yn-air-creebec',
  'YP': 'yp-air-premia', 'YQ': 'yq-tar-mexico', 'YR': 'yr-grand-canyon-airlines', 'YT': 'yt-yeti-airlines',
  'YU': 'yu-euroatlantic-airways', 'YV': 'yv-mesa-airlines', 'YW': 'yw-air-nostrum', 'YX': 'yx-republic-airways',
  'Z0': 'z0-norse-atlantic-uk', 'Z2': 'z2-philippines-airasia', 'Z9': 'z9-myairline', 'ZA': 'za-sky-angkor-airlines',
  'ZD': 'zd-ewa-air', 'ZE': 'ze-eastar-jet', 'ZF': 'zf-azur-air', 'ZG': 'zg-zipair',
  'ZH': 'zh-shenzhen-airlines', 'ZL': 'zl-rex-airlines', 'ZN': 'zn-zambia-airways', 'ZP': 'zp-paranair',
  'ZQ': 'zq-german-airways', 'ZT': 'zt-titan-airways', 'ZV': 'zv-aerus', 'ZW': 'zw-air-wisconsin',
}

function seatMapUrl(flightNumber: string, aircraftName?: string): string {
  // IATA airline codes are exactly 2 chars — must not use {2,3} which greedily eats a digit
  const iata = (flightNumber ?? '').replace(/\s+/g, '').toUpperCase().match(/^([A-Z0-9]{2})/)?.[1] ?? ''
  const airlineSlug = SEATMAPS_SLUG[iata]
  if (!airlineSlug) return 'https://seatmaps.com/airlines/'
  const base = `https://seatmaps.com/airlines/${airlineSlug}/`
  if (!aircraftName) return base
  const acKey = shortAircraft(aircraftName) || aircraftName.trim().toUpperCase()
  const acSlug = AIRCRAFT_SLUG[acKey]
  return acSlug ? `${base}${acSlug}/` : base
}

function SeatMapButton({ flightNumber, aircraftName }: { flightNumber: string; aircraftName?: string }) {
  const [open, setOpen] = useState(false)
  const url = seatMapUrl(flightNumber, aircraftName)
  const query = trpc.search.seatmapImage.useQuery({ url }, { enabled: open, staleTime: Infinity })

  // Lock body scroll and handle Escape
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (url === 'https://seatmaps.com/airlines/') return null

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="bg-[#12121e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
          <span className="text-sm font-semibold text-white/70">Seat Map</span>
          <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 text-xl leading-none cursor-pointer transition">×</button>
        </div>

        {query.isLoading && (
          <div className="flex items-center justify-center h-64 text-white/30 text-sm">Loading seat map…</div>
        )}

        {query.data && (
          <>
            <div className="overflow-y-auto flex-1 overscroll-contain">
              <a href={query.data.pageUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img src={query.data.imageUrl} alt="Seat map" className="w-full object-contain" loading="lazy" />
              </a>
            </div>
            <div className="px-5 py-3 flex items-center justify-between border-t border-white/8 shrink-0">
              <span className="text-xs text-white/25">Provided by seatmaps.com</span>
              <a href={query.data.pageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 transition">
                Open full map →
              </a>
            </div>
          </>
        )}

        {!query.isLoading && !query.data && (
          <div className="flex flex-col items-center justify-center gap-3 h-48">
            <p className="text-sm text-white/40">No seat map preview available.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 transition">
              Open on seatmaps.com →
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
      >
        Seat map
      </button>
      {modal}
    </>
  )
}

const TRIP_PAGE = 5

function ExpandedRow({ result, rec }: { result: EnrichedResult; rec: ReturnType<typeof result['recommendation']> }) {
  const { data, isLoading } = trpc.search.tripDetails.useQuery(
    { id: result.id, cabin: result.cabin, source: result.source },
    { staleTime: 10 * 60 * 1000 }
  )

  const [sortBy, setSortBy] = useState<'duration' | 'departs' | 'seats'>('duration')
  const [directOnly, setDirectOnly] = useState(false)
  const [tripPage, setTripPage] = useState(0)

  useEffect(() => { setTripPage(0) }, [sortBy, directOnly])

  const allTrips = data?.trips ?? []
  const hasDirectTrips = allTrips.some((t) => t.Stops === 0)

  const filtered = useMemo(() => {
    let t = directOnly ? allTrips.filter((x) => x.Stops === 0) : allTrips
    if (sortBy === 'duration') t = [...t].sort((a, b) => a.TotalDuration - b.TotalDuration)
    else if (sortBy === 'departs') t = [...t].sort((a, b) => a.DepartsAt.localeCompare(b.DepartsAt))
    else t = [...t].sort((a, b) => b.RemainingSeats - a.RemainingSeats)
    return t
  }, [allTrips, sortBy, directOnly])

  const totalTripPages = Math.ceil(filtered.length / TRIP_PAGE)
  const clampedPage = Math.min(tripPage, Math.max(0, totalTripPages - 1))
  const visible = filtered.slice(clampedPage * TRIP_PAGE, (clampedPage + 1) * TRIP_PAGE)

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>

      {/* Booking links — top */}
      {!isLoading && (data?.relevant || data?.others?.length) && (
        <div className="flex flex-wrap items-center gap-2">
          {data.relevant && (
            <a href={data.relevant.link} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition no-underline">
              {data.relevant.label} →
            </a>
          )}
          {data.others?.map((b, i) => (
            <a key={i} href={b.link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition no-underline border border-white/8">
              {b.label}
            </a>
          ))}
        </div>
      )}

      {/* AI analysis */}
      {rec && (
        <div className="space-y-2">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-white/80">{rec.headline}</p>
            <p className="text-xs text-white/45 leading-relaxed">{rec.explanation}</p>
          </div>
          {(rec.flags.length > 0 || rec.cppGbp != null) && (
            <div className="flex flex-wrap gap-1.5">
              {rec.flags.map((flag, i) => (
                <div key={i} className={`flex gap-1 w-fit max-w-full text-xs px-2.5 py-1 rounded-lg border ${FLAG_STYLE[flag.type] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
                  <span className="font-bold shrink-0">{FLAG_ICON[flag.type] ?? '•'}</span>
                  <span className="break-words">{flag.message}</span>
                </div>
              ))}
              {rec.cppGbp != null && (
                <span className="text-xs text-white/25 self-center">
                  {(rec.cppGbp * 100).toFixed(1)}p/pt{rec.estimatedCashValueGbp != null && ` · ≈ £${rec.estimatedCashValueGbp.toLocaleString()}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flight options */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-white/25 animate-pulse py-2">
          <span className="w-3 h-3 rounded-full border border-white/20 animate-spin border-t-transparent inline-block" />
          Loading flights…
        </div>
      ) : allTrips.length > 0 ? (
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-xs text-white/25">{filtered.length} option{filtered.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1 ml-1">
              {(['duration', 'departs', 'seats'] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`text-xs px-2.5 py-1 rounded-md transition cursor-pointer ${sortBy === s ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/50'}`}>
                  {s === 'duration' ? 'Shortest' : s === 'departs' ? 'Earliest' : 'Most seats'}
                </button>
              ))}
            </div>
            {hasDirectTrips && (
              <button onClick={() => setDirectOnly(!directOnly)}
                className={`text-xs px-2.5 py-1 rounded-md transition cursor-pointer ml-auto ${directOnly ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/25 hover:text-white/50'}`}>
                Direct only
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="text-xs text-white/20 py-2">No matching options</p>
          ) : visible.map((trip) => {
            const segs = Array.isArray(trip.AvailabilitySegments) ? trip.AvailabilitySegments : []
            return (
              <div key={trip.ID} className="bg-white/[0.02] border border-white/8 rounded-xl overflow-hidden">
                {/* Trip header */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/5">
                  <div>
                    <span className="text-base font-mono font-bold text-white">{fmtTime(trip.DepartsAt)}</span>
                    <span className="text-white/20 mx-1.5">→</span>
                    <span className="text-base font-mono font-bold text-white">{fmtTime(trip.ArrivesAt)}</span>
                  </div>
                  <span className="text-xs text-white/30">{fmtDuration(trip.TotalDuration)}</span>
                  <span className={`text-xs font-medium ml-auto ${trip.Stops === 0 ? 'text-emerald-400/70' : 'text-white/30'}`}>
                    {trip.Stops === 0 ? 'Direct' : `${trip.Stops} stop`}
                  </span>
                  {trip.RemainingSeats > 0 && trip.RemainingSeats <= 4 && (
                    <span className="text-xs text-amber-400/80">{trip.RemainingSeats} left</span>
                  )}
                </div>

                {/* Segments */}
                <div className="divide-y divide-white/5">
                  {segs.map((seg, si) => {
                    const prev = si > 0 ? segs[si - 1] : null
                    const layoverMins = prev
                      ? Math.round((new Date(seg.DepartsAt).getTime() - new Date(prev.ArrivesAt).getTime()) / 60000)
                      : 0
                    return (
                      <div key={seg.ID ?? si}>
                        {si > 0 && layoverMins > 0 && (
                          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.01]">
                            <span className="text-xs text-amber-400/50">⏱ Layover in {prev!.DestinationAirport} — {fmtDuration(layoverMins)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xs font-mono font-bold text-indigo-300/80 w-14 shrink-0">{seg.FlightNumber}</span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <div className="shrink-0 text-center w-12">
                              <div className="text-sm font-mono font-bold text-white">{seg.OriginAirport}</div>
                              <div className="text-[11px] text-white/35">{fmtTime(seg.DepartsAt)}</div>
                            </div>
                            <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0 px-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-white/20">{fmtDuration(seg.Duration)}</span>
                                {seg.AircraftName && (
                                  <span className="text-[10px] font-semibold text-white/35 bg-white/5 px-1 rounded">
                                    {shortAircraft(seg.AircraftName)}
                                  </span>
                                )}
                              </div>
                              <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="shrink-0 text-center w-12">
                              <div className="text-sm font-mono font-bold text-white">{seg.DestinationAirport}</div>
                              <div className="text-[11px] text-white/35">{fmtTime(seg.ArrivesAt)}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-white/20 shrink-0 uppercase">{seg.Cabin}</span>
                          <SeatMapButton flightNumber={seg.FlightNumber} aircraftName={seg.AircraftName} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {totalTripPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setTripPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1">
                ← Prev
              </button>
              <span className="text-xs text-white/20">{clampedPage + 1} / {totalTripPages}</span>
              <button
                onClick={() => setTripPage((p) => Math.min(totalTripPages - 1, p + 1))}
                disabled={clampedPage === totalTripPages - 1}
                className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1">
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/20">No flight details available</p>
      )}
    </div>
  )
}

interface EnrichedResult extends AvailabilityResult {
  recommendation?: Recommendation
}

interface Props {
  results: AvailabilityResult[]
  recommendations?: Recommendation[]
  filters: TableFilters
  onFiltersChange: (f: TableFilters) => void
}

export function ResultsTable({ results, recommendations, filters, onFiltersChange }: Props) {
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever filters or sort changes
  useEffect(() => { setPage(0) }, [
    filters.program, filters.airline, filters.cabin, filters.directOnly,
    filters.dateFrom, filters.dateTo, filters.sort, filters.sortDir,
  ])

  const update = (patch: Partial<TableFilters>) => onFiltersChange({ ...filters, ...patch })

  function handleSortClick(k: SortKey) {
    if (filters.sort === k) {
      update({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      update({ sort: k, sortDir: 'asc' })
    }
  }

  const enriched: EnrichedResult[] = useMemo(() => {
    const recMap = new Map((recommendations ?? []).map((r) => [r.result.id, r]))
    return results.map((r) => ({ ...r, recommendation: recMap.get(r.id) }))
  }, [results, recommendations])

  const programs = useMemo(() => [...new Set(enriched.map((r) => r.source))].sort(), [enriched])
  const airlines  = useMemo(() => [...new Set(enriched.flatMap((r) => r.airlines))].filter(Boolean).sort(), [enriched])
  const cabins    = useMemo(() => [...new Set(enriched.map((r) => r.cabin))].sort(), [enriched])

  const filtered = enriched.filter((r) => {
    if (filters.program && r.source !== filters.program) return false
    if (filters.airline && !r.airlines.includes(filters.airline)) return false
    if (filters.cabin && r.cabin !== filters.cabin) return false
    if (filters.directOnly && r.stops !== 0) return false
    if (filters.dateFrom && r.date < filters.dateFrom) return false
    if (filters.dateTo && r.date > filters.dateTo) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (filters.sort === 'date') {
      cmp = a.date.localeCompare(b.date)
    } else if (filters.sort === 'taxesCashGbp') {
      cmp = (a.taxesCashGbp ?? 9999) - (b.taxesCashGbp ?? 9999)
    } else {
      // pointsCost: secondary sort by verdict, then points, then direct first
      const verdictOrder = { recommended: 0, consider: 1, avoid: 2 }
      const av = a.recommendation?.verdict, bv = b.recommendation?.verdict
      if (av !== bv) {
        cmp = (verdictOrder[av as keyof typeof verdictOrder] ?? 3) - (verdictOrder[bv as keyof typeof verdictOrder] ?? 3)
      } else {
        const pointsDiff = a.pointsCost - b.pointsCost
        cmp = pointsDiff !== 0 ? pointsDiff : a.stops - b.stops
      }
    }
    return filters.sortDir === 'desc' ? -cmp : cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const hasFilters = filters.program || filters.airline || filters.cabin || filters.directOnly || filters.dateFrom || filters.dateTo

  function SortTh({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) {
    const active = filters.sort === k
    const arrow = active ? (filters.sortDir === 'asc' ? '↑' : '↓') : ''
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition whitespace-nowrap ${active ? 'text-white' : 'text-white/25 hover:text-white/50'} ${className}`}
        onClick={() => handleSortClick(k)}
      >
        {label}{active ? ` ${arrow}` : ''}
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {programs.map((p) => {
          const label = enriched.find((r) => r.source === p)?.programName ?? p
          const active = filters.program === p
          return (
            <button key={p} onClick={() => update({ program: active ? null : p })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer font-medium ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}>
              {label}
            </button>
          )
        })}

        {airlines.length > 1 && <>
          <div className="w-px h-4 bg-white/10" />
          {airlines.map((a) => {
            const active = filters.airline === a
            return (
              <span key={a} className="relative group/chip">
                <button onClick={() => update({ airline: active ? null : a })}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition cursor-pointer font-semibold ${active ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
                  {a}
                </button>
                {AIRLINE_NAMES[a] && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-[var(--app-tooltip)] border border-white/10 text-white/80 rounded-lg whitespace-nowrap opacity-0 group-hover/chip:opacity-100 transition-opacity duration-150 z-20 shadow-lg">
                    {AIRLINE_NAMES[a]}
                  </span>
                )}
              </span>
            )
          })}
        </>}

        {cabins.length > 1 && <>
          <div className="w-px h-4 bg-white/10" />
          {cabins.map((c) => {
            const active = filters.cabin === c
            return (
              <button key={c} onClick={() => update({ cabin: active ? null : c })}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer capitalize ${active ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
                {c}
              </button>
            )
          })}
        </>}

        <div className="w-px h-4 bg-white/10" />
        <button
          onClick={() => update({ directOnly: !filters.directOnly })}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer font-medium ${filters.directOnly ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
          Direct only
        </button>

        {(filters.dateFrom || filters.dateTo) && (
          <button onClick={() => update({ dateFrom: null, dateTo: null })}
            className="text-xs px-2.5 py-1.5 rounded-lg border bg-violet-500/20 border-violet-500/40 text-violet-300 transition cursor-pointer font-medium">
            {filters.dateFrom && filters.dateTo ? `${filters.dateFrom} – ${filters.dateTo}` : filters.dateFrom ?? filters.dateTo} ×
          </button>
        )}

        {hasFilters && (
          <button onClick={() => update({ program: null, airline: null, cabin: null, directOnly: false, dateFrom: null, dateTo: null })}
            className="text-xs text-white/30 hover:text-white/60 transition cursor-pointer">
            × clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-white/20">{filtered.length} of {results.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-white/5">
          {paginated.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/20 text-sm">No results match the current filters.</div>
          ) : paginated.map((r) => {
            const rec = r.recommendation
            const isExpanded = filters.expanded === r.id
            const isHighlighted = filters.highlighted.includes(r.id)
            return (
              <Fragment key={r.id}>
                <div
                  onClick={() => update({ expanded: isExpanded ? null : r.id })}
                  className={`px-4 py-3.5 cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.04]' : isHighlighted ? 'bg-indigo-500/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {rec ? (
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${VERDICT_DOT[rec.verdict]}`} style={{ boxShadow: VERDICT_GLOW[rec.verdict] }} />
                      ) : recommendations === undefined ? (
                        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse shrink-0 mt-1" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/10 shrink-0 mt-1" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/80 truncate">{r.programName}</div>
                        {rec && <div className={`text-xs ${VERDICT_TEXT[rec.verdict]}`}>{VERDICT_LABEL[rec.verdict]}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-white tabular-nums">{r.pointsCost.toLocaleString()} <span className="text-xs font-normal text-white/30">pts</span></div>
                      {r.taxesCashGbp != null && <div className="text-xs text-white/40">+£{r.taxesCashGbp} taxes</div>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-white">{r.originAirport} <span className="text-white/25">→</span> {r.destinationAirport}</span>
                    <span className="text-white/20 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-xs text-white/30">{r.date}</span>
                    <span className="text-white/15">·</span>
                    <span className="text-xs text-white/25 capitalize">{r.cabin}</span>
                    <span className="text-white/15">·</span>
                    <span className={`text-xs font-medium ${r.stops === 0 ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                      {r.stops === 0 ? 'Direct' : `${r.stops}+ stop`}
                    </span>
                    {r.remainingSeats != null && r.remainingSeats <= 2 && (
                      <span className="text-xs text-amber-400 ml-auto">{r.remainingSeats} left</span>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="bg-white/[0.03] border-t border-white/5 px-4 py-4">
                    <ExpandedRow result={r} rec={rec} />
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse">
            <colgroup>
              <col className="w-8" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-16" />
              <col className="w-8" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Program</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Route</th>
                <SortTh label="Date" k="date" />
                <SortTh label="Points" k="pointsCost" className="text-right" />
                <SortTh label="Taxes" k="taxesCashGbp" className="text-right" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Airlines</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/25">Seats</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-white/20 text-sm">No results match the current filters.</td>
                </tr>
              ) : paginated.map((r) => {
                const rec = r.recommendation
                const isExpanded = filters.expanded === r.id
                const isHighlighted = filters.highlighted.includes(r.id)

                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => update({ expanded: isExpanded ? null : r.id })}
                      className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.04]' : isHighlighted ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      {/* Verdict dot */}
                      <td className="px-4 py-4 w-8">
                        <div className="flex justify-center">
                          {rec ? (
                            <div className={`w-2 h-2 rounded-full shrink-0 ${VERDICT_DOT[rec.verdict]}`}
                              style={{ boxShadow: VERDICT_GLOW[rec.verdict] }} />
                          ) : recommendations === undefined ? (
                            <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white/10" />
                          )}
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-white/80 truncate max-w-[180px]">{r.programName}</div>
                        {rec && <div className={`text-xs font-medium mt-0.5 ${VERDICT_TEXT[rec.verdict]}`}>{VERDICT_LABEL[rec.verdict]}</div>}
                      </td>

                      {/* Route */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono font-bold text-white whitespace-nowrap">
                          {r.originAirport} <span className="text-white/25">→</span> {r.destinationAirport}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-white/60 whitespace-nowrap">{r.date}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-white/25 capitalize">{r.cabin}</span>
                          <span className="text-white/15">·</span>
                          <span className={`text-xs font-medium ${r.stops === 0 ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                            {r.stops === 0 ? 'Direct' : `${r.stops}+ stop`}
                          </span>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-bold text-white tabular-nums">{r.pointsCost.toLocaleString()}</div>
                        <div className="text-xs text-white/25">pts</div>
                      </td>

                      {/* Taxes */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-semibold text-white/60 tabular-nums">{r.taxesCashGbp != null ? `£${r.taxesCashGbp}` : '—'}</div>
                      </td>

                      {/* Airlines */}
                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {r.airlines.map((a) => (
                            <span key={a} className="relative group/airline">
                              <span className="text-xs font-mono font-bold bg-white/8 text-white/50 px-1.5 py-0.5 rounded cursor-default">{a}</span>
                              {AIRLINE_NAMES[a] && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-[var(--app-tooltip)] border border-white/10 text-white/80 rounded-lg whitespace-nowrap opacity-0 group-hover/airline:opacity-100 transition-opacity duration-150 z-20 shadow-lg">
                                  {AIRLINE_NAMES[a]}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-semibold ${r.remainingSeats != null && r.remainingSeats <= 2 ? 'text-amber-400' : 'text-white/25'}`}>
                          {r.remainingSeats ?? '—'}
                        </span>
                      </td>

                      {/* Expand */}
                      <td className="px-3 py-4 text-white/20 text-xs text-center">{isExpanded ? '▲' : '▼'}</td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${r.id}-expanded`} className="bg-white/[0.03] border-b border-white/5">
                        <td colSpan={9} className="px-6 py-5">
                          <ExpandedRow result={r} rec={rec} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1"
            >
              ← Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 rounded-lg text-xs transition cursor-pointer ${i === page ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-white/25 hover:text-white/50 hover:bg-white/5'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
