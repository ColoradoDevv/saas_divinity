from datetime import date, timedelta

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

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
from infrastructure.middleware.tenant import module_permission
from infrastructure.notifications.email_service import send_class_cancelled_email
from infrastructure.permissions.roles import IsAdminOnly, staff_module_action_permission
from infrastructure.persistence.class_repositories import DjangoORMClassRepository

from .serializers import (
    ClassTypeReadSerializer,
    ClassTypeUpdateSerializer,
    ClassTypeWriteSerializer,
    EnrollmentReadSerializer,
    EnrollMemberSerializer,
    ScheduleReadSerializer,
    ScheduleUpdateSerializer,
    ScheduleWriteSerializer,
    SessionDetailSerializer,
    SessionReadSerializer,
)

ClassesModuleEnabled = module_permission('classes')

_AUTH = permissions.IsAuthenticated
_MOD = ClassesModuleEnabled

_CAN_VIEW = staff_module_action_permission('classes', 'view')
_CAN_CREATE = staff_module_action_permission('classes', 'create')
_CAN_EDIT = staff_module_action_permission('classes', 'edit')
_ADMIN_PERMS = [_AUTH, _MOD, IsAdminOnly]


def _org_id(request) -> int:
    org = getattr(request, 'organization', None)
    if org is None:
        raise PermissionDenied(
            detail='Tu sesión no tiene contexto de organización. Inicia sesión nuevamente.'
        )
    return org.id


# ------------------------------------------------------------------ #
# ClassTypeViewSet — CRUD, admin-only                                  #
# ------------------------------------------------------------------ #

