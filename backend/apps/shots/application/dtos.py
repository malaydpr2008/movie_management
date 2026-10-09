from dataclasses import dataclass, field
from typing import Optional, List, Any
import uuid

@dataclass(frozen=True)
class TakeDTO:
    id: uuid.UUID
    shot_id: uuid.UUID
    take_number: int
    is_circle_take: bool
    duration_seconds: Optional[int]
    director_notes: str
    created_at: Any

@dataclass(frozen=True)
class ShotDTO:
    id: uuid.UUID
    setup_id: uuid.UUID
    shot_code: str
    shot_size: str
    lens: Optional[str]
    description: str
    vfx_required: bool
    created_at: Any
    takes: List[TakeDTO] = field(default_factory=list)

@dataclass(frozen=True)
class CameraSetupDTO:
    id: uuid.UUID
    scene_id: uuid.UUID
    setup_code: str
    camera_movement: str
    equipment_notes: str
    created_at: Any
    shots: List[ShotDTO] = field(default_factory=list)

@dataclass(frozen=True)
class SceneCoverageDTO:
    scene_id: uuid.UUID
    setups: List[CameraSetupDTO] = field(default_factory=list)

@dataclass(frozen=True)
class CreateSetupCommand:
    scene_id: uuid.UUID
    setup_code: str
    camera_movement: str
    equipment_notes: str = ""

@dataclass(frozen=True)
class CreateShotCommand:
    setup_id: uuid.UUID
    shot_code: str
    shot_size: str
    lens: Optional[str] = None
    description: str = ""
    vfx_required: bool = False

@dataclass(frozen=True)
class CreateTakeCommand:
    shot_id: uuid.UUID
    take_number: int
    is_circle_take: bool = False
    duration_seconds: Optional[int] = None
    director_notes: str = ""

@dataclass(frozen=True)
class VfxShotDTO:
    id: uuid.UUID
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int
    vendor_name: str

@dataclass(frozen=True)
class CreateVfxShotCommand:
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int = 0
    vendor_name: str = ""

@dataclass(frozen=True)
class UpdateVfxShotCommand:
    vfx_id: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    frame_count: Optional[int] = None
    vendor_name: Optional[str] = None
