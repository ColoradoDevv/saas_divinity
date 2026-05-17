from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CreateMemberDTO:
    organization_id: int
    first_name: str
    last_name: str
    email: str
    phone: str = ''
    created_by_id: int | None = None
    standard_fields: dict = field(default_factory=dict)
    custom_fields: dict = field(default_factory=dict)


@dataclass(frozen=True)
class UpdateMemberDTO:
    member_id: int
    organization_id: int
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    standard_fields: dict | None = None
    custom_fields: dict | None = None


@dataclass(frozen=True)
class ConfigureFieldDTO:
    organization_id: int
    field_name: str
    is_enabled: bool
    is_required: bool
    label: str = ''


@dataclass(frozen=True)
class CreateCustomFieldDTO:
    organization_id: int
    name: str
    label: str
    field_type: str
    options: list | None = None
    is_required: bool = False
    is_enabled: bool = True
    order: int = 0


@dataclass(frozen=True)
class UpdateCustomFieldDTO:
    field_id: int
    organization_id: int
    label: str | None = None
    field_type: str | None = None
    options: list | None = None
    is_required: bool | None = None
    is_enabled: bool | None = None
    order: int | None = None
