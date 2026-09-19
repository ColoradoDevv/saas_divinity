from __future__ import annotations

import dataclasses
from datetime import date, timedelta
from typing import Optional, Sequence

from django.db import IntegrityError
from django.db.models import Count, Q
from django.utils import timezone

from apps.classes.models import (
    ClassEnrollmentModel,
    ClassScheduleModel,
    ClassSessionModel,
    ClassTypeModel,
)
from domain.classes.entities import ClassEnrollment, ClassSchedule, ClassSession, ClassType
from domain.classes.exceptions import ClassValidationError
from interfaces.repositories import ClassRepositoryInterface

MAX_SYNC_HORIZON_DAYS = 60


class DjangoORMClassRepository(ClassRepositoryInterface):

    # ------------------------------------------------------------------ #
    # Mappers                                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _class_type_to_entity(model: ClassTypeModel) -> ClassType:
        return ClassType(
            id=model.id,
            organization_id=model.organization_id,
            name=model.name,
            description=model.description,
            instructor_id=model.instructor_id,
            instructor_name=model.instructor.full_name if model.instructor_id else '',
            duration_minutes=model.duration_minutes,
            capacity=model.capacity,
            is_active=model.is_active,
        )

    @staticmethod
    def _schedule_to_entity(model: ClassScheduleModel) -> ClassSchedule:
        return ClassSchedule(
            id=model.id,
            organization_id=model.organization_id,
            class_type_id=model.class_type_id,
            class_type_name=model.class_type.name if model.class_type_id else '',
            weekday=model.weekday,
            start_time=model.start_time,
            is_active=model.is_active,
        )

    @staticmethod
    def _session_to_entity(model: ClassSessionModel) -> ClassSession:
        return ClassSession(
            id=model.id,
            organization_id=model.organization_id,
            class_type_id=model.class_type_id,
            class_type_name=model.class_type.name if model.class_type_id else '',
            schedule_id=model.schedule_id,
            date=model.date,
            start_time=model.start_time,
            instructor_id=model.instructor_id,
            instructor_name=model.instructor.full_name if model.instructor_id else '',
            capacity=model.capacity,
            status=model.status,
            enrolled_count=0,  # se completa después vía _with_enrolled_count / list_sessions
        )

    @staticmethod
    def _enrollment_to_entity(model: ClassEnrollmentModel) -> ClassEnrollment:
        return ClassEnrollment(
            id=model.id,
            organization_id=model.organization_id,
            session_id=model.session_id,
            member_id=model.member_id,
            member_name=f'{model.member.first_name} {model.member.last_name}'.strip(),
            member_email=model.member.email,
            status=model.status,
            created_at=model.created_at,
        )

    # ------------------------------------------------------------------ #
    # Class types                                                          #
    # ------------------------------------------------------------------ #

    def save_class_type(self, class_type: ClassType) -> ClassType:
        try:
            if class_type.id is not None:
                model = ClassTypeModel.objects.select_related('instructor').get(
                    pk=class_type.id, organization_id=class_type.organization_id,
                )
                model.name = class_type.name
                model.description = class_type.description
                model.instructor_id = class_type.instructor_id
                model.duration_minutes = class_type.duration_minutes
                model.capacity = class_type.capacity
                model.is_active = class_type.is_active
                model.save()
            else:
                model = ClassTypeModel.objects.create(
                    organization_id=class_type.organization_id,
                    name=class_type.name,
                    description=class_type.description,
                    instructor_id=class_type.instructor_id,
                    duration_minutes=class_type.duration_minutes,
                    capacity=class_type.capacity,
                    is_active=class_type.is_active,
                )
                model = ClassTypeModel.objects.select_related('instructor').get(pk=model.pk)
        except IntegrityError:
            raise ClassValidationError('Ya existe un tipo de clase con ese nombre en esta organización.')
        return self._class_type_to_entity(model)

    def get_class_type_by_id(self, class_type_id: int, organization_id: int) -> Optional[ClassType]:
        try:
            model = ClassTypeModel.objects.select_related('instructor').get(
                pk=class_type_id, organization_id=organization_id,
            )
        except ClassTypeModel.DoesNotExist:
            return None
        return self._class_type_to_entity(model)

    def list_class_types(self, organization_id: int, *, active_only: bool = False) -> Sequence[ClassType]:
        qs = ClassTypeModel.objects.select_related('instructor').filter(organization_id=organization_id)
        if active_only:
            qs = qs.filter(is_active=True)
        return [self._class_type_to_entity(m) for m in qs]

    def deactivate_class_type(self, class_type_id: int, organization_id: int) -> None:
        ClassTypeModel.objects.filter(pk=class_type_id, organization_id=organization_id).update(is_active=False)

    # ------------------------------------------------------------------ #
    # Schedules                                                            #
    # ------------------------------------------------------------------ #

    def save_schedule(self, schedule: ClassSchedule) -> ClassSchedule:
        if schedule.id is not None:
            model = ClassScheduleModel.objects.select_related('class_type').get(
                pk=schedule.id, organization_id=schedule.organization_id,
            )
            model.weekday = schedule.weekday
            model.start_time = schedule.start_time
            model.is_active = schedule.is_active
            model.save()
        else:
            model = ClassScheduleModel.objects.create(
                organization_id=schedule.organization_id,
                class_type_id=schedule.class_type_id,
                weekday=schedule.weekday,
                start_time=schedule.start_time,
                is_active=schedule.is_active,
            )
            model = ClassScheduleModel.objects.select_related('class_type').get(pk=model.pk)
        return self._schedule_to_entity(model)

    def get_schedule_by_id(self, schedule_id: int, organization_id: int) -> Optional[ClassSchedule]:
        try:
            model = ClassScheduleModel.objects.select_related('class_type').get(
                pk=schedule_id, organization_id=organization_id,
            )
        except ClassScheduleModel.DoesNotExist:
            return None
        return self._schedule_to_entity(model)

    def list_schedules(self, organization_id: int, *, active_only: bool = False) -> Sequence[ClassSchedule]:
        qs = ClassScheduleModel.objects.select_related('class_type').filter(organization_id=organization_id)
        if active_only:
            qs = qs.filter(is_active=True)
        return [self._schedule_to_entity(m) for m in qs]

    def deactivate_schedule(self, schedule_id: int, organization_id: int) -> None:
        ClassScheduleModel.objects.filter(pk=schedule_id, organization_id=organization_id).update(is_active=False)

    # ------------------------------------------------------------------ #
    # Sessions                                                             #
    # ------------------------------------------------------------------ #

    def sync_sessions(self, organization_id: int, date_from: date, date_to: date) -> None:
        """Genera (get_or_create) las sesiones de los horarios activos que
        caigan en el rango — mismo patrón lazy ya usado en
        sync_expiring_notifications / sync_daily_stats, pero hacia adelante
        en el tiempo. Horizonte acotado para no generar de más."""
        horizon = timezone.localdate() + timedelta(days=MAX_SYNC_HORIZON_DAYS)
        capped_to = min(date_to, horizon)
        if date_from > capped_to:
            return

        schedules = list(
            ClassScheduleModel.objects.select_related('class_type')
            .filter(organization_id=organization_id, is_active=True)
        )
        if not schedules:
            return

        day = date_from
        while day <= capped_to:
            weekday = day.weekday()
            for schedule in schedules:
                if schedule.weekday != weekday:
                    continue
                ClassSessionModel.objects.get_or_create(
                    class_type_id=schedule.class_type_id,
                    date=day,
                    start_time=schedule.start_time,
                    defaults={
                        'organization_id': organization_id,
                        'schedule_id': schedule.id,
                        'instructor_id': schedule.class_type.instructor_id,
                        'capacity': schedule.class_type.capacity,
                    },
                )
            day += timedelta(days=1)

    def get_session_by_id(
        self, session_id: int, organization_id: int, *, lock: bool = False
    ) -> Optional[ClassSession]:
        qs = ClassSessionModel.objects.select_related('class_type', 'instructor')
        if lock:
            qs = qs.select_for_update()
        try:
            model = qs.get(pk=session_id, organization_id=organization_id)
        except ClassSessionModel.DoesNotExist:
            return None
        entity = self._session_to_entity(model)
        return self._with_enrolled_count(entity)

    def list_sessions(
        self, organization_id: int, *, date_from: date, date_to: date
    ) -> Sequence[ClassSession]:
        qs = (
            ClassSessionModel.objects
            .select_related('class_type', 'instructor')
            .filter(organization_id=organization_id, date__gte=date_from, date__lte=date_to)
            .annotate(
                active_enrollments=Count(
                    'enrollments', filter=Q(enrollments__status__in=['booked', 'attended']),
                )
            )
        )
        result = []
        for model in qs:
            entity = self._session_to_entity(model)
            result.append(dataclasses.replace(entity, enrolled_count=model.active_enrollments))
        return result

    def cancel_session(self, session_id: int, organization_id: int) -> ClassSession:
        ClassSessionModel.objects.filter(pk=session_id, organization_id=organization_id).update(status='cancelled')
        model = (
            ClassSessionModel.objects
            .select_related('class_type', 'instructor')
            .get(pk=session_id, organization_id=organization_id)
        )
        return self._with_enrolled_count(self._session_to_entity(model))

    def _with_enrolled_count(self, session: ClassSession) -> ClassSession:
        count = self.count_active_enrollments(session.id)
        return dataclasses.replace(session, enrolled_count=count)

    # ------------------------------------------------------------------ #
    # Enrollments                                                          #
    # ------------------------------------------------------------------ #

    def save_enrollment(self, enrollment: ClassEnrollment) -> ClassEnrollment:
        try:
            if enrollment.id is not None:
                model = ClassEnrollmentModel.objects.select_related('member').get(
                    pk=enrollment.id, organization_id=enrollment.organization_id,
                )
                model.status = enrollment.status
                model.save()
            else:
                model = ClassEnrollmentModel.objects.create(
                    organization_id=enrollment.organization_id,
                    session_id=enrollment.session_id,
                    member_id=enrollment.member_id,
                    status=enrollment.status,
                )
                model = ClassEnrollmentModel.objects.select_related('member').get(pk=model.pk)
        except IntegrityError:
            raise ClassValidationError('El miembro ya está inscrito en esta sesión.')
        return self._enrollment_to_entity(model)

    def get_enrollment_by_id(self, enrollment_id: int, organization_id: int) -> Optional[ClassEnrollment]:
        try:
            model = ClassEnrollmentModel.objects.select_related('member').get(
                pk=enrollment_id, organization_id=organization_id,
            )
        except ClassEnrollmentModel.DoesNotExist:
            return None
        return self._enrollment_to_entity(model)

    def list_enrollments_for_session(self, session_id: int) -> Sequence[ClassEnrollment]:
        qs = ClassEnrollmentModel.objects.select_related('member').filter(session_id=session_id)
        return [self._enrollment_to_entity(m) for m in qs]

    def has_active_enrollment(self, session_id: int, member_id: int) -> bool:
        return (
            ClassEnrollmentModel.objects
            .filter(session_id=session_id, member_id=member_id)
            .exclude(status='cancelled')
            .exists()
        )

    def count_active_enrollments(self, session_id: int) -> int:
        return (
            ClassEnrollmentModel.objects
            .filter(session_id=session_id, status__in=['booked', 'attended'])
            .count()
        )
