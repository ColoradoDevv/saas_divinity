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

ROLE_STAFF = 'staff'


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


def staff_module_action_permission(module_key: str, action: str) -> type[BasePermission]:
    """
    Fábrica de permisos para acciones granulares por módulo.

    Pasa si:
      - El rol es admin o manager (siempre), O
      - El rol es staff Y el módulo está en worker_allowed_modules Y
        la acción está en worker_module_permissions[module_key]

    Uso en ViewSets:
        CanViewMembers  = staff_module_action_permission('clients', 'view')
        CanCreateMember = staff_module_action_permission('clients', 'create')
    """
    class _Permission(BasePermission):
        message = f'No tienes permiso para realizar esta acción en el módulo {module_key}.'

        def has_permission(self, request, view) -> bool:
            role = _role(request)
            if role in (ROLE_ADMIN, ROLE_MANAGER):
                return True
            if role == ROLE_STAFF:
                allowed = getattr(request, 'worker_allowed_modules', []) or []
                if module_key not in allowed:
                    return False
                perms = getattr(request, 'worker_module_permissions', {}) or {}
                return action in perms.get(module_key, [])
            return False

    _Permission.__name__ = f'{module_key.title()}{action.title()}Permission'
    _Permission.__qualname__ = _Permission.__name__
    return _Permission
