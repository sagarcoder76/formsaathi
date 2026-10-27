// Pure, deterministic analytics over the student's own tracker data.
// No data is ever invented: empty inputs produce zeroed stats and empty lists.
import type { Opportunity, Stage, TrackerEntry } from '../types'

export interface FunnelStage { stage: Stage; label: string; count: number }
export interface RateStat { label: string; value: number | null; hint: string }
export interface MonthBucket { month: string; label: string; count: number }
export interface TokenBucket { token: string; count: number }
export interface DeadlineRow { job: Opportunity; daysLeft: number }

export interface Insights {
  total: number
  funnel: FunnelStage[]
  rates: RateStat[]
  activity: MonthBucket[]
  topSkills: TokenBucket[]
  topLocations: TokenBucket[]
  upcomingDeadlines: DeadlineRow[]
}

const STAGE_ORDER: Stage[] = ['saved', 'applied', 'interview', 'offer', 'rejected']
const STAGE_LABELS: Record<Stage, string> = {
  saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected',
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pct(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100)
}

function topTokens(values: string[], limit: number): TokenBucket[] {
  const counts = new Map<string, number>()
  for (const v of values) {
    const key = v.trim()
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
    .slice(0, limit)
}

export function computeInsights(entries: TrackerEntry[], now = new Date()): Insights {
  const total = entries.length
  const byStage = new Map<Stage, number>(STAGE_ORDER.map(s => [s, 0]))
  for (const e of entries) byStage.set(e.stage, (byStage.get(e.stage) ?? 0) + 1)

  const funnel: FunnelStage[] = STAGE_ORDER.map(stage => ({
    stage, label: STAGE_LABELS[stage], count: byStage.get(stage) ?? 0,
  }))

  const appliedLike = (byStage.get('applied') ?? 0) + (byStage.get('interview') ?? 0)
    + (byStage.get('offer') ?? 0) + (byStage.get('rejected') ?? 0)
  const progressed = (byStage.get('interview') ?? 0) + (byStage.get('offer') ?? 0)
  const decided = (byStage.get('offer') ?? 0) + (byStage.get('rejected') ?? 0)

  const rates: RateStat[] = [
    { label: 'Applied rate', value: pct(appliedLike, total), hint: 'Applied, interview, offer or rejected out of all saved listings' },
    { label: 'Interview rate', value: pct(progressed, appliedLike), hint: 'Reached interview or offer out of active applications' },
    { label: 'Offer rate', value: pct(byStage.get('offer') ?? 0, decided), hint: 'Offers out of applications with a final outcome' },
  ]

  // Pipeline activity: tracker rows last updated per month (last 6 months, oldest first).
  const buckets = new Map<string, number>()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  for (const e of entries) {
    const d = new Date(e.updatedAt)
    if (Number.isNaN(d.getTime()) || d < cutoff) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const activity: MonthBucket[] = []
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    activity.push({ month: key, label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, count: buckets.get(key) ?? 0 })
  }

  const skills = entries.flatMap(e => e.job.skills ?? [])
  const locations = entries.map(e => e.job.location ?? '').filter(Boolean)

  // Upcoming deadlines: future or due-soon dates from saved/tracked listings, nearest first.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const upcomingDeadlines = entries.reduce<DeadlineRow[]>((acc, e) => {
    if (!e.job.deadline) return acc
    const d = new Date(`${e.job.deadline}T00:00:00`)
    if (Number.isNaN(d.getTime())) return acc
    const daysLeft = Math.round((d.getTime() - today.getTime()) / 86_400_000)
    if (daysLeft >= 0) acc.push({ job: e.job, daysLeft })
    return acc
  }, []).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8)

  return {
    total,
    funnel,
    rates,
    activity,
    topSkills: topTokens(skills, 8),
    topLocations: topTokens(locations, 6),
    upcomingDeadlines,
  }
}
