from __future__ import annotations

import dataclasses

from domain.members.entities import CustomField, FieldConfig, Member
from domain.members.exceptions import (
    MemberAlreadyExistsError,
    MemberNotFoundError,
    MemberValidationError,
)
from interfaces.repositories import MemberRepositoryInterface

from .dtos import (
    ConfigureFieldDTO,
    CreateCustomFieldDTO,
    CreateMemberDTO,
    UpdateCustomFieldDTO,
    UpdateMemberDTO,
)

_VALID_STATUSES = ('active', 'inactive', 'suspended')
_VALID_FIELD_TYPES = ('text', 'number', 'date', 'boolean', 'select')


class CreateMemberService:
    def __init__(self, repository: MemberRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CreateMemberDTO) -> Member:
        if not dto.first_name.strip():
            raise MemberValidationError('El nombre no puede estar vacío.')
        if not dto.last_name.strip():
            raise MemberValidationError('El apellido no puede estar vacío.')
        if '@' not in dto.email:
            raise MemberValidationError('El email no es válido.')

        existing = self.repository.get_by_email(dto.email, dto.organization_id)
        if existing is not None:
            raise MemberAlreadyExistsError(
                'Ya existe un miembro con este correo en la organización.'
            )

        field_configs = self.repository.get_field_config(dto.organization_id)
        required_standard = {
            cfg.field_name for cfg in field_configs if cfg.is_enabled and cfg.is_required
        }
        missing_standard = required_standard - set(dto.standard_fields.keys())
        if missing_standard:
            raise MemberValidationError(
                f'Campos requeridos faltantes: {", ".join(sorted(missing_standard))}'
            )

        custom_fields = self.repository.get_custom_fields(dto.organization_id)
        required_custom = {
            cf.name for cf in custom_fields if cf.is_enabled and cf.is_required
        }
        missing_custom = required_custom - set(dto.custom_fields.keys())
        if missing_custom:
            raise MemberValidationError(
                f'Campos personalizados requeridos faltantes: {", ".join(sorted(missing_custom))}'
            )

        member = Member(
            id=None,
            organization_id=dto.organization_id,
            first_name=dto.first_name.strip(),
            last_name=dto.last_name.strip(),
            email=dto.email.lower().strip(),
            phone=dto.phone.strip(),
            status='active',
            created_at=None,
            updated_at=None,
            created_by_id=dto.created_by_id,
            standard_fields=dto.standard_fields,
            custom_fields=dto.custom_fields,
        )
        return self.repository.save(member)


class UpdateMemberService:
    def __init__(self, repository: MemberRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: UpdateMemberDTO) -> Member:
        member = self.repository.get_by_id(dto.member_id, dto.organization_id)
        if member is None:
            raise MemberNotFoundError('Miembro no encontrado.')

        if dto.email is not None and dto.email != member.email:
            if '@' not in dto.email:
                raise MemberValidationError('El email no es válido.')
            existing = self.repository.get_by_email(dto.email, dto.organization_id)
            if existing is not None and existing.id != member.id:
                raise MemberAlreadyExistsError(
                    'Ya existe un miembro con este correo en la organización.'
                )

        updated = dataclasses.replace(
            member,
            first_name=(dto.first_name.strip() if dto.first_name is not None else member.first_name),
            last_name=(dto.last_name.strip() if dto.last_name is not None else member.last_name),
            email=(dto.email.lower().strip() if dto.email is not None else member.email),
            phone=(dto.phone.strip() if dto.phone is not None else member.phone),
            standard_fields=(dto.standard_fields if dto.standard_fields is not None else member.standard_fields),
            custom_fields=(dto.custom_fields if dto.custom_fields is not None else member.custom_fields),
        )
        return self.repository.save(updated)


class ConfigureFieldsService:
    def __init__(self, repository: MemberRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: ConfigureFieldDTO) -> FieldConfig:
        config = FieldConfig(
            organization_id=dto.organization_id,
            field_name=dto.field_name,
            is_enabled=dto.is_enabled,
            is_required=dto.is_required,
            label=dto.label,
        )
        return self.repository.save_field_config(config)


class ManageCustomFieldsService:
    def __init__(self, repository: MemberRepositoryInterface) -> None:
        self.repository = repository

    def create(self, dto: CreateCustomFieldDTO) -> CustomField:
        if dto.field_type not in _VALID_FIELD_TYPES:
            raise MemberValidationError(
                f'Tipo de campo inválido: {dto.field_type}. '
                f'Opciones: {", ".join(_VALID_FIELD_TYPES)}'
            )
        if dto.field_type == 'select' and not dto.options:
            raise MemberValidationError(
                'Los campos de tipo "select" deben tener al menos una opción.'
            )

        custom_field = CustomField(
            id=None,
            organization_id=dto.organization_id,
            name=dto.name,
            label=dto.label,
            field_type=dto.field_type,
            options=dto.options,
            is_required=dto.is_required,
            is_enabled=dto.is_enabled,
            order=dto.order,
        )
        return self.repository.save_custom_field(custom_field)

    def update(self, dto: UpdateCustomFieldDTO) -> CustomField:
        existing_fields = self.repository.get_custom_fields(dto.organization_id)
        existing = next((f for f in existing_fields if f.id == dto.field_id), None)
        if existing is None:
            raise MemberNotFoundError('Campo personalizado no encontrado.')

        field_type = dto.field_type if dto.field_type is not None else existing.field_type
        if field_type not in _VALID_FIELD_TYPES:
            raise MemberValidationError(f'Tipo de campo inválido: {field_type}.')

        options = dto.options if dto.options is not None else existing.options
        if field_type == 'select' and not options:
            raise MemberValidationError(
                'Los campos de tipo "select" deben tener al menos una opción.'
            )

        updated = dataclasses.replace(
            existing,
            label=(dto.label if dto.label is not None else existing.label),
            field_type=field_type,
            options=options,
            is_required=(dto.is_required if dto.is_required is not None else existing.is_required),
            is_enabled=(dto.is_enabled if dto.is_enabled is not None else existing.is_enabled),
            order=(dto.order if dto.order is not None else existing.order),
        )
        return self.repository.save_custom_field(updated)

    def delete(self, field_id: int, organization_id: int) -> bool:
        deleted = self.repository.delete_custom_field(field_id, organization_id)
        if not deleted:
            raise MemberNotFoundError('Campo personalizado no encontrado.')
        return True
