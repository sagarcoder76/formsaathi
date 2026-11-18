import { ArrowRight, ExternalLink, Landmark } from 'lucide-react'
import './schemes.css'

const links = [['guide', 'Step-by-step guide'], ['help', 'Help'], ['contact', 'Contact us']]
const assistant = '/?view=assistant'

export function SchemeHeader({ active }: { active?: string }) {
  return <header className="fs-top"><div className="fs-container fs-nav"><a className="fs-brand" href="/"><span><Landmark size={19}/></span>FormSaathi</a><nav aria-label="Main navigation">{links.map(([view, label]) => <a key={view} href={`/?view=${view}`} aria-current={active === view ? 'page' : undefined}>{label}</a>)}</nav></div></header>
}

const steps = [
  ['Choose your goal', 'Select Pay for college for higher education scholarships, Continue school education for school scholarships, or Start or grow a business for business support.'],
  ['Answer the profile questions', 'For scholarships, keep details such as your class or course, marks, and annual family income handy. Choose “Not sure” whenever you don’t know an answer.'],
  ['Read the results', 'Check which requirements you meet, what you would need to qualify, and what still needs confirmation. A profile match does not guarantee approval.'],
  ['Verify and apply officially', 'Open the official link in your report. Check the latest eligibility rules, application dates, and required documents, then apply through the official portal.'],
]

export default function SchemeInfo({ view }: { view: 'guide' | 'help' | 'contact' }) {
  return <div className="fs-home"><SchemeHeader active={view}/><main className="fs-container fs-info">
    {view === 'guide' && <><h1>Find a scholarship or scheme</h1><p>Follow these four steps to go from checking your profile to applying on an official portal.</p><ol className="fs-info-list">{steps.map(([title, detail], i) => <li key={title}><span className="fs-index">0{i + 1}</span><h2>{title}</h2><p>{detail}</p></li>)}</ol><a className="fs-primary" href={assistant}>Open scheme assistant <ArrowRight size={18}/></a></>}
    {view === 'help' && <><h1>How can we help?</h1><div className="fs-info-list">{[
      ['What does a profile match mean?', 'Your answers meet the rules checked by FormSaathi. The scheme provider makes the official decision and may check additional requirements.'],
      ['What if I don’t know an answer?', 'Choose “Not sure”. The report shows what needs confirmation instead of assuming you meet the rule.'],
      ['Which schemes can I check?', 'FormSaathi currently screens PMEGP, MUDRA, PM-USP CSSS and NMMSS. It does not search every central or state scheme.'],
      ['Do I need to upload documents?', 'No. The assistant does not ask for documents or Aadhaar. Submit required documents only through the official application portal.'],
    ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div><a className="fs-info-link" href="/?view=guide">Read the step-by-step guide <ArrowRight size={16}/></a></>}
    {view === 'contact' && <><h1>Contact us</h1><p>Choose where to ask based on what you need help with.</p><div className="fs-info-list"><section><h2>FormSaathi feedback or bugs</h2><p>Report a problem through the project’s public issue tracker. Don’t include Aadhaar, documents, or private profile details.</p><a className="fs-info-link" href="https://github.com/sagarcoder76/formsaathi/issues" target="_blank" rel="noreferrer">Open the project issue tracker <ExternalLink size={16}/></a></section><section><h2>Scholarship applications</h2><p>For application status, deadlines or official eligibility questions, use the support options on the National Scholarship Portal or the scheme’s official website.</p><a className="fs-info-link" href="https://scholarships.gov.in/" target="_blank" rel="noreferrer">National Scholarship Portal <ExternalLink size={16}/></a></section></div></>}
  </main></div>
}
