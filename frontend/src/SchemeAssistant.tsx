import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, BriefcaseBusiness, Check, ClipboardCheck, GraduationCap, Languages, MessageCircle, RotateCcw, Send, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'
import { SchemeFooter, SchemeHeader } from './SchemeInfo'
import { useAuth } from './lib/auth'
import { useToast } from './components/Toast'
import {
  currentIsoTimestamp,
  deleteCloudSchemeApp,
  loadLocalSchemeApps,
  loadLocalSchemeProfile,
  mergeInterviewAnswersIntoProfile,
  pushCloudSchemeProfile,
  saveLocalSchemeApps,
  saveLocalSchemeProfile,
  upsertCloudSchemeApp,
  type SchemeApplicationEntry,
  type SchemeGoal,
} from './lib/schemeStore'
import './schemes.css'

type Answer = string | number
type Result = { id: string; name: string; source: string; benefit: string; caveat: string; status: 'match' | 'near_miss' | 'needs_info' | 'not_matched'; checks: {status: 'pass' | 'fail' | 'unknown'; criterion: string}[] }
type Interview = { question: {id: string; prompt: string; options: Record<string, string> | null; min: number; max: number} | null; step?: number; transcript: {prompt: string; answer: string}[]; results?: Result[]; overview?: string; report?: string; disclaimer?: string; labels?: Record<Result['status'], string>; ai_available?: boolean; ai_failed?: boolean }

