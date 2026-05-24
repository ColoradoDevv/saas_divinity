from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from application.members.dtos import (
    ConfigureFieldDTO,
    CreateCustomFieldDTO,
    CreateMemberDTO,
    UpdateCustomFieldDTO,
    UpdateMemberDTO,
)
from application.members.services import (
    ConfigureFieldsService,
    CreateMemberService,
    ManageCustomFieldsService,
    UpdateMemberService,
)
from domain.members.exceptions import (
    MemberAlreadyExistsError,
    MemberNotFoundError,
    MemberValidationError,
)
from infrastructure.middleware.tenant import module_permission
from infrastructure.permissions.roles import IsAdminOnly, IsAdminOrManager
from infrastructure.persistence.member_repositories import DjangoORMMemberRepository

from .serializers import (
    CustomFieldReadSerializer,
    CustomFieldUpdateSerializer,
    CustomFieldWriteSerializer,
    FieldConfigReadSerializer,
    FieldConfigWriteSerializer,
    MemberReadSerializer,
    MemberUpdateSerializer,
    MemberWriteSerializer,
)

MembersModuleEnabled = module_permission('clients')

_BASE_PERMS = [permissions.IsAuthenticated, MembersModuleEnabled, IsAdminOrManager]
_ADMIN_PERMS = [permissions.IsAuthenticated, MembersModuleEnabled, IsAdminOnly]


def _org_id(request) -> int:
    org = getattr(request, 'organization', None)
    if org is None:
        raise PermissionDenied(
            detail='Tu sesión no tiene contexto de organización. Inicia sesión nuevamente.'
        )
    return org.id


# ------------------------------------------------------------------ #
# MemberViewSet                                                        #
# ------------------------------------------------------------------ #

