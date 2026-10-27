import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, Building2, Banknote, ShieldAlert, Flag, Link2Off } from 'lucide-react'
import type { Opportunity, Stage, StudentProfile, TrackerEntry } from '../types'
// STAGE_LABEL is provided by lib/helpers
import { formatSkill, statusLabel, statusClass, deadlineLine, typeBadgeCls, matchScore, matchColor, STAGE_LABEL } from '../lib/helpers'

interface Props {
  o: Opportunity
  entry?: TrackerEntry
  reported: boolean
  profile: StudentProfile
  onOpen: (o: Opportunity) => void
  onSave: (o: Opportunity) => void
  onStage: (o: Opportunity, s: Stage) => void
}

export default function JobCard({ o, entry, reported, profile, onOpen, onSave, onStage }: Props) {
  const applyUrl = o.application_url || o.official_url
  const match = matchScore(o, profile)

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className="card-hover group h-full bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 flex flex-col gap-3 shadow-sm shadow-navy-900/[0.04]">
      <div className="flex justify-between gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(o.category)}`}>{o.category}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {match && (
            <span title={match.reasons.join(' • ')} className={`text-xs px-2.5 py-1 rounded-full font-semibold tnum ${matchColor(match.score)}`}>
              {match.score}% match
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(o.deadline_status)}`}>{statusLabel(o.deadline_status)}</span>
        </div>
      </div>

      {o.fraud_flags?.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-3 py-2 text-xs flex gap-2">
          <ShieldAlert size={15} className="shrink-0 mt-0.5" />
          <span><b>Warning:</b> {o.fraud_flags[0]}</span>
        </div>
      )}
      {o.link_health === 'broken' && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-3 py-1.5 text-xs flex gap-2 items-center">
          <Link2Off size={13} /> Application link failed its last check — verify on the source page.
        </div>
      )}

      <h3 className="font-bold text-navy-900 dark:text-white leading-snug [overflow-wrap:anywhere]">{o.title}</h3>
      <p className="text-sm text-muted dark:text-slate-400 flex items-center gap-1.5">
        <Building2 size={14} className="shrink-0" />
        <span className="truncate">{o.organizer || 'Company not stated — verify on source page'}</span>
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
        {o.description || 'No description extracted — open the source page for details. Missing fields are never invented.'}
      </p>

      {o.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {o.skills.slice(0, 4).map(s => (
            <span key={s} className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-1">{formatSkill(s)}</span>
          ))}
          {o.skills.length > 4 && <span className="text-[11px] text-slate-400 px-1 py-1">+{o.skills.length - 4}</span>}
        </div>
      )}

      <div className="text-xs text-muted dark:text-slate-400 space-y-1.5">
        <p className="flex gap-1.5 items-center"><MapPin size={13} className="shrink-0" />{o.location || 'Location unknown'} • {o.mode || 'Unknown'}</p>
        <p className="flex gap-1.5 items-center"><Banknote size={13} className="shrink-0" />{o.compensation || 'Compensation not stated'}</p>
        <p className="flex gap-1.5 items-center"><Clock size={13} className="shrink-0" />{deadlineLine(o)}</p>
      </div>

      {reported && <p className="text-[11px] text-red-600 flex items-center gap-1"><Flag size={11} /> You reported this listing</p>}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button onClick={() => onOpen(o)}
          className="bg-navy-900 hover:bg-navy-800 active:scale-[.97] transition text-white text-sm font-medium px-4 py-2.5 rounded-xl">
          View Details
        </button>
        {applyUrl && (
          <a href={applyUrl} target="_blank" rel="noreferrer"
            className="bg-teal-500 hover:bg-teal-600 active:scale-[.97] transition text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5">
            Apply <ExternalLink size={14} />
          </a>
        )}
        {entry ? (
          <select value={entry.stage} onChange={e => onStage(o, e.target.value as Stage)} aria-label="Application stage"
            className="text-sm px-3 py-2.5 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-900 font-medium cursor-pointer">
            {(Object.keys(STAGE_LABEL) as Stage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        ) : (
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onSave(o)} aria-label="Save job"
            className="text-sm px-3 py-2.5 rounded-xl border border-line dark:border-slate-700 flex items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            <Bookmark size={15} /> Save
          </motion.button>
        )}
        {entry?.stage === 'saved' && (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => onSave(o)} aria-label="Unsave job" title="Remove from saved"
            className="ml-auto self-center text-teal-600 dark:text-teal-400">
            <BookmarkCheck size={20} />
          </motion.button>
        )}
      </div>
    </motion.article>
  )
}
