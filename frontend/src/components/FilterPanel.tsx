import { AnimatePresence, motion } from 'framer-motion'
import { Filter, X } from 'lucide-react'
import { formatSkill, COMP_BANDS } from '../lib/helpers'

export interface FilterState {
  typeFilter: string; roleFilter: string; skillFilter: string; locFilter: string
  modeFilter: string; deadlineFilter: string; compBand: string; sort: string
}
interface Props extends FilterState {
  roleOptions: string[]
  skillOptions: string[]
  locationOptions: string[]
  profileFilled: boolean
  set: (k: string, v: string) => void
  onClear: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

const JOB_TYPES = ['Internship', 'Placement'] as const

function PanelBody(p: Props) {
  const selectCls = 'w-full border border-line dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400 transition-colors'
  const labelCls = 'text-xs font-semibold text-slate-400 uppercase tracking-wide'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold flex items-center gap-2 text-sm"><Filter size={15} /> Filter jobs</p>
        <button onClick={p.onClear} className="text-xs underline text-slate-500 hover:text-teal-600">Clear all</button>
      </div>
      <div><label className={labelCls}>Job type</label><select value={p.typeFilter} onChange={e => p.set('type', e.target.value)} className={selectCls + ' mt-1'}><option value="">All types</option>{JOB_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className={labelCls}>Role</label><select value={p.roleFilter} onChange={e => p.set('role', e.target.value)} className={selectCls + ' mt-1'}><option value="">All roles</option>{p.roleOptions.map(r => <option key={r}>{r}</option>)}</select></div>
      <div><label className={labelCls}>Skill</label><select value={p.skillFilter} onChange={e => p.set('skill', e.target.value)} className={selectCls + ' mt-1'}><option value="">Any skill</option>{p.skillOptions.map(s => <option key={s}>{formatSkill(s)}</option>)}</select></div>
      <div><label className={labelCls}>Location</label><select value={p.locFilter} onChange={e => p.set('loc', e.target.value)} className={selectCls + ' mt-1'}><option value="">Any location</option>{p.locationOptions.map(l => <option key={l}>{l}</option>)}</select></div>
      <div><label className={labelCls}>Work mode</label><select value={p.modeFilter} onChange={e => p.set('mode', e.target.value)} className={selectCls + ' mt-1'}><option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>In-person</option></select></div>
      <div><label className={labelCls}>Compensation</label><select value={p.compBand} onChange={e => p.set('comp', e.target.value)} className={selectCls + ' mt-1'}><option value="">Any compensation</option>{COMP_BANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
      <div><label className={labelCls}>Deadline</label><select value={p.deadlineFilter} onChange={e => p.set('deadline', e.target.value)} className={selectCls + ' mt-1'}><option value="">Any deadline</option><option value="upcoming">Open / closing soon</option><option value="unknown">Unknown</option><option value="expired">Expired</option></select></div>
      <div><label className={labelCls}>Sort by</label><select value={p.sort} onChange={e => p.set('sort', e.target.value)} className={selectCls + ' mt-1'}><option value="relevance">Relevance</option>{p.profileFilled && <option value="match">Best match for you</option>}<option value="deadline">Deadline (soonest)</option><option value="recent">Recently checked</option></select></div>
    </div>
  )
}

export default function FilterPanel(p: Props) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl p-5 lg:sticky lg:top-24 h-fit shadow-sm shadow-navy-900/[0.04]">
        <PanelBody {...p} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {p.mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-navy-950/40 backdrop-blur-[2px] z-40 lg:hidden" onClick={p.onCloseMobile} aria-hidden />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 bottom-0 left-0 w-[86vw] max-w-sm bg-white dark:bg-slate-900 z-50 p-5 overflow-auto lg:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Filters</h2>
                <button onClick={p.onCloseMobile} aria-label="Close filters" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
              </div>
              <PanelBody {...p} />
              <button onClick={p.onCloseMobile} className="mt-6 w-full bg-navy-900 text-white font-semibold py-3 rounded-xl active:scale-[.98] transition">
                Show results
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
