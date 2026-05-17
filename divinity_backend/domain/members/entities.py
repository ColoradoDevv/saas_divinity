from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class Member:
    id: int | None
    organization_id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    status: str
    created_at: datetime | None
    updated_at: datetime | None
    created_by_id: int | None
    standard_fields: dict = field(default_factory=dict)
    custom_fields: dict = field(default_factory=dict)

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f'{self.first_name} {self.last_name}'.strip(),
            'email': self.email,
            'phone': self.phone,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by_id': self.created_by_id,
            'standard_fields': self.standard_fields,
            'custom_fields': self.custom_fields,
        }


@dataclass(frozen=True)
class FieldConfig:
    organization_id: int
    field_name: str
    is_enabled: bool
    is_required: bool
    label: str

    def to_primitives(self) -> dict:
        return {
            'field_name': self.field_name,
            'is_enabled': self.is_enabled,
            'is_required': self.is_required,
            'label': self.label,
        }


@dataclass(frozen=True)
class CustomField:
    id: int | None
    organization_id: int
    name: str
    label: str
    field_type: str
    options: list | None
    is_required: bool
    is_enabled: bool
    order: int

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'label': self.label,
            'field_type': self.field_type,
            'options': self.options,
            'is_required': self.is_required,
            'is_enabled': self.is_enabled,
            'order': self.order,
        }
