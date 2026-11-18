import { ArrowRight, BookOpen, BriefcaseBusiness, Check, GraduationCap, MessageCircle, ShieldCheck } from 'lucide-react'
import { SchemeHeader } from './SchemeInfo'
import './schemes.css'

const assistant = '/?view=assistant'

export default function SchemeHome() {
  return <div className="fs-home">
    <SchemeHeader/>
    <main className="fs-container">
      <section className="fs-hero"><div><span className="fs-kicker"><span/> GOVERNMENT SCHEME DISCOVERY</span><h1>Discover government schemes <em>you may qualify for.</em></h1><p>Tell us what you need help with. FormSaathi checks your answers against selected Indian government schemes and explains which requirements you meet.</p><div className="fs-intro-note"><strong>Know where you stand before you apply.</strong><p>See why a scheme matches your profile, what’s missing, and where to verify the details.</p></div><div className="fs-meta"><ShieldCheck size={17}/> No sign-in or Aadhaar needed</div></div>
      <div className="fs-hero-visual"><img className="fs-hero-image" src="/images/scheme-home.jpg" alt="A student and a small-business owner reviewing a document together" fetchPriority="high"/><div className="fs-preview" aria-label="Example of the scheme assistant"><div className="fs-preview-head"><span><MessageCircle size={19}/></span><div><strong>Scheme assistant</strong><small>English · हिन्दी</small></div><b>PREVIEW</b></div><div className="fs-preview-body"><div className="fs-preview-question"><span>QUESTION 1 · YOUR GOAL</span><p>What would you like support with?</p></div><a href={`${assistant}&goal=business`}><BriefcaseBusiness size={19}/> Start or grow a business <ArrowRight size={16}/></a><a href={`${assistant}&goal=college`}><GraduationCap size={19}/> Pay for college <ArrowRight size={16}/></a><a href={`${assistant}&goal=school`}><BookOpen size={19}/> Continue school education <ArrowRight size={16}/></a></div></div></div></section>
      <section className="fs-start" aria-label="Start your eligibility check"><div><h2>Ready to check your eligibility?</h2><p>Start with a few questions in English or Hindi.</p></div><a className="fs-primary" href={assistant}>Open scheme assistant <ArrowRight size={19}/></a></section>
      <section className="fs-how" aria-labelledby="fs-how-title"><span className="fs-kicker">HOW IT WORKS</span><h2 id="fs-how-title">From a few answers to a clear next step.</h2><div className="fs-steps">{[['Tell us your goal', 'Answer 5–8 questions in English or Hindi. The questions adapt to what you tell us.'],['Understand your matches', 'See which requirements you meet, what’s missing, and what still needs confirmation.'],['Take the next step', 'Download your report and check current details with the official scheme provider.']].map(([title, description], i) => <article key={title}><span className="fs-index">0{i + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    </main><footer className="fs-container fs-footer"><strong>FormSaathi</strong><a href="/?view=careers">Career tools</a><span><Check size={15}/> Preliminary checks, not official eligibility decisions.</span></footer>
  </div>
}
