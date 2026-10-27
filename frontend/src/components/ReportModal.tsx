import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import type { Opportunity } from '../types'
import Modal from './Modal'

const REASONS = ['Asks for money / deposit / fee', 'Fake or misleading listing', 'Broken apply link', 'Offensive or inappropriate content', 'Other']

export default function ReportModal({ job, onClose, onSubmit }: { job: Opportunity; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(REASONS[0])
  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 md:p-7">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-navy-900 dark:text-white"><Flag size={18} className="text-red-600" /> Report listing</h2>
          <button onClick={onClose} aria-label="Close report" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>
        <p className="text-sm text-muted mt-1 line-clamp-2">{job.title}</p>
        <div className="mt-5 space-y-2">
          {REASONS.map(r => (
            <label key={r} className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm cursor-pointer transition-colors ${reason === r ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50' : 'border-line dark:border-slate-700 hover:border-teal-300'}`}>
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />{r}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">Reports are kept private and synced to your account when signed in. FormSaathi never charges applicants — please report any listing that asks for payment.</p>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSubmit(reason)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition active:scale-[.98]">Submit report</button>
          <button onClick={onClose} className="border border-line dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}
