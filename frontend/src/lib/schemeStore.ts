import { supabase } from './supabase'

export type SchemeGoal = 'business' | 'college' | 'school'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type SchemeCategory = 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'unknown'
export type SchemeDocKey =
  | 'identity_address'
  | 'bank_passbook'
  | 'income_certificate'
  | 'marksheets'
  | 'bonafide_admission'
  | 'business_plan'
  | 'category_certificate'

export type SchemeAppStage =
  | 'wishlist'
  | 'docs_ready'
  | 'applied'
  | 'under_review'
  | 'approved'
  | 'rejected'

export interface SchemeProfile {
  full_name: string
  state: string
  category: SchemeCategory
  goals: SchemeGoal[]
  age: number | 'unknown'
  income: number | 'unknown'
  stage: 'new' | 'existing' | 'unknown'
  sector: 'manufacturing' | 'service' | 'trade' | 'other' | 'unknown'
  budget: number | 'unknown'
  loan: number | 'unknown'
  repaid: YesNoUnknown
  eighth: YesNoUnknown
  subsidy: YesNoUnknown
  percentile: YesNoUnknown
  regular: YesNoUnknown
  gap: YesNoUnknown
  aid: YesNoUnknown
  grade: number | 'unknown'
  school_type: YesNoUnknown
  marks: YesNoUnknown
  documents: SchemeDocKey[]
}

export interface SchemeApplicationEntry {
  schemeId: string
  schemeName: string
  goal: SchemeGoal
  source: string
  applyUrl: string
  benefit: string
  stage: SchemeAppStage
  applicationRef: string
  notes: string
  appliedAt: string | null
  updatedAt: string
}

export interface SchemeCheckItem {
  status: 'pass' | 'fail' | 'unknown'
  criterion: string
}

export interface SchemeDocItem {
  id: SchemeDocKey
  label: string
  ready: boolean
}

export interface SchemePrefillField {
  key: string
  label: string
  value: string
  ready: boolean
}

export interface MatchedScheme {
  id: string
  goal: SchemeGoal
  name: string
  portal_name: string
  source: string
  apply_url: string
  benefit: string
  status: 'match' | 'near_miss' | 'needs_info' | 'not_matched'
  checks: SchemeCheckItem[]
  caveat: string
  required_documents: SchemeDocItem[]
  prefill_fields: SchemePrefillField[]
  apply_steps: string[]
}

export interface SchemeProfileStatus {
  completion_percent: number
  filled_count: number
  total_count: number
  level: 'starter' | 'in_progress' | 'ready'
  level_label: string
  missing_fields: { key: string; label: string }[]
  docs_ready_count: number
  docs_total_count: number
  active_goals: SchemeGoal[]
  match_counts: Record<'match' | 'near_miss' | 'needs_info' | 'not_matched', number>
}

export interface ProfileMatchResponse {
  profile_status: SchemeProfileStatus
  results: MatchedScheme[]
  date: string
  disclaimer: string
  labels: Record<MatchedScheme['status'], string>
  doc_labels: Record<SchemeDocKey, string>
  report: string
}

export const PROFILE_STORAGE_KEY = 'fs-scheme-profile-v1'
export const APPS_STORAGE_KEY = 'fs-scheme-apps-v1'
export const SCHEME_STORAGE_EVENT = 'fs-scheme-storage-change'

export const EMPTY_SCHEME_PROFILE: SchemeProfile = {
  full_name: '',
  state: '',
  category: 'unknown',
  goals: ['business', 'college', 'school'],
  age: 'unknown',
  income: 'unknown',
  stage: 'unknown',
  sector: 'unknown',
  budget: 'unknown',
  loan: 'unknown',
  repaid: 'unknown',
  eighth: 'unknown',
  subsidy: 'unknown',
  percentile: 'unknown',
  regular: 'unknown',
  gap: 'unknown',
  aid: 'unknown',
  grade: 'unknown',
  school_type: 'unknown',
  marks: 'unknown',
  documents: [],
}

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SCHEME_STORAGE_EVENT))
  }
}

