from datetime import date, time, timedelta

import pytest
from django.utils import timezone

from application.classes.dtos import (
    CancelEnrollmentDTO,
    CancelSessionDTO,
    CreateClassTypeDTO,
    CreateScheduleDTO,
    EnrollMemberDTO,
    MarkAttendedDTO,
    UpdateClassTypeDTO,
    UpdateScheduleDTO,
)
from application.classes.services import (
    CancelEnrollmentService,
    CancelSessionService,
    ConfigureScheduleService,
    CreateClassTypeService,
    DeactivateClassTypeService,
    DeactivateScheduleService,
    EnrollMemberService,
    ListSessionsService,
    MarkAttendedService,
    UpdateClassTypeService,
    UpdateScheduleService,
)
from domain.classes.exceptions import (
    AlreadyEnrolledError,
    ClassTypeNotFoundError,
    ClassValidationError,
    EnrollmentNotFoundError,
    ScheduleNotFoundError,
    SessionFullError,
    SessionNotFoundError,
)
from infrastructure.persistence.class_repositories import DjangoORMClassRepository


@pytest.fixture
def repo():
    return DjangoORMClassRepository()


@pytest.fixture
def class_type(repo, org):
    dto = CreateClassTypeDTO(organization_id=org.id, name='Yoga', duration_minutes=60, capacity=2)
    return CreateClassTypeService(repo).execute(dto)


@pytest.mark.django_db
class TestCreateClassTypeService:
    def test_creates_class_type(self, repo, org):
        dto = CreateClassTypeDTO(organization_id=org.id, name='Spinning', capacity=15, duration_minutes=45)
        class_type = CreateClassTypeService(repo).execute(dto)
        assert class_type.id is not None
        assert class_type.name == 'Spinning'
        assert class_type.is_active is True

    def test_rejects_empty_name(self, repo, org):
        dto = CreateClassTypeDTO(organization_id=org.id, name='   ')
        with pytest.raises(ClassValidationError):
            CreateClassTypeService(repo).execute(dto)

    def test_rejects_zero_capacity(self, repo, org):
        dto = CreateClassTypeDTO(organization_id=org.id, name='X', capacity=0)
        with pytest.raises(ClassValidationError):
            CreateClassTypeService(repo).execute(dto)


@pytest.mark.django_db
class TestUpdateClassTypeService:
    def test_updates_fields(self, repo, class_type):
        dto = UpdateClassTypeDTO(class_type_id=class_type.id, organization_id=class_type.organization_id, capacity=30)
        updated = UpdateClassTypeService(repo).execute(dto)
        assert updated.capacity == 30
        assert updated.name == class_type.name

    def test_not_found_raises(self, repo, org):
        dto = UpdateClassTypeDTO(class_type_id=999999, organization_id=org.id, capacity=5)
        with pytest.raises(ClassTypeNotFoundError):
            UpdateClassTypeService(repo).execute(dto)


@pytest.mark.django_db
class TestDeactivateClassTypeService:
    def test_deactivates(self, repo, class_type):
        DeactivateClassTypeService(repo).execute(class_type.id, class_type.organization_id)
        refreshed = repo.get_class_type_by_id(class_type.id, class_type.organization_id)
        assert refreshed.is_active is False


@pytest.mark.django_db
class TestConfigureScheduleService:
    def test_creates_schedule(self, repo, class_type):
        dto = CreateScheduleDTO(
            organization_id=class_type.organization_id, class_type_id=class_type.id,
            weekday=0, start_time=time(7, 0),
        )
        schedule = ConfigureScheduleService(repo).execute(dto)
        assert schedule.id is not None
        assert schedule.weekday == 0
        assert schedule.is_active is True

    def test_rejects_invalid_weekday(self, repo, class_type):
        dto = CreateScheduleDTO(
            organization_id=class_type.organization_id, class_type_id=class_type.id,
            weekday=9, start_time=time(7, 0),
        )
        with pytest.raises(ClassValidationError):
            ConfigureScheduleService(repo).execute(dto)

    def test_class_type_not_found(self, repo, org):
        dto = CreateScheduleDTO(organization_id=org.id, class_type_id=999999, weekday=0, start_time=time(7, 0))
        with pytest.raises(ClassTypeNotFoundError):
            ConfigureScheduleService(repo).execute(dto)


