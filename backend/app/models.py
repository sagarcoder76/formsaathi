from pydantic import BaseModel, Field
from typing import Optional, List, Literal

# FormSaathi is an internship & placement portal: only these two listing types exist.
Category = Literal["Internship", "Placement"]

class Opportunity(BaseModel):
    id: str
    title: str
    category: str = "Internship"  # Internship | Placement
    role: Optional[str] = None    # e.g. "Frontend Developer", "Data Analyst"
    organizer: Optional[str] = None  # hiring company / organisation
    description: Optional[str] = None
    skills: List[str] = []
    eligibility: List[str] = []
    location: Optional[str] = None
    mode: Optional[str] = "Unknown"  # Remote | Hybrid | In-person | Online | Unknown
    deadline: Optional[str] = None   # ISO date or None (never invented)
    deadline_text: Optional[str] = None
    deadline_status: Literal["open", "expired", "unknown", "closing_soon"] = "unknown"
    compensation: Optional[str] = None  # stipend / salary / CTC, exactly as stated on the page
    # Numeric compensation normalized to INR per month (CTC/annual is divided by 12). None = not parseable.
    compensation_min: Optional[int] = None
    compensation_max: Optional[int] = None
    compensation_kind: Optional[str] = None  # paid | unpaid | None
    fraud_flags: List[str] = []  # human-readable scam/payment warnings detected on the source page
    official_url: Optional[str] = None
    application_url: Optional[str] = None
    source_url: str
    source_type: Literal["official", "secondary", "demo", "unknown"] = "unknown"
    source_domain: Optional[str] = None
    last_checked_at: str
    verification_status: Literal["verified_official", "secondary_source", "needs_review", "demo"] = "needs_review"
    also_found_on: List[str] = []
    link_health: Literal["unknown", "ok", "broken"] = "unknown"  # Phase 2 link re-checks

class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=300)
    category: Optional[str] = None  # Internship | Placement
    role: Optional[str] = None
    skills: List[str] = []
    location: Optional[str] = None
    mode: Optional[str] = None
    max_fetch: int = Field(default=5, ge=1, le=8)
    use_agent_fallback: bool = False

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    category: Optional[str] = None
    role: Optional[str] = None
    skill: Optional[str] = None
    location: Optional[str] = None
    mode: Optional[str] = None
    deadline: Optional[str] = None  # all|upcoming|unknown|expired
    comp_band: Optional[str] = None  # unpaid|0-10000|10000-25000|25000-plus (monthly INR)
    sort: str = "relevance"
    opportunities: List[Opportunity] = []  # client passes current results to filter locally on server

class ResearchResponse(BaseModel):
    opportunities: List[Opportunity]
    stats: dict
    cached: bool = False
    demo_mode: bool = False
    warnings: List[str] = []
