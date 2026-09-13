from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CheckInDTO:
    organization_id: int
    method: str
    member_id: int | None = None
    member_code: str | None = None
    registered_by_id: int | None = None
