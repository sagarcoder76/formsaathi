import { supabase } from './supabase'

export type SchemeGoal = 'business' | 'college' | 'school'
export type SchemeProfileType =
  | 'school_student'
  | 'college_student'
  | 'entrepreneur'
  | 'all_rounder'
  | 'unset'
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
  profile_type: SchemeProfileType
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
  profile_type: SchemeProfileType
  profile_type_label: string
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

export const VALID_PROFILE_TYPES: readonly SchemeProfileType[] = [
  'school_student',
  'college_student',
  'entrepreneur',
  'all_rounder',
  'unset',
]

export function isValidProfileType(val: unknown): val is SchemeProfileType {
  return typeof val === 'string' && (VALID_PROFILE_TYPES as readonly string[]).includes(val)
}

export function goalsForProfileType(
  profileType: SchemeProfileType,
  fallback: SchemeGoal[] = ['business', 'college', 'school'],
): SchemeGoal[] {
  if (profileType === 'school_student') return ['school']
  if (profileType === 'college_student') return ['college']
  if (profileType === 'entrepreneur') return ['business']
  return fallback.length > 0 ? fallback : ['business', 'college', 'school']
}

export function docsForProfile(profile: SchemeProfile): SchemeDocKey[] {
  const activeGoals = goalsForProfileType(profile.profile_type, profile.goals)
  const docs = new Set<SchemeDocKey>(['identity_address', 'bank_passbook'])
  const reserved = profile.category === 'obc' || profile.category === 'sc' || profile.category === 'st' || profile.category === 'ews'

  if (activeGoals.includes('school') || activeGoals.includes('college')) {
    docs.add('income_certificate')
    docs.add('marksheets')
    docs.add('bonafide_admission')
  }
  if (activeGoals.includes('business')) {
    docs.add('business_plan')
    const eighthCap = profile.sector === 'manufacturing' ? 1_000_000 : 500_000
    if (typeof profile.budget === 'number' && profile.budget > eighthCap) {
      docs.add('marksheets')
    }
  }
  if (reserved) {
    docs.add('category_certificate')
  }
  return Array.from(docs)
}

export const EMPTY_SCHEME_PROFILE: SchemeProfile = {
  profile_type: 'unset',
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

export const SAMPLE_PROFILES: Record<Exclude<SchemeProfileType, 'unset'>, SchemeProfile> = {
  school_student: {
    ...EMPTY_SCHEME_PROFILE,
    profile_type: 'school_student',
    full_name: 'Ananya Kumari',
    state: 'Haryana',
    category: 'sc',
    goals: ['school'],
    grade: 8,
    income: 220000,
    school_type: 'yes',
    marks: 'yes',
    documents: [
      'identity_address',
      'bank_passbook',
      'income_certificate',
      'marksheets',
      'bonafide_admission',
      'category_certificate',
    ],
  },
  college_student: {
    ...EMPTY_SCHEME_PROFILE,
    profile_type: 'college_student',
    full_name: 'Riya Verma',
    state: 'Haryana',
    category: 'obc',
    goals: ['college'],
    age: 19,
    income: 310000,
    percentile: 'yes',
    regular: 'yes',
    gap: 'no',
    aid: 'no',
    documents: [
      'identity_address',
      'bank_passbook',
      'income_certificate',
      'marksheets',
      'bonafide_admission',
      'category_certificate',
    ],
  },
  entrepreneur: {
    ...EMPTY_SCHEME_PROFILE,
    profile_type: 'entrepreneur',
    full_name: 'Aarav Sharma',
    state: 'Haryana',
    category: 'general',
    goals: ['business'],
    age: 26,
    stage: 'new',
    sector: 'manufacturing',
    budget: 1200000,
    loan: 450000,
    eighth: 'yes',
    subsidy: 'no',
    repaid: 'no',
    documents: ['identity_address', 'bank_passbook', 'business_plan', 'marksheets'],
  },
  all_rounder: {
    ...EMPTY_SCHEME_PROFILE,
    profile_type: 'all_rounder',
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
    documents: [
      'identity_address',
      'bank_passbook',
      'income_certificate',
      'marksheets',
      'bonafide_admission',
      'business_plan',
      'category_certificate',
    ],
  },
}

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SCHEME_STORAGE_EVENT))
  }
}

