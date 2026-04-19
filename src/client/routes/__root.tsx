import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react'

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function AuthButtons() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-7 h-7',
          },
        }}
      />
    )
  }
  return (
    <div className="flex items-center gap-1">
      <SignInButton mode="modal">
        <button className="text-xs text-white/50 hover:text-white/90 px-3 py-1.5 rounded-lg transition cursor-pointer font-semibold"
          style={{ background: 'var(--filter-inactive-bg)', border: '1px solid var(--filter-inactive-border)' }}>
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="text-xs text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Sign up
        </button>
      </SignUpButton>
    </div>
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
      className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {light ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--app-bg-80)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline group">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white text-xs font-black" style={{ color: 'white' }}>M</span>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">MileScout</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-white/25 text-xs hidden sm:block mr-2">Award flight intelligence</span>
            <AuthButtons />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="pt-14">
        <Outlet />
      </div>
    </div>
  ),
})
