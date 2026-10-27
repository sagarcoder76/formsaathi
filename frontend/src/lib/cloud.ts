// Best-effort Supabase cloud sync. Every function swallows its own errors:
// localStorage remains the source of truth when logged out or offline.
import { supabase } from './supabase'
import type { Opportunity, TrackerEntry, StudentProfile, ReportRecord, CloudNotification, SavedSearch, NotificationPreferences, PushSubscriptionRow, ListingReport } from '../types'

const MIGRATION_FLAG = 'fs-cloud-migrated-v1'

async function userId(): Promise<string | null> {
  const { data } = (await supabase!.auth.getSession())
  return data.session?.user.id ?? null
}

// ---------- profiles ----------
export async function upsertProfile(uid: string, email: string | null, p: StudentProfile) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').upsert({
    id: uid, email, full_name: null,
    skills: p.skills, batch: p.batch || null, degree: p.degree || null,
    locations: p.locations, modes: p.modes,
  })
  if (error) console.warn('profile sync failed', error.message)
}

// ---------- saved listings / tracker ----------
export async function upsertSaved(uid: string, entry: TrackerEntry) {
  if (!supabase) return
  const { error } = await supabase.from('saved_listings').upsert({
    user_id: uid,
    opportunity_id: entry.job.id,
    stage: entry.stage,
    notes: entry.notes ?? '',
    title: entry.job.title,
    snapshot: entry.job,
  })
  if (error) console.warn('saved listing sync failed', error.message)
}

export async function deleteSaved(uid: string, opportunityId: string) {
  if (!supabase) return
  const { error } = await supabase.from('saved_listings')
    .delete().eq('user_id', uid).eq('opportunity_id', opportunityId)
  if (error) console.warn('saved listing delete failed', error.message)
}

export async function pullCloudTracker(): Promise<TrackerEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('saved_listings').select('stage,notes,updated_at,snapshot,title')
    .order('updated_at', { ascending: false })
  if (error) { console.warn('cloud tracker pull failed', error.message); return [] }
  return (data ?? [])
    .filter((r: { snapshot: unknown }) => r.snapshot && typeof r.snapshot === 'object')
    .map((r: { stage: TrackerEntry['stage']; notes: string; updated_at: string; snapshot: Opportunity }) => ({
      job: r.snapshot, stage: r.stage, notes: r.notes ?? '', updatedAt: r.updated_at,
    }))
}

// ---------- reports ----------
export async function insertReport(uid: string, job: Opportunity, reason: string) {
  if (!supabase) return
  const { error } = await supabase.from('listing_reports').insert({
    user_id: uid, opportunity_id: job.id, reason, source_url: job.source_url,
  })
  if (error) console.warn('report sync failed', error.message)
}

// ---------- saved searches ----------
export async function listSavedSearches(): Promise<SavedSearch[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('saved_searches').select('*').order('created_at', { ascending: false })
  if (error) { console.warn('saved searches pull failed', error.message); return [] }
  return (data ?? []) as SavedSearch[]
}

export async function createSavedSearch(uid: string, s: Omit<SavedSearch, 'id' | 'created_at'>) {
  if (!supabase) return null
  const { data, error } = await supabase.from('saved_searches').insert({ ...s, user_id: uid }).select('id').single()
  if (error) { console.warn('saved search create failed', error.message); return null }
  return data?.id as string | undefined
}

export async function deleteSavedSearch(uid: string, id: string) {
  if (!supabase) return
  const { error } = await supabase.from('saved_searches').delete().eq('user_id', uid).eq('id', id)
  if (error) console.warn('saved search delete failed', error.message)
}

// ---------- notifications ----------
export async function listNotifications(): Promise<CloudNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) { console.warn('notifications pull failed', error.message); return [] }
  return (data ?? []) as CloudNotification[]
}

export async function createNotification(uid: string, n: { title: string; body?: string; link?: string }) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').insert({ user_id: uid, ...n })
  if (error) console.warn('notification create failed', error.message)
}

export async function markNotificationRead(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) console.warn('notification update failed', error.message)
}

export async function markAllNotificationsRead(uid: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false)
  if (error) console.warn('notification update failed', error.message)
}

