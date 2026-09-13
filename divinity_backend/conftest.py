import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture(autouse=True)
def disable_throttling(settings, monkeypatch):
    # OJO: mutar settings.REST_FRAMEWORK acá NO alcanza para desactivar el
    # throttling de forma confiable. DRF cachea DEFAULT_THROTTLE_CLASSES y
    # DEFAULT_THROTTLE_RATES como atributos de CLASE (en APIView.throttle_classes
    # y SimpleRateThrottle.THROTTLE_RATES) la primera vez que se importan esos
    # módulos — típicamente durante la recolección de tests, antes de que este
    # fixture llegue a correr. Mutar el dict de settings después no siempre
    # invalida esa caché, lo que producía fallas intermitentes según el orden
    # de ejecución (ej. ImproperlyConfigured: "No default throttle rate set for
    # 'login' scope", o un AttributeError distinto si el request.user de la
    # vista no es un usuario Django estándar). Por eso el throttling se anula
    # directamente en el método que lo aplica, sin depender de esa caché.
    monkeypatch.setattr('rest_framework.views.APIView.check_throttles', lambda self, request: None)

    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

from apps.billing.models import MembershipPlanModel
from apps.members.models import MemberModel
from apps.organizations.models import MembershipModel, OrganizationModel
from apps.workers.models import WorkerModel

UserModel = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    def _make(username='testuser', email='test@example.com', password='pass1234!',
               is_superuser=False, is_staff=False, is_active=True, **kwargs):
        return UserModel.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_superuser=is_superuser,
            is_staff=is_staff,
            is_active=is_active,
            **kwargs,
        )
    return _make


@pytest.fixture
def make_org(db):
    def _make(name='Test Org', slug='test-org', plan='pro',
               enabled_modules=None, is_active=True, onboarding_completed=True,
               payment_status='paid', **kwargs):
        return OrganizationModel.objects.create(
            name=name,
            slug=slug,
            plan=plan,
            enabled_modules=enabled_modules or ['workers', 'members', 'payments', 'attendance'],
            is_active=is_active,
            onboarding_completed=onboarding_completed,
            payment_status=payment_status,
            **kwargs,
        )
    return _make


@pytest.fixture
def make_membership(db):
    def _make(user, organization, role='admin', is_active=True):
        return MembershipModel.objects.create(
            user=user, organization=organization, role=role, is_active=is_active
        )
    return _make


@pytest.fixture
def make_worker(db):
    def _make(organization, first_name='Juan', last_name='Perez',
               user=None, position='Barbero', allowed_modules=None, is_active=True, **kwargs):
        return WorkerModel.objects.create(
            organization=organization,
            first_name=first_name,
            last_name=last_name,
            user=user,
            position=position,
            allowed_modules=allowed_modules or [],
            is_active=is_active,
            **kwargs,
        )
    return _make


@pytest.fixture
def make_member(db):
    def _make(organization, first_name='Ana', last_name='Gomez', email=None,
               member_code='', status='active', **kwargs):
        return MemberModel.objects.create(
            organization=organization,
            first_name=first_name,
            last_name=last_name,
            email=email or f'{first_name.lower()}.{last_name.lower()}@example.com',
            member_code=member_code,
            status=status,
            **kwargs,
        )
    return _make


@pytest.fixture
def make_plan(db):
    def _make(organization, name='Mensual', price='1000.00',
               duration_value=1, duration_unit='month', is_active=True, **kwargs):
        return MembershipPlanModel.objects.create(
            organization=organization,
            name=name,
            price=price,
            duration_value=duration_value,
            duration_unit=duration_unit,
            is_active=is_active,
            **kwargs,
        )
    return _make


def _make_jwt_for(user, org=None, role='admin'):
    token = RefreshToken.for_user(user)
    token['is_superuser'] = user.is_superuser
    if org:
        token['organization_id'] = str(org.id)
        token['organization_slug'] = org.slug
        token['role'] = role
    return str(token.access_token)


@pytest.fixture
def superuser(make_user):
    return make_user(username='super', email='super@example.com', password='super1234!',
                     is_superuser=True, is_staff=True)


@pytest.fixture
def superuser_client(api_client, superuser):
    token = _make_jwt_for(superuser)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def org(make_org):
    return make_org()


@pytest.fixture
def admin_user(make_user):
    return make_user(username='admin@example.com', email='admin@example.com',
                     password='admin1234!', is_staff=True)


@pytest.fixture
def admin_membership(make_membership, admin_user, org):
    return make_membership(admin_user, org, role='admin')


@pytest.fixture
def admin_client(api_client, admin_user, org, admin_membership):
    token = _make_jwt_for(admin_user, org=org, role='admin')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client
