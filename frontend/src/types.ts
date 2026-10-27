export interface Opportunity{
  id:string
  title:string
  category:string              // Internship | Placement
  role:string|null
  organizer:string|null        // hiring company
  description:string|null
  skills:string[]
  eligibility:string[]
  location:string|null
  mode:string|null
  deadline:string|null
  deadline_text:string|null
  deadline_status:string       // open | closing_soon | expired | unknown
  compensation:string|null     // stipend / salary / CTC as stated on source
  compensation_min:number|null // INR per month, normalized (annual CTC / 12)
  compensation_max:number|null
  compensation_kind:string|null // paid | unpaid | null
  fraud_flags:string[]
  official_url:string|null
  application_url:string|null
  source_url:string
  source_type:string
  source_domain?:string|null
  last_checked_at:string
  verification_status:string
  also_found_on:string[]
  link_health?:string          // unknown | ok | broken (Phase 2 link re-checks)
}
export interface CloudNotification{id:string;title:string;body:string|null;link:string|null;read:boolean;created_at:string}
export interface SavedSearch{id:string;query:string;category:string|null;role:string|null;skill:string|null;location:string|null;mode:string|null;deadline:string|null;comp_band:string|null;created_at:string}
export interface ResearchResponse{opportunities:Opportunity[];stats:Record<string,number>;cached:boolean;demo_mode:boolean;warnings:string[]}

export type View='home'|'jobs'|'saved'|'tracker'|'companies'

export type Stage='saved'|'applied'|'interview'|'offer'|'rejected'
export interface TrackerEntry{job:Opportunity;stage:Stage;notes:string;updatedAt:string}
export interface StudentProfile{skills:string[];batch:string;degree:string;locations:string[];modes:string[];filled:boolean}
export interface ReportRecord{reason:string;at:string}
