import { useMemo } from 'react'
import { Building2, ShieldCheck, ShieldQuestion, ShieldAlert, ExternalLink, MapPin } from 'lucide-react'
import type { Opportunity } from '../types'

const UNKNOWN_ORG = 'Company not stated'

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified_official')
    return <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900 rounded-full px-2.5 py-1 flex items-center gap-1"><ShieldCheck size={12} /> Verified official source</span>
  if (status === 'secondary_source')
    return <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full px-2.5 py-1 flex items-center gap-1"><ShieldQuestion size={12} /> Secondary source — verify before applying</span>
  return <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-full px-2.5 py-1 flex items-center gap-1"><ShieldAlert size={12} /> Needs review</span>
}

export default function CompaniesView({ opportunities, onOpen }: { opportunities: Opportunity[]; onOpen: (o: Opportunity) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, Opportunity[]>()
    for (const o of opportunities) {
      const key = o.organizer?.trim() || UNKNOWN_ORG
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(o)
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  }, [opportunities])

  if (opportunities.length === 0)
    return <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed rounded-2xl text-slate-500">
      <Building2 size={26} className="mx-auto mb-2 text-slate-300" />
      Run a search first — companies discovered in your results are grouped here.
    </div>

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {groups.map(([org, opps]) => {
        const best = opps.some(o => o.verification_status === 'verified_official')
          ? 'verified_official'
          : opps.some(o => o.verification_status === 'secondary_source') ? 'secondary_source' : 'needs_review'
        const locations = [...new Set(opps.map(o => o.location).filter((l): l is string => !!l))].slice(0, 3)
        return (
          <section key={org} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h2 className="font-bold text-lg flex items-center gap-2"><Building2 size={18} className="text-teal-500 shrink-0" />{org}</h2>
              <VerificationBadge status={best} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{opps.length} open listing{opps.length === 1 ? '' : 's'}
              {locations.length > 0 && <span className="flex items-center gap-1 inline-flex ml-2"><MapPin size={11} />{locations.join(', ')}</span>}
            </p>
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {opps.map(o => (
                <li key={o.id}>
                  <button onClick={() => onOpen(o)} className="w-full text-left py-2.5 flex items-center justify-between gap-3 group">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate group-hover:text-teal-600">{o.title}</span>
                      <span className="block text-xs text-slate-400">{o.category}{o.role ? ` • ${o.role}` : ''}</span>
                    </span>
                    <ExternalLink size={14} className="text-slate-300 group-hover:text-teal-500 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
