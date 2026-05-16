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
    SwitchOrgSerializer,
    TokenPairSerializer,
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


class SwitchOrgView(APIView):
    """
    POST /api/auth/switch-org/
    Body: {"organization_id": <int>}

    Verifica que el usuario tiene membership activa en la org solicitada y
    emite un nuevo token pair con el organization_id actualizado.
    El cliente debe reemplazar ambos tokens (access + refresh).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SwitchOrgSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org_id = serializer.validated_data['organization_id']

        org_repo = DjangoORMOrganizationRepository()
        membership = org_repo.get_membership_for_org(request.user.id, org_id)

        if membership is None:
            raise PermissionDenied(
                detail='No tienes membresía activa en esta organización.'
            )

        if not membership.organization.is_active:
            raise PermissionDenied(
                detail='La organización está inactiva.'
            )

        if membership.organization.payment_status == 'overdue':
            return Response(
                {'detail': 'La organización tiene un pago vencido. Actualiza el método de pago.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        user = _build_auth_service().get_authenticated_user(request.user.id)
        tokens = SimpleJWTTokenProvider().create_token_pair(user, membership)

        return Response(
            TokenPairSerializer(tokens.to_primitives()).data,
            status=status.HTTP_200_OK,
        )


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
