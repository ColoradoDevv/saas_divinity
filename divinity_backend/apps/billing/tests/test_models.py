from datetime import date, timedelta

import pytest
from django.db import IntegrityError, transaction

from apps.billing.models import MemberSubscriptionModel, MembershipPlanModel


@pytest.mark.django_db
class TestMemberSubscriptionConstraint:
    def test_two_active_subscriptions_for_same_member_rejected(self, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        MemberSubscriptionModel.objects.create(
            organization=org, member=member, plan=plan,
            start_date=date.today(), end_date=date.today() + timedelta(days=30), status='active',
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                MemberSubscriptionModel.objects.create(
                    organization=org, member=member, plan=plan,
                    start_date=date.today(), end_date=date.today() + timedelta(days=30), status='active',
                )

    def test_cancelled_subscription_does_not_block_new_active_one(self, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        MemberSubscriptionModel.objects.create(
            organization=org, member=member, plan=plan,
            start_date=date.today(), end_date=date.today() + timedelta(days=30), status='cancelled',
        )
        # No debe lanzar — 'cancelled' no está en la condición del constraint.
        MemberSubscriptionModel.objects.create(
            organization=org, member=member, plan=plan,
            start_date=date.today(), end_date=date.today() + timedelta(days=30), status='active',
        )


@pytest.mark.django_db
class TestMembershipPlanModel:
    def test_duplicate_name_same_org_rejected(self, org):
        MembershipPlanModel.objects.create(organization=org, name='Mensual', price='10.00')
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                MembershipPlanModel.objects.create(organization=org, name='Mensual', price='20.00')

    def test_same_name_different_org_allowed(self, org, make_org):
        other_org = make_org(slug='other-org')
        MembershipPlanModel.objects.create(organization=org, name='Mensual', price='10.00')
        MembershipPlanModel.objects.create(organization=other_org, name='Mensual', price='20.00')
