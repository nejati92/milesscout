import { useState, useRef, useEffect } from 'react'
import { trpc } from '../trpc'
import type { SearchResponse, ReasonResponse } from '../../shared/types'
import type { TableFilters } from './ResultsTable'
import { useVoice } from '../hooks/useVoice'
import { WaveformVisualizer } from './WaveformVisualizer'

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

type FullSearchData = SearchResponse & ReasonResponse

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: {
    type: string
    label: string
    applied: boolean
  }
}

interface Props {
  searchData: FullSearchData | null
  isRefreshing?: boolean
  originalQuery: string
  filters: TableFilters
  onFiltersChange: (f: TableFilters) => void
  onNewSearch: (query: string) => void
  messages: ChatMessage[]
  setMessages: (msgs: ChatMessage[]) => void
}

export function AdvisorChat({ searchData, isRefreshing, originalQuery, filters, onFiltersChange, onNewSearch, messages, setMessages }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ask = trpc.search.ask.useMutation()
  const voice = useVoice((text) => setInput((v) => v ? v + ' ' + text : text))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ask.isPending])

  function activeFiltersSummary(): string {
    const parts: string[] = []
    if (filters.program) parts.push(`program: ${filters.program}`)
    if (filters.airline) parts.push(`airline: ${filters.airline}`)
    if (filters.cabin) parts.push(`cabin: ${filters.cabin}`)
    if (filters.directOnly) parts.push('direct only')
    if (filters.dateFrom || filters.dateTo) {
      parts.push(`dates: ${filters.dateFrom ?? '*'} to ${filters.dateTo ?? '*'}`)
    }
    if (filters.sort !== 'pointsCost' || filters.sortDir !== 'asc') {
      parts.push(`sorted by ${filters.sort} ${filters.sortDir}`)
    }
    return parts.length > 0 ? parts.join(', ') : 'none'
  }

  async function send() {
    const question = input.trim()
    if (!question || ask.isPending) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: question }
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const next = [...messages, userMsg]
    setMessages(next)

    const result = await ask.mutateAsync({
      question,
      context: searchData ? {
        query: originalQuery,
        advice: searchData.advice,
        parsed: searchData.parsed,
        rawResults: searchData.rawResults,
        recommendations: searchData.recommendations,
        activeFilters: activeFiltersSummary(),
      } : {},
      history,
    })

    const action = result.action
    let actionMeta: ChatMessage['action'] | undefined

    if (action) {
      if (action.type === 'filter') {
        onFiltersChange({
          ...filters,
          program: action.program !== undefined ? action.program ?? null : filters.program,
          airline: action.airline !== undefined ? action.airline ?? null : filters.airline,
          cabin: action.cabin !== undefined ? action.cabin ?? null : filters.cabin,
          directOnly: action.directOnly !== undefined ? action.directOnly : filters.directOnly,
          dateFrom: action.dateFrom !== undefined ? action.dateFrom ?? null : filters.dateFrom,
          dateTo: action.dateTo !== undefined ? action.dateTo ?? null : filters.dateTo,
        })
        const parts = [
          action.program,
          action.airline,
          action.cabin,
          action.directOnly === true ? 'direct only' : undefined,
          action.dateFrom && action.dateTo ? `${action.dateFrom} – ${action.dateTo}` : action.dateFrom ?? action.dateTo,
        ].filter(Boolean)
        actionMeta = {
          type: 'filter',
          label: parts.length ? `Filtered to: ${parts.join(', ')}` : 'Filters cleared',
          applied: true,
        }
      } else if (action.type === 'sort' && action.key) {
        onFiltersChange({ ...filters, sort: action.key, sortDir: action.dir ?? 'asc' })
        const labels = { pointsCost: 'points', date: 'date', taxesCashGbp: 'taxes' }
        const dirLabel = (action.dir ?? 'asc') === 'desc' ? ' (high→low)' : ' (low→high)'
        actionMeta = { type: 'sort', label: `Sorted by ${labels[action.key]}${dirLabel}`, applied: true }
      } else if (action.type === 'highlight' && action.ids) {
        onFiltersChange({ ...filters, highlighted: action.ids })
        actionMeta = {
          type: 'highlight',
          label: `Highlighted ${action.ids.length} result${action.ids.length !== 1 ? 's' : ''}`,
          applied: true,
        }
      } else if (action.type === 'newSearch' && action.query) {
        actionMeta = { type: 'newSearch', label: action.query, applied: true }
        const answerText = result.answer || `Searching for: ${action.query}`
        setMessages([...next, { role: 'assistant', content: answerText, action: actionMeta }])
        onNewSearch(action.query)
        return
      }
    }

    // Always store non-empty content — empty assistant turns break multi-turn history
    const answerText = result.answer || (actionMeta ? `✓ ${actionMeta.label}` : 'Done.')
    setMessages([...next, { role: 'assistant', content: answerText, action: actionMeta }])
  }

  const placeholder = searchData
    ? 'Filter, sort, ask about fees, or start a new search…'
    : 'Ask anything — transfers, sweet spots, how programs work…'

  return (
    <div className="overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)', borderRadius: '20px' }}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--card-border)' }}>
        <div
          className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-lime-400'}`}
          style={!isRefreshing ? { boxShadow: '0 0 8px rgba(163,230,53,0.8)' } : undefined}
        />
        <span className="text-sm font-bold text-white/80">
          {isRefreshing ? 'Searching…' : 'AI Advisor'}
        </span>
        {messages.length > 0 && !isRefreshing && (
          <button
            onClick={() => { setMessages([]); onFiltersChange({ ...filters, highlighted: [] }) }}
            className="ml-auto text-xs text-white/20 hover:text-white/40 cursor-pointer transition"
          >
            clear
          </button>
        )}
      </div>

      {/* Active filter summary bar */}
      {(filters.program || filters.airline || filters.cabin || filters.directOnly || filters.dateFrom || filters.dateTo) && (
        <div className="px-5 py-2 border-b flex flex-wrap gap-1.5" style={{ borderColor: 'var(--card-border)' }}>
          <span className="text-xs text-white/20">Active:</span>
          {filters.program && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: 'var(--filter-active-bg)' }}>{filters.program}</span>}
          {filters.airline && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: 'var(--filter-active-bg)' }}>{filters.airline}</span>}
          {filters.cabin && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white capitalize" style={{ background: 'var(--filter-active-bg)' }}>{filters.cabin}</span>}
          {filters.directOnly && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: 'var(--filter-active-bg)' }}>Direct only</span>}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: 'var(--filter-active-bg)' }}>
              {filters.dateFrom ?? '…'} – {filters.dateTo ?? '…'}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-5 py-4 space-y-4 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }}>
                  <span className="text-white text-[9px] font-black">AI</span>
                </div>
              )}
              <div className="flex flex-col gap-1.5 max-w-[85%]">
                <div className={`text-sm leading-relaxed rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-indigo-600/25 text-white/80 rounded-tr-sm' : 'bg-white/[0.05] text-white/70 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
                {/* Action chip */}
                {msg.action && (
                  <div className={`self-start flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
                    msg.action.type === 'newSearch'
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  }`}>
                    <span>{msg.action.type === 'newSearch' ? '↗' : '✓'}</span>
                    <span>{msg.action.type === 'newSearch' ? `Searching: ${msg.action.label}` : msg.action.label}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {ask.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }}>
                <span className="text-white text-[9px] font-black">AI</span>
              </div>
              <div className="bg-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className={`flex items-center gap-2 px-4 py-3 ${messages.length > 0 ? 'border-t' : ''}`} style={messages.length > 0 ? { borderColor: 'var(--card-border)' } : undefined}>
        {voice.listening && voice.stream ? (
          /* Waveform recording row */
          <>
            <WaveformVisualizer stream={voice.stream} height={28} />
            <button onClick={voice.cancel} className="text-white/30 hover:text-white/70 text-lg leading-none cursor-pointer transition shrink-0" title="Cancel">×</button>
            <button onClick={voice.stop} className="text-indigo-400 hover:text-indigo-300 font-bold text-sm cursor-pointer transition shrink-0" title="Done">✓</button>
          </>
        ) : voice.transcribing ? (
          <>
            <span className="flex gap-1 shrink-0">
              {[0, 100, 200].map((d) => (
                <span key={d} className="w-1 h-1 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            <span className="text-xs text-indigo-400/50 flex-1">Transcribing…</span>
          </>
        ) : (
          /* Normal input row */
          <>
            {voice.supported && (
              <button
                type="button"
                onClick={voice.start}
                disabled={ask.isPending}
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition cursor-pointer shrink-0 disabled:opacity-40 ${voice.error ? 'text-amber-400/70' : 'text-white/25 hover:text-white/55 hover:bg-white/8'}`}
                title={voice.error ?? 'Voice input'}
              >
                <MicIcon />
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder={placeholder}
              disabled={ask.isPending}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none disabled:opacity-50 min-w-0"
            />
            <button
              onClick={send}
              disabled={!input.trim() || ask.isPending}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 disabled:text-white/15 transition cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {ask.isPending ? '…' : 'Ask →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
