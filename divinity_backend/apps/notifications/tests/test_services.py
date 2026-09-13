import pytest

from application.billing.dtos import RenewMembershipDTO
from application.billing.services import RenewMembershipService
from apps.notifications.models import NotificationModel
from apps.notifications.services import notify, sync_expiring_notifications
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository


@pytest.mark.django_db
class TestNotify:
    def test_creates_notification(self, org):
        n = notify(org.id, 'new_member', 'Nuevo miembro: Ana', body='...', link='/members/1')
        assert n.id is not None
        assert NotificationModel.objects.filter(organization_id=org.id).count() == 1


@pytest.mark.django_db
class TestSyncExpiringNotifications:
    def _subscribe_expiring_soon(self, org, member, make_plan):
        plan = make_plan(org, duration_value=1, duration_unit='day')
        RenewMembershipService(DjangoORMBillingRepository()).execute(
            RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash')
        )

    def test_creates_notification_for_expiring_subscription(self, org, make_member, make_plan):
        member = make_member(org)
        self._subscribe_expiring_soon(org, member, make_plan)

        sync_expiring_notifications(org.id)

        notifications = NotificationModel.objects.filter(organization_id=org.id)
        assert notifications.count() == 1
        assert notifications.first().link == f'/members/{member.id}'

    def test_does_not_duplicate_same_day(self, org, make_member, make_plan):
        member = make_member(org)
        self._subscribe_expiring_soon(org, member, make_plan)

        sync_expiring_notifications(org.id)
        sync_expiring_notifications(org.id)

        assert NotificationModel.objects.filter(organization_id=org.id).count() == 1

    def test_no_notification_when_nothing_expiring(self, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, duration_value=1, duration_unit='year')
        RenewMembershipService(DjangoORMBillingRepository()).execute(
            RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash')
        )

        sync_expiring_notifications(org.id)

        assert NotificationModel.objects.filter(organization_id=org.id).count() == 0
