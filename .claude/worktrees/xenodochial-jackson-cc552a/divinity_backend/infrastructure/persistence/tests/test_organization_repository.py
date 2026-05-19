import pytest
from domain.organizations.entities import Membership, Organization
from infrastructure.persistence.organization_repositories import DjangoORMOrganizationRepository


@pytest.fixture
def repo():
    return DjangoORMOrganizationRepository()


@pytest.mark.django_db
class TestGetPrimaryMembership:
    def test_returns_oldest_active_membership(self, repo, make_user, make_org, make_membership):
        user = make_user(username='u@ex.com', email='u@ex.com', password='p!')
        org1 = make_org(slug='org1')
        org2 = make_org(slug='org2')
        m1 = make_membership(user, org1, role='admin')
        m2 = make_membership(user, org2, role='staff')
        result = repo.get_primary_membership(user.id)
        assert result is not None
        assert isinstance(result, Membership)
        assert result.organization.slug == org1.slug

    def test_ignores_inactive_memberships(self, repo, make_user, make_org, make_membership):
        user = make_user(username='inm@ex.com', email='inm@ex.com', password='p!')
        org = make_org(slug='org-inm')
        make_membership(user, org, role='admin', is_active=False)
        assert repo.get_primary_membership(user.id) is None

    def test_ignores_inactive_organizations(self, repo, make_user, make_org, make_membership):
        user = make_user(username='inorg@ex.com', email='inorg@ex.com', password='p!')
        org = make_org(slug='org-inactive', is_active=False)
        make_membership(user, org, role='admin')
        assert repo.get_primary_membership(user.id) is None

    def test_returns_none_when_no_membership(self, repo, make_user):
        user = make_user(username='nomem@ex.com', email='nomem@ex.com', password='p!')
        assert repo.get_primary_membership(user.id) is None

    def test_handles_exception_returns_none(self, repo):
        assert repo.get_primary_membership(999999) is None


@pytest.mark.django_db
class TestGetBySlug:
    def test_returns_organization_by_slug(self, repo, make_org):
        make_org(slug='my-org', name='My Org')
        result = repo.get_by_slug('my-org')
        assert result is not None
        assert isinstance(result, Organization)
        assert result.name == 'My Org'

    def test_ignores_inactive_organizations(self, repo, make_org):
        make_org(slug='dead-org', is_active=False)
        assert repo.get_by_slug('dead-org') is None

    def test_nonexistent_slug_returns_none(self, repo):
        assert repo.get_by_slug('does-not-exist') is None


@pytest.mark.django_db
class TestToOrgEntity:
    def test_maps_enabled_modules_as_tuple(self, repo, make_org):
        org = make_org(slug='tuple-org', enabled_modules=['workers', 'clients'])
        entity = repo._to_org_entity(org)
        assert isinstance(entity.enabled_modules, tuple)
        assert set(entity.enabled_modules) == {'workers', 'clients'}

    def test_maps_all_fields(self, repo, make_org):
        org = make_org(
            slug='full-org', name='Full Org', plan='enterprise',
            is_active=True, onboarding_completed=True,
            primary_color='#FF0000', logo_url='http://logo.url',
        )
        entity = repo._to_org_entity(org)
        assert entity.id == org.id
        assert entity.name == 'Full Org'
        assert entity.slug == 'full-org'
        assert entity.plan == 'enterprise'
        assert entity.is_active is True
        assert entity.onboarding_completed is True
        assert entity.primary_color == '#FF0000'
        assert entity.logo_url == 'http://logo.url'


@pytest.mark.django_db
class TestToMembershipEntity:
    def test_nests_org_entity(self, repo, make_user, make_org, make_membership):
        user = make_user(username='nested@ex.com', email='nested@ex.com', password='p!')
        org = make_org(slug='nested-org')
        model = make_membership(user, org, role='manager')
        from apps.organizations.models import MembershipModel
        membership_model = MembershipModel.objects.select_related('organization').get(pk=model.pk)
        entity = repo._to_membership_entity(membership_model)
        assert isinstance(entity.organization, Organization)
        assert entity.role == 'manager'
        assert entity.user_id == user.id
