import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Bookmark, BookmarkCheck, ExternalLink, Moon, Sun, Home, Briefcase, MapPin, Clock, ShieldCheck, ShieldAlert, AlertTriangle, Trash2, Filter, ArrowRight, Building2, Banknote, X, CheckCircle2, CalendarPlus, UserCircle, ClipboardList, Flag, LogOut, Bell, BookmarkPlus, RefreshCw, Link2, Loader2 } from 'lucide-react'
import type { Opportunity, ResearchResponse, Stage, TrackerEntry, StudentProfile, ReportRecord, SavedSearch } from './types'
import { LS, formatSkill, verifyLabel, statusLabel, statusClass, deadlineLine, typeBadgeCls, inCompBand, COMP_BANDS, matchScore, matchColor, downloadIcs, nowIso } from './lib/helpers'
import { buildResumeQuery, type ParsedResume } from './lib/resume'
import { useAuth } from './lib/auth'
import { migrateLocalToCloud, pullCloudTracker, upsertSaved, deleteSaved, insertReport, listSavedSearches, createSavedSearch, deleteSavedSearch, listNotifications, createNotification } from './lib/cloud'
import ProfileModal from './components/ProfileModal'
import TrackerBoard from './components/TrackerBoard'
import ReportModal from './components/ReportModal'
import ResumeUploader from './components/ResumeUploader'
import ResumeReviewModal from './components/ResumeReviewModal'
import AuthModal from './components/AuthModal'
import NotificationsBell from './components/NotificationsBell'
import CompaniesView from './components/CompaniesView'
import Logo from './components/Logo'

const JOB_TYPES=['Internship','Placement'] as const
const ROLE_CHIPS=['Frontend Developer','Data Analyst','Full Stack Developer','Digital Marketing','Graduate Engineer Trainee']
const EMPTY_PROFILE:StudentProfile={skills:[],batch:'',degree:'',locations:[],modes:[],filled:false}
const STAGE_LABEL:Record<Stage,string>={saved:'Saved',applied:'Applied',interview:'Interview',offer:'Offer',rejected:'Rejected'}

function migrateTracker():Record<string,TrackerEntry>{
  const t=LS('fs-tracker',{}) as Record<string,TrackerEntry>
  const legacy=LS('fs-saved',[]) as Opportunity[]
  legacy.forEach(o=>{ if(!t[o.id]) t[o.id]={job:o,stage:'saved',notes:'',updatedAt:new Date().toISOString()} })
  return t
}