function inferLegacyProfileType(parsed: Partial<SchemeProfile>, goals: SchemeGoal[]): SchemeProfileType {
  if (isValidProfileType(parsed.profile_type)) return parsed.profile_type
  const hasAnyAnswer = Boolean(
    parsed.full_name?.trim() ||
    parsed.state?.trim() ||
    (parsed.category && parsed.category !== 'unknown') ||
    (parsed.age && parsed.age !== 'unknown') ||
    (parsed.income && parsed.income !== 'unknown') ||
    (parsed.stage && parsed.stage !== 'unknown') ||
    (parsed.percentile && parsed.percentile !== 'unknown') ||
    (parsed.grade && parsed.grade !== 'unknown'),
  )
  if (!hasAnyAnswer) return 'unset'
  if (goals.length === 1) {
    if (goals[0] === 'school') return 'school_student'
    if (goals[0] === 'college') return 'college_student'
    if (goals[0] === 'business') return 'entrepreneur'
  }
  return 'all_rounder'
}

export function normalizeSchemeProfile(parsed: Partial<SchemeProfile>): SchemeProfile {
  const cleanGoals = Array.isArray(parsed.goals) && parsed.goals.length > 0
    ? (parsed.goals.filter(g => g === 'business' || g === 'college' || g === 'school') as SchemeGoal[])
    : EMPTY_SCHEME_PROFILE.goals
  const profileType = inferLegacyProfileType(parsed, cleanGoals)
  const resolvedGoals = goalsForProfileType(profileType, cleanGoals)
  return {
    ...EMPTY_SCHEME_PROFILE,
    ...parsed,
    profile_type: profileType,
    goals: resolvedGoals,
    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
  }
}

export function loadLocalSchemeProfile(): SchemeProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return EMPTY_SCHEME_PROFILE
    const parsed = JSON.parse(raw) as Partial<SchemeProfile>
    return normalizeSchemeProfile(parsed)
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
    p.profile_type !== 'unset' ||
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
    p.documents.length > 0,
  )
}

export function mergeInterviewAnswersIntoProfile(
  current: SchemeProfile,
  answers: Record<string, string | number>,
): SchemeProfile {
  const next: SchemeProfile = { ...current }
  const goal = answers.goal
  if (goal === 'business' || goal === 'college' || goal === 'school') {
    if (next.profile_type === 'unset') {
      next.profile_type =
        goal === 'school'
          ? 'school_student'
          : goal === 'college'
            ? 'college_student'
            : 'entrepreneur'
      next.goals = [goal]
    } else if (next.profile_type === 'all_rounder') {
      next.goals = Array.from(new Set<SchemeGoal>([goal, ...current.goals]))
    } else {
      const mapped = goalsForProfileType(next.profile_type, [goal])
      if (!mapped.includes(goal)) {
        next.profile_type = 'all_rounder'
        next.goals = Array.from(new Set<SchemeGoal>([goal, ...mapped]))
      }
    }
  }
  const intField = (k: 'age' | 'income' | 'budget' | 'loan' | 'grade') => {
    const v = answers[k]
    if (typeof v === 'number') next[k] = v
  }
  const ynField = (
    k: 'repaid' | 'eighth' | 'subsidy' | 'percentile' | 'regular' | 'gap' | 'aid' | 'school_type' | 'marks',
  ) => {
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
  if (
    answers.sector === 'manufacturing' ||
    answers.sector === 'service' ||
    answers.sector === 'trade' ||
    answers.sector === 'other'
  ) {
    next.sector = answers.sector
  }
  return next
}

// ---------- Supabase Cloud Sync ----------

export async function pushCloudSchemeProfile(uid: string, profile: SchemeProfile): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('scheme_profiles').upsert({
    user_id: uid,
    profile_type: profile.profile_type,
    full_name: profile.full_name.trim(),
    profile_data: profile,
    updated_at: new Date().toISOString(),
  })
  if (error) console.warn('scheme profile cloud sync failed:', error.message)
}

export async function pullCloudSchemeProfile(uid: string): Promise<SchemeProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('scheme_profiles')
    .select('profile_type,full_name,profile_data')
    .eq('user_id', uid)
    .maybeSingle()
  if (error || !data) return null
  const cloud = (data.profile_data && typeof data.profile_data === 'object' ? data.profile_data : {}) as Partial<SchemeProfile>
  const rowType = isValidProfileType(data.profile_type) && data.profile_type !== 'unset'
    ? data.profile_type
    : cloud.profile_type
  const rowName = typeof data.full_name === 'string' && data.full_name.trim()
    ? data.full_name.trim()
    : cloud.full_name
  return normalizeSchemeProfile({
    ...cloud,
    ...(rowType ? { profile_type: rowType } : {}),
    ...(rowName ? { full_name: rowName } : {}),
  })
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
