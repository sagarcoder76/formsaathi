import { useState } from 'react'
import { X } from 'lucide-react'
import type { StudentProfile } from '../types'
import { formatSkill } from '../lib/helpers'

const PROFILE_SKILLS=['react','typescript','javascript','python','java','sql','node.js','html','css','docker','aws','git','excel','power bi','tableau','figma','digital marketing','seo','content writing','communication','product management','autocad','solidworks','machine learning','data analysis']
const CITIES=['Bengaluru','Mumbai','New Delhi','Hyderabad','Pune','Chennai','Gurugram','Noida','Ahmedabad','Jaipur','Kolkata','Remote']
const MODES=['Remote','Hybrid','In-person']
const BATCHES=['2026','2027','2028','2029','Not sure']
const DEGREES=['B.Tech / B.E.','BCA','B.Sc','B.Com','BBA','MBA','MCA','M.Tech','Other']

const chipCls=(on:boolean)=>`text-xs px-3 py-1.5 rounded-full border transition ${on?'bg-teal-500 border-teal-500 text-white font-semibold':'border-slate-200 dark:border-slate-700 hover:border-teal-400'}`
const toggle=(list:string[],v:string)=>list.includes(v)?list.filter(x=>x!==v):[...list,v]

export default function ProfileModal({initial,onClose,onSave}:{initial:StudentProfile;onClose:()=>void;onSave:(p:StudentProfile)=>void}){
 const [skills,setSkills]=useState(initial.skills)
 const [locations,setLocations]=useState(initial.locations)
 const [modes,setModes]=useState(initial.modes)
 const [batch,setBatch]=useState(initial.batch)
 const [degree,setDegree]=useState(initial.degree)
 const filled=skills.length>0||locations.length>0||modes.length>0
 const save=()=>onSave({skills,locations,modes,batch,degree,filled})
 return (
  <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
   <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-t-3xl md:rounded-3xl" onClick={e=>e.stopPropagation()}>
    <div className="p-6 md:p-8">
     <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Your student profile</h2><button onClick={onClose} aria-label="Close profile"><X size={20}/></button></div>
     <p className="text-sm text-slate-500 mt-1">Used only on this device to calculate a personal match score on each listing. Nothing is uploaded.</p>
     <div className="mt-6 space-y-6">
      <section>
       <h3 className="font-semibold text-sm mb-2">Skills you have <span className="text-slate-400 font-normal">(tap to toggle)</span></h3>
       <div className="flex flex-wrap gap-2">{PROFILE_SKILLS.map(s=><button key={s} type="button" onClick={()=>setSkills(toggle(skills,s))} className={chipCls(skills.includes(s))}>{formatSkill(s)}</button>)}</div>
      </section>
      <section>
       <h3 className="font-semibold text-sm mb-2">Preferred locations</h3>
       <div className="flex flex-wrap gap-2">{CITIES.map(c=><button key={c} type="button" onClick={()=>setLocations(toggle(locations,c))} className={chipCls(locations.includes(c))}>{c}</button>)}</div>
      </section>
      <section className="grid sm:grid-cols-3 gap-4">
       <div>
        <h3 className="font-semibold text-sm mb-2">Work mode</h3>
        <div className="flex flex-wrap gap-2">{MODES.map(m=><button key={m} type="button" onClick={()=>setModes(toggle(modes,m))} className={chipCls(modes.includes(m))}>{m}</button>)}</div>
       </div>
       <label className="block"><h3 className="font-semibold text-sm mb-2">Passing batch</h3>
        <select value={batch} onChange={e=>setBatch(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"><option value="">Select…</option>{BATCHES.map(b=><option key={b}>{b}</option>)}</select>
       </label>
       <label className="block"><h3 className="font-semibold text-sm mb-2">Degree</h3>
        <select value={degree} onChange={e=>setDegree(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"><option value="">Select…</option>{DEGREES.map(d=><option key={d}>{d}</option>)}</select>
       </label>
      </section>
     </div>
     <div className="flex gap-2 mt-8"><button onClick={save} className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold">Save profile</button><button onClick={onClose} className="border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl">Cancel</button></div>
    </div>
   </div>
  </div>)
}
