from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from application.billing.dtos import (
    CreatePlanDTO,
    FreezeSubscriptionDTO,
    RenewMembershipDTO,
    ResumeSubscriptionDTO,
    UpdatePlanDTO,
)
from application.billing.services import (
    CreatePlanService,
    FreezeSubscriptionService,
    RenewMembershipService,
    ResumeSubscriptionService,
    UpdatePlanService,
)
from domain.billing.duration import add_duration
from domain.billing.exceptions import (
    PlanNotFoundError,
    PlanValidationError,
    SubscriptionNotFoundError,
    SubscriptionValidationError,
)
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository


@pytest.fixture
def repo():
    return DjangoORMBillingRepository()


@pytest.mark.django_db
class TestCreatePlanService:
    def test_creates_plan(self, repo, org):
        dto = CreatePlanDTO(
            organization_id=org.id, name='Mensual', description='Plan mensual',
            price=Decimal('1000.00'), duration_value=1, duration_unit='month',
        )
        plan = CreatePlanService(repo).execute(dto)
        assert plan.id is not None
        assert plan.name == 'Mensual'
        assert plan.is_active is True

    def test_rejects_empty_name(self, repo, org):
        dto = CreatePlanDTO(
            organization_id=org.id, name='   ', description='', price=Decimal('10'),
            duration_value=1, duration_unit='month',
        )
        with pytest.raises(PlanValidationError):
            CreatePlanService(repo).execute(dto)

    def test_rejects_negative_price(self, repo, org):
        dto = CreatePlanDTO(
            organization_id=org.id, name='X', description='', price=Decimal('-1'),
            duration_value=1, duration_unit='month',
        )
        with pytest.raises(PlanValidationError):
            CreatePlanService(repo).execute(dto)

    def test_rejects_invalid_duration_unit(self, repo, org):
        dto = CreatePlanDTO(
            organization_id=org.id, name='X', description='', price=Decimal('10'),
            duration_value=1, duration_unit='fortnight',
        )
        with pytest.raises(PlanValidationError):
            CreatePlanService(repo).execute(dto)

    def test_duplicate_name_in_same_org_rejected(self, repo, org):
        dto = CreatePlanDTO(
            organization_id=org.id, name='Mensual', description='', price=Decimal('10'),
            duration_value=1, duration_unit='month',
        )
        CreatePlanService(repo).execute(dto)
        with pytest.raises(PlanValidationError):
            CreatePlanService(repo).execute(dto)


@pytest.mark.django_db
class TestUpdatePlanService:
    def test_updates_price(self, repo, org, make_plan):
        plan = make_plan(org, price='1000.00')
        dto = UpdatePlanDTO(plan_id=plan.id, organization_id=org.id, price=Decimal('1200.00'))
        updated = UpdatePlanService(repo).execute(dto)
        assert updated.price == Decimal('1200.00')

    def test_deactivate(self, repo, org, make_plan):
        plan = make_plan(org)
        dto = UpdatePlanDTO(plan_id=plan.id, organization_id=org.id, is_active=False)
        updated = UpdatePlanService(repo).execute(dto)
        assert updated.is_active is False

    def test_not_found_raises(self, repo, org):
        dto = UpdatePlanDTO(plan_id=999999, organization_id=org.id, price=Decimal('1'))
        with pytest.raises(PlanNotFoundError):
            UpdatePlanService(repo).execute(dto)


