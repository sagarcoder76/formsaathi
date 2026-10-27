import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import type { Opportunity } from '../types'

const REASONS=['Asks for money / deposit / fee','Fake or misleading listing','Broken apply link','Offensive or inappropriate content','Other']

export default function ReportModal({job,onClose,onSubmit}:{job:Opportunity;onClose:()=>void;onSubmit:(reason:string)=>void}){
 const [reason,setReason]=useState(REASONS[0])
 return (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
   <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl" onClick={e=>e.stopPropagation()}>
    <div className="p-6">
     <div className="flex justify-between items-center"><h2 className="text-lg font-bold flex items-center gap-2"><Flag size={18} className="text-red-600"/> Report listing</h2><button onClick={onClose} aria-label="Close report"><X size={20}/></button></div>
     <p className="text-sm text-slate-500 mt-1 line-clamp-2">{job.title}</p>
     <div className="mt-5 space-y-2">{REASONS.map(r=>(
      <label key={r} className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm cursor-pointer ${reason===r?'border-teal-500 bg-teal-50 dark:bg-teal-950':'border-slate-200 dark:border-slate-700'}`}>
       <input type="radio" name="report-reason" checked={reason===r} onChange={()=>setReason(r)}/>{r}
      </label>))}
     </div>
     <p className="text-xs text-slate-400 mt-4">Reports are stored on this device only in this version. FormSaathi never charges applicants — please report any listing that asks for payment.</p>
     <div className="flex gap-2 mt-5"><button onClick={()=>onSubmit(reason)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">Submit report</button><button onClick={onClose} className="border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm">Cancel</button></div>
    </div>
   </div>
  </div>)
}
