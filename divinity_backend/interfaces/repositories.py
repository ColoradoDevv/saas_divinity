from abc import ABC, abstractmethod
from typing import Optional, Sequence

from domain.authentication.entities import AuthenticatedUser
from domain.clients.entities import Client
from domain.members.entities import CustomField, FieldConfig, Member
from domain.organizations.entities import Membership, Organization


class OrganizationRepositoryInterface(ABC):
    @abstractmethod
    def get_primary_membership(self, user_id: int) -> Optional[Membership]:
        raise NotImplementedError

    @abstractmethod
    def get_membership_for_org(self, user_id: int, organization_id: int) -> Optional[Membership]:
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
    def get_by_id(self, client_id: int, organization_id: int) -> Optional[Client]:
        raise NotImplementedError

    @abstractmethod
    def save(self, client: Client) -> Client:
        raise NotImplementedError

    @abstractmethod
    def list_by_organization(self, organization_id: int) -> Sequence[Client]:
        raise NotImplementedError

    @abstractmethod
    def deactivate(self, client_id: int, organization_id: int) -> bool:
        raise NotImplementedError


class MemberRepositoryInterface(ABC):
    @abstractmethod
    def save(self, member: Member) -> Member:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, member_id: int, organization_id: int) -> Optional[Member]:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str, organization_id: int) -> Optional[Member]:
        raise NotImplementedError

    @abstractmethod
    def list_active(
        self,
        organization_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str = '',
        status: str = '',
    ) -> tuple[Sequence[Member], int]:
        """Devuelve (miembros_página, total_count)."""
        raise NotImplementedError

    @abstractmethod
    def deactivate(self, member_id: int, organization_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_field_config(self, organization_id: int) -> Sequence[FieldConfig]:
        raise NotImplementedError

    @abstractmethod
    def save_field_config(self, config: FieldConfig) -> FieldConfig:
        raise NotImplementedError

    @abstractmethod
    def get_custom_fields(self, organization_id: int) -> Sequence[CustomField]:
        raise NotImplementedError

    @abstractmethod
    def save_custom_field(self, custom_field: CustomField) -> CustomField:
        raise NotImplementedError

    @abstractmethod
    def delete_custom_field(self, field_id: int, organization_id: int) -> bool:
        raise NotImplementedError