export function loadLocalSchemeProfile(): SchemeProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return EMPTY_SCHEME_PROFILE
    const parsed = JSON.parse(raw) as Partial<SchemeProfile>
    return {
      ...EMPTY_SCHEME_PROFILE,
      ...parsed,
      goals: Array.isArray(parsed.goals) && parsed.goals.length > 0
        ? (parsed.goals.filter(g => g === 'business' || g === 'college' || g === 'school') as SchemeGoal[])
        : EMPTY_SCHEME_PROFILE.goals,
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    }
  } catch {
    return EMPTY_SCHEME_PROFILE
  }
}

export function saveLocalSchemeProfile(profile: SchemeProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    notifyChange()
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export function loadLocalSchemeApps(): Record<string, SchemeApplicationEntry> {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SchemeApplicationEntry>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveLocalSchemeApps(apps: Record<string, SchemeApplicationEntry>): void {
  try {
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps))
    notifyChange()
  } catch {
    // Ignore storage quota errors
  }
}

export function isProfilePopulated(p: SchemeProfile): boolean {
  return Boolean(
    p.full_name.trim() ||
    p.state.trim() ||
    p.category !== 'unknown' ||
    p.age !== 'unknown' ||
    p.income !== 'unknown' ||
    p.stage !== 'unknown' ||
    p.sector !== 'unknown' ||
    p.budget !== 'unknown' ||
    p.loan !== 'unknown' ||
    p.percentile !== 'unknown' ||
    p.regular !== 'unknown' ||
    p.gap !== 'unknown' ||
    p.aid !== 'unknown' ||
    p.grade !== 'unknown' ||
    p.school_type !== 'unknown' ||
    p.marks !== 'unknown' ||
    p.documents.length > 0
  )
}

export function mergeInterviewAnswersIntoProfile(
  current: SchemeProfile,
  answers: Record<string, string | number>,
): SchemeProfile {
  const next: SchemeProfile = { ...current }
  const goal = answers.goal
  if (goal === 'business' || goal === 'college' || goal === 'school') {
    next.goals = Array.from(new Set<SchemeGoal>([goal, ...current.goals]))
  }
  const intField = (k: 'age' | 'income' | 'budget' | 'loan' | 'grade') => {
    const v = answers[k]
    if (typeof v === 'number') next[k] = v
  }
  const ynField = (k: 'repaid' | 'eighth' | 'subsidy' | 'percentile' | 'regular' | 'gap' | 'aid' | 'school_type' | 'marks') => {
    const v = answers[k]
    if (v === 'yes' || v === 'no') next[k] = v
  }
  intField('age')
  intField('income')
  intField('budget')
  intField('loan')
  intField('grade')
  ynField('repaid')
  ynField('eighth')
  ynField('subsidy')
  ynField('percentile')
  ynField('regular')
  ynField('gap')
  ynField('aid')
  ynField('school_type')
  ynField('marks')
  if (answers.stage === 'new' || answers.stage === 'existing') next.stage = answers.stage
  if (answers.sector === 'manufacturing' || answers.sector === 'service' || answers.sector === 'trade' || answers.sector === 'other') {
    next.sector = answers.sector
  }
  return next
}

// ---------- Best-effort Supabase Cloud Sync ----------

export async function pushCloudSchemeProfile(uid: string, profile: SchemeProfile): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('scheme_profiles').upsert({
    user_id: uid,
    profile_data: profile,
    updated_at: new Date().toISOString(),
  })
  if (error) console.warn('scheme profile cloud sync failed:', error.message)
}

export async function pullCloudSchemeProfile(uid: string): Promise<SchemeProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('scheme_profiles')
    .select('profile_data')
    .eq('user_id', uid)
    .maybeSingle()
  if (error || !data?.profile_data) return null
  const cloud = data.profile_data as Partial<SchemeProfile>
  return {
    ...EMPTY_SCHEME_PROFILE,
    ...cloud,
    goals: Array.isArray(cloud.goals) && cloud.goals.length > 0
      ? (cloud.goals.filter(g => g === 'business' || g === 'college' || g === 'school') as SchemeGoal[])
      : EMPTY_SCHEME_PROFILE.goals,
    documents: Array.isArray(cloud.documents) ? cloud.documents : [],
  }
}

