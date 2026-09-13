from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class CreatePlanDTO:
    organization_id: int
    name: str
    description: str
    price: Decimal
    duration_value: int
    duration_unit: str


@dataclass(frozen=True)
class UpdatePlanDTO:
    plan_id: int
    organization_id: int
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    duration_value: int | None = None
    duration_unit: str | None = None
    is_active: bool | None = None


@dataclass(frozen=True)
class RenewMembershipDTO:
    organization_id: int
    member_id: int
    plan_id: int
    method: str
    amount: Decimal | None = None
    start_date: date | None = None
    paid_at: date | None = None
    notes: str = ''
    registered_by_id: int | None = None


@dataclass(frozen=True)
class FreezeSubscriptionDTO:
    subscription_id: int
    organization_id: int


@dataclass(frozen=True)
class ResumeSubscriptionDTO:
    subscription_id: int
    organization_id: int
