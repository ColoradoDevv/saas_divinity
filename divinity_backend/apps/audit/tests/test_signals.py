import pytest

from apps.audit.models import AuditLogModel
from infrastructure.audit.thread_locals import (
    is_organization_deleting,
    mark_organization_deleting,
    unmark_organization_deleting,
)


@pytest.mark.django_db
class TestMembershipAuditLogging:
    def test_membership_created_logs_organization(self, org, make_user, make_membership):
        user = make_user(username='m1@ex.com', email='m1@ex.com', password='p!')
        make_membership(user, org, role='staff')

        log = AuditLogModel.objects.filter(model_name='MembershipModel', action='created').latest('timestamp')
        assert log.organization_id == org.id

    def test_membership_deleted_without_org_deletion_keeps_organization_id(self, org, make_user, make_membership):
        user = make_user(username='m2@ex.com', email='m2@ex.com', password='p!')
        membership = make_membership(user, org, role='staff')
        membership.delete()

        log = AuditLogModel.objects.filter(model_name='MembershipModel', action='deleted').latest('timestamp')
        assert log.organization_id == org.id


@pytest.mark.django_db
class TestOrganizationCascadeDeleteAuditLogging:
    def test_deleting_organization_does_not_orphan_audit_log_references(self, make_org, make_user, make_membership):
        org = make_org(slug='cascade-audit-org')
        user = make_user(username='cascade@ex.com', email='cascade@ex.com', password='p!')
        make_membership(user, org, role='staff')
        org_id = org.id

        org.delete()

        # Ninguna fila de audit_log puede seguir apuntando a la organización borrada
        # (ni las preexistentes -> SET_NULL las limpia, ni las nuevas creadas por el
        # post_delete en cascada del membership -> _log() las deja en None).
        assert not AuditLogModel.objects.filter(organization_id=org_id).exists()

        deleted_log = AuditLogModel.objects.filter(model_name='MembershipModel', action='deleted').latest('timestamp')
        assert deleted_log.organization_id is None

    def test_is_organization_deleting_reflects_mark_and_unmark(self):
        assert is_organization_deleting(123) is False
        mark_organization_deleting(123)
        assert is_organization_deleting(123) is True
        unmark_organization_deleting(123)
        assert is_organization_deleting(123) is False

    def test_is_organization_deleting_none_is_always_false(self):
        assert is_organization_deleting(None) is False
