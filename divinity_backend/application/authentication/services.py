from domain.authentication.entities import AuthSession, AuthenticatedUser
from domain.authentication.exceptions import (
    InvalidCredentialsError,
    NoMembershipFound,
    UserNotFoundError,
)
from interfaces.authentication import TokenProviderInterface
from interfaces.repositories import OrganizationRepositoryInterface, UserRepositoryInterface

from .dtos import LoginDTO


class AuthService:
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        token_provider: TokenProviderInterface,
        organization_repository: OrganizationRepositoryInterface,
    ) -> None:
        self.user_repository = user_repository
        self.token_provider = token_provider
        self.organization_repository = organization_repository

    def login(self, dto: LoginDTO) -> AuthSession:
        user = self.user_repository.authenticate(email=dto.email, password=dto.password)
        if user is None:
            raise InvalidCredentialsError('Credenciales inválidas.')

        membership = self.organization_repository.get_primary_membership(user.id)

        # Los superusuarios pueden acceder sin membresía (para gestión del sistema)
        if membership is None and not user.is_superuser:
            raise NoMembershipFound(
                'Tu cuenta no pertenece a ninguna organización activa. '
                'Contacta al administrador del sistema.'
            )

        tokens = self.token_provider.create_token_pair(user, membership)
        return AuthSession(user=user, tokens=tokens, membership=membership)

    def get_authenticated_user(self, user_id: int) -> AuthenticatedUser:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError('Usuario autenticado no encontrado.')
        return user

    def get_session_context(self, user_id: int) -> AuthSession:
        """Reconstruye el contexto de sesión completo para validación de token."""
        user = self.get_authenticated_user(user_id)
        membership = self.organization_repository.get_primary_membership(user_id)
        return AuthSession(user=user, tokens=None, membership=membership)  # type: ignore[arg-type]