@pytest.mark.django_db
class TestUpdateAndDeactivateScheduleService:
    def test_updates_start_time(self, repo, class_type):
        schedule = ConfigureScheduleService(repo).execute(
            CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                               weekday=0, start_time=time(7, 0))
        )
        updated = UpdateScheduleService(repo).execute(
            UpdateScheduleDTO(schedule_id=schedule.id, organization_id=class_type.organization_id, start_time=time(8, 0))
        )
        assert updated.start_time == time(8, 0)

    def test_not_found_raises(self, repo, org):
        with pytest.raises(ScheduleNotFoundError):
            UpdateScheduleService(repo).execute(UpdateScheduleDTO(schedule_id=999999, organization_id=org.id))

    def test_deactivate(self, repo, class_type):
        schedule = ConfigureScheduleService(repo).execute(
            CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                               weekday=0, start_time=time(7, 0))
        )
        DeactivateScheduleService(repo).execute(schedule.id, class_type.organization_id)
        refreshed = repo.get_schedule_by_id(schedule.id, class_type.organization_id)
        assert refreshed.is_active is False


@pytest.mark.django_db
class TestListSessionsService:
    def _next_weekday(self, weekday: int) -> date:
        today = timezone.localdate()
        days_ahead = (weekday - today.weekday()) % 7
        return today + timedelta(days=days_ahead)

    def test_generates_sessions_for_active_schedule(self, repo, class_type):
        target_date = self._next_weekday(0)
        ConfigureScheduleService(repo).execute(
            CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                               weekday=0, start_time=time(7, 0))
        )

        sessions = ListSessionsService(repo).execute(class_type.organization_id, target_date, target_date)

        assert len(sessions) == 1
        assert sessions[0].date == target_date
        assert sessions[0].class_type_id == class_type.id
        assert sessions[0].capacity == class_type.capacity
        assert sessions[0].enrolled_count == 0

    def test_is_idempotent_across_calls(self, repo, class_type):
        target_date = self._next_weekday(0)
        ConfigureScheduleService(repo).execute(
            CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                               weekday=0, start_time=time(7, 0))
        )

        ListSessionsService(repo).execute(class_type.organization_id, target_date, target_date)
        sessions = ListSessionsService(repo).execute(class_type.organization_id, target_date, target_date)

        assert len(sessions) == 1

    def test_ignores_inactive_schedule(self, repo, class_type):
        target_date = self._next_weekday(0)
        schedule = ConfigureScheduleService(repo).execute(
            CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                               weekday=0, start_time=time(7, 0))
        )
        DeactivateScheduleService(repo).execute(schedule.id, class_type.organization_id)

        sessions = ListSessionsService(repo).execute(class_type.organization_id, target_date, target_date)
        assert len(sessions) == 0


@pytest.fixture
def session(repo, class_type):
    schedule = ConfigureScheduleService(repo).execute(
        CreateScheduleDTO(organization_id=class_type.organization_id, class_type_id=class_type.id,
                           weekday=0, start_time=time(7, 0))
    )
    today = timezone.localdate()
    days_ahead = (schedule.weekday - today.weekday()) % 7
    target_date = today + timedelta(days=days_ahead)
    sessions = ListSessionsService(repo).execute(class_type.organization_id, target_date, target_date)
    return sessions[0]


