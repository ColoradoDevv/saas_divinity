"""
Permisos DRF basados en el rol del JWT.

El claim `role` es inyectado por SimpleJWTTokenProvider.create_token_pair()
y está disponible en request.auth después de que JWTAuthentication corra.

Uso en ViewSets:
    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), ClientsModuleEnabled(), IsAdminOnly()]
        return [IsAuthenticated(), ClientsModuleEnabled(), IsAdminOrManager()]
"""

from rest_framework.permissions import BasePermission

from domain.organizations.entities import ROLE_ADMIN, ROLE_MANAGER


def _role(request) -> str | None:
    if request.auth is None:
        return None
    return request.auth.get('role')


class IsAdminOrManager(BasePermission):
    message = 'Se requiere rol admin o manager para esta acción.'

    def has_permission(self, request, view) -> bool:
        return _role(request) in (ROLE_ADMIN, ROLE_MANAGER)


class IsAdminOnly(BasePermission):
    message = 'Solo el rol admin puede realizar esta acción.'

    def has_permission(self, request, view) -> bool:
        return _role(request) == ROLE_ADMIN
