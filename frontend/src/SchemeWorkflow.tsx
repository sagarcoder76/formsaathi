import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowRight, Bookmark, BookmarkCheck, BookOpen, BriefcaseBusiness,
  Check, CheckCircle2, ClipboardCheck, Cloud, Copy, ExternalLink, FileCheck2,
  GraduationCap, Languages, Layers, LogIn, LogOut, RefreshCw, RotateCcw, Sparkles,
  Trash2, UserCheck, UserPlus, X,
} from 'lucide-react'
import { SchemeFooter, SchemeHeader } from './SchemeInfo'
import SchemeAuthModal from './SchemeAuthModal'
import { PROFILE_TYPE_CARDS, type SelectableProfileType } from './lib/profileTypes'
import { useAuth } from './lib/auth'
import { useToast } from './components/Toast'
import {
  EMPTY_SCHEME_PROFILE,
  SAMPLE_PROFILES,
  buildApplicationPacketText,
  currentIsoTimestamp,
  deleteCloudSchemeApp,
  docsForProfile,
  goalsForProfileType,
  isProfilePopulated,
  isValidProfileType,
  loadLocalSchemeApps,
  loadLocalSchemeProfile,
  pullCloudSchemeApps,
  pullCloudSchemeProfile,
  pushCloudSchemeProfile,
  saveLocalSchemeApps,
  saveLocalSchemeProfile,
  upsertCloudSchemeApp,
  type MatchedScheme,
  type ProfileMatchResponse,
  type SchemeAppStage,
  type SchemeApplicationEntry,
  type SchemeCategory,
  type SchemeDocKey,
  type SchemeGoal,
  type SchemeProfile,
  type YesNoUnknown,
} from './lib/schemeStore'
import './schemes.css'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const STAGE_META: Record<SchemeAppStage, { en: string; hi: string; cls: string }> = {
  wishlist: { en: 'Saved in Wishlist', hi: 'विशलिस्ट में सहेजा गया', cls: 'wishlist' },
  docs_ready: { en: 'Documents Ready', hi: 'दस्तावेज़ तैयार', cls: 'docs_ready' },
  applied: { en: 'Applied on Portal', hi: 'पोर्टल पर आवेदन किया', cls: 'applied' },
  under_review: { en: 'Under Verification', hi: 'सत्यापन जारी', cls: 'under_review' },
  approved: { en: 'Approved / Selected', hi: 'स्वीकृत / चयनित', cls: 'approved' },
  rejected: { en: 'Not Approved', hi: 'अस्वीकृत', cls: 'rejected' },
}

