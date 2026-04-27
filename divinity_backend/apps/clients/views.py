from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .serializers import CreateClientSerializer, ClientReadSerializer
from application.clients.dtos import CreateClientDTO
from application.clients.services import CreateClientService
from infrastructure.persistence.repositories import DjangoORMClientRepository
from infrastructure.notifications.email_service import EmailNotificationService
from interfaces.repositories import ClientRepositoryInterface
from interfaces.notifications import NotificationServiceInterface


class ClientViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        repository: ClientRepositoryInterface = DjangoORMClientRepository()
        notifier: NotificationServiceInterface = EmailNotificationService()
        self.create_client_service = CreateClientService(
            client_repository=repository,
            notification_service=notifier,
        )

    def create(self, request):
        serializer = CreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dto = CreateClientDTO(**serializer.validated_data)

        try:
            client = self.create_client_service.execute(dto)
        except ValidationError:
            raise
        except Exception as exc:
            raise ValidationError(detail=str(exc))

        output = ClientReadSerializer(client.to_primitives()).data
        return Response(output, status=status.HTTP_201_CREATED)