// ---------- notification preferences ----------
const PREF_COLUMNS =
  'deadline_inapp,deadline_email,deadline_push,matches_inapp,matches_email,matches_push,followup_inapp,followup_email,followup_push,health_inapp,health_email,health_push,updated_at'

export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences | null> {
  if (!supabase) return null
  const { data } = await supabase.from('notification_preferences').select(PREF_COLUMNS).eq('user_id', uid).maybeSingle()
  return (data as NotificationPreferences | null) ?? null
}

export async function upsertNotificationPreferences(uid: string, prefs: NotificationPreferences): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is unavailable right now.')
  const row = { user_id: uid, ...prefs }
  delete (row as Partial<NotificationPreferences>).updated_at
  const { error } = await supabase.from('notification_preferences').upsert(row)
  if (error) throw new Error(error.message)
}

export async function savePushSubscription(uid: string, sub: PushSubscriptionRow): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is unavailable right now.')
  // One row per endpoint: clear any stale copy first so RLS/unique conflicts never surface.
  await supabase.from('push_subscriptions').delete().eq('user_id', uid).eq('endpoint', sub.endpoint)
  const { error } = await supabase.from('push_subscriptions').insert({ user_id: uid, ...sub })
  if (error) throw new Error(error.message)
}

export async function removePushSubscription(uid: string, endpoint: string): Promise<void> {
  if (!supabase) return
  await supabase.from('push_subscriptions').delete().eq('user_id', uid).eq('endpoint', endpoint)
}

// ---------- admin / moderation (RLS: profiles.is_admin gate, enforced in Postgres) ----------
export async function getIsAdmin(uid: string): Promise<boolean> {
  if (!uid || !supabase) return false
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle()
  return Boolean(data?.is_admin)
}

export async function listReports(): Promise<ListingReport[]> {
  if (!supabase) return []
  const { data } = await supabase.from('listing_reports').select('*').order('created_at', { ascending: false })
  return (data as ListingReport[] | null) ?? []
}

export async function resolveReport(reportId: string, patch: { status: 'open' | 'resolved' }, uid: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is unavailable right now.')
  const resolved = patch.status === 'resolved'
  const { error } = await supabase.from('listing_reports').update({
    status: patch.status,
    ...(resolved ? { resolved_by: uid, resolved_at: new Date().toISOString() } : { resolved_by: null, resolved_at: null }),
  }).eq('id', reportId)
  if (error) throw new Error(error.message)
}

export async function setOpportunityHidden(opportunityId: string, hidden: boolean): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is unavailable right now.')
  const { error } = await supabase.from('opportunities').update({ hidden }).eq('id', opportunityId)
  if (error) throw new Error(error.message)
}

export async function listOpportunitiesByIds(ids: string[]): Promise<Opportunity[]> {
  if (!supabase || ids.length === 0) return []
  const { data } = await supabase.from('opportunities').select('*').in('id', ids)
  return (data as Opportunity[] | null) ?? []
}

export async function listHiddenOpportunities(): Promise<Opportunity[]> {
  if (!supabase) return []
  const { data } = await supabase.from('opportunities').select('*').eq('hidden', true).order('last_checked_at', { ascending: false })
  return (data as Opportunity[] | null) ?? []
}

// ---------- first-login migration of localStorage data ----------
export async function migrateLocalToCloud(
  tracker: Record<string, TrackerEntry>,
  reports: Record<string, ReportRecord>,
  profile: StudentProfile,
): Promise<number> {
  if (!supabase || localStorage.getItem(MIGRATION_FLAG)) return 0
  const uid = await userId()
  if (!uid) return 0
  const { data: sData } = await supabase.auth.getSession()
  const email = sData.session?.user.email ?? null

  let migrated = 0
  await upsertProfile(uid, email, profile)

  const entries = Object.values(tracker)
  for (const e of entries) {
    await upsertSaved(uid, e)
    migrated++
  }
  for (const [oppId, rec] of Object.entries(reports)) {
    // Reports reference listings by id; source URL is reconstructed if still present in the tracker.
    const job = tracker[oppId]?.job
    await insertReport(uid, job ?? ({ id: oppId, source_url: '' } as Opportunity), rec.reason)
  }

  localStorage.setItem(MIGRATION_FLAG, '1')
  return migrated
}

export function resetMigrationFlag() { localStorage.removeItem(MIGRATION_FLAG) }
