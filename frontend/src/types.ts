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
  official_url:string|null
  application_url:string|null
  source_url:string
  source_type:string
  source_domain?:string|null
  last_checked_at:string
  verification_status:string
  also_found_on:string[]
}
export interface ResearchResponse{opportunities:Opportunity[];stats:Record<string,number>;cached:boolean;demo_mode:boolean;warnings:string[]}
