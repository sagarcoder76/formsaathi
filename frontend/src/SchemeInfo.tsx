import { useEffect, useState } from 'react'
import {
  ArrowRight, BookOpen, BriefcaseBusiness, Check, Cloud, ExternalLink,
  GraduationCap, Landmark, Layers, LogIn, LogOut, MessageCircle, Moon, Sun, UserCheck, UserPlus,
} from 'lucide-react'
import { useAuth } from './lib/auth'
import { useTheme } from './lib/theme'
import SchemeAuthModal, { SchemeAuthCard } from './SchemeAuthModal'
import type { SelectableProfileType } from './lib/profileTypes'
import { SCHEME_STORAGE_EVENT, loadLocalSchemeApps, loadLocalSchemeProfile } from './lib/schemeStore'
import './schemes.css'

export type SchemeNavId = 'home' | 'profile' | 'wishlist' | 'guide' | 'help' | 'contact' | 'login'

const links: [Exclude<SchemeNavId, 'login'>, string, string][] = [
  ['home', 'Home page', '/'],
  ['profile', 'My Profile', '/?view=profile'],
  ['wishlist', 'Wishlist', '/?view=wishlist'],
  ['guide', 'Step-by-step guide', '/?view=guide'],
  ['help', 'Help', '/?view=help'],
  ['contact', 'Contact us', '/?view=contact'],
]
const assistant = '/?view=assistant'

