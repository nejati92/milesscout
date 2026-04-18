import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function ThemeToggle() {
  const [light, setLight] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'light'
    return window.matchMedia('(prefers-color-scheme: light)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])

  return (
    <button
      onClick={() => setLight((v) => !v)}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition cursor-pointer"
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {light ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[var(--app-bg-80)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white text-xs font-black" style={{ color: 'white' }}>M</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">MileScout</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-white/20 text-xs hidden sm:block">Award flight intelligence</span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="pt-12">
        <Outlet />
      </div>
    </div>
  ),
})
