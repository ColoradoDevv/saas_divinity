from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from django.utils import timezone


@dataclass(frozen=True)
class MembershipPlan:
    id: int | None
    organization_id: int
    name: str
    description: str
    price: Decimal
    duration_value: int
    duration_unit: str
    is_active: bool

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': str(self.price),
            'duration_value': self.duration_value,
            'duration_unit': self.duration_unit,
            'is_active': self.is_active,
        }


@dataclass(frozen=True)
class MemberSubscription:
    id: int | None
    organization_id: int
    member_id: int
    plan_id: int
    start_date: date
    end_date: date
    status: str  # 'active' | 'frozen' | 'cancelled' — "vencida" es derivado, no se guarda
    frozen_since: date | None
    created_at: datetime | None
    plan_name: str = ''
    member_name: str = ''

    @property
    def is_currently_active(self) -> bool:
        return self.status == 'active' and self.end_date >= timezone.localdate()

    @property
    def display_status(self) -> str:
        if self.status == 'active' and self.end_date < timezone.localdate():
            return 'expired'
        return self.status

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'member_id': self.member_id,
            'member_name': self.member_name,
            'plan_id': self.plan_id,
            'plan_name': self.plan_name,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.display_status,
            'frozen_since': self.frozen_since.isoformat() if self.frozen_since else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


@dataclass(frozen=True)
class DuesPayment:
    id: int | None
    organization_id: int
    member_id: int
    subscription_id: int | None
    amount: Decimal
    method: str
    paid_at: date
    notes: str
    registered_by_id: int | None
    created_at: datetime | None
    member_name: str = ''
    registered_by_name: str = ''

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'member_id': self.member_id,
            'member_name': self.member_name,
            'subscription_id': self.subscription_id,
            'amount': str(self.amount),
            'method': self.method,
            'paid_at': self.paid_at.isoformat(),
            'notes': self.notes,
            'registered_by_id': self.registered_by_id,
            'registered_by_name': self.registered_by_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
