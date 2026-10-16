from pydantic import BaseModel, Field
from typing import Optional, List, Literal

Category = Literal["Scholarship","Internship","Hackathon","Coding Competition","Innovation Challenge","Fellowship","Workshop","Conference","Free Course","Government Programme","Job","Other"]
Mode = Optional[Literal["Online","Remote","Hybrid","In-person","Unknown"]]

class Opportunity(BaseModel):
    id: str
    title: str
    category: str = "Other"
    organizer: Optional[str] = None
    description: Optional[str] = None
    eligibility: List[str] = []
    location: Optional[str] = None
    mode: Optional[str] = "Unknown"
    deadline: Optional[str] = None  # ISO date or None
    deadline_text: Optional[str] = None
    deadline_status: Literal["open","expired","unknown","closing_soon"] = "unknown"
    fees: Optional[str] = None
    benefits: Optional[str] = None
    official_url: Optional[str] = None
    application_url: Optional[str] = None
    source_url: str
    source_type: Literal["official","secondary","demo","unknown"] = "unknown"
    source_domain: Optional[str] = None
    last_checked_at: str
    verification_status: Literal["verified_official","secondary_source","needs_review","demo"] = "needs_review"
    also_found_on: List[str] = []

class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=300)
    category: Optional[str] = None
    location: Optional[str] = None
    mode: Optional[str] = None
    max_fetch: int = Field(default=5, ge=1, le=8)
    use_agent_fallback: bool = False

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    category: Optional[str] = None
    location: Optional[str] = None
    mode: Optional[str] = None
    deadline: Optional[str] = None  # all|upcoming|unknown
    fee: Optional[str] = None  # all|free|paid
    sort: str = "relevance"
    opportunities: List[Opportunity] = []  # client passes current results to filter locally on server

class ResearchResponse(BaseModel):
    opportunities: List[Opportunity]
    stats: dict
    cached: bool = False
    demo_mode: bool = False
    warnings: List[str] = []