class ClassTypeViewSet(viewsets.ViewSet):
    permission_classes = _ADMIN_PERMS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMClassRepository()

    def list(self, request):
        org_id = _org_id(request)
        class_types = self._repo.list_class_types(org_id)
        return Response([ClassTypeReadSerializer(c.to_primitives()).data for c in class_types])

    def create(self, request):
        org_id = _org_id(request)
        serializer = ClassTypeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CreateClassTypeDTO(
            organization_id=org_id,
            name=d['name'],
            description=d.get('description', ''),
            instructor_id=d.get('instructor_id'),
            duration_minutes=d['duration_minutes'],
            capacity=d['capacity'],
        )
        try:
            class_type = CreateClassTypeService(self._repo).execute(dto)
        except ClassValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(ClassTypeReadSerializer(class_type.to_primitives()).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        org_id = _org_id(request)
        serializer = ClassTypeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = UpdateClassTypeDTO(
            class_type_id=int(pk),
            organization_id=org_id,
            name=d.get('name'),
            description=d.get('description'),
            instructor_id=d.get('instructor_id'),
            duration_minutes=d.get('duration_minutes'),
            capacity=d.get('capacity'),
            is_active=d.get('is_active'),
        )
        try:
            class_type = UpdateClassTypeService(self._repo).execute(dto)
        except ClassTypeNotFoundError:
            raise NotFound(detail='Tipo de clase no encontrado.')
        except ClassValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(ClassTypeReadSerializer(class_type.to_primitives()).data)

    def destroy(self, request, pk=None):
        org_id = _org_id(request)
        DeactivateClassTypeService(self._repo).execute(int(pk), org_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------ #
# ScheduleViewSet — CRUD, admin-only                                   #
# ------------------------------------------------------------------ #

class ScheduleViewSet(viewsets.ViewSet):
    permission_classes = _ADMIN_PERMS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMClassRepository()

    def list(self, request):
        org_id = _org_id(request)
        schedules = self._repo.list_schedules(org_id)
        return Response([ScheduleReadSerializer(s.to_primitives()).data for s in schedules])

    def create(self, request):
        org_id = _org_id(request)
        serializer = ScheduleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CreateScheduleDTO(
            organization_id=org_id,
            class_type_id=d['class_type_id'],
            weekday=d['weekday'],
            start_time=d['start_time'],
        )
        try:
            schedule = ConfigureScheduleService(self._repo).execute(dto)
        except ClassTypeNotFoundError:
            raise NotFound(detail='Tipo de clase no encontrado.')
        except ClassValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(ScheduleReadSerializer(schedule.to_primitives()).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        org_id = _org_id(request)
        serializer = ScheduleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = UpdateScheduleDTO(
            schedule_id=int(pk),
            organization_id=org_id,
            weekday=d.get('weekday'),
            start_time=d.get('start_time'),
            is_active=d.get('is_active'),
        )
        try:
            schedule = UpdateScheduleService(self._repo).execute(dto)
        except ScheduleNotFoundError:
            raise NotFound(detail='Horario no encontrado.')
        except ClassValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(ScheduleReadSerializer(schedule.to_primitives()).data)

    def destroy(self, request, pk=None):
        org_id = _org_id(request)
        DeactivateScheduleService(self._repo).execute(int(pk), org_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------ #
# Sessions (calendario)                                                #
# ------------------------------------------------------------------ #

class SessionListView(APIView):
    """GET /api/classes/sessions/?date_from=&date_to= (default: semana actual, lunes a domingo)"""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        today = timezone.localdate()

        def _parse(value, default):
            if not value:
                return default
            try:
                return date.fromisoformat(value)
            except ValueError:
                return default

        week_start = today - timedelta(days=today.weekday())
        date_from = _parse(request.query_params.get('date_from'), week_start)
        date_to = _parse(request.query_params.get('date_to'), date_from + timedelta(days=6))
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        if (date_to - date_from).days > 90:
            date_to = date_from + timedelta(days=90)

        repo = DjangoORMClassRepository()
        sessions = ListSessionsService(repo).execute(org_id, date_from, date_to)
        return Response([SessionReadSerializer(s.to_primitives()).data for s in sessions])


class SessionDetailView(APIView):
    """GET /api/classes/sessions/<id>/ — incluye la lista de inscripciones."""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request, pk):
        org_id = _org_id(request)
        repo = DjangoORMClassRepository()
        session = repo.get_session_by_id(int(pk), org_id)
        if session is None:
            raise NotFound(detail='Sesión no encontrada.')

        enrollments = repo.list_enrollments_for_session(session.id)
        data = session.to_primitives()
        data['enrollments'] = [e.to_primitives() for e in enrollments]
        return Response(SessionDetailSerializer(data).data)


class SessionEnrollView(APIView):
    """POST /api/classes/sessions/<id>/enroll/ — body: {member_id}"""
    permission_classes = [_AUTH, _MOD, _CAN_CREATE]

    def post(self, request, pk):
        org_id = _org_id(request)
        serializer = EnrollMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = EnrollMemberDTO(organization_id=org_id, session_id=int(pk), member_id=d['member_id'])
        repo = DjangoORMClassRepository()
        try:
            enrollment = EnrollMemberService(repo).execute(dto)
        except SessionNotFoundError:
            raise NotFound(detail='Sesión no encontrada.')
        except (SessionFullError, AlreadyEnrolledError, ClassValidationError) as exc:
            raise ValidationError(detail=str(exc))
        return Response(EnrollmentReadSerializer(enrollment.to_primitives()).data, status=status.HTTP_201_CREATED)


class SessionCancelView(APIView):
    """POST /api/classes/sessions/<id>/cancel/ — cancela la sesión y avisa por
    email a cada miembro que tenía una reserva activa."""
    permission_classes = [_AUTH, _MOD, _CAN_EDIT]

    def post(self, request, pk):
        org_id = _org_id(request)
        repo = DjangoORMClassRepository()
        dto = CancelSessionDTO(session_id=int(pk), organization_id=org_id)
        try:
            session, notified_enrollments = CancelSessionService(repo).execute(dto)
        except SessionNotFoundError:
            raise NotFound(detail='Sesión no encontrada.')

        for enrollment in notified_enrollments:
            send_class_cancelled_email(
                to_email=enrollment.member_email,
                first_name=enrollment.member_name.split(' ')[0] if enrollment.member_name else '',
                class_name=session.class_type_name,
                session_date=session.date,
                session_time=session.start_time,
            )
        return Response(SessionReadSerializer(session.to_primitives()).data)


# ------------------------------------------------------------------ #
# Enrollment actions                                                   #
# ------------------------------------------------------------------ #

class EnrollmentCancelView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_EDIT]

    def post(self, request, pk):
        org_id = _org_id(request)
        repo = DjangoORMClassRepository()
        dto = CancelEnrollmentDTO(enrollment_id=int(pk), organization_id=org_id)
        try:
            enrollment = CancelEnrollmentService(repo).execute(dto)
        except EnrollmentNotFoundError:
            raise NotFound(detail='Inscripción no encontrada.')
        return Response(EnrollmentReadSerializer(enrollment.to_primitives()).data)


class EnrollmentAttendView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_EDIT]

    def post(self, request, pk):
        org_id = _org_id(request)
        repo = DjangoORMClassRepository()
        dto = MarkAttendedDTO(enrollment_id=int(pk), organization_id=org_id)
        try:
            enrollment = MarkAttendedService(repo).execute(dto)
        except EnrollmentNotFoundError:
            raise NotFound(detail='Inscripción no encontrada.')
        except ClassValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(EnrollmentReadSerializer(enrollment.to_primitives()).data)
