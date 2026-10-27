import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, ShieldCheck, ShieldAlert, AlertTriangle, Trash2, ArrowRight, Building2, Banknote, X, CheckCircle2, CalendarPlus, UserCircle, ClipboardList, Flag, Link2, RefreshCw, Loader2, SlidersHorizontal, Sparkles, TrendingUp, GraduationCap, HeartHandshake, Search, type LucideIcon } from 'lucide-react'
import type { Opportunity, ResearchResponse, Stage, TrackerEntry, StudentProfile, ReportRecord, SavedSearch, View, CloudNotification } from './types'
import { LS, formatSkill, verifyLabel, statusLabel, typeBadgeCls, inCompBand, COMP_BANDS, matchScore, matchColor, downloadIcs, nowIso, isErrorListing, STAGE_LABEL } from './lib/helpers'
import { buildResumeQuery, type ParsedResume } from './lib/resume'
import { useAuth } from './lib/auth'
import { migrateLocalToCloud, pullCloudTracker, upsertSaved, deleteSaved, insertReport, listSavedSearches, createSavedSearch, deleteSavedSearch, listNotifications, createNotification } from './lib/cloud'
import ProfileModal from './components/ProfileModal'
import TrackerBoard from './components/TrackerBoard'
import ReportModal from './components/ReportModal'
import ResumeUploader from './components/ResumeUploader'
import ResumeReviewModal from './components/ResumeReviewModal'
import AuthModal from './components/AuthModal'
import CompaniesView from './components/CompaniesView'
import Navbar from './components/Navbar'
import JobCard from './components/JobCard'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import SavedView from './components/SavedView'
import Modal from './components/Modal'
import Logo from './components/Logo'
import { useToast } from './components/Toast'

const ROLE_CHIPS = ['Frontend Developer', 'Data Analyst', 'Full Stack Developer', 'Digital Marketing', 'Graduate Engineer Trainee']
const EMPTY_PROFILE: StudentProfile = { skills: [], batch: '', degree: '', locations: [], modes: [], filled: false }
const EASE = [0.22, 1, 0.36, 1] as const

function migrateTracker(): Record<string, TrackerEntry> {
  const t = LS('fs-tracker', {}) as Record<string, TrackerEntry>
  const legacy = LS('fs-saved', []) as Opportunity[]
  legacy.forEach(o => { if (!t[o.id]) t[o.id] = { job: o, stage: 'saved', notes: '', updatedAt: new Date().toISOString() } })
  return t
}

const sectionMotion = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, ease: EASE } }

