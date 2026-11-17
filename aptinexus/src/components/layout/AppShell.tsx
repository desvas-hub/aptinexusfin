import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Bell, BadgeCheck, BookOpen, Briefcase, ChevronsLeft, ChevronsRight, ClipboardCheck, Compass, FileText, FlaskConical, FolderKanban, GitCompare, Layers, LayoutDashboard, LineChart, LogOut, Menu, Route, Search, Settings, Share2, Target, UserRound, X, type LucideIcon } from 'lucide-react'
import Logo from '../common/Logo'
import { useAuth } from '../../contexts/AuthContext'
import { notificationsApi } from '../../services/api'

const groups: { label: string; items: [string, string, LucideIcon][] }[] = [
  { label: 'Overview', items: [['Dashboard', '/app', LayoutDashboard]] },
  { label: 'Intelligence', items: [['My Profile', '/app/profile', UserRound], ['Resume Analysis', '/app/resume', FileText], ['SkillGraph', '/app/skillgraph', Share2], ['Skill Explorer', '/app/skills', Layers]] },
  { label: 'Discover', items: [['Career Discovery', '/app/careers', Compass], ['Explore Careers', '/app/explore', Briefcase], ['Career Comparison', '/app/compare', GitCompare]] },
  { label: 'Development', items: [['Skill Gap Analysis', '/app/gaps', Target], ['Learning Roadmap', '/app/roadmap', Route], ['Learning Resources', '/app/resources', BookOpen], ['SkillProof', '/app/skillproof', BadgeCheck], ['Assessment Centre', '/app/assessments', ClipboardCheck], ['Project Portfolio', '/app/projects', FolderKanban]] },
  { label: 'Insights', items: [['What-If Simulator', '/app/whatif', FlaskConical], ['Progress & Analytics', '/app/analytics', LineChart]] },
  { label: 'Account', items: [['Settings', '/app/settings', Settings], ['Notifications', '/app/notifications', Bell]] },
]
const flat = groups.flatMap(g => g.items)

export default function AppShell() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const calm = useReducedMotion()
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const results = useMemo(() => (q.trim() ? flat.filter(i => i[0].toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []), [q])

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([notificationsApi.list(), notificationsApi.getRead()])
      .then(([items, readIds]) => {
        if (!active) return
        const readSet = new Set(Array.isArray(readIds) ? readIds : [])
        const unread = (Array.isArray(items) ? items : []).filter(n => !readSet.has(n.id)).length
        setUnreadCount(unread)
      })
      .catch(() => {
        if (active) setUnreadCount(0)
      })
    return () => {
      active = false
    }
  }, [user, pathname])

  if (!user) return <Navigate to="/login" replace />
  const go = (to: string) => { nav(to); setQ('') }
  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 z-40 flex w-64 flex-col border-r border-black/[0.08] bg-white/85 p-3 backdrop-blur-2xl transition-all duration-300 md:sticky md:top-0 md:h-screen ${collapsed ? 'md:w-[72px]' : 'md:w-64'} ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="mb-5 flex items-center justify-between px-1">{collapsed ? <span className="mx-auto h-9 w-9 rounded-xl bg-gradient-to-br from-nexus-blue to-nexus-violet" aria-hidden /> : <Logo height={34} />}
          <button className="md:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-1" aria-label="App">
          {groups.map(g => (
            <div key={g.label} className="space-y-0.5">
              {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[.12em] text-[#86868b]">{g.label}</p>}
              {g.items.map(([name, to, Icon]) => (
                <NavLink key={name} to={to} end={to === '/app'} title={collapsed ? name : undefined} aria-label={name} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''} ${collapsed ? 'justify-center' : ''}`}>
                  <Icon size={17} strokeWidth={1.75} />{!collapsed && name}</NavLink>))}
            </div>))}
        </nav>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-black/[0.05] p-2">
          <Link to="/app/profile" aria-label="Your profile" className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-br from-nexus-blue to-nexus-violet text-xs font-semibold text-[#fff] shadow-md">{initials}</span>
            {!collapsed && <span className="min-w-0"><span className="block truncate text-sm text-[#1d1d1f]">{user.name}</span><span className="block truncate text-xs text-[#6e6e73]">{user.email}</span></span>}</Link>
          {!collapsed && <button aria-label="Log out" className="rounded-lg p-2 text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#1d1d1f]" onClick={() => { logout(); nav('/') }}><LogOut size={16} /></button>}
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="btn-ghost mt-2 hidden !py-2 md:flex" aria-label="Toggle sidebar">{collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}</button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.08] bg-white/85 px-4 py-3 backdrop-blur-2xl">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <div className="relative max-w-md flex-1"><Search size={15} className="absolute left-3.5 top-3 text-[#6e6e73]" />
            <input className="input pl-10" placeholder="Jump to a page" aria-label="Search pages" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0][1]); if (e.key === 'Escape') setQ('') }} />
            {q && <ul role="listbox" aria-label="Search results" className="glass absolute inset-x-0 top-12 z-40 overflow-hidden bg-white/85 p-1.5">
              {results.length ? results.map(([n, to, Icon]) => <li key={to}><button role="option" aria-selected="false" className="nav-item w-full" onClick={() => go(to)}><Icon size={16} />{n}</button></li>) : <li className="px-3 py-2 text-sm text-[#6e6e73]">No matching pages</li>}</ul>}</div>
          <Link to="/app/notifications" className="relative rounded-xl border border-black/[0.08] bg-black/[0.05] p-2.5 hover:bg-black/[0.06]" aria-label="Notifications">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className=" absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#007AFF] px-1 text-[10px] font-semibold text-white"
              >
                {unreadCount}
              </span>
            )}
          </Link>
        </header>
        <motion.main key={pathname} className="flex-1 p-5 md:p-8" initial={calm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}><Outlet /></motion.main>
      </div>
    </div>
  )
}
