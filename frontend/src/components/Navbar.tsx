import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Briefcase, Building2, ClipboardList, Bookmark, UserCircle, Moon, Sun, Menu, X, LogOut, Bell, Sparkles, BarChart3, ShieldCheck } from 'lucide-react'
import Logo from './Logo'
import NotificationsBell from './NotificationsBell'
import type { View } from '../types'

interface NavbarProps {
  view: View
  onNavigate: (v: View) => void
  trackerCount: number
  savedCount: number
  profileFilled: boolean
  onOpenProfile: () => void
  onFindJobs: () => void
  dark: boolean
  onToggleDark: () => void
  authEnabled: boolean
  uid: string | null
  userEmail: string | null
  isAdmin: boolean
  onSignIn: () => void
  onSignOut: () => void
}

const ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Browse Jobs', icon: Briefcase },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'tracker', label: 'Tracker', icon: ClipboardList },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

const EASE = [0.22, 1, 0.36, 1] as const

export default function Navbar(p: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Navigation always flows through go(), which closes the mobile drawer itself.
  const go = (v: View) => { p.onNavigate(v); setMenuOpen(false) }
  const navItems = p.isAdmin
    ? [...ITEMS, { id: 'admin' as View, label: 'Moderation', icon: ShieldCheck }]
    : ITEMS

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 glass border-b ${scrolled ? 'border-line dark:border-slate-800 shadow-sm shadow-navy-900/5' : 'border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2">
        <button onClick={() => go('home')} className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight shrink-0 group" aria-label="FormSaathi home">
          <Logo size={34} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
          <span className="text-navy-900 dark:text-white">FormSaathi</span>
        </button>

        {/* Desktop navigation */}
        <nav className="ml-4 hidden lg:flex items-center gap-1" aria-label="Primary">
          {navItems.map(item => {
            const active = p.view === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => go(item.id)}
                className={`relative px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors duration-200 ${active ? 'text-navy-900 dark:text-white' : 'text-muted dark:text-slate-400 hover:text-navy-900 dark:hover:text-slate-100'}`}
                aria-current={active ? 'page' : undefined}>
                {active && (
                  <motion.span layoutId="nav-active-pill" transition={{ duration: 0.25, ease: EASE }}
                    className="absolute inset-0 bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900 rounded-xl" />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                {item.id === 'tracker' && p.trackerCount > 0 && (
                  <span className="relative z-10 text-[10px] font-bold bg-teal-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tnum">{p.trackerCount}</span>
                )}
                {item.id === 'saved' && p.savedCount > 0 && (
                  <span className="relative z-10 text-[10px] font-bold bg-navy-900 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tnum">{p.savedCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={p.onFindJobs}
            className="hidden md:inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 active:scale-[.97] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm shadow-teal-500/30">
            <Sparkles size={15} /> Find Opportunities
          </button>
          <button onClick={p.onOpenProfile} title="Your profile" aria-label="Your profile"
            className={`p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${p.profileFilled ? 'text-teal-600 dark:text-teal-400' : 'text-muted dark:text-slate-400'}`}>
            <UserCircle size={20} />
          </button>
          {p.authEnabled && p.uid && <NotificationsBell uid={p.uid} />}
          {p.authEnabled && (p.uid ? (
            <span className="hidden sm:flex items-center gap-1">
              <span title={p.userEmail ?? ''} className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 max-w-[150px] truncate">{p.userEmail}</span>
              <button onClick={p.onSignOut} title="Sign out" aria-label="Sign out" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted dark:text-slate-400">
                <LogOut size={18} />
              </button>
            </span>
          ) : (
            <button onClick={p.onSignIn}
              className="hidden sm:inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 active:scale-[.97] text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200">
              <Bell size={14} /> Sign in
            </button>
          ))}
          <button onClick={p.onToggleDark} title="Toggle dark mode" aria-label="Toggle dark mode"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted dark:text-slate-400">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={p.dark ? 'sun' : 'moon'} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.2 }} className="block">
                {p.dark ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-navy-900 dark:text-white">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* Mobile animated drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 bg-navy-950/40 backdrop-blur-[2px] lg:hidden z-30" onClick={() => setMenuOpen(false)} aria-hidden />
            <motion.nav initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="lg:hidden absolute top-16 left-3 right-3 z-40 surface rounded-2xl shadow-xl shadow-navy-900/15 p-2.5" aria-label="Mobile">
              {navItems.map((item, i) => {
                const active = p.view === item.id
                const Icon = item.icon
                return (
                  <motion.button key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, duration: 0.22, ease: EASE }}
                    onClick={() => go(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-teal-50 dark:bg-teal-950/50 text-navy-900 dark:text-white' : 'text-muted dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Icon size={17} /> {item.label}
                    {item.id === 'tracker' && p.trackerCount > 0 && <span className="ml-auto text-[10px] font-bold bg-teal-500 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center tnum">{p.trackerCount}</span>}
                    {item.id === 'saved' && p.savedCount > 0 && <span className="ml-auto text-[10px] font-bold bg-navy-900 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center tnum">{p.savedCount}</span>}
                  </motion.button>
                )
              })}
              <div className="border-t border-line dark:border-slate-800 mt-2 pt-2 px-2 pb-1 flex flex-col gap-2">
                <button onClick={() => { p.onFindJobs(); setMenuOpen(false) }} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition active:scale-[.98]">Find Opportunities</button>
                {p.authEnabled && !p.uid && (
                  <button onClick={() => { p.onSignIn(); setMenuOpen(false) }} className="bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition active:scale-[.98]">Sign in / Create account</button>
                )}
                {p.authEnabled && p.uid && (
                  <button onClick={() => { p.onSignOut(); setMenuOpen(false) }} className="border border-line dark:border-slate-700 text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2">
                    <LogOut size={15} /> Sign out
                  </button>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
