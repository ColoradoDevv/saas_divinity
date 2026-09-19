from __future__ import annotations

import dataclasses
from datetime import date

from domain.classes.entities import ClassEnrollment, ClassSchedule, ClassSession, ClassType
from domain.classes.exceptions import (
    AlreadyEnrolledError,
    ClassTypeNotFoundError,
    ClassValidationError,
    EnrollmentNotFoundError,
    ScheduleNotFoundError,
    SessionFullError,
    SessionNotFoundError,
)
from interfaces.repositories import ClassRepositoryInterface

from .dtos import (
    CancelEnrollmentDTO,
    CancelSessionDTO,
    CreateClassTypeDTO,
    CreateScheduleDTO,
    EnrollMemberDTO,
    MarkAttendedDTO,
    UpdateClassTypeDTO,
    UpdateScheduleDTO,
)

_VALID_WEEKDAYS = range(7)


def _validate_class_type_fields(name: str, duration_minutes: int, capacity: int) -> None:
    if not name.strip():
        raise ClassValidationError('El nombre de la clase no puede estar vacío.')
    if duration_minutes <= 0:
        raise ClassValidationError('La duración debe ser mayor a cero.')
    if capacity <= 0:
        raise ClassValidationError('El cupo debe ser mayor a cero.')


class CreateClassTypeService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CreateClassTypeDTO) -> ClassType:
        _validate_class_type_fields(dto.name, dto.duration_minutes, dto.capacity)
        class_type = ClassType(
            id=None,
            organization_id=dto.organization_id,
            name=dto.name.strip(),
            description=dto.description.strip(),
            instructor_id=dto.instructor_id,
            duration_minutes=dto.duration_minutes,
            capacity=dto.capacity,
            is_active=True,
        )
        return self.repository.save_class_type(class_type)


class UpdateClassTypeService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: UpdateClassTypeDTO) -> ClassType:
        class_type = self.repository.get_class_type_by_id(dto.class_type_id, dto.organization_id)
        if class_type is None:
            raise ClassTypeNotFoundError('Tipo de clase no encontrado.')

        name = dto.name.strip() if dto.name is not None else class_type.name
        duration_minutes = (
            dto.duration_minutes if dto.duration_minutes is not None else class_type.duration_minutes
        )
        capacity = dto.capacity if dto.capacity is not None else class_type.capacity
        _validate_class_type_fields(name, duration_minutes, capacity)

        updated = dataclasses.replace(
            class_type,
            name=name,
            description=(dto.description.strip() if dto.description is not None else class_type.description),
            instructor_id=(dto.instructor_id if dto.instructor_id is not None else class_type.instructor_id),
            duration_minutes=duration_minutes,
            capacity=capacity,
            is_active=(dto.is_active if dto.is_active is not None else class_type.is_active),
        )
        return self.repository.save_class_type(updated)


class DeactivateClassTypeService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, class_type_id: int, organization_id: int) -> None:
        self.repository.deactivate_class_type(class_type_id, organization_id)


class ConfigureScheduleService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CreateScheduleDTO) -> ClassSchedule:
        class_type = self.repository.get_class_type_by_id(dto.class_type_id, dto.organization_id)
        if class_type is None:
            raise ClassTypeNotFoundError('Tipo de clase no encontrado.')
        if dto.weekday not in _VALID_WEEKDAYS:
            raise ClassValidationError('Día de la semana inválido (0=lunes...6=domingo).')

        schedule = ClassSchedule(
            id=None,
            organization_id=dto.organization_id,
            class_type_id=dto.class_type_id,
            weekday=dto.weekday,
            start_time=dto.start_time,
            is_active=True,
        )
        return self.repository.save_schedule(schedule)


class UpdateScheduleService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: UpdateScheduleDTO) -> ClassSchedule:
        schedule = self.repository.get_schedule_by_id(dto.schedule_id, dto.organization_id)
        if schedule is None:
            raise ScheduleNotFoundError('Horario no encontrado.')

        weekday = dto.weekday if dto.weekday is not None else schedule.weekday
        if weekday not in _VALID_WEEKDAYS:
            raise ClassValidationError('Día de la semana inválido (0=lunes...6=domingo).')

        updated = dataclasses.replace(
            schedule,
            weekday=weekday,
            start_time=(dto.start_time if dto.start_time is not None else schedule.start_time),
            is_active=(dto.is_active if dto.is_active is not None else schedule.is_active),
        )
        return self.repository.save_schedule(updated)


