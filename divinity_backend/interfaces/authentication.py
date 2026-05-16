from abc import ABC, abstractmethod
from typing import Optional

from domain.authentication.entities import AuthenticatedUser, TokenPair
from domain.organizations.entities import Membership


class TokenProviderInterface(ABC):
    @abstractmethod
    def create_token_pair(
        self,
        user: AuthenticatedUser,
        membership: Optional[Membership],
    ) -> TokenPair:
        raise NotImplementedError