export default function SchemeAssistant() {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const toast = useToast()
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [data, setData] = useState<Interview>()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(true)
  const [apps, setApps] = useState<Record<string, SchemeApplicationEntry>>(loadLocalSchemeApps)
  const [syncedProfile, setSyncedProfile] = useState(false)
  const latest = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const t = (en: string, hi: string) => language === 'hi' ? hi : en
  async function load(next: Record<string, Answer>, lang = language, explain = false) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(false)
    try {
      const response = await fetch('/api/schemes/intake', { method: 'POST', signal: controller.signal, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({language: lang, answers: next, explain}) })
      if (!response.ok) throw new Error('Request failed')
      const interview: Interview = await response.json()
      if (!controller.signal.aborted) { setData(interview); setAnswers(next); setLanguage(lang); setValue(''); setSyncedProfile(false) }
    } catch { if (!controller.signal.aborted) setError(true) }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  // Initial load; all subsequent requests are driven by user actions.
  useEffect(() => {
    const goal = new URLSearchParams(window.location.search).get('goal')
    void load(goal === 'business' || goal === 'college' || goal === 'school' ? { goal } : {}, 'en')
    return () => request.current?.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (data?.transcript.length) latest.current?.scrollIntoView({ block: 'nearest' })
  }, [data?.step, Boolean(data?.results)]) // eslint-disable-line react-hooks/exhaustive-deps
  const q = data?.question
  const optionsIcons = {business: BriefcaseBusiness, college: GraduationCap, school: BookOpen}
  function answer(v: Answer) { if (q && !busy) void load({...answers, [q.id]: v}) }
  function download() {
    if (!data?.report) return
    const url = URL.createObjectURL(new Blob([data.report], {type: 'text/plain;charset=utf-8'}))
    const link = document.createElement('a'); link.href = url; link.download = 'formsaathi-scheme-report.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function syncAnswersToProfile() {
    const merged = mergeInterviewAnswersIntoProfile(loadLocalSchemeProfile(), answers)
    saveLocalSchemeProfile(merged)
    if (uid) void pushCloudSchemeProfile(uid, merged)
    setSyncedProfile(true)
    toast.push(t('Saved interview answers to your Scheme Profile!', 'आपके जवाब प्रोफ़ाइल में सहेज लिए गए!'), 'success')
  }
  function toggleResultWishlist(r: Result) {
    const cur = apps[r.id]
    if (cur && cur.stage === 'wishlist') {
      const next = { ...apps }
      delete next[r.id]
      setApps(next)
      saveLocalSchemeApps(next)
      if (uid) void deleteCloudSchemeApp(uid, r.id)
      toast.push(t('Removed from wishlist.', 'विशलिस्ट से हटाया गया।'), 'info')
      return
    }
    const goal = (answers.goal === 'business' || answers.goal === 'college' || answers.goal === 'school' ? answers.goal : 'business') as SchemeGoal
    const now = currentIsoTimestamp()
    const entry: SchemeApplicationEntry = {
      schemeId: r.id,
      schemeName: r.name,
      goal,
      source: r.source,
      applyUrl: r.id === 'mudra' ? 'https://www.jansamarth.in/home' : r.id === 'nmmss' ? 'https://scholarships.gov.in/' : r.source,
      benefit: r.benefit,
      stage: cur?.stage ?? 'wishlist',
      applicationRef: cur?.applicationRef ?? '',
      notes: cur?.notes ?? '',
      appliedAt: cur?.appliedAt ?? null,
      updatedAt: now,
    }
    const next = { ...apps, [r.id]: entry }
    setApps(next)
    saveLocalSchemeApps(next)
    if (uid) void upsertCloudSchemeApp(uid, entry)
    toast.push(t(`Saved "${r.name}" to Wishlist!`, `"${r.name}" विशलिस्ट में सहेजा गया!`), 'success')
  }
  return <div className="schemes-site fs-home" lang={language}>
    <SchemeHeader active="assistant"/>
    <main className="scheme-wrap scheme-main"><div className="scheme-page-actions"><a href="/?view=profile"><UserCheck size={16}/>{t('Switch to Profile Auto-Match', 'प्रोफ़ाइल ऑटो-मैच खोलें')}</a><button disabled={busy} onClick={() => void load(answers, language === 'en' ? 'hi' : 'en')}><Languages size={17}/>{language === 'en' ? 'हिन्दी' : 'English'}</button></div>
      {!answers.goal && <section className="scheme-hero"><div className="scheme-tag"><Sparkles size={13}/> {t('GOVERNMENT SCHEME ASSISTANT', 'सरकारी योजना सहायक')}</div><h1>{t('Scheme assistant', 'योजना सहायक')}</h1><p>{t('A short conversation to discover government schemes you may qualify for.', 'एक छोटी बातचीत से जानें कि कौन-सी सरकारी योजनाएँ आपके लिए हो सकती हैं।')}</p></section>}
      <div className="scheme-layout"><section className="scheme-chat" aria-labelledby="scheme-chat-title"><div className="scheme-chat-header"><div className="scheme-bot"><MessageCircle size={20}/></div><div><h2 id="scheme-chat-title">{t('Scheme assistant', 'योजना सहायक')}</h2><small>{t('Guided eligibility check', 'चरणबद्ध पात्रता जाँच')}</small></div>{(data?.step || data?.results) && <b className="scheme-step">{data.results ? t('COMPLETE', 'पूरा हुआ') : `${t('QUESTION', 'सवाल')} ${data.step}`}</b>}</div>
      <div className="scheme-content">
        {error && <p role="alert" className="scheme-error">{t('Could not reach the assistant. Please try again.', 'सहायक से संपर्क नहीं हुआ। फिर से कोशिश करें।')} <button onClick={() => void load(answers)}>{t('Retry', 'फिर कोशिश करें')}</button></p>}
        {!data && busy && <p role="status">{t('Loading your interview…', 'सवाल लोड हो रहे हैं…')}</p>}
        <div className="scheme-message"><span className="scheme-avatar" aria-hidden="true"><Sparkles size={15}/></span><p>{t('Hi! I’ll ask you a few questions and show you schemes that fit your answers.', 'नमस्ते! मैं कुछ सवाल पूछूँगा और आपके जवाबों से मेल खाने वाली योजनाएँ दिखाऊँगा।')}</p></div>
        {data?.transcript.map(x => <div className="scheme-turn" key={x.prompt}><div className="scheme-message"><span className="scheme-avatar" aria-hidden="true"><Sparkles size={15}/></span><p>{x.prompt}</p></div><div className="scheme-reply"><span className="sr-only">{t('You: ', 'आप: ')}</span>{x.answer}</div></div>)}
        <div ref={latest} className="scheme-latest" aria-live="polite">{q && <div className="scheme-message"><span className="scheme-avatar" aria-hidden="true"><Sparkles size={15}/></span><h2>{q.prompt}</h2></div>}{data?.results && <div className="scheme-message"><span className="scheme-avatar" aria-hidden="true"><Sparkles size={15}/></span><h2>{t('Your scheme report is ready.', 'आपकी योजना रिपोर्ट तैयार है।')}</h2></div>}</div>
        {busy && data && <div className="scheme-typing" role="status">{t('Updating conversation…', 'बातचीत अपडेट हो रही है…')}</div>}
        {q && <div className="scheme-composer" aria-busy={busy}><div className="scheme-aside-label">{q.options ? t('QUICK REPLIES', 'त्वरित जवाब') : t('YOUR ANSWER', 'आपका जवाब')}</div>
          {q.options ? <div className="scheme-options">{Object.entries(q.options).map(([key, label]) => { const Icon = optionsIcons[key as keyof typeof optionsIcons]; return <button disabled={busy} key={key} onClick={() => answer(key)}>{Icon && <span><Icon size={19}/></span>}{label}<ArrowRight size={16} className="scheme-arrow"/></button> })}</div> : <form className="scheme-number" onSubmit={event => {event.preventDefault(); answer(Number(value))}}><input aria-label={q.prompt} type="number" inputMode="numeric" min={q.min} max={q.max} step={1} required value={value} onChange={e => setValue(e.target.value)}/><button disabled={busy}>{t('Send', 'भेजें')} <Send size={16}/></button></form>}
          {q.id !== 'goal' && <button className="scheme-quiet" disabled={busy} onClick={() => answer('unknown')}>{t('Not sure', 'पता नहीं')}</button>}</div>}
        {data?.results && <div className="scheme-report"><p className="scheme-muted">{data.disclaimer}</p><div className="sa-report-bar"><button className="scheme-quiet" disabled={busy} onClick={download}><ArrowDownToLine size={17}/>{t('Download report', 'रिपोर्ट डाउनलोड करें')}</button><button className="scheme-quiet" disabled={busy} onClick={syncAnswersToProfile}><UserCheck size={17}/>{syncedProfile ? t('Saved to Profile ✓', 'प्रोफ़ाइल में सहेजा गया ✓') : t('Save answers to My Profile', 'मेरे प्रोफ़ाइल में जवाब सहेजें')}</button>{syncedProfile && <a className="scheme-quiet" href="/?view=profile">{t('Open Profile Status →', 'प्रोफ़ाइल स्थिति देखें →')}</a>}</div>
          {data.results.map((r, index) => <article key={r.id} className="scheme-result"><span className={'scheme-badge ' + r.status}>{index + 1}. {data.labels?.[r.status]}</span><h3>{r.name}</h3><p>{r.benefit}</p><ul>{r.checks.map(c => <li key={c.criterion}><span aria-hidden="true">{c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '?'}</span><div><strong>{c.status === 'pass' ? t('Meets: ', 'पूरी: ') : c.status === 'fail' ? t('Required: ', 'ज़रूरी: ') : t('Confirm: ', 'जाँचें: ')}</strong>{c.criterion}</div></li>)}</ul><p className="scheme-muted">{r.caveat}</p><div className="sw-card-actions"><a className="sw-apply-btn" href={`/?view=profile&apply=${r.id}`} onClick={syncAnswersToProfile}><ClipboardCheck size={15}/>{t('Assisted Apply', 'सहायता-प्राप्त आवेदन')}</a><button type="button" className={`sw-wish-btn ${apps[r.id] ? 'saved' : ''}`} onClick={() => toggleResultWishlist(r)}>{apps[r.id] ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>}{apps[r.id] ? t('Wishlisted', 'सहेजा गया') : t('Wishlist', 'विशलिस्ट')}</button><a className="sw-ext-link" href={r.source} target="_blank" rel="noreferrer">{t('Official source', 'आधिकारिक स्रोत')} <ArrowRight size={14}/></a></div></article>)}
          {data.overview ? <p><strong>{t('AI benefit summary: ', 'AI लाभ सारांश: ')}</strong>{data.overview}</p> : data.ai_available && <button className="scheme-quiet" disabled={busy} onClick={() => void load(answers, language, true)}><Sparkles size={16}/>{t('Request AI benefit summary', 'AI लाभ सारांश माँगें')}</button>}{data.ai_failed && <p role="status" className="scheme-muted">{t('AI summary unavailable. Your eligibility report is unchanged.', 'AI सारांश उपलब्ध नहीं है। आपकी पात्रता रिपोर्ट नहीं बदली है।')}</p>}</div>}
        {Object.keys(answers).length > 0 && <div className="scheme-controls"><button disabled={busy} onClick={() => void load(Object.fromEntries(Object.entries(answers).slice(0, -1)))}><ArrowLeft size={16}/>{t('Back', 'पीछे')}</button><button disabled={busy} onClick={() => void load({})}><RotateCcw size={15}/>{t('Start over', 'फिर शुरू करें')}</button></div>}
      </div></section>
      <aside className="scheme-aside"><div className="scheme-aside-label">{t('YOUR PROGRESS', 'आपकी प्रगति')}</div><ol aria-label={t('Interview stages', 'बातचीत के चरण')}>{[[t('Choose a goal', 'लक्ष्य चुनें'), t('Tell us what you need help with.', 'बताएँ कि आपको किस काम में मदद चाहिए।')],[t('Answer a few questions', 'कुछ सवालों के जवाब दें'), t('We’ll only ask about your chosen goal.', 'हम आपके चुने हुए लक्ष्य के बारे में पूछेंगे।')],[t('Review your matches', 'अपनी मेल खाती योजनाएँ देखें'), t('See the rules and save your report.', 'नियम देखें और रिपोर्ट सहेजें।')]].map(([title, desc], i) => {
        const stage = data?.results ? 2 : answers.goal ? 1 : 0
        return <li key={title} aria-current={i === stage ? 'step' : undefined} className={i < stage ? 'done' : ''}><span>{i < stage ? <Check size={14}/> : `0${i+1}`}</span><div><strong>{title}</strong><p>{desc}</p></div></li>
      })}</ol><div className="scheme-private"><ShieldCheck size={20}/><div><strong>{t('No sign-in needed', 'लॉगिन की ज़रूरत नहीं')}</strong><p>{t('No name, Aadhaar or documents required.', 'नाम, आधार या दस्तावेज़ नहीं चाहिए।')}</p></div></div></aside></div>
    </main><SchemeFooter language={language}/>
  </div>
}