class DeactivateScheduleService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, schedule_id: int, organization_id: int) -> None:
        self.repository.deactivate_schedule(schedule_id, organization_id)


class ListSessionsService:
    """Completa (perezosamente) las sesiones futuras que falten para el rango
    pedido a partir de los horarios activos, y devuelve la lista — mismo
    patrón lazy ya usado en sync_expiring_notifications / sync_daily_stats,
    pero generando hacia adelante en vez de hacia atrás."""

    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, organization_id: int, date_from: date, date_to: date) -> list[ClassSession]:
        self.repository.sync_sessions(organization_id, date_from, date_to)
        return list(self.repository.list_sessions(organization_id, date_from=date_from, date_to=date_to))


class EnrollMemberService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: EnrollMemberDTO) -> ClassEnrollment:
        # Bloquea la fila de la sesión: dos inscripciones concurrentes deben serializarse
        # para que ninguna lea el cupo disponible antes de que la otra confirme la suya
        # (llamar dentro de una transacción — ver las vistas que invocan este servicio).
        session = self.repository.get_session_by_id(dto.session_id, dto.organization_id, lock=True)
        if session is None:
            raise SessionNotFoundError('Sesión no encontrada.')
        if session.status == 'cancelled':
            raise ClassValidationError('No se puede inscribir a una sesión cancelada.')

        if self.repository.has_active_enrollment(dto.session_id, dto.member_id):
            raise AlreadyEnrolledError('El miembro ya está inscrito en esta sesión.')

        active_count = self.repository.count_active_enrollments(dto.session_id)
        if active_count >= session.capacity:
            raise SessionFullError('La sesión ya alcanzó su cupo máximo.')

        enrollment = ClassEnrollment(
            id=None,
            organization_id=dto.organization_id,
            session_id=dto.session_id,
            member_id=dto.member_id,
            status='booked',
            created_at=None,
        )
        return self.repository.save_enrollment(enrollment)


class CancelEnrollmentService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CancelEnrollmentDTO) -> ClassEnrollment:
        enrollment = self.repository.get_enrollment_by_id(dto.enrollment_id, dto.organization_id)
        if enrollment is None:
            raise EnrollmentNotFoundError('Inscripción no encontrada.')
        updated = dataclasses.replace(enrollment, status='cancelled')
        return self.repository.save_enrollment(updated)


class MarkAttendedService:
    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: MarkAttendedDTO) -> ClassEnrollment:
        enrollment = self.repository.get_enrollment_by_id(dto.enrollment_id, dto.organization_id)
        if enrollment is None:
            raise EnrollmentNotFoundError('Inscripción no encontrada.')
        if enrollment.status == 'cancelled':
            raise ClassValidationError('No se puede marcar asistencia de una inscripción cancelada.')
        updated = dataclasses.replace(enrollment, status='attended')
        return self.repository.save_enrollment(updated)


class CancelSessionService:
    """Cancela la sesión y todas sus inscripciones reservadas (para poder
    avisarle por email a cada miembro afectado)."""

    def __init__(self, repository: ClassRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CancelSessionDTO) -> tuple[ClassSession, list[ClassEnrollment]]:
        session = self.repository.get_session_by_id(dto.session_id, dto.organization_id)
        if session is None:
            raise SessionNotFoundError('Sesión no encontrada.')

        enrollments = self.repository.list_enrollments_for_session(dto.session_id)
        notified: list[ClassEnrollment] = []
        for enrollment in enrollments:
            if enrollment.status == 'booked':
                self.repository.save_enrollment(dataclasses.replace(enrollment, status='cancelled'))
                notified.append(enrollment)

        updated_session = self.repository.cancel_session(dto.session_id, dto.organization_id)
        return updated_session, notified
