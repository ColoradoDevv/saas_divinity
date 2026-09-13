"""
Autenticación y permiso exclusivos del portal de autoservicio del miembro.

No se registran en DEFAULT_AUTHENTICATION_CLASSES — solo las vistas bajo
/api/member-portal/ los declaran explícitamente en authentication_classes.
Esto es intencional: un token de staff/admin (con user_id/role) nunca pasa
por acá, y un token del portal (con member_id/token_type) nunca es
resoluble por la autenticación JWT estándar que usa el resto del backend.
"""

from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.members.models import MemberModel

from .member_portal_jwt import MEMBER_PORTAL_TOKEN_KIND


class MemberPortalJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        try:
            token = AccessToken(auth_header[7:])
        except TokenError:
            raise AuthenticationFailed('Token inválido o expirado.')

        if token.get('kind') != MEMBER_PORTAL_TOKEN_KIND:
            # No es un token del portal — dejar pasar sin credenciales para
            # que la vista (gateada por IsMemberPortalUser) lo rechace.
            return None

        member_id = token.get('member_id')
        organization_id = token.get('organization_id')
        if member_id is None or organization_id is None:
            raise AuthenticationFailed('Token del portal inválido.')

        try:
            member = MemberModel.objects.select_related('organization').get(
                pk=member_id, organization_id=organization_id,
            )
        except MemberModel.DoesNotExist:
            raise AuthenticationFailed('Miembro no encontrado.')

        request.member = member
        # request.user se deja como AnonymousUser a propósito: los throttles
        # por defecto de DRF (UserRateThrottle/AnonRateThrottle, aplicados a
        # cualquier vista que no los sobreescriba) llaman a
        # request.user.is_authenticated — MemberModel no tiene ese atributo y
        # rompería con AttributeError. Las vistas del portal siempre deben
        # leer request.member, nunca request.user.
        return (AnonymousUser(), token)


class IsMemberPortalUser(BasePermission):
    message = 'Se requiere una sesión válida del portal del miembro.'

    def has_permission(self, request, view) -> bool:
        return getattr(request, 'member', None) is not None
