import secrets
from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from application.attendance.dtos import CheckInDTO
from application.attendance.services import CheckInService
from domain.attendance.exceptions import CheckInValidationError, MemberNotFoundForCheckInError
from infrastructure.authentication.biometric_device_auth import (
    BiometricDeviceKeyAuthentication,
    IsBiometricDevice,
)
from infrastructure.middleware.tenant import module_permission
from infrastructure.permissions.roles import IsAdminOnly, staff_module_action_permission
from infrastructure.persistence.attendance_repositories import DjangoORMAttendanceRepository
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository
from infrastructure.persistence.member_repositories import DjangoORMMemberRepository

from .serializers import (
    BiometricDeviceReadSerializer,
    BiometricDeviceUpdateSerializer,
    BiometricDeviceWriteSerializer,
    CheckInReadSerializer,
    CheckInWriteSerializer,
    DeviceEventSerializer,
    MemberEnrollmentReadSerializer,
    MemberEnrollmentWriteSerializer,
)

AttendanceModuleEnabled = module_permission('attendance')
BiometricDevicesModuleEnabled = module_permission('biometric_devices')

_AUTH = permissions.IsAuthenticated
_MOD = AttendanceModuleEnabled
_CAN_VIEW = staff_module_action_permission('attendance', 'view')
_CAN_CREATE = staff_module_action_permission('attendance', 'create')
_BIOMETRIC_ADMIN_PERMS = [_AUTH, BiometricDevicesModuleEnabled, IsAdminOnly]


def _org_id(request) -> int:
    org = getattr(request, 'organization', None)
    if org is None:
        raise PermissionDenied(
            detail='Tu sesión no tiene contexto de organización. Inicia sesión nuevamente.'
        )
    return org.id


class CheckInView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_CREATE]

    def post(self, request):
        org_id = _org_id(request)
        serializer = CheckInWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CheckInDTO(
            organization_id=org_id,
            method=d['method'],
            member_id=d.get('member_id'),
            member_code=d.get('member_code'),
            registered_by_id=request.user.id if request.user.is_authenticated else None,
        )
        service = CheckInService(DjangoORMAttendanceRepository(), DjangoORMMemberRepository())
        try:
            checkin = service.execute(dto)
        except MemberNotFoundForCheckInError:
            raise NotFound(detail='No se encontró un miembro con ese identificador.')
        except CheckInValidationError as exc:
            raise ValidationError(detail=str(exc))

        # Estado de suscripción, para el aviso verde/rojo en mostrador — no bloquea el check-in.
        subscription = DjangoORMBillingRepository().get_current_subscription(checkin.member_id, org_id)
        subscription_status = subscription.display_status if subscription else 'no_subscription'

        return Response(
            {
                'checkin': CheckInReadSerializer(checkin.to_primitives()).data,
                'subscription_status': subscription_status,
            },
            status=status.HTTP_201_CREATED,
        )


class TodayAttendanceView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        checkins = DjangoORMAttendanceRepository().list_today(org_id)
        return Response([CheckInReadSerializer(c.to_primitives()).data for c in checkins])


class MemberAttendanceHistoryView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request, member_id):
        org_id = _org_id(request)
        checkins = DjangoORMAttendanceRepository().list_for_member(int(member_id), org_id)
        return Response([CheckInReadSerializer(c.to_primitives()).data for c in checkins])


_WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


def get_weekday_breakdown(organization_id: int, days: int = 30) -> list[dict]:
    """
    Se agrupa en Python (no en el SQL) a propósito: la extracción de día de
    semana en el ORM de Django numera distinto según el motor de base de
    datos (sqlite vs postgres), y con el volumen de check-ins de un solo
    gimnasio este enfoque es simple, portable y suficientemente rápido.
    Función standalone para que pueda reutilizarse desde la exportación de
    reportes de apps/billing sin duplicar la consulta.
    """
    from .models import CheckInModel

    since = timezone.localdate() - timedelta(days=days)
    checked_in_ats = CheckInModel.objects.filter(
        organization_id=organization_id, checked_in_at__date__gte=since,
    ).values_list('checked_in_at', flat=True)

    counts = [0] * 7
    for checked_in_at in checked_in_ats:
        counts[timezone.localtime(checked_in_at).weekday()] += 1

    return [{'weekday': i, 'label': _WEEKDAY_LABELS[i], 'count': counts[i]} for i in range(7)]


