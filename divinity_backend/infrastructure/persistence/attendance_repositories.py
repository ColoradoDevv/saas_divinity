from __future__ import annotations

from typing import Sequence

from django.utils import timezone

from apps.attendance.models import CheckInModel
from domain.attendance.entities import CheckIn
from interfaces.repositories import AttendanceRepositoryInterface


class DjangoORMAttendanceRepository(AttendanceRepositoryInterface):

    @staticmethod
    def _to_entity(model: CheckInModel) -> CheckIn:
        return CheckIn(
            id=model.id,
            organization_id=model.organization_id,
            member_id=model.member_id,
            member_name=f'{model.member.first_name} {model.member.last_name}'.strip(),
            method=model.method,
            checked_in_at=model.checked_in_at,
            registered_by_id=model.registered_by_id,
        )

    def save(self, checkin: CheckIn) -> CheckIn:
        model = CheckInModel.objects.create(
            organization_id=checkin.organization_id,
            member_id=checkin.member_id,
            method=checkin.method,
            registered_by_id=checkin.registered_by_id,
        )
        model = CheckInModel.objects.select_related('member').get(pk=model.pk)
        return self._to_entity(model)

    def list_today(self, organization_id: int) -> Sequence[CheckIn]:
        # timezone.localdate() respeta settings.TIME_ZONE — usar datetime.date.today()
        # (hora local del sistema operativo) puede desalinearse con la fecha que Django
        # calcula para checked_in_at si el servidor corre en otra zona horaria.
        qs = CheckInModel.objects.select_related('member').filter(
            organization_id=organization_id,
            checked_in_at__date=timezone.localdate(),
        )
        return [self._to_entity(m) for m in qs]

    def list_for_member(self, member_id: int, organization_id: int) -> Sequence[CheckIn]:
        qs = CheckInModel.objects.select_related('member').filter(
            member_id=member_id, organization_id=organization_id,
        )
        return [self._to_entity(m) for m in qs]
