from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MembershipModel, OrganizationModel
from .serializers import MembershipSerializer, OrganizationSerializer, UpdateOrganizationSerializer


def _require_org_admin(request):
    """Verifica que el usuario sea admin de su organización."""
    if not request.auth or 'organization_id' not in request.auth:
        raise PermissionDenied('Sin contexto de organización.')
    if request.auth.get('role') not in ('admin',) and not request.user.is_superuser:
        raise PermissionDenied('Solo los administradores pueden realizar esta acción.')
    return int(request.auth['organization_id'])


class OrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.auth or 'organization_id' not in request.auth:
            raise PermissionDenied('Sin contexto de organización.')
        org_id = int(request.auth['organization_id'])

        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        return Response(OrganizationSerializer(org).data)

    def patch(self, request):
        org_id = _require_org_admin(request)

        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        serializer = UpdateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(org, field, value)
        org.save()

        return Response(OrganizationSerializer(org).data)


class MembershipListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.auth or 'organization_id' not in request.auth:
            raise PermissionDenied('Sin contexto de organización.')
        org_id = int(request.auth['organization_id'])

        memberships = (
            MembershipModel.objects
            .filter(organization_id=org_id)
            .select_related('user')
        )
        data = [
            {
                'user_id': m.user_id,
                'email': m.user.email,
                'first_name': m.user.first_name,
                'last_name': m.user.last_name,
                'role': m.role,
                'is_active': m.is_active,
                'joined_at': m.joined_at,
            }
            for m in memberships
        ]
        return Response(MembershipSerializer(data, many=True).data)
