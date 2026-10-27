import type { StudentProfile } from '../types'
import { SKILLS, ROLE_PATTERNS, CITY_ALIASES, DEGREE_PATTERNS } from './dictionaries'

export const MAX_RESUME_MB = 5
export interface ParsedResume {
  skills: string[]
  role: string | null
  degree: string
  batch: string
  locations: string[]
  textLength: number
  warnings: string[]
}

// Heavy parsers are imported dynamically so they only download when a student actually uploads.
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_RESUME_MB * 1024 * 1024) {
    throw new Error(`File is too large — please upload a resume under ${MAX_RESUME_MB} MB.`)
  }
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')
  const isTxt = file.type.startsWith('text/') || name.endsWith('.txt')

  if (isPdf) {
    const [pdfjs, workerMod] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default
    const buffer = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buffer, useSystemFonts: true }).promise
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '))
    }
    const text = pages.join('\n').replace(/[ \t]+/g, ' ').trim()
    if (!text || text.length < 30) {
      throw new Error('No readable text found — this looks like a scanned/image PDF. Please upload a text-based PDF, DOCX or TXT version.')
    }
    return text
  }
  if (isDocx) {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    const text = (result.value || '').trim()
    if (!text) throw new Error('Could not read any text from this Word document. Try exporting it as PDF.')
    return text
  }
  if (isTxt) return (await file.text()).trim()
  throw new Error('Unsupported file type. Please upload a PDF, DOCX or TXT resume.')
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wordHit = (haystack: string, phrase: string) =>
  phrase.includes(' ') ? haystack.includes(phrase) : new RegExp(`(?<![a-z0-9+#])${escapeRe(phrase)}(?![a-z0-9+#])`).test(haystack)

export function detectResumeRole(text: string): string | null {
  const low = text.toLowerCase()
  const header = low.slice(0, 500) // titles/objectives usually lead the resume
  for (const scope of [header, low]) {
    for (const { label, patterns } of ROLE_PATTERNS) {
      if (patterns.some((p) => wordHit(scope, p))) return label
    }
  }
  return null
}

export function detectResumeSkills(text: string, limit = 12): string[] {
  const low = text.toLowerCase()
  const found: string[] = []
  for (const skill of SKILLS) {
    if (wordHit(low, skill) && !found.includes(skill)) found.push(skill)
    if (found.length >= limit) break
  }
  return found
}

export function detectResumeCities(text: string, limit = 3): string[] {
  const low = text.toLowerCase()
  const hits: string[] = []
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (new RegExp(`(?<![a-z])${escapeRe(alias)}(?![a-z])`).test(low) && !hits.includes(canonical)) hits.push(canonical)
    if (hits.length >= limit) break
  }
  return hits
}

export function detectBatchYear(text: string): string {
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]))
  const currentYear = new Date().getFullYear()
  const plausible = years.filter((y) => y >= currentYear - 4 && y <= currentYear + 6)
  return plausible.length ? String(Math.max(...plausible)) : ''
}

export function detectDegree(text: string): string {
  const low = text.toLowerCase()
  for (const { label, patterns } of DEGREE_PATTERNS) {
    if (patterns.test(low)) return label
  }
  return ''
}

export function parseResume(text: string): ParsedResume {
  const warnings: string[] = []
  const skills = detectResumeSkills(text)
  const role = detectResumeRole(text)
  const locations = detectResumeCities(text)
  const batch = detectBatchYear(text)
  const degree = detectDegree(text)
  if (!skills.length) warnings.push('No known skills were detected — add them manually below.')
  if (!role) warnings.push('Target role could not be inferred — pick one or rely on your skills.')
  return { skills, role, degree, batch, locations, textLength: text.length, warnings }
}

export const resumeToProfile = (parsed: ParsedResume): StudentProfile => ({
  skills: parsed.skills,
  batch: parsed.batch,
  degree: parsed.degree,
  locations: parsed.locations,
  modes: [],
  filled: parsed.skills.length > 0 || parsed.locations.length > 0,
})

export function buildResumeQuery(profile: StudentProfile, role: string | null, category: string): string {
  const parts: string[] = []
  if (role) parts.push(role)
  parts.push(...profile.skills.slice(0, 3))
  if (profile.locations.length) parts.push(profile.locations[0])
  if (category === 'Internship') parts.push('internship')
  if (category === 'Placement') parts.push('full time placement job')
  parts.push('India')
  // de-duplicate while preserving order
  return [...new Set(parts.filter(Boolean))].join(' ')
}
