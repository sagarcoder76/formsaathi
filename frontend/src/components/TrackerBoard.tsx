import { motion } from 'framer-motion'
import { ExternalLink, MapPin, Clock, Trash2 } from 'lucide-react'
import type { TrackerEntry, Stage } from '../types'
import { deadlineLine } from '../lib/helpers'

const COLUMNS: { stage: Exclude<Stage, 'saved'>; label: string; accent: string; dot: string }[] = [
  { stage: 'applied', label: 'Applied', accent: 'border-t-navy-500', dot: 'bg-navy-500' },
  { stage: 'interview', label: 'Interview', accent: 'border-t-violet-500', dot: 'bg-violet-500' },
  { stage: 'offer', label: 'Offer', accent: 'border-t-teal-500', dot: 'bg-teal-500' },
  { stage: 'rejected', label: 'Rejected', accent: 'border-t-red-500', dot: 'bg-red-500' },
]
const STAGE_ORDER: Stage[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

export default function TrackerBoard({ entries, onStage, onNotes, onRemove, onOpen }: {
  entries: TrackerEntry[]
  onStage: (id: string, stage: Stage) => void
  onNotes: (id: string, notes: string) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map(col => {
        const items = entries.filter(e => e.stage === col.stage)
        return (
          <section key={col.stage} className={`bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl border-t-4 ${col.accent} p-3 min-h-[160px] shadow-sm shadow-navy-900/[0.04]`}>
            <div className="flex items-center justify-between px-1 py-2">
              <h3 className="font-bold text-sm flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${col.dot}`} />{col.label}</h3>
              <motion.span key={items.length} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 tnum font-semibold">{items.length}</motion.span>
            </div>
            {items.length === 0 ? <p className="text-xs text-slate-400 px-1 py-6 text-center">No listings here yet.</p> : (
              <div className="space-y-3">
                {items.map(e => (
                  <motion.article key={e.job.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border border-line dark:border-slate-800 rounded-xl p-3 space-y-2 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                    <button onClick={() => onOpen(e.job.id)} className="text-left font-semibold text-sm leading-snug hover:text-teal-600 dark:hover:text-teal-400 line-clamp-2 [overflow-wrap:anywhere]">{e.job.title}</button>
                    <p className="text-[11px] text-muted flex items-center gap-1"><MapPin size={11} />{e.job.location || 'Location unknown'}</p>
                    <p className="text-[11px] text-muted flex items-center gap-1"><Clock size={11} />{deadlineLine(e.job)}</p>
                    <select value={e.stage} onChange={ev => onStage(e.job.id, ev.target.value as Stage)} aria-label="Move stage"
                      className="w-full border border-line dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-slate-900 cursor-pointer outline-none focus:border-teal-400">
                      {STAGE_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <textarea value={e.notes} onChange={ev => onNotes(e.job.id, ev.target.value)} placeholder="Notes: recruiter contact, interview date…"
                      className="w-full border border-line dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-transparent min-h-[52px] outline-none focus:border-teal-400" />
                    <div className="flex gap-2">
                      {(e.job.application_url || e.job.official_url) && <a href={e.job.application_url || e.job.official_url || '#'} target="_blank" rel="noreferrer" className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 hover:underline">Apply <ExternalLink size={11} /></a>}
                      <button onClick={() => onRemove(e.job.id)} className="ml-auto text-[11px] text-red-600 flex items-center gap-1 hover:underline"><Trash2 size={11} /> Remove</button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        )
      })}
      {entries.length === 0 && (
        <div className="md:col-span-2 xl:col-span-4 text-center py-14 text-muted border border-dashed border-line dark:border-slate-700 rounded-2xl">
          Your pipeline is empty. Open any listing and choose <b>Applied</b> to track it here.
        </div>
      )}
    </div>
  )
}
