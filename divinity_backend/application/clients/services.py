from typing import Optional

from domain.clients.entities import Client
from domain.clients.exceptions import ClientAlreadyExistsError
from interfaces.notifications import NotificationServiceInterface
from interfaces.repositories import ClientRepositoryInterface
from .dtos import CreateClientDTO


class CreateClientService:
    def __init__(
        self,
        client_repository: ClientRepositoryInterface,
        notification_service: NotificationServiceInterface,
    ) -> None:
        self.client_repository = client_repository
        self.notification_service = notification_service

    def execute(self, dto: CreateClientDTO) -> Client:
        existing_client = self.client_repository.get_by_email(dto.email)
        if existing_client is not None:
            raise ClientAlreadyExistsError('A client with this email already exists.')

        client = Client.create(
            first_name=dto.first_name,
            last_name=dto.last_name,
            email=dto.email,
            phone=dto.phone,
        )

        persisted = self.client_repository.save(client)
        self.notification_service.send_client_welcome(persisted)
        return persisted
