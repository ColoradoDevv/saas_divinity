import logging
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from domain.authentication.entities import AuthenticatedUser
from domain.organizations.entities import Membership as MembershipEntity
from domain.organizations.entities import Organization as OrganizationEntity
from infrastructure.authentication.jwt import SimpleJWTTokenProvider

from .models import InvitationModel, MembershipModel, OrganizationModel
from .serializers import (
    AcceptInviteSerializer,
    CreateOrganizationSerializer,
    InviteSerializer,
    MemberRoleUpdateSerializer,
    MembershipSerializer,
    OnboardingSerializer,
    OrganizationSerializer,
    PaymentUpdateSerializer,
    RegisterOrganizationSerializer,
    SuperUpdateOrganizationSerializer,
    UpdateOrganizationSerializer,
)

logger = logging.getLogger(__name__)
UserModel = get_user_model()

ALLOWED_LOGO_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'}


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
        orgs = OrganizationModel.objects.prefetch_related('memberships__user', 'workers').all()
        data = []
        for org in orgs:
            admin_membership = org.memberships.filter(role='admin').first()
            worker_count = org.workers.filter(is_active=True).count()
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
                'worker_count': worker_count,
                'payment_status': org.payment_status,
                'last_payment_date': org.last_payment_date,
                'next_payment_date': org.next_payment_date,
                'created_at': org.created_at,
            })
        return Response(data)

    @transaction.atomic
    def post(self, request):
        _require_superuser(request)
        serializer = CreateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        base_slug = slugify(d['name'])
        slug = base_slug
        counter = 1
        while OrganizationModel.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        org = OrganizationModel.objects.create(
            name=d['name'],
            slug=slug,
            plan=d.get('plan', 'pro'),
            enabled_modules=d.get('enabled_modules', ['clients']),
        )

        if UserModel.objects.filter(email=d['admin_email']).exists():
            raise ValidationError({'admin_email': 'Ya existe una cuenta con ese correo.'})

        admin_user = UserModel.objects.create_user(
            username=d['admin_email'],
            email=d['admin_email'],
            password=d['admin_password'],
            first_name=d.get('admin_first_name', ''),
            last_name=d.get('admin_last_name', ''),
            is_staff=True,   # Admins de empresa tienen acceso al panel Django
            is_superuser=False,
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


class SuperOrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_org(self, pk):
        try:
            return OrganizationModel.objects.prefetch_related(
                'memberships__user', 'workers'
            ).get(pk=pk)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

    def get(self, request, pk):
        _require_superuser(request)
        org = self._get_org(pk)
        members = [
            {
                'id': m.id,
                'user_id': m.user_id,
                'email': m.user.email,
                'first_name': m.user.first_name,
                'last_name': m.user.last_name,
                'role': m.role,
                'is_active': m.is_active,
                'joined_at': m.joined_at,
            }
            for m in org.memberships.all()
        ]
        workers = [
            {
                'id': w.id,
                'first_name': w.first_name,
                'last_name': w.last_name,
                'email': w.email,
                'phone': w.phone,
                'position': w.position,
                'is_active': w.is_active,
            }
            for w in org.workers.all()
        ]
        return Response({
            'id': org.id,
            'name': org.name,
            'slug': org.slug,
            'plan': org.plan,
            'is_active': org.is_active,
            'onboarding_completed': org.onboarding_completed,
            'enabled_modules': org.enabled_modules,
            'primary_color': org.primary_color,
            'logo_url': org.logo_url,
            'payment_status': org.payment_status,
            'last_payment_date': org.last_payment_date,
            'next_payment_date': org.next_payment_date,
            'created_at': org.created_at,
            'members': members,
            'workers': workers,
        })

    def patch(self, request, pk):
        _require_superuser(request)
        org = self._get_org(pk)
        serializer = SuperUpdateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(org, field, value)
        org.save()
        return Response(OrganizationSerializer(org).data)


class SuperMemberUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, user_id):
        _require_superuser(request)
        try:
            membership = MembershipModel.objects.select_related('user').get(
                organization_id=pk, user_id=user_id
            )
        except MembershipModel.DoesNotExist:
            raise NotFound('Membresía no encontrada.')
        serializer = MemberRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        if 'role' in d:
            membership.role = d['role']
        if 'is_active' in d:
            membership.is_active = d['is_active']
        membership.save()
        return Response({
            'id': membership.id,
            'user_id': membership.user_id,
            'email': membership.user.email,
            'first_name': membership.user.first_name,
            'last_name': membership.user.last_name,
            'role': membership.role,
            'is_active': membership.is_active,
            'joined_at': membership.joined_at,
        })


class SuperPaymentUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        _require_superuser(request)
        try:
            org = OrganizationModel.objects.get(pk=pk)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        serializer = PaymentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        org.payment_status = d['payment_status']
        if 'last_payment_date' in d:
            org.last_payment_date = d['last_payment_date']
        if 'next_payment_date' in d:
            org.next_payment_date = d['next_payment_date']
        org.save()

        return Response(OrganizationSerializer(org).data)


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


class OrganizationLogoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        org_id = _require_org_admin(request)
        file = request.FILES.get('logo')
        if not file:
            raise ValidationError({'logo': 'No se envió ningún archivo.'})

        name_parts = file.name.rsplit('.', 1)
        ext = name_parts[-1].lower() if len(name_parts) > 1 else ''
        if ext not in ALLOWED_LOGO_EXTENSIONS:
            raise ValidationError({'logo': f'Formato no permitido. Usa: {", ".join(ALLOWED_LOGO_EXTENSIONS)}'})

        filename = f'logos/org_{org_id}.{ext}'
        media_root = Path(settings.MEDIA_ROOT)
        logo_dir = media_root / 'logos'
        logo_dir.mkdir(parents=True, exist_ok=True)

        dest = media_root / filename
        with open(dest, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        org.logo_url = request.build_absolute_uri(f'{settings.MEDIA_URL}{filename}')
        org.save()

        return Response({'logo_url': org.logo_url})


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


# ─── Public registration ──────────────────────────────────────────────────────

class RegisterOrganizationView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = RegisterOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        org = OrganizationModel.objects.create(
            name=d['name'],
            slug=d['slug'],
            payment_status='trial',
            enabled_modules=['clients'],
        )

        user = UserModel.objects.create_user(
            username=d['email'],
            email=d['email'],
            password=d['password'],
            first_name=d.get('first_name', ''),
            last_name=d.get('last_name', ''),
        )

        MembershipModel.objects.create(
            user=user,
            organization=org,
            role='admin',
            is_active=True,
        )

        org_entity = OrganizationEntity(
            id=org.id,
            name=org.name,
            slug=org.slug,
            plan=org.plan,
            enabled_modules=tuple(org.enabled_modules),
            is_active=org.is_active,
            onboarding_completed=org.onboarding_completed,
            primary_color=org.primary_color,
            logo_url=org.logo_url,
        )
        auth_user = AuthenticatedUser(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_staff=user.is_staff,
            is_superuser=user.is_superuser,
            organization_id=org.id,
        )
        membership_entity = MembershipEntity(
            user_id=user.id,
            organization=org_entity,
            role='admin',
        )
        tokens = SimpleJWTTokenProvider().create_token_pair(auth_user, membership_entity)

        return Response(
            {
                'user': auth_user.to_primitives(),
                'tokens': tokens.to_primitives(),
                'membership': {
                    'role': 'admin',
                    'organization': org_entity.to_primitives(),
                    'allowed_modules': None,
                    'position': None,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Invitations ──────────────────────────────────────────────────────────────

class InviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        org_id = _require_org_admin(request)
        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            org = OrganizationModel.objects.get(pk=org_id)
        except OrganizationModel.DoesNotExist:
            raise NotFound('Organización no encontrada.')

        invitation = InvitationModel.objects.create(
            email=d['email'],
            role=d['role'],
            organization=org,
            created_by=request.user,
            expires_at=timezone.now() + timedelta(days=7),
        )
        logger.info(
            'Invitation created: token=%s email=%s org=%s role=%s',
            invitation.token, invitation.email, org.slug, invitation.role,
        )
        return Response(
            {
                'token': str(invitation.token),
                'email': invitation.email,
                'role': invitation.role,
                'expires_at': invitation.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class AcceptInviteView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            invitation = InvitationModel.objects.select_related('organization').get(
                token=d['token']
            )
        except InvitationModel.DoesNotExist:
            raise ValidationError({'token': 'Invitación no válida.'})

        if invitation.used:
            raise ValidationError({'token': 'Esta invitación ya fue utilizada.'})
        if invitation.expires_at < timezone.now():
            raise ValidationError({'token': 'Esta invitación ha expirado.'})

        if UserModel.objects.filter(email__iexact=invitation.email).exists():
            raise ValidationError({'token': 'Ya existe una cuenta con este correo.'})

        user = UserModel.objects.create_user(
            username=invitation.email,
            email=invitation.email,
            password=d['password'],
            first_name=d.get('first_name', ''),
            last_name=d.get('last_name', ''),
        )

        MembershipModel.objects.create(
            user=user,
            organization=invitation.organization,
            role=invitation.role,
            is_active=True,
        )

        invitation.used = True
        invitation.save(update_fields=['used'])

        org = invitation.organization
        org_entity = OrganizationEntity(
            id=org.id,
            name=org.name,
            slug=org.slug,
            plan=org.plan,
            enabled_modules=tuple(org.enabled_modules),
            is_active=org.is_active,
            onboarding_completed=org.onboarding_completed,
            primary_color=org.primary_color,
            logo_url=org.logo_url,
        )
        auth_user = AuthenticatedUser(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_staff=user.is_staff,
            is_superuser=user.is_superuser,
            organization_id=org.id,
        )
        membership_entity = MembershipEntity(
            user_id=user.id,
            organization=org_entity,
            role=invitation.role,
        )
        tokens = SimpleJWTTokenProvider().create_token_pair(auth_user, membership_entity)

        return Response(
            {
                'user': auth_user.to_primitives(),
                'tokens': tokens.to_primitives(),
                'membership': {
                    'role': invitation.role,
                    'organization': org_entity.to_primitives(),
                    'allowed_modules': None,
                    'position': None,
                },
            },
            status=status.HTTP_201_CREATED,
        )


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
