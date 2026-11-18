import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, Bookmark, BookmarkCheck, BookOpen, BriefcaseBusiness, CheckCircle2,
  ClipboardCheck, Cloud, ExternalLink, GraduationCap, MessageCircle, ShieldCheck, Sparkles, Star,
} from 'lucide-react'
import {
  PROFILE_TYPE_CARDS,
  SCHEME_RECOMMENDATION_CATALOG,
  getSuggestedSchemePreviewsForType,
  type RecommendedSchemePreview,
  type SelectableProfileType,
} from './lib/profileTypes'
import { SchemeFooter, SchemeHeader } from './SchemeInfo'
import { useAuth } from './lib/auth'
import { useToast } from './components/Toast'
import {
  SCHEME_STORAGE_EVENT,
  currentIsoTimestamp,
  deleteCloudSchemeApp,
  goalsForProfileType,
  isProfilePopulated,
  loadLocalSchemeApps,
  loadLocalSchemeProfile,
  saveLocalSchemeApps,
  upsertCloudSchemeApp,
  type MatchedScheme,
  type ProfileMatchResponse,
  type SchemeApplicationEntry,
} from './lib/schemeStore'
import './schemes.css'

const assistant = '/?view=assistant'

export default function SchemeHome() {
  const { session, userEmail } = useAuth()
  const uid = session?.user.id ?? null
  const toast = useToast()

  const [savedProfile, setSavedProfile] = useState(loadLocalSchemeProfile)
  const [selectedType, setSelectedType] = useState<SelectableProfileType>(() => {
    const cur = loadLocalSchemeProfile().profile_type
    return cur === 'unset' ? 'entrepreneur' : cur
  })
  const [apps, setApps] = useState<Record<string, SchemeApplicationEntry>>(loadLocalSchemeApps)
  const [liveMatch, setLiveMatch] = useState<ProfileMatchResponse | null>(null)

  useEffect(() => {
    const syncLocal = () => {
      setSavedProfile(loadLocalSchemeProfile())
      setApps(loadLocalSchemeApps())
    }
    window.addEventListener(SCHEME_STORAGE_EVENT, syncLocal)
    window.addEventListener('storage', syncLocal)
    return () => {
      window.removeEventListener(SCHEME_STORAGE_EVENT, syncLocal)
      window.removeEventListener('storage', syncLocal)
    }
  }, [])

  const hasSavedAnswers = useMemo(() => isProfilePopulated(savedProfile), [savedProfile])

  // Fetch live evaluation for the selected profile type when saved answers exist
  useEffect(() => {
    const controller = new AbortController()
    const previewProfile = {
      ...savedProfile,
      profile_type: selectedType,
      goals: goalsForProfileType(selectedType, savedProfile.goals),
    }
    ;(async () => {
      try {
        const res = await fetch('/api/schemes/profile-match', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'en', profile: previewProfile }),
        })
        if (!res.ok) return
        const data = (await res.json()) as ProfileMatchResponse
        if (!controller.signal.aborted) setLiveMatch(data)
      } catch {
        // Fallback previews stay visible if backend isn't reachable
      }
    })()
    return () => controller.abort()
  }, [savedProfile, selectedType])

  const selectedCard = useMemo(
    () => PROFILE_TYPE_CARDS.find(c => c.id === selectedType) ?? PROFILE_TYPE_CARDS[0],
    [selectedType],
  )

  const curatedList = useMemo(
    () => getSuggestedSchemePreviewsForType(selectedType),
    [selectedType],
  )

  const liveById = useMemo(() => {
    const map: Record<string, MatchedScheme> = {}
    for (const r of liveMatch?.results ?? []) map[r.id] = r
    return map
  }, [liveMatch])

  // Order suggestions: if user has live matches, put matched schemes first while preserving curated priority
  const orderedSuggestions = useMemo(() => {
    if (!hasSavedAnswers || !liveMatch) return curatedList
    const rankOrder: Record<MatchedScheme['status'], number> = {
      match: 0,
      near_miss: 1,
      needs_info: 2,
      not_matched: 3,
    }
    return [...curatedList].sort((a, b) => {
      const sa = liveById[a.id]?.status
      const sb = liveById[b.id]?.status
      if (sa && sb && rankOrder[sa] !== rankOrder[sb]) {
        return rankOrder[sa] - rankOrder[sb]
      }
      return Number(b.topPick) - Number(a.topPick)
    })
  }, [curatedList, hasSavedAnswers, liveMatch, liveById])

  const toggleWishlist = (item: RecommendedSchemePreview) => {
    const existing = apps[item.id]
    if (existing && existing.stage === 'wishlist') {
      const next = { ...apps }
      delete next[item.id]
      setApps(next)
      saveLocalSchemeApps(next)
      if (uid) void deleteCloudSchemeApp(uid, item.id)
      toast.push(`Removed "${item.enName}" from Wishlist.`, 'info')
      return
    }
    const now = currentIsoTimestamp()
    const entry: SchemeApplicationEntry = {
      schemeId: item.id,
      schemeName: item.enName,
      goal: item.goal,
      source: item.source,
      applyUrl: item.applyUrl,
      benefit: item.enBenefit,
      stage: existing?.stage ?? 'wishlist',
      applicationRef: existing?.applicationRef ?? '',
      notes: existing?.notes ?? '',
      appliedAt: existing?.appliedAt ?? null,
      updatedAt: now,
    }
    const next = { ...apps, [item.id]: entry }
    setApps(next)
    saveLocalSchemeApps(next)
    if (uid) void upsertCloudSchemeApp(uid, entry)
    toast.push(`Saved "${item.enName}" to your Wishlist!`, 'success')
  }

  return (
    <div className="fs-home">
      <SchemeHeader active="home" />
      <main className="fs-container">
        <section className="fs-hero">
          <div>
            <span className="fs-kicker"><span /> GOVERNMENT SCHEME DISCOVERY</span>
            <h1>Discover government schemes <em>you may qualify for.</em></h1>
            <p>
              Choose your profile type and answer only the questions relevant to you. FormSaathi checks your eligibility against selected Indian government schemes and prepares pre-filled application sheets.
            </p>
            <div className="fs-intro-note">
              <strong>Know where you stand before you apply.</strong>
              <p>See which scheme you should apply to first, why it matches your profile, and save everything securely with Supabase login.</p>
            </div>
            <div className="fs-meta">
              {session ? (
                <>
                  <Cloud size={17} /> Signed in as {userEmail} · Cloud profile sync active
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Works instantly · Optional Supabase login to sync across devices
                </>
              )}
            </div>
          </div>

          <div className="fs-hero-visual">
            <img
              className="fs-hero-image"
              src="/images/scheme-home.jpg"
              alt="A student and a small-business owner reviewing a document together"
              fetchPriority="high"
            />
            <div className="fs-preview" aria-label="Example of the scheme assistant">
              <div className="fs-preview-head">
                <span><MessageCircle size={19} /></span>
                <div>
                  <strong>Scheme assistant</strong>
                  <small>English · हिन्दी</small>
                </div>
                <b>PREVIEW</b>
              </div>
              <div className="fs-preview-body">
                <a href={`${assistant}&goal=business`}><BriefcaseBusiness size={19} /> Start or grow a business <ArrowRight size={16} /></a>
                <a href={`${assistant}&goal=college`}><GraduationCap size={19} /> Pay for college <ArrowRight size={16} /></a>
                <a href={`${assistant}&goal=school`}><BookOpen size={19} /> Continue school education <ArrowRight size={16} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="fs-home-types" aria-labelledby="fs-types-title">
          <div className="fs-home-types-head">
            <div>
              <span className="fs-kicker"><span /> CHOOSE YOUR PROFILE TYPE</span>
              <h2 id="fs-types-title">Pick your profile type — answer only your questions.</h2>
              <p className="fs-home-types-sub">
                Click any profile type below to instantly see the top scheme you should apply to first, or open your tailored questions.
              </p>
            </div>
            {!session && (
              <a className="fs-secondary" href="/?view=login&mode=signup">
                Create Supabase Account <ArrowRight size={16} />
              </a>
            )}
          </div>

          <div className="sw-type-grid" role="tablist" aria-label="Profile types">
            {PROFILE_TYPE_CARDS.map(card => {
              const Icon = card.icon
              const isSelected = selectedType === card.id
              return (
                <div
                  key={card.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`sw-type-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedType(card.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedType(card.id)
                    }
                  }}
                >
                  <div className="sw-type-card-top">
                    <span className="sw-type-icon"><Icon size={20} /></span>
                    <b className="sw-type-qcount">
                      {card.id === 'all_rounder' ? 'All goals' : `${card.questionCount} core questions`}
                    </b>
                  </div>
                  <h3>{card.enTitle}</h3>
                  <p>{card.enSub}</p>
                  <div className="sw-type-foot">
                    <span>{isSelected ? '✓ Viewing suggestions below' : 'Preview top schemes'}</span>
                    <a
                      className="sw-type-open-link"
                      href={`/?view=profile&type=${card.id}`}
                      onClick={e => e.stopPropagation()}
                    >
                      Open <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* SCHEME SUGGESTIONS RIGHT BELOW "PICK YOUR PROFILE TYPE" */}
          <div className="fs-type-suggestions" aria-live="polite">
            <div className="fs-suggest-head">
              <div>
                <span className="fs-kicker">
                  <Sparkles size={13} /> RECOMMENDED SCHEMES FOR {selectedCard.enTitle.toUpperCase()}
                </span>
                <h3>
                  {orderedSuggestions.length > 1
                    ? `Which scheme should you apply to first as a ${selectedCard.enTitle}?`
                    : `Top scheme you should apply to as a ${selectedCard.enTitle}`}
                </h3>
              </div>
              <a className="sw-apply-btn" href={`/?view=profile&type=${selectedType}`}>
                Answer {selectedCard.id === 'all_rounder' ? 'Profile' : `${selectedCard.questionCount}`} Questions <ArrowRight size={15} />
              </a>
            </div>

            <div className={`fs-suggest-grid ${orderedSuggestions.length === 1 ? 'single' : ''}`}>
              {orderedSuggestions.map((item, idx) => {
                const live = liveById[item.id]
                const isTopMustApply = idx === 0
                const saved = apps[item.id]
                const catMeta = SCHEME_RECOMMENDATION_CATALOG[item.id]
                return (
                  <article
                    key={item.id}
                    className={`fs-suggest-card ${isTopMustApply ? 'top-pick' : ''}`}
                  >
                    <div className="fs-suggest-badges">
                      {isTopMustApply ? (
                        <span className="fs-must-apply-badge">
                          <Star size={12} /> #1 MOST RECOMMENDED TO APPLY
                        </span>
                      ) : (
                        <span className="sw-goal-chip">#{idx + 1} Recommended Option</span>
                      )}

                      {hasSavedAnswers && live && liveMatch ? (
                        <span className={`scheme-badge ${live.status}`}>
                          {liveMatch.labels[live.status]}
                        </span>
                      ) : (
                        <span className="sw-goal-chip">{item.portalName}</span>
                      )}
                    </div>

                    <h4>{live?.name ?? item.enName}</h4>
                    <p className="fs-suggest-benefit">{live?.benefit ?? item.enBenefit}</p>

                    <div className="fs-why-apply">
                      <strong>Why you should apply to this {isTopMustApply ? 'first' : 'scheme'}:</strong>
                      <p>{catMeta.enWhyApplyFirst}</p>
                    </div>

                    <ul className="fs-suggest-highlights">
                      {hasSavedAnswers && live
                        ? live.checks.slice(0, 4).map(c => (
                            <li key={c.criterion} className={`chk-${c.status}`}>
                              <span aria-hidden="true">
                                {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '?'}
                              </span>
                              <span>{c.criterion}</span>
                            </li>
                          ))
                        : item.enHighlights.map(h => (
                            <li key={h}>
                              <CheckCircle2 size={14} />
                              <span>{h}</span>
                            </li>
                          ))}
                    </ul>

                    <div className="sw-card-actions">
                      <a
                        className="sw-apply-btn"
                        href={`/?view=profile&type=${selectedType}&apply=${item.id}`}
                      >
                        <ClipboardCheck size={15} /> Apply / Pre-fill Sheet
                      </a>

                      <a
                        className="sw-wish-btn"
                        href={`/?view=profile&type=${selectedType}`}
                      >
                        Check Eligibility
                      </a>

                      <button
                        type="button"
                        className={`sw-wish-btn ${saved ? 'saved' : ''}`}
                        onClick={() => toggleWishlist(item)}
                      >
                        {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        {saved ? 'Saved' : 'Wishlist'}
                      </button>

                      <a
                        className="sw-ext-link"
                        href={item.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official portal <ExternalLink size={13} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="fs-start" aria-label="Start your eligibility check">
          <div>
            <h2>Ready to check your exact eligibility?</h2>
            <p>Choose your profile type for tailored questions, wishlist & assisted apply — or chat step by step in English or Hindi.</p>
          </div>
          <div className="fs-start-actions">
            <a className="fs-primary" href={`/?view=profile&type=${selectedType}`}>
              Complete {selectedCard.enTitle} Profile <ArrowRight size={19} />
            </a>
            <a className="fs-secondary" href={assistant}>Chat with assistant</a>
          </div>
        </section>

        <section className="fs-how" aria-labelledby="fs-how-title">
          <span className="fs-kicker">HOW IT WORKS</span>
          <h2 id="fs-how-title">From your profile type to a clear next step.</h2>
          <div className="fs-steps">
            {[
              ['Select your profile type', 'Choose School Student, College Student, or Business / Entrepreneur so we ask only your 4–6 relevant questions.'],
              ['See top scheme suggestions', 'Instantly view the #1 scheme you should apply to first, which rules you meet, and save favorites to your Wishlist.'],
              ['Apply with pre-filled details', 'Copy pre-filled application values, verify documents, and submit on the official government portal.'],
            ].map(([title, description], i) => (
              <article key={title}>
                <span className="fs-index">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SchemeFooter />
    </div>
  )
}
