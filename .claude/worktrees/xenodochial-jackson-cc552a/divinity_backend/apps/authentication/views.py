import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from application.authentication.dtos import LoginDTO
from application.authentication.services import AuthService
from domain.authentication.exceptions import (
    InvalidCredentialsError,
    NoMembershipFound,
    UserNotFoundError,
)
from infrastructure.authentication.jwt import SimpleJWTTokenProvider
from infrastructure.persistence.organization_repositories import DjangoORMOrganizationRepository
from infrastructure.persistence.user_repositories import DjangoORMUserRepository

from .serializers import (
    AuthSessionSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    MeResponseSerializer,
)

logger = logging.getLogger(__name__)
UserModel = get_user_model()


def _build_auth_service() -> AuthService:
    return AuthService(
        user_repository=DjangoORMUserRepository(),
        token_provider=SimpleJWTTokenProvider(),
        organization_repository=DjangoORMOrganizationRepository(),
    )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dto = LoginDTO(**serializer.validated_data)

        try:
            auth_session = _build_auth_service().login(dto)
        except InvalidCredentialsError as exc:
            raise AuthenticationFailed(detail=str(exc))
        except NoMembershipFound as exc:
            raise PermissionDenied(detail=str(exc))

        primitives = auth_session.to_primitives()

        # Para staff: enriquecer la respuesta del login con position y allowed_modules
        if primitives.get('membership') and primitives['membership'].get('role') == 'staff':
            from apps.workers.models import WorkerModel
            org_id = primitives['membership']['organization']['id']
            try:
                worker = WorkerModel.objects.get(user_id=auth_session.user.id, organization_id=org_id)
                primitives['membership']['position'] = worker.position or None
                primitives['membership']['allowed_modules'] = worker.allowed_modules
            except WorkerModel.DoesNotExist:
                primitives['membership']['position'] = None
                primitives['membership']['allowed_modules'] = primitives['membership']['organization'].get('enabled_modules', [])
        elif primitives.get('membership'):
            primitives['membership']['position'] = None
            primitives['membership']['allowed_modules'] = None

        output = AuthSessionSerializer(primitives).data
        return Response(output, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        service = _build_auth_service()

        try:
            user = service.get_authenticated_user(request.user.id)
        except UserNotFoundError as exc:
            raise NotFound(detail=str(exc))

        org_repo = DjangoORMOrganizationRepository()
        membership = org_repo.get_primary_membership(request.user.id)

        membership_data = None
        if membership:
            membership_data = membership.to_primitives()
            # Para usuarios staff, buscar sus módulos permitidos en el perfil de trabajador
            if membership.role == 'staff':
                from apps.workers.models import WorkerModel
                try:
                    worker = WorkerModel.objects.get(
                        user=request.user,
                        organization_id=membership.organization.id,
                    )
                    membership_data['allowed_modules'] = worker.allowed_modules
                    membership_data['position'] = worker.position or None
                except WorkerModel.DoesNotExist:
                    membership_data['allowed_modules'] = membership.organization.enabled_modules
                    membership_data['position'] = None
            else:
                membership_data['allowed_modules'] = None
                membership_data['position'] = None

        data = {
            'user': user.to_primitives(),
            'membership': membership_data,
        }
        output = MeResponseSerializer(data).data
        return Response(output, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = UserModel.objects.get(email__iexact=email, is_active=True)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            logger.info(
                'Password reset requested for %s — uid=%s token=%s',
                email, uid, token,
            )
        except UserModel.DoesNotExist:
            pass

        return Response(
            {'detail': 'Si el correo existe, recibirás las instrucciones en breve.'},
            status=status.HTTP_200_OK,
        )


# ─── Multi-org endpoints ──────────────────────────────────────────────────────

class UserOrganizationsView(APIView):
    """GET /api/auth/organizations/ — memberships activas del usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.organizations.models import MembershipModel

        memberships = (
            MembershipModel.objects
            .filter(user=request.user, is_active=True, organization__is_active=True)
            .select_related('organization')
            .order_by('joined_at')
        )
        data = [
            {
                'id': m.organization.id,
                'name': m.organization.name,
                'slug': m.organization.slug,
                'role': m.role,
            }
            for m in memberships
        ]
        return Response(data)


class SwitchOrgView(APIView):
    """POST /api/auth/switch-org/ — cambia el contexto de organización en el token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.organizations.models import MembershipModel

        from domain.authentication.entities import AuthenticatedUser
        from domain.organizations.entities import Membership as MembershipEntity
        from domain.organizations.entities import Organization as OrganizationEntity

        org_id = request.data.get('organization_id')
        if not org_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'organization_id': 'Este campo es requerido.'})

        try:
            membership = (
                MembershipModel.objects
                .select_related('organization')
                .get(
                    user=request.user,
                    organization_id=org_id,
                    is_active=True,
                    organization__is_active=True,
                )
            )
        except MembershipModel.DoesNotExist:
            raise PermissionDenied('No perteneces a esa organización.')

        org = membership.organization
        org_entity = OrganizationEntity(
            id=org.id,
            name=org.name,
            slug=org.slug,
            plan=org.plan,
            enabled_modules=tuple(org.enabled_modules),
            is_active=org.is_active,
            onboarding_completed=org.onboarding_completed,
            primary_color=org.primary_color,
            logo_url=org.logo_url,
        )
        auth_user = AuthenticatedUser(
            id=request.user.id,
            username=request.user.username,
            email=request.user.email,
            first_name=request.user.first_name,
            last_name=request.user.last_name,
            is_active=request.user.is_active,
            is_staff=request.user.is_staff,
            is_superuser=request.user.is_superuser,
            organization_id=org.id,
        )
        membership_entity = MembershipEntity(
            user_id=request.user.id,
            organization=org_entity,
            role=membership.role,
        )
        tokens = SimpleJWTTokenProvider().create_token_pair(auth_user, membership_entity)

        return Response(
            {
                'tokens': tokens.to_primitives(),
                'membership': {
                    'role': membership.role,
                    'organization': org_entity.to_primitives(),
                    'allowed_modules': None,
                    'position': None,
                },
            }
        )
