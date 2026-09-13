from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time


@dataclass(frozen=True)
class ClassType:
    id: int | None
    organization_id: int
    name: str
    description: str
    instructor_id: int | None
    duration_minutes: int
    capacity: int
    is_active: bool
    instructor_name: str = ''

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'instructor_id': self.instructor_id,
            'instructor_name': self.instructor_name,
            'duration_minutes': self.duration_minutes,
            'capacity': self.capacity,
            'is_active': self.is_active,
        }


@dataclass(frozen=True)
class ClassSchedule:
    id: int | None
    organization_id: int
    class_type_id: int
    weekday: int  # 0=lunes...6=domingo
    start_time: time
    is_active: bool
    class_type_name: str = ''

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'class_type_id': self.class_type_id,
            'class_type_name': self.class_type_name,
            'weekday': self.weekday,
            'start_time': self.start_time.isoformat(),
            'is_active': self.is_active,
        }


@dataclass(frozen=True)
class ClassSession:
    id: int | None
    organization_id: int
    class_type_id: int
    schedule_id: int | None
    date: date
    start_time: time
    instructor_id: int | None
    capacity: int
    status: str  # 'scheduled' | 'cancelled'
    class_type_name: str = ''
    instructor_name: str = ''
    enrolled_count: int = 0

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'class_type_id': self.class_type_id,
            'class_type_name': self.class_type_name,
            'schedule_id': self.schedule_id,
            'date': self.date.isoformat(),
            'start_time': self.start_time.isoformat(),
            'instructor_id': self.instructor_id,
            'instructor_name': self.instructor_name,
            'capacity': self.capacity,
            'status': self.status,
            'enrolled_count': self.enrolled_count,
        }


@dataclass(frozen=True)
class ClassEnrollment:
    id: int | None
    organization_id: int
    session_id: int
    member_id: int
    status: str  # 'booked' | 'attended' | 'no_show' | 'cancelled'
    created_at: datetime | None
    member_name: str = ''
    member_email: str = ''

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'session_id': self.session_id,
            'member_id': self.member_id,
            'member_name': self.member_name,
            'member_email': self.member_email,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
