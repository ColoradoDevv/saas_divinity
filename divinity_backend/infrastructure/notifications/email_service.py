import logging

from domain.clients.entities import Client
from interfaces.notifications import NotificationServiceInterface

logger = logging.getLogger(__name__)


class EmailNotificationService(NotificationServiceInterface):
    def send_client_welcome(self, client: Client) -> None:
        self._send_email(
            recipient=client.email,
            subject='Bienvenido a Divinity SaaS',
            body=f'Hola {client.first_name}, tu cuenta fue creada con éxito.',
        )

    def send_account_alert(self, client: Client, subject: str, body: str) -> None:
        self._send_email(recipient=client.email, subject=subject, body=body)

    def _send_email(self, recipient: str, subject: str, body: str) -> None:
        logger.info('Mock email queued to %s: %s', recipient, subject)
        logger.debug('Mock email body: %s', body)
        # En una siguiente fase, esta llamada puede delegarse a Celery o a un broker externo.
