from dataclasses import dataclass


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

    def to_primitives(self) -> dict:
        return {
            'user': self.user.to_primitives(),
            'tokens': self.tokens.to_primitives(),
        }