function YesNoPills({
  value,
  onChange,
  lang,
}: {
  value: YesNoUnknown
  onChange: (v: YesNoUnknown) => void
  lang: 'en' | 'hi'
}) {
  const opts: [YesNoUnknown, string][] = [
    ['yes', lang === 'hi' ? 'हाँ' : 'Yes'],
    ['no', lang === 'hi' ? 'नहीं' : 'No'],
    ['unknown', lang === 'hi' ? 'पता नहीं' : 'Not sure'],
  ]
  return (
    <div className="sw-pills" role="group">
      {opts.map(([k, label]) => (
        <button
          key={k}
          type="button"
          className={value === k ? 'active' : ''}
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function NumberOrUnknownField({
  id,
  value,
  min,
  max,
  placeholder,
  presets,
  onChange,
  lang,
}: {
  id: string
  value: number | 'unknown'
  min: number
  max: number
  placeholder: string
  presets?: [number, string][]
  onChange: (v: number | 'unknown') => void
  lang: 'en' | 'hi'
}) {
  return (
    <div className="sw-num-wrap">
      <div className="sw-num-row">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          placeholder={placeholder}
          value={value === 'unknown' ? '' : value}
          onChange={e => {
            const raw = e.target.value.trim()
            if (!raw) {
              onChange('unknown')
              return
            }
            const n = Math.round(Number(raw))
            if (!Number.isNaN(n) && n >= min && n <= max) onChange(n)
          }}
        />
        {value !== 'unknown' && (
          <button type="button" className="sw-clear-btn" onClick={() => onChange('unknown')}>
            {lang === 'hi' ? 'साफ़ करें' : 'Clear'}
          </button>
        )}
      </div>
      {presets && (
        <div className="sw-presets">
          {presets.map(([num, label]) => (
            <button
              key={num}
              type="button"
              className={value === num ? 'active' : ''}
              onClick={() => onChange(num)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function loadInitialProfileWithUrlType(): SchemeProfile {
  const base = loadLocalSchemeProfile()
  const urlType = new URLSearchParams(window.location.search).get('type')
  if (isValidProfileType(urlType) && urlType !== 'unset' && base.profile_type !== urlType) {
    const updated: SchemeProfile = {
      ...base,
      profile_type: urlType,
      goals: goalsForProfileType(urlType, base.goals),
    }
    saveLocalSchemeProfile(updated)
    return updated
  }
  return base
}

export default function SchemeWorkflow({ initialTab }: { initialTab: 'profile' | 'wishlist' }) {
  const { enabled: authEnabled, session, userEmail, userName, userProfileType, signOut } = useAuth()
  const uid = session?.user.id ?? null
  const toast = useToast()

  const [tab, setTab] = useState<'profile' | 'wishlist'>(initialTab)
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [profile, setProfile] = useState<SchemeProfile>(loadInitialProfileWithUrlType)
  const [apps, setApps] = useState<Record<string, SchemeApplicationEntry>>(loadLocalSchemeApps)
  const [matchData, setMatchData] = useState<ProfileMatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'matches' | 'wishlist'>('all')
  const [stageFilter, setStageFilter] = useState<'all' | SchemeAppStage>('all')
  const [applyTargetId, setApplyTargetId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('apply'),
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const syncTimer = useRef<number | null>(null)
  const latestState = useRef({ profile, apps })
  useEffect(() => {
    latestState.current = { profile, apps }
  })

  const t = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const switchTab = (next: 'profile' | 'wishlist') => {
    setTab(next)
    const params = new URLSearchParams(window.location.search)
    params.set('view', next)
    params.delete('apply')
    window.history.replaceState(null, '', `/?${params.toString()}`)
  }

  const updateProfile = (updater: (prev: SchemeProfile) => SchemeProfile) => {
    setProfile(prev => {
      const next = updater(prev)
      saveLocalSchemeProfile(next)
      if (uid) {
        if (syncTimer.current) window.clearTimeout(syncTimer.current)
        syncTimer.current = window.setTimeout(() => {
          void pushCloudSchemeProfile(uid, next)
        }, 350)
      }
      return next
    })
  }

  const selectProfileType = (chosen: SelectableProfileType) => {
    updateProfile(prev => ({
      ...prev,
      profile_type: chosen,
      goals: goalsForProfileType(chosen, prev.goals),
    }))
    setShowTypePicker(false)
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'profile')
    params.set('type', chosen)
    window.history.replaceState(null, '', `/?${params.toString()}`)
    const card = PROFILE_TYPE_CARDS.find(c => c.id === chosen)
    if (card) {
      toast.push(
        t(
          `Profile type set to "${card.enTitle}". Showing only its questions below!`,
          `प्रोफ़ाइल प्रकार "${card.hiTitle}" चुना गया। नीचे केवल उसी के सवाल दिखाए गए हैं!`,
        ),
        'success',
      )
    }
  }

  // Cloud merge on Supabase sign-in + adopt auth metadata if local fields are unset
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    ;(async () => {
      const [cloudProfile, cloudApps] = await Promise.all([
        pullCloudSchemeProfile(uid),
        pullCloudSchemeApps(uid),
      ])
      if (cancelled) return
      const curProfile = latestState.current.profile

      let nextProfile = curProfile
      if (cloudProfile && isProfilePopulated(cloudProfile)) {
        // Prefer cloud profile when local profile has no answers yet, otherwise merge missing basics
        if (!isProfilePopulated(curProfile) || curProfile.profile_type === 'unset') {
          nextProfile = cloudProfile
        } else {
          nextProfile = {
            ...cloudProfile,
            ...curProfile,
            full_name: curProfile.full_name.trim() || cloudProfile.full_name,
            state: curProfile.state.trim() || cloudProfile.state,
          }
        }
      }

      if (!nextProfile.full_name.trim() && userName) {
        nextProfile = { ...nextProfile, full_name: userName }
      }
      if (
        nextProfile.profile_type === 'unset' &&
        isValidProfileType(userProfileType) &&
        userProfileType !== 'unset'
      ) {
        nextProfile = {
          ...nextProfile,
          profile_type: userProfileType,
          goals: goalsForProfileType(userProfileType, nextProfile.goals),
        }
      }

      setProfile(nextProfile)
      saveLocalSchemeProfile(nextProfile)
      void pushCloudSchemeProfile(uid, nextProfile)

      const curApps = latestState.current.apps
      const mergedApps: Record<string, SchemeApplicationEntry> = { ...cloudApps }
      for (const [id, localEntry] of Object.entries(curApps)) {
        const remote = cloudApps[id]
        if (!remote || localEntry.updatedAt >= remote.updatedAt) {
          mergedApps[id] = localEntry
          void upsertCloudSchemeApp(uid, localEntry)
        }
      }
      setApps(mergedApps)
      saveLocalSchemeApps(mergedApps)
    })()
    return () => {
      cancelled = true
    }
  }, [uid, userName, userProfileType])

  // Live auto-match from backend whenever profile or language changes
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/schemes/profile-match', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, profile }),
        })
        if (!res.ok) throw new Error('Match failed')
        const json = (await res.json()) as ProfileMatchResponse
        if (!controller.signal.aborted) setMatchData(json)
      } catch {
        // Ignore aborted requests
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [profile, language])

  // Close Assisted Apply modal on Escape
  useEffect(() => {
    if (!applyTargetId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApplyTargetId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyTargetId])

  const upsertAppEntry = (
    scheme: Pick<MatchedScheme, 'id' | 'name' | 'goal' | 'source' | 'apply_url' | 'benefit'>,
    patch: Partial<Pick<SchemeApplicationEntry, 'stage' | 'applicationRef' | 'notes' | 'appliedAt'>>,
  ) => {
    const now = currentIsoTimestamp()
    setApps(prev => {
      const existing = prev[scheme.id]
      const nextStage = patch.stage ?? existing?.stage ?? 'wishlist'
      const appliedAt =
        patch.appliedAt !== undefined
          ? patch.appliedAt
          : nextStage === 'applied' && !existing?.appliedAt
            ? now
            : existing?.appliedAt ?? null
      const entry: SchemeApplicationEntry = {
        schemeId: scheme.id,
        schemeName: scheme.name,
        goal: scheme.goal,
        source: scheme.source,
        applyUrl: scheme.apply_url,
        benefit: scheme.benefit,
        stage: nextStage,
        applicationRef: patch.applicationRef ?? existing?.applicationRef ?? '',
        notes: patch.notes ?? existing?.notes ?? '',
        appliedAt,
        updatedAt: now,
      }
      const next = { ...prev, [scheme.id]: entry }
      saveLocalSchemeApps(next)
      if (uid) void upsertCloudSchemeApp(uid, entry)
      return next
    })
  }

  const removeAppEntry = (schemeId: string) => {
    setApps(prev => {
      const next = { ...prev }
      delete next[schemeId]
      saveLocalSchemeApps(next)
      if (uid) void deleteCloudSchemeApp(uid, schemeId)
      return next
    })
    toast.push(t('Removed scheme from wishlist.', 'योजना विशलिस्ट से हटाई गई।'), 'info')
  }

  const toggleWishlist = (scheme: MatchedScheme) => {
    const existing = apps[scheme.id]
    if (!existing) {
      upsertAppEntry(scheme, { stage: 'wishlist' })
      toast.push(t(`Saved "${scheme.name}" to your Wishlist.`, `"${scheme.name}" विशलिस्ट में सहेजा गया।`), 'success')
    } else if (existing.stage === 'wishlist') {
      removeAppEntry(scheme.id)
    } else {
      switchTab('wishlist')
    }
  }

  const toggleGoal = (goal: SchemeGoal) => {
    updateProfile(prev => {
      const has = prev.goals.includes(goal)
      if (has && prev.goals.length === 1) return prev
      return {
        ...prev,
        profile_type: 'all_rounder',
        goals: has ? prev.goals.filter(g => g !== goal) : [...prev.goals, goal],
      }
    })
  }

  const toggleDoc = (docKey: SchemeDocKey) => {
    updateProfile(prev => ({
      ...prev,
      documents: prev.documents.includes(docKey)
        ? prev.documents.filter(d => d !== docKey)
        : [...prev.documents, docKey],
    }))
  }

  const focusField = (fieldKey: string) => {
    if (tab !== 'profile') switchTab('profile')
    window.setTimeout(() => {
      const el = document.getElementById(`sw-field-${fieldKey}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.focus()
    }, 60)
  }

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1600)
    } catch {
      toast.push(t('Copy failed — select and copy manually.', 'कॉपी नहीं हो सका।'), 'error')
    }
  }

  const downloadReport = () => {
    if (!matchData?.report) return
    const url = URL.createObjectURL(new Blob([matchData.report], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'formsaathi-profile-schemes-report.txt'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const downloadPacket = (scheme: MatchedScheme) => {
    const packet = buildApplicationPacketText(scheme, apps[scheme.id], language)
    const url = URL.createObjectURL(new Blob([packet], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `formsaathi-${scheme.id}-application-packet.txt`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const activeTypeCard = useMemo(
    () => PROFILE_TYPE_CARDS.find(c => c.id === profile.profile_type) ?? null,
    [profile.profile_type],
  )
  const activeGoals = useMemo(
    () => goalsForProfileType(profile.profile_type, profile.goals),
    [profile.profile_type, profile.goals],
  )
  const relevantDocs = useMemo(() => docsForProfile(profile), [profile])

  const status = matchData?.profile_status
  const allSchemes = useMemo(() => matchData?.results ?? [], [matchData])
  const filteredSchemes = useMemo(() => {
    if (filter === 'matches') return allSchemes.filter(s => s.status === 'match' || s.status === 'near_miss')
    if (filter === 'wishlist') return allSchemes.filter(s => Boolean(apps[s.id]))
    return allSchemes
  }, [allSchemes, filter, apps])

  const appEntries = useMemo(
    () => Object.values(apps).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [apps],
  )
  const filteredApps = useMemo(
    () => (stageFilter === 'all' ? appEntries : appEntries.filter(e => e.stage === stageFilter)),
    [appEntries, stageFilter],
  )

  const appliedCount = useMemo(
    () => appEntries.filter(e => e.stage === 'applied' || e.stage === 'under_review' || e.stage === 'approved').length,
    [appEntries],
  )

  const activeApplyScheme = useMemo(
    () => (applyTargetId ? allSchemes.find(s => s.id === applyTargetId) ?? null : null),
    [applyTargetId, allSchemes],
  )

  const goalIcons: Record<SchemeGoal, typeof BriefcaseBusiness> = {
    business: BriefcaseBusiness,
    college: GraduationCap,
    school: BookOpen,
  }

  const goalNames: Record<SchemeGoal, string> = {
    business: t('Business & Credit', 'व्यवसाय और ऋण'),
    college: t('College Scholarship', 'कॉलेज छात्रवृत्ति'),
    school: t('School Scholarship', 'स्कूल छात्रवृत्ति'),
  }

  const showAgeField = activeGoals.includes('business') || profile.profile_type === 'all_rounder'
  const showIncomeField = activeGoals.includes('school') || activeGoals.includes('college')
  const showEighthField =
    activeGoals.includes('business') &&
    (profile.budget === 'unknown' ||
      profile.budget > (profile.sector === 'manufacturing' ? 1_000_000 : 500_000))
  const showTarunPlusField =
    activeGoals.includes('business') &&
    typeof profile.loan === 'number' &&
    profile.loan > 1_000_000 &&
    profile.loan <= 2_000_000

  return (
    <div className="fs-home sw-page" lang={language}>
      <SchemeHeader active={tab === 'wishlist' ? 'wishlist' : 'profile'} />

      <main className="fs-container sw-main">
        {/* Top utility bar: Supabase Auth Account + Bilingual switch */}
        <div className="sw-topbar">
          <div className="sw-cloud-pill">
            <Cloud size={15} />
            {uid ? (
              <>
                <span>
                  {t('Supabase Cloud Synced', 'Supabase क्लाउड सिंक सक्रिय')} ·{' '}
                  <strong>{userName || userEmail}</strong>
                  {activeTypeCard && (
                    <em className="sw-inline-type">
                      {' '}· {language === 'hi' ? activeTypeCard.hiTitle : activeTypeCard.enTitle}
                    </em>
                  )}
                </span>
                <button type="button" className="sw-link-btn" onClick={() => void signOut()}>
                  <LogOut size={13} /> {t('Logout', 'लॉग आउट')}
                </button>
              </>
            ) : (
              <>
                <span>{t('Guest mode (browser storage)', 'गेस्ट मोड (ब्राउज़र में सहेजा गया)')}</span>
                {authEnabled && (
                  <>
                    <button type="button" className="sw-link-btn" onClick={() => setAuthModalMode('login')}>
                      <LogIn size={13} /> {t('Login', 'लॉगिन')}
                    </button>
                    <button type="button" className="sw-link-btn" onClick={() => setAuthModalMode('signup')}>
                      <UserPlus size={13} /> {t('Create Supabase Account', 'अकाउंट बनाएँ')}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="sw-topbar-actions">
            <a className="sw-assistant-shortcut" href="/?view=assistant">
              <Sparkles size={14} /> {t('Chat mode', 'चैट मोड')}
            </a>
            <button
              type="button"
              className="sw-lang-btn"
              onClick={() => setLanguage(l => (l === 'en' ? 'hi' : 'en'))}
            >
              <Languages size={16} /> {language === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>

        {/* Supabase Login Callout when logged out */}
        {!uid && authEnabled && (
          <section className="sw-auth-banner" aria-label={t('Save profile with Supabase account', 'Supabase अकाउंट में प्रोफ़ाइल सहेजें')}>
            <div>
              <strong>{t('Sign in with Supabase to keep your profile & applications forever', 'अपनी प्रोफ़ाइल और आवेदन हमेशा सुरक्षित रखने के लिए Supabase से लॉगिन करें')}</strong>
              <p>
                {t(
                  'Create an account in 10 seconds with email & password — your profile type, answers, wishlist and application status sync automatically across devices.',
                  'ईमेल और पासवर्ड से 10 सेकंड में अकाउंट बनाएँ — आपका प्रोफ़ाइल प्रकार, जवाब, विशलिस्ट और आवेदन स्थिति हर डिवाइस पर सिंक रहेगी।',
                )}
              </p>
            </div>
            <div className="sw-auth-banner-btns">
              <button type="button" className="sw-apply-btn" onClick={() => setAuthModalMode('signup')}>
                <UserPlus size={15} /> {t('Create Account', 'अकाउंट बनाएँ')}
              </button>
              <button type="button" className="sw-wish-btn" onClick={() => setAuthModalMode('login')}>
                <LogIn size={15} /> {t('Login', 'लॉगिन करें')}
              </button>
            </div>
          </section>
        )}

        {/* STEP 1: PROFILE TYPE SELECTOR (Shown prominently if unset OR when changing type) */}
        {(profile.profile_type === 'unset' || showTypePicker) && tab === 'profile' && (
          <section className="sw-type-selector-card" aria-labelledby="sw-type-heading">
            <div className="sw-type-selector-head">
              <div>
                <span className="fs-kicker">
                  <span /> {t('STEP 1 · DECIDE YOUR PROFILE TYPE', 'चरण 1 · अपनी प्रोफ़ाइल का प्रकार चुनें')}
                </span>
                <h2 id="sw-type-heading">
                  {t('Who are you building this profile for?', 'आप किस प्रकार की प्रोफ़ाइल बनाना चाहते हैं?')}
                </h2>
                <p>
                  {t(
                    'Select your profile type below — FormSaathi will ask ONLY the questions and documents relevant to your profile type.',
                    'नीचे अपना प्रोफ़ाइल प्रकार चुनें — FormSaathi आपसे केवल उसी प्रकार से जुड़े ज़रूरी सवाल और दस्तावेज़ पूछेगा।',
                  )}
                </p>
              </div>
              {profile.profile_type !== 'unset' && (
                <button type="button" className="sw-subtle-btn" onClick={() => setShowTypePicker(false)}>
                  <X size={14} /> {t('Keep current type', 'वर्तमान प्रकार रखें')}
                </button>
              )}
            </div>

            <div className="sw-type-grid">
              {PROFILE_TYPE_CARDS.map(card => {
                const Icon = card.icon
                const selected = profile.profile_type === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={selected}
                    className={`sw-type-card ${selected ? 'active' : ''}`}
                    onClick={() => selectProfileType(card.id)}
                  >
                    <div className="sw-type-card-top">
                      <span className="sw-type-icon"><Icon size={20} /></span>
                      <b className="sw-type-qcount">
                        {card.id === 'all_rounder'
                          ? t('All goals', 'सभी लक्ष्य')
                          : t(`${card.questionCount} core questions`, `${card.questionCount} मुख्य सवाल`)}
                      </b>
                    </div>
                    <h3>{language === 'hi' ? card.hiTitle : card.enTitle}</h3>
                    <p>{language === 'hi' ? card.hiSub : card.enSub}</p>
                    <div className="sw-type-foot">
                      <span>{language === 'hi' ? card.hiSchemes : card.enSchemes}</span>
                      <ArrowRight size={15} />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Profile Status Hero Banner */}
        <section className="sw-status-card" aria-label={t('Profile status overview', 'प्रोफ़ाइल स्थिति सारांश')}>
          <div className="sw-status-head">
            <div>
              <span className="fs-kicker">
                <span />{' '}
                {activeTypeCard
                  ? `${t('PROFILE TYPE', 'प्रोफ़ाइल प्रकार')}: ${(language === 'hi' ? activeTypeCard.hiTitle : activeTypeCard.enTitle).toUpperCase()}`
                  : t('AUTOMATED SCHEME WORKFLOW', 'स्वचालित योजना वर्कफ़्लो')}
              </span>
              <h1>
                {profile.full_name.trim()
                  ? t(`${profile.full_name.trim()}’s Scheme Profile`, `${profile.full_name.trim()} की योजना प्रोफ़ाइल`)
                  : activeTypeCard
                    ? t(`${activeTypeCard.enTitle} Profile`, `${activeTypeCard.hiTitle} प्रोफ़ाइल`)
                    : t('Your Citizen Profile & Scheme Hub', 'आपकी प्रोफ़ाइल और योजना केंद्र')}
              </h1>
              <p>
                {activeTypeCard
                  ? t(
                      `Tailored for ${activeTypeCard.enTitle} — answer only the questions for ${activeTypeCard.enSchemes} and unlock 1-click Assisted Apply.`,
                      `${activeTypeCard.hiTitle} के लिए विशेष रूप से तैयार — केवल ${activeTypeCard.hiSchemes} के सवाल भरें और तुरंत पात्रता व आवेदन शीट पाएँ।`,
                    )
                  : t(
                      'Choose your profile type above — FormSaathi asks only the questions that apply to you, checks eligibility, saves your wishlist, and prepares pre-filled official application sheets.',
                      'ऊपर अपना प्रोफ़ाइल प्रकार चुनें — FormSaathi केवल आपसे जुड़े सवाल पूछता है, पात्रता जाँचता है, विशलिस्ट सहेजता है और प्री-फ़िल्ड आवेदन शीट तैयार करता है।',
                    )}
              </p>
            </div>

            <div className="sw-meter-box">
              <div className="sw-meter-top">
                <strong>{profile.profile_type === 'unset' ? '0%' : status ? `${status.completion_percent}%` : '—'}</strong>
                <span className={`sw-level-badge ${profile.profile_type === 'unset' ? 'starter' : status?.level ?? 'starter'}`}>
                  {profile.profile_type === 'unset'
                    ? t('Select profile type first', 'पहले प्रोफ़ाइल प्रकार चुनें')
                    : status?.level_label ?? t('Checking…', 'जाँच हो रही है…')}
                </span>
              </div>
              <div
                className="sw-progress-track"
                role="progressbar"
                aria-valuenow={profile.profile_type === 'unset' ? 0 : status?.completion_percent ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="sw-progress-fill"
                  style={{ width: `${profile.profile_type === 'unset' ? 0 : status?.completion_percent ?? 0}%` }}
                />
              </div>
              <small>
                {profile.profile_type === 'unset'
                  ? t('Pick one of the 4 profile types above to begin', 'शुरू करने के लिए ऊपर से कोई एक प्रोफ़ाइल प्रकार चुनें')
                  : status
                    ? t(
                        `${status.filled_count} of ${status.total_count} questions answered for your profile type`,
                        `आपके प्रोफ़ाइल प्रकार के ${status.total_count} में से ${status.filled_count} सवाल पूरे`,
                      )
                    : t('Evaluating your profile…', 'प्रोफ़ाइल का मूल्यांकन हो रहा है…')}
              </small>
            </div>
          </div>

          <div className="sw-stat-grid">
            <div className="sw-stat-tile">
              <UserCheck size={18} />
              <div>
                <strong>{status?.match_counts.match ?? 0} {t('Profile Matches', 'प्रोफ़ाइल मेल')}</strong>
                <span>
                  {t(
                    `${status?.match_counts.near_miss ?? 0} near miss · ${status?.match_counts.needs_info ?? 0} need info`,
                    `${status?.match_counts.near_miss ?? 0} एक शर्त बाकी · ${status?.match_counts.needs_info ?? 0} जानकारी बाकी`,
                  )}
                </span>
              </div>
            </div>

            <div className="sw-stat-tile">
              <FileCheck2 size={18} />
              <div>
                <strong>
                  {status ? `${status.docs_ready_count} / ${status.docs_total_count}` : '0 / 0'} {t('Docs Ready', 'दस्तावेज़ तैयार')}
                </strong>
                <span>{t('Relevant certificates marked ready', 'संबंधित प्रमाणपत्र तैयार चिह्नित')}</span>
              </div>
            </div>

            <button type="button" className="sw-stat-tile sw-stat-clickable" onClick={() => switchTab('wishlist')}>
              <BookmarkCheck size={18} />
              <div>
                <strong>{appEntries.length} {t('Saved in Wishlist', 'विशलिस्ट में सहेजी गईं')}</strong>
                <span>
                  {t(
                    `${appliedCount} applied / active on portal →`,
                    `${appliedCount} पोर्टल पर आवेदित / सक्रिय →`,
                  )}
                </span>
              </div>
            </button>
          </div>

          {profile.profile_type !== 'unset' && status && (status.missing_fields.length > 0 ? (
            <div className="sw-missing-bar">
              <span>{t('Remaining questions for your profile type:', 'आपके प्रोफ़ाइल प्रकार के बाकी सवाल:')}</span>
              <div className="sw-missing-chips">
                {status.missing_fields.slice(0, 6).map(f => (
                  <button key={f.key} type="button" onClick={() => focusField(f.key)}>
                    + {f.label}
                  </button>
                ))}
                {status.missing_fields.length > 6 && (
                  <small>+{status.missing_fields.length - 6} {t('more', 'और')}</small>
                )}
              </div>
            </div>
          ) : (
            <div className="sw-ready-banner">
              <CheckCircle2 size={17} />
              <span>
                {t(
                  'Your profile is 100% complete! Open Assisted Apply on any matched scheme below to use your pre-filled form values.',
                  'आपकी प्रोफ़ाइल 100% पूरी है! किसी भी मेल खाती योजना पर "सहायता-प्राप्त आवेदन" खोलकर प्री-फ़िल्ड विवरण उपयोग करें।',
                )}
              </span>
            </div>
          ))}
        </section>

        {/* Main Workspace Tabs */}
        <div className="sw-tabs" role="tablist" aria-label={t('Scheme workflow sections', 'योजना वर्कफ़्लो अनुभाग')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            className={tab === 'profile' ? 'active' : ''}
            onClick={() => switchTab('profile')}
          >
            <UserCheck size={16} />
            {t('My Profile & Suggested Schemes', 'मेरी प्रोफ़ाइल और सुझाई गई योजनाएँ')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wishlist'}
            className={tab === 'wishlist' ? 'active' : ''}
            onClick={() => switchTab('wishlist')}
          >
            <Bookmark size={16} />
            {t('Wishlist & Application Status', 'विशलिस्ट और आवेदन स्थिति')}
            <b className="sw-tab-count">{appEntries.length}</b>
          </button>
        </div>

        {tab === 'profile' ? (
          profile.profile_type === 'unset' ? (
            <div className="sw-empty-card">
              <h3>{t('Choose your Profile Type above to view your questions', 'सवाल देखने के लिए ऊपर अपनी प्रोफ़ाइल का प्रकार चुनें')}</h3>
              <p>
                {t(
                  'Pick School Student, College Student, Business / Entrepreneur, or Multi-Goal Family above — we will immediately load only the questions for your chosen type.',
                  'ऊपर से स्कूली छात्र, कॉलेज छात्र, व्यवसायी / उद्यमी, या बहु-उद्देश्यीय प्रोफ़ाइल चुनें — हम तुरंत केवल आपके प्रकार के सवाल दिखाएँगे।',
                )}
              </p>
              <div className="sw-quick-type-row">
                {PROFILE_TYPE_CARDS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="sw-wish-btn"
                    onClick={() => selectProfileType(c.id)}
                  >
                    {language === 'hi' ? c.hiTitle : c.enTitle}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sw-workspace">
              {/* LEFT: Type-Scoped Profile Questions */}
              <section className="sw-form-panel" aria-labelledby="sw-profile-heading">
                <div className="sw-panel-head">
                  <div>
                    <h2 id="sw-profile-heading">
                      {activeTypeCard
                        ? t(`${activeTypeCard.enTitle} Questions`, `${activeTypeCard.hiTitle} के सवाल`)
                        : t('Profile Questions', 'प्रोफ़ाइल सवाल')}
                    </h2>
                    <small>{t('Auto-saved locally & synced to Supabase when logged in.', 'बदलाव अपने आप सहेजे जाते हैं और लॉगिन पर Supabase में सिंक होते हैं।')}</small>
                  </div>
                  <div className="sw-sample-actions">
                    <button
                      type="button"
                      className="sw-subtle-btn"
                      onClick={() => setShowTypePicker(s => !s)}
                    >
                      <RefreshCw size={13} /> {t('Change Type', 'प्रकार बदलें')}
                    </button>
                    <button
                      type="button"
                      className="sw-subtle-btn"
                      onClick={() => {
                        const sampleKey: SelectableProfileType =
                          profile.profile_type === 'unset' ? 'college_student' : profile.profile_type
                        updateProfile(() => SAMPLE_PROFILES[sampleKey])
                        toast.push(
                          t('Filled sample answers for your selected profile type!', 'आपके चुने हुए प्रोफ़ाइल प्रकार का उदाहरण डेटा भरा गया!'),
                          'info',
                        )
                      }}
                    >
                      {t('Fill sample', 'उदाहरण भरें')}
                    </button>
                    <button
                      type="button"
                      className="sw-subtle-btn"
                      onClick={() => {
                        updateProfile(prev => ({
                          ...EMPTY_SCHEME_PROFILE,
                          profile_type: prev.profile_type,
                          goals: goalsForProfileType(prev.profile_type),
                        }))
                        toast.push(t('Cleared answers for this profile type.', 'इस प्रोफ़ाइल प्रकार के जवाब साफ़ किए गए।'), 'info')
                      }}
                    >
                      <RotateCcw size={13} /> {t('Clear', 'साफ़ करें')}
                    </button>
                  </div>
                </div>

                {/* Quick Profile Type Switcher Pills */}
                <div className="sw-group">
                  <div className="sw-group-title">{t('Selected Profile Type', 'चुना गया प्रोफ़ाइल प्रकार')}</div>
                  <div className="sw-goal-toggles">
                    {PROFILE_TYPE_CARDS.map(c => {
                      const Icon = c.icon
                      const active = profile.profile_type === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={active}
                          className={active ? 'active' : ''}
                          onClick={() => selectProfileType(c.id)}
                        >
                          <Icon size={15} /> {language === 'hi' ? c.hiTitle : c.enTitle}
                        </button>
                      )
                    })}
                  </div>

                  {profile.profile_type === 'all_rounder' && (
                    <div className="sw-subgoal-box">
                      <span>{t('Active categories in Multi-Goal mode:', 'बहु-उद्देश्यीय मोड में सक्रिय श्रेणियाँ:')}</span>
                      <div className="sw-goal-toggles">
                        {(['school', 'college', 'business'] as SchemeGoal[]).map(g => {
                          const Icon = goalIcons[g]
                          const active = profile.goals.includes(g)
                          return (
                            <button
                              key={g}
                              type="button"
                              aria-pressed={active}
                              className={active ? 'active' : ''}
                              onClick={() => toggleGoal(g)}
                            >
                              <Icon size={15} /> {goalNames[g]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Basic Applicant Details */}
                <div className="sw-group">
                  <div className="sw-group-title">
                    {t('1. Basic Applicant Details (for Pre-filled Apply)', '1. बुनियादी आवेदक विवरण (आवेदन शीट हेतु)')}
                  </div>
                  <div className="sw-field-grid">
                    <label className="sw-field" htmlFor="sw-field-full_name">
                      <span>{t('Full Name', 'पूरा नाम')}</span>
                      <input
                        id="sw-field-full_name"
                        type="text"
                        maxLength={120}
                        placeholder={t('e.g. Riya Verma', 'जैसे रिया वर्मा')}
                        value={profile.full_name}
                        onChange={e => updateProfile(p => ({ ...p, full_name: e.target.value }))}
                      />
                    </label>

                    <label className="sw-field" htmlFor="sw-field-state">
                      <span>{t('State / Union Territory', 'राज्य / केंद्र शासित प्रदेश')}</span>
                      <select
                        id="sw-field-state"
                        value={profile.state}
                        onChange={e => updateProfile(p => ({ ...p, state: e.target.value }))}
                      >
                        <option value="">{t('Select state…', 'राज्य चुनें…')}</option>
                        {INDIAN_STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {showAgeField && (
                    <div className="sw-field" id="sw-field-age-wrap">
                      <label htmlFor="sw-field-age">{t('Applicant Age (in years)', 'आवेदक की उम्र (वर्षों में)')}</label>
                      <NumberOrUnknownField
                        id="sw-field-age"
                        value={profile.age}
                        min={1}
                        max={120}
                        placeholder={t('Enter age (18+ for business schemes)', 'उम्र दर्ज करें (व्यवसाय हेतु 18+)')}
                        presets={[[18, '18'], [22, '22'], [26, '26'], [32, '32']]}
                        onChange={v => updateProfile(p => ({ ...p, age: v }))}
                        lang={language}
                      />
                    </div>
                  )}

                  <div className="sw-field" id="sw-field-category">
                    <span>{t('Social Category', 'सामाजिक श्रेणी')}</span>
                    <div className="sw-pills" role="group">
                      {([
                        ['general', t('General', 'सामान्य')],
                        ['obc', 'OBC'],
                        ['sc', 'SC'],
                        ['st', 'ST'],
                        ['ews', 'EWS'],
                        ['unknown', t('Not sure', 'पता नहीं')],
                      ] as [SchemeCategory, string][]).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          className={profile.category === k ? 'active' : ''}
                          aria-pressed={profile.category === k}
                          onClick={() => updateProfile(p => ({ ...p, category: k }))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showIncomeField && (
                    <div className="sw-field">
                      <label htmlFor="sw-field-income">
                        {activeGoals.includes('school') && !activeGoals.includes('college')
                          ? t('Annual Parental Income (₹)', 'वार्षिक अभिभावक आय (₹)')
                          : t('Annual Family Income (₹)', 'वार्षिक पारिवारिक आय (₹)')}
                      </label>
                      <NumberOrUnknownField
                        id="sw-field-income"
                        value={profile.income}
                        min={0}
                        max={100000000}
                        placeholder={t('e.g. 300000', 'जैसे 300000')}
                        presets={[
                          [200000, '₹2L'],
                          [320000, '₹3.2L'],
                          [450000, '₹4.5L'],
                          [600000, '₹6L'],
                        ]}
                        onChange={v => updateProfile(p => ({ ...p, income: v }))}
                        lang={language}
                      />
                    </div>
                  )}
                </div>

                {/* School Student Questions ONLY */}
                {activeGoals.includes('school') && (
                  <div className="sw-group">
                    <div className="sw-group-title">
                      {t('2. School Student Questions (NMMSS)', '2. स्कूली छात्र पात्रता सवाल (NMMSS)')}
                    </div>

                    <div className="sw-field">
                      <label htmlFor="sw-field-grade">{t('Which class are you studying in now? (1–12)', 'अभी आप किस कक्षा में पढ़ रहे हैं? (1–12)')}</label>
                      <NumberOrUnknownField
                        id="sw-field-grade"
                        value={profile.grade}
                        min={1}
                        max={12}
                        placeholder={t('e.g. 8', 'जैसे 8')}
                        presets={[[7, 'Class 7'], [8, 'Class 8'], [9, 'Class 9'], [10, 'Class 10']]}
                        onChange={v => updateProfile(p => ({ ...p, grade: v }))}
                        lang={language}
                      />
                    </div>

                    <div className="sw-field" id="sw-field-school_type">
                      <span>{t('Do you attend a government, government-aided or local body school?', 'क्या आप सरकारी, सहायता प्राप्त या स्थानीय निकाय के स्कूल में पढ़ते हैं?')}</span>
                      <YesNoPills value={profile.school_type} onChange={v => updateProfile(p => ({ ...p, school_type: v }))} lang={language} />
                    </div>

                    <div className="sw-field" id="sw-field-marks">
                      <span>{t('Did you score at least 55% in Class 7 (50% for SC/ST)?', 'क्या कक्षा 7 में कम से कम 55% अंक थे (SC/ST के लिए 50%)?')}</span>
                      <YesNoPills value={profile.marks} onChange={v => updateProfile(p => ({ ...p, marks: v }))} lang={language} />
                    </div>
                  </div>
                )}

                {/* College Student Questions ONLY */}
                {activeGoals.includes('college') && (
                  <div className="sw-group">
                    <div className="sw-group-title">
                      {t('2. College Student Questions (PM-USP CSSS)', '2. कॉलेज छात्र पात्रता सवाल (PM-USP CSSS)')}
                    </div>

                    <div className="sw-field" id="sw-field-percentile">
                      <span>{t('Are you above the 80th percentile in your Class 12 board & stream?', 'क्या आप अपने कक्षा 12 बोर्ड और संकाय में 80वें पर्सेंटाइल से ऊपर हैं?')}</span>
                      <YesNoPills value={profile.percentile} onChange={v => updateProfile(p => ({ ...p, percentile: v }))} lang={language} />
                    </div>

                    <div className="sw-field" id="sw-field-regular">
                      <span>{t('Are you pursuing a regular degree course (not diploma or distance)?', 'क्या आप नियमित डिग्री पाठ्यक्रम में हैं (डिप्लोमा या दूरस्थ शिक्षा नहीं)?')}</span>
                      <YesNoPills value={profile.regular} onChange={v => updateProfile(p => ({ ...p, regular: v }))} lang={language} />
                    </div>

                    <div className="sw-field" id="sw-field-gap">
                      <span>{t('Did you take a gap year after Class 12 before starting your degree?', 'क्या कक्षा 12 के बाद डिग्री शुरू करने से पहले अंतराल लिया?')}</span>
                      <YesNoPills value={profile.gap} onChange={v => updateProfile(p => ({ ...p, gap: v }))} lang={language} />
                    </div>

                    <div className="sw-field" id="sw-field-aid">
                      <span>{t('Are you receiving any other scholarship or fee reimbursement?', 'क्या आपको कोई अन्य छात्रवृत्ति या शुल्क प्रतिपूर्ति मिल रही है?')}</span>
                      <YesNoPills value={profile.aid} onChange={v => updateProfile(p => ({ ...p, aid: v }))} lang={language} />
                    </div>

                    {profile.profile_type === 'college_student' && (
                      <div className="sw-career-tip">
                        <GraduationCap size={16} />
                        <span>
                          {t('Also looking for internships or campus placements?', 'इंटर्नशिप या कैंपस प्लेसमेंट भी खोज रहे हैं?')}{' '}
                          <a href="/?view=careers">{t('Open Career Portal →', 'करियर पोर्टल खोलें →')}</a>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Business / Entrepreneur Questions ONLY */}
                {activeGoals.includes('business') && (
                  <div className="sw-group">
                    <div className="sw-group-title">
                      {t('2. Business / Entrepreneur Questions (PMEGP & MUDRA)', '2. व्यवसाय और उद्यमी सवाल (PMEGP और MUDRA)')}
                    </div>

                    <div className="sw-field" id="sw-field-stage">
                      <span>{t('Is this a new or existing business?', 'यह नया व्यवसाय है या पहले से चल रहा है?')}</span>
                      <div className="sw-pills" role="group">
                        {([
                          ['new', t('New business', 'नया व्यवसाय')],
                          ['existing', t('Existing business', 'मौजूदा व्यवसाय')],
                          ['unknown', t('Not sure', 'पता नहीं')],
                        ] as [SchemeProfile['stage'], string][]).map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            className={profile.stage === k ? 'active' : ''}
                            aria-pressed={profile.stage === k}
                            onClick={() => updateProfile(p => ({ ...p, stage: k }))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sw-field" id="sw-field-sector">
                      <span>{t('What kind of business sector is it?', 'आपका व्यवसाय किस क्षेत्र का है?')}</span>
                      <div className="sw-pills" role="group">
                        {([
                          ['manufacturing', t('Manufacturing', 'विनिर्माण')],
                          ['service', t('Services', 'सेवाएँ')],
                          ['trade', t('Trading', 'व्यापार')],
                          ['other', t('Other', 'अन्य')],
                          ['unknown', t('Not sure', 'पता नहीं')],
                        ] as [SchemeProfile['sector'], string][]).map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            className={profile.sector === k ? 'active' : ''}
                            aria-pressed={profile.sector === k}
                            onClick={() => updateProfile(p => ({ ...p, sector: k }))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sw-field">
                      <label htmlFor="sw-field-budget">{t('Total Project Cost in ₹', 'परियोजना की कुल लागत (₹)')}</label>
                      <NumberOrUnknownField
                        id="sw-field-budget"
                        value={profile.budget}
                        min={1}
                        max={100000000}
                        placeholder={t('e.g. 800000', 'जैसे 800000')}
                        presets={[
                          [300000, '₹3L'],
                          [1000000, '₹10L'],
                          [2000000, '₹20L'],
                          [4000000, '₹40L'],
                        ]}
                        onChange={v => updateProfile(p => ({ ...p, budget: v }))}
                        lang={language}
                      />
                    </div>

                    <div className="sw-field">
                      <label htmlFor="sw-field-loan">{t('Loan Amount Needed in ₹', 'आवश्यक ऋण राशि (₹)')}</label>
                      <NumberOrUnknownField
                        id="sw-field-loan"
                        value={profile.loan}
                        min={1}
                        max={100000000}
                        placeholder={t('e.g. 450000', 'जैसे 450000')}
                        presets={[
                          [50000, '₹50K (Shishu)'],
                          [400000, '₹4L (Kishore)'],
                          [900000, '₹9L (Tarun)'],
                          [1500000, '₹15L (Tarun+)'],
                        ]}
                        onChange={v => updateProfile(p => ({ ...p, loan: v }))}
                        lang={language}
                      />
                    </div>

                    {showEighthField && (
                      <div className="sw-field" id="sw-field-eighth">
                        <span>{t('Have you passed Class 8? (required above ₹10L manufacturing / ₹5L service)', 'क्या आपने कक्षा 8 पास की है? (बड़ी परियोजना हेतु आवश्यक)')}</span>
                        <YesNoPills value={profile.eighth} onChange={v => updateProfile(p => ({ ...p, eighth: v }))} lang={language} />
                      </div>
                    )}

                    <div className="sw-field" id="sw-field-subsidy">
                      <span>{t('Has this unit already received a government subsidy?', 'क्या इस इकाई को पहले सरकारी सब्सिडी मिली है?')}</span>
                      <YesNoPills value={profile.subsidy} onChange={v => updateProfile(p => ({ ...p, subsidy: v }))} lang={language} />
                    </div>

                    {showTarunPlusField && (
                      <div className="sw-field" id="sw-field-repaid">
                        <span>{t('Have you successfully repaid a previous MUDRA Tarun loan? (for ₹10L–₹20L Tarun Plus)', 'क्या पिछला मुद्रा तरुण ऋण सफलतापूर्वक चुकाया है? (₹10L–₹20L तरुण प्लस हेतु)')}</span>
                        <YesNoPills value={profile.repaid} onChange={v => updateProfile(p => ({ ...p, repaid: v }))} lang={language} />
                      </div>
                    )}
                  </div>
                )}

                {/* Scoped Document Readiness Checklist */}
                <div className="sw-group">
                  <div className="sw-group-title">
                    {t('3. Documents for Your Profile Type', '3. आपके प्रोफ़ाइल प्रकार के आवश्यक दस्तावेज़')}
                  </div>
                  <div className="sw-doc-list">
                    {relevantDocs.map(dk => {
                      const checked = profile.documents.includes(dk)
                      const label = matchData?.doc_labels?.[dk] ?? dk
                      return (
                        <label key={dk} className={`sw-doc-item ${checked ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDoc(dk)}
                          />
                          <span>{label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* RIGHT: Auto-Suggested Schemes for Selected Profile Type */}
              <section className="sw-results-panel" aria-labelledby="sw-matches-heading">
                <div className="sw-panel-head">
                  <div>
                    <h2 id="sw-matches-heading">
                      {t('Suggested Schemes for Your Profile', 'आपकी प्रोफ़ाइल के लिए सुझाई गई योजनाएँ')}
                      {loading && <span className="sw-updating"> · {t('Updating…', 'अपडेट हो रहा है…')}</span>}
                    </h2>
                    <small>
                      {activeTypeCard
                        ? t(
                            `Showing schemes matched for ${activeTypeCard.enTitle}.`,
                            `${activeTypeCard.hiTitle} के आधार पर स्वचालित सुझाव।`,
                          )
                        : t('Ranked automatically from your profile answers.', 'आपकी प्रोफ़ाइल के आधार पर क्रमबद्ध।')}
                    </small>
                  </div>
                  {matchData?.report && (
                    <button type="button" className="sw-subtle-btn" onClick={downloadReport}>
                      <ArrowDownToLine size={14} /> {t('Report', 'रिपोर्ट')}
                    </button>
                  )}
                </div>

                <div className="sw-filter-row">
                  <button
                    type="button"
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                  >
                    {t('All Checked', 'सभी जाँची गईं')} ({allSchemes.length})
                  </button>
                  <button
                    type="button"
                    className={filter === 'matches' ? 'active' : ''}
                    onClick={() => setFilter('matches')}
                  >
                    {t('Matches & Near-Misses', 'मेल और नज़दीकी')} (
                    {allSchemes.filter(s => s.status === 'match' || s.status === 'near_miss').length})
                  </button>
                  <button
                    type="button"
                    className={filter === 'wishlist' ? 'active' : ''}
                    onClick={() => setFilter('wishlist')}
                  >
                    {t('In Wishlist', 'विशलिस्ट में')} ({allSchemes.filter(s => Boolean(apps[s.id])).length})
                  </button>
                </div>

                {filteredSchemes.length === 0 ? (
                  <div className="sw-empty-card">
                    <p>
                      {filter === 'wishlist'
                        ? t('No schemes from this view are in your wishlist yet. Click "Save to Wishlist" on any scheme card to save it.', 'अभी इस दृश्य की कोई योजना विशलिस्ट में नहीं है।')
                        : t('No profile matches yet — complete the remaining questions on the left to unlock matching schemes.', 'अभी कोई सीधा मेल नहीं — बाईं ओर बाकी सवाल भरें।')}
                    </p>
                    {filter !== 'all' && (
                      <button type="button" className="sw-subtle-btn" onClick={() => setFilter('all')}>
                        {t('Show all checked schemes', 'सभी योजनाएँ दिखाएँ')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="sw-scheme-list">
                    {filteredSchemes.map((scheme, idx) => {
                      const saved = apps[scheme.id]
                      const readyDocs = scheme.required_documents.filter(d => d.ready).length
                      const totalDocs = scheme.required_documents.length
                      return (
                        <article key={scheme.id} className="scheme-result sw-scheme-card">
                          <div className="sw-card-badges">
                            <span className={`scheme-badge ${scheme.status}`}>
                              {idx + 1}. {matchData?.labels?.[scheme.status] ?? scheme.status}
                            </span>
                            <span className="sw-goal-chip">{goalNames[scheme.goal]}</span>
                            {saved && (
                              <span className={`sw-stage-pill ${STAGE_META[saved.stage].cls}`}>
                                {STAGE_META[saved.stage][language]}
                                {saved.applicationRef ? ` · #${saved.applicationRef}` : ''}
                              </span>
                            )}
                          </div>

                          <h3>{scheme.name}</h3>
                          <p>{scheme.benefit}</p>

                          <ul>
                            {scheme.checks.map(c => (
                              <li key={c.criterion}>
                                <span aria-hidden="true">
                                  {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '?'}
                                </span>
                                <div>
                                  <strong>
                                    {c.status === 'pass'
                                      ? t('Meets: ', 'पूरी: ')
                                      : c.status === 'fail'
                                        ? t('Required: ', 'ज़रूरी: ')
                                        : t('Confirm: ', 'जाँचें: ')}
                                  </strong>
                                  {c.criterion}
                                </div>
                              </li>
                            ))}
                          </ul>

                          <div className="sw-doc-readiness">
                            <FileCheck2 size={15} />
                            <span>
                              {t(
                                `Documents ready: ${readyDocs} of ${totalDocs}`,
                                `दस्तावेज़ तैयार: ${totalDocs} में से ${readyDocs}`,
                              )}
                            </span>
                            <small>· {scheme.portal_name}</small>
                          </div>

                          <p className="scheme-muted">{scheme.caveat}</p>

                          <div className="sw-card-actions">
                            <button
                              type="button"
                              className="sw-apply-btn"
                              onClick={() => setApplyTargetId(scheme.id)}
                            >
                              <ClipboardCheck size={16} />
                              {saved?.stage === 'applied' || saved?.stage === 'under_review' || saved?.stage === 'approved'
                                ? t('View Application & Pre-fill', 'आवेदन स्थिति और शीट देखें')
                                : t('Assisted Apply', 'सहायता-प्राप्त आवेदन')}
                            </button>

                            <button
                              type="button"
                              className={`sw-wish-btn ${saved ? 'saved' : ''}`}
                              onClick={() => toggleWishlist(scheme)}
                            >
                              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                              {saved
                                ? saved.stage === 'wishlist'
                                  ? t('Wishlisted', 'सहेजा गया')
                                  : STAGE_META[saved.stage][language]
                                : t('Save to Wishlist', 'विशलिस्ट में जोड़ें')}
                            </button>

                            <a className="sw-ext-link" href={scheme.source} target="_blank" rel="noreferrer">
                              {t('Official link', 'आधिकारिक लिंक')} <ExternalLink size={14} />
                            </a>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {profile.profile_type !== 'all_rounder' && (
                  <div className="sw-check-other-bar">
                    <Layers size={15} />
                    <span>{t('Want to check other categories too?', 'क्या अन्य श्रेणियों की योजनाएँ भी देखना चाहते हैं?')}</span>
                    <button type="button" className="sw-link-btn" onClick={() => setShowTypePicker(true)}>
                      {t('Switch or expand Profile Type →', 'प्रोफ़ाइल प्रकार बदलें →')}
                    </button>
                  </div>
                )}

                {matchData?.disclaimer && <p className="scheme-muted sw-disclaimer">{matchData.disclaimer}</p>}
              </section>
            </div>
          )
        ) : (
          /* WISHLIST & APPLICATION TRACKER TAB */
          <section className="sw-wishlist-panel" aria-labelledby="sw-wishlist-heading">
            <div className="sw-panel-head">
              <div>
                <h2 id="sw-wishlist-heading">{t('Saved Wishlist & Application Status Tracker', 'सहेजी गई विशलिस्ट और आवेदन स्थिति ट्रैकर')}</h2>
                <small>
                  {t(
                    'Track every saved scheme from wishlist to official portal submission and final approval.',
                    'विशलिस्ट से लेकर आधिकारिक पोर्टल आवेदन और स्वीकृति तक हर योजना की स्थिति ट्रैक करें।',
                  )}
                </small>
              </div>
              <button type="button" className="sw-subtle-btn" onClick={() => switchTab('profile')}>
                {t('Explore suggested schemes', 'सुझाई गई योजनाएँ देखें')} <ArrowRight size={14} />
              </button>
            </div>

            <div className="sw-filter-row">
              {([
                ['all', t('All Saved', 'सभी सहेजी गईं'), appEntries.length],
                ['wishlist', STAGE_META.wishlist[language], appEntries.filter(e => e.stage === 'wishlist').length],
                ['docs_ready', STAGE_META.docs_ready[language], appEntries.filter(e => e.stage === 'docs_ready').length],
                ['applied', STAGE_META.applied[language], appEntries.filter(e => e.stage === 'applied').length],
                ['under_review', STAGE_META.under_review[language], appEntries.filter(e => e.stage === 'under_review').length],
                ['approved', STAGE_META.approved[language], appEntries.filter(e => e.stage === 'approved').length],
              ] as ['all' | SchemeAppStage, string, number][]).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={stageFilter === key ? 'active' : ''}
                  onClick={() => setStageFilter(key)}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {filteredApps.length === 0 ? (
              <div className="sw-empty-card">
                <h3>{t('No saved schemes in this stage yet', 'इस चरण में अभी कोई सहेजी गई योजना नहीं है')}</h3>
                <p>
                  {t(
                    'Save matching schemes to your wishlist or use Assisted Apply to start tracking your official applications.',
                    'सुझाई गई योजनाओं को विशलिस्ट में जोड़ें या "सहायता-प्राप्त आवेदन" का उपयोग करके ट्रैकिंग शुरू करें।',
                  )}
                </p>
                <button type="button" className="sw-apply-btn" onClick={() => switchTab('profile')}>
                  {t('View Suggested Schemes', 'सुझाई गई योजनाएँ देखें')} <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="sw-tracker-grid">
                {filteredApps.map(entry => {
                  const liveScheme = allSchemes.find(s => s.id === entry.schemeId)
                  return (
                    <article key={entry.schemeId} className="sw-tracker-card">
                      <div className="sw-card-badges">
                        <span className={`sw-stage-pill ${STAGE_META[entry.stage].cls}`}>
                          {STAGE_META[entry.stage][language]}
                        </span>
                        <span className="sw-goal-chip">{goalNames[entry.goal]}</span>
                        {liveScheme && matchData && (
                          <span className={`scheme-badge ${liveScheme.status}`}>
                            {matchData.labels[liveScheme.status]}
                          </span>
                        )}
                      </div>

                      <h3>{entry.schemeName}</h3>
                      <p className="scheme-muted">{entry.benefit}</p>

                      <div className="sw-tracker-controls">
                        <label className="sw-field">
                          <span>{t('Application Status', 'आवेदन स्थिति')}</span>
                          <select
                            value={entry.stage}
                            onChange={e =>
                              upsertAppEntry(
                                {
                                  id: entry.schemeId,
                                  name: entry.schemeName,
                                  goal: entry.goal,
                                  source: entry.source,
                                  apply_url: entry.applyUrl,
                                  benefit: entry.benefit,
                                },
                                { stage: e.target.value as SchemeAppStage },
                              )
                            }
                          >
                            {(Object.keys(STAGE_META) as SchemeAppStage[]).map(st => (
                              <option key={st} value={st}>{STAGE_META[st][language]}</option>
                            ))}
                          </select>
                        </label>

                        <label className="sw-field">
                          <span>{t('Official Portal Reference / Application ID', 'आधिकारिक पोर्टल आवेदन / संदर्भ आईडी')}</span>
                          <input
                            type="text"
                            maxLength={80}
                            placeholder={t('e.g. NSP-2026-00419 or KVIC ID', 'जैसे NSP-2026-00419')}
                            value={entry.applicationRef}
                            onChange={e =>
                              upsertAppEntry(
                                {
                                  id: entry.schemeId,
                                  name: entry.schemeName,
                                  goal: entry.goal,
                                  source: entry.source,
                                  apply_url: entry.applyUrl,
                                  benefit: entry.benefit,
                                },
                                { applicationRef: e.target.value },
                              )
                            }
                          />
                        </label>
                      </div>

                      <label className="sw-field sw-notes-field">
                        <span>{t('Notes & Next Steps', 'नोट्स और अगला कदम')}</span>
                        <textarea
                          rows={2}
                          placeholder={t(
                            'Add deadline notes, institute verification date, or bank branch details…',
                            'अंतिम तिथि, स्कूल/कॉलेज सत्यापन या बैंक शाखा का नोट लिखें…',
                          )}
                          value={entry.notes}
                          onChange={e =>
                            upsertAppEntry(
                              {
                                id: entry.schemeId,
                                name: entry.schemeName,
                                goal: entry.goal,
                                source: entry.source,
                                apply_url: entry.applyUrl,
                                benefit: entry.benefit,
                              },
                              { notes: e.target.value },
                            )
                          }
                        />
                      </label>

                      <div className="sw-card-actions">
                        {liveScheme && (
                          <button
                            type="button"
                            className="sw-apply-btn"
                            onClick={() => setApplyTargetId(entry.schemeId)}
                          >
                            <ClipboardCheck size={15} /> {t('Open Pre-filled Apply Sheet', 'प्री-फ़िल्ड आवेदन शीट खोलें')}
                          </button>
                        )}
                        <a className="sw-wish-btn" href={entry.applyUrl} target="_blank" rel="noreferrer">
                          {t('Open Official Portal', 'आधिकारिक पोर्टल खोलें')} <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          className="sw-remove-btn"
                          onClick={() => removeAppEntry(entry.schemeId)}
                        >
                          <Trash2 size={14} /> {t('Remove', 'हटाएँ')}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <SchemeFooter language={language} />

      {/* 1-CLICK ASSISTED APPLY & STATUS MODAL */}
      {activeApplyScheme && (
        <div
          className="sw-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sw-apply-modal-title"
          onClick={e => {
            if (e.target === e.currentTarget) setApplyTargetId(null)
          }}
        >
          <div className="sw-modal">
            <div className="sw-modal-head">
              <div>
                <span className="fs-kicker">
                  <span /> {t('1-CLICK ASSISTED APPLY', '1-क्लिक सहायता-प्राप्त आवेदन')}
                </span>
                <h2 id="sw-apply-modal-title">{activeApplyScheme.name}</h2>
                <small>{activeApplyScheme.portal_name}</small>
              </div>
              <button
                type="button"
                className="sw-icon-close"
                aria-label={t('Close modal', 'बंद करें')}
                onClick={() => setApplyTargetId(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sw-modal-body">
              <div className="sw-honest-note">
                <strong>{t('How Assisted Apply works:', 'सहायता-प्राप्त आवेदन कैसे काम करता है:')}</strong>{' '}
                {t(
                  'Official government portals require personal Aadhaar/mobile OTP & CAPTCHA verification. FormSaathi has mapped your profile into the exact form fields below — copy any field in 1 click, check off your documents, launch the official portal, and mark your status right here.',
                  'आधिकारिक सरकारी पोर्टल पर व्यक्तिगत OTP और CAPTCHA सत्यापन आवश्यक होता है। FormSaathi ने आपकी प्रोफ़ाइल के सभी विवरण नीचे तैयार कर दिए हैं — 1 क्लिक में कॉपी करें, दस्तावेज़ जाँचें, आधिकारिक पोर्टल खोलें और अपनी आवेदन स्थिति यहाँ ट्रैक करें।',
                )}
              </div>

              {/* Pre-filled Form Sheet */}
              <div className="sw-modal-section">
                <div className="sw-modal-section-head">
                  <h3>{t('1. Pre-filled Application Fields (from your Profile)', '1. प्री-फ़िल्ड आवेदन विवरण (आपकी प्रोफ़ाइल से)')}</h3>
                  <div className="sw-sample-actions">
                    <button
                      type="button"
                      className="sw-subtle-btn"
                      onClick={() => {
                        const textBlock = activeApplyScheme.prefill_fields
                          .map(f => `${f.label}: ${f.value}`)
                          .join('\n')
                        void copyText('__all__', textBlock)
                      }}
                    >
                      <Copy size={13} />{' '}
                      {copiedKey === '__all__' ? t('Copied all ✓', 'सब कॉपी हुआ ✓') : t('Copy all', 'सभी कॉपी करें')}
                    </button>
                    <button
                      type="button"
                      className="sw-subtle-btn"
                      onClick={() => downloadPacket(activeApplyScheme)}
                    >
                      <ArrowDownToLine size={13} /> {t('Download packet', 'पैकेट डाउनलोड करें')}
                    </button>
                  </div>
                </div>

                <div className="sw-prefill-table">
                  {activeApplyScheme.prefill_fields.map(f => (
                    <div key={f.key} className={`sw-prefill-row ${f.ready ? '' : 'missing'}`}>
                      <div className="sw-prefill-meta">
                        <span>{f.label}</span>
                        <strong>{f.value}</strong>
                      </div>
                      {f.ready ? (
                        <button
                          type="button"
                          className="sw-copy-btn"
                          onClick={() => void copyText(f.key, f.value)}
                        >
                          {copiedKey === f.key ? <Check size={14} /> : <Copy size={14} />}
                          {copiedKey === f.key ? t('Copied', 'कॉपी हुआ') : t('Copy', 'कॉपी')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sw-fill-btn"
                          onClick={() => {
                            setApplyTargetId(null)
                            focusField(f.key)
                          }}
                        >
                          {t('Fill in Profile', 'प्रोफ़ाइल में भरें')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Document Checklist */}
              <div className="sw-modal-section">
                <h3>{t('2. Required Documents Checklist', '2. आवश्यक दस्तावेज़ जाँच सूची')}</h3>
                <div className="sw-doc-list">
                  {activeApplyScheme.required_documents.map(doc => (
                    <label key={doc.id} className={`sw-doc-item ${doc.ready ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={doc.ready}
                        onChange={() => toggleDoc(doc.id)}
                      />
                      <span>{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Official Portal Steps */}
              <div className="sw-modal-section">
                <h3>{t('3. Submit on Official Portal & Track Status', '3. आधिकारिक पोर्टल पर जमा करें और स्थिति सहेजें')}</h3>
                <ol className="sw-steps-list">
                  {activeApplyScheme.apply_steps.map(s => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>

                <div className="sw-modal-tracker">
                  <label className="sw-field">
                    <span>{t('Application Status', 'आवेदन स्थिति')}</span>
                    <select
                      value={apps[activeApplyScheme.id]?.stage ?? 'wishlist'}
                      onChange={e =>
                        upsertAppEntry(activeApplyScheme, { stage: e.target.value as SchemeAppStage })
                      }
                    >
                      {(Object.keys(STAGE_META) as SchemeAppStage[]).map(st => (
                        <option key={st} value={st}>{STAGE_META[st][language]}</option>
                      ))}
                    </select>
                  </label>

                  <label className="sw-field">
                    <span>{t('Official Application / Reference ID (optional)', 'आधिकारिक आवेदन / संदर्भ आईडी (वैकल्पिक)')}</span>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder={t('Paste ID after submitting on portal…', 'पोर्टल पर सबमिट करने के बाद आईडी यहाँ सहेजें…')}
                      value={apps[activeApplyScheme.id]?.applicationRef ?? ''}
                      onChange={e =>
                        upsertAppEntry(activeApplyScheme, { applicationRef: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="sw-modal-foot">
              <a
                className="sw-apply-btn"
                href={activeApplyScheme.apply_url}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (!apps[activeApplyScheme.id]) {
                    upsertAppEntry(activeApplyScheme, {
                      stage: activeApplyScheme.required_documents.every(d => d.ready) ? 'docs_ready' : 'wishlist',
                    })
                  }
                }}
              >
                {t(`Open ${activeApplyScheme.portal_name}`, `${activeApplyScheme.portal_name} खोलें`)}{' '}
                <ExternalLink size={15} />
              </a>

              <button
                type="button"
                className="sw-mark-applied-btn"
                onClick={() => {
                  upsertAppEntry(activeApplyScheme, { stage: 'applied' })
                  toast.push(
                    t(
                      `Marked "${activeApplyScheme.name}" as Applied! Track it anytime in Wishlist & Status.`,
                      `"${activeApplyScheme.name}" को आवेदित चिह्नित किया गया!`,
                    ),
                    'success',
                  )
                  setApplyTargetId(null)
                }}
              >
                <CheckCircle2 size={16} /> {t('Mark as Applied', 'आवेदित चिह्नित करें')}
              </button>
            </div>
          </div>
        </div>
      )}

      {authModalMode && (
        <SchemeAuthModal
          initialMode={authModalMode}
          language={language}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(chosenType?: SelectableProfileType) => {
            if (chosenType) selectProfileType(chosenType)
          }}
        />
      )}
    </div>
  )
}
