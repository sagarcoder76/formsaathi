import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowRight, Bookmark, BookmarkCheck, BookOpen, BriefcaseBusiness,
  Check, CheckCircle2, ClipboardCheck, Cloud, Copy, ExternalLink, FileCheck2,
  GraduationCap, Languages, LogIn, LogOut, RotateCcw, Sparkles, Trash2, UserCheck, X,
} from 'lucide-react'
import { SchemeHeader } from './SchemeInfo'
import AuthModal from './components/AuthModal'
import { useAuth } from './lib/auth'
import { useToast } from './components/Toast'
import {
  EMPTY_SCHEME_PROFILE,
  buildApplicationPacketText,
  deleteCloudSchemeApp,
  isProfilePopulated,
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

const ALL_DOCS: SchemeDocKey[] = [
  'identity_address',
  'bank_passbook',
  'income_certificate',
  'marksheets',
  'bonafide_admission',
  'business_plan',
  'category_certificate',
]

const SAMPLE_PROFILE: SchemeProfile = {
  full_name: 'Aarav Sharma',
  state: 'Haryana',
  category: 'obc',
  goals: ['college', 'business', 'school'],
  age: 20,
  income: 320000,
  stage: 'new',
  sector: 'service',
  budget: 600000,
  loan: 400000,
  repaid: 'no',
  eighth: 'yes',
  subsidy: 'no',
  percentile: 'yes',
  regular: 'yes',
  gap: 'no',
  aid: 'no',
  grade: 8,
  school_type: 'yes',
  marks: 'yes',
  documents: ['identity_address', 'bank_passbook', 'income_certificate', 'marksheets', 'bonafide_admission'],
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

export default function SchemeWorkflow({ initialTab }: { initialTab: 'profile' | 'wishlist' }) {
  const { enabled: authEnabled, session, userEmail, signOut } = useAuth()
  const uid = session?.user.id ?? null
  const toast = useToast()

  const [tab, setTab] = useState<'profile' | 'wishlist'>(initialTab)
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [profile, setProfile] = useState<SchemeProfile>(loadLocalSchemeProfile)
  const [apps, setApps] = useState<Record<string, SchemeApplicationEntry>>(loadLocalSchemeApps)
  const [matchData, setMatchData] = useState<ProfileMatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'matches' | 'wishlist'>('all')
  const [stageFilter, setStageFilter] = useState<'all' | SchemeAppStage>('all')
  const [applyTargetId, setApplyTargetId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('apply'),
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

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

  // Persist profile locally & debounce cloud sync
  const updateProfile = (updater: (prev: SchemeProfile) => SchemeProfile) => {
    setProfile(prev => {
      const next = updater(prev)
      saveLocalSchemeProfile(next)
      if (uid) {
        if (syncTimer.current) window.clearTimeout(syncTimer.current)
        syncTimer.current = window.setTimeout(() => {
          void pushCloudSchemeProfile(uid, next)
        }, 450)
      }
      return next
    })
  }

  // Cloud merge on sign-in
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
      if (cloudProfile && !isProfilePopulated(curProfile) && isProfilePopulated(cloudProfile)) {
        setProfile(cloudProfile)
        saveLocalSchemeProfile(cloudProfile)
      } else if (isProfilePopulated(curProfile)) {
        void pushCloudSchemeProfile(uid, curProfile)
      }

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
  }, [uid])

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
    setApps(prev => {
      const existing = prev[scheme.id]
      const now = new Date().toISOString()
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

  return (
    <div className="fs-home sw-page" lang={language}>
      <SchemeHeader active={tab === 'wishlist' ? 'wishlist' : 'profile'} />

      <main className="fs-container sw-main">
        {/* Top utility bar: Cloud status + Bilingual switch */}
        <div className="sw-topbar">
          <div className="sw-cloud-pill">
            <Cloud size={15} />
            {uid ? (
              <>
                <span>{t('Cloud synced', 'क्लाउड सिंक सक्रिय')} · <strong>{userEmail}</strong></span>
                <button type="button" className="sw-link-btn" onClick={() => void signOut()}>
                  <LogOut size={13} /> {t('Sign out', 'साइन आउट')}
                </button>
              </>
            ) : (
              <>
                <span>{t('Saved instantly in your browser', 'ब्राउज़र में तुरंत सुरक्षित')}</span>
                {authEnabled && (
                  <button type="button" className="sw-link-btn" onClick={() => setAuthOpen(true)}>
                    <LogIn size={13} /> {t('Sign in to sync across devices', 'क्लाउड सिंक के लिए साइन इन करें')}
                  </button>
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

        {/* Profile Status Hero Banner */}
        <section className="sw-status-card" aria-label={t('Profile status overview', 'प्रोफ़ाइल स्थिति सारांश')}>
          <div className="sw-status-head">
            <div>
              <span className="fs-kicker">
                <span /> {t('AUTOMATED SCHEME WORKFLOW', 'स्वचालित योजना वर्कफ़्लो')}
              </span>
              <h1>
                {profile.full_name.trim()
                  ? t(`${profile.full_name.trim()}’s Scheme Profile`, `${profile.full_name.trim()} की योजना प्रोफ़ाइल`)
                  : t('Your Citizen Profile & Scheme Hub', 'आपकी प्रोफ़ाइल और योजना केंद्र')}
              </h1>
              <p>
                {t(
                  'Fill your profile once — FormSaathi automatically checks your eligibility, tracks your readiness, saves your wishlist, and prepares pre-filled official application sheets.',
                  'अपनी प्रोफ़ाइल एक बार भरें — FormSaathi स्वतः पात्रता जाँचता है, प्रोफ़ाइल स्थिति दिखाता है, विशलिस्ट सहेजता है और प्री-फ़िल्ड आवेदन शीट तैयार करता है।',
                )}
              </p>
            </div>

            <div className="sw-meter-box">
              <div className="sw-meter-top">
                <strong>{status ? `${status.completion_percent}%` : '—'}</strong>
                <span className={`sw-level-badge ${status?.level ?? 'starter'}`}>
                  {status?.level_label ?? t('Checking…', 'जाँच हो रही है…')}
                </span>
              </div>
              <div className="sw-progress-track" role="progressbar" aria-valuenow={status?.completion_percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div className="sw-progress-fill" style={{ width: `${status?.completion_percent ?? 0}%` }} />
              </div>
              <small>
                {status
                  ? t(
                      `${status.filled_count} of ${status.total_count} profile answers completed`,
                      `${status.total_count} में से ${status.filled_count} प्रोफ़ाइल विवरण पूरे`,
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
                <span>{t('Required certificates marked ready', 'आवश्यक प्रमाणपत्र तैयार चिह्नित')}</span>
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

          {status && (status.missing_fields.length > 0 ? (
            <div className="sw-missing-bar">
              <span>{t('Missing to complete your profile:', 'प्रोफ़ाइल पूरी करने के लिए बाकी:')}</span>
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
          <div className="sw-workspace">
            {/* LEFT: Unified Profile Form */}
            <section className="sw-form-panel" aria-labelledby="sw-profile-heading">
              <div className="sw-panel-head">
                <div>
                  <h2 id="sw-profile-heading">{t('Profile Data & Eligibility Answers', 'प्रोफ़ाइल डेटा और पात्रता विवरण')}</h2>
                  <small>{t('Auto-saved as you type. Changes update matches instantly.', 'बदलाव अपने आप सहेजे जाते हैं और योजनाएँ तुरंत अपडेट होती हैं।')}</small>
                </div>
                <div className="sw-sample-actions">
                  <button
                    type="button"
                    className="sw-subtle-btn"
                    onClick={() => {
                      updateProfile(() => SAMPLE_PROFILE)
                      toast.push(t('Loaded sample profile so you can test instant matching.', 'त्वरित परीक्षण के लिए उदाहरण प्रोफ़ाइल भरी गई।'), 'info')
                    }}
                  >
                    {t('Fill sample', 'उदाहरण भरें')}
                  </button>
                  <button
                    type="button"
                    className="sw-subtle-btn"
                    onClick={() => {
                      updateProfile(() => EMPTY_SCHEME_PROFILE)
                      toast.push(t('Cleared profile answers.', 'प्रोफ़ाइल रीसेट की गई।'), 'info')
                    }}
                  >
                    <RotateCcw size={13} /> {t('Reset', 'रीसेट')}
                  </button>
                </div>
              </div>

              {/* Goal Toggles */}
              <div className="sw-group">
                <div className="sw-group-title">{t('1. Goals to match schemes for', '1. किन लक्ष्यों के लिए योजनाएँ खोजें')}</div>
                <div className="sw-goal-toggles">
                  {(['business', 'college', 'school'] as SchemeGoal[]).map(g => {
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
                        <Icon size={16} /> {goalNames[g]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Applicant Details */}
              <div className="sw-group">
                <div className="sw-group-title">{t('2. Applicant Details (used for Assisted Apply)', '2. आवेदक विवरण (आवेदन फ़ॉर्म में भरने हेतु)')}</div>
                <div className="sw-field-grid">
                  <label className="sw-field" htmlFor="sw-field-full_name">
                    <span>{t('Full Name', 'पूरा नाम')}</span>
                    <input
                      id="sw-field-full_name"
                      type="text"
                      maxLength={120}
                      placeholder={t('e.g. Aarav Sharma', 'जैसे आरव शर्मा')}
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

                <div className="sw-field" id="sw-field-age-wrap">
                  <label htmlFor="sw-field-age">{t('Age (in years)', 'उम्र (वर्षों में)')}</label>
                  <NumberOrUnknownField
                    id="sw-field-age"
                    value={profile.age}
                    min={1}
                    max={120}
                    placeholder={t('Enter age (1–120)', 'उम्र दर्ज करें')}
                    presets={[[14, '14'], [18, '18'], [21, '21'], [28, '28']]}
                    onChange={v => updateProfile(p => ({ ...p, age: v }))}
                    lang={language}
                  />
                </div>

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

                <div className="sw-field">
                  <label htmlFor="sw-field-income">{t('Annual Family Income (₹)', 'वार्षिक पारिवारिक आय (₹)')}</label>
                  <NumberOrUnknownField
                    id="sw-field-income"
                    value={profile.income}
                    min={0}
                    max={100000000}
                    placeholder={t('e.g. 320000', 'जैसे 320000')}
                    presets={[
                      [200000, '₹2L'],
                      [350000, '₹3.5L'],
                      [450000, '₹4.5L'],
                      [600000, '₹6L'],
                    ]}
                    onChange={v => updateProfile(p => ({ ...p, income: v }))}
                    lang={language}
                  />
                </div>
              </div>

              {/* College Section */}
              {profile.goals.includes('college') && (
                <div className="sw-group">
                  <div className="sw-group-title">{t('College Scholarship Questions (PM-USP CSSS)', 'कॉलेज छात्रवृत्ति सवाल (PM-USP CSSS)')}</div>

                  <div className="sw-field" id="sw-field-percentile">
                    <span>{t('Above 80th percentile in Class 12 board & stream?', 'कक्षा 12 बोर्ड और संकाय में 80वें पर्सेंटाइल से ऊपर?')}</span>
                    <YesNoPills value={profile.percentile} onChange={v => updateProfile(p => ({ ...p, percentile: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-regular">
                    <span>{t('Pursuing a regular degree course (not diploma or distance)?', 'नियमित डिग्री पाठ्यक्रम में हैं (डिप्लोमा या दूरस्थ नहीं)?')}</span>
                    <YesNoPills value={profile.regular} onChange={v => updateProfile(p => ({ ...p, regular: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-gap">
                    <span>{t('Took a gap after Class 12 before starting degree?', 'कक्षा 12 के बाद डिग्री से पहले अंतराल लिया?')}</span>
                    <YesNoPills value={profile.gap} onChange={v => updateProfile(p => ({ ...p, gap: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-aid">
                    <span>{t('Receiving another scholarship or fee reimbursement?', 'कोई अन्य छात्रवृत्ति या शुल्क प्रतिपूर्ति मिल रही है?')}</span>
                    <YesNoPills value={profile.aid} onChange={v => updateProfile(p => ({ ...p, aid: v }))} lang={language} />
                  </div>
                </div>
              )}

              {/* School Section */}
              {profile.goals.includes('school') && (
                <div className="sw-group">
                  <div className="sw-group-title">{t('School Scholarship Questions (NMMSS)', 'स्कूल छात्रवृत्ति सवाल (NMMSS)')}</div>

                  <div className="sw-field">
                    <label htmlFor="sw-field-grade">{t('Current Class (1–12)', 'वर्तमान कक्षा (1–12)')}</label>
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
                    <span>{t('Attend a government, government-aided or local body school?', 'सरकारी, सहायता प्राप्त या स्थानीय निकाय स्कूल में पढ़ते हैं?')}</span>
                    <YesNoPills value={profile.school_type} onChange={v => updateProfile(p => ({ ...p, school_type: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-marks">
                    <span>{t('Scored at least 55% in Class 7 (50% for SC/ST)?', 'कक्षा 7 में कम से कम 55% अंक थे (SC/ST हेतु 50%)?')}</span>
                    <YesNoPills value={profile.marks} onChange={v => updateProfile(p => ({ ...p, marks: v }))} lang={language} />
                  </div>
                </div>
              )}

              {/* Business Section */}
              {profile.goals.includes('business') && (
                <div className="sw-group">
                  <div className="sw-group-title">{t('Business & Enterprise Questions (PMEGP & MUDRA)', 'व्यवसाय और ऋण सवाल (PMEGP और MUDRA)')}</div>

                  <div className="sw-field" id="sw-field-stage">
                    <span>{t('Is this a new or existing business?', 'यह नया व्यवसाय है या मौजूदा?')}</span>
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
                    <span>{t('Business sector', 'व्यवसाय का प्रकार')}</span>
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
                      placeholder={t('e.g. 600000', 'जैसे 600000')}
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
                      placeholder={t('e.g. 400000', 'जैसे 400000')}
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

                  <div className="sw-field" id="sw-field-eighth">
                    <span>{t('Have you passed Class 8?', 'क्या आपने कक्षा 8 पास की है?')}</span>
                    <YesNoPills value={profile.eighth} onChange={v => updateProfile(p => ({ ...p, eighth: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-subsidy">
                    <span>{t('Has this unit already received a government subsidy?', 'क्या इस इकाई को पहले सरकारी सब्सिडी मिली है?')}</span>
                    <YesNoPills value={profile.subsidy} onChange={v => updateProfile(p => ({ ...p, subsidy: v }))} lang={language} />
                  </div>

                  <div className="sw-field" id="sw-field-repaid">
                    <span>{t('Successfully repaid a previous MUDRA Tarun loan? (for ₹10L–₹20L Tarun Plus)', 'क्या पिछला मुद्रा तरुण ऋण चुकाया है? (₹10L–₹20L तरुण प्लस हेतु)')}</span>
                    <YesNoPills value={profile.repaid} onChange={v => updateProfile(p => ({ ...p, repaid: v }))} lang={language} />
                  </div>
                </div>
              )}

              {/* Document Readiness Checklist */}
              <div className="sw-group">
                <div className="sw-group-title">{t('Document Readiness Checklist', 'दस्तावेज़ उपलब्धता सूची')}</div>
                <div className="sw-doc-list">
                  {ALL_DOCS.map(dk => {
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

            {/* RIGHT: Auto-Suggested Schemes */}
            <section className="sw-results-panel" aria-labelledby="sw-matches-heading">
              <div className="sw-panel-head">
                <div>
                  <h2 id="sw-matches-heading">
                    {t('Suggested Schemes for You', 'आपके लिए सुझाई गई योजनाएँ')}
                    {loading && <span className="sw-updating"> · {t('Updating…', 'अपडेट हो रहा है…')}</span>}
                  </h2>
                  <small>{t('Ranked automatically from your profile answers.', 'आपकी प्रोफ़ाइल के आधार पर क्रमबद्ध।')}</small>
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
                      ? t('No schemes from this view are in your wishlist yet. Click "Wishlist" on any scheme card to save it.', 'अभी इस दृश्य की कोई योजना विशलिस्ट में नहीं है।')
                      : t('No profile matches yet — complete the highlighted missing fields on the left to see matching schemes.', 'अभी कोई सीधा मेल नहीं — बाईं ओर बाकी विवरण भरें।')}
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

              {matchData?.disclaimer && <p className="scheme-muted sw-disclaimer">{matchData.disclaimer}</p>}
            </section>
          </div>
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

      <footer className="fs-container fs-footer">
        <strong>FormSaathi</strong>
        <a href="/?view=careers">Career tools</a>
        <span>
          <Check size={15} /> {t('Preliminary checks & assisted prep — submit final forms on official portals.', 'प्रारंभिक जाँच व आवेदन सहायता — अंतिम फ़ॉर्म आधिकारिक पोर्टल पर जमा करें।')}
        </span>
      </footer>

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

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
