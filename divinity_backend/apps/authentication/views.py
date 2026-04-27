from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from application.authentication.dtos import LoginDTO
from application.authentication.services import AuthService
from domain.authentication.exceptions import InvalidCredentialsError, UserNotFoundError
from infrastructure.authentication.jwt import SimpleJWTTokenProvider
from infrastructure.persistence.user_repositories import DjangoORMUserRepository

from .serializers import AuthSessionSerializer, AuthenticatedUserSerializer, LoginSerializer


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthService(
            user_repository=DjangoORMUserRepository(),
            token_provider=SimpleJWTTokenProvider(),
        )

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dto = LoginDTO(**serializer.validated_data)

        try:
            auth_session = self.auth_service.login(dto)
        except InvalidCredentialsError as exc:
            raise AuthenticationFailed(detail=str(exc))

        output = AuthSessionSerializer(auth_session.to_primitives()).data
        return Response(output, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthService(
            user_repository=DjangoORMUserRepository(),
            token_provider=SimpleJWTTokenProvider(),
        )

    def get(self, request):
        try:
            user = self.auth_service.get_authenticated_user(request.user.id)
        except UserNotFoundError as exc:
            raise NotFound(detail=str(exc))

        output = AuthenticatedUserSerializer(user.to_primitives()).data
        return Response(output, status=status.HTTP_200_OK)
