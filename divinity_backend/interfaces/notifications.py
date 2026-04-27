from abc import ABC, abstractmethod

from domain.clients.entities import Client


class NotificationServiceInterface(ABC):
    @abstractmethod
    def send_client_welcome(self, client: Client) -> None:
        raise NotImplementedError

    @abstractmethod
    def send_account_alert(self, client: Client, subject: str, body: str) -> None:
        raise NotImplementedError
