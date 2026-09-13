from __future__ import annotations

from dataclasses import dataclass
from datetime import time


@dataclass(frozen=True)
class CreateClassTypeDTO:
    organization_id: int
    name: str
    description: str = ''
    instructor_id: int | None = None
    duration_minutes: int = 60
    capacity: int = 20


@dataclass(frozen=True)
class UpdateClassTypeDTO:
    class_type_id: int
    organization_id: int
    name: str | None = None
    description: str | None = None
    instructor_id: int | None = None
    duration_minutes: int | None = None
    capacity: int | None = None
    is_active: bool | None = None


@dataclass(frozen=True)
class CreateScheduleDTO:
    organization_id: int
    class_type_id: int
    weekday: int
    start_time: time


@dataclass(frozen=True)
class UpdateScheduleDTO:
    schedule_id: int
    organization_id: int
    weekday: int | None = None
    start_time: time | None = None
    is_active: bool | None = None


@dataclass(frozen=True)
class EnrollMemberDTO:
    organization_id: int
    session_id: int
    member_id: int


@dataclass(frozen=True)
class CancelEnrollmentDTO:
    enrollment_id: int
    organization_id: int


@dataclass(frozen=True)
class MarkAttendedDTO:
    enrollment_id: int
    organization_id: int


@dataclass(frozen=True)
class CancelSessionDTO:
    session_id: int
    organization_id: int
