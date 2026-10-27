import { useEffect, useMemo, useState } from 'react'
import { Search, Bookmark, BookmarkCheck, ExternalLink, Moon, Sun, Home, Briefcase, MapPin, Clock, ShieldCheck, AlertTriangle, Trash2, Filter, ArrowRight, Building2, Banknote, X, CheckCircle2 } from 'lucide-react'
import type { Opportunity, ResearchResponse } from './types'

const JOB_TYPES=['Internship','Placement'] as const
const ROLE_CHIPS=['Frontend Developer','Data Analyst','Full Stack Developer','Digital Marketing','Graduate Engineer Trainee']
const LS=(k:string,d:unknown)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}}

const ACRONYMS=new Set(['ui','ux','sql','aws','gcp','seo','sem','hr','ms','php','html','css','api','bi'])
const formatSkill=(s:string)=>s.split(' ').map(w=>w.split('/').map(p=>ACRONYMS.has(p)?p.toUpperCase():p.charAt(0).toUpperCase()+p.slice(1)).join('/')).join(' ')
const verifyLabel=(s:string)=> s==='verified_official'?'Verified official':s==='demo'?'DEMO — sample only':s==='secondary_source'?'Secondary source':'Needs review'
const statusLabel=(s:string)=>({open:'Open',closing_soon:'Closing soon',expired:'Expired',unknown:'Deadline unknown'} as Record<string,string>)[s]||s
const statusClass=(s:string)=>({open:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',closing_soon:'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',expired:'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',unknown:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} as Record<string,string>)[s]||'bg-slate-100'
const deadlineLine=(o:Opportunity)=>o.deadline?`${o.deadline} • ${statusLabel(o.deadline_status)}`:'Deadline unknown — check official page'
const selectCls='w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400'
const typeBadgeCls=(cat:string)=>cat==='Placement'?'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300':'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'

function JobCard({o,saved,onOpen,onSave}:{o:Opportunity;saved:boolean;onOpen:(o:Opportunity)=>void;onSave:(o:Opportunity)=>void}){
 const applyUrl=o.application_url||o.official_url
 return(
 <article className="card-hover anim-fadeUp bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3">
  <div className="flex justify-between gap-2 flex-wrap">
   <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(o.category)}`}>{o.category}</span>
   <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(o.deadline_status)}`}>{statusLabel(o.deadline_status)}</span>
  </div>
  <h3 className="font-bold text-slate-900 dark:text-white leading-snug">{o.title}</h3>
  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Building2 size={14}/>{o.organizer||'Company not stated — verify on source page'}</p>
  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{o.description||'No description extracted — open the source page for details. Missing fields are never invented.'}</p>
  {(o.skills?.length>0)&&<div className="flex flex-wrap gap-1.5">{o.skills.slice(0,4).map(s=><span key={s} className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-1">{formatSkill(s)}</span>)}{o.skills.length>4&&<span className="text-[11px] text-slate-400 px-1 py-1">+{o.skills.length-4}</span>}</div>}
  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
   <p className="flex gap-1.5 items-center"><MapPin size={13}/>{o.location||'Location unknown'} • {o.mode||'Unknown'}</p>
   <p className="flex gap-1.5 items-center"><Banknote size={13}/>{o.compensation||'Compensation not stated'}</p>
   <p className="flex gap-1.5 items-center"><Clock size={13}/>{deadlineLine(o)}</p>
  </div>
  <div className="mt-auto flex flex-wrap gap-2 pt-1">
   <button onClick={()=>onOpen(o)} className="bg-[#0a1f44] hover:bg-[#12306b] active:scale-[.98] transition text-white text-sm font-medium px-4 py-2.5 rounded-xl">View Details</button>
   {applyUrl&&<a href={applyUrl} target="_blank" rel="noreferrer" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5">Apply <ExternalLink size={14}/></a>}
   <button onClick={()=>onSave(o)} aria-label="Save job" className="text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">{saved?<BookmarkCheck size={15} className="text-teal-600"/>:<Bookmark size={15}/>}{saved?'Saved':'Save'}</button>
  </div>
 </article>)}

interface FilterPanelProps{
 typeFilter:string;roleFilter:string;skillFilter:string;locFilter:string;modeFilter:string;deadlineFilter:string;sort:string
 roleOptions:string[];skillOptions:string[];locationOptions:string[]
 setTypeFilter:(v:string)=>void;setRoleFilter:(v:string)=>void;setSkillFilter:(v:string)=>void;setLocFilter:(v:string)=>void
 setModeFilter:(v:string)=>void;setDeadlineFilter:(v:string)=>void;setSort:(v:string)=>void;onClear:()=>void
}
function FilterPanel(p:FilterPanelProps){
 return(
 <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 lg:sticky lg:top-24 h-fit space-y-4">
  <p className="font-bold flex items-center gap-2"><Filter size={15}/> Filter jobs</p>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Job type</label><select value={p.typeFilter} onChange={e=>p.setTypeFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">All types</option>{JOB_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label><select value={p.roleFilter} onChange={e=>p.setRoleFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">All roles</option>{p.roleOptions.map(r=><option key={r}>{r}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skill</label><select value={p.skillFilter} onChange={e=>p.setSkillFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">Any skill</option>{p.skillOptions.map(s=><option key={s}>{formatSkill(s)}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</label><select value={p.locFilter} onChange={e=>p.setLocFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">Any location</option>{p.locationOptions.map(l=><option key={l}>{l}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Work mode</label><select value={p.modeFilter} onChange={e=>p.setModeFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>In-person</option></select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Deadline</label><select value={p.deadlineFilter} onChange={e=>p.setDeadlineFilter(e.target.value)} className={selectCls+' mt-1'}><option value="">Any deadline</option><option value="upcoming">Open / closing soon</option><option value="unknown">Unknown</option><option value="expired">Expired</option></select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sort by</label><select value={p.sort} onChange={e=>p.setSort(e.target.value)} className={selectCls+' mt-1'}><option value="relevance">Relevance</option><option value="deadline">Deadline (soonest)</option><option value="recent">Recently checked</option></select></div>
  <button onClick={p.onClear} className="text-sm underline text-slate-500">Clear all filters</button>
 </aside>)}

function SearchBar({query,locQuery,setQuery,setLocQuery,onSearch,loading}:{query:string;locQuery:string;setQuery:(v:string)=>void;setLocQuery:(v:string)=>void;onSearch:()=>void;loading:boolean}){
 return(
 <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 dark:border-slate-800">
  <div className="flex-1 flex items-center gap-2 px-3"><Search size={17} className="text-slate-400 shrink-0"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSearch()} className="w-full py-3 bg-transparent outline-none" placeholder="Role, skill or keyword — e.g. React internship" aria-label="Search jobs"/></div>
  <div className="flex items-center gap-2 px-3 sm:border-l border-slate-200 dark:border-slate-700"><MapPin size={17} className="text-slate-400 shrink-0"/><input value={locQuery} onChange={e=>setLocQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSearch()} className="w-full sm:w-40 py-3 bg-transparent outline-none" placeholder="Location" aria-label="Location"/></div>
  <button onClick={onSearch} disabled={loading} className="bg-[#0a1f44] hover:bg-[#12306b] active:scale-[.98] transition text-white font-semibold px-7 py-3.5 rounded-xl flex gap-2 items-center justify-center disabled:opacity-60"><Search size={17}/>{loading?'Searching…':'Search Jobs'}</button>
 </div>)}

export default function App(){
 const [dark,setDark]=useState(()=>LS('fs-dark',false))
 const [view,setView]=useState<'home'|'jobs'|'saved'>('home')
 const [query,setQuery]=useState('Software engineering internships for students in India')
 const [locQuery,setLocQuery]=useState('')
 const [typeFilter,setTypeFilter]=useState(''); const [roleFilter,setRoleFilter]=useState(''); const [skillFilter,setSkillFilter]=useState(''); const [locFilter,setLocFilter]=useState('')
 const [modeFilter,setModeFilter]=useState(''); const [deadlineFilter,setDeadlineFilter]=useState(''); const [sort,setSort]=useState('relevance')
 const [results,setResults]=useState<Opportunity[]>(()=>LS('fs-last-results',[]))
 const [selected,setSelected]=useState<Opportunity|null>(null)
 const [saved,setSaved]=useState<Opportunity[]>(()=>LS('fs-saved',[]))
 const [recent,setRecent]=useState<string[]>(()=>LS('fs-recent',[]))
 const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [stats,setStats]=useState<Record<string,number>|null>(null); const [cached,setCached]=useState(false); const [demo,setDemo]=useState(false); const [warnings,setWarnings]=useState<string[]>([]); const [visible,setVisible]=useState(9); const [health,setHealth]=useState<Record<string,unknown>|null>(null)

 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('fs-dark',JSON.stringify(dark))},[dark])
 useEffect(()=>{localStorage.setItem('fs-saved',JSON.stringify(saved))},[saved])
 useEffect(()=>{localStorage.setItem('fs-recent',JSON.stringify(recent))},[recent])
 useEffect(()=>{localStorage.setItem('fs-last-results',JSON.stringify(results))},[results])
 useEffect(()=>{
   fetch('/api/health').then(r=>r.json()).then(h=>{setHealth(h)
     if(!h.tinyfish_configured){fetch('/api/opportunities/demo').then(r=>r.json()).then(d=>{setResults(prev=>prev.length?prev:d.opportunities);setDemo(true)}).catch(()=>{})}
     else setDemo(false)
   }).catch(()=>setHealth({status:'backend-offline'}))
 },[])

 const isSaved=(id:string)=>saved.some(s=>s.id===id)
 const toggleSave=(o:Opportunity)=>setSaved(p=>isSaved(o.id)?p.filter(x=>x.id!==o.id):[...p,o])

 async function research(q=query,loc=locQuery){
   if(q.trim().length<3){setError('Please enter at least 3 characters to search.');return}
   setLoading(true);setError('');setView('jobs')
   try{
     const r=await fetch('/api/opportunities/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,category:typeFilter||null,location:loc||null,max_fetch:5})})
     if(!r.ok){const e=await r.json().catch(()=>({})); throw new Error((e as {detail?:string}).detail||`Backend error ${r.status}`)}
     const data:ResearchResponse=await r.json()
     setResults(data.opportunities);setStats(data.stats);setCached(data.cached);setDemo(data.demo_mode);setWarnings(data.warnings||[]);setVisible(9)
     setRecent(p=>[q,...p.filter(x=>x!==q)].slice(0,6))
   }catch(e){setError(e instanceof Error?e.message:'Search failed. Is the backend running on port 8000?')}
   finally{setLoading(false)}
 }

 const roleOptions=useMemo(()=>[...new Set(results.map(o=>o.role).filter((r):r is string=>!!r))].sort(),[results])
 const skillOptions=useMemo(()=>[...new Set(results.flatMap(o=>o.skills||[]))].sort(),[results])
 const locationOptions=useMemo(()=>[...new Set(results.map(o=>o.location).filter((l):l is string=>!!l))].sort(),[results])

 const filtered=useMemo(()=>{let out=[...results]
   if(typeFilter) out=out.filter(o=>o.category===typeFilter)
   if(roleFilter) out=out.filter(o=>o.role===roleFilter)
   if(skillFilter) out=out.filter(o=>(o.skills||[]).map(s=>s.toLowerCase()).includes(skillFilter.toLowerCase()))
   if(locFilter) out=out.filter(o=>(o.location||'').toLowerCase().includes(locFilter.toLowerCase()))
   if(modeFilter) out=out.filter(o=>(o.mode||'').toLowerCase()===modeFilter.toLowerCase())
   if(deadlineFilter==='upcoming') out=out.filter(o=>['open','closing_soon'].includes(o.deadline_status))
   if(deadlineFilter==='unknown') out=out.filter(o=>o.deadline_status==='unknown')
   if(deadlineFilter==='expired') out=out.filter(o=>o.deadline_status==='expired')
   if(sort==='deadline') out.sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'))
   if(sort==='recent') out.sort((a,b)=>b.last_checked_at.localeCompare(a.last_checked_at))
   return out},[results,typeFilter,roleFilter,skillFilter,locFilter,modeFilter,deadlineFilter,sort])

 const clearFilters=()=>{setTypeFilter('');setRoleFilter('');setSkillFilter('');setLocFilter('');setModeFilter('');setDeadlineFilter('');setSort('relevance')}
 const openCount=results.filter(o=>['open','closing_soon'].includes(o.deadline_status)).length
 const companyCount=new Set(results.map(o=>o.organizer).filter(Boolean)).size

 return <div className="min-h-screen bg-[#edf1f5] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
  <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
   <button onClick={()=>setView('home')} className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight"><span className="w-9 h-9 rounded-full bg-[#0a1f44] dark:bg-white text-white dark:text-slate-900 grid place-items-center shadow"><Briefcase size={16}/></span> FormSaathi<span className="text-blue-600 text-sm font-semibold hidden sm:inline">Internships & Placements</span></button>
   <nav className="ml-auto flex gap-1 items-center">
     <button onClick={()=>setView('home')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Home size={16}/>Home</button>
     <button onClick={()=>setView('jobs')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Briefcase size={16}/>Browse Jobs</button>
     <button onClick={()=>setView('saved')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Bookmark size={16}/>Saved ({saved.length})</button>
     <button onClick={()=>research()} className="hidden sm:block bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition ml-2">Find Jobs</button>
     <button onClick={()=>setDark(!dark)} aria-label="Toggle dark mode" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
   </nav></div></header>

  {demo&&health&&!health.tinyfish_configured&&<div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 text-amber-900 dark:text-amber-200 text-sm px-4 py-2 text-center"><AlertTriangle size={14} className="inline"/> Demo mode — sample listings only, not live jobs. Add <code>TINYFISH_API_KEY</code> to <code>backend/.env</code> and restart the backend for real internship & placement discovery. {health?.status==='backend-offline'&&' Backend appears offline.'}</div>}

  {view==='home'&&<main className="max-w-7xl mx-auto px-4">
   <section className="relative text-center py-14 md:py-20 overflow-hidden">
     <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl anim-floaty"/>
     <div aria-hidden className="pointer-events-none absolute -top-10 -right-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl anim-floaty"/>
     <div className="relative anim-fadeUp">
     <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 pulse-ring"/> Internship & Placement Portal</span>
     <h1 className="mt-5 text-4xl md:text-[3.4rem]/[1.1] font-bold tracking-tight text-slate-900 dark:text-white">Find the internship or placement<br/>that launches your career.</h1>
     <p className="mt-5 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">Verified internship and campus-placement listings across India — filter by role, skill and location, then apply directly on the official company page.</p>
     <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-500">{['Real source links','No invented deadlines','You apply on the official site'].map(x=><span key={x} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 flex items-center gap-1"><CheckCircle2 size={13} className="text-teal-500"/>{x}</span>)}</div>
     </div>
     <div className="relative mt-9 max-w-3xl mx-auto"><SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={()=>research()} loading={loading}/></div>
     <div className="relative mt-5 flex flex-wrap justify-center gap-2 text-xs">{ROLE_CHIPS.map(x=>{const q=`${x} ${x.includes('Trainee')?'placement':'internship'} in India`;return <button key={x} onClick={()=>{setQuery(q);research(q)}} className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:text-teal-600 transition rounded-full px-3 py-1.5">{x}</button>})}</div>
     {recent.length>0&&<div className="mt-4 text-xs text-slate-500">Recent: {recent.map(r=><button key={r} onClick={()=>research(r)} className="underline mr-2">{r}</button>)}</div>}
   </section>

   <section className="grid grid-cols-3 gap-3 max-w-3xl mx-auto anim-fadeUp">{[[openCount,'Open roles'],[companyCount,'Hiring companies'],[saved.length,'Saved by you']].map(([v,l])=><div key={l as string} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center"><p className="text-2xl md:text-3xl font-bold text-[#0a1f44] dark:text-white">{v as number}</p><p className="text-[11px] md:text-xs text-slate-400 mt-1">{l as string}</p></div>)}</section>

   <section className="py-12">
    <div className="flex items-end justify-between mb-5"><h2 className="font-bold text-2xl tracking-tight">Latest openings</h2><button onClick={()=>setView('jobs')} className="text-sm text-teal-600 font-semibold flex items-center gap-1">Browse all jobs <ArrowRight size={15}/></button></div>
    {results.length===0?<div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 border border-dashed rounded-2xl">Run a search above — internship and placement listings will appear here.</div>
     :<div className="stagger grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.slice(0,6).map(o=><JobCard key={o.id} o={o} saved={isSaved(o.id)} onOpen={setSelected} onSave={toggleSave}/>)}</div>}
   </section>

   <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-10"><h2 className="font-bold text-xl mb-5 flex gap-2 items-center"><ShieldCheck className="text-teal-500"/> How FormSaathi works</h2><ol className="grid md:grid-cols-4 gap-5 text-sm text-slate-600 dark:text-slate-300"><li><b className="text-slate-900 dark:text-white">1. Search roles</b><br/>Enter a role, skill or company, with an optional city.</li><li><b className="text-slate-900 dark:text-white">2. We scan the web</b><br/>TinyFish finds public internship and placement pages.</li><li><b className="text-slate-900 dark:text-white">3. Filter & compare</b><br/>Narrow by role, skill, location, mode and deadline.</li><li><b className="text-slate-900 dark:text-white">4. Apply officially</b><br/>Every listing links to the company’s own application page.</li></ol><p className="text-xs text-slate-500 mt-5">No fake statistics. “Open” appears only when a known future deadline supports it; missing information stays “unknown”.</p></section>

   <section className="grid md:grid-cols-3 gap-4 mb-14 stagger">{[['Are these real jobs?','Every listing links to the page it came from, with the time we checked it. Click the source and verify the opening before you apply.'],['Why is a deadline unknown?','If the company page did not state a date clearly, we say unknown instead of guessing. Never treat unknown as open.'],['Do you apply for me?','No. FormSaathi discovers and organises listings — you always review and submit on the official company site yourself.']].map(([h,b])=><div key={h} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6"><h3 className="font-bold flex gap-2 items-center"><ShieldCheck size={17} className="text-teal-500"/>{h}</h3><p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{b}</p></div>)}</section>
  </main>}

  {view==='jobs'&&<main className="max-w-7xl mx-auto px-4 py-8">
   <SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={()=>research()} loading={loading}/>
   {loading&&<div className="mt-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse">Searching → fetching pages → extracting roles & skills → deduplicating…</div>}
   {stats&&!loading&&<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">{[['Candidate pages',stats.candidates],['Pages inspected',stats.fetched],['Valid listings',stats.extracted],['Duplicates removed',stats.duplicates_removed]].map(([k,v])=><div key={k as string} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"><b className="text-2xl text-teal-600">{v as number}</b><br/><span className="text-xs text-slate-500">{k as string}</span></div>)}</div>}
   {cached&&<p className="text-xs mt-2 text-slate-500">Served from temporary backend cache (up to 10 min) to avoid repeating the same research.</p>}
   {warnings.map(w=><p key={w} className="text-xs mt-2 text-amber-700 dark:text-amber-300">{w}</p>)}
   {error&&<div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-xl p-4 text-sm">{error}</div>}
   <div className="grid lg:grid-cols-4 gap-5 mt-6">
    <FilterPanel typeFilter={typeFilter} roleFilter={roleFilter} skillFilter={skillFilter} locFilter={locFilter} modeFilter={modeFilter} deadlineFilter={deadlineFilter} sort={sort}
      roleOptions={roleOptions} skillOptions={skillOptions} locationOptions={locationOptions}
      setTypeFilter={setTypeFilter} setRoleFilter={setRoleFilter} setSkillFilter={setSkillFilter} setLocFilter={setLocFilter}
      setModeFilter={setModeFilter} setDeadlineFilter={setDeadlineFilter} setSort={setSort} onClear={clearFilters}/>
    <section className="lg:col-span-3">
     <p className="text-sm text-slate-500 mb-4">Showing <b className="text-slate-900 dark:text-white">{filtered.length}</b> of {results.length} listings</p>
     {loading?<div className="grid xl:grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-56 skeleton rounded-2xl"/>)}</div>
      : filtered.length===0?<div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 border border-dashed rounded-2xl">No listings match. Try a broader search or clear filters.</div>
      :<><div className="grid xl:grid-cols-2 gap-4">{filtered.slice(0,visible).map(o=><JobCard key={o.id} o={o} saved={isSaved(o.id)} onOpen={setSelected} onSave={toggleSave}/>)}</div>{visible<filtered.length&&<button onClick={()=>setVisible(v=>v+9)} className="mt-6 mx-auto flex bg-[#0a1f44] text-white px-5 py-3 rounded-xl text-sm font-semibold">Load more <ArrowRight size={16}/></button>}</>}
    </section>
   </div>
  </main>}

  {view==='saved'&&<main className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-2xl font-bold mb-2">Your saved listings</h1><p className="text-sm text-slate-500 mb-6">Saved only in this browser (localStorage) — they do not sync across devices and there is no account.</p>{saved.length===0?<div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed rounded-2xl text-slate-500"><Bookmark size={22} className="mx-auto mb-2 text-slate-300"/>Nothing saved yet. Click “Save” on any listing.</div>:<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{saved.map(o=><JobCard key={o.id} o={o} saved={isSaved(o.id)} onOpen={setSelected} onSave={toggleSave}/>)}</div>}<button onClick={()=>{if(confirm('Clear all saved listings?'))setSaved([])}} className="mt-6 text-sm text-red-600 flex gap-1 items-center"><Trash2 size={14}/> Clear saved</button></main>}

  {selected&&<div className="fixed inset-0 bg-black/50 z-30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={()=>setSelected(null)}><div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-auto rounded-t-3xl md:rounded-3xl" onClick={e=>e.stopPropagation()}>
    <div className="p-6 md:p-8">
    <div className="flex justify-between items-center gap-2"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(selected.category)}`}>{selected.category}</span><button onClick={()=>setSelected(null)} aria-label="Close details"><X size={20}/></button></div>
    <h2 className="text-2xl font-bold mt-3 leading-snug">{selected.title}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1"><span className="flex items-center gap-1.5"><Building2 size={14}/>{selected.organizer||'Company not stated'}</span><span className="flex items-center gap-1.5"><MapPin size={14}/>{selected.location||'Location unknown'} • {selected.mode||'Unknown'}</span></p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Banknote size={12}/>Compensation</p><p className="text-sm font-semibold mt-1">{selected.compensation||'Not stated'}</p></div>
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Clock size={12}/>Deadline</p><p className="text-sm font-semibold mt-1">{selected.deadline?`${selected.deadline} (${statusLabel(selected.deadline_status)})`:'Unknown — verify before applying'}</p></div>
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400">Role</p><p className="text-sm font-semibold mt-1">{selected.role||'Not classified'}</p></div>
    </div>
    {selected.skills?.length>0&&<div className="mt-6"><h3 className="font-semibold text-sm mb-2">Skills required</h3><div className="flex flex-wrap gap-2">{selected.skills.map(s=><span key={s} className="text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5">{formatSkill(s)}</span>)}</div></div>}
    <div className="mt-6"><h3 className="font-semibold text-sm mb-2">About the role</h3><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selected.description||'Not extracted — open the source page for the full description.'}</p></div>
    <div className="mt-6"><h3 className="font-semibold text-sm mb-2">Eligibility & requirements</h3>{selected.eligibility?.length?<ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-1">{selected.eligibility.map((e,i)=><li key={i}>{e}</li>)}</ul>:<p className="text-sm text-slate-500">Not extracted — check the official page.</p>}</div>
    <dl className="mt-6 space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-5">
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Verification:</dt><dd>{verifyLabel(selected.verification_status)} • type: {selected.source_type}</dd></div>
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Last checked:</dt><dd>{new Date(selected.last_checked_at).toLocaleString()}</dd></div>
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Source:</dt><dd><a className="text-teal-600 underline break-all" href={selected.source_url} target="_blank" rel="noreferrer">{selected.source_url}</a></dd></div>
      {selected.also_found_on?.length>0&&<div className="flex gap-2"><dt className="font-semibold shrink-0">Also found on:</dt><dd className="break-all">{selected.also_found_on.join(', ')}</dd></div>}
    </dl>
    <p className="text-xs bg-amber-50 dark:bg-amber-950 rounded-xl p-3 mt-5">Always review official requirements on the company’s page and submit your application yourself. FormSaathi never submits applications for you.</p>
    <div className="flex flex-wrap gap-2 mt-5">
      <a href={selected.application_url||selected.official_url||selected.source_url} target="_blank" rel="noreferrer" className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2">Apply on Official Site <ExternalLink size={16}/></a>
      <button onClick={()=>toggleSave(selected)} className="border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2">{isSaved(selected.id)?<BookmarkCheck size={16} className="text-teal-600"/>:<Bookmark size={16}/>}{isSaved(selected.id)?'Saved':'Save Listing'}</button>
    </div>
    </div>
  </div></div>}

  <footer className="bg-white dark:bg-slate-900 text-slate-500 mt-4 border-t border-slate-200 dark:border-slate-800"><div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8 text-sm"><div><p className="text-slate-900 dark:text-white font-extrabold text-lg flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 grid place-items-center"><Briefcase size={15}/></span>FormSaathi</p><p className="mt-3 text-slate-400 leading-relaxed">Internship & placement discovery across public company websites, with verifiable source links and clear role, skill and location filters.</p></div><div><p className="text-slate-900 dark:text-white font-semibold mb-3">Explore</p><div className="flex flex-col gap-2 items-start"><button onClick={()=>setView('jobs')}>Browse jobs</button><button onClick={()=>setView('saved')}>Saved listings</button><button onClick={()=>setView('home')}>Home</button></div></div><div><p className="text-slate-900 dark:text-white font-semibold mb-3">Trust & privacy</p><p className="text-slate-400 leading-relaxed">Listings link to original sources. Saved items live only in your browser (localStorage) — no account, no sync. Always apply on the official company site yourself.</p></div></div><p className="text-center text-xs text-slate-500 pb-8 px-4">FormSaathi • Internships & Placements • In-memory backend results reset on restart • Never share your API key publicly</p></footer>
 </div>
}
