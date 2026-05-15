from rest_framework_simplejwt.tokens import RefreshToken

from domain.authentication.entities import AuthenticatedUser, TokenPair
from interfaces.authentication import TokenProviderInterface


class SimpleJWTTokenProvider(TokenProviderInterface):
    def create_token_pair(self, user: AuthenticatedUser) -> TokenPair:
        refresh = RefreshToken()
        refresh['user_id'] = user.id
        refresh['email'] = user.email

        access = refresh.access_token
        access['user_id'] = user.id
        access['email'] = user.email

        return TokenPair(
            access=str(access),
            refresh=str(refresh),
        )
