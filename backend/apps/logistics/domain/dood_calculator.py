"""
Logistics Domain - SAG Day-Out-of-Days (DOOD) calculation engine.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Set, Any
import uuid


@dataclass
class DoodCharacterResult:
    id: uuid.UUID
    cast_id_number: int
    name: str
    actor_name: str
    daily_status: Dict[str, str]
    total_work_days: int
    total_hold_days: int
    idle_ratio: float


@dataclass
class DoodShootDayResult:
    id: uuid.UUID
    day_number: int
    calendar_date: str
    total_working_actors: int


@dataclass
class DoodCalculationResult:
    shoot_days: List[DoodShootDayResult]
    characters: List[DoodCharacterResult]
    total_cast_count: int
    daily_working_summary: Dict[str, int]


def calculate_dood_matrix(
    shoot_days: List[Any],
    characters: List[Any],
    day_cast_presence: Dict[int, Set[int]]
) -> DoodCalculationResult:
    """
    Compute SAG Day-Out-of-Days (DOOD) status codes and idle ratios.
    Status codes:
      SW  = Start Work
      W   = Work
      WF  = Work Finish
      SWF = Start-Work-Finish (Single day)
      H   = Hold
      ""  = Not working / out of window
    """
    dood_characters: List[DoodCharacterResult] = []
    day_working_summary: Dict[str, int] = {str(sday.id): 0 for sday in shoot_days}

    for char in characters:
        work_day_indices: List[int] = []
        for idx in range(len(shoot_days)):
            if char.cast_id_number in day_cast_presence.get(idx, set()):
                work_day_indices.append(idx)

        daily_status: Dict[str, str] = {}
        total_work_days = 0
        total_hold_days = 0

        if not work_day_indices:
            for sday in shoot_days:
                daily_status[str(sday.id)] = ""
        elif len(work_day_indices) == 1:
            first_idx = work_day_indices[0]
            for idx, sday in enumerate(shoot_days):
                sday_id_str = str(sday.id)
                if idx == first_idx:
                    daily_status[sday_id_str] = "SWF"
                    total_work_days += 1
                    day_working_summary[sday_id_str] += 1
                else:
                    daily_status[sday_id_str] = ""
        else:
            first_idx = work_day_indices[0]
            last_idx = work_day_indices[-1]

            for idx, sday in enumerate(shoot_days):
                sday_id_str = str(sday.id)
                if idx < first_idx or idx > last_idx:
                    daily_status[sday_id_str] = ""
                elif idx == first_idx:
                    daily_status[sday_id_str] = "SW"
                    total_work_days += 1
                    day_working_summary[sday_id_str] += 1
                elif idx == last_idx:
                    daily_status[sday_id_str] = "WF"
                    total_work_days += 1
                    day_working_summary[sday_id_str] += 1
                elif idx in work_day_indices:
                    daily_status[sday_id_str] = "W"
                    total_work_days += 1
                    day_working_summary[sday_id_str] += 1
                else:
                    daily_status[sday_id_str] = "H"
                    total_hold_days += 1

        total_span = total_work_days + total_hold_days
        idle_ratio = round(total_hold_days / total_span, 2) if total_span > 0 else 0.0

        dood_characters.append(
            DoodCharacterResult(
                id=char.id,
                cast_id_number=char.cast_id_number,
                name=char.name,
                actor_name=char.actor_name or "",
                daily_status=daily_status,
                total_work_days=total_work_days,
                total_hold_days=total_hold_days,
                idle_ratio=idle_ratio
            )
        )

    dood_shoot_days: List[DoodShootDayResult] = [
        DoodShootDayResult(
            id=sday.id,
            day_number=sday.day_number,
            calendar_date=str(sday.calendar_date),
            total_working_actors=day_working_summary.get(str(sday.id), 0)
        )
        for sday in shoot_days
    ]

    return DoodCalculationResult(
        shoot_days=dood_shoot_days,
        characters=dood_characters,
        total_cast_count=len(characters),
        daily_working_summary=day_working_summary
    )
