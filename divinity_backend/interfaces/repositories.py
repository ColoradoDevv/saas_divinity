from abc import ABC, abstractmethod
from typing import Optional, Sequence

from domain.authentication.entities import AuthenticatedUser
from domain.clients.entities import Client


class ClientRepositoryInterface(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Client]:
        raise NotImplementedError

    @abstractmethod
    def save(self, client: Client) -> Client:
        raise NotImplementedError

    @abstractmethod
    def list_active(self) -> Sequence[Client]:
        raise NotImplementedError


class UserRepositoryInterface(ABC):
    @abstractmethod
    def authenticate(self, email: str, password: str) -> Optional[AuthenticatedUser]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[AuthenticatedUser]:
        raise NotImplementedError
