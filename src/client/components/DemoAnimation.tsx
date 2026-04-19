import { useEffect, useRef, useState } from 'react'

const QUERY = 'Business class London to Tokyo in March'

const RESULTS = [
  { prog: 'Emirates Skywards', route: 'LHR → NRT', pts: '85,000', taxes: '£42', stops: 'Direct', cabin: 'Business', verdict: 'recommended' },
  { prog: 'Avios (British Airways)', route: 'LHR → HND', pts: '97,500', taxes: '£338', stops: 'Direct', cabin: 'Business', verdict: 'consider' },
  { prog: 'Flying Blue', route: 'LHR → NRT', pts: '106,000', taxes: '£269', stops: '1 stop', cabin: 'Business', verdict: 'avoid' },
]

const SEGMENTS = [
  { fn: 'EK 007', from: 'LHR', to: 'DXB', dep: '21:40', arr: '08:15', dur: '6h 35m', ac: 'A380' },
  { fn: 'EK 319', from: 'DXB', to: 'NRT', dep: '10:05', arr: '23:25', dur: '9h 20m', ac: '777' },
]

const ADVICE = 'Emirates offers the best value: direct route, lowest fees, and 4+ seats available on most March dates. Avios is pricey due to fuel surcharges. Avoid Flying Blue — £269 taxes is poor value for economy-distance routing.'

const CHAT: { role: 'user' | 'ai'; text: string }[] = [
  { role: 'user', text: 'Can I use Amex points for the Emirates flight?' },
  { role: 'ai', text: 'Yes — Amex Membership Rewards transfers to Emirates Skywards at 1:1. So 85,000 Amex MR points covers this flight, with transfers usually instant.' },
  { role: 'user', text: 'What about using Chase points instead?' },
  { role: 'ai', text: 'Chase Ultimate Rewards transfers to Emirates at 1:1 too. Same 85k points. Both programs work — go with whichever balance is higher.' },
]

const VERDICT_DOT: Record<string, string> = {
  recommended: 'bg-emerald-400',
  consider: 'bg-amber-400',
  avoid: 'bg-red-400',
}
const VERDICT_GLOW: Record<string, string> = {
  recommended: '0 0 7px rgba(52,211,153,0.8)',
  consider: '0 0 7px rgba(251,191,36,0.8)',
  avoid: '0 0 7px rgba(248,113,113,0.8)',
}

// Phases:
// 0  — typing query
// 1  — searching spinner
// 2  — result rows appear one by one
// 3  — AI Analysis slides in
// 4  — row 0 expands showing flight segments
// 5  — chat: user msg 1
// 6  — chat: AI dots 1
// 7  — chat: AI response 1
// 8  — chat: user msg 2
// 9  — chat: AI dots 2
// 10 — chat: AI response 2
// 11 — pause then reset

const PHASE_MS = [
  QUERY.length * 48 + 300, // 0
  1300,                     // 1
  800,                      // 2
  700,                      // 3
  2000,                     // 4
  500,                      // 5
  850,                      // 6
  1800,                     // 7
  500,                      // 8
  850,                      // 9
  1800,                     // 10
  3000,                     // 11
]

