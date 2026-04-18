import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-[#08080f]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#08080f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">MileScout</span>
          </Link>
          <span className="text-white/20 text-xs hidden sm:block">Award flight intelligence</span>
        </div>
      </header>
      <div className="pt-12">
        <Outlet />
      </div>
    </div>
  ),
})
