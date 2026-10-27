import type { Opportunity, StudentProfile } from '../types'

export const LS=(k:string,d:unknown)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}}

const ACRONYMS=new Set(['ui','ux','sql','aws','gcp','seo','sem','hr','ms','php','html','css','api','bi'])
export const formatSkill=(s:string)=>s.split(' ').map(w=>w.split('/').map(p=>ACRONYMS.has(p)?p.toUpperCase():p.charAt(0).toUpperCase()+p.slice(1)).join('/')).join(' ')

export const verifyLabel=(s:string)=> s==='verified_official'?'Verified official':s==='demo'?'DEMO — sample only':s==='secondary_source'?'Secondary source':'Needs review'
export const statusLabel=(s:string)=>({open:'Open',closing_soon:'Closing soon',expired:'Expired',unknown:'Deadline unknown'} as Record<string,string>)[s]||s
export const statusClass=(s:string)=>({open:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',closing_soon:'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',expired:'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',unknown:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} as Record<string,string>)[s]||'bg-slate-100'
export const deadlineLine=(o:Opportunity)=>o.deadline?`${o.deadline} • ${statusLabel(o.deadline_status)}`:'Deadline unknown — check official page'
export const typeBadgeCls=(cat:string)=>cat==='Placement'?'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300':'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
export const inr=(n:number)=>'₹'+n.toLocaleString('en-IN')

export const COMP_BANDS=[
 {value:'unpaid',label:'Unpaid only'},
 {value:'0-10000',label:'Up to ₹10k / month'},
 {value:'10000-25000',label:'₹10k – ₹25k / month'},
 {value:'25000-plus',label:'₹25k+ / month (incl. CTC)'},
] as const

export function inCompBand(o:Opportunity, band:string):boolean{
  if(band==='unpaid') return o.compensation_kind==='unpaid'
  if(o.compensation_kind!=='paid'||o.compensation_min==null) return false
  const top=o.compensation_max??o.compensation_min
  if(band.endsWith('-plus')) return o.compensation_min>=Number(band.slice(0,-5))
  const [lo,hi]=band.split('-').map(Number)
  return o.compensation_min<=hi && top>=lo
}

// ---------- Profile-based match score ----------
export interface MatchResult{score:number;reasons:string[]}

export function matchScore(o:Opportunity, p:StudentProfile):MatchResult|null{
  if(!p.filled) return null
  let earned=0, possible=0; const reasons:string[]=[]
  // Skills: 70% of the score
  if(o.skills?.length && p.skills.length){
    possible+=70
    const have=new Set(p.skills.map(s=>s.toLowerCase()))
    const hits=o.skills.filter(s=>have.has(s.toLowerCase())).length
    const pts=Math.round((hits/o.skills.length)*70)
    earned+=pts
    reasons.push(hits?`${hits}/${o.skills.length} required skills match`:'No skill overlap yet')
  }
  // Location: 15%
  if(o.location && p.locations.length){
    possible+=15
    const loc=o.location.toLowerCase()
    const hit=p.locations.some(x=>loc.includes(x.toLowerCase())||(x.toLowerCase()==='remote'&&loc.includes('remote')))
    if(hit){earned+=15;reasons.push(`Location matches ${o.location}`)}
    else reasons.push(`Location mismatch: prefers ${p.locations.join(', ')}`)
  }
  // Work mode: 15%
  if(o.mode && o.mode!=='Unknown' && p.modes.length){
    possible+=15
    if(p.modes.map(m=>m.toLowerCase()).includes(o.mode.toLowerCase())){earned+=15;reasons.push(`${o.mode} mode preferred`)}
    else reasons.push(`Mode mismatch: prefers ${p.modes.join('/')}`)
  }
  if(possible===0) return null
  return {score:Math.round((earned/possible)*100), reasons}
}

export const matchColor=(score:number)=> score>=80?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300':score>=60?'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300':score>=40?'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300':'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'

// ---------- Calendar (.ics) export ----------
const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,' ')
export function downloadIcs(o:Opportunity):boolean{
  if(!o.deadline) return false
  const d=o.deadline.replaceAll('-','')
  const end=(()=>{const dt=new Date(o.deadline!+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+1);return dt.toISOString().slice(0,10).replaceAll('-','')})()
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FormSaathi//Application Deadline//EN','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',`UID:${o.id}@formsaathi`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${end}`,
    `SUMMARY:Apply deadline — ${esc(o.title)}`,
    `DESCRIPTION:${esc(o.description||'')} \\nSource: ${esc(o.source_url)}`,
    `URL:${o.application_url||o.official_url||o.source_url}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')
  const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download=`formsaathi-deadline-${o.id}.ics`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
  return true
}

// Phase 2: stable timestamp helper for event-handler state updates.
export const nowIso=()=>new Date().toISOString()
