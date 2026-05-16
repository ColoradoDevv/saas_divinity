import pytest
from django.db import IntegrityError

from apps.organizations.models import MembershipModel, OrganizationModel


@pytest.mark.django_db
class TestOrganizationModel:
    def test_str_returns_name(self, make_org):
        org = make_org(name='Mi Empresa', slug='mi-empresa')
        assert str(org) == 'Mi Empresa'

    def test_defaults(self, db):
        org = OrganizationModel.objects.create(name='Def Org', slug='def-org')
        assert org.plan == 'pro'
        assert org.is_active is True
        assert org.onboarding_completed is False
        assert org.payment_status == 'unpaid'

    def test_slug_unique_raises_integrity_error(self, make_org):
        make_org(slug='unique-slug')
        with pytest.raises(IntegrityError):
            OrganizationModel.objects.create(name='Dup', slug='unique-slug')

    def test_enabled_modules_defaults_to_empty_list(self, db):
        org = OrganizationModel.objects.create(name='Empty Org', slug='empty-org')
        assert org.enabled_modules == []

    def test_primary_color_blank(self, db):
        org = OrganizationModel.objects.create(name='Colorless', slug='colorless')
        assert org.primary_color == ''

    def test_logo_url_blank(self, db):
        org = OrganizationModel.objects.create(name='Logoless', slug='logoless')
        assert org.logo_url == ''


@pytest.mark.django_db
class TestMembershipModel:
    def test_str_returns_readable_string(self, make_user, make_org, make_membership):
        user = make_user(username='u@ex.com', email='u@ex.com', password='p!')
        org = make_org(slug='str-org')
        membership = make_membership(user, org, role='admin')
        assert str(membership) != ''
        assert 'admin' in str(membership)

    def test_unique_together_user_organization(self, make_user, make_org, make_membership):
        user = make_user(username='dup@ex.com', email='dup@ex.com', password='p!')
        org = make_org(slug='dup-org')
        make_membership(user, org, role='admin')
        with pytest.raises(IntegrityError):
            MembershipModel.objects.create(user=user, organization=org, role='staff')

    def test_cascade_delete_when_user_deleted(self, make_user, make_org, make_membership):
        user = make_user(username='del@ex.com', email='del@ex.com', password='p!')
        org = make_org(slug='del-org')
        make_membership(user, org)
        user.delete()
        assert MembershipModel.objects.filter(organization=org).count() == 0

    def test_cascade_delete_when_org_deleted(self, make_user, make_org, make_membership):
        user = make_user(username='dorg@ex.com', email='dorg@ex.com', password='p!')
        org = make_org(slug='delete-org')
        make_membership(user, org)
        org.delete()
        assert MembershipModel.objects.filter(user=user).count() == 0

    def test_default_role_is_staff(self, make_user, make_org):
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        user = make_user(username='dflt@ex.com', email='dflt@ex.com', password='p!')
        org = make_org(slug='dflt-org')
        m = MembershipModel.objects.create(user=user, organization=org)
        assert m.role == 'staff'
