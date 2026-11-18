import { ArrowRight, BookOpen, BriefcaseBusiness, Cloud, GraduationCap, MessageCircle, ShieldCheck } from 'lucide-react'
import { PROFILE_TYPE_CARDS } from './lib/profileTypes'
import { SchemeFooter, SchemeHeader } from './SchemeInfo'
import { useAuth } from './lib/auth'
import './schemes.css'

const assistant = '/?view=assistant'

export default function SchemeHome() {
  const { session, userEmail } = useAuth()

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
              <p>See why a scheme matches your profile, what’s missing, and save everything securely with Supabase login.</p>
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
            </div>
            {!session && (
              <a className="fs-secondary" href="/?view=login&mode=signup">
                Create Supabase Account <ArrowRight size={16} />
              </a>
            )}
          </div>

          <div className="sw-type-grid">
            {PROFILE_TYPE_CARDS.map(card => {
              const Icon = card.icon
              return (
                <a key={card.id} className="sw-type-card" href={`/?view=profile&type=${card.id}`}>
                  <div className="sw-type-card-top">
                    <span className="sw-type-icon"><Icon size={20} /></span>
                    <b className="sw-type-qcount">
                      {card.id === 'all_rounder' ? 'All goals' : `${card.questionCount} core questions`}
                    </b>
                  </div>
                  <h3>{card.enTitle}</h3>
                  <p>{card.enSub}</p>
                  <div className="sw-type-foot">
                    <span>{card.enSchemes}</span>
                    <ArrowRight size={15} />
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        <section className="fs-start" aria-label="Start your eligibility check">
          <div>
            <h2>Ready to check your eligibility?</h2>
            <p>Choose your profile type for tailored questions, wishlist & assisted apply — or chat step by step in English or Hindi.</p>
          </div>
          <div className="fs-start-actions">
            <a className="fs-primary" href="/?view=profile">Choose profile & auto-match <ArrowRight size={19} /></a>
            <a className="fs-secondary" href={assistant}>Chat with assistant</a>
          </div>
        </section>

        <section className="fs-how" aria-labelledby="fs-how-title">
          <span className="fs-kicker">HOW IT WORKS</span>
          <h2 id="fs-how-title">From your profile type to a clear next step.</h2>
          <div className="fs-steps">
            {[
              ['Select your profile type', 'Choose School Student, College Student, or Business / Entrepreneur so we ask only your 4–6 relevant questions.'],
              ['Understand your matches', 'See which requirements you meet, what’s missing, and sync your profile & wishlist via Supabase login.'],
              ['Take the next step', 'Copy pre-filled application values, verify documents, and submit on the official government portal.'],
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