function JobCard({o,entry,reported,profile,onOpen,onSave,onStage}:{o:Opportunity;entry?:TrackerEntry;reported:boolean;profile:StudentProfile;onOpen:(o:Opportunity)=>void;onSave:(o:Opportunity)=>void;onStage:(o:Opportunity,s:Stage)=>void}){
 const applyUrl=o.application_url||o.official_url
 const match=matchScore(o,profile)
 return(
 <article className="card-hover anim-fadeUp bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3">
  <div className="flex justify-between gap-2 flex-wrap">
   <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(o.category)}`}>{o.category}</span>
   <div className="flex items-center gap-1.5">
    {match&&<span title={match.reasons.join(' • ')} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${matchColor(match.score)}`}>{match.score}% match</span>}
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(o.deadline_status)}`}>{statusLabel(o.deadline_status)}</span>
   </div>
  </div>
  {o.fraud_flags?.length>0&&<div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-3 py-2 text-xs flex gap-2"><ShieldAlert size={15} className="shrink-0 mt-0.5"/><span><b>Warning:</b> {o.fraud_flags[0]}</span></div>}
  <h3 className="font-bold text-slate-900 dark:text-white leading-snug">{o.title}</h3>
  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Building2 size={14}/>{o.organizer||'Company not stated — verify on source page'}</p>
  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{o.description||'No description extracted — open the source page for details. Missing fields are never invented.'}</p>
  {(o.skills?.length>0)&&<div className="flex flex-wrap gap-1.5">{o.skills.slice(0,4).map(s=><span key={s} className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-1">{formatSkill(s)}</span>)}{o.skills.length>4&&<span className="text-[11px] text-slate-400 px-1 py-1">+{o.skills.length-4}</span>}</div>}
  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
   <p className="flex gap-1.5 items-center"><MapPin size={13}/>{o.location||'Location unknown'} • {o.mode||'Unknown'}</p>
   <p className="flex gap-1.5 items-center"><Banknote size={13}/>{o.compensation||'Compensation not stated'}</p>
   <p className="flex gap-1.5 items-center"><Clock size={13}/>{deadlineLine(o)}</p>
  </div>
  {reported&&<p className="text-[11px] text-red-600 flex items-center gap-1"><Flag size={11}/> You reported this listing</p>}
  <div className="mt-auto flex flex-wrap gap-2 pt-1">
   <button onClick={()=>onOpen(o)} className="bg-[#0a1f44] hover:bg-[#12306b] active:scale-[.98] transition text-white text-sm font-medium px-4 py-2.5 rounded-xl">View Details</button>
   {applyUrl&&<a href={applyUrl} target="_blank" rel="noreferrer" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5">Apply <ExternalLink size={14}/></a>}
   {entry?<select value={entry.stage} onChange={e=>onStage(o,e.target.value as Stage)} aria-label="Application stage" className="text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium">{(Object.keys(STAGE_LABEL) as Stage[]).map(s=><option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
    :<button onClick={()=>onSave(o)} aria-label="Save job" className="text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"><Bookmark size={15}/>Save</button>}
  </div>
 </article>)}

interface FilterPanelProps{
 typeFilter:string;roleFilter:string;skillFilter:string;locFilter:string;modeFilter:string;deadlineFilter:string;compBand:string;sort:string;profileFilled:boolean
 roleOptions:string[];skillOptions:string[];locationOptions:string[]
 set:(k:string,v:string)=>void;onClear:()=>void
}
function FilterPanel(p:FilterPanelProps){
 const selectCls='w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400'
 return(
 <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 lg:sticky lg:top-24 h-fit space-y-4">
  <p className="font-bold flex items-center gap-2"><Filter size={15}/> Filter jobs</p>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Job type</label><select value={p.typeFilter} onChange={e=>p.set('type',e.target.value)} className={selectCls+' mt-1'}><option value="">All types</option>{JOB_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label><select value={p.roleFilter} onChange={e=>p.set('role',e.target.value)} className={selectCls+' mt-1'}><option value="">All roles</option>{p.roleOptions.map(r=><option key={r}>{r}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skill</label><select value={p.skillFilter} onChange={e=>p.set('skill',e.target.value)} className={selectCls+' mt-1'}><option value="">Any skill</option>{p.skillOptions.map(s=><option key={s}>{formatSkill(s)}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</label><select value={p.locFilter} onChange={e=>p.set('loc',e.target.value)} className={selectCls+' mt-1'}><option value="">Any location</option>{p.locationOptions.map(l=><option key={l}>{l}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Work mode</label><select value={p.modeFilter} onChange={e=>p.set('mode',e.target.value)} className={selectCls+' mt-1'}><option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>In-person</option></select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Compensation</label><select value={p.compBand} onChange={e=>p.set('comp',e.target.value)} className={selectCls+' mt-1'}><option value="">Any compensation</option>{COMP_BANDS.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Deadline</label><select value={p.deadlineFilter} onChange={e=>p.set('deadline',e.target.value)} className={selectCls+' mt-1'}><option value="">Any deadline</option><option value="upcoming">Open / closing soon</option><option value="unknown">Unknown</option><option value="expired">Expired</option></select></div>
  <div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sort by</label><select value={p.sort} onChange={e=>p.set('sort',e.target.value)} className={selectCls+' mt-1'}><option value="relevance">Relevance</option>{p.profileFilled&&<option value="match">Best match for you</option>}<option value="deadline">Deadline (soonest)</option><option value="recent">Recently checked</option></select></div>
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
 const { enabled:authEnabled, session, userEmail, loading:authLoading, signOut }=useAuth()
 const uid=session?.user.id??null
 const [dark,setDark]=useState(()=>LS('fs-dark',false))
 const [view,setView]=useState<'home'|'jobs'|'saved'|'tracker'|'companies'>('home')
 const [query,setQuery]=useState('Software engineering internships for students in India')
 const [locQuery,setLocQuery]=useState('')
 const [typeFilter,setTypeFilter]=useState(''); const [roleFilter,setRoleFilter]=useState(''); const [skillFilter,setSkillFilter]=useState(''); const [locFilter,setLocFilter]=useState('')
 const [modeFilter,setModeFilter]=useState(''); const [deadlineFilter,setDeadlineFilter]=useState(''); const [compBand,setCompBand]=useState(''); const [sort,setSort]=useState('relevance')
 const [results,setResults]=useState<Opportunity[]>(()=>LS('fs-last-results',[]))
 const [selected,setSelected]=useState<Opportunity|null>(null)
 const [tracker,setTracker]=useState<Record<string,TrackerEntry>>(migrateTracker)
 const [profile,setProfile]=useState<StudentProfile>(()=>LS('fs-profile',EMPTY_PROFILE))
 const [reports,setReports]=useState<Record<string,ReportRecord>>(()=>LS('fs-reports',{}))
 const [profileOpen,setProfileOpen]=useState(false); const [reportTarget,setReportTarget]=useState<Opportunity|null>(null); const [hideProfilePrompt,setHideProfilePrompt]=useState(false)
 const [uploaderOpen,setUploaderOpen]=useState(false); const [resumeParsed,setResumeParsed]=useState<ParsedResume|null>(null); const [resumeName,setResumeName]=useState('')
 const [recent,setRecent]=useState<string[]>(()=>LS('fs-recent',[]))
 const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [stats,setStats]=useState<Record<string,number>|null>(null); const [cached,setCached]=useState(false); const [demo,setDemo]=useState(false); const [warnings,setWarnings]=useState<string[]>([]); const [visible,setVisible]=useState(9); const [health,setHealth]=useState<Record<string,unknown>|null>(null)
 const [authOpen,setAuthOpen]=useState(false); const [savedSearches,setSavedSearches]=useState<SavedSearch[]>([]); const [rechecking,setRechecking]=useState(false)
 const notifiedLinks=useRef<Set<string>>(new Set())
 const latest=useRef({tracker,reports,profile})
 useEffect(()=>{latest.current={tracker,reports,profile}})

 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('fs-dark',JSON.stringify(dark))},[dark])
 useEffect(()=>{localStorage.setItem('fs-tracker',JSON.stringify(tracker))},[tracker])
 useEffect(()=>{localStorage.setItem('fs-profile',JSON.stringify(profile))},[profile])
 useEffect(()=>{localStorage.setItem('fs-reports',JSON.stringify(reports))},[reports])
 useEffect(()=>{localStorage.setItem('fs-recent',JSON.stringify(recent))},[recent])
 useEffect(()=>{localStorage.setItem('fs-last-results',JSON.stringify(results))},[results])
 useEffect(()=>{
   fetch('/api/health').then(r=>r.json()).then(h=>{setHealth(h)
     if(!h.tinyfish_configured){fetch('/api/opportunities/demo').then(r=>r.json()).then(d=>{setResults(prev=>prev.length?prev:d.opportunities);setDemo(true)}).catch(()=>{})}
     else setDemo(false)
   }).catch(()=>setHealth({status:'backend-offline'}))
 },[])

 // On sign-in: one-time localStorage → cloud migration, then merge cloud-only entries back.
 useEffect(()=>{
   if(!uid) return
   let cancelled=false
   ;(async()=>{
     await migrateLocalToCloud(latest.current.tracker, latest.current.reports, latest.current.profile)
     const [cloud, searches, notifs]=await Promise.all([pullCloudTracker(), listSavedSearches(), listNotifications()])
     if(cancelled) return
     setTracker(prev=>{ const n={...prev}; cloud.forEach(e=>{ if(!n[e.job.id]) n[e.job.id]=e }); return n })
     setSavedSearches(searches)
     notifiedLinks.current=new Set(notifs.map(x=>x.link ?? ''))
   })()
   return ()=>{ cancelled=true }
 },[uid])

 const setStage=(o:Opportunity,stage:Stage)=>{
   const entry:TrackerEntry={job:o,stage,notes:tracker[o.id]?.notes??'',updatedAt:nowIso()}
   setTracker(p=>({...p,[o.id]:entry}))
   if(uid) void upsertSaved(uid,entry)
 }
 const removeTracker=(id:string)=>{
   setTracker(p=>{const n={...p};delete n[id];return n})
   if(uid) void deleteSaved(uid,id)
 }
 const updateNotes=(id:string,notes:string)=>{
   setTracker(p=>{ const next={...p,[id]:{...p[id],notes,updatedAt:new Date().toISOString()}}; if(uid&&next[id]) void upsertSaved(uid,next[id]); return next })
 }
 const toggleSave=(o:Opportunity)=>tracker[o.id]?.stage==='saved'?removeTracker(o.id):setStage(o,'saved')
 const submitReport=(reason:string)=>{
   if(reportTarget){
     setReports(p=>({...p,[reportTarget.id]:{reason,at:new Date().toISOString()}}))
     if(uid) void insertReport(uid,reportTarget,reason)
     setReportTarget(null)
   }
 }
 const onResumeParsed=(parsed:ParsedResume,fileName:string)=>{setResumeParsed(parsed);setResumeName(fileName);setUploaderOpen(false)}
 const onResumeConfirm=(p:StudentProfile,role:string|null,category:''|'Internship'|'Placement')=>{
   setProfile(p);setResumeParsed(null)
   const loc=p.locations[0]??''
   const q=buildResumeQuery(p,role,category)
   setQuery(q);if(loc)setLocQuery(loc);setSort('match')
   research(q,loc,{role,skills:p.skills,category:category||null})
 }

 async function research(q=query,loc=locQuery,opts:{role?:string|null;skills?:string[];category?:string|null}={}){
   if(q.trim().length<3){setError('Please enter at least 3 characters to search.');return}
   setLoading(true);setError('');setView('jobs')
   try{
     const r=await fetch('/api/opportunities/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,category:(opts.category??typeFilter)||null,role:opts.role??null,skills:opts.skills??[],location:loc||null,max_fetch:5})})
     if(!r.ok){const e=await r.json().catch(()=>({})); throw new Error((e as {detail?:string}).detail||`Backend error ${r.status}`)}
     const data:ResearchResponse=await r.json()
     setResults(data.opportunities);setStats(data.stats);setCached(data.cached);setDemo(data.demo_mode);setWarnings(data.warnings||[]);setVisible(9)
     setRecent(p=>[q,...p.filter(x=>x!==q)].slice(0,6))
     // Saved-search alerts: deterministic token overlap, deduped per source link (in-app only; email alerts are Phase 3).
     if(uid&&savedSearches.length){
       const qTokens=q.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>2)
       for(const ss of savedSearches){
         const ssTokens=ss.query.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>2)
         const overlap=ssTokens.filter(t=>qTokens.includes(t)).length/Math.max(1,ssTokens.length)
         if(overlap<0.6) continue
         for(const o of data.opportunities){
           const link=o.application_url||o.official_url||o.source_url
           if(notifiedLinks.current.has(link)) continue
           notifiedLinks.current.add(link)
           void createNotification(uid,{title:`New match: ${o.title}`,body:`Matches your saved search “${ss.query}”.`,link})
         }
       }
     }
   }catch(e){setError(e instanceof Error?e.message:'Search failed. Is the backend running on port 8000?')}
   finally{setLoading(false)}
 }

 const saveCurrentSearch=async()=>{
   if(!uid){setAuthOpen(true);return}
   const id=await createSavedSearch(uid,{query,category:typeFilter||null,role:roleFilter||null,skill:skillFilter||null,location:locQuery||null,mode:modeFilter||null,deadline:deadlineFilter||null,comp_band:compBand||null})
   if(id) setSavedSearches(await listSavedSearches())
 }
 const removeSavedSearch=async(id:string)=>{ if(!uid)return; await deleteSavedSearch(uid,id); setSavedSearches(p=>p.filter(s=>s.id!==id)) }
 const runSavedSearch=(s:SavedSearch)=>{
   setQuery(s.query); if(s.location)setLocQuery(s.location)
   setTypeFilter(s.category??'');setRoleFilter(s.role??'');setSkillFilter(s.skill??'');setModeFilter(s.mode??'');setDeadlineFilter(s.deadline??'');setCompBand(s.comp_band??'')
   setView('jobs'); void research(s.query,s.location??undefined)
 }

 const recheckLink=async()=>{
   if(!selected||rechecking)return
   setRechecking(true)
   try{
     const r=await fetch('/api/opportunities/recheck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:selected.application_url||selected.official_url||selected.source_url,id:selected.id})})
     if(!r.ok) throw new Error('recheck failed')
     const d=await r.json() as {link_health:string;status_code:number|null}
     setSelected(s=>s?{...s,link_health:d.link_health}:s)
     setResults(p=>p.map(o=>o.id===selected.id?{...o,link_health:d.link_health}:o))
     if(d.link_health==='broken'&&uid) void createNotification(uid,{title:`Broken link: ${selected.title}`,body:`The application link returned ${d.status_code??'an error'} on re-check. Verify on the source page.`,link:selected.source_url})
   }catch{ setSelected(s=>s?{...s,link_health:'unknown'}:s) }
   finally{setRechecking(false)}
 }

 const roleOptions=useMemo(()=>[...new Set(results.map(o=>o.role).filter((r):r is string=>!!r))].sort(),[results])
 const skillOptions=useMemo(()=>[...new Set(results.flatMap(o=>o.skills||[]))].sort(),[results])
 const locationOptions=useMemo(()=>[...new Set(results.map(o=>o.location).filter((l):l is string=>!!l))].sort(),[results])
 const setFilter=(k:string,v:string)=>(({type:setTypeFilter,role:setRoleFilter,skill:setSkillFilter,loc:setLocFilter,mode:setModeFilter,deadline:setDeadlineFilter,comp:setCompBand,sort:setSort} as Record<string,(x:string)=>void>)[k](v))

 const filtered=useMemo(()=>{let out=[...results]
   if(typeFilter) out=out.filter(o=>o.category===typeFilter)
   if(roleFilter) out=out.filter(o=>o.role===roleFilter)
   if(skillFilter) out=out.filter(o=>(o.skills||[]).map(s=>s.toLowerCase()).includes(skillFilter.toLowerCase()))
   if(locFilter) out=out.filter(o=>(o.location||'').toLowerCase().includes(locFilter.toLowerCase()))
   if(modeFilter) out=out.filter(o=>(o.mode||'').toLowerCase()===modeFilter.toLowerCase())
   if(compBand) out=out.filter(o=>inCompBand(o,compBand))
   if(deadlineFilter==='upcoming') out=out.filter(o=>['open','closing_soon'].includes(o.deadline_status))
   if(deadlineFilter==='unknown') out=out.filter(o=>o.deadline_status==='unknown')
   if(deadlineFilter==='expired') out=out.filter(o=>o.deadline_status==='expired')
   if(sort==='match') out.sort((a,b)=>(matchScore(b,profile)?.score??-1)-(matchScore(a,profile)?.score??-1))
   if(sort==='deadline') out.sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'))
   if(sort==='recent') out.sort((a,b)=>b.last_checked_at.localeCompare(a.last_checked_at))
   return out},[results,typeFilter,roleFilter,skillFilter,locFilter,modeFilter,deadlineFilter,compBand,sort,profile])

 const clearFilters=()=>{setTypeFilter('');setRoleFilter('');setSkillFilter('');setLocFilter('');setModeFilter('');setDeadlineFilter('');setCompBand('');setSort('relevance')}
 const openCount=results.filter(o=>['open','closing_soon'].includes(o.deadline_status)).length
 const companyCount=new Set(results.map(o=>o.organizer).filter(Boolean)).size
 const trackerEntries=Object.values(tracker)
 const savedEntries=trackerEntries.filter(e=>e.stage==='saved')
 const activeEntries=trackerEntries.filter(e=>e.stage!=='saved')
 const selectedEntry=selected?tracker[selected.id]:undefined
 const selectedMatch=selected?matchScore(selected,profile):null
 const cardProps=(o:Opportunity)=>({o,entry:tracker[o.id],reported:!!reports[o.id],profile,onOpen:setSelected,onSave:toggleSave,onStage:setStage})

 return <div className="min-h-screen bg-[#edf1f5] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
  <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
   <button onClick={()=>setView('home')} className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight"><Logo size={36} className="shrink-0 drop-shadow-sm"/> FormSaathi<span className="text-blue-600 text-sm font-semibold hidden sm:inline">Internships & Placements</span></button>
   <nav className="ml-auto flex gap-1 items-center">
     <button onClick={()=>setView('home')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Home size={16}/>Home</button>
     <button onClick={()=>setView('jobs')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Briefcase size={16}/>Browse Jobs</button>
     <button onClick={()=>setView('companies')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Building2 size={16}/>Companies</button>
     <button onClick={()=>setView('tracker')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><ClipboardList size={16}/>Tracker {activeEntries.length>0&&<span className="text-[10px] bg-teal-500 text-white rounded-full px-1.5 py-0.5">{activeEntries.length}</span>}</button>
     <button onClick={()=>setView('saved')} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex gap-1.5 items-center text-sm"><Bookmark size={16}/>Saved ({savedEntries.length})</button>
     <button onClick={()=>setProfileOpen(true)} aria-label="Your profile" className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${profile.filled?'text-teal-600':''}`}><UserCircle size={19}/></button>
     <button onClick={()=>research()} className="hidden sm:block bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition ml-1">Find Jobs</button>
     {authEnabled&&(uid?
       <span className="flex items-center gap-1 ml-1">
         <NotificationsBell uid={uid}/>
         <span title={userEmail??''} className="hidden md:inline text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 max-w-[160px] truncate">{userEmail}</span>
         <button onClick={()=>void signOut()} aria-label="Sign out" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut size={17}/></button>
       </span>
       :<button onClick={()=>setAuthOpen(true)} disabled={authLoading} className="bg-[#0a1f44] hover:bg-[#12306b] text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 ml-1 disabled:opacity-60"><Bell size={14}/>Sign in</button>)}
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
     <p className="mt-5 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">Verified internship and campus-placement listings across India — filter by role, skill and location, check scam warnings, then apply directly on the official company page.</p>
     <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-500">{['Real source links','No invented deadlines','Scam-payment warnings'].map(x=><span key={x} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 flex items-center gap-1"><CheckCircle2 size={13} className="text-teal-500"/>{x}</span>)}</div>
     </div>
     <div className="relative mt-9 max-w-3xl mx-auto"><SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={()=>research()} loading={loading}/></div>
     <div className="relative mt-5 flex flex-wrap justify-center gap-2 text-xs">{ROLE_CHIPS.map(x=>{const q=`${x} ${x.includes('Trainee')?'placement':'internship'} in India`;return <button key={x} onClick={()=>{setQuery(q);research(q)}} className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:text-teal-600 transition rounded-full px-3 py-1.5">{x}</button>})}</div>
     {recent.length>0&&<div className="mt-4 text-xs text-slate-500">Recent: {recent.map(r=><button key={r} onClick={()=>research(r)} className="underline mr-2">{r}</button>)}</div>}
     <div className="relative mt-7 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase text-slate-400 mb-3"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/>or let your resume do the searching<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/></div>
      <ResumeUploader variant="card" onParsed={onResumeParsed}/>
     </div>
   </section>

   {!profile.filled&&!hideProfilePrompt&&<div className="max-w-3xl mx-auto bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3 anim-fadeUp"><UserCircle size={22} className="text-teal-600 shrink-0"/><div className="text-sm flex-1 min-w-[220px]"><b>Complete your student profile</b><p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Add your skills and preferences to see a personal match % on every listing.</p></div><button onClick={()=>setProfileOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">Build profile</button><button onClick={()=>setHideProfilePrompt(true)} aria-label="Dismiss" className="p-1.5"><X size={16}/></button></div>}

   <section className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mt-8 anim-fadeUp">{[[openCount,'Open roles'],[companyCount,'Hiring companies'],[trackerEntries.length,'Tracked by you']].map(([v,l])=><div key={l as string} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center"><p className="text-2xl md:text-3xl font-bold text-[#0a1f44] dark:text-white">{v as number}</p><p className="text-[11px] md:text-xs text-slate-400 mt-1">{l as string}</p></div>)}</section>

   <section className="py-12">
    <div className="flex items-end justify-between mb-5"><h2 className="font-bold text-2xl tracking-tight">Latest openings</h2><button onClick={()=>setView('jobs')} className="text-sm text-teal-600 font-semibold flex items-center gap-1">Browse all jobs <ArrowRight size={15}/></button></div>
    {results.length===0?<div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 border border-dashed rounded-2xl">Run a search above — internship and placement listings will appear here.</div>
     :<div className="stagger grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.slice(0,6).map(o=><JobCard key={o.id} {...cardProps(o)}/>)}</div>}
   </section>

   <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-10"><h2 className="font-bold text-xl mb-5 flex gap-2 items-center"><ShieldCheck className="text-teal-500"/> How FormSaathi works</h2><ol className="grid md:grid-cols-4 gap-5 text-sm text-slate-600 dark:text-slate-300"><li><b className="text-slate-900 dark:text-white">1. Search roles</b><br/>Enter a role, skill or company, with an optional city.</li><li><b className="text-slate-900 dark:text-white">2. We scan the web</b><br/>TinyFish finds public internship and placement pages.</li><li><b className="text-slate-900 dark:text-white">3. Filter & stay safe</b><br/>Narrow by role, skill, pay and deadline; scam fees get flagged.</li><li><b className="text-slate-900 dark:text-white">4. Track & apply</b><br/>Move listings through your application pipeline and apply on the official site.</li></ol><p className="text-xs text-slate-500 mt-5">No fake statistics. “Open” appears only when a known future deadline supports it; missing information stays “unknown”.</p></section>

   <section className="grid md:grid-cols-3 gap-4 mb-14 stagger">{[['Are these real jobs?','Every listing links to the page it came from, with the time we checked it. Click the source and verify the opening before you apply.'],['Why did a listing get a warning?','Listings mentioning registration fees, deposits or payment to join are flagged automatically. Legitimate employers never charge applicants.'],['Do you apply for me?','No. FormSaathi discovers, organises and tracks listings — you always review and submit on the official company site yourself.']].map(([h,b])=><div key={h} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6"><h3 className="font-bold flex gap-2 items-center"><ShieldCheck size={17} className="text-teal-500"/>{h}</h3><p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{b}</p></div>)}</section>
  </main>}

  {view==='jobs'&&<main className="max-w-7xl mx-auto px-4 py-8">
   <SearchBar query={query} locQuery={locQuery} setQuery={setQuery} setLocQuery={setLocQuery} onSearch={()=>research()} loading={loading}/>
   <div className="mt-3 flex flex-wrap items-center gap-2">
    <button onClick={()=>void saveCurrentSearch()} className="text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:border-teal-400 hover:text-teal-600"><BookmarkPlus size={13}/>{uid?'Save this search':'Sign in to save searches'}</button>
    {savedSearches.map(s=><span key={s.id} className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-1.5 py-1 flex items-center gap-1.5">
      <button onClick={()=>runSavedSearch(s)} className="font-semibold hover:text-teal-600" title={s.query}>{s.query.length>38?s.query.slice(0,38)+'…':s.query}</button>
      <button onClick={()=>void removeSavedSearch(s.id)} aria-label={`Remove saved search ${s.query}`} className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X size={12}/></button>
    </span>)}
   </div>
   {loading&&<div className="mt-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse">Searching → fetching pages → extracting roles & skills → deduplicating…</div>}
   {stats&&!loading&&<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">{[['Candidate pages',stats.candidates],['Pages inspected',stats.fetched],['Valid listings',stats.extracted],['Duplicates removed',stats.duplicates_removed]].map(([k,v])=><div key={k as string} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"><b className="text-2xl text-teal-600">{v as number}</b><br/><span className="text-xs text-slate-500">{k as string}</span></div>)}</div>}
   {cached&&<p className="text-xs mt-2 text-slate-500">Served from temporary backend cache (up to 10 min) to avoid repeating the same research.</p>}
   {warnings.map(w=><p key={w} className="text-xs mt-2 text-amber-700 dark:text-amber-300">{w}</p>)}
   {error&&<div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-xl p-4 text-sm">{error}</div>}
   <div className="grid lg:grid-cols-4 gap-5 mt-6">
    <FilterPanel typeFilter={typeFilter} roleFilter={roleFilter} skillFilter={skillFilter} locFilter={locFilter} modeFilter={modeFilter} deadlineFilter={deadlineFilter} compBand={compBand} sort={sort} profileFilled={profile.filled}
      roleOptions={roleOptions} skillOptions={skillOptions} locationOptions={locationOptions} set={setFilter} onClear={clearFilters}/>
    <section className="lg:col-span-3">
     <p className="text-sm text-slate-500 mb-4">Showing <b className="text-slate-900 dark:text-white">{filtered.length}</b> of {results.length} listings</p>
     {loading?<div className="grid xl:grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-56 skeleton rounded-2xl"/>)}</div>
      : filtered.length===0?<div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 border border-dashed rounded-2xl">No listings match. Try a broader search or clear filters.</div>
      :<><div className="grid xl:grid-cols-2 gap-4">{filtered.slice(0,visible).map(o=><JobCard key={o.id} {...cardProps(o)}/>)}</div>{visible<filtered.length&&<button onClick={()=>setVisible(v=>v+9)} className="mt-6 mx-auto flex bg-[#0a1f44] text-white px-5 py-3 rounded-xl text-sm font-semibold">Load more <ArrowRight size={16}/></button>}</>}
    </section>
   </div>
  </main>}

  {view==='companies'&&<main className="max-w-7xl mx-auto px-4 py-8">
   <h1 className="text-2xl font-bold mb-1">Companies</h1>
   <p className="text-sm text-slate-500 mb-6">Listings from your current results grouped by organizer, with source-verification badges. Organizers are detected from the page text or its domain; unstated sources stay unstated.</p>
   <CompaniesView opportunities={results} onOpen={setSelected}/>
  </main>}

  {view==='tracker'&&<main className="max-w-7xl mx-auto px-4 py-8">
   <h1 className="text-2xl font-bold mb-1">Application tracker</h1>
   <p className="text-sm text-slate-500 mb-6">Your private pipeline{uid?', synced to your account across devices':', stored in this browser — sign in to sync across devices'}. Move listings across stages and keep notes per application.</p>
   <TrackerBoard entries={activeEntries} onStage={(id,s)=>{const e=tracker[id];if(e)setStage(e.job,s)}} onNotes={updateNotes} onRemove={removeTracker} onOpen={(id)=>{const e=tracker[id];if(e)setSelected(e.job)}}/>
  </main>}

  {view==='saved'&&<main className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-2xl font-bold mb-2">Your saved listings</h1><p className="text-sm text-slate-500 mb-6">{uid?'Synced to your FormSaathi account — the same saves appear on every device you sign in on.':'Saved in this browser (localStorage). Sign in to back them up and sync across devices.'}</p>{savedEntries.length===0?<div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed rounded-2xl text-slate-500"><Bookmark size={22} className="mx-auto mb-2 text-slate-300"/>Nothing saved yet. Click “Save” on any listing.</div>:<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{savedEntries.map(e=><JobCard key={e.job.id} {...cardProps(e.job)}/>)}</div>}<button onClick={()=>{if(confirm('Clear all saved listings?')){savedEntries.forEach(e=>removeTracker(e.job.id))}}} className="mt-6 text-sm text-red-600 flex gap-1 items-center"><Trash2 size={14}/> Clear saved</button></main>}

  {selected&&<div className="fixed inset-0 bg-black/50 z-30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={()=>setSelected(null)}><div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-auto rounded-t-3xl md:rounded-3xl" onClick={e=>e.stopPropagation()}>
    <div className="p-6 md:p-8">
    <div className="flex justify-between items-center gap-2"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeCls(selected.category)}`}>{selected.category}</span><button onClick={()=>setSelected(null)} aria-label="Close details"><X size={20}/></button></div>
    <h2 className="text-2xl font-bold mt-3 leading-snug">{selected.title}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1"><span className="flex items-center gap-1.5"><Building2 size={14}/>{selected.organizer||'Company not stated'}</span><span className="flex items-center gap-1.5"><MapPin size={14}/>{selected.location||'Location unknown'} • {selected.mode||'Unknown'}</span>{selectedMatch&&<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${matchColor(selectedMatch.score)}`} title={selectedMatch.reasons.join(' • ')}>{selectedMatch.score}% match for your profile</span>}</p>
    {selected.fraud_flags?.length>0&&<div className="mt-5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-2xl p-4"><h3 className="font-bold text-sm text-red-700 dark:text-red-300 flex items-center gap-2"><ShieldAlert size={16}/> Safety warnings on this listing</h3><ul className="list-disc pl-5 mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">{selected.fraud_flags.map((f,i)=><li key={i}>{f}</li>)}</ul></div>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Banknote size={12}/>Compensation</p><p className="text-sm font-semibold mt-1">{selected.compensation||'Not stated'}</p></div>
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1"><Clock size={12}/>Deadline</p><p className="text-sm font-semibold mt-1">{selected.deadline?`${selected.deadline} (${statusLabel(selected.deadline_status)})`:'Unknown — verify before applying'}</p></div>
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-slate-400">Role</p><p className="text-sm font-semibold mt-1">{selected.role||'Not classified'}</p></div>
    </div>
    {selected.skills?.length>0&&<div className="mt-6"><h3 className="font-semibold text-sm mb-2">Skills required</h3><div className="flex flex-wrap gap-2">{selected.skills.map(s=><span key={s} className="text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5">{formatSkill(s)}</span>)}</div></div>}
    <div className="mt-6"><h3 className="font-semibold text-sm mb-2">About the role</h3><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selected.description||'Not extracted — open the source page for the full description.'}</p></div>
    <div className="mt-6"><h3 className="font-semibold text-sm mb-2">Eligibility & requirements</h3>{selected.eligibility?.length?<ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-1">{selected.eligibility.map((e,i)=><li key={i}>{e}</li>)}</ul>:<p className="text-sm text-slate-500">Not extracted — check the official page.</p>}</div>
    <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4">
     <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ClipboardList size={15}/> Track this application</h3>
     <div className="flex flex-wrap items-center gap-2">
      <select value={selectedEntry?.stage??''} onChange={e=>setStage(selected,e.target.value as Stage)} className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"><option value="" disabled>Add to tracker…</option>{(Object.keys(STAGE_LABEL) as Stage[]).map(s=><option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
      {selectedEntry&&<button onClick={()=>removeTracker(selected.id)} className="text-sm text-red-600 flex items-center gap-1"><Trash2 size={13}/> Remove</button>}
     </div>
     <textarea value={selectedEntry?.notes??''} onChange={e=>{if(!selectedEntry)setStage(selected,'saved');updateNotes(selected.id,e.target.value)}} placeholder="Add notes — recruiter email, interview date, follow-up…" className="w-full mt-3 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 min-h-[64px] outline-none focus:border-teal-400"/>
    </div>
    <dl className="mt-6 space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-5">
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Verification:</dt><dd>{verifyLabel(selected.verification_status)} • type: {selected.source_type}</dd></div>
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Last checked:</dt><dd>{new Date(selected.last_checked_at).toLocaleString()}</dd></div>
      <div className="flex gap-2"><dt className="font-semibold shrink-0">Source:</dt><dd><a className="text-teal-600 underline break-all" href={selected.source_url} target="_blank" rel="noreferrer">{selected.source_url}</a></dd></div>
      {selected.also_found_on?.length>0&&<div className="flex gap-2"><dt className="font-semibold shrink-0">Also found on:</dt><dd className="break-all">{selected.also_found_on.join(', ')}</dd></div>}
      <div className="flex gap-2 items-center flex-wrap">
        <dt className="font-semibold shrink-0 flex items-center gap-1"><Link2 size={14}/>Link health:</dt>
        <dd className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${selected.link_health==='ok'?'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900':selected.link_health==='broken'?'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900':'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
            {selected.link_health==='ok'?'Working — re-checked now':selected.link_health==='broken'?'Broken — apply link failed':'Not re-checked'}
          </span>
          <button onClick={()=>void recheckLink()} disabled={rechecking} className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 disabled:opacity-60">
            {rechecking?<Loader2 size={12} className="animate-spin"/>:<RefreshCw size={12}/>} Re-check link
          </button>
        </dd>
      </div>
    </dl>
    <div className="mt-5 bg-amber-50 dark:bg-amber-950 rounded-xl p-3 text-xs flex gap-2"><ShieldCheck size={15} className="shrink-0 mt-0.5 text-amber-600"/><span>Never pay a registration fee, deposit or training charge to get a job or internship — legitimate employers do not ask for money. Always review official requirements and submit the application yourself.</span></div>
    <div className="flex flex-wrap gap-2 mt-5">
      <a href={selected.application_url||selected.official_url||selected.source_url} target="_blank" rel="noreferrer" className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2">Apply on Official Site <ExternalLink size={16}/></a>
      <button onClick={()=>toggleSave(selected)} className="border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2">{selectedEntry?.stage==='saved'?<BookmarkCheck size={16} className="text-teal-600"/>:<Bookmark size={16}/>}{selectedEntry?.stage==='saved'?'Saved':'Save Listing'}</button>
      {selected.deadline?<button onClick={()=>downloadIcs(selected)} className="border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2"><CalendarPlus size={16}/> Add deadline to calendar</button>
       :<span className="border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2 text-slate-400 cursor-not-allowed" title="No confirmed deadline on this listing"><CalendarPlus size={16}/> No deadline to export</span>}
      <button onClick={()=>setReportTarget(selected)} className="ml-auto border border-red-200 text-red-600 px-4 py-3 rounded-xl font-medium flex items-center gap-2 text-sm"><Flag size={15}/> {reports[selected.id]?'Reported':'Report'}</button>
    </div>
    </div>
  </div></div>}

  {profileOpen&&<ProfileModal initial={profile} onClose={()=>setProfileOpen(false)} onSave={p=>{setProfile(p);setProfileOpen(false)}} onImportResume={()=>{setProfileOpen(false);setUploaderOpen(true)}}/>}
  {uploaderOpen&&<ResumeUploader variant="modal" onClose={()=>setUploaderOpen(false)} onParsed={onResumeParsed}/>}
  {resumeParsed&&<ResumeReviewModal parsed={resumeParsed} fileName={resumeName} onClose={()=>setResumeParsed(null)} onConfirm={onResumeConfirm}/>}
  {reportTarget&&<ReportModal job={reportTarget} onClose={()=>setReportTarget(null)} onSubmit={submitReport}/>}
  {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)}/>}

  <footer className="bg-white dark:bg-slate-900 text-slate-500 mt-4 border-t border-slate-200 dark:border-slate-800"><div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8 text-sm"><div><p className="text-slate-900 dark:text-white font-extrabold text-lg flex items-center gap-2"><Logo size={32}/>FormSaathi</p><p className="mt-3 text-slate-400 leading-relaxed">Internship & placement discovery across public company websites, with match scores, scam warnings, application tracking and verifiable source links.</p></div><div><p className="text-slate-900 dark:text-white font-semibold mb-3">Explore</p><div className="flex flex-col gap-2 items-start"><button onClick={()=>setView('jobs')}>Browse jobs</button><button onClick={()=>setView('tracker')}>Application tracker</button><button onClick={()=>setView('saved')}>Saved listings</button><button onClick={()=>setView('home')}>Home</button></div></div><div><p className="text-slate-900 dark:text-white font-semibold mb-3">Trust & privacy</p><p className="text-slate-400 leading-relaxed">Listings link to original sources. Your data stays in this browser unless you sign in — then it is privately synced to your account. Never pay to apply.</p></div></div><p className="text-center text-xs text-slate-500 pb-8 px-4">FormSaathi • Internships & Placements • Researched listings persist to the cloud catalogue when Supabase is configured • Never share your API key publicly</p></footer>
 </div>
}
