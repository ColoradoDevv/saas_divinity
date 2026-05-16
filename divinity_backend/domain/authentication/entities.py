from dataclasses import dataclass, field
from typing import Optional

from domain.organizations.entities import Membership


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    is_staff: bool
    is_superuser: bool
    organization_id: Optional[int] = field(default=None)

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
            'organization_id': self.organization_id,
        }


@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str

    def to_primitives(self) -> dict:
        return {
            'access': self.access,
            'refresh': self.refresh,
        }


@dataclass(frozen=True)
class AuthSession:
    user: AuthenticatedUser
    tokens: TokenPair
    membership: Optional[Membership]

    def to_primitives(self) -> dict:
        user_data = self.user.to_primitives()
        if self.membership:
            user_data['organization_id'] = self.membership.organization.id
        return {
            'user': user_data,
            'tokens': self.tokens.to_primitives(),
            'membership': self.membership.to_primitives() if self.membership else None,
        }
