import { useEffect, useRef, useState } from 'react'

const QUERY = 'Business class London to Tokyo in March'

const RESULTS = [
  { prog: 'Emirates Skywards', origin: 'LHR', dest: 'NRT', pts: '85,000', taxes: '£42', stops: 0, dur: '12h 20m', cabin: 'Business', date: '15 Mar', airlines: ['EK'], verdict: 'recommended' },
  { prog: 'Avios (British Airways)', origin: 'LHR', dest: 'HND', pts: '97,500', taxes: '£338', stops: 0, dur: '11h 35m', cabin: 'Business', date: '15 Mar', airlines: ['BA'], verdict: 'consider' },
  { prog: 'Flying Blue', origin: 'LHR', dest: 'NRT', pts: '106,000', taxes: '£269', stops: 1, dur: '14h 40m', cabin: 'Business', date: '15 Mar', airlines: ['AF', 'KL'], verdict: 'avoid' },
]

const SEGMENTS = [
  { fn: 'EK 007', from: 'LHR', to: 'DXB', dep: '21:40', arr: '08:15', dur: '6h 35m', ac: 'A380' },
  { fn: 'EK 319', from: 'DXB', to: 'NRT', dep: '10:05', arr: '23:25', dur: '9h 20m', ac: '777' },
]

const ADVICE = 'Emirates offers the best value: direct route, lowest fees, and 4+ seats available on most March dates. Avios is pricey due to fuel surcharges. Avoid Flying Blue — £269 taxes is poor value on this route.'

const CHAT = [
  { role: 'user' as const, text: 'Can I use Amex points for the Emirates flight?' },
  { role: 'ai' as const, text: 'Yes — Amex MR transfers to Emirates Skywards at 1:1. So 85,000 Amex points covers this flight, usually instantly.' },
  { role: 'user' as const, text: 'What about Chase points instead?' },
  { role: 'ai' as const, text: 'Chase UR also transfers at 1:1. Same 85k points — go with whichever balance is higher.' },
]

const SEATS = [
  ['t','t','a','a'],
  ['t','t','t','t'],
  ['a','a','a','t'],
  ['t','a','t','t'],
  ['a','a','a','a'],
]

const VERDICT_DOT: Record<string, string> = {
  recommended: 'bg-emerald-400', consider: 'bg-amber-400', avoid: 'bg-red-400',
}
const VERDICT_GLOW: Record<string, string> = {
  recommended: '0 0 7px rgba(52,211,153,0.8)',
  consider: '0 0 7px rgba(251,191,36,0.8)',
  avoid: '0 0 7px rgba(248,113,113,0.8)',
}
const VERDICT_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  recommended: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', label: 'Recommended' },
  consider:    { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', label: 'Consider' },
  avoid:       { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Avoid' },
}

const PHASE_MS = [
  QUERY.length * 48 + 300,
  1300, 800, 700, 2000, 500, 850, 1800, 500, 850, 1800,
  2200, 700, 2800, 400, 700, 3500, 1000,
]

function useIsLight() {
  const [isLight, setIsLight] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsLight(document.documentElement.classList.contains('light'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isLight
}

function AiDots() {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#84cc16,#22c55e)' }}>
        <span className="text-white text-[7px] font-black">AI</span>
      </div>
      <div className="px-3 py-2.5 rounded-xl rounded-tl-sm flex gap-1" style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.15)' }}>
        {[0,120,240].map(d => <span key={d} className="w-1 h-1 rounded-full bg-lime-400/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
      </div>
    </div>
  )
}

function AiMsg({ text, isLight }: { text: string; isLight: boolean }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#84cc16,#22c55e)' }}>
        <span className="text-white text-[7px] font-black">AI</span>
      </div>
      <div className="text-[11px] px-3 py-2 rounded-xl rounded-tl-sm leading-relaxed max-w-[88%]"
        style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)', color: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)' }}>
        {text}
      </div>
    </div>
  )
}

