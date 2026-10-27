import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Loader2, ShieldCheck, Undo2, ExternalLink } from 'lucide-react'
import EmptyState from './EmptyState'
import { useToast } from './Toast'
import {
  listReports, resolveReport, setOpportunityHidden,
  listOpportunitiesByIds, listHiddenOpportunities,
} from '../lib/cloud'
import type { ListingReport, Opportunity } from '../types'

export default function AdminView({ uid }: { uid: string }) {
  const toast = useToast()
  const [reports, setReports] = useState<ListingReport[]>([])
  const [hiddenOpps, setHiddenOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  const refresh = async () => {
    const [reportRows, hiddenRows] = await Promise.all([listReports(), listHiddenOpportunities()])
    setReports(reportRows)
    setHiddenOpps(hiddenRows)
    const ids = [...new Set(reportRows.map(r => r.opportunity_id).filter((x): x is string => Boolean(x)))]
    return listOpportunitiesByIds(ids)
  }

  const [oppMap, setOppMap] = useState<Map<string, Opportunity>>(new Map())
  useEffect(() => {
    let alive = true
    refresh()
      .then(opps => { if (alive) setOppMap(new Map(opps.map(o => [o.id, o]))) })
      .catch(() => toast.push('Could not load moderation data', 'error'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleReports = useMemo(
    () => reports.filter(r => showResolved || r.status === 'open'),
    [reports, showResolved],
  )
  const openCount = reports.filter(r => r.status === 'open').length

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusyId(id)
    try {
      await fn()
      const opps = await refresh()
      setOppMap(new Map(opps.map(o => [o.id, o])))
      toast.push(ok)
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Action failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const hideAndResolve = (r: ListingReport) => run(
    r.id,
    async () => {
      if (r.opportunity_id) await setOpportunityHidden(r.opportunity_id, true)
      await resolveReport(r.id, { status: 'resolved' }, uid)
    },
    'Listing hidden and report resolved',
  )

  const dismissReport = (r: ListingReport) => run(
    r.id,
    () => resolveReport(r.id, { status: 'resolved' }, uid),
    'Report dismissed',
  )

  const reopenReport = (r: ListingReport) => run(
    r.id,
    () => resolveReport(r.id, { status: 'open' }, uid),
    'Report reopened',
  )

  const restore = (o: Opportunity) => run(
    o.id,
    () => setOpportunityHidden(o.id, false),
    'Listing restored to the catalogue',
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 dark:text-white flex items-center gap-2">
        <ShieldCheck size={24} className="text-teal-600" /> Moderation
      </h1>
      <p className="text-sm text-muted mt-1.5 mb-6">Triage student reports and manage hidden catalogue listings. Actions are enforced by database admin policies.</p>

      <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-sm text-navy-900 dark:text-white">Listing reports ({openCount} open)</h2>
          <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="accent-teal-600" />
            Show resolved
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-8 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p>
        ) : visibleReports.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No reports to show.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {visibleReports.map(r => {
              const opp = r.opportunity_id ? oppMap.get(r.opportunity_id) : undefined
              const link = opp?.application_url || opp?.source_url || r.source_url
              return (
                <li key={r.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{opp?.title || r.opportunity_id || 'Unknown listing'}</p>
                    <p className="text-xs text-muted mt-0.5">Reason: {r.reason}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleString()}
                      {r.status === 'resolved' && r.resolved_at && ` • resolved ${new Date(r.resolved_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {link && (
                    <a href={link} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold text-teal-600 flex items-center gap-1 shrink-0 hover:underline">
                      Source <ExternalLink size={12} />
                    </a>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === 'open' ? (
                      <>
                        <button disabled={busyId === r.id} onClick={() => hideAndResolve(r)}
                          className="text-xs font-semibold px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition active:scale-[.98] disabled:opacity-50 flex items-center gap-1.5">
                          {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Hide &amp; resolve
                        </button>
                        <button disabled={busyId === r.id} onClick={() => dismissReport(r)}
                          className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white transition active:scale-[.98] disabled:opacity-50">
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button disabled={busyId === r.id} onClick={() => reopenReport(r)}
                        className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white transition active:scale-[.98] disabled:opacity-50 flex items-center gap-1.5">
                        <Undo2 size={13} /> Reopen
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl p-5">
        <h2 className="font-bold text-sm text-navy-900 dark:text-white">Hidden listings ({hiddenOpps.length})</h2>
        {hiddenOpps.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No listings are currently hidden.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {hiddenOpps.map(o => (
              <li key={o.id} className="py-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{o.title}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {o.organizer || 'Company not stated'}
                    {typeof o.failed_checks === 'number' && o.failed_checks > 0 && ` • ${o.failed_checks} failed link check${o.failed_checks === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button disabled={busyId === o.id} onClick={() => restore(o)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white transition active:scale-[.98] disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                  {busyId === o.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!loading && reports.length === 0 && hiddenOpps.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={<ShieldCheck size={26} />} title="All clear"
            body="There are no open reports and no hidden listings. Student reports and failed link checks will appear here." />
        </div>
      )}
    </main>
  )
}
