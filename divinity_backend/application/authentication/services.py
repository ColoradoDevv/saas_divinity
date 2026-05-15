from domain.authentication.entities import AuthSession, AuthenticatedUser
from domain.authentication.exceptions import InvalidCredentialsError, UserNotFoundError
from interfaces.authentication import TokenProviderInterface
from interfaces.repositories import UserRepositoryInterface

from .dtos import LoginDTO


class AuthService:
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        token_provider: TokenProviderInterface,
    ) -> None:
        self.user_repository = user_repository
        self.token_provider = token_provider

    def login(self, dto: LoginDTO) -> AuthSession:
        user = self.user_repository.authenticate(email=dto.email, password=dto.password)
        if user is None:
            raise InvalidCredentialsError('Invalid email or password.')

        tokens = self.token_provider.create_token_pair(user)
        return AuthSession(user=user, tokens=tokens)

    def get_authenticated_user(self, user_id: int) -> AuthenticatedUser:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError('Authenticated user was not found.')
        return user
