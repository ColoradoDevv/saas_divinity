from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from application.clients.dtos import CreateClientDTO
from application.clients.services import CreateClientService
from infrastructure.notifications.email_service import EmailNotificationService
from infrastructure.persistence.repositories import DjangoORMClientRepository

from .serializers import ClientReadSerializer, CreateClientSerializer


def _get_org_id(request) -> int:
    """Extrae organization_id del JWT. Lanza PermissionDenied si no existe."""
    if request.auth and 'organization_id' in request.auth:
        return int(request.auth['organization_id'])
    raise PermissionDenied(
        detail='Tu sesión no tiene contexto de organización. Inicia sesión nuevamente.'
    )


class ClientViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repository = DjangoORMClientRepository()
        self._notifier = EmailNotificationService()

    def _create_service(self) -> CreateClientService:
        return CreateClientService(
            client_repository=self._repository,
            notification_service=self._notifier,
        )

    def list(self, request):
        org_id = _get_org_id(request)
        clients = self._repository.list_by_organization(org_id)
        data = [ClientReadSerializer(c.to_primitives()).data for c in clients]
        return Response(data, status=status.HTTP_200_OK)

    def create(self, request):
        org_id = _get_org_id(request)
        serializer = CreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dto = CreateClientDTO(
            organization_id=org_id,
            **serializer.validated_data,
        )

        try:
            client = self._create_service().execute(dto)
        except Exception as exc:
            raise ValidationError(detail=str(exc))

        output = ClientReadSerializer(client.to_primitives()).data
        return Response(output, status=status.HTTP_201_CREATED)
