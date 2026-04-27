from abc import ABC, abstractmethod

from domain.authentication.entities import AuthenticatedUser, TokenPair


class TokenProviderInterface(ABC):
    @abstractmethod
    def create_token_pair(self, user: AuthenticatedUser) -> TokenPair:
        raise NotImplementedError
