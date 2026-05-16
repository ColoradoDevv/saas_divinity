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

        output = AuthSessionSerializer(auth_session.to_primitives()).data
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

        data = {
            'user': user.to_primitives(),
            'membership': membership.to_primitives() if membership else None,
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
