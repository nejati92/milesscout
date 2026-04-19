import './index.css'
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from './trpc'
import { routeTree } from './routeTree.gen'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
const ACCESS_PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD as string
const STORAGE_KEY = 'ms_access'

function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(STORAGE_KEY) === ACCESS_PASSWORD)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function attempt() {
    if (input === ACCESS_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, ACCESS_PASSWORD)
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0c0b10' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white text-sm font-black">M</span>
          </div>
          <span className="text-white font-bold tracking-tight">MileScout</span>
        </div>
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-white/60 text-sm text-center">Enter access password to continue</p>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && attempt()}
            placeholder="Password"
            autoFocus
            className="w-full bg-transparent px-4 py-3 rounded-xl text-white placeholder:text-white/25 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}` }}
          />
          {error && <p className="text-red-400/70 text-xs text-center">Incorrect password</p>}
          <button
            onClick={attempt}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 0 },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const { getToken } = useAuth()

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        async headers() {
          const token = await getToken()
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasswordGate>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </PasswordGate>
  </React.StrictMode>,
)