export function DemoAnimation() {
  const isLight = useIsLight()

  const [phase, setPhase] = useState(0)
  const [typedLen, setTypedLen] = useState(0)
  const [visibleCards, setVisibleCards] = useState(0)
  const [showAdvice, setShowAdvice] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [showUserMsg1, setShowUserMsg1] = useState(false)
  const [showAiDots1, setShowAiDots1] = useState(false)
  const [showAiMsg1, setShowAiMsg1] = useState(false)
  const [showUserMsg2, setShowUserMsg2] = useState(false)
  const [showAiDots2, setShowAiDots2] = useState(false)
  const [showAiMsg2, setShowAiMsg2] = useState(false)
  const [hlSeatMap, setHlSeatMap] = useState(false)
  const [showSeatMap, setShowSeatMap] = useState(false)
  const [hlBook, setHlBook] = useState(false)
  const [showBooking, setShowBooking] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const expandedRef = useRef<HTMLDivElement>(null)
  const userMsg1Ref = useRef<HTMLDivElement>(null)
  const aiMsg1Ref = useRef<HTMLDivElement>(null)
  const userMsg2Ref = useRef<HTMLDivElement>(null)
  const aiMsg2Ref = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Theme
  const t = {
    scrollBg:    isLight ? 'rgba(237,232,223,0.97)' : 'rgba(12,11,16,0.7)',
    chromeBg:    isLight ? 'rgba(0,0,0,0.04)'       : 'rgba(255,255,255,0.05)',
    chromeBdr:   isLight ? 'rgba(0,0,0,0.08)'        : 'rgba(255,255,255,0.07)',
    cardBg:      isLight ? '#ffffff'                 : 'rgba(255,255,255,0.06)',
    cardBdr:     isLight ? 'rgba(0,0,0,0.08)'        : 'rgba(255,255,255,0.10)',
    divider:     isLight ? 'rgba(0,0,0,0.07)'        : 'rgba(255,255,255,0.08)',
    inputBg:     isLight ? 'rgba(0,0,0,0.04)'        : 'rgba(255,255,255,0.07)',
    raisedBg:    isLight ? 'rgba(0,0,0,0.03)'        : 'rgba(255,255,255,0.03)',
    chipBg:      isLight ? 'rgba(0,0,0,0.06)'        : 'rgba(255,255,255,0.08)',
    text80:      isLight ? 'rgba(0,0,0,0.82)'        : 'rgba(255,255,255,0.82)',
    text60:      isLight ? 'rgba(0,0,0,0.60)'        : 'rgba(255,255,255,0.60)',
    text40:      isLight ? 'rgba(0,0,0,0.40)'        : 'rgba(255,255,255,0.40)',
    text30:      isLight ? 'rgba(0,0,0,0.30)'        : 'rgba(255,255,255,0.30)',
    text20:      isLight ? 'rgba(0,0,0,0.20)'        : 'rgba(255,255,255,0.20)',
    text15:      isLight ? 'rgba(0,0,0,0.15)'        : 'rgba(255,255,255,0.15)',
    userBubble:  isLight ? 'rgba(99,102,241,0.15)'   : 'rgba(99,102,241,0.25)',
    segBg:       isLight ? 'rgba(0,0,0,0.03)'        : 'rgba(255,255,255,0.04)',
    layoverBg:   isLight ? 'rgba(251,191,36,0.12)'   : 'rgba(251,191,36,0.08)',
    advisorBdr:  isLight ? 'rgba(0,0,0,0.06)'        : 'rgba(255,255,255,0.07)',
    acBadge:     isLight ? 'rgba(0,0,0,0.06)'        : 'rgba(255,255,255,0.05)',
    seatModalBg: isLight ? '#f7f4ef'                 : 'rgba(30,28,42,0.98)',
    bookModalBg: isLight ? '#f7f4ef'                 : 'rgba(30,28,42,0.98)',
    overlayBg:   isLight ? 'rgba(237,232,223,0.92)'  : 'rgba(10,9,14,0.85)',
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if (phase < PHASE_MS.length - 1) {
        setPhase(p => p + 1)
      } else {
        setPhase(0); setTypedLen(0); setVisibleCards(0)
        setShowAdvice(false); setShowExpanded(false)
        setShowUserMsg1(false); setShowAiDots1(false); setShowAiMsg1(false)
        setShowUserMsg2(false); setShowAiDots2(false); setShowAiMsg2(false)
        setHlSeatMap(false); setShowSeatMap(false)
        setHlBook(false); setShowBooking(false)
      }
    }, PHASE_MS[phase])
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 0 || typedLen >= QUERY.length) return
    const id = setTimeout(() => setTypedLen(n => n + 1), 48)
    return () => clearTimeout(id)
  }, [phase, typedLen])

  useEffect(() => {
    if (phase !== 2 || visibleCards >= RESULTS.length) return
    const id = setTimeout(() => setVisibleCards(n => n + 1), 250)
    return () => clearTimeout(id)
  }, [phase, visibleCards])

  useEffect(() => { if (phase >= 3) setShowAdvice(true) }, [phase])
  useEffect(() => { if (phase >= 4) setShowExpanded(true) }, [phase])
  useEffect(() => { if (phase >= 5) setShowUserMsg1(true) }, [phase])
  useEffect(() => { if (phase >= 6) setShowAiDots1(true) }, [phase])
  useEffect(() => { if (phase >= 7) { setShowAiDots1(false); setShowAiMsg1(true) } }, [phase])
  useEffect(() => { if (phase >= 8) setShowUserMsg2(true) }, [phase])
  useEffect(() => { if (phase >= 9) setShowAiDots2(true) }, [phase])
  useEffect(() => { if (phase >= 10) { setShowAiDots2(false); setShowAiMsg2(true) } }, [phase])
  useEffect(() => { if (phase >= 12) setHlSeatMap(true) }, [phase])
  useEffect(() => { if (phase >= 13) setShowSeatMap(true) }, [phase])
  useEffect(() => { if (phase >= 14) setShowSeatMap(false) }, [phase])
  useEffect(() => { if (phase >= 15) { setHlSeatMap(false); setHlBook(true) } }, [phase])
  useEffect(() => { if (phase >= 16) { setHlBook(false); setShowBooking(true) } }, [phase])

  useEffect(() => {
    if (phase === 0) scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [phase])
  useEffect(() => {
    if (!showExpanded) return
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 400)
    return () => clearTimeout(id)
  }, [showExpanded])
  useEffect(() => {
    if (!showUserMsg1) return
    const id = setTimeout(() => userMsg1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150)
    return () => clearTimeout(id)
  }, [showUserMsg1])
  useEffect(() => {
    if (!showAiMsg1) return
    const id = setTimeout(() => aiMsg1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350)
    return () => clearTimeout(id)
  }, [showAiMsg1])
  useEffect(() => {
    if (!showUserMsg2) return
    const id = setTimeout(() => userMsg2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150)
    return () => clearTimeout(id)
  }, [showUserMsg2])
  useEffect(() => {
    if (!showAiMsg2) return
    const id = setTimeout(() => aiMsg2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350)
    return () => clearTimeout(id)
  }, [showAiMsg2])
  useEffect(() => {
    if (phase !== 11) return
    const id = setTimeout(() => expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 700)
    return () => clearTimeout(id)
  }, [phase])

  const showResults = phase >= 2

  function fade(visible: boolean) {
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }
  }

  return (
    <div className="w-full select-none relative overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Browser chrome */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: t.chromeBg, borderBottom: `1px solid ${t.chromeBdr}` }}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
        <div className="flex-1 mx-4 h-5 rounded-full flex items-center px-3" style={{ background: t.inputBg }}>
          <span className="text-[10px]" style={{ color: t.text30 }}>milescout.app</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto" style={{ background: t.scrollBg, maxHeight: '460px', scrollbarWidth: 'none' }}>

        {/* Search box */}
        <div className="rounded-xl overflow-hidden" style={{
          background: t.inputBg,
          border: `1px solid ${phase === 0 ? '#6366f1' : t.cardBdr}`,
          boxShadow: phase === 0 ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          <div className="px-4 pt-3.5 pb-2 text-sm min-h-[46px]" style={{ color: typedLen > 0 ? t.text80 : t.text20 }}>
            {typedLen > 0 ? QUERY.slice(0, typedLen) : 'e.g. Business class London to Tokyo…'}
            {phase === 0 && typedLen > 0 && <span className="inline-block w-px h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-middle" />}
          </div>
          <div className="flex justify-end px-4 pb-3">
            <button className="text-[11px] font-bold px-4 py-1.5 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: typedLen > 0 ? 1 : 0.25, transition: 'opacity 0.3s' }}>
              Search →
            </button>
          </div>
        </div>

        {/* Spinner */}
        {phase === 1 && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping" />
              <div className="absolute inset-1.5 rounded-full bg-indigo-500/20 animate-pulse" />
            </div>
            <p className="text-[11px]" style={{ color: t.text40 }}>Searching award availability…</p>
          </div>
        )}

        {showResults && (
          <div className="space-y-3">

            {/* AI Advisor */}
            <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBdr}` }}>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: t.advisorBdr }}>
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400" style={{ boxShadow: '0 0 5px rgba(163,230,53,0.9)' }} />
                <span className="text-[10px] font-bold text-lime-500 uppercase tracking-wider">AI Advisor</span>
              </div>
              <div className="px-3.5 py-3 border-b" style={{ borderColor: t.advisorBdr, ...fade(showAdvice) }}>
                <p className="text-[11px] leading-relaxed" style={{ color: t.text60 }}>{ADVICE}</p>
              </div>
              <div className="px-3.5 py-3 space-y-2.5">
                <div ref={userMsg1Ref} style={fade(showUserMsg1)}>
                  <div className="flex justify-end">
                    <div className="text-[11px] px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%]"
                      style={{ background: t.userBubble, color: t.text80 }}>
                      {CHAT[0].text}
                    </div>
                  </div>
                </div>
                {showAiDots1 && !showAiMsg1 && <AiDots />}
                <div ref={aiMsg1Ref} style={fade(showAiMsg1)}><AiMsg text={CHAT[1].text} isLight={isLight} /></div>
                <div ref={userMsg2Ref} style={fade(showUserMsg2)}>
                  <div className="flex justify-end">
                    <div className="text-[11px] px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%]"
                      style={{ background: t.userBubble, color: t.text80 }}>
                      {CHAT[2].text}
                    </div>
                  </div>
                </div>
                {showAiDots2 && !showAiMsg2 && <AiDots />}
                <div ref={aiMsg2Ref} style={fade(showAiMsg2)}><AiMsg text={CHAT[3].text} isLight={isLight} /></div>
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: t.advisorBdr }}>
                  <span className="flex-1 text-[10px]" style={{ color: t.text20 }}>Ask anything…</span>
                  <span className="text-[10px] font-bold text-lime-500/70">Ask →</span>
                </div>
              </div>
            </div>

            {/* Result cards */}
            {RESULTS.map((r, i) => {
              const badge = VERDICT_BADGE[r.verdict]
              const isFirst = i === 0
              return (
                <div key={r.prog} style={fade(visibleCards > i)}>
                  <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBdr}` }}>
                    <div className="flex">
                      {/* Left */}
                      <div className="flex-1 min-w-0 p-3">
                        {/* Program + verdict */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${VERDICT_DOT[r.verdict]}`}
                            style={{ boxShadow: VERDICT_GLOW[r.verdict] }} />
                          <span className="text-[11px] font-bold truncate" style={{ color: t.text80 }}>{r.prog}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Route */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base font-black font-mono" style={{ color: t.text80 }}>{r.origin}</span>
                          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                            <span className="text-[9px]" style={{ color: t.text30 }}>{r.dur}</span>
                            <div className="w-full flex items-center gap-0.5">
                              <div className="flex-1 border-t" style={{ borderColor: t.divider }} />
                              {r.stops > 0 && <div className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />}
                              <div className="flex-1 border-t" style={{ borderColor: t.divider }} />
                              <span className="text-[8px]" style={{ color: t.text30 }}>✈</span>
                            </div>
                            <span className={`text-[9px] font-semibold ${r.stops === 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                              {r.stops === 0 ? 'Direct' : `${r.stops} stop`}
                            </span>
                          </div>
                          <span className="text-base font-black font-mono" style={{ color: t.text80 }}>{r.dest}</span>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px]" style={{ color: t.text30 }}>{r.date}</span>
                          <span className="text-[9px]" style={{ color: t.text15 }}>·</span>
                          <span className="text-[9px]" style={{ color: t.text30 }}>{r.cabin}</span>
                          <span className="text-[9px]" style={{ color: t.text15 }}>·</span>
                          {r.airlines.map(a => (
                            <span key={a} className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                              style={{ background: t.chipBg, color: t.text40 }}>{a}</span>
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px shrink-0" style={{ background: t.divider }} />

                      {/* Right */}
                      <div className="flex flex-col justify-between p-3 w-24 shrink-0">
                        <div>
                          <div className="text-base font-black tabular-nums leading-none" style={{ color: t.text80 }}>{r.pts}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: t.text30 }}>pts</div>
                          <div className="text-[9px] mt-1" style={{ color: t.text40 }}>+ {r.taxes}</div>
                        </div>
                        <button className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white mt-2"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                          {isFirst && showExpanded ? 'Close ↑' : 'View →'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details for first card */}
                    {isFirst && (
                      <div style={{ maxHeight: showExpanded ? '280px' : '0', overflow: 'hidden', transition: 'max-height 0.5s ease' }}>
                        <div ref={expandedRef} className="border-t px-3 py-3 space-y-2"
                          style={{ borderColor: t.cardBdr, background: t.raisedBg }}>
                          {/* Book button */}
                          <div className="flex items-center gap-2 mb-2">
                            <button className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: hlBook ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: hlBook ? '0 0 12px rgba(34,197,94,0.5)' : 'none', transition: 'background 0.3s, box-shadow 0.3s' }}>
                              Book via Emirates →
                            </button>
                            <span className="text-[9px] px-2 py-1 rounded-lg" style={{ color: t.text30, background: t.chipBg }}>skywards.com</span>
                          </div>

                          {/* Segments */}
                          {SEGMENTS.map((seg, si) => (
                            <div key={seg.fn}>
                              {si > 0 && (
                                <div className="flex items-center gap-1.5 py-1 px-2 mb-1 rounded-lg" style={{ background: t.layoverBg }}>
                                  <span className="text-[9px] text-amber-500">⏱ Layover Dubai — 1h 50m</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: t.segBg }}>
                                <span className="text-[9px] font-mono font-bold text-indigo-400 w-10 shrink-0">{seg.fn}</span>
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  <div className="text-center shrink-0">
                                    <div className="text-[11px] font-mono font-bold" style={{ color: t.text80 }}>{seg.from}</div>
                                    <div className="text-[9px]" style={{ color: t.text30 }}>{seg.dep}</div>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                                    <span className="text-[9px]" style={{ color: t.text20 }}>{seg.dur}</span>
                                    <div className="w-full border-t" style={{ borderColor: t.divider }} />
                                  </div>
                                  <div className="text-center shrink-0">
                                    <div className="text-[11px] font-mono font-bold" style={{ color: t.text80 }}>{seg.to}</div>
                                    <div className="text-[9px]" style={{ color: t.text30 }}>{seg.arr}</div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                                  style={{ background: t.acBadge, color: t.text40 }}>{seg.ac}</span>
                                {si === 0 && (
                                  <span className="text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 transition-all"
                                    style={{
                                      background: hlSeatMap ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.15)',
                                      color: hlSeatMap ? '#c4b5fd' : '#a78bfa',
                                      border: `1px solid ${hlSeatMap ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.3)'}`,
                                      boxShadow: hlSeatMap ? '0 0 10px rgba(139,92,246,0.4)' : 'none',
                                      transition: 'all 0.3s',
                                    }}>
                                    Seat map
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Seat map overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-20"
        style={{
          background: t.overlayBg,
          backdropFilter: 'blur(6px)',
          opacity: showSeatMap ? 1 : 0,
          pointerEvents: showSeatMap ? 'auto' : 'none',
          transition: 'opacity 0.35s ease',
        }}>
        <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: t.seatModalBg, border: `1px solid ${isLight ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.3)'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.cardBdr }}>
            <div>
              <p className="text-[11px] font-bold" style={{ color: t.text80 }}>EK 007 · LHR → DXB</p>
              <p className="text-[9px] mt-0.5" style={{ color: t.text40 }}>A380 Upper Deck · Business</p>
            </div>
            <span className="text-sm cursor-pointer" style={{ color: t.text40 }}>×</span>
          </div>
          <div className="px-4 py-4">
            <div className="flex justify-center gap-6 mb-3">
              <span className="text-[9px]" style={{ color: t.text30 }}>A · B</span>
              <span className="text-[9px]" style={{ color: t.text30 }}>D · E</span>
            </div>
            <div className="space-y-2">
              {SEATS.map((row, ri) => (
                <div key={ri} className="flex items-center justify-center gap-6">
                  {[row.slice(0,2), row.slice(2,4)].map((pair, pi) => (
                    <div key={pi} className="flex gap-1.5">
                      {pair.map((s, ci) => (
                        <div key={ci} className="w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-bold"
                          style={{ background: s === 'a' ? 'rgba(52,211,153,0.2)' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'), border: `1px solid ${s === 'a' ? 'rgba(52,211,153,0.5)' : t.divider}`, color: s === 'a' ? '#34d399' : t.text20 }}>
                          {s === 'a' ? '○' : '✕'}
                        </div>
                      ))}
                    </div>
                  )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key="num" className="text-[8px] w-4 text-center" style={{ color: t.text15 }}>{ri + 1}</span>, el], [] as React.ReactNode[])}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 justify-center">
              <span className="flex items-center gap-1 text-[9px]" style={{ color: t.text40 }}><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/20 border border-emerald-400/50 inline-block" /> Available</span>
              <span className="flex items-center gap-1 text-[9px]" style={{ color: t.text40 }}><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', border: `1px solid ${t.divider}` }} /> Taken</span>
            </div>
          </div>
          <div className="px-4 pb-4">
            <a className="block text-center text-[10px] text-violet-500/70">View full map on seatmaps.com →</a>
          </div>
        </div>
      </div>

      {/* Emirates booking overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-20"
        style={{
          background: t.overlayBg,
          backdropFilter: 'blur(6px)',
          opacity: showBooking ? 1 : 0,
          pointerEvents: showBooking ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
        }}>
        <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: t.bookModalBg, border: `1px solid ${isLight ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.25)'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: t.cardBdr, background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#c8102e,#8b0000)' }}>EK</div>
            <div>
              <p className="text-[11px] font-bold" style={{ color: t.text80 }}>Emirates Skywards</p>
              <p className="text-[9px]" style={{ color: t.text40 }}>Award booking confirmation</p>
            </div>
          </div>
          <div className="px-4 pt-3 pb-2 space-y-1.5">
            {SEGMENTS.map((seg, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: t.segBg }}>
                <span className="text-[9px] font-mono font-bold text-indigo-400 w-12 shrink-0">{seg.fn}</span>
                <span className="text-[10px] font-bold" style={{ color: t.text80 }}>{seg.from}</span>
                <span className="text-[9px] flex-1 text-center" style={{ color: t.text30 }}>→</span>
                <span className="text-[10px] font-bold" style={{ color: t.text80 }}>{seg.to}</span>
                <span className="text-[9px]" style={{ color: t.text40 }}>{seg.dep}</span>
              </div>
            ))}
            <p className="text-[9px] pl-1 pt-0.5" style={{ color: t.text30 }}>15 March 2026 · Business Class · 1 passenger</p>
          </div>
          <div className="mx-4 my-2 rounded-xl overflow-hidden" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
              <span className="text-[10px]" style={{ color: t.text40 }}>Skywards miles</span>
              <span className="text-[11px] font-bold" style={{ color: t.text80 }}>85,000 pts</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
              <span className="text-[10px]" style={{ color: t.text40 }}>Taxes & fees</span>
              <span className="text-[11px] font-bold" style={{ color: t.text80 }}>£42.00</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px]" style={{ color: t.text30 }}>Balance after</span>
              <span className="text-[10px] text-emerald-500">102,500 miles</span>
            </div>
          </div>
          <div className="px-4 pb-4 pt-2">
            <button className="w-full py-2.5 rounded-xl text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              Confirm with Skywards Miles →
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
