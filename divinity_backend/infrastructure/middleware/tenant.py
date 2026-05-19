"""
Middleware de tenant para multi-tenancy.

Responsabilidades:
  1. Extraer organization_id del JWT (sin depender de DRF — parsea el header directamente).
  2. Verificar que la organización existe, is_active=True y payment_status != 'overdue'.
  3. Inyectar request.organization para que las vistas lo consuman sin repetir esta lógica.
  4. Escribir user_id y org_id en thread-locals para el sistema de audit logs.
     Los thread-locals se limpian antes y después de cada request.

Caminos exentos (no tienen contexto de tenant):
  - /admin/         — Django admin
  - /api/auth/      — login, refresh, forgot-password, switch-org
  - /media/         — archivos estáticos

Módulo-gating (B2):
  RequireModule(module_key) — DRF BasePermission que verifica que el módulo
  esté habilitado en request.organization.enabled_modules.
"""

from django.http import JsonResponse
from rest_framework.permissions import BasePermission

from infrastructure.audit.thread_locals import clear_audit_context, set_audit_context

_EXEMPT_PREFIXES = ('/admin/', '/api/auth/', '/media/')


def _decode_bearer_token(request):
    """Parsea el header Authorization y devuelve el AccessToken decodificado o None."""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    token_str = auth_header[7:]
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        return AccessToken(token_str)
    except Exception:
        return None


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clear_audit_context()
        try:
            return self._handle(request)
        finally:
            clear_audit_context()

    def _handle(self, request):
        if any(request.path.startswith(p) for p in _EXEMPT_PREFIXES):
            return self.get_response(request)

        token = _decode_bearer_token(request)
        if token is None:
            return self.get_response(request)

        org_id = token.get('organization_id')
        if org_id is None:
            return self.get_response(request)

        org_id = int(org_id)

        from apps.organizations.models import OrganizationModel
        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            return JsonResponse(
                {'detail': 'Organización no encontrada. Inicia sesión nuevamente.'},
                status=403,
            )

        if not org.is_active:
            return JsonResponse(
                {'detail': 'Tu organización está inactiva. Contacta al administrador.'},
                status=403,
            )

        if org.payment_status == 'overdue':
            return JsonResponse(
                {'detail': 'Tu plan de pago está vencido. Actualiza tu método de pago para continuar.'},
                status=402,
            )

        request.organization = org

        user_id = token.get('user_id')
        set_audit_context(
            user_id=int(user_id) if user_id is not None else None,
            org_id=org.id,
        )

        return self.get_response(request)


class RequireModule(BasePermission):
    """
    Uso: permission_classes = [IsAuthenticated, RequireModule('clients')]

    Acepta también una subclase para inyectar el módulo como atributo de clase:
        class ClientsModuleEnabled(RequireModule):
            module = 'clients'
    """
    module: str = ''

    def __init_subclass__(cls, module: str = '', **kwargs):
        super().__init_subclass__(**kwargs)
        if module:
            cls.module = module

    def has_permission(self, request, view):
        org = getattr(request, 'organization', None)
        if org is None:
            return False
        if not self.module:
            return True
        return self.module in (org.enabled_modules or [])


def module_permission(module_key: str) -> type[RequireModule]:
    """Fábrica: devuelve una clase de permiso DRF para el módulo dado."""
    return type(
        f'{module_key.title()}ModuleEnabled',
        (RequireModule,),
        {'module': module_key},
    )
