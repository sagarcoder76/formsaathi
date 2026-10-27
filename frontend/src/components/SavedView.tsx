import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, ArrowRight, Cloud, HardDrive } from 'lucide-react'
import type { Opportunity, Stage, StudentProfile, TrackerEntry, ReportRecord } from '../types'
import JobCard from './JobCard'
import EmptyState from './EmptyState'

interface Props {
  entries: TrackerEntry[]
  reports: Record<string, ReportRecord>
  profile: StudentProfile
  uid: string | null
  onOpen: (o: Opportunity) => void
  onSave: (o: Opportunity) => void
  onStage: (o: Opportunity, s: Stage) => void
  onBrowse: () => void
  onClearAll: () => void
}

type Seg = 'all' | 'Internship' | 'Placement'
type SortKey = 'newest' | 'deadline' | 'title'

export default function SavedView({ entries, reports, profile, uid, onOpen, onSave, onStage, onBrowse, onClearAll }: Props) {
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState<Seg>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = entries.filter(e =>
      (seg === 'all' || e.job.category === seg) &&
      (!needle || [e.job.title, e.job.organizer, e.job.role, e.job.location, ...(e.job.skills || [])].join(' ').toLowerCase().includes(needle))
    )
    out = [...out].sort((a, b) => {
      if (sort === 'deadline') return (a.job.deadline || '9999').localeCompare(b.job.deadline || '9999')
      if (sort === 'title') return a.job.title.localeCompare(b.job.title)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return out
  }, [entries, q, seg, sort])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Saved Opportunities</h1>
        <p className="text-sm text-muted dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-1.5">
          {uid ? <><Cloud size={14} className="text-teal-600" /> Synced to your FormSaathi account — the same saves appear on every device you sign in on.</>
                : <><HardDrive size={14} /> Stored in this browser — sign in to back them up and sync across devices.</>}
        </p>
      </motion.div>

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            image="/images/empty-saved.webp"
            imageAlt="Student sitting on a campus bench with a laptop and stacked notebooks"
            title="Nothing saved yet"
            body="Tap “Save” on any internship or placement to keep it here — synced to your account when you sign in, available offline in this browser otherwise."
            action={
              <button onClick={onBrowse} className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition active:scale-[.98]">
                Browse opportunities <ArrowRight size={15} />
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search within your saved listings…" aria-label="Search saved listings"
                className="w-full border border-line dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex" role="group" aria-label="Filter by type">
                {(['all', 'Internship', 'Placement'] as Seg[]).map(s => (
                  <button key={s} onClick={() => setSeg(s)} aria-pressed={seg === s}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-200 ${seg === s ? 'bg-white dark:bg-slate-900 shadow-sm text-navy-900 dark:text-white' : 'text-muted dark:text-slate-400'}`}>
                    {s === 'all' ? `All (${entries.length})` : s}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort saved listings"
                className="border border-line dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 cursor-pointer">
                <option value="newest">Newest saved</option>
                <option value="deadline">Deadline (soonest)</option>
                <option value="title">Title (A–Z)</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3 tnum">{filtered.length} of {entries.length} saved listings</p>

          {filtered.length === 0 ? (
            <div className="mt-6 text-center py-14 border border-dashed border-line dark:border-slate-700 rounded-2xl text-sm text-muted">No saved listings match your search.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filtered.map(e => (
                <JobCard key={e.job.id} o={e.job} entry={e} reported={!!reports[e.job.id]} profile={profile} onOpen={onOpen} onSave={onSave} onStage={onStage} />
              ))}
            </div>
          )}

          <button onClick={onClearAll}
            className="mt-8 text-sm text-red-600 flex gap-1.5 items-center font-medium hover:underline">
            <Trash2 size={14} /> Clear all saved listings
          </button>
        </>
      )}
    </main>
  )
}
