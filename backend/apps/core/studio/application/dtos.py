from dataclasses import dataclass
from typing import Optional, Any
import uuid

@dataclass(frozen=True)
class ProjectDTO:
    id: uuid.UUID
    title: str
    slug: str
    aspect_ratio: str
    target_runtime_minutes: int
    created_at: Any

@dataclass(frozen=True)
class CreateProjectCommand:
    title: str
    slug: Optional[str] = None
    status: Optional[str] = "PRE_PRODUCTION"
    aspect_ratio: str = "2.39:1"
    target_runtime_minutes: int = 120

@dataclass(frozen=True)
class CrewMemberDTO:
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    role: str
    department: str
    union_affiliation: str
    day_rate: float
    email: Optional[str]
    phone: Optional[str]
    created_at: Any

@dataclass(frozen=True)
class AddCrewMemberCommand:
    name: str
    role: str
    department: str
    union_affiliation: str = "Non-Union"
    day_rate: float = 0.00
    email: Optional[str] = None
    phone: Optional[str] = None
