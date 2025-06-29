from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class Subscriber(BaseModel):
    email: EmailStr
    keywords: List[str] = Field(min_items=1)
    digest_time_utc: str = "13:00"
    max_papers: int = Field(default=100, ge=1, le=200)
    summary_model: str = "llama-3.1-8b-instant-groq"
    tone: str = Field(default="concise", pattern="^(concise|detailed|simple)$")
    include_pdf_link: bool = True
    active: bool = True
    created_at: Optional[datetime] = None
    
class Paper(BaseModel):
    id: str
    title: str
    abstract: str
    authors: List[str]
    published: str
    url: str
    pdf_url: str
    categories: List[str]
    summary: Optional[str] = None
    keywords_matched: List[str] = Field(default_factory=list)
    
class DigestResult(BaseModel):
    subscriber_email: str
    papers_count: int
    sent_at: datetime
    success: bool
    error: Optional[str] = None