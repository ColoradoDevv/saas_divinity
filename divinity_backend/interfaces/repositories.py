from abc import ABC, abstractmethod
from typing import Optional, Sequence

from domain.authentication.entities import AuthenticatedUser
from domain.clients.entities import Client
from domain.organizations.entities import Membership, Organization


class OrganizationRepositoryInterface(ABC):
    @abstractmethod
    def get_primary_membership(self, user_id: int) -> Optional[Membership]:
        raise NotImplementedError

    @abstractmethod
    def get_by_slug(self, slug: str) -> Optional[Organization]:
        raise NotImplementedError


class UserRepositoryInterface(ABC):
    @abstractmethod
    def authenticate(self, email: str, password: str) -> Optional[AuthenticatedUser]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[AuthenticatedUser]:
        raise NotImplementedError


class ClientRepositoryInterface(ABC):
    @abstractmethod
    def get_by_email(self, email: str, organization_id: int) -> Optional[Client]:
        raise NotImplementedError

    @abstractmethod
    def save(self, client: Client) -> Client:
        raise NotImplementedError

    @abstractmethod
    def list_by_organization(self, organization_id: int) -> Sequence[Client]:
        raise NotImplementedError
