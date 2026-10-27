import { Search, MapPin, Loader2 } from 'lucide-react'

interface Props {
  query: string
  locQuery: string
  setQuery: (v: string) => void
  setLocQuery: (v: string) => void
  onSearch: () => void
  loading: boolean
  compact?: boolean
}

export default function SearchBar({ query, locQuery, setQuery, setLocQuery, onSearch, loading, compact }: Props) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-0 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-lg shadow-navy-900/[0.07] border border-line dark:border-slate-800 ${compact ? '' : 'sm:rounded-full'}`}>
      <div className="flex-1 flex items-center gap-2 px-3">
        <Search size={17} className="text-slate-400 shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSearch()}
          className="w-full py-2.5 sm:py-3 bg-transparent outline-none text-sm" placeholder="Role, skill or company — e.g. React internship" aria-label="Search jobs" />
      </div>
      <div className="flex items-center gap-2 px-3 sm:border-l border-line dark:border-slate-700">
        <MapPin size={17} className="text-slate-400 shrink-0" />
        <input value={locQuery} onChange={e => setLocQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSearch()}
          className="w-full sm:w-36 py-2.5 sm:py-3 bg-transparent outline-none text-sm" placeholder="Location" aria-label="Location" />
      </div>
      <button onClick={onSearch} disabled={loading}
        className="bg-navy-900 hover:bg-navy-800 active:scale-[.98] transition text-white font-semibold px-7 py-3 sm:rounded-full rounded-xl flex gap-2 items-center justify-center disabled:opacity-60 text-sm">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Searching…</> : <><Search size={16} /> Search Jobs</>}
      </button>
    </div>
  )
}
