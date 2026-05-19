from typing import Optional

from rest_framework_simplejwt.tokens import RefreshToken

from domain.authentication.entities import AuthenticatedUser, TokenPair
from domain.organizations.entities import Membership
from interfaces.authentication import TokenProviderInterface


class SimpleJWTTokenProvider(TokenProviderInterface):
    def create_token_pair(
        self,
        user: AuthenticatedUser,
        membership: Optional[Membership],
    ) -> TokenPair:
        refresh = RefreshToken()
        refresh['user_id'] = user.id
        refresh['email'] = user.email

        if membership:
            refresh['organization_id'] = membership.organization.id
            refresh['organization_slug'] = membership.organization.slug
            refresh['role'] = membership.role

        access = refresh.access_token
        access['user_id'] = user.id
        access['email'] = user.email

        if membership:
            access['organization_id'] = membership.organization.id
            access['organization_slug'] = membership.organization.slug
            access['role'] = membership.role

        return TokenPair(
            access=str(access),
            refresh=str(refresh),
        )
