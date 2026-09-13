from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from application.classes.dtos import CancelEnrollmentDTO, EnrollMemberDTO
from application.classes.services import CancelEnrollmentService, EnrollMemberService, ListSessionsService
from apps.attendance.serializers import CheckInReadSerializer
from apps.billing.serializers import PaymentReadSerializer, SubscriptionReadSerializer
from apps.classes.serializers import EnrollmentReadSerializer, SessionReadSerializer
from apps.members.models import MemberModel
from domain.classes.exceptions import (
    AlreadyEnrolledError,
    ClassValidationError,
    EnrollmentNotFoundError,
    SessionFullError,
    SessionNotFoundError,
)
from infrastructure.authentication.member_portal_auth import IsMemberPortalUser, MemberPortalJWTAuthentication
from infrastructure.authentication.member_portal_jwt import MemberPortalTokenProvider
from infrastructure.persistence.attendance_repositories import DjangoORMAttendanceRepository
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository
from infrastructure.persistence.class_repositories import DjangoORMClassRepository

from .models import MemberPortalInvitationModel
from .serializers import AcceptPortalInviteSerializer, MemberPortalLoginSerializer

_PORTAL_AUTH = [MemberPortalJWTAuthentication]
_PORTAL_PERMS = [IsMemberPortalUser]


def _member_profile(member: MemberModel) -> dict:
    org = member.organization
    return {
        'id': member.id,
        'first_name': member.first_name,
        'last_name': member.last_name,
        'full_name': f'{member.first_name} {member.last_name}'.strip(),
        'email': member.email,
        'member_code': member.member_code,
        'status': member.status,
        'organization_name': org.name,
        'organization_logo_url': org.logo_url,
        'organization_currency': org.currency,
    }


class MemberPortalLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = MemberPortalLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            member = MemberModel.objects.select_related('organization', 'user').get(
                user__email__iexact=d['email'], user__is_active=True,
            )
        except MemberModel.DoesNotExist:
            raise AuthenticationFailed('Correo o contraseña incorrectos.')

        if not member.user.check_password(d['password']):
            raise AuthenticationFailed('Correo o contraseña incorrectos.')

        tokens = MemberPortalTokenProvider().create_token_pair(member)
        return Response({'tokens': tokens.to_primitives(), 'member': _member_profile(member)})


class MemberPortalAcceptInviteView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = AcceptPortalInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            invitation = MemberPortalInvitationModel.objects.select_related(
                'member', 'member__organization', 'member__user',
            ).get(token=d['token'])
        except MemberPortalInvitationModel.DoesNotExist:
            raise ValidationError({'token': 'Invitación no válida.'})

        if invitation.used:
            raise ValidationError({'token': 'Esta invitación ya fue utilizada.'})
        if invitation.expires_at < timezone.now():
            raise ValidationError({'token': 'Esta invitación ha expirado.'})

        member = invitation.member
        if member.user_id is None:
            raise ValidationError({'token': 'Esta invitación ya no es válida.'})

        member.user.set_password(d['password'])
        member.user.save(update_fields=['password'])

        invitation.used = True
        invitation.save(update_fields=['used'])

        tokens = MemberPortalTokenProvider().create_token_pair(member)
        return Response(
            {'tokens': tokens.to_primitives(), 'member': _member_profile(member)},
            status=status.HTTP_201_CREATED,
        )


class MemberPortalMeView(APIView):
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def get(self, request):
        return Response(_member_profile(request.member))


class MemberPortalBillingView(APIView):
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def get(self, request):
        member = request.member
        repo = DjangoORMBillingRepository()
        current = repo.get_current_subscription(member.id, member.organization_id)
        subscriptions = repo.list_subscriptions_for_member(member.id, member.organization_id)
        payments = repo.list_payments_for_member(member.id, member.organization_id)
        return Response({
            'current_subscription': SubscriptionReadSerializer(current.to_primitives()).data if current else None,
            'subscriptions': [SubscriptionReadSerializer(s.to_primitives()).data for s in subscriptions],
            'payments': [PaymentReadSerializer(p.to_primitives()).data for p in payments],
        })


class MemberPortalAttendanceView(APIView):
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def get(self, request):
        member = request.member
        repo = DjangoORMAttendanceRepository()
        checkins = repo.list_for_member(member.id, member.organization_id)
        return Response([CheckInReadSerializer(c.to_primitives()).data for c in checkins])


class MemberPortalSessionListView(APIView):
    """GET /api/member-portal/classes/sessions/?date_from=&date_to= (default: semana actual)"""
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def get(self, request):
        from apps.classes.models import ClassEnrollmentModel

        member = request.member
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
        sessions = ListSessionsService(repo).execute(member.organization_id, date_from, date_to)

        my_enrollments = {
            row['session_id']: row
            for row in ClassEnrollmentModel.objects.filter(
                member_id=member.id,
                session_id__in=[s.id for s in sessions],
                status__in=['booked', 'attended'],
            ).values('session_id', 'id', 'status')
        }

        data = []
        for s in sessions:
            row = SessionReadSerializer(s.to_primitives()).data
            my_enrollment = my_enrollments.get(s.id)
            row['my_enrollment_status'] = my_enrollment['status'] if my_enrollment else None
            row['my_enrollment_id'] = my_enrollment['id'] if my_enrollment else None
            data.append(row)
        return Response(data)


class MemberPortalEnrollView(APIView):
    """POST /api/member-portal/classes/sessions/<id>/enroll/ — el miembro se
    inscribe a sí mismo (member_id siempre viene de request.member, nunca
    del body, para que no pueda inscribir a otro miembro)."""
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def post(self, request, pk):
        member = request.member
        repo = DjangoORMClassRepository()
        dto = EnrollMemberDTO(organization_id=member.organization_id, session_id=int(pk), member_id=member.id)
        try:
            enrollment = EnrollMemberService(repo).execute(dto)
        except SessionNotFoundError:
            raise NotFound(detail='Sesión no encontrada.')
        except (SessionFullError, AlreadyEnrolledError, ClassValidationError) as exc:
            raise ValidationError(detail=str(exc))
        return Response(EnrollmentReadSerializer(enrollment.to_primitives()).data, status=status.HTTP_201_CREATED)


class MemberPortalCancelEnrollmentView(APIView):
    """POST /api/member-portal/classes/enrollments/<id>/cancel/ — solo puede
    cancelar su propia inscripción."""
    authentication_classes = _PORTAL_AUTH
    permission_classes = _PORTAL_PERMS

    def post(self, request, pk):
        member = request.member
        repo = DjangoORMClassRepository()
        enrollment = repo.get_enrollment_by_id(int(pk), member.organization_id)
        if enrollment is None:
            raise NotFound(detail='Inscripción no encontrada.')
        if enrollment.member_id != member.id:
            raise PermissionDenied(detail='No puedes cancelar la inscripción de otro miembro.')

        dto = CancelEnrollmentDTO(enrollment_id=int(pk), organization_id=member.organization_id)
        try:
            cancelled = CancelEnrollmentService(repo).execute(dto)
        except EnrollmentNotFoundError:
            raise NotFound(detail='Inscripción no encontrada.')
        return Response(EnrollmentReadSerializer(cancelled.to_primitives()).data)
