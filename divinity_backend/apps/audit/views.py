from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLogModel


def _require_admin(request) -> None:
    if not request.user.is_superuser:
        if not request.auth or request.auth.get('role') not in ('admin',):
            raise PermissionDenied('Solo los administradores pueden ver los logs de auditoría.')


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLogModel
        fields = [
            'id', 'timestamp', 'user_email', 'organization_name',
            'action', 'model_name', 'object_id',
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization_id else None


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _require_admin(request)

        qs = AuditLogModel.objects.select_related('user', 'organization')

        # Filtrar por organización del token (superuser ve todo)
        if not request.user.is_superuser and request.auth:
            org_id = request.auth.get('organization_id')
            if org_id:
                qs = qs.filter(organization_id=org_id)

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)

        model = request.query_params.get('model')
        if model:
            qs = qs.filter(model_name__icontains=model)

        from_date = request.query_params.get('from')
        if from_date:
            qs = qs.filter(timestamp__date__gte=from_date)

        to_date = request.query_params.get('to')
        if to_date:
            qs = qs.filter(timestamp__date__lte=to_date)

        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