export async function upsertCloudSchemeApp(uid: string, entry: SchemeApplicationEntry): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('scheme_applications').upsert({
    user_id: uid,
    scheme_id: entry.schemeId,
    stage: entry.stage,
    application_ref: entry.applicationRef,
    notes: entry.notes,
    snapshot: entry,
    applied_at: entry.appliedAt,
    updated_at: entry.updatedAt,
  })
  if (error) console.warn('scheme application cloud sync failed:', error.message)
}

export async function deleteCloudSchemeApp(uid: string, schemeId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('scheme_applications')
    .delete()
    .eq('user_id', uid)
    .eq('scheme_id', schemeId)
  if (error) console.warn('scheme application cloud delete failed:', error.message)
}

export async function pullCloudSchemeApps(uid: string): Promise<Record<string, SchemeApplicationEntry>> {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('scheme_applications')
    .select('scheme_id,stage,application_ref,notes,snapshot,applied_at,updated_at')
    .eq('user_id', uid)
  if (error || !data) return {}
  const out: Record<string, SchemeApplicationEntry> = {}
  for (const row of data as Array<{
    scheme_id: string
    stage: SchemeAppStage
    application_ref: string
    notes: string
    snapshot: Partial<SchemeApplicationEntry> | null
    applied_at: string | null
    updated_at: string
  }>) {
    const snap = row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {}
    out[row.scheme_id] = {
      schemeId: row.scheme_id,
      schemeName: snap.schemeName || row.scheme_id.toUpperCase(),
      goal: snap.goal || 'business',
      source: snap.source || 'https://www.india.gov.in/',
      applyUrl: snap.applyUrl || snap.source || 'https://www.india.gov.in/',
      benefit: snap.benefit || '',
      stage: row.stage,
      applicationRef: row.application_ref || '',
      notes: row.notes || '',
      appliedAt: row.applied_at,
      updatedAt: row.updated_at,
    }
  }
  return out
}

export function currentIsoTimestamp(): string {
  return new Date().toISOString()
}

export function buildApplicationPacketText(
  scheme: MatchedScheme,
  entry: SchemeApplicationEntry | undefined,
  lang: 'en' | 'hi',
): string {
  const hi = lang === 'hi'
  const lines = [
    hi ? `FormSaathi · सहायता-प्राप्त आवेदन पैकेट` : `FormSaathi · Assisted Application Packet`,
    `${scheme.name}`,
    `${hi ? 'आधिकारिक पोर्टल' : 'Official Portal'}: ${scheme.portal_name} (${scheme.apply_url})`,
    `${hi ? 'स्थिति' : 'Application Status'}: ${entry?.stage ?? 'wishlist'}${entry?.applicationRef ? ` · ID: ${entry.applicationRef}` : ''}`,
    '',
    hi ? '--- प्री-फ़िल्ड प्रोफ़ाइल विवरण (आधिकारिक फ़ॉर्म में भरने हेतु) ---' : '--- Pre-filled Profile Fields (copy into official portal) ---',
    ...scheme.prefill_fields.map(f => `• ${f.label}: ${f.value}`),
    '',
    hi ? '--- आवश्यक दस्तावेज़ जाँच सूची ---' : '--- Required Document Checklist ---',
    ...scheme.required_documents.map(d => `[${d.ready ? '✓' : ' '}] ${d.label}`),
    '',
    hi ? '--- आधिकारिक पोर्टल आवेदन चरण ---' : '--- Official Portal Submission Steps ---',
    ...scheme.apply_steps.map((s, idx) => `${idx + 1}. ${s}`),
    '',
    scheme.caveat,
  ]
  return lines.join('\n') + '\n'
}