export default function App() {
  const { enabled: authEnabled, session, userEmail, signOut } = useAuth()
  const uid = session?.user.id ?? null
  const toast = useToast()
  const [dark, setDark] = useState(() => LS('fs-dark', false))
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('Software engineering internships for students in India')
  const [locQuery, setLocQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState(''); const [roleFilter, setRoleFilter] = useState(''); const [skillFilter, setSkillFilter] = useState(''); const [locFilter, setLocFilter] = useState('')
  const [modeFilter, setModeFilter] = useState(''); const [deadlineFilter, setDeadlineFilter] = useState(''); const [compBand, setCompBand] = useState(''); const [sort, setSort] = useState('relevance')
  const [results, setResults] = useState<Opportunity[]>(() => LS('fs-last-results', []))
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [tracker, setTracker] = useState<Record<string, TrackerEntry>>(migrateTracker)
  const [profile, setProfile] = useState<StudentProfile>(() => LS('fs-profile', EMPTY_PROFILE))
  const [reports, setReports] = useState<Record<string, ReportRecord>>(() => LS('fs-reports', {}))
  const [profileOpen, setProfileOpen] = useState(false); const [reportTarget, setReportTarget] = useState<Opportunity | null>(null); const [hideProfilePrompt, setHideProfilePrompt] = useState(false)
  const [uploaderOpen, setUploaderOpen] = useState(false); const [resumeParsed, setResumeParsed] = useState<ParsedResume | null>(null); const [resumeName, setResumeName] = useState('')
  const [recent, setRecent] = useState<string[]>(() => LS('fs-recent', []))
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [stats, setStats] = useState<Record<string, number> | null>(null); const [cached, setCached] = useState(false); const [demo, setDemo] = useState(false); const [warnings, setWarnings] = useState<string[]>([]); const [visible, setVisible] = useState(9); const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [authOpen, setAuthOpen] = useState(false); const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]); const [rechecking, setRechecking] = useState(false); const [filtersOpen, setFiltersOpen] = useState(false)
  const notifiedLinks = useRef<Set<string>>(new Set())
  const latest = useRef({ tracker, reports, profile, uid })
  useEffect(() => { latest.current = { tracker, reports, profile, uid } })

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('fs-dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { localStorage.setItem('fs-tracker', JSON.stringify(tracker)) }, [tracker])
  useEffect(() => { localStorage.setItem('fs-profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('fs-reports', JSON.stringify(reports)) }, [reports])
  useEffect(() => { localStorage.setItem('fs-recent', JSON.stringify(recent)) }, [recent])
  useEffect(() => { localStorage.setItem('fs-last-results', JSON.stringify(results)) }, [results])

  // One-time cleanup: error/bot-wall pages that were saved before the backend guard existed.
  useEffect(() => {
    const bad = Object.values(migrateTracker()).filter(e => isErrorListing(e.job))
    setResults(prev => { const clean = prev.filter(o => !isErrorListing(o)); return clean.length === prev.length ? prev : clean })
    if (!bad.length) return
    setTracker(prev => { const n = { ...prev }; bad.forEach(e => { delete n[e.job.id] }); return n })
    toast.push(`Removed ${bad.length} unavailable listing${bad.length > 1 ? 's' : ''} that failed to load.`, 'info')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(h => {
      setHealth(h)
      if (!h.tinyfish_configured) { fetch('/api/opportunities/demo').then(r => r.json()).then((d: ResearchResponse) => { setResults(prev => prev.length ? prev : d.opportunities); setDemo(true) }).catch(() => {}) }
      else setDemo(false)
    }).catch(() => setHealth({ status: 'backend-offline' }))
  }, [])

  // On sign-in: migrate localStorage → cloud (once), then merge cloud-only saves back.
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    ;(async () => {
      await migrateLocalToCloud(latest.current.tracker, latest.current.reports, latest.current.profile)
      const [cloud, searches, notifs] = await Promise.all([pullCloudTracker(), listSavedSearches(), listNotifications()])
      if (cancelled) return
      const good = cloud.filter(e => !isErrorListing(e.job))
      const badIds = cloud.filter(e => isErrorListing(e.job)).map(e => e.job.id)
      badIds.forEach(id => void deleteSaved(uid, id))
      setTracker(prev => { const n = { ...prev }; good.forEach(e => { if (!n[e.job.id]) n[e.job.id] = e }); return n })
      setSavedSearches(searches)
      notifiedLinks.current = new Set((notifs as CloudNotification[]).map(x => x.link ?? ''))
    })()
    return () => { cancelled = true }
  }, [uid])

  const setStage = (o: Opportunity, stage: Stage) => {
    const entry: TrackerEntry = { job: o, stage, notes: tracker[o.id]?.notes ?? '', updatedAt: nowIso() }
    setTracker(p => ({ ...p, [o.id]: entry }))
    if (uid) void upsertSaved(uid, entry)
  }
  const removeTracker = (id: string) => {
    setTracker(p => { const n = { ...p }; delete n[id]; return n })
    if (uid) void deleteSaved(uid, id)
  }
  const updateNotes = (id: string, notes: string) => {
    setTracker(p => { const next = { ...p, [id]: { ...p[id], notes, updatedAt: nowIso() } }; if (uid && next[id]) void upsertSaved(uid, next[id]); return next })
  }
  const toggleSave = (o: Opportunity) => {
    if (tracker[o.id]?.stage === 'saved') { removeTracker(o.id); toast.push('Removed from your saved listings') }
    else { setStage(o, 'saved'); toast.push('Saved to your list') }
  }
  const submitReport = (reason: string) => {
    if (reportTarget) {
      setReports(p => ({ ...p, [reportTarget.id]: { reason, at: nowIso() } }))
      if (uid) void insertReport(uid, reportTarget, reason)
      setReportTarget(null)
      toast.push('Report submitted — thank you for helping keep listings trustworthy')
    }
  }
  const onResumeParsed = (parsed: ParsedResume, fileName: string) => { setResumeParsed(parsed); setResumeName(fileName); setUploaderOpen(false) }
  const onResumeConfirm = (p: StudentProfile, role: string | null, category: '' | 'Internship' | 'Placement') => {
    setProfile(p); setResumeParsed(null)
    const loc = p.locations[0] ?? ''
    const q = buildResumeQuery(p, role, category)
    setQuery(q); if (loc) setLocQuery(loc); setSort('match')
    research(q, loc, { role, skills: p.skills, category: category || null })
  }

  async function research(q = query, loc = locQuery, opts: { role?: string | null; skills?: string[]; category?: string | null } = {}) {
    if (q.trim().length < 3) { setError('Please enter at least 3 characters to search.'); return }
    setLoading(true); setError(''); setView('jobs')
    try {
      const r = await fetch('/api/opportunities/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, category: (opts.category ?? typeFilter) || null, role: opts.role ?? null, skills: opts.skills ?? [], location: loc || null, max_fetch: 5 }) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { detail?: string }).detail || `Backend error ${r.status}`) }
      const data: ResearchResponse = await r.json()
      const clean = data.opportunities.filter(o => !isErrorListing(o))
      setResults(clean); setStats(data.stats); setCached(data.cached); setDemo(data.demo_mode); setWarnings(data.warnings || []); setVisible(9)
      setRecent(p => [q, ...p.filter(x => x !== q)].slice(0, 6))
      if (uid && savedSearches.length) {
        const qTokens = q.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2)
        for (const ss of savedSearches) {
          const ssTokens = ss.query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2)
          const overlap = ssTokens.filter(t => qTokens.includes(t)).length / Math.max(1, ssTokens.length)
          if (overlap < 0.6) continue
          for (const o of clean) {
            const link = o.application_url || o.official_url || o.source_url
            if (notifiedLinks.current.has(link)) continue
            notifiedLinks.current.add(link)
            void createNotification(uid, { title: `New match: ${o.title}`, body: `Matches your saved search “${ss.query}”.`, link })
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed. Is the backend running on port 8000?'
      setError(msg); toast.push(msg, 'error')
    } finally { setLoading(false) }
  }

  const roleOptions = useMemo(() => [...new Set(results.map(o => o.role).filter((r): r is string => !!r))].sort(), [results])
  const skillOptions = useMemo(() => [...new Set(results.flatMap(o => o.skills || []))].sort(), [results])
  const locationOptions = useMemo(() => [...new Set(results.map(o => o.location).filter((l): l is string => !!l))].sort(), [results])
  const setFilter = (k: string, v: string) => (({ type: setTypeFilter, role: setRoleFilter, skill: setSkillFilter, loc: setLocFilter, mode: setModeFilter, deadline: setDeadlineFilter, comp: setCompBand, sort: setSort } as Record<string, (x: string) => void>)[k](v))

  const filtered = useMemo(() => {
    let list = [...results]
    if (typeFilter) list = list.filter(o => o.category === typeFilter)
    if (roleFilter) list = list.filter(o => o.role === roleFilter)
    if (skillFilter) list = list.filter(o => (o.skills || []).map(s => s.toLowerCase()).includes(skillFilter.toLowerCase()))
    if (locFilter) list = list.filter(o => (o.location || '').toLowerCase().includes(locFilter.toLowerCase()))
    if (modeFilter) list = list.filter(o => (o.mode || '').toLowerCase() === modeFilter.toLowerCase())
    if (compBand) list = list.filter(o => inCompBand(o, compBand))
    if (deadlineFilter === 'upcoming') list = list.filter(o => ['open', 'closing_soon'].includes(o.deadline_status))
    if (deadlineFilter === 'unknown') list = list.filter(o => o.deadline_status === 'unknown')
    if (deadlineFilter === 'expired') list = list.filter(o => o.deadline_status === 'expired')
    if (sort === 'match') list.sort((a, b) => (matchScore(b, profile)?.score ?? -1) - (matchScore(a, profile)?.score ?? -1))
    if (sort === 'deadline') list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'))
    if (sort === 'recent') list.sort((a, b) => b.last_checked_at.localeCompare(a.last_checked_at))
    return list
  }, [results, typeFilter, roleFilter, skillFilter, locFilter, modeFilter, deadlineFilter, compBand, sort, profile])

  const clearFilters = () => { setTypeFilter(''); setRoleFilter(''); setSkillFilter(''); setLocFilter(''); setModeFilter(''); setDeadlineFilter(''); setCompBand(''); setSort('relevance') }
  const activeChips: { k: string; label: string; clear: () => void }[] = [
    typeFilter && { k: 'type', label: typeFilter, clear: () => setTypeFilter('') },
    roleFilter && { k: 'role', label: roleFilter, clear: () => setRoleFilter('') },
    skillFilter && { k: 'skill', label: formatSkill(skillFilter), clear: () => setSkillFilter('') },
    locFilter && { k: 'loc', label: locFilter, clear: () => setLocFilter('') },
    modeFilter && { k: 'mode', label: modeFilter, clear: () => setModeFilter('') },
    deadlineFilter && { k: 'deadline', label: { upcoming: 'Open / closing soon', unknown: 'Deadline unknown', expired: 'Expired' }[deadlineFilter] ?? deadlineFilter, clear: () => setDeadlineFilter('') },
    compBand && { k: 'comp', label: COMP_BANDS.find(b => b.value === compBand)?.label ?? compBand, clear: () => setCompBand('') },
  ].filter(Boolean) as { k: string; label: string; clear: () => void }[]

  const openCount = results.filter(o => ['open', 'closing_soon'].includes(o.deadline_status)).length
  const companyCount = new Set(results.map(o => o.organizer).filter(Boolean)).size
  const trackerEntries = Object.values(tracker)
  const savedEntries = trackerEntries.filter(e => e.stage === 'saved')
  const activeEntries = trackerEntries.filter(e => e.stage !== 'saved')
  const selectedEntry = selected ? tracker[selected.id] : undefined
  const selectedMatch = selected ? matchScore(selected, profile) : null
  const cardProps = (o: Opportunity) => ({ o, entry: tracker[o.id], reported: !!reports[o.id], profile, onOpen: setSelected, onSave: toggleSave, onStage: setStage })

  const saveCurrentSearch = async () => {
    if (!uid) { setAuthOpen(true); toast.push('Sign in to save searches and get new-match alerts', 'info'); return }
    const id = await createSavedSearch(uid, { query, category: typeFilter || null, role: roleFilter || null, skill: skillFilter || null, location: locQuery || null, mode: modeFilter || null, deadline: deadlineFilter || null, comp_band: compBand || null })
    if (id) { setSavedSearches(await listSavedSearches()); toast.push('Search saved — new matches will appear in your notifications') }
  }
  const removeSavedSearch = async (id: string) => { if (!uid) return; await deleteSavedSearch(uid, id); setSavedSearches(p => p.filter(s => s.id !== id)) }
  const runSavedSearch = (s: SavedSearch) => {
    setQuery(s.query); if (s.location) setLocQuery(s.location)
    setTypeFilter(s.category ?? ''); setRoleFilter(s.role ?? ''); setSkillFilter(s.skill ?? ''); setModeFilter(s.mode ?? ''); setDeadlineFilter(s.deadline ?? ''); setCompBand(s.comp_band ?? '')
    setView('jobs'); void research(s.query, s.location ?? undefined)
  }

  const recheckLink = async () => {
    if (!selected || rechecking) return
    setRechecking(true)
    try {
      const r = await fetch('/api/opportunities/recheck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: selected.application_url || selected.official_url || selected.source_url, id: selected.id }) })
      if (!r.ok) throw new Error('recheck failed')
      const d = await r.json() as { link_health: string; status_code: number | null }
      setSelected(s => s ? { ...s, link_health: d.link_health } : s)
      setResults(p => p.map(o => o.id === selected.id ? { ...o, link_health: d.link_health } : o))
      if (d.link_health === 'broken') {
        if (uid) void createNotification(uid, { title: `Broken link: ${selected.title}`, body: `The application link returned ${d.status_code ?? 'an error'} on re-check.`, link: selected.source_url })
        toast.push('This application link appears broken — verify on the source page', 'error')
      } else if (d.link_health === 'ok') toast.push('Link checked — the application page is reachable')
      else toast.push('Could not confirm the link (bot protection or timeout)', 'info')
    } catch {
      setSelected(s => s ? { ...s, link_health: 'unknown' } : s)
      toast.push('Link check failed — try again later', 'error')
    } finally { setRechecking(false) }
  }

  const stageCounts = (['applied', 'interview', 'offer', 'rejected'] as Stage[]).map(s => ({ stage: s, count: trackerEntries.filter(e => e.stage === s).length }))

  return (
    <div className="min-h-screen bg-canvas dark:bg-[#070d1f] text-ink dark:text-slate-100">
      <Navbar view={view} onNavigate={setView} trackerCount={activeEntries.length} savedCount={savedEntries.length}
        profileFilled={profile.filled} onOpenProfile={() => setProfileOpen(true)} onFindJobs={() => research()}
        dark={dark} onToggleDark={() => setDark(!dark)} authEnabled={authEnabled} uid={uid} userEmail={userEmail}
        onSignIn={() => setAuthOpen(true)} onSignOut={() => void signOut()} />

      {demo && health && !health.tinyfish_configured && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 text-amber-900 dark:text-amber-200 text-sm px-4 py-2.5 text-center flex items-center justify-center gap-2">
          <AlertTriangle size={14} /> Demo mode — sample listings only, not live jobs. Add <code>TINYFISH_API_KEY</code> for real discovery. {health?.status === 'backend-offline' && ' Backend appears offline.'}
        </div>
      )}

      {/* ============================== HOME ============================== */}
      {view === 'home' && (
        <>
        {/* Full-bleed hero: the section spans edge-to-edge; only its inner content is max-width centered. */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-mint/90 via-mint/40 to-canvas dark:from-teal-950/25 dark:via-navy-950/40 dark:to-[#070d1f] border-b border-line/70 dark:border-slate-800/70">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-300/25 dark:bg-teal-500/15 blur-3xl anim-aurora" />
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-24 w-96 h-96 rounded-full bg-navy-300/25 dark:bg-navy-600/20 blur-3xl anim-aurora" style={{ animationDelay: '-7s' }} />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center py-14 md:py-20">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 pulse-ring" /> Internship & Placement Portal
              </span>
              <h1 className="mt-5 font-display text-5xl md:text-6xl lg:text-[4.1rem]/[1.05] text-navy-900 dark:text-white text-balance">
                Your next opportunity <em className="text-teal-600 dark:text-teal-400 font-display italic">starts&nbsp;here.</em>
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Discover verified internships, fresher jobs and campus placements across India — filter by role, skill and location, check scam warnings, and apply directly on the official company page.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs text-muted dark:text-slate-300">
                {['Real source links', 'No invented deadlines', 'Scam-payment warnings'].map(x => (
                  <span key={x} className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-full px-3 py-1.5 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 size={13} className="text-teal-500" /> {x}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: EASE }} className="relative mt-9">
              <SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={() => research()} loading={loading} />
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button onClick={() => research()} className="bg-teal-500 hover:bg-teal-600 active:scale-[.98] text-white text-sm font-semibold px-6 py-3 rounded-full transition shadow-sm shadow-teal-500/30 flex items-center gap-2">
                  <Sparkles size={15} /> Explore Opportunities
                </button>
                <button onClick={() => setView('tracker')} className="bg-white dark:bg-slate-900 border border-line dark:border-slate-700 hover:border-teal-400 text-sm font-semibold px-6 py-3 rounded-full transition flex items-center gap-2">
                  <ClipboardList size={15} /> Track Applications
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="relative mt-6 flex flex-wrap justify-center gap-2 text-xs">
              {ROLE_CHIPS.map(x => { const q = `${x} ${x.includes('Trainee') ? 'placement' : 'internship'} in India`; return <button key={x} onClick={() => { setQuery(q); research(q) }} className="bg-white/80 dark:bg-slate-900 border border-line dark:border-slate-800 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 transition rounded-full px-3 py-1.5">{x}</button> })}
            </motion.div>
            {recent.length > 0 && <div className="relative mt-4 text-xs text-slate-500">Recent: {recent.map(r => <button key={r} onClick={() => research(r)} className="underline mr-2 hover:text-teal-600">{r}</button>)}</div>}

            <div className="relative mt-8 max-w-3xl mx-auto">
              <div className="flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase text-slate-400 mb-3"><span className="h-px flex-1 bg-line dark:bg-slate-800" />or let your resume do the searching<span className="h-px flex-1 bg-line dark:bg-slate-800" /></div>
              <ResumeUploader variant="card" onParsed={onResumeParsed} />
            </div>
          </div>
          </section>

          {/* Remaining home sections stay in the centered reading column */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6">
          {!profile.filled && !hideProfilePrompt && (
            <motion.div {...sectionMotion} className="max-w-3xl mx-auto bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3">
              <UserCircle size={22} className="text-teal-600 shrink-0" />
              <div className="text-sm flex-1 min-w-[220px]"><b>Complete your student profile</b><p className="text-muted dark:text-slate-400 text-xs mt-0.5">Add your skills and preferences to see a personal match % on every listing.</p></div>
              <button onClick={() => setProfileOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition active:scale-[.98]">Build profile</button>
              <button onClick={() => setHideProfilePrompt(true)} aria-label="Dismiss" className="p-1.5"><X size={16} /></button>
            </motion.div>
          )}

          <motion.section {...sectionMotion} className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mt-8">
            {[[openCount, 'Open roles'], [companyCount, 'Hiring companies'], [trackerEntries.length, 'Tracked by you']].map(([v, l]) => (
              <div key={l as string} className="surface rounded-2xl p-4 md:p-5 text-center shadow-sm">
                <p className="text-2xl md:text-3xl font-extrabold text-navy-900 dark:text-white tnum">{v as number}</p>
                <p className="text-[11px] md:text-xs text-muted mt-1">{l as string}</p>
              </div>
            ))}
          </motion.section>

          <motion.section {...sectionMotion} className="py-12">
            <div className="flex items-end justify-between mb-5">
              <h2 className="font-bold text-2xl tracking-tight text-navy-900 dark:text-white">Latest openings</h2>
              <button onClick={() => setView('jobs')} className="text-sm text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 hover:gap-2 transition-all">Browse all jobs <ArrowRight size={15} /></button>
            </div>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted bg-white dark:bg-slate-900 border border-dashed border-line dark:border-slate-700 rounded-2xl">Run a search above — internship and placement listings will appear here.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.slice(0, 6).map(o => <JobCard key={o.id} {...cardProps(o)} />)}</div>
            )}
          </motion.section>

          <motion.section {...sectionMotion} className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-10 shadow-sm">
            <h2 className="font-bold text-xl mb-6 flex gap-2 items-center text-navy-900 dark:text-white"><ShieldCheck className="text-teal-500" /> How FormSaathi works</h2>
            <ol className="grid md:grid-cols-4 gap-5 text-sm text-muted dark:text-slate-300">
              {([
                ['Search roles', 'Enter a role, skill or company, with an optional city.', Search],
                ['We scan the web', 'TinyFish finds public internship and placement pages.', TrendingUp],
                ['Filter & stay safe', 'Narrow by role, skill, pay and deadline; scam fees get flagged.', ShieldCheck],
                ['Track & apply', 'Move listings through your pipeline and apply on the official site.', ClipboardList],
              ] as [string, string, LucideIcon][]).map(([h, b, Icon], i) => (
                <li key={h} className="relative">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3"><Icon size={18} /></div>
                  <b className="text-navy-900 dark:text-white block mb-1">{i + 1}. {h}</b>{b}
                </li>
              ))}
            </ol>
            <p className="text-xs text-slate-500 mt-6">No fake statistics. “Open” appears only when a known future deadline supports it; missing information stays “unknown”.</p>
          </motion.section>

          <motion.section {...sectionMotion} className="grid md:grid-cols-3 gap-4 mb-14">
            {([
              ['Starting your career?', 'Build a free student profile with your skills and preferred cities — every listing then shows a personal match score.', GraduationCap],
              ['Applying with confidence?', 'Every listing links to the page it came from, with scam-payment warnings and a link re-check before you apply.', HeartHandshake],
              ['Do you apply for me?', 'No. FormSaathi discovers, organises and tracks listings — you always review and submit on the official company site yourself.', ShieldCheck],
            ] as [string, string, LucideIcon][]).map(([h, b, Icon]) => (
              <div key={h} className="surface rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold flex gap-2 items-center text-navy-900 dark:text-white"><Icon size={17} className="text-teal-500" />{h}</h3>
                <p className="text-sm text-muted dark:text-slate-300 mt-2 leading-relaxed">{b}</p>
              </div>
            ))}
          </motion.section>
          </main>
        </>
      )}

      {/* ============================== JOBS ============================== */}
      {view === 'jobs' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={() => research()} loading={loading} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => void saveCurrentSearch()} className="text-xs font-semibold border border-line dark:border-slate-700 bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              <Bookmark size={13} /> {uid ? 'Save this search' : 'Sign in to save searches'}
            </button>
            {savedSearches.map(s => (
              <span key={s.id} className="text-xs bg-white dark:bg-slate-900 border border-line dark:border-slate-700 rounded-full pl-3 pr-1.5 py-1 flex items-center gap-1.5">
                <button onClick={() => runSavedSearch(s)} className="font-semibold hover:text-teal-600 dark:hover:text-teal-400" title={s.query}>{s.query.length > 38 ? s.query.slice(0, 38) + '…' : s.query}</button>
                <button onClick={() => void removeSavedSearch(s.id)} aria-label={`Remove saved search ${s.query}`} className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X size={12} /></button>
              </span>
            ))}
            <button onClick={() => setFiltersOpen(true)} className="lg:hidden ml-auto text-xs font-semibold border border-line dark:border-slate-700 bg-white dark:bg-slate-900 rounded-full px-3.5 py-1.5 flex items-center gap-1.5">
              <SlidersHorizontal size={13} /> Filters
            </button>
          </div>

          {loading && <div className="mt-4 text-sm bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-xl p-4 animate-pulse flex items-center gap-2"><Loader2 size={15} className="animate-spin text-teal-500" /> Searching → fetching pages → extracting roles & skills → deduplicating…</div>}
          {stats && !loading && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
              {[['Candidate pages', stats.candidates], ['Pages inspected', stats.fetched], ['Valid listings', stats.extracted], ['Duplicates removed', stats.duplicates_removed]].map(([k, v]) => (
                <div key={k as string} className="surface rounded-2xl p-4 shadow-sm"><b className="text-2xl text-teal-600 dark:text-teal-400 tnum">{v as number}</b><br /><span className="text-xs text-muted">{k as string}</span></div>
              ))}
            </div>
          )}
          {cached && <p className="text-xs mt-2 text-slate-500">Served from temporary backend cache (up to 10 min) to avoid repeating the same research.</p>}
          {warnings.map(w => <p key={w} className="text-xs mt-2 text-amber-700 dark:text-amber-300">{w}</p>)}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => research()} className="shrink-0 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"><RefreshCw size={12} /> Retry</button>
            </div>
          )}
          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeChips.map(c => (
                <button key={c.k} onClick={c.clear} className="text-xs font-medium bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 rounded-full pl-3 pr-2 py-1 flex items-center gap-1 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors">
                  {c.label} <X size={12} />
                </button>
              ))}
              <button onClick={clearFilters} className="text-xs text-slate-500 underline px-1">Clear all filters</button>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-5 mt-6">
            <FilterPanel typeFilter={typeFilter} roleFilter={roleFilter} skillFilter={skillFilter} locFilter={locFilter} modeFilter={modeFilter} deadlineFilter={deadlineFilter} compBand={compBand} sort={sort}
              roleOptions={roleOptions} skillOptions={skillOptions} locationOptions={locationOptions} profileFilled={profile.filled} set={setFilter} onClear={clearFilters}
              mobileOpen={filtersOpen} onCloseMobile={() => setFiltersOpen(false)} />
            <section className="lg:col-span-3">
              <p className="text-sm text-muted mb-4">Showing <b className="text-navy-900 dark:text-white tnum">{filtered.length}</b> of <span className="tnum">{results.length}</span> listings</p>
              {loading ? (
                <div className="grid xl:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-60 skeleton rounded-2xl" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted bg-white dark:bg-slate-900 border border-dashed border-line dark:border-slate-700 rounded-2xl">
                  <Search size={24} className="mx-auto mb-2 text-slate-300" />
                  No listings match. Try a broader search or clear filters.
                </div>
              ) : (
                <>
                  <motion.div layout className="grid xl:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filtered.slice(0, visible).map(o => <JobCard key={o.id} {...cardProps(o)} />)}
                    </AnimatePresence>
                  </motion.div>
                  {visible < filtered.length && (
                    <button onClick={() => setVisible(v => v + 9)} className="mt-6 mx-auto flex bg-navy-900 hover:bg-navy-800 text-white px-5 py-3 rounded-xl text-sm font-semibold transition active:scale-[.98]">Load more <ArrowRight size={16} /></button>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ============================== COMPANIES ============================== */}
      {view === 'companies' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Companies</h1>
          <p className="text-sm text-muted mt-1.5 mb-6">Listings from your current results grouped by organizer, with source-verification badges. Organizers are detected from the page text or its domain; unstated sources stay unstated.</p>
          <CompaniesView opportunities={results} onOpen={setSelected} />
        </main>
      )}

      {/* ============================== TRACKER ============================== */}
      {view === 'tracker' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Application tracker</h1>
          <p className="text-sm text-muted mt-1.5 mb-5">{uid ? 'Your pipeline is synced to your account across devices.' : 'Your private pipeline, stored in this browser. Sign in to sync across devices.'} Move listings across stages and keep notes per application.</p>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs font-semibold bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-full px-3.5 py-2 tnum">Saved: {savedEntries.length}</span>
            {stageCounts.map(s => (
              <span key={s.stage} className="text-xs font-semibold bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-full px-3.5 py-2 tnum">{STAGE_LABEL[s.stage]}: {s.count}</span>
            ))}
          </div>
          <TrackerBoard entries={activeEntries} onStage={(id, s) => { const e = tracker[id]; if (e) setStage(e.job, s) }} onNotes={updateNotes} onRemove={removeTracker} onOpen={(id) => { const e = tracker[id]; if (e) setSelected(e.job) }} />
        </main>
      )}

      {/* ============================== SAVED ============================== */}
      {view === 'saved' && (
        <SavedView entries={savedEntries} reports={reports} profile={profile} uid={uid}
          onOpen={setSelected} onSave={toggleSave} onStage={setStage} onBrowse={() => setView('jobs')}
          onClearAll={() => { if (savedEntries.length && confirm('Clear all saved listings?')) savedEntries.forEach(e => removeTracker(e.job.id)) }} />
      )}

      {/* ============================== DETAILS MODAL ============================== */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(selected.category)}`}>{selected.category}</span>
              <button onClick={() => setSelected(null)} aria-label="Close details" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>
            <h2 className="text-2xl font-bold mt-3 leading-snug text-navy-900 dark:text-white [overflow-wrap:anywhere]">{selected.title}</h2>
            <p className="text-sm text-muted dark:text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5"><Building2 size={14} />{selected.organizer || 'Company not stated'}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} />{selected.location || 'Location unknown'} • {selected.mode || 'Unknown'}</span>
              {selectedMatch && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tnum ${matchColor(selectedMatch.score)}`} title={selectedMatch.reasons.join(' • ')}>{selectedMatch.score}% match for your profile</span>}
            </p>
            {selected.fraud_flags?.length > 0 && (
              <div className="mt-5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-2xl p-4">
                <h3 className="font-bold text-sm text-red-700 dark:text-red-300 flex items-center gap-2"><ShieldAlert size={16} /> Safety warnings on this listing</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">{selected.fraud_flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Banknote size={12} />Compensation</p><p className="text-sm font-semibold mt-1">{selected.compensation || 'Not stated'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Clock size={12} />Deadline</p><p className="text-sm font-semibold mt-1">{selected.deadline ? `${selected.deadline} (${statusLabel(selected.deadline_status)})` : 'Unknown — verify before applying'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400">Role</p><p className="text-sm font-semibold mt-1">{selected.role || 'Not classified'}</p></div>
            </div>
            {selected.skills?.length > 0 && (
              <div className="mt-6"><h3 className="font-semibold text-sm mb-2">Skills required</h3><div className="flex flex-wrap gap-2">{selected.skills.map(s => <span key={s} className="text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5">{formatSkill(s)}</span>)}</div></div>
            )}
            <div className="mt-6"><h3 className="font-semibold text-sm mb-2">About the role</h3><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selected.description || 'Not extracted — open the source page for the full description.'}</p></div>
            <div className="mt-6"><h3 className="font-semibold text-sm mb-2">Eligibility & requirements</h3>{selected.eligibility?.length ? <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-1">{selected.eligibility.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p className="text-sm text-slate-500">Not extracted — check the official page.</p>}</div>

            <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ClipboardList size={15} /> Track this application</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select value={selectedEntry?.stage ?? ''} onChange={e => setStage(selected, e.target.value as Stage)} className="border border-line dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 cursor-pointer"><option value="" disabled>Add to tracker…</option>{(Object.keys(STAGE_LABEL) as Stage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
                {selectedEntry && <button onClick={() => removeTracker(selected.id)} className="text-sm text-red-600 flex items-center gap-1"><Trash2 size={13} /> Remove</button>}
              </div>
              <textarea value={selectedEntry?.notes ?? ''} onChange={e => { if (!selectedEntry) setStage(selected, 'saved'); updateNotes(selected.id, e.target.value) }} placeholder="Add notes — recruiter email, interview date, follow-up…" className="w-full mt-3 border border-line dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 min-h-[64px] outline-none focus:border-teal-400" />
            </div>

            <dl className="mt-6 space-y-2.5 text-sm border-t border-line dark:border-slate-800 pt-5">
              <div className="flex gap-2"><dt className="font-semibold shrink-0">Verification:</dt><dd>{verifyLabel(selected.verification_status)} • type: {selected.source_type}</dd></div>
              <div className="flex gap-2"><dt className="font-semibold shrink-0">Last checked:</dt><dd>{new Date(selected.last_checked_at).toLocaleString()}</dd></div>
              <div className="flex gap-2"><dt className="font-semibold shrink-0">Source:</dt><dd><a className="text-teal-600 dark:text-teal-400 underline break-all" href={selected.source_url} target="_blank" rel="noreferrer">{selected.source_url}</a></dd></div>
              {selected.also_found_on?.length > 0 && <div className="flex gap-2"><dt className="font-semibold shrink-0">Also found on:</dt><dd className="break-all">{selected.also_found_on.join(', ')}</dd></div>}
              <div className="flex gap-2 items-center flex-wrap">
                <dt className="font-semibold shrink-0 flex items-center gap-1"><Link2 size={14} />Link health:</dt>
                <dd className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${selected.link_health === 'ok' ? 'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900' : selected.link_health === 'broken' ? 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900' : 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                    {selected.link_health === 'ok' ? 'Working — re-checked now' : selected.link_health === 'broken' ? 'Broken — apply link failed' : 'Not re-checked'}
                  </span>
                  <button onClick={() => void recheckLink()} disabled={rechecking} className="text-xs font-semibold border border-line dark:border-slate-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 disabled:opacity-60 transition-colors">
                    {rechecking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-check link
                  </button>
                </dd>
              </div>
            </dl>

            <div className="mt-5 bg-amber-50 dark:bg-amber-950/50 rounded-xl p-3 text-xs flex gap-2"><ShieldCheck size={15} className="shrink-0 mt-0.5 text-amber-600" /><span>Never pay a registration fee, deposit or training charge to get a job or internship — legitimate employers do not ask for money. Always review official requirements and submit the application yourself.</span></div>
            <div className="flex flex-wrap gap-2 mt-5">
              <a href={selected.application_url || selected.official_url || selected.source_url} target="_blank" rel="noreferrer" className="bg-teal-500 hover:bg-teal-600 active:scale-[.98] text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition">Apply on Official Site <ExternalLink size={16} /></a>
              <button onClick={() => toggleSave(selected)} className="border border-line dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2 hover:border-teal-400 transition-colors">
                {selectedEntry?.stage === 'saved' ? <BookmarkCheck size={16} className="text-teal-600" /> : <Bookmark size={16} />}{selectedEntry?.stage === 'saved' ? 'Saved' : 'Save Listing'}
              </button>
              {selected.deadline ? (
                <button onClick={() => downloadIcs(selected)} className="border border-line dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2 hover:border-teal-400 transition-colors"><CalendarPlus size={16} /> Add deadline to calendar</button>
              ) : (
                <span className="border border-line dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2 text-slate-400 cursor-not-allowed" title="No confirmed deadline on this listing"><CalendarPlus size={16} /> No deadline to export</span>
              )}
              <button onClick={() => setReportTarget(selected)} className="ml-auto border border-red-200 text-red-600 px-4 py-3 rounded-xl font-medium flex items-center gap-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"><Flag size={15} /> {reports[selected.id] ? 'Reported' : 'Report'}</button>
            </div>
          </div>
        )}
      </Modal>

      {profileOpen && <ProfileModal initial={profile} onClose={() => setProfileOpen(false)} onSave={p => { setProfile(p); setProfileOpen(false) }} onImportResume={() => { setProfileOpen(false); setUploaderOpen(true) }} />}
      {uploaderOpen && <ResumeUploader variant="modal" onClose={() => setUploaderOpen(false)} onParsed={onResumeParsed} />}
      {resumeParsed && <ResumeReviewModal parsed={resumeParsed} fileName={resumeName} onClose={() => setResumeParsed(null)} onConfirm={onResumeConfirm} />}
      {reportTarget && <ReportModal job={reportTarget} onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      <footer className="bg-white dark:bg-slate-900 text-muted mt-6 border-t border-line dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="text-navy-900 dark:text-white font-extrabold text-lg flex items-center gap-2"><Logo size={32} />FormSaathi</p>
            <p className="mt-3 text-slate-400 leading-relaxed">Internship & placement discovery across public company websites, with match scores, scam warnings, application tracking and verifiable source links.</p>
          </div>
          <div>
            <p className="text-navy-900 dark:text-white font-semibold mb-3">Explore</p>
            <div className="flex flex-col gap-2 items-start">
              <button onClick={() => setView('jobs')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Browse jobs</button>
              <button onClick={() => setView('companies')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Companies</button>
              <button onClick={() => setView('tracker')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Application tracker</button>
              <button onClick={() => setView('saved')} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Saved listings</button>
            </div>
          </div>
          <div>
            <p className="text-navy-900 dark:text-white font-semibold mb-3">Trust & privacy</p>
            <p className="text-slate-400 leading-relaxed">Listings link to original sources. Your data stays in this browser unless you sign in — then it is privately synced to your account. Never pay to apply.</p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 pb-3 px-4">FormSaathi • Internships & Placements • Researched listings persist to the cloud catalogue when Supabase is configured • Never share your API key publicly</p>
        <p className="text-center text-[11px] text-slate-400 pb-8 px-4">
          Empty-state photography by{' '}
          <a href="https://www.vecteezy.com/" target="_blank" rel="noreferrer" className="underline hover:text-teal-600">Vecteezy</a>
          {' '}— used under its free license.
        </p>
      </footer>
    </div>
  )
}
