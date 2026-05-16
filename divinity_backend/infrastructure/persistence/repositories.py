from typing import Optional, Sequence

from apps.clients.models import ClientModel
from domain.clients.entities import Client
from interfaces.repositories import ClientRepositoryInterface


class DjangoORMClientRepository(ClientRepositoryInterface):
    def _to_entity(self, model: ClientModel) -> Client:
        return Client(
            id=model.id,
            organization_id=model.organization_id,
            first_name=model.first_name,
            last_name=model.last_name,
            email=model.email,
            phone=model.phone,
            is_active=model.is_active,
            created_at=model.created_at,
        )

    def get_by_email(self, email: str, organization_id: int) -> Optional[Client]:
        try:
            model = ClientModel.objects.get(
                email=email,
                organization_id=organization_id,
            )
        except ClientModel.DoesNotExist:
            return None
        return self._to_entity(model)

    def save(self, client: Client) -> Client:
        if client.id is not None:
            model = ClientModel.objects.get(pk=client.id)
            model.first_name = client.first_name
            model.last_name = client.last_name
            model.email = client.email
            model.phone = client.phone
            model.is_active = client.is_active
        else:
            model = ClientModel(
                organization_id=client.organization_id,
                first_name=client.first_name,
                last_name=client.last_name,
                email=client.email,
                phone=client.phone,
                is_active=client.is_active,
            )
        model.save()
        return self._to_entity(model)

    def list_by_organization(self, organization_id: int) -> Sequence[Client]:
        qs = ClientModel.objects.filter(
            organization_id=organization_id,
            is_active=True,
        )
        return [self._to_entity(m) for m in qs]
