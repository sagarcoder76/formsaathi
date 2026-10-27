import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, CalendarClock, MapPin, Sparkles, TrendingUp } from 'lucide-react'
import EmptyState from './EmptyState'
import { computeInsights } from '../lib/insights'
import { statusClass, statusLabel } from '../lib/helpers'
import type { TrackerEntry } from '../types'

const EASE = [0.22, 1, 0.36, 1] as const

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl p-5">
      <h2 className="font-bold text-sm flex items-center gap-2 text-navy-900 dark:text-white">{icon} {title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function InsightsView({ entries, onBrowse }: { entries: TrackerEntry[]; onBrowse: () => void }) {
  const stats = useMemo(() => computeInsights(entries), [entries])
  const maxActivity = Math.max(1, ...stats.activity.map(b => b.count))
  const maxFunnel = Math.max(1, ...stats.funnel.map(f => f.count))

  if (stats.total === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Insights</h1>
        <p className="text-sm text-muted mt-1.5 mb-6">Your application funnel, activity and match patterns — computed only from listings you actually save or track.</p>
        <EmptyState
          icon={<BarChart3 size={26} />}
          title="No applications to analyse yet"
          body="Save or track a few listings and your funnel, conversion rates, skill mix and upcoming deadlines will appear here."
          action={<button onClick={onBrowse} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition active:scale-[.98]">Browse jobs</button>}
        />
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Insights</h1>
      <p className="text-sm text-muted mt-1.5 mb-6">Computed from your {stats.total} saved/tracked listing{stats.total === 1 ? '' : 's'} on this device{entries.some(e => e.updatedAt) ? ' and account' : ''}. Nothing is estimated or fabricated.</p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Funnel */}
        <Card title="Application funnel" icon={<TrendingUp size={15} className="text-teal-600" />}>
          <div className="space-y-3">
            {stats.funnel.map(f => (
              <div key={f.stage}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{f.label}</span>
                  <span className="tnum text-muted">{f.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-navy-700"
                    style={{ width: `${Math.round((f.count / maxFunnel) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Rates */}
        <Card title="Conversion rates" icon={<Sparkles size={15} className="text-teal-600" />}>
          <div className="grid grid-cols-3 gap-3">
            {stats.rates.map(r => (
              <div key={r.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-center" title={r.hint}>
                <p className="text-2xl font-extrabold text-navy-900 dark:text-white tnum">{r.value === null ? '—' : `${r.value}%`}</p>
                <p className="text-[11px] font-semibold text-muted mt-1 leading-tight">{r.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">Rates show “—” until there are enough applications in the relevant stages. Hover a rate for its exact definition.</p>
        </Card>

        {/* Activity over time */}
        <Card title="Pipeline activity (last 6 months)" icon={<BarChart3 size={15} className="text-teal-600" />}>
          <div className="flex items-end justify-between gap-2 h-40">
            {stats.activity.map(b => (
              <div key={b.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] font-semibold tnum text-muted">{b.count || ''}</span>
                <div className="w-full max-w-[2.4rem] rounded-t-lg bg-teal-500/80 dark:bg-teal-500/70"
                  style={{ height: `${Math.max(4, Math.round((b.count / maxActivity) * 100))}%` }} />
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Skill & location mix */}
        <Card title="What you are pursuing" icon={<MapPin size={15} className="text-teal-600" />}>
          <p className="text-xs font-semibold text-muted mb-2">Top skills in your pipeline</p>
          <div className="flex flex-wrap gap-2">
            {stats.topSkills.length === 0 && <p className="text-xs text-slate-400">No skills listed on saved listings yet.</p>}
            {stats.topSkills.map(s => (
              <span key={s.token} className="text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 rounded-full px-3 py-1.5">
                {s.token} <span className="text-teal-500/70 tnum">×{s.count}</span>
              </span>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted mt-5 mb-2">Top locations</p>
          <div className="flex flex-wrap gap-2">
            {stats.topLocations.length === 0 && <p className="text-xs text-slate-400">No locations stated yet.</p>}
            {stats.topLocations.map(l => (
              <span key={l.token} className="text-xs font-semibold bg-navy-50 dark:bg-navy-950 text-navy-700 dark:text-navy-300 rounded-full px-3 py-1.5">
                {l.token} <span className="opacity-60 tnum">×{l.count}</span>
              </span>
            ))}
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card title="Upcoming deadlines" icon={<CalendarClock size={15} className="text-teal-600" />}>
          {stats.upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-slate-400">No upcoming deadlines found on your saved listings.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.upcomingDeadlines.map(({ job, daysLeft }) => (
                <li key={job.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{job.title}</p>
                    <p className="text-xs text-muted truncate">{job.organizer || 'Company not stated'} • {job.deadline}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClass(job.deadline_status)}`}>{statusLabel(job.deadline_status)}</span>
                    <span className="text-[11px] font-semibold text-slate-500 tnum whitespace-nowrap">
                      {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
    </main>
  )
}