export function SchemeHeader({ active = 'home' }: { active?: SchemeNavId | 'assistant' }) {
  const { enabled: authEnabled, session, userEmail, userName, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const [savedCount, setSavedCount] = useState(() => Object.keys(loadLocalSchemeApps()).length)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null)

  useEffect(() => {
    const refresh = () => setSavedCount(Object.keys(loadLocalSchemeApps()).length)
    window.addEventListener(SCHEME_STORAGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(SCHEME_STORAGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const displayName = userName || loadLocalSchemeProfile().full_name.trim() || (userEmail ? userEmail.split('@')[0] : '')

  return (
    <>
      <header className="fs-top">
        <div className="fs-container fs-nav">
          <a className="fs-brand" href="/">
            <span><Landmark size={19} /></span>
            FormSaathi
          </a>

          <nav aria-label="Main navigation">
            {links.map(([view, label, href]) => (
              <a key={view} href={href} aria-current={active === view ? 'page' : undefined}>
                {label}
                {view === 'wishlist' && savedCount > 0 && <b className="fs-nav-badge">{savedCount}</b>}
              </a>
            ))}
          </nav>

          <div className="fs-nav-auth">
            <button
              type="button"
              className="fs-theme-btn"
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
              <span>{dark ? 'Light' : 'Dark'}</span>
            </button>

            {session ? (
              <>
                <a className="fs-user-pill" href="/?view=profile" title={userEmail ?? undefined}>
                  <span className="fs-sync-dot" aria-hidden="true" />
                  <UserCheck size={14} />
                  <span>{displayName || 'Account'}</span>
                </a>
                <button
                  type="button"
                  className="fs-logout-btn"
                  onClick={() => void signOut()}
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </>
            ) : authEnabled ? (
              <>
                <button
                  type="button"
                  className="fs-login-btn"
                  onClick={() => setAuthModalMode('login')}
                >
                  <LogIn size={14} />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  className="fs-signup-btn"
                  onClick={() => setAuthModalMode('signup')}
                >
                  <UserPlus size={14} />
                  <span>Sign up</span>
                </button>
              </>
            ) : (
              <a className="fs-login-btn" href="/?view=login">
                <LogIn size={14} />
                <span>Account</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {authModalMode && (
        <SchemeAuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(chosenType?: SelectableProfileType) => {
            if (chosenType) {
              window.location.href = `/?view=profile&type=${chosenType}`
            }
          }}
        />
      )}
    </>
  )
}

export function SchemeFooter({ language = 'en' }: { language?: 'en' | 'hi' }) {
  const { enabled: authEnabled, session, userEmail } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null)
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en)

  return (
    <>
      <footer className="fs-footer-wrap" aria-label={t('Site footer and quick links', 'फ़ुटर और त्वरित लिंक')}>
        <div className="fs-container">
          <div className="fs-footer-grid">
            {/* Column 1: Brand + Account */}
            <div className="fs-footer-brand-col">
              <a className="fs-brand" href="/">
                <span><Landmark size={19} /></span>
                FormSaathi
              </a>
              <p>
                {t(
                  'Transparent Indian government scheme matching, profile-based eligibility readiness, saved wishlist & assisted official application prep.',
                  'भारतीय सरकारी योजनाओं की पारदर्शी पात्रता जाँच, प्रोफ़ाइल स्थिति, विशलिस्ट और आधिकारिक आवेदन सहायता।',
                )}
              </p>
              <div className="fs-footer-cta-row">
                {session ? (
                  <a className="fs-footer-pill" href="/?view=profile">
                    <Cloud size={14} /> {t('Synced:', 'सिंक सक्रिय:')} {userEmail}
                  </a>
                ) : authEnabled ? (
                  <>
                    <button
                      type="button"
                      className="fs-footer-auth-btn primary"
                      onClick={() => setAuthModalMode('signup')}
                    >
                      <UserPlus size={14} /> {t('Create Free Account', 'मुफ़्त अकाउंट बनाएँ')}
                    </button>
                    <button
                      type="button"
                      className="fs-footer-auth-btn"
                      onClick={() => setAuthModalMode('login')}
                    >
                      <LogIn size={14} /> {t('Login', 'लॉगिन')}
                    </button>
                  </>
                ) : (
                  <a className="fs-footer-auth-btn primary" href="/?view=profile">
                    <UserCheck size={14} /> {t('Open My Profile', 'मेरी प्रोफ़ाइल खोलें')}
                  </a>
                )}
                <button
                  type="button"
                  className="fs-footer-auth-btn"
                  onClick={toggleTheme}
                >
                  {dark ? <Sun size={14} /> : <Moon size={14} />}
                  {dark ? t('Light Mode', 'लाइट मोड') : t('Dark Mode', 'डार्क मोड')}
                </button>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="fs-footer-col">
              <h3>{t('Platform & Tools', 'प्लेटफ़ॉर्म और टूल्स')}</h3>
              <ul>
                <li><a href="/">{t('Home page', 'मुख्य पृष्ठ')}</a></li>
                <li><a href="/?view=profile">{t('My Profile & Auto-Match', 'मेरी प्रोफ़ाइल और ऑटो-मैच')}</a></li>
                <li><a href="/?view=wishlist">{t('Saved Wishlist & Status', 'विशलिस्ट और आवेदन स्थिति')}</a></li>
                <li><a href="/?view=assistant"><MessageCircle size={13} /> {t('Scheme Chat Assistant', 'योजना चैट सहायक')}</a></li>
                <li><a href="/?view=careers">{t('Career & Internships Portal', 'करियर और इंटर्नशिप पोर्टल')}</a></li>
                <li><a href="/?view=login">{t('Supabase Login / Sign up', 'Supabase लॉगिन / साइन अप')}</a></li>
              </ul>
            </div>

            {/* Column 3: Profile Types */}
            <div className="fs-footer-col">
              <h3>{t('Start by Profile Type', 'प्रोफ़ाइल प्रकार चुनें')}</h3>
              <ul>
                <li>
                  <a href="/?view=profile&type=school_student">
                    <BookOpen size={13} /> {t('School Student (Class 1–12)', 'स्कूली छात्र (कक्षा 1–12)')}
                  </a>
                </li>
                <li>
                  <a href="/?view=profile&type=college_student">
                    <GraduationCap size={13} /> {t('College / University Student', 'कॉलेज / विश्वविद्यालय छात्र')}
                  </a>
                </li>
                <li>
                  <a href="/?view=profile&type=entrepreneur">
                    <BriefcaseBusiness size={13} /> {t('Business / Entrepreneur', 'व्यवसायी / उद्यमी')}
                  </a>
                </li>
                <li>
                  <a href="/?view=profile&type=all_rounder">
                    <Layers size={13} /> {t('Multi-Goal / Family Profile', 'बहु-उद्देश्यीय / परिवार')}
                  </a>
                </li>
                <li>
                  <a href="/?view=guide">{t('Step-by-step Guide', 'चरणबद्ध मार्गदर्शिका')}</a>
                </li>
              </ul>
            </div>

            {/* Column 4: Official Portals & Support */}
            <div className="fs-footer-col">
              <h3>{t('Official Portals & Help', 'आधिकारिक पोर्टल व सहायता')}</h3>
              <ul>
                <li>
                  <a href="https://scholarships.gov.in/" target="_blank" rel="noreferrer">
                    National Scholarship Portal <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp" target="_blank" rel="noreferrer">
                    KVIC PMEGP e-Portal <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.jansamarth.in/home" target="_blank" rel="noreferrer">
                    JanSamarth / PM MUDRA <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.education.gov.in/nmms" target="_blank" rel="noreferrer">
                    NMMSS Education Portal <ExternalLink size={12} />
                  </a>
                </li>
                <li><a href="/?view=help">{t('Help & FAQs', 'सहायता और सामान्य प्रश्न')}</a></li>
                <li><a href="/?view=contact">{t('Contact & Report Issue', 'संपर्क और समस्या रिपोर्ट')}</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar Strip */}
          <div className="fs-footer-bottom">
            <div className="fs-footer-copy">
              <strong>FormSaathi</strong>
              <span>
                <Check size={14} />{' '}
                {t(
                  'Preliminary checks & assisted prep — submit final forms on official government portals.',
                  'प्रारंभिक जाँच व आवेदन सहायता — अंतिम फ़ॉर्म आधिकारिक सरकारी पोर्टल पर जमा करें।',
                )}
              </span>
            </div>
            <nav className="fs-footer-bar-links" aria-label={t('Bottom navigation links', 'नीचे के त्वरित लिंक')}>
              <a href="/">{t('Home', 'होम')}</a>
              <a href="/?view=profile">{t('Profile', 'प्रोफ़ाइल')}</a>
              <a href="/?view=wishlist">{t('Wishlist', 'विशलिस्ट')}</a>
              <a href="/?view=assistant">{t('Assistant', 'सहायक')}</a>
              <a href="/?view=careers">{t('Careers', 'करियर')}</a>
              <a href="/?view=guide">{t('Guide', 'गाइड')}</a>
              <a href="/?view=help">{t('Help', 'सहायता')}</a>
              <a href="/?view=contact">{t('Contact', 'संपर्क')}</a>
              <a href="https://github.com/sagarcoder76/formsaathi" target="_blank" rel="noreferrer">
                GitHub <ExternalLink size={12} />
              </a>
            </nav>
          </div>
        </div>
      </footer>

      {authModalMode && (
        <SchemeAuthModal
          initialMode={authModalMode}
          language={language}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(chosenType?: SelectableProfileType) => {
            if (chosenType) {
              window.location.href = `/?view=profile&type=${chosenType}`
            }
          }}
        />
      )}
    </>
  )
}

export function SchemeLoginPage() {
  const { session, userEmail, userName, signOut } = useAuth()
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const modeParam = new URLSearchParams(window.location.search).get('mode')
  const initialMode = modeParam === 'signup' ? 'signup' : modeParam === 'magic' ? 'magic' : 'login'
  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en)

  return (
    <div className="fs-home" lang={lang}>
      <SchemeHeader active="login" />
      <main className="fs-container sa-login-page">
        {session ? (
          <div className="sa-logged-in-box">
            <span className="fs-kicker">
              <span /> {t('SIGNED IN WITH SUPABASE', 'SUPABASE लॉगिन सक्रिय')}
            </span>
            <h1>
              {t('Welcome back', 'स्वागत है')}
              {userName ? `, ${userName}` : ''}!
            </h1>
            <p>
              {t(
                `You are signed in as ${userEmail}. Your profile type, answers, wishlist and application status sync automatically to Supabase.`,
                `आप ${userEmail} के रूप में लॉगिन हैं। आपकी प्रोफ़ाइल, विशलिस्ट और आवेदन स्थिति Supabase पर सुरक्षित हैं।`,
              )}
            </p>
            <div className="fs-start-actions">
              <a className="fs-primary" href="/?view=profile">
                {t('Open My Profile & Suggested Schemes', 'मेरी प्रोफ़ाइल और योजनाएँ खोलें')} <ArrowRight size={18} />
              </a>
              <a className="fs-secondary" href="/?view=wishlist">
                {t('View Wishlist & Status', 'विशलिस्ट और स्थिति देखें')}
              </a>
              <button type="button" className="sw-subtle-btn" onClick={() => void signOut()}>
                <LogOut size={14} /> {t('Sign out', 'साइन आउट')}
              </button>
            </div>
          </div>
        ) : (
          <SchemeAuthCard
            initialMode={initialMode}
            language={lang}
            onLanguageChange={setLang}
            onSuccess={(chosenType?: SelectableProfileType) => {
              window.location.href = chosenType
                ? `/?view=profile&type=${chosenType}`
                : '/?view=profile'
            }}
          />
        )}
      </main>
      <SchemeFooter language={lang} />
    </div>
  )
}

