import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import MembershipModel, OrganizationModel
from .serializers import (
    CreateOrganizationSerializer,
    MembershipSerializer,
    OnboardingSerializer,
    OrganizationSerializer,
    UpdateOrganizationSerializer,
)

logger = logging.getLogger(__name__)
UserModel = get_user_model()


def _require_superuser(request):
    if not request.user.is_superuser:
        raise PermissionDenied('Solo el superadministrador puede realizar esta acción.')


def _require_org_admin(request) -> int:
    if not request.auth or 'organization_id' not in request.auth:
        raise PermissionDenied('Sin contexto de organización.')
    if request.auth.get('role') not in ('admin',) and not request.user.is_superuser:
        raise PermissionDenied('Solo los administradores pueden realizar esta acción.')
    return int(request.auth['organization_id'])


# ─── Super Admin endpoints ────────────────────────────────────────────────────

class SuperOrganizationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _require_superuser(request)
        orgs = OrganizationModel.objects.prefetch_related('memberships__user').all()
        data = []
        for org in orgs:
            admin_membership = org.memberships.filter(role='admin').first()
            data.append({
                'id': org.id,
                'name': org.name,
                'slug': org.slug,
                'plan': org.plan,
                'is_active': org.is_active,
                'onboarding_completed': org.onboarding_completed,
                'enabled_modules': org.enabled_modules,
                'admin_email': admin_membership.user.email if admin_membership else None,
                'member_count': org.memberships.filter(is_active=True).count(),
                'created_at': org.created_at,
            })
        return Response(data)

    @transaction.atomic
    def post(self, request):
        _require_superuser(request)
        serializer = CreateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        # Generar slug único
        base_slug = slugify(d['name'])
        slug = base_slug
        counter = 1
        while OrganizationModel.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        # Crear organización
        org = OrganizationModel.objects.create(
            name=d['name'],
            slug=slug,
            plan=d.get('plan', 'free'),
            enabled_modules=d.get('enabled_modules', ['clients']),
        )

        # Crear usuario admin de la empresa
        if UserModel.objects.filter(email=d['admin_email']).exists():
            raise ValidationError({'admin_email': 'Ya existe una cuenta con ese correo.'})

        admin_user = UserModel.objects.create_user(
            username=d['admin_email'],
            email=d['admin_email'],
            password=d['admin_password'],
            first_name=d.get('admin_first_name', ''),
            last_name=d.get('admin_last_name', ''),
        )

        MembershipModel.objects.create(
            user=admin_user,
            organization=org,
            role='admin',
        )

        return Response(
            {
                'organization': OrganizationSerializer(org).data,
                'admin_email': admin_user.email,
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Organization self-service ────────────────────────────────────────────────

class OrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_org(self, request) -> OrganizationModel:
        if not request.auth or 'organization_id' not in request.auth:
            raise PermissionDenied('Sin contexto de organización.')
        try:
            return OrganizationModel.objects.get(pk=int(request.auth['organization_id']))
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

    def get(self, request):
        org = self._get_org(request)
        return Response(OrganizationSerializer(org).data)

    def patch(self, request):
        _require_org_admin(request)
        org = self._get_org(request)
        serializer = UpdateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(org, field, value)
        org.save()
        return Response(OrganizationSerializer(org).data)


class OnboardingCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.auth or 'organization_id' not in request.auth:
            raise PermissionDenied('Sin contexto de organización.')
        if request.auth.get('role') not in ('admin',) and not request.user.is_superuser:
            raise PermissionDenied('Solo el administrador puede completar el onboarding.')

        org_id = int(request.auth['organization_id'])
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        org.name = d.get('name', org.name)
        org.primary_color = d.get('primary_color', org.primary_color)
        org.logo_url = d.get('logo_url', org.logo_url)
        org.enabled_modules = d.get('enabled_modules', org.enabled_modules)
        org.onboarding_completed = True
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


# ─── ForgotPassword (preserved) ───────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        from apps.authentication.serializers import ForgotPasswordSerializer
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = UserModel.objects.get(email__iexact=email, is_active=True)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            logger.info('Password reset: %s uid=%s token=%s', email, uid, token)
        except UserModel.DoesNotExist:
            pass
        return Response(
            {'detail': 'Si el correo existe, recibirás las instrucciones en breve.'},
            status=status.HTTP_200_OK,
        )
