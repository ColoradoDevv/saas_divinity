from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationModel
from .serializers import NotificationReadSerializer
from .services import sync_expiring_notifications


_STAFF_DENIED = 'Las notificaciones son solo para administradores y gerentes.'


def _org_id_and_role(request) -> tuple[int, str | None]:
    if not request.auth or 'organization_id' not in request.auth:
        raise PermissionDenied('Sin contexto de organización.')
    return int(request.auth['organization_id']), request.auth.get('role')


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org_id, role = _org_id_and_role(request)
        if role == 'staff':
            raise PermissionDenied(_STAFF_DENIED)

        sync_expiring_notifications(org_id)

        page = int(request.query_params.get('page', 1))
        page_size = 20
        qs = NotificationModel.objects.filter(organization_id=org_id)
        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset: offset + page_size]

        return Response({
            'count': total,
            'page': page,
            'results': [NotificationReadSerializer(n).data for n in items],
        })


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org_id, role = _org_id_and_role(request)
        if role == 'staff':
            return Response({'count': 0})
        count = NotificationModel.objects.filter(organization_id=org_id, is_read=False).count()
        return Response({'count': count})


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        org_id, role = _org_id_and_role(request)
        if role == 'staff':
            raise PermissionDenied(_STAFF_DENIED)
        updated = NotificationModel.objects.filter(pk=pk, organization_id=org_id).update(is_read=True)
        if not updated:
            raise NotFound('Notificación no encontrada.')
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        org_id, role = _org_id_and_role(request)
        if role == 'staff':
            raise PermissionDenied(_STAFF_DENIED)
        NotificationModel.objects.filter(organization_id=org_id, is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