function AiDots() {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg,#84cc16,#22c55e)' }}>
        <span className="text-white text-[7px] font-black">AI</span>
      </div>
      <div className="px-3 py-2.5 rounded-xl rounded-tl-sm flex gap-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
        {[0, 120, 240].map((d) => (
          <span key={d} className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}

function AiMsg({ text }: { text: string }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg,#84cc16,#22c55e)' }}>
        <span className="text-white text-[7px] font-black">AI</span>
      </div>
      <div className="text-[11px] text-white/65 px-3 py-2 rounded-xl rounded-tl-sm leading-relaxed max-w-[88%]"
        style={{ background: 'rgba(255,255,255,0.07)' }}>
        {text}
      </div>
    </div>
  )
}

export function DemoAnimation() {
  const [phase, setPhase] = useState(0)
  const [typedLen, setTypedLen] = useState(0)
  const [visibleRows, setVisibleRows] = useState(0)
  const [showAdvice, setShowAdvice] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [showUserMsg1, setShowUserMsg1] = useState(false)
  const [showAiDots1, setShowAiDots1] = useState(false)
  const [showAiMsg1, setShowAiMsg1] = useState(false)
  const [showUserMsg2, setShowUserMsg2] = useState(false)
  const [showAiDots2, setShowAiDots2] = useState(false)
  const [showAiMsg2, setShowAiMsg2] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const userMsg1Ref = useRef<HTMLDivElement>(null)
  const aiMsg1Ref = useRef<HTMLDivElement>(null)
  const userMsg2Ref = useRef<HTMLDivElement>(null)
  const aiMsg2Ref = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Phase timer
  useEffect(() => {
    const id = setTimeout(() => {
      if (phase < PHASE_MS.length - 1) {
        setPhase((p) => p + 1)
      } else {
        setPhase(0); setTypedLen(0); setVisibleRows(0)
        setShowAdvice(false); setShowExpanded(false)
        setShowUserMsg1(false); setShowAiDots1(false); setShowAiMsg1(false)
        setShowUserMsg2(false); setShowAiDots2(false); setShowAiMsg2(false)
      }
    }, PHASE_MS[phase])
    return () => clearTimeout(id)
  }, [phase])

  // Typing
  useEffect(() => {
    if (phase !== 0 || typedLen >= QUERY.length) return
    const id = setTimeout(() => setTypedLen((n) => n + 1), 48)
    return () => clearTimeout(id)
  }, [phase, typedLen])

  // Row reveal
  useEffect(() => {
    if (phase !== 2 || visibleRows >= RESULTS.length) return
    const id = setTimeout(() => setVisibleRows((n) => n + 1), 210)
    return () => clearTimeout(id)
  }, [phase, visibleRows])

  useEffect(() => { if (phase >= 3) setShowAdvice(true) }, [phase])
  useEffect(() => { if (phase >= 4) setShowExpanded(true) }, [phase])
  useEffect(() => { if (phase >= 5) setShowUserMsg1(true) }, [phase])
  useEffect(() => { if (phase >= 6) setShowAiDots1(true) }, [phase])
  useEffect(() => { if (phase >= 7) { setShowAiDots1(false); setShowAiMsg1(true) } }, [phase])
  useEffect(() => { if (phase >= 8) setShowUserMsg2(true) }, [phase])
  useEffect(() => { if (phase >= 9) setShowAiDots2(true) }, [phase])
  useEffect(() => { if (phase >= 10) { setShowAiDots2(false); setShowAiMsg2(true) } }, [phase])

  // Auto-scroll: scroll only when AI content arrives, never when user message appears
  // so the user bubble is readable before the view moves.
  useEffect(() => {
    if (phase === 0) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    if (phase === 11) {
      // Scroll back up to show the results table so the viewer ends on the "choice"
      const id = setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600)
      return () => clearTimeout(id)
    }
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

  const showResults = phase >= 2

  function fade(visible: boolean, delay = 0) {
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
    }
  }

  return (
    <div className="w-full select-none overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Browser chrome */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
        <div className="flex-1 mx-4 h-5 rounded-full flex items-center px-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <span className="text-[10px] text-white/25">milescout.app</span>
        </div>
      </div>

      {/* App content — scrollable internally */}
      <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto" style={{ background: 'rgba(12,11,16,0.7)', maxHeight: '460px', scrollbarWidth: 'none' }}>

        {/* Search box */}
        <div className="rounded-xl overflow-hidden" style={{
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${phase === 0 ? '#6366f1' : 'rgba(255,255,255,0.10)'}`,
          boxShadow: phase === 0 ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          <div className="px-4 pt-3.5 pb-2 text-sm min-h-[46px]" style={{ color: typedLen > 0 ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.22)' }}>
            {typedLen > 0 ? QUERY.slice(0, typedLen) : 'e.g. Business class London to Tokyo…'}
            {phase === 0 && typedLen > 0 && <span className="inline-block w-px h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-middle" />}
          </div>
          <div className="flex justify-end px-4 pb-3 gap-2">
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
            <p className="text-[11px] text-white/35">Searching award availability…</p>
          </div>
        )}

        {showResults && (
          <div className="space-y-3">

            {/* AI Advisor chat */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400" style={{ boxShadow: '0 0 5px rgba(163,230,53,0.9)' }} />
                <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider">AI Advisor</span>
              </div>

              {/* AI Analysis */}
              <div className="px-3.5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', ...fade(showAdvice) }}>
                <p className="text-[11px] text-white/55 leading-relaxed">{ADVICE}</p>
              </div>

              {/* Chat messages */}
              <div className="px-3.5 py-3 space-y-2.5">

                {/* Exchange 1 — user */}
                <div ref={userMsg1Ref} style={fade(showUserMsg1)}>
                  <div className="flex justify-end">
                    <div className="text-[11px] text-white/75 px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%]"
                      style={{ background: 'rgba(99,102,241,0.25)' }}>
                      {CHAT[0].text}
                    </div>
                  </div>
                </div>

                {showAiDots1 && !showAiMsg1 && <AiDots />}

                {/* Exchange 1 — AI */}
                <div ref={aiMsg1Ref} style={fade(showAiMsg1)}>
                  <AiMsg text={CHAT[1].text} />
                </div>

                {/* Exchange 2 — user */}
                <div ref={userMsg2Ref} style={fade(showUserMsg2)}>
                  <div className="flex justify-end">
                    <div className="text-[11px] text-white/75 px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%]"
                      style={{ background: 'rgba(99,102,241,0.25)' }}>
                      {CHAT[2].text}
                    </div>
                  </div>
                </div>

                {showAiDots2 && !showAiMsg2 && <AiDots />}

                {/* Exchange 2 — AI */}
                <div ref={aiMsg2Ref} style={fade(showAiMsg2)}>
                  <AiMsg text={CHAT[3].text} />
                </div>

                {/* Input row */}
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="flex-1 text-[10px] text-white/20">Ask anything…</span>
                  <span className="text-[10px] font-bold text-lime-400/60">Ask →</span>
                </div>
              </div>
            </div>

            {/* Results table */}
            <div ref={resultsRef} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3.5 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="w-3" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">Program</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25 text-right">Points</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25 text-right">Taxes</span>
              </div>

              {RESULTS.map((r, i) => (
                <div key={r.prog}>
                  <div
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center px-3.5 py-2.5 border-b"
                    style={{
                      borderColor: 'rgba(255,255,255,0.06)',
                      background: i === 0 && showExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                      ...fade(visibleRows > i),
                    }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${VERDICT_DOT[r.verdict]}`} style={{ boxShadow: VERDICT_GLOW[r.verdict] }} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white/80 truncate">{r.prog}</div>
                      <div className="text-[9px] text-white/30 mt-0.5 font-mono">{r.route} · {r.stops} · {r.cabin}</div>
                    </div>
                    <div className="text-[11px] font-bold text-white tabular-nums">{r.pts}</div>
                    <div className="text-[10px] text-white/45 tabular-nums">{r.taxes}</div>
                  </div>

                  {/* Expanded flight segments for row 0 */}
                  {i === 0 && (
                    <div style={{
                      maxHeight: showExpanded ? '200px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.5s ease',
                    }}>
                      <div className="px-3.5 py-3 space-y-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                        {/* Book button */}
                        <div className="flex items-center gap-2 mb-3">
                          <button className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            Book via Emirates →
                          </button>
                          <span className="text-[9px] text-white/25 bg-white/5 px-2 py-1 rounded-lg">skywards.com</span>
                        </div>

                        {/* Segments */}
                        {SEGMENTS.map((seg, si) => (
                          <div key={seg.fn}>
                            {si > 0 && (
                              <div className="flex items-center gap-1.5 py-1.5 px-2 mb-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)' }}>
                                <span className="text-[9px] text-amber-400/70">⏱ Layover Dubai — 1h 50m</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <span className="text-[9px] font-mono font-bold text-indigo-300/80 w-12 shrink-0">{seg.fn}</span>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div className="text-center shrink-0">
                                  <div className="text-[11px] font-mono font-bold text-white">{seg.from}</div>
                                  <div className="text-[9px] text-white/30">{seg.dep}</div>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                                  <span className="text-[9px] text-white/20">{seg.dur}</span>
                                  <div className="w-full border-t border-white/10" />
                                </div>
                                <div className="text-center shrink-0">
                                  <div className="text-[11px] font-mono font-bold text-white">{seg.to}</div>
                                  <div className="text-[9px] text-white/30">{seg.arr}</div>
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold text-white/35 shrink-0 bg-white/5 px-1.5 py-0.5 rounded">{seg.ac}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
