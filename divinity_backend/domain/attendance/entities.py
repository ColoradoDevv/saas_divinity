from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

VALID_CHECKIN_METHODS = ('code', 'manual', 'face', 'fingerprint')


@dataclass(frozen=True)
class CheckIn:
    id: int | None
    organization_id: int
    member_id: int
    member_name: str
    method: str
    checked_in_at: datetime | None
    registered_by_id: int | None

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'member_id': self.member_id,
            'member_name': self.member_name,
            'method': self.method,
            'checked_in_at': self.checked_in_at.isoformat() if self.checked_in_at else None,
            'registered_by_id': self.registered_by_id,
        }