@pytest.mark.django_db
class TestRenewMembershipService:
    def test_creates_active_subscription_and_payment(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, duration_value=1, duration_unit='month')
        dto = RenewMembershipDTO(
            organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash',
        )
        subscription, payment = RenewMembershipService(repo).execute(dto)

        assert subscription.status == 'active'
        assert subscription.start_date == timezone.localdate()
        assert subscription.end_date == add_duration(subscription.start_date, 1, 'month')
        assert payment.amount == Decimal(plan.price)
        assert payment.subscription_id == subscription.id

    def test_renew_cancels_previous_active_subscription(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        first, _ = RenewMembershipService(repo).execute(
            RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash')
        )
        second, _ = RenewMembershipService(repo).execute(
            RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='card')
        )
        refreshed_first = repo.get_subscription_by_id(first.id, org.id)
        assert refreshed_first.status == 'cancelled'
        assert second.status == 'active'

    def test_custom_amount_overrides_plan_price(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, price='1000.00')
        _, payment = RenewMembershipService(repo).execute(
            RenewMembershipDTO(
                organization_id=org.id, member_id=member.id, plan_id=plan.id,
                method='cash', amount=Decimal('800.00'),
            )
        )
        assert payment.amount == Decimal('800.00')

    def test_inactive_plan_rejected(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, is_active=False)
        with pytest.raises(PlanNotFoundError):
            RenewMembershipService(repo).execute(
                RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash')
            )

    def test_invalid_method_rejected(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        with pytest.raises(PlanValidationError):
            RenewMembershipService(repo).execute(
                RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='bitcoin')
            )


@pytest.mark.django_db
class TestFreezeResumeSubscription:
    def _active_subscription(self, repo, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        subscription, _ = RenewMembershipService(repo).execute(
            RenewMembershipDTO(organization_id=org.id, member_id=member.id, plan_id=plan.id, method='cash')
        )
        return subscription

    def test_freeze_sets_status_and_frozen_since(self, repo, org, make_member, make_plan):
        subscription = self._active_subscription(repo, org, make_member, make_plan)
        frozen = FreezeSubscriptionService(repo).execute(
            FreezeSubscriptionDTO(subscription_id=subscription.id, organization_id=org.id)
        )
        assert frozen.status == 'frozen'
        assert frozen.frozen_since == timezone.localdate()

    def test_cannot_freeze_twice(self, repo, org, make_member, make_plan):
        subscription = self._active_subscription(repo, org, make_member, make_plan)
        FreezeSubscriptionService(repo).execute(
            FreezeSubscriptionDTO(subscription_id=subscription.id, organization_id=org.id)
        )
        with pytest.raises(SubscriptionValidationError):
            FreezeSubscriptionService(repo).execute(
                FreezeSubscriptionDTO(subscription_id=subscription.id, organization_id=org.id)
            )

    def test_resume_extends_end_date_by_frozen_days(self, repo, org, make_member, make_plan):
        subscription = self._active_subscription(repo, org, make_member, make_plan)
        original_end_date = subscription.end_date

        frozen = FreezeSubscriptionService(repo).execute(
            FreezeSubscriptionDTO(subscription_id=subscription.id, organization_id=org.id)
        )
        # Simular que estuvo congelada 5 días, retrocediendo frozen_since manualmente en BD.
        from apps.billing.models import MemberSubscriptionModel
        MemberSubscriptionModel.objects.filter(pk=frozen.id).update(
            frozen_since=timezone.localdate() - timedelta(days=5)
        )

        resumed = ResumeSubscriptionService(repo).execute(
            ResumeSubscriptionDTO(subscription_id=frozen.id, organization_id=org.id)
        )
        assert resumed.status == 'active'
        assert resumed.end_date == original_end_date + timedelta(days=5)
        assert resumed.frozen_since is None

    def test_cannot_resume_active_subscription(self, repo, org, make_member, make_plan):
        subscription = self._active_subscription(repo, org, make_member, make_plan)
        with pytest.raises(SubscriptionValidationError):
            ResumeSubscriptionService(repo).execute(
                ResumeSubscriptionDTO(subscription_id=subscription.id, organization_id=org.id)
            )

    def test_freeze_not_found_raises(self, repo, org):
        with pytest.raises(SubscriptionNotFoundError):
            FreezeSubscriptionService(repo).execute(
                FreezeSubscriptionDTO(subscription_id=999999, organization_id=org.id)
            )
