import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, Bookmark, BookmarkCheck, ExternalLink, Moon, Sun, Compass, Home, LayoutDashboard, Clock, MapPin, ShieldCheck, AlertTriangle, Trash2, Filter, ArrowRight, GraduationCap, Briefcase, Trophy, Code2, Lightbulb, Award, Presentation, BookOpen, Landmark } from 'lucide-react'
import type { Opportunity, ResearchResponse } from './types'

const CATS=[{name:'Scholarship',icon:GraduationCap},{name:'Internship',icon:Briefcase},{name:'Hackathon',icon:Trophy},{name:'Coding Competition',icon:Code2},{name:'Innovation Challenge',icon:Lightbulb},{name:'Fellowship',icon:Award},{name:'Workshop',icon:Presentation},{name:'Free Course',icon:BookOpen},{name:'Government Programme',icon:Landmark}]
const LS=(k:string,d:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}}
const badge=(s:string)=> s==='verified_official'?'Verified official':s==='demo'?'DEMO — sample only':s==='secondary_source'?'Secondary source':'Needs review'
const dBadge=(o:Opportunity)=> o.deadline? `${o.deadline} • ${o.deadline_status.replace('_',' ')}`:'Deadline unknown — check official page'

export default function App(){
 const [dark,setDark]=useState(()=>LS('fs-dark',false))
 const [view,setView]=useState<'home'|'discover'|'saved'>('home')
 const [query,setQuery]=useState('Find open hackathons for college students in India')
 const [category,setCategory]=useState(''); const [mode,setMode]=useState(''); const [deadlineF,setDeadlineF]=useState(''); const [fee,setFee]=useState(''); const [sort,setSort]=useState('relevance')
 const [results,setResults]=useState<Opportunity[]>(()=>LS('fs-last-results',[]))
 const [selected,setSelected]=useState<Opportunity|null>(null)
 const [saved,setSaved]=useState<Opportunity[]>(()=>LS('fs-saved',[]))
 const [recent,setRecent]=useState<string[]>(()=>LS('fs-recent',[]))
 const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [stats,setStats]=useState<any>(null); const [cached,setCached]=useState(false); const [demo,setDemo]=useState(false); const [warnings,setWarnings]=useState<string[]>([]); const [visible,setVisible]=useState(9); const [health,setHealth]=useState<any>(null)

 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('fs-dark',JSON.stringify(dark))},[dark])
 useEffect(()=>{localStorage.setItem('fs-saved',JSON.stringify(saved))},[saved])
 useEffect(()=>{localStorage.setItem('fs-recent',JSON.stringify(recent))},[recent])
 useEffect(()=>{localStorage.setItem('fs-last-results',JSON.stringify(results))},[results])
 useEffect(()=>{fetch('/api/health').then(r=>r.json()).then(h=>{setHealth(h); if(!h.tinyfish_configured && !results.length){fetch('/api/opportunities/demo').then(r=>r.json()).then(d=>{setResults(d.opportunities);setDemo(true)}).catch(()=>{})} else setDemo(false)}).catch(()=>setHealth({status:'backend-offline'}))},[])

 const isSaved=(id:string)=>saved.some(s=>s.id===id)
 const toggleSave=(o:Opportunity)=>setSaved(p=>isSaved(o.id)?p.filter(x=>x.id!==o.id):[...p,o])

 async function research(q=query,cat=category){
   setLoading(true);setError('');setView('discover')
   try{
     const r=await fetch('/api/opportunities/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,category:cat||null,mode:mode||null,max_fetch:5})})
     if(!r.ok){const e=await r.json().catch(()=>({})); throw new Error(e.detail||`Backend error ${r.status}`)}
     const data:ResearchResponse=await r.json()
     setResults(data.opportunities);setStats(data.stats);setCached(data.cached);setDemo(data.demo_mode);setWarnings(data.warnings||[])
     setRecent(p=>[q,...p.filter(x=>x!==q)].slice(0,6))
   }catch(e:any){setError(e.message||'Search failed. Is the backend running on port 8000?')}
   finally{setLoading(false)}
 }

 const filtered=useMemo(()=>{let out=[...results]
   if(category) out=out.filter(o=>o.category===category)
   if(mode) out=out.filter(o=>(o.mode||'').toLowerCase()===mode.toLowerCase())
   if(deadlineF==='upcoming') out=out.filter(o=>['open','closing_soon'].includes(o.deadline_status))
   if(deadlineF==='unknown') out=out.filter(o=>o.deadline_status==='unknown')
   if(deadlineF==='expired') out=out.filter(o=>o.deadline_status==='expired')
   if(fee==='free') out=out.filter(o=>o.fees?.toLowerCase().includes('free'))
   if(sort==='deadline') out.sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'))
   if(sort==='recent') out.sort((a,b)=>b.last_checked_at.localeCompare(a.last_checked_at))
   return out},[results,category,mode,deadlineF,fee,sort])

 const clear=()=>{setCategory('');setMode('');setDeadlineF('');setFee('');setSort('relevance')}

 const Card=({o}:{o:Opportunity})=>(
  <article className="card-hover anim-fadeUp bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3">
   <div className="flex justify-between gap-2"><span className="text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-full">{o.category}</span><span className={`text-xs px-2 py-1 rounded-full ${o.verification_status==='demo'?'bg-amber-100 text-amber-800':'bg-slate-100 dark:bg-slate-800'}`}>{badge(o.verification_status)}</span></div>
   <h3 className="font-bold text-slate-900 dark:text-white leading-snug">{o.title}</h3>
   {o.organizer&&<p className="text-sm text-slate-500">{o.organizer}</p>}
   <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{o.description||'No description extracted — open the source page for details. Missing fields are never invented.'}</p>
   {o.eligibility?.length>0&&<p className="text-xs text-slate-500"><b>Eligibility:</b> {o.eligibility.slice(0,2).join('; ')}</p>}
   <div className="text-xs text-slate-500 space-y-1"><p className="flex gap-1 items-center"><MapPin size={13}/>{o.location||'Location unknown'} • {o.mode||'Unknown'}</p><p className="flex gap-1 items-center"><Clock size={13}/>{dBadge(o)}</p>{o.fees&&<p>Fee: {o.fees}</p>}<p>Checked: {new Date(o.last_checked_at).toLocaleString()}</p></div>
   <div className="mt-auto flex flex-wrap gap-2">
     <button onClick={()=>setSelected(o)} className="bg-[#0a1f44] hover:bg-[#12306b] active:scale-[.98] transition text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow">View Details</button>
     {(o.application_url||o.official_url)&&<a href={o.application_url||o.official_url!} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-xl border flex gap-1 items-center">Official <ExternalLink size={14}/></a>}
     <button onClick={()=>toggleSave(o)} aria-label="Save opportunity" className="text-sm px-3 py-2 rounded-xl border flex gap-1 items-center">{isSaved(o.id)?<BookmarkCheck size={15}/>:<Bookmark size={15}/>}{isSaved(o.id)?'Saved':'Save'}</button>
   </div>
  </article>)

 return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
  <header className="sticky top-0 z-20 bg-[#071633]/95 backdrop-blur-md text-white shadow-lg shadow-navy-900/20 border-b border-white/10"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
   <button onClick={()=>setView('home')} className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight"><span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 grid place-items-center shadow-lg shadow-teal-500/30"><Sparkles size={18}/></span> FormSaathi <span className="text-teal-400">AI</span></button><span className="hidden lg:inline text-teal-200/70 text-sm font-light">Discover Opportunities. Never Miss a Chance.</span>
   <nav className="ml-auto flex gap-1 items-center">
     <button onClick={()=>setView('home')} className="px-3 py-2 rounded-lg hover:bg-white/10 flex gap-1 items-center"><Home size={16}/>Home</button>
     <button onClick={()=>setView('discover')} className="px-3 py-2 rounded-lg hover:bg-white/10 flex gap-1 items-center"><Compass size={16}/>Discover</button>
     <button onClick={()=>setView('saved')} className="px-3 py-2 rounded-lg hover:bg-white/10 flex gap-1 items-center"><LayoutDashboard size={16}/>Saved ({saved.length})</button>
     <button onClick={()=>setDark(!dark)} aria-label="Toggle dark mode" className="p-2 rounded-lg hover:bg-white/10">{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
   </nav></div></header>

  {demo&&health&&!health.tinyfish_configured&&<div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 text-amber-900 dark:text-amber-200 text-sm px-4 py-2 text-center"><AlertTriangle size={14} className="inline"/> Demo mode — sample records only, not live results. Add <code>TINYFISH_API_KEY</code> to <code>backend/.env</code> and restart the backend for real web discovery. {health?.status==='backend-offline'&&' Backend appears offline.'}</div>}

  {view==='home'&&<main className="max-w-7xl mx-auto px-4">
   <section className="relative text-center py-16 md:py-20 overflow-hidden">
     <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl anim-floaty"/>
     <div aria-hidden className="pointer-events-none absolute -top-10 -right-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl anim-floaty"/>
     <div className="relative anim-fadeUp">
     <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full shadow-sm"><span className="w-2 h-2 rounded-full bg-teal-500 pulse-ring"/> AI-POWERED WEB RESEARCH • LIVE SOURCES</span>
     <h1 className="mt-6 text-4xl md:text-6xl/tight font-extrabold tracking-tight text-[#0a1f44] dark:text-white">Your Next Opportunity<br/><span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400 bg-clip-text text-transparent">Is Out There.</span></h1>
     <p className="mt-5 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">Search scholarships, internships, hackathons and more across public official websites — in one place, with source links you can verify.</p>
     <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-slate-500"><span className="bg-white dark:bg-slate-900 border rounded-full px-3 py-1.5">✓ Real source links</span><span className="bg-white dark:bg-slate-900 border rounded-full px-3 py-1.5">✓ No invented deadlines</span><span className="bg-white dark:bg-slate-900 border rounded-full px-3 py-1.5">✓ You apply on the official site</span></div>
     </div>
     <div className="relative mt-9 flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200 dark:border-slate-800"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&research()} className="flex-1 rounded-2xl px-5 py-3.5 bg-transparent outline-none" placeholder="Find scholarships, hackathons, internships…" aria-label="Search opportunities"/><button onClick={()=>research()} disabled={loading} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:opacity-95 active:scale-[.98] transition text-white font-semibold px-7 py-3.5 rounded-2xl flex gap-2 items-center justify-center shadow-lg shadow-teal-500/25 disabled:opacity-60"><Search size={18}/>{loading?'Searching…':'Discover Opportunities'}</button></div>
     {<div className="relative mt-5 flex flex-wrap justify-center gap-2 text-xs">{['Scholarships for engineers','Remote internships for beginners','Free AI courses','Coding competitions'].map(x=><button key={x} onClick={()=>{setQuery(x);research(x)}} className="bg-white/80 dark:bg-slate-900 border hover:border-teal-400 hover:text-teal-600 transition rounded-full px-3 py-1.5">{x}</button>)}</div>}
     {recent.length>0&&<div className="mt-4 text-xs text-slate-500">Recent: {recent.map(r=><button key={r} onClick={()=>{setQuery(r);research(r)}} className="underline mr-2">{r}</button>)}</div>}
   </section>
   <section className="stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-10">{CATS.map(c=>{const Icon=c.icon;return <button key={c.name} onClick={()=>{setCategory(c.name);research(`${c.name} for students in India`,c.name)}} className="card-hover group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-left shadow-sm"><span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 grid place-items-center mb-3 group-hover:scale-110 transition"><Icon className="text-teal-600 dark:text-teal-300" size={20}/></span><b className="text-sm">{c.name}</b><p className="text-xs text-slate-500 mt-1">Explore →</p></button>})}</section>
   <section className="bg-white dark:bg-slate-900 border rounded-3xl p-6 mb-10"><h2 className="font-bold text-xl mb-3 flex gap-2"><ShieldCheck className="text-teal-500"/> How FormSaathi works</h2><ol className="grid md:grid-cols-4 gap-4 text-sm text-slate-600 dark:text-slate-300"><li><b>1. You search</b><br/>Tell us what you need.</li><li><b>2. We search the web</b><br/>TinyFish Search finds candidate public pages.</li><li><b>3. We inspect pages</b><br/>TinyFish Fetch extracts details; Agent only if needed.</li><li><b>4. You verify & apply</b><br/>We clean, dedupe and link sources. You apply yourself on the official site.</li></ol><p className="text-xs text-slate-500 mt-4">No fake statistics. “Open” is only shown when a known future deadline supports it. Missing info stays “unknown”.</p></section>
   <section className="grid md:grid-cols-3 gap-4 mb-12 stagger">{[['Is it really live?','Every result links to the page it came from, with the time we checked it. Click the source and verify before you apply.'],['Why is a deadline unknown?','If the official page did not state a date clearly, we say unknown instead of guessing. Never assume unknown means open.'],['Do you apply for me?','No. FormSaathi discovers and organises opportunities — you always review and submit on the official organiser site yourself.']].map(([h,b])=><div key={h} className="bg-white dark:bg-slate-900 border rounded-3xl p-6"><h3 className="font-bold flex gap-2 items-center"><ShieldCheck size={17} className="text-teal-500"/>{h}</h3><p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{b}</p></div>)}</section>
   <h2 className="font-bold text-2xl tracking-tight mb-4">Recently discovered</h2>
   <div className="stagger grid md:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">{filtered.slice(0,6).map(o=><Card key={o.id} o={o}/>)}</div>
  </main>}

  {view==='discover'&&<main className="max-w-7xl mx-auto px-4 py-8">
   <div className="flex flex-col md:flex-row gap-3"><input value={query} onChange={e=>setQuery(e.target.value)} className="flex-1 border rounded-xl px-4 py-3 bg-white dark:bg-slate-900" aria-label="Search query"/><button onClick={()=>research()} disabled={loading} className="bg-teal-500 text-white px-5 py-3 rounded-xl font-semibold">{loading?'Researching the web…':'Search the Web'}</button></div>
   {loading&&<div className="mt-4 text-sm bg-white dark:bg-slate-900 border rounded-xl p-4 animate-pulse">Searching → fetching pages → extracting → deduplicating… (real progress appears below when finished)</div>}
   {stats&&!loading&&<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">{[['Candidate pages',stats.candidates],['Pages inspected',stats.fetched],['Valid opportunities',stats.extracted],['Duplicates removed',stats.duplicates_removed]].map(([k,v])=><div key={k as string} className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm"><b className="text-2xl text-teal-600">{v as number}</b><br/>{k}</div>)}</div>}
   {cached&&<p className="text-xs mt-2 text-slate-500">Served from temporary backend cache (up to 10 min) to avoid repeating the same research.</p>}
   {warnings.map(w=><p key={w} className="text-xs mt-2 text-amber-700 dark:text-amber-300">{w}</p>)}
   {error&&<div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-xl p-4 text-sm">{error}</div>}
   <div className="mt-6 flex flex-wrap gap-2 items-center bg-white dark:bg-slate-900 border rounded-2xl p-4">
     <Filter size={16}/><select value={category} onChange={e=>setCategory(e.target.value)} className="border rounded-lg px-2 py-2 bg-transparent"><option value="">All categories</option>{CATS.map(c=><option key={c.name}>{c.name}</option>)}</select>
     <select value={mode} onChange={e=>setMode(e.target.value)} className="border rounded-lg px-2 py-2 bg-transparent"><option value="">Any mode</option><option>Online</option><option>Remote</option><option>Hybrid</option><option>In-person</option></select>
     <select value={deadlineF} onChange={e=>setDeadlineF(e.target.value)} className="border rounded-lg px-2 py-2 bg-transparent"><option value="">Any deadline</option><option value="upcoming">Upcoming</option><option value="unknown">Unknown</option><option value="expired">Expired</option></select>
     <select value={fee} onChange={e=>setFee(e.target.value)} className="border rounded-lg px-2 py-2 bg-transparent"><option value="">Any fee</option><option value="free">Free</option></select>
     <select value={sort} onChange={e=>setSort(e.target.value)} className="border rounded-lg px-2 py-2 bg-transparent"><option value="relevance">Sort: Relevance</option><option value="deadline">Sort: Deadline</option><option value="recent">Sort: Recently checked</option></select>
     <button onClick={clear} className="text-sm underline">Clear filters</button>
   </div>
   {loading?<div className="grid md:grid-cols-3 gap-4 mt-6">{[1,2,3].map(i=><div key={i} className="h-48 skeleton rounded-3xl"/>)}</div>
   : filtered.length===0?<div className="text-center py-16 text-slate-500">No opportunities match. Try a broader search or clear filters.</div>
   :<><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">{filtered.slice(0,visible).map(o=><Card key={o.id} o={o}/>)}</div>{visible<filtered.length&&<button onClick={()=>setVisible(v=>v+9)} className="mt-6 mx-auto flex bg-[#0a1f44] text-white px-5 py-3 rounded-xl">Load more <ArrowRight size={16}/></button>}</>}
  </main>}

  {view==='saved'&&<main className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-2xl font-bold mb-2">Your saved opportunities</h1><p className="text-sm text-slate-500 mb-6">Saved only in this browser (localStorage) — they do not sync across devices and there is no account.</p>{saved.length===0?<p className="text-slate-500">Nothing saved yet. Click “Save” on any card.</p>:<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{saved.map(o=><Card key={o.id} o={o}/>)}</div>}<button onClick={()=>{if(confirm('Clear all saved?'))setSaved([])}} className="mt-6 text-sm text-red-600 flex gap-1 items-center"><Trash2 size={14}/> Clear saved</button></main>}

  {selected&&<div className="fixed inset-0 bg-black/50 z-30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={()=>setSelected(null)}><div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-t-3xl md:rounded-3xl p-6" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between"><span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 px-2 py-1 rounded-full">{selected.category}</span><button onClick={()=>setSelected(null)}>✕</button></div>
    <h2 className="text-2xl font-bold mt-3">{selected.title}</h2><p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{selected.description||'Not extracted.'}</p>
    <dl className="mt-5 space-y-2 text-sm">
      <div><dt className="font-semibold">Organizer</dt><dd>{selected.organizer||'Not published / not extracted — check source page'}</dd></div>
      <div><dt className="font-semibold">Eligibility</dt><dd>{selected.eligibility?.length?selected.eligibility.join('; '):'Not extracted — check official page'}</dd></div>
      <div><dt className="font-semibold">Location / Mode</dt><dd>{selected.location||'Unknown'} • {selected.mode||'Unknown'}</dd></div>
      <div><dt className="font-semibold">Deadline</dt><dd>{selected.deadline?`${selected.deadline} (${selected.deadline_status})`:'Unknown — do not assume it is open; verify on official page'}</dd></div>
      <div><dt className="font-semibold">Fees</dt><dd>{selected.fees||'Not stated in extracted content'}</dd></div>
      <div><dt className="font-semibold">Verification</dt><dd>{badge(selected.verification_status)} • Type: {selected.source_type}</dd></div>
      <div><dt className="font-semibold">Last checked</dt><dd>{new Date(selected.last_checked_at).toLocaleString()}</dd></div>
      <div><dt className="font-semibold">Source</dt><dd><a className="text-teal-600 underline break-all" href={selected.source_url} target="_blank" rel="noreferrer">{selected.source_url}</a></dd></div>
      {selected.also_found_on?.length>0&&<div><dt className="font-semibold">Also found on</dt><dd className="break-all">{selected.also_found_on.join(', ')}</dd></div>}
    </dl>
    <p className="text-xs bg-amber-50 dark:bg-amber-950 rounded-xl p-3 mt-4">Always review official requirements on the organizer’s page and submit your application yourself. FormSaathi never submits applications for you.</p>
    <div className="flex gap-2 mt-4"><a href={selected.application_url||selected.official_url||selected.source_url} target="_blank" rel="noreferrer" className="bg-teal-500 text-white px-4 py-3 rounded-xl font-semibold">Open Official Application</a><button onClick={()=>toggleSave(selected)} className="border px-4 py-3 rounded-xl">{isSaved(selected.id)?'Saved':'Save Opportunity'}</button></div>
  </div></div>}
  <footer className="bg-[#071633] text-slate-300 mt-4"><div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8 text-sm"><div><p className="text-white font-extrabold text-lg flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 grid place-items-center"><Sparkles size={15}/></span>FormSaathi AI</p><p className="mt-3 text-slate-400 leading-relaxed">Discover Opportunities. Never Miss a Chance. AI-powered discovery across public official websites, with verifiable source links.</p></div><div><p className="text-white font-semibold mb-3">Explore</p><div className="flex flex-col gap-2 items-start"><button onClick={()=>setView('discover')}>Discover opportunities</button><button onClick={()=>setView('saved')}>Saved opportunities</button><button onClick={()=>setView('home')}>Home</button></div></div><div><p className="text-white font-semibold mb-3">Trust & privacy</p><p className="text-slate-400 leading-relaxed">Results link to original sources. Saved items live only in your browser (localStorage) — no account, no sync. Always apply on the official site yourself.</p></div></div><p className="text-center text-xs text-slate-500 pb-8 px-4">FormSaathi AI • In-memory backend results reset on restart • Never share your API key publicly</p></footer>
 </div>
}
