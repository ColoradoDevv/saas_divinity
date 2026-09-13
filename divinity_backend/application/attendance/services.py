from __future__ import annotations

from domain.attendance.entities import VALID_CHECKIN_METHODS, CheckIn
from domain.attendance.exceptions import CheckInValidationError, MemberNotFoundForCheckInError
from interfaces.repositories import AttendanceRepositoryInterface, MemberRepositoryInterface

from .dtos import CheckInDTO


class CheckInService:
    def __init__(
        self,
        attendance_repository: AttendanceRepositoryInterface,
        member_repository: MemberRepositoryInterface,
    ) -> None:
        self.attendance_repository = attendance_repository
        self.member_repository = member_repository

    def execute(self, dto: CheckInDTO) -> CheckIn:
        if dto.method not in VALID_CHECKIN_METHODS:
            raise CheckInValidationError(
                f'Método de check-in inválido: {dto.method}. '
                f'Opciones: {", ".join(VALID_CHECKIN_METHODS)}'
            )
        if not dto.member_id and not dto.member_code:
            raise CheckInValidationError('Debes indicar member_id o member_code.')

        if dto.member_id:
            member = self.member_repository.get_by_id(dto.member_id, dto.organization_id)
        else:
            member = self.member_repository.get_by_code(dto.member_code, dto.organization_id)

        if member is None:
            raise MemberNotFoundForCheckInError('No se encontró un miembro con ese identificador.')

        checkin = CheckIn(
            id=None,
            organization_id=dto.organization_id,
            member_id=member.id,
            member_name=f'{member.first_name} {member.last_name}'.strip(),
            method=dto.method,
            checked_in_at=None,
            registered_by_id=dto.registered_by_id,
        )
        return self.attendance_repository.save(checkin)