@pytest.mark.django_db
class TestEnrollMemberService:
    def test_enrolls_member(self, repo, org, session, make_member):
        member = make_member(org)
        dto = EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        enrollment = EnrollMemberService(repo).execute(dto)
        assert enrollment.id is not None
        assert enrollment.status == 'booked'
        assert enrollment.member_id == member.id

    def test_rejects_when_session_full(self, repo, org, session, make_member):
        # class_type fixture usa capacity=2
        member1 = make_member(org, first_name='Ana', last_name='Uno')
        member2 = make_member(org, first_name='Bea', last_name='Dos')
        member3 = make_member(org, first_name='Cami', last_name='Tres')
        EnrollMemberService(repo).execute(EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member1.id))
        EnrollMemberService(repo).execute(EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member2.id))

        with pytest.raises(SessionFullError):
            EnrollMemberService(repo).execute(
                EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member3.id)
            )

    def test_rejects_duplicate_active_enrollment(self, repo, org, session, make_member):
        member = make_member(org)
        dto = EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        EnrollMemberService(repo).execute(dto)
        with pytest.raises(AlreadyEnrolledError):
            EnrollMemberService(repo).execute(dto)

    def test_allows_reenroll_after_cancel(self, repo, org, session, make_member):
        member = make_member(org)
        dto = EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        enrollment = EnrollMemberService(repo).execute(dto)

        CancelEnrollmentService(repo).execute(
            CancelEnrollmentDTO(enrollment_id=enrollment.id, organization_id=org.id)
        )
        # No debe fallar: la inscripción cancelada no cuenta como activa
        second = EnrollMemberService(repo).execute(dto)
        assert second.id != enrollment.id
        assert second.status == 'booked'

    def test_session_not_found(self, repo, org, make_member):
        member = make_member(org)
        with pytest.raises(SessionNotFoundError):
            EnrollMemberService(repo).execute(
                EnrollMemberDTO(organization_id=org.id, session_id=999999, member_id=member.id)
            )

    def test_rejects_enroll_in_cancelled_session(self, repo, org, session, make_member):
        member = make_member(org)
        CancelSessionService(repo).execute(CancelSessionDTO(session_id=session.id, organization_id=org.id))
        with pytest.raises(ClassValidationError):
            EnrollMemberService(repo).execute(
                EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
            )


@pytest.mark.django_db
class TestCancelEnrollmentService:
    def test_cancels_enrollment(self, repo, org, session, make_member):
        member = make_member(org)
        enrollment = EnrollMemberService(repo).execute(
            EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        )
        cancelled = CancelEnrollmentService(repo).execute(
            CancelEnrollmentDTO(enrollment_id=enrollment.id, organization_id=org.id)
        )
        assert cancelled.status == 'cancelled'

    def test_not_found_raises(self, repo, org):
        with pytest.raises(EnrollmentNotFoundError):
            CancelEnrollmentService(repo).execute(CancelEnrollmentDTO(enrollment_id=999999, organization_id=org.id))


@pytest.mark.django_db
class TestMarkAttendedService:
    def test_marks_attended(self, repo, org, session, make_member):
        member = make_member(org)
        enrollment = EnrollMemberService(repo).execute(
            EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        )
        attended = MarkAttendedService(repo).execute(
            MarkAttendedDTO(enrollment_id=enrollment.id, organization_id=org.id)
        )
        assert attended.status == 'attended'

    def test_rejects_cancelled_enrollment(self, repo, org, session, make_member):
        member = make_member(org)
        enrollment = EnrollMemberService(repo).execute(
            EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member.id)
        )
        CancelEnrollmentService(repo).execute(CancelEnrollmentDTO(enrollment_id=enrollment.id, organization_id=org.id))
        with pytest.raises(ClassValidationError):
            MarkAttendedService(repo).execute(MarkAttendedDTO(enrollment_id=enrollment.id, organization_id=org.id))


@pytest.mark.django_db
class TestCancelSessionService:
    def test_cancels_session_and_only_notifies_booked_enrollments(self, repo, org, session, make_member):
        member1 = make_member(org, first_name='Ana', last_name='Uno')
        member2 = make_member(org, first_name='Bea', last_name='Dos')
        e1 = EnrollMemberService(repo).execute(
            EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member1.id)
        )
        e2 = EnrollMemberService(repo).execute(
            EnrollMemberDTO(organization_id=org.id, session_id=session.id, member_id=member2.id)
        )
        CancelEnrollmentService(repo).execute(CancelEnrollmentDTO(enrollment_id=e2.id, organization_id=org.id))

        updated_session, notified = CancelSessionService(repo).execute(
            CancelSessionDTO(session_id=session.id, organization_id=org.id)
        )

        assert updated_session.status == 'cancelled'
        assert [e.id for e in notified] == [e1.id]
        assert repo.get_enrollment_by_id(e1.id, org.id).status == 'cancelled'
        # La ya cancelada sigue cancelada, no se toca ni se vuelve a notificar
        assert repo.get_enrollment_by_id(e2.id, org.id).status == 'cancelled'

    def test_not_found_raises(self, repo, org):
        with pytest.raises(SessionNotFoundError):
            CancelSessionService(repo).execute(CancelSessionDTO(session_id=999999, organization_id=org.id))
