import { useState } from 'react'
import { X, UploadCloud } from 'lucide-react'
import type { StudentProfile } from '../types'
import { formatSkill } from '../lib/helpers'
import Modal from './Modal'

const PROFILE_SKILLS = ['react', 'typescript', 'javascript', 'python', 'java', 'sql', 'node.js', 'html', 'css', 'docker', 'aws', 'git', 'excel', 'power bi', 'tableau', 'figma', 'digital marketing', 'seo', 'content writing', 'communication', 'product management', 'autocad', 'solidworks', 'machine learning', 'data analysis']
const CITIES = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Noida', 'Ahmedabad', 'Jaipur', 'Kolkata', 'Remote']
const MODES = ['Remote', 'Hybrid', 'In-person']
const BATCHES = ['2026', '2027', '2028', '2029', 'Not sure']
const DEGREES = ['B.Tech / B.E.', 'BCA', 'B.Sc', 'B.Com', 'BBA', 'MBA', 'MCA', 'M.Tech', 'Other']

const chipCls = (on: boolean) => `text-xs px-3 py-1.5 rounded-full border transition active:scale-95 ${on ? 'bg-teal-500 border-teal-500 text-white font-semibold shadow-sm shadow-teal-500/30' : 'border-line dark:border-slate-700 hover:border-teal-400'}`
const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]

export default function ProfileModal({ initial, onClose, onSave, onImportResume }: { initial: StudentProfile; onClose: () => void; onSave: (p: StudentProfile) => void; onImportResume: () => void }) {
  const [skills, setSkills] = useState(initial.skills)
  const [locations, setLocations] = useState(initial.locations)
  const [modes, setModes] = useState(initial.modes)
  const [batch, setBatch] = useState(initial.batch)
  const [degree, setDegree] = useState(initial.degree)
  const filled = skills.length > 0 || locations.length > 0 || modes.length > 0
  const save = () => onSave({ skills, locations, modes, batch, degree, filled })

  return (
    <Modal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Your student profile</h2>
          <button onClick={onClose} aria-label="Close profile" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>
        <p className="text-sm text-muted mt-1">Used to calculate a personal match score on each listing. Stored in your browser, and synced to your own account only if you sign in.</p>
        <div className="mt-6 space-y-6">
          <section>
            <h3 className="font-semibold text-sm mb-2">Skills you have <span className="text-slate-400 font-normal">(tap to toggle)</span></h3>
            <div className="flex flex-wrap gap-2">{PROFILE_SKILLS.map(s => <button key={s} type="button" onClick={() => setSkills(toggle(skills, s))} className={chipCls(skills.includes(s))}>{formatSkill(s)}</button>)}</div>
          </section>
          <section>
            <h3 className="font-semibold text-sm mb-2">Preferred locations</h3>
            <div className="flex flex-wrap gap-2">{CITIES.map(c => <button key={c} type="button" onClick={() => setLocations(toggle(locations, c))} className={chipCls(locations.includes(c))}>{c}</button>)}</div>
          </section>
          <section className="grid sm:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Work mode</h3>
              <div className="flex flex-wrap gap-2">{MODES.map(m => <button key={m} type="button" onClick={() => setModes(toggle(modes, m))} className={chipCls(modes.includes(m))}>{m}</button>)}</div>
            </div>
            <label className="block"><h3 className="font-semibold text-sm mb-2">Passing batch</h3>
              <select value={batch} onChange={e => setBatch(e.target.value)} className="w-full border border-line dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400 cursor-pointer"><option value="">Select…</option>{BATCHES.map(b => <option key={b}>{b}</option>)}</select>
            </label>
            <label className="block"><h3 className="font-semibold text-sm mb-2">Degree</h3>
              <select value={degree} onChange={e => setDegree(e.target.value)} className="w-full border border-line dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400 cursor-pointer"><option value="">Select…</option>{DEGREES.map(d => <option key={d}>{d}</option>)}</select>
            </label>
          </section>
        </div>
        <div className="flex flex-wrap gap-2 mt-8">
          <button onClick={save} className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold transition active:scale-[.98]">Save profile</button>
          <button onClick={onClose} className="border border-line dark:border-slate-700 px-5 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={onImportResume} className="ml-auto text-sm text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-2 border border-teal-200 dark:border-teal-900 rounded-xl px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"><UploadCloud size={16} /> Auto-fill from resume</button>
        </div>
      </div>
    </Modal>
  )
}
