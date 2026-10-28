import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, Briefcase, Building2, ClipboardList, Bookmark, UserCircle, Moon, Sun,
  LogOut, LogIn, Sparkles, BarChart3, ShieldCheck, X, LayoutGrid,
} from 'lucide-react'
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

interface NavItem { id: View; label: string; icon: typeof Home }

const PRIMARY_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Browse', icon: Briefcase },
  { id: 'tracker', label: 'Tracker', icon: ClipboardList },
  { id: 'saved', label: 'Saved', icon: Bookmark },
]

const DESKTOP_ITEMS: NavItem[] = [
  ...PRIMARY_ITEMS.slice(0, 2),
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'tracker', label: 'Tracker', icon: ClipboardList },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

const EASE = [0.22, 1, 0.36, 1] as const
const initialsOf = (email: string | null) => (email && email.length ? email.charAt(0).toUpperCase() : 'U')

export default function Navbar(p: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAccountOpen(false); setSheetOpen(false) } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  // Lock body scroll while the mobile bottom sheet is open.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  const go = (v: View) => { p.onNavigate(v); setSheetOpen(false) }
  const desktopItems: NavItem[] = p.isAdmin
    ? [...DESKTOP_ITEMS, { id: 'admin', label: 'Moderation', icon: ShieldCheck }]
    : DESKTOP_ITEMS
  const sheetItems: NavItem[] = [
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'companies', label: 'Companies', icon: Building2 },
    ...(p.isAdmin ? [{ id: 'admin' as View, label: 'Moderation', icon: ShieldCheck }] : []),
  ]

  return (
    <>
      <header className={`sticky top-0 z-40 transition-all duration-300 glass border-b ${scrolled ? 'border-line dark:border-slate-800 shadow-sm shadow-navy-900/5' : 'border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => go('home')} className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight shrink-0 group" aria-label="FormSaathi home">
            <Logo size={34} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
            <span className="text-navy-900 dark:text-white">FormSaathi</span>
          </button>

          {/* Desktop navigation — text-only for a clean, uncluttered bar */}
          <nav className="ml-3 hidden lg:flex items-center gap-0.5" aria-label="Primary">
            {desktopItems.map(item => {
              const active = p.view === item.id
              return (
                <button key={item.id} onClick={() => go(item.id)}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${active ? 'text-teal-700 dark:text-teal-300' : 'text-muted dark:text-slate-400 hover:text-navy-900 dark:hover:text-slate-100'}`}
                  aria-current={active ? 'page' : undefined}>
                  {active && (
                    <motion.span layoutId="nav-active-pill" transition={{ duration: 0.25, ease: EASE }}
                      className="absolute inset-0 bg-teal-50 dark:bg-teal-950/50 rounded-lg" />
                  )}
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                  {item.id === 'tracker' && p.trackerCount > 0 && (
                    <span className="relative z-10 ml-1.5 text-[10px] font-bold bg-teal-500 text-white rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center tnum">{p.trackerCount}</span>
                  )}
                  {item.id === 'saved' && p.savedCount > 0 && (
                    <span className="relative z-10 ml-1.5 text-[10px] font-bold bg-navy-900 text-white rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center tnum">{p.savedCount}</span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={p.onFindJobs}
              className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap bg-teal-500 hover:bg-teal-600 active:scale-[.97] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-200 shadow-sm shadow-teal-500/25">
              <Sparkles size={14} /> Find Opportunities
            </button>

            {p.authEnabled && !p.uid && (
              <button onClick={p.onOpenProfile} title="Your profile" aria-label="Your profile"
                className="hidden md:block p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-muted dark:text-slate-400">
                <UserCircle size={20} />
              </button>
            )}

            {p.authEnabled && p.uid && <NotificationsBell uid={p.uid} />}

            {p.authEnabled && (p.uid ? (
              <>
                <span className="hidden sm:block w-px h-6 bg-line dark:bg-slate-800 mx-1" aria-hidden />
                <div className="relative hidden sm:block" ref={accountRef}>
                  <button onClick={() => setAccountOpen(o => !o)} aria-label="Account menu" aria-expanded={accountOpen}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-navy-900 to-teal-600 text-white text-sm font-bold flex items-center justify-center transition hover:opacity-90 active:scale-95">
                    {initialsOf(p.userEmail)}
                  </button>
                  <AnimatePresence>
                    {accountOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: EASE }}
                        className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl shadow-xl shadow-navy-900/15 p-2 z-50">
                        <p className="px-3 py-2 text-xs text-muted truncate border-b border-line dark:border-slate-800 mb-1" title={p.userEmail ?? ''}>{p.userEmail}</p>
                        <button onClick={() => { setAccountOpen(false); p.onOpenProfile() }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                          <UserCircle size={16} className="text-muted" /> Your profile
                        </button>
                        <button onClick={() => { setAccountOpen(false); void p.onSignOut() }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left">
                          <LogOut size={16} /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Mobile: avatar opens the bottom sheet */}
                <button onClick={() => setSheetOpen(true)} aria-label="Open menu"
                  className="sm:hidden w-9 h-9 rounded-full bg-gradient-to-br from-navy-900 to-teal-600 text-white text-sm font-bold flex items-center justify-center active:scale-95 transition">
                  {initialsOf(p.userEmail)}
                </button>
              </>
            ) : (
              <>
                <button onClick={p.onSignIn}
                  className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border border-navy-900/15 dark:border-slate-700 text-navy-900 dark:text-white text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[.97] transition-all duration-200">
                  <LogIn size={14} /> Sign in
                </button>
                <button onClick={() => setSheetOpen(true)}
                  className="sm:hidden inline-flex items-center gap-1.5 whitespace-nowrap bg-navy-900 text-white text-[13px] font-semibold px-3.5 py-2 rounded-full active:scale-[.97] transition">
                  <LogIn size={14} /> Sign in
                </button>
              </>
            ))}

            <button onClick={p.onToggleDark} title="Toggle dark mode" aria-label="Toggle dark mode"
              className="hidden sm:block p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-muted dark:text-slate-400">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={p.dark ? 'sun' : 'moon'} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.2 }} className="block">
                  {p.dark ? <Sun size={18} /> : <Moon size={18} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* ===================== MOBILE BOTTOM TAB BAR ===================== */}
      <nav
        aria-label="Mobile primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-line dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {PRIMARY_ITEMS.map(item => {
            const active = p.view === item.id
            const Icon = item.icon
            const badge = item.id === 'tracker' ? p.trackerCount : item.id === 'saved' ? p.savedCount : 0
            return (
              <button key={item.id} onClick={() => go(item.id)}
                className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors"
                aria-current={active ? 'page' : undefined}>
                <span className={`relative transition-colors ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold bg-teal-500 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center tnum">{badge > 9 ? '9+' : badge}</span>
                  )}
                </span>
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
                {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-teal-500" />}
              </button>
            )
          })}
          <button onClick={() => setSheetOpen(true)} aria-label="More options" aria-expanded={sheetOpen}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-slate-400 dark:text-slate-500 transition-colors">
            <LayoutGrid size={21} strokeWidth={2} />
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* ===================== MOBILE BOTTOM SHEET ===================== */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-[2px]"
              onClick={() => setSheetOpen(false)} aria-hidden />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: EASE }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl shadow-navy-950/30 flex flex-col max-h-[88vh] pb-[env(safe-area-inset-bottom)]">
              <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                <span className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />
              </div>

              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-line dark:border-slate-800">
                {p.uid ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-900 to-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{initialsOf(p.userEmail)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy-900 dark:text-white truncate">{p.userEmail}</p>
                      <p className="text-[11px] text-muted">Signed in</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-navy-900 dark:text-white">Menu</p>
                )}
                <button onClick={() => setSheetOpen(false)} aria-label="Close menu"
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-muted shrink-0">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto px-3 py-3">
                <button onClick={() => { p.onFindJobs(); setSheetOpen(false) }}
                  className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-3.5 rounded-2xl active:scale-[.98] transition mb-3">
                  <Sparkles size={16} /> Find Opportunities
                </button>

                <div className="space-y-0.5">
                  {sheetItems.map(item => {
                    const active = p.view === item.id
                    const Icon = item.icon
                    return (
                      <button key={item.id} onClick={() => go(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors text-left ${active ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300' : 'text-navy-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Icon size={19} className={active ? 'text-teal-600 dark:text-teal-400' : 'text-muted'} /> {item.label}
                      </button>
                    )
                  })}
                  {p.uid && (
                    <button onClick={() => { p.onOpenProfile(); setSheetOpen(false) }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium text-navy-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                      <UserCircle size={19} className="text-muted" /> Your profile
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-line dark:border-slate-800 space-y-0.5">
                  <button onClick={p.onToggleDark}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium text-navy-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {p.dark ? <Sun size={19} className="text-muted" /> : <Moon size={19} className="text-muted" />}
                    Dark mode
                    <span className={`ml-auto relative w-11 h-6 rounded-full transition-colors ${p.dark ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${p.dark ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </span>
                  </button>

                  {p.authEnabled && (p.uid ? (
                    <button onClick={() => { void p.onSignOut(); setSheetOpen(false) }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                      <LogOut size={19} /> Sign out
                    </button>
                  ) : (
                    <button onClick={() => { p.onSignIn(); setSheetOpen(false) }}
                      className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-3.5 rounded-2xl active:scale-[.98] transition mt-1">
                      <LogIn size={16} /> Sign in / Create account
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