class AttendanceByWeekdayReportView(APIView):
    """GET /api/attendance/reports/by-weekday/?days=30"""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
        days = max(1, min(days, 365))

        return Response(get_weekday_breakdown(org_id, days))


# ------------------------------------------------------------------ #
# Dispositivos biométricos — complemento, gateado con su propio módulo #
# ('biometric_devices'), otorgable solo por el superadmin (ver         #
# domain/organizations/verticals.py::get_grantable_module_keys).       #
# ------------------------------------------------------------------ #

def _device_to_primitives(device) -> dict:
    return {
        'id': device.id,
        'name': device.name,
        'is_active': device.is_active,
        'last_seen_at': device.last_seen_at,
        'created_at': device.created_at,
    }


def _enrollment_to_primitives(enrollment) -> dict:
    return {
        'id': enrollment.id,
        'device_id': enrollment.device_id,
        'device_name': enrollment.device.name,
        'member_id': enrollment.member_id,
        'member_name': f'{enrollment.member.first_name} {enrollment.member.last_name}'.strip(),
        'external_user_id': enrollment.external_user_id,
        'created_at': enrollment.created_at,
    }


class BiometricDeviceViewSet(viewsets.ViewSet):
    permission_classes = _BIOMETRIC_ADMIN_PERMS

    def _get_device(self, request, pk):
        from .models import BiometricDeviceModel
        org_id = _org_id(request)
        try:
            return BiometricDeviceModel.objects.get(pk=pk, organization_id=org_id)
        except BiometricDeviceModel.DoesNotExist:
            raise NotFound(detail='Dispositivo no encontrado.')

    def list(self, request):
        from .models import BiometricDeviceModel
        org_id = _org_id(request)
        devices = BiometricDeviceModel.objects.filter(organization_id=org_id)
        return Response([BiometricDeviceReadSerializer(_device_to_primitives(d)).data for d in devices])

    def create(self, request):
        from .models import BiometricDeviceModel
        org_id = _org_id(request)
        serializer = BiometricDeviceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        device = BiometricDeviceModel(organization_id=org_id, name=d['name'])
        raw_secret = secrets.token_urlsafe(32)
        device.set_device_key(raw_secret)
        device.save()

        data = BiometricDeviceReadSerializer(_device_to_primitives(device)).data
        data['device_key'] = f'{device.id}:{raw_secret}'
        return Response(data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        device = self._get_device(request, pk)
        serializer = BiometricDeviceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        for field, value in d.items():
            setattr(device, field, value)
        device.save()
        return Response(BiometricDeviceReadSerializer(_device_to_primitives(device)).data)

    def rotate_key(self, request, pk=None):
        device = self._get_device(request, pk)
        raw_secret = secrets.token_urlsafe(32)
        device.set_device_key(raw_secret)
        device.save(update_fields=['device_key_hash'])

        data = BiometricDeviceReadSerializer(_device_to_primitives(device)).data
        data['device_key'] = f'{device.id}:{raw_secret}'
        return Response(data)


class DeviceEnrollmentViewSet(viewsets.ViewSet):
    """Bajo /api/attendance/devices/<device_pk>/enrollments/"""
    permission_classes = _BIOMETRIC_ADMIN_PERMS

    def _get_device(self, request, device_pk):
        from .models import BiometricDeviceModel
        org_id = _org_id(request)
        try:
            return BiometricDeviceModel.objects.get(pk=device_pk, organization_id=org_id)
        except BiometricDeviceModel.DoesNotExist:
            raise NotFound(detail='Dispositivo no encontrado.')

    def list(self, request, device_pk=None):
        from .models import MemberBiometricEnrollmentModel
        device = self._get_device(request, device_pk)
        enrollments = (
            MemberBiometricEnrollmentModel.objects
            .select_related('member', 'device')
            .filter(device=device)
        )
        return Response([MemberEnrollmentReadSerializer(_enrollment_to_primitives(e)).data for e in enrollments])

    def create(self, request, device_pk=None):
        from apps.members.models import MemberModel
        from .models import MemberBiometricEnrollmentModel

        device = self._get_device(request, device_pk)
        org_id = _org_id(request)
        serializer = MemberEnrollmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            member = MemberModel.objects.get(pk=d['member_id'], organization_id=org_id)
        except MemberModel.DoesNotExist:
            raise NotFound(detail='Miembro no encontrado.')

        try:
            enrollment = MemberBiometricEnrollmentModel.objects.create(
                device=device, member=member, external_user_id=d['external_user_id'],
            )
        except IntegrityError:
            raise ValidationError(detail='Ese miembro o ese id externo ya están enrolados en este dispositivo.')

        enrollment = (
            MemberBiometricEnrollmentModel.objects
            .select_related('member', 'device')
            .get(pk=enrollment.pk)
        )
        return Response(
            MemberEnrollmentReadSerializer(_enrollment_to_primitives(enrollment)).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, device_pk=None, pk=None):
        from .models import MemberBiometricEnrollmentModel
        device = self._get_device(request, device_pk)
        deleted, _ = MemberBiometricEnrollmentModel.objects.filter(pk=pk, device=device).delete()
        if not deleted:
            raise NotFound(detail='Enrolamiento no encontrado.')
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemberEnrollmentListView(APIView):
    """GET /api/attendance/members/<member_id>/enrollments/ — todos los
    dispositivos en los que ese miembro ya está enrolado (para la ficha del
    miembro del lado staff)."""
    permission_classes = [_AUTH, BiometricDevicesModuleEnabled, _CAN_VIEW]

    def get(self, request, member_id):
        from .models import MemberBiometricEnrollmentModel
        org_id = _org_id(request)
        enrollments = (
            MemberBiometricEnrollmentModel.objects
            .select_related('member', 'device')
            .filter(member_id=member_id, device__organization_id=org_id)
        )
        return Response([MemberEnrollmentReadSerializer(_enrollment_to_primitives(e)).data for e in enrollments])


class DeviceEventIngestView(APIView):
    """POST /api/attendance/devices/events/ — el contrato estable que
    cualquier terminal o el agente local de un lector USB debe poder llamar,
    autenticado con la clave del dispositivo (no un JWT de staff)."""
    authentication_classes = [BiometricDeviceKeyAuthentication]
    permission_classes = [IsBiometricDevice]

    def post(self, request):
        from .models import MemberBiometricEnrollmentModel

        device = request.biometric_device
        serializer = DeviceEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        external_user_id = serializer.validated_data['external_user_id']

        try:
            enrollment = MemberBiometricEnrollmentModel.objects.select_related('member').get(
                device=device, external_user_id=external_user_id,
            )
        except MemberBiometricEnrollmentModel.DoesNotExist:
            raise NotFound(detail=f'El id "{external_user_id}" no está enrolado en este dispositivo.')

        device.last_seen_at = timezone.now()
        device.save(update_fields=['last_seen_at'])

        dto = CheckInDTO(
            organization_id=device.organization_id,
            method='fingerprint',
            member_id=enrollment.member_id,
            registered_by_id=None,
        )
        service = CheckInService(DjangoORMAttendanceRepository(), DjangoORMMemberRepository())
        try:
            checkin = service.execute(dto)
        except MemberNotFoundForCheckInError:
            raise NotFound(detail='No se encontró un miembro con ese identificador.')
        except CheckInValidationError as exc:
            raise ValidationError(detail=str(exc))

        return Response(CheckInReadSerializer(checkin.to_primitives()).data, status=status.HTTP_201_CREATED)
