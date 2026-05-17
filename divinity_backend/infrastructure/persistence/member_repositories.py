from __future__ import annotations

from typing import Optional, Sequence

from django.db import IntegrityError
from django.db.models import Q

from apps.members.models import (
    MemberCustomFieldModel,
    MemberCustomFieldValueModel,
    MemberFieldConfigModel,
    MemberModel,
    MemberStandardFieldValueModel,
    STANDARD_FIELD_KEYS,
)
from domain.members.entities import CustomField, FieldConfig, Member
from domain.members.exceptions import MemberAlreadyExistsError
from interfaces.repositories import MemberRepositoryInterface


class DjangoORMMemberRepository(MemberRepositoryInterface):

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _to_entity(self, model: MemberModel) -> Member:
        standard_fields = {
            v.field_name: v.value
            for v in model.standard_field_values.all()
        }
        custom_fields = {
            v.field.name: v.value
            for v in model.custom_field_values.select_related('field').all()
        }
        return Member(
            id=model.id,
            organization_id=model.organization_id,
            first_name=model.first_name,
            last_name=model.last_name,
            email=model.email,
            phone=model.phone,
            status=model.status,
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by_id=model.created_by_id,
            standard_fields=standard_fields,
            custom_fields=custom_fields,
        )

    def _save_standard_fields(self, model: MemberModel, standard_fields: dict) -> None:
        for field_name, value in standard_fields.items():
            if field_name not in STANDARD_FIELD_KEYS:
                continue
            MemberStandardFieldValueModel.objects.update_or_create(
                member=model,
                field_name=field_name,
                defaults={'value': str(value)},
            )

    def _save_custom_fields(self, model: MemberModel, custom_fields: dict, org_id: int) -> None:
        for field_name, value in custom_fields.items():
            try:
                field_model = MemberCustomFieldModel.objects.get(
                    name=field_name,
                    organization_id=org_id,
                    is_enabled=True,
                )
            except MemberCustomFieldModel.DoesNotExist:
                continue
            MemberCustomFieldValueModel.objects.update_or_create(
                member=model,
                field=field_model,
                defaults={'value': str(value)},
            )

    # ------------------------------------------------------------------ #
    # MemberRepositoryInterface                                            #
    # ------------------------------------------------------------------ #

    def save(self, member: Member) -> Member:
        try:
            if member.id is not None:
                model = MemberModel.objects.get(pk=member.id, organization_id=member.organization_id)
                model.first_name = member.first_name
                model.last_name = member.last_name
                model.email = member.email
                model.phone = member.phone
                model.status = member.status
                model.save()
            else:
                model = MemberModel.objects.create(
                    organization_id=member.organization_id,
                    first_name=member.first_name,
                    last_name=member.last_name,
                    email=member.email,
                    phone=member.phone,
                    status=member.status,
                    created_by_id=member.created_by_id,
                )
        except IntegrityError:
            raise MemberAlreadyExistsError(
                'Ya existe un miembro con este correo en la organización.'
            )

        self._save_standard_fields(model, member.standard_fields)
        self._save_custom_fields(model, member.custom_fields, member.organization_id)
        return self._to_entity(model)

    def get_by_id(self, member_id: int, organization_id: int) -> Optional[Member]:
        try:
            model = MemberModel.objects.prefetch_related(
                'standard_field_values',
                'custom_field_values__field',
            ).get(pk=member_id, organization_id=organization_id)
        except MemberModel.DoesNotExist:
            return None
        return self._to_entity(model)

    def get_by_email(self, email: str, organization_id: int) -> Optional[Member]:
        try:
            model = MemberModel.objects.prefetch_related(
                'standard_field_values',
                'custom_field_values__field',
            ).get(email=email, organization_id=organization_id)
        except MemberModel.DoesNotExist:
            return None
        return self._to_entity(model)

    def list_active(
        self,
        organization_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str = '',
        status: str = '',
    ) -> tuple[Sequence[Member], int]:
        qs = MemberModel.objects.filter(organization_id=organization_id)

        if status:
            qs = qs.filter(status=status)

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        total = qs.count()

        offset = (page - 1) * page_size
        qs = qs.prefetch_related(
            'standard_field_values',
            'custom_field_values__field',
        )[offset: offset + page_size]

        return [self._to_entity(m) for m in qs], total

    def deactivate(self, member_id: int, organization_id: int) -> bool:
        updated = MemberModel.objects.filter(
            pk=member_id,
            organization_id=organization_id,
        ).update(status='inactive')
        return updated > 0

    # ------------------------------------------------------------------ #
    # Field config                                                         #
    # ------------------------------------------------------------------ #

    def get_field_config(self, organization_id: int) -> Sequence[FieldConfig]:
        rows = MemberFieldConfigModel.objects.filter(organization_id=organization_id)
        existing = {r.field_name: r for r in rows}

        result = []
        for key in STANDARD_FIELD_KEYS:
            if key in existing:
                row = existing[key]
                result.append(FieldConfig(
                    organization_id=organization_id,
                    field_name=row.field_name,
                    is_enabled=row.is_enabled,
                    is_required=row.is_required,
                    label=row.label or key,
                ))
            else:
                result.append(FieldConfig(
                    organization_id=organization_id,
                    field_name=key,
                    is_enabled=False,
                    is_required=False,
                    label=key,
                ))
        return result

    def save_field_config(self, config: FieldConfig) -> FieldConfig:
        row, _ = MemberFieldConfigModel.objects.update_or_create(
            organization_id=config.organization_id,
            field_name=config.field_name,
            defaults={
                'is_enabled': config.is_enabled,
                'is_required': config.is_required,
                'label': config.label,
            },
        )
        return FieldConfig(
            organization_id=row.organization_id,
            field_name=row.field_name,
            is_enabled=row.is_enabled,
            is_required=row.is_required,
            label=row.label or row.field_name,
        )

    # ------------------------------------------------------------------ #
    # Custom fields                                                        #
    # ------------------------------------------------------------------ #

    def get_custom_fields(self, organization_id: int) -> Sequence[CustomField]:
        qs = MemberCustomFieldModel.objects.filter(organization_id=organization_id)
        return [self._cf_to_entity(cf) for cf in qs]

    def save_custom_field(self, custom_field: CustomField) -> CustomField:
        if custom_field.id is not None:
            model = MemberCustomFieldModel.objects.get(
                pk=custom_field.id,
                organization_id=custom_field.organization_id,
            )
            model.label = custom_field.label
            model.field_type = custom_field.field_type
            model.options = custom_field.options
            model.is_required = custom_field.is_required
            model.is_enabled = custom_field.is_enabled
            model.order = custom_field.order
            model.save()
        else:
            model = MemberCustomFieldModel.objects.create(
                organization_id=custom_field.organization_id,
                name=custom_field.name,
                label=custom_field.label,
                field_type=custom_field.field_type,
                options=custom_field.options,
                is_required=custom_field.is_required,
                is_enabled=custom_field.is_enabled,
                order=custom_field.order,
            )
        return self._cf_to_entity(model)

    def delete_custom_field(self, field_id: int, organization_id: int) -> bool:
        deleted, _ = MemberCustomFieldModel.objects.filter(
            pk=field_id,
            organization_id=organization_id,
        ).delete()
        return deleted > 0

    @staticmethod
    def _cf_to_entity(model: MemberCustomFieldModel) -> CustomField:
        return CustomField(
            id=model.id,
            organization_id=model.organization_id,
            name=model.name,
            label=model.label,
            field_type=model.field_type,
            options=model.options,
            is_required=model.is_required,
            is_enabled=model.is_enabled,
            order=model.order,
        )
