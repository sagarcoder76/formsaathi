import { useEffect, useState } from 'react'
import {
  CheckCircle2, Cloud, Eye, EyeOff,
  KeyRound, Languages, Loader2, LogIn, Mail, MailCheck, ShieldCheck, UserPlus, X,
} from 'lucide-react'
import { useAuth } from './lib/auth'
import { useToast } from './components/Toast'
import { PROFILE_TYPE_CARDS, type SelectableProfileType } from './lib/profileTypes'
import {
  goalsForProfileType,
  loadLocalSchemeProfile,
  pushCloudSchemeProfile,
  saveLocalSchemeProfile,
} from './lib/schemeStore'
import { supabase } from './lib/supabase'

interface SchemeAuthFormProps {
  initialMode?: 'login' | 'signup' | 'magic'
  language?: 'en' | 'hi'
  onLanguageChange?: (lang: 'en' | 'hi') => void
  onSuccess?: (chosenType?: SelectableProfileType) => void
  onClose?: () => void
}

export function SchemeAuthCard({
  initialMode = 'login',
  language = 'en',
  onLanguageChange,
  onSuccess,
  onClose,
}: SchemeAuthFormProps) {
  const { enabled, signInWithPassword, signUpWithPassword, signInMagicLink } = useAuth()
  const toast = useToast()
  const [localLang, setLocalLang] = useState<'en' | 'hi'>(language)
  const lang = onLanguageChange ? language : localLang
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>(initialMode)
  const [fullName, setFullName] = useState(() => loadLocalSchemeProfile().full_name)
  const [profileType, setProfileType] = useState<SelectableProfileType>(() => {
    const cur = loadLocalSchemeProfile().profile_type
    return cur === 'unset' ? 'college_student' : cur
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en)

  const toggleLang = () => {
    const next = lang === 'en' ? 'hi' : 'en'
    setLocalLang(next)
    onLanguageChange?.(next)
  }

  const applySignupProfileLocallyAndCloud = async (chosenType: SelectableProfileType, cleanName: string) => {
    const cur = loadLocalSchemeProfile()
    const updated = {
      ...cur,
      profile_type: chosenType,
      goals: goalsForProfileType(chosenType, cur.goals),
      full_name: cleanName || cur.full_name,
    }
    saveLocalSchemeProfile(updated)
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (data.user?.id) {
        await pushCloudSchemeProfile(data.user.id, updated)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enabled) {
      setError(t('Supabase Auth is not configured in this environment.', 'Supabase लॉगिन कॉन्फ़िगर नहीं है।'))
      return
    }
    const cleanEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('Please enter a valid email address.', 'कृपया सही ईमेल पता दर्ज करें।'))
      return
    }
    if (mode !== 'magic' && password.length < 6) {
      setError(t('Password must be at least 6 characters.', 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'))
      return
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError(t('Please enter your full name.', 'कृपया अपना पूरा नाम लिखें।'))
      return
    }

    setBusy(true)
    setError('')

    if (mode === 'login') {
      const { error: err } = await signInWithPassword(cleanEmail, password)
      setBusy(false)
      if (err) {
        setError(err)
        return
      }
      toast.push(t('Signed in with Supabase! Your profile is synced.', 'सफलतापूर्वक लॉगिन हुआ! आपकी प्रोफ़ाइल सिंक है।'), 'success')
      onSuccess?.()
      onClose?.()
      return
    }

    if (mode === 'signup') {
      const cleanName = fullName.trim()
      const { error: err, needsConfirmation } = await signUpWithPassword(cleanEmail, password, {
        full_name: cleanName,
        profile_type: profileType,
      })
      if (err) {
        setBusy(false)
        setError(err)
        return
      }
      await applySignupProfileLocallyAndCloud(profileType, cleanName)
      setBusy(false)
      if (needsConfirmation) {
        setSentTo(cleanEmail)
        return
      }
      toast.push(
        t(
          'Account created on Supabase! Answer your profile questions next.',
          'Supabase अकाउंट बन गया! अब अपनी प्रोफ़ाइल के सवालों के जवाब दें।',
        ),
        'success',
      )
      onSuccess?.(profileType)
      onClose?.()
      return
    }

    const { error: err } = await signInMagicLink(cleanEmail)
    setBusy(false)
    if (err) setError(err)
    else setSentTo(cleanEmail)
  }

  return (
    <div className="sa-auth-card" lang={lang}>
      <div className="sa-auth-head">
        <div>
          <span className="fs-kicker">
            <span /> {t('SUPABASE CLOUD ACCOUNT', 'SUPABASE क्लाउड अकाउंट')}
          </span>
          <h2>
            {mode === 'login'
              ? t('Sign in to FormSaathi', 'FormSaathi में लॉगिन करें')
              : mode === 'signup'
                ? t('Create Account & Choose Profile Type', 'नया अकाउंट बनाएँ और प्रोफ़ाइल प्रकार चुनें')
                : t('Passwordless Magic Link', 'ईमेल मैजिक लिंक लॉगिन')}
          </h2>
          <small>
            {t(
              'Sync your Citizen Profile, matched schemes, wishlist & application status securely via Supabase.',
              'अपनी प्रोफ़ाइल, सुझाई गई योजनाएँ, विशलिस्ट और आवेदन स्थिति Supabase पर सुरक्षित रखें।',
            )}
          </small>
        </div>

        <div className="sa-auth-head-actions">
          <button type="button" className="sw-lang-btn" onClick={toggleLang}>
            <Languages size={15} /> {lang === 'en' ? 'हिन्दी' : 'English'}
          </button>
          {onClose && (
            <button
              type="button"
              className="sw-icon-close"
              aria-label={t('Close login window', 'बंद करें')}
              onClick={onClose}
            >
              <X size={19} />
            </button>
          )}
        </div>
      </div>

      {sentTo ? (
        <div className="sa-auth-sent">
          <MailCheck size={42} />
          <h3>{t('Check your email inbox', 'अपना ईमेल इनबॉक्स देखें')}</h3>
          <p>
            {t(
              `We sent a Supabase verification link to ${sentTo}. Open it to complete sign-in.`,
              `हमने ${sentTo} पर Supabase लॉगिन लिंक भेजा है। साइन इन पूरा करने के लिए उसे खोलें।`,
            )}
          </p>
          {onClose && (
            <button type="button" className="sw-apply-btn" onClick={onClose}>
              {t('Done', 'ठीक है')}
            </button>
          )}
        </div>
      ) : (
        <form className="sa-auth-body" onSubmit={e => void handleSubmit(e)}>
          <div className="sa-auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError('') }}
            >
              <LogIn size={14} /> {t('Login', 'लॉगिन')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => { setMode('signup'); setError('') }}
            >
              <UserPlus size={14} /> {t('Create Account', 'साइन अप')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'magic'}
              className={mode === 'magic' ? 'active' : ''}
              onClick={() => { setMode('magic'); setError('') }}
            >
              <Mail size={14} /> {t('Magic Link', 'ईमेल लिंक')}
            </button>
          </div>

          {mode === 'signup' && (
            <>
              <label className="sw-field" htmlFor="sa-auth-name">
                <span>{t('Full Name', 'पूरा नाम')}</span>
                <input
                  id="sa-auth-name"
                  type="text"
                  maxLength={120}
                  placeholder={t('e.g. Riya Verma', 'जैसे रिया वर्मा')}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </label>

              <div className="sw-field">
                <span>{t('Choose Your Profile Type (we will ask only its questions)', 'अपनी प्रोफ़ाइल का प्रकार चुनें (उसी के अनुसार सवाल पूछे जाएँगे)')}</span>
                <div className="sa-type-mini-grid">
                  {PROFILE_TYPE_CARDS.map(card => {
                    const Icon = card.icon
                    const selected = profileType === card.id
                    return (
                      <button
                        key={card.id}
                        type="button"
                        aria-pressed={selected}
                        className={`sa-type-mini ${selected ? 'active' : ''}`}
                        onClick={() => setProfileType(card.id)}
                      >
                        <Icon size={17} />
                        <div>
                          <strong>{lang === 'hi' ? card.hiTitle : card.enTitle}</strong>
                          <small>{lang === 'hi' ? card.hiSchemes : card.enSchemes}</small>
                        </div>
                        {selected && <CheckCircle2 size={16} className="sa-type-check" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <label className="sw-field" htmlFor="sa-auth-email">
            <span>{t('Email Address', 'ईमेल पता')}</span>
            <input
              id="sa-auth-email"
              type="email"
              autoComplete="email"
              placeholder={t('you@example.com', 'you@example.com')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

          {mode !== 'magic' && (
            <div className="sw-field">
              <label htmlFor="sa-auth-password">{t('Password', 'पासवर्ड')}</label>
              <div className="sa-pass-wrap">
                <input
                  id="sa-auth-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={t('Minimum 6 characters', 'कम से कम 6 अक्षर')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="sa-pass-toggle"
                  aria-label={showPass ? t('Hide password', 'पासवर्ड छिपाएँ') : t('Show password', 'पासवर्ड दिखाएँ')}
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="sa-auth-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="sa-auth-submit">
            {busy ? (
              <>
                <Loader2 size={16} className="sa-spin" /> {t('Connecting to Supabase…', 'Supabase से जुड़ रहा है…')}
              </>
            ) : mode === 'login' ? (
              <>
                <KeyRound size={16} /> {t('Sign In with Supabase', 'Supabase से लॉगिन करें')}
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus size={16} /> {t('Create Account & Start My Profile', 'अकाउंट बनाएँ और प्रोफ़ाइल शुरू करें')}
              </>
            ) : (
              <>
                <Mail size={16} /> {t('Send Magic Sign-In Link', 'लॉगिन लिंक भेजें')}
              </>
            )}
          </button>

          <div className="sa-auth-foot-note">
            <span>
              <ShieldCheck size={14} />{' '}
              {t(
                'Protected by Supabase Row-Level Security (RLS) · No Aadhaar required.',
                'Supabase RLS सुरक्षा से सुरक्षित · आधार नंबर आवश्यक नहीं।',
              )}
            </span>
            <span>
              <Cloud size={14} />{' '}
              {mode === 'login' ? (
                <button type="button" className="sw-link-btn" onClick={() => { setMode('signup'); setError('') }}>
                  {t('New here? Create account →', 'नया अकाउंट बनाएँ →')}
                </button>
              ) : (
                <button type="button" className="sw-link-btn" onClick={() => { setMode('login'); setError('') }}>
                  {t('Already have an account? Login →', 'पहले से अकाउंट है? लॉगिन करें →')}
                </button>
              )}
            </span>
          </div>
        </form>
      )}
    </div>
  )
}

export default function SchemeAuthModal({
  initialMode = 'login',
  language = 'en',
  onSuccess,
  onClose,
}: {
  initialMode?: 'login' | 'signup' | 'magic'
  language?: 'en' | 'hi'
  onSuccess?: (chosenType?: SelectableProfileType) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="sw-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="FormSaathi Login"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <SchemeAuthCard
        initialMode={initialMode}
        language={language}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    </div>
  )
}