const steps = [
  ['Choose your profile type', 'Pick School Student, College Student, Business / Entrepreneur, or Multi-Goal Family so FormSaathi only asks the questions relevant to you.'],
  ['Answer your profile questions', 'Keep details such as your class or course, marks, project cost, or annual family income handy. Choose “Not sure” whenever you don’t know an answer.'],
  ['Review auto-matched schemes', 'Check which requirements you meet, what you would need to qualify, and save promising schemes to your Wishlist.'],
  ['Verify and apply officially', 'Use the Pre-filled Assisted Apply sheet to copy fields, verify documents, apply on the official portal, and track your status.'],
]

export default function SchemeInfo({ view }: { view: 'guide' | 'help' | 'contact' }) {
  return (
    <div className="fs-home">
      <SchemeHeader active={view} />
      <main className="fs-container fs-info">
        {view === 'guide' && (
          <>
            <h1>Find a scholarship or scheme</h1>
            <p>Follow these four steps to go from choosing your profile type to applying on an official portal.</p>
            <ol className="fs-info-list">
              {steps.map(([title, detail], i) => (
                <li key={title}>
                  <span className="fs-index">0{i + 1}</span>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                </li>
              ))}
            </ol>
            <div className="fs-start-actions" style={{ marginTop: 22 }}>
              <a className="fs-primary" href="/?view=profile" style={{ marginTop: 0 }}>
                Choose profile type & match <ArrowRight size={18} />
              </a>
              <a className="fs-secondary" href={assistant}>
                Open chat assistant
              </a>
            </div>
          </>
        )}
        {view === 'help' && (
          <>
            <h1>How can we help?</h1>
            <div className="fs-info-list">
              {[
                ['Why do I choose a profile type first?', 'Choosing School Student, College Student, or Business / Entrepreneur lets FormSaathi ask only the 4–7 questions needed for your category instead of unrelated questions.'],
                ['How does Supabase Login work?', 'Create a free account with your email and password (or magic link) to sync your profile, wishlist, and application tracker across devices using Supabase Row-Level Security.'],
                ['What does a profile match mean?', 'Your answers meet the rules checked by FormSaathi. The scheme provider makes the official decision and may check additional requirements.'],
                ['Which schemes can I check?', 'FormSaathi currently screens PMEGP, PM MUDRA, PM-USP CSSS and NMMSS. It does not search every central or state scheme.'],
                ['Do I need to upload documents or Aadhaar here?', 'No. FormSaathi never asks for Aadhaar numbers or document uploads. Submit required documents only through the official government portal.'],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <a className="fs-info-link" href="/?view=guide">
              Read the step-by-step guide <ArrowRight size={16} />
            </a>
          </>
        )}
        {view === 'contact' && (
          <>
            <h1>Contact us</h1>
            <p>Choose where to ask based on what you need help with.</p>
            <div className="fs-info-list">
              <section>
                <h2>FormSaathi feedback or bugs</h2>
                <p>Report a problem through the project’s public issue tracker. Don’t include Aadhaar, documents, or private profile details.</p>
                <a className="fs-info-link" href="https://github.com/sagarcoder76/formsaathi/issues" target="_blank" rel="noreferrer">
                  Open the project issue tracker <ExternalLink size={16} />
                </a>
              </section>
              <section>
                <h2>Scholarship & credit applications</h2>
                <p>For application status, deadlines or official eligibility questions, use the support options on the National Scholarship Portal, KVIC PMEGP portal, or JanSamarth.</p>
                <a className="fs-info-link" href="https://scholarships.gov.in/" target="_blank" rel="noreferrer">
                  National Scholarship Portal <ExternalLink size={16} />
                </a>
              </section>
            </div>
          </>
        )}
      </main>
      <SchemeFooter />
    </div>
  )
}
