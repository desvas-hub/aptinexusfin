import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../common/Logo'
import { useAuth } from '../../contexts/AuthContext'

export default function PublicLayout() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-black/[0.08] bg-white/85 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3" aria-label="Main">
          <Logo height={40} />
          <div className="hidden gap-7 text-sm md:flex">{[["Features","/features"],["How it works","/how-it-works"],["Careers","/careers"],["About","/about"]].map(([t, to]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "text-[#1d1d1f]" : "hover:text-[#1d1d1f]")}>{t}</NavLink>)}</div>
          <div className="flex gap-2">
            {user ? <Link to="/app" className="btn-primary">Open dashboard</Link> : <>
              <Link to="/login" className="btn-ghost">Log in</Link><Link to="/register" className="btn-primary">Get started</Link></>}
          </div>
        </nav>
      </header>
      <Outlet />
      <footer className="mt-24 space-y-2 border-t border-black/[0.08] py-8 text-center text-sm text-[#6e6e73]"><div className="flex justify-center gap-5"><Link to="/about">About</Link><Link to="/features">Features</Link><Link to="/careers">Careers</Link></div><p>© 2026 AptiNexus.</p></footer>
    </div>
  )
}