class MemberViewSet(viewsets.ViewSet):
    permission_classes = _BASE_PERMS

    def get_permissions(self):
        if self.action == 'destroy':
            return [p() for p in _ADMIN_PERMS]
        return [p() for p in _BASE_PERMS]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMMemberRepository()

    def list(self, request):
        org_id = _org_id(request)
        page = int(request.query_params.get('page', 1))
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        members, total = self._repo.list_active(
            org_id,
            page=page,
            page_size=20,
            search=search,
            status=status_filter,
        )

        data = [MemberReadSerializer(m.to_primitives()).data for m in members]

        paginator = PageNumberPagination()
        paginator.page_size = 20
        return Response({
            'count': total,
            'page': page,
            'results': data,
        })

    def create(self, request):
        org_id = _org_id(request)
        serializer = MemberWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CreateMemberDTO(
            organization_id=org_id,
            first_name=d['first_name'],
            last_name=d['last_name'],
            email=d['email'],
            phone=d.get('phone', ''),
            created_by_id=request.user.id if request.user.is_authenticated else None,
            standard_fields=d.get('standard_fields', {}),
            custom_fields=d.get('custom_fields', {}),
        )

        try:
            member = CreateMemberService(self._repo).execute(dto)
        except MemberAlreadyExistsError as exc:
            raise ValidationError(detail=str(exc))
        except MemberValidationError as exc:
            raise ValidationError(detail=str(exc))

        return Response(MemberReadSerializer(member.to_primitives()).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        org_id = _org_id(request)
        member = self._repo.get_by_id(int(pk), org_id)
        if member is None:
            raise NotFound(detail='Miembro no encontrado.')
        return Response(MemberReadSerializer(member.to_primitives()).data)

    def update(self, request, pk=None):
        org_id = _org_id(request)
        serializer = MemberUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = UpdateMemberDTO(
            member_id=int(pk),
            organization_id=org_id,
            first_name=d.get('first_name'),
            last_name=d.get('last_name'),
            email=d.get('email'),
            phone=d.get('phone'),
            standard_fields=d.get('standard_fields'),
            custom_fields=d.get('custom_fields'),
        )

        try:
            member = UpdateMemberService(self._repo).execute(dto)
        except MemberNotFoundError:
            raise NotFound(detail='Miembro no encontrado.')
        except MemberAlreadyExistsError as exc:
            raise ValidationError(detail=str(exc))
        except MemberValidationError as exc:
            raise ValidationError(detail=str(exc))

        return Response(MemberReadSerializer(member.to_primitives()).data)

    def destroy(self, request, pk=None):
        org_id = _org_id(request)
        deactivated = self._repo.deactivate(int(pk), org_id)
        if not deactivated:
            raise NotFound(detail='Miembro no encontrado.')
        return Response(status=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------ #
# FieldConfigViewSet                                                   #
# ------------------------------------------------------------------ #

class FieldConfigViewSet(viewsets.ViewSet):
    permission_classes = _ADMIN_PERMS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMMemberRepository()

    def list(self, request):
        org_id = _org_id(request)
        configs = self._repo.get_field_config(org_id)
        data = [FieldConfigReadSerializer(c.to_primitives()).data for c in configs]
        return Response(data)

    def update(self, request, pk=None):
        """PATCH /api/members/field-config/{field_name}/ — actualiza un campo estándar."""
        org_id = _org_id(request)
        serializer = FieldConfigWriteSerializer(data={**request.data, 'field_name': pk})
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = ConfigureFieldDTO(
            organization_id=org_id,
            field_name=d['field_name'],
            is_enabled=d['is_enabled'],
            is_required=d.get('is_required', False),
            label=d.get('label', ''),
        )
        config = ConfigureFieldsService(self._repo).execute(dto)
        return Response(FieldConfigReadSerializer(config.to_primitives()).data)

    def bulk_update(self, request):
        """POST /api/members/field-config/bulk/ — actualiza múltiples campos estándar a la vez."""
        org_id = _org_id(request)
        items = request.data if isinstance(request.data, list) else []
        if not items:
            raise ValidationError(detail='Se esperaba una lista de configuraciones de campo.')

        results = []
        for item in items:
            serializer = FieldConfigWriteSerializer(data=item)
            serializer.is_valid(raise_exception=True)
            d = serializer.validated_data
            dto = ConfigureFieldDTO(
                organization_id=org_id,
                field_name=d['field_name'],
                is_enabled=d['is_enabled'],
                is_required=d.get('is_required', False),
                label=d.get('label', ''),
            )
            config = ConfigureFieldsService(self._repo).execute(dto)
            results.append(FieldConfigReadSerializer(config.to_primitives()).data)
        return Response(results)


# ------------------------------------------------------------------ #
# CustomFieldViewSet                                                   #
# ------------------------------------------------------------------ #

class CustomFieldViewSet(viewsets.ViewSet):
    permission_classes = _ADMIN_PERMS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMMemberRepository()
        self._svc = ManageCustomFieldsService(self._repo)

    def list(self, request):
        org_id = _org_id(request)
        fields = self._repo.get_custom_fields(org_id)
        data = [CustomFieldReadSerializer(f.to_primitives()).data for f in fields]
        return Response(data)

    def create(self, request):
        org_id = _org_id(request)
        serializer = CustomFieldWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CreateCustomFieldDTO(
            organization_id=org_id,
            name=d['name'],
            label=d['label'],
            field_type=d['field_type'],
            options=d.get('options'),
            is_required=d.get('is_required', False),
            is_enabled=d.get('is_enabled', True),
            order=d.get('order', 0),
        )

        try:
            field = self._svc.create(dto)
        except MemberValidationError as exc:
            raise ValidationError(detail=str(exc))

        return Response(CustomFieldReadSerializer(field.to_primitives()).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        org_id = _org_id(request)
        fields = self._repo.get_custom_fields(org_id)
        field = next((f for f in fields if f.id == int(pk)), None)
        if field is None:
            raise NotFound(detail='Campo personalizado no encontrado.')
        return Response(CustomFieldReadSerializer(field.to_primitives()).data)

    def update(self, request, pk=None):
        org_id = _org_id(request)
        serializer = CustomFieldUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = UpdateCustomFieldDTO(
            field_id=int(pk),
            organization_id=org_id,
            label=d.get('label'),
            field_type=d.get('field_type'),
            options=d.get('options'),
            is_required=d.get('is_required'),
            is_enabled=d.get('is_enabled'),
            order=d.get('order'),
        )

        try:
            field = self._svc.update(dto)
        except MemberNotFoundError:
            raise NotFound(detail='Campo personalizado no encontrado.')
        except MemberValidationError as exc:
            raise ValidationError(detail=str(exc))

        return Response(CustomFieldReadSerializer(field.to_primitives()).data)

    def destroy(self, request, pk=None):
        org_id = _org_id(request)
        try:
            self._svc.delete(int(pk), org_id)
        except MemberNotFoundError:
            raise NotFound(detail='Campo personalizado no encontrado.')
        return Response(status=status.HTTP_204_NO_CONTENT)
