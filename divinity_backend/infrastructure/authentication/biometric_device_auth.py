"""
Autenticación exclusiva de dispositivos biométricos (terminales o el agente
local de un lector USB). No es JWT: el dispositivo no es una persona ni tiene
rol — se autentica con una clave opaca propia (ver
apps/attendance/models.py::BiometricDeviceModel.set_device_key /
check_device_key). Al no llevar user_id/role tampoco puede autenticar contra
ningún endpoint existente, y ningún JWT de staff/portal puede autenticar acá
— mismo aislamiento ya usado para el portal del miembro
(infrastructure/authentication/member_portal_auth.py).
"""

from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission

from apps.attendance.models import BiometricDeviceModel


class BiometricDeviceKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        raw_key = auth_header[7:]
        device_id_str, sep, secret = raw_key.partition(':')
        if not sep or not secret or not device_id_str.isdigit():
            return None

        try:
            device = BiometricDeviceModel.objects.select_related('organization').get(
                pk=int(device_id_str), is_active=True,
            )
        except BiometricDeviceModel.DoesNotExist:
            raise AuthenticationFailed('Dispositivo no encontrado o desactivado.')

        if not device.check_device_key(secret):
            raise AuthenticationFailed('Clave de dispositivo inválida.')

        request.biometric_device = device
        # request.user se deja como AnonymousUser a propósito — ver el mismo
        # comentario en member_portal_auth.py: los throttles por defecto de
        # DRF llaman a request.user.is_authenticated, que un objeto de
        # negocio no tiene. Las vistas de dispositivos deben leer siempre
        # request.biometric_device, nunca request.user.
        return (AnonymousUser(), None)


class IsBiometricDevice(BasePermission):
    message = 'Se requiere una clave válida de dispositivo biométrico.'

    def has_permission(self, request, view) -> bool:
        return getattr(request, 'biometric_device', None) is not None
