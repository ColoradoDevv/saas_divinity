from __future__ import annotations

from datetime import timedelta
from typing import Optional, Sequence

from django.db import IntegrityError
from django.utils import timezone

from apps.billing.models import DuesPaymentModel, MembershipPlanModel, MemberSubscriptionModel
from domain.billing.entities import DuesPayment, MembershipPlan, MemberSubscription
from domain.billing.exceptions import PlanValidationError
from interfaces.repositories import BillingRepositoryInterface


class DjangoORMBillingRepository(BillingRepositoryInterface):

    # ------------------------------------------------------------------ #
    # Mappers                                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _plan_to_entity(model: MembershipPlanModel) -> MembershipPlan:
        return MembershipPlan(
            id=model.id,
            organization_id=model.organization_id,
            name=model.name,
            description=model.description,
            price=model.price,
            duration_value=model.duration_value,
            duration_unit=model.duration_unit,
            is_active=model.is_active,
        )

    @staticmethod
    def _subscription_to_entity(model: MemberSubscriptionModel) -> MemberSubscription:
        return MemberSubscription(
            id=model.id,
            organization_id=model.organization_id,
            member_id=model.member_id,
            plan_id=model.plan_id,
            start_date=model.start_date,
            end_date=model.end_date,
            status=model.status,
            frozen_since=model.frozen_since,
            created_at=model.created_at,
            plan_name=model.plan.name if model.plan_id else '',
            member_name=f'{model.member.first_name} {model.member.last_name}'.strip(),
        )

    @staticmethod
    def _payment_to_entity(model: DuesPaymentModel) -> DuesPayment:
        registered_by_name = ''
        if model.registered_by_id:
            user = model.registered_by
            registered_by_name = user.get_full_name().strip() or user.username

        return DuesPayment(
            id=model.id,
            organization_id=model.organization_id,
            member_id=model.member_id,
            member_name=f'{model.member.first_name} {model.member.last_name}'.strip(),
            subscription_id=model.subscription_id,
            amount=model.amount,
            method=model.method,
            paid_at=model.paid_at,
            notes=model.notes,
            registered_by_id=model.registered_by_id,
            registered_by_name=registered_by_name,
            created_at=model.created_at,
        )

    # ------------------------------------------------------------------ #
    # Plans                                                                #
    # ------------------------------------------------------------------ #

    def save_plan(self, plan: MembershipPlan) -> MembershipPlan:
        try:
            if plan.id is not None:
                model = MembershipPlanModel.objects.get(pk=plan.id, organization_id=plan.organization_id)
                model.name = plan.name
                model.description = plan.description
                model.price = plan.price
                model.duration_value = plan.duration_value
                model.duration_unit = plan.duration_unit
                model.is_active = plan.is_active
                model.save()
            else:
                model = MembershipPlanModel.objects.create(
                    organization_id=plan.organization_id,
                    name=plan.name,
                    description=plan.description,
                    price=plan.price,
                    duration_value=plan.duration_value,
                    duration_unit=plan.duration_unit,
                    is_active=plan.is_active,
                )
        except IntegrityError:
            raise PlanValidationError('Ya existe un plan con ese nombre en esta organización.')
        return self._plan_to_entity(model)

    def get_plan_by_id(self, plan_id: int, organization_id: int) -> Optional[MembershipPlan]:
        try:
            model = MembershipPlanModel.objects.get(pk=plan_id, organization_id=organization_id)
        except MembershipPlanModel.DoesNotExist:
            return None
        return self._plan_to_entity(model)

    def list_plans(self, organization_id: int, *, active_only: bool = False) -> Sequence[MembershipPlan]:
        qs = MembershipPlanModel.objects.filter(organization_id=organization_id)
        if active_only:
            qs = qs.filter(is_active=True)
        return [self._plan_to_entity(m) for m in qs]

    # ------------------------------------------------------------------ #
    # Subscriptions                                                        #
    # ------------------------------------------------------------------ #

    def get_current_subscription(self, member_id: int, organization_id: int) -> Optional[MemberSubscription]:
        model = (
            MemberSubscriptionModel.objects
            .select_related('plan', 'member')
            .filter(member_id=member_id, organization_id=organization_id, status__in=['active', 'frozen'])
            .order_by('-created_at')
            .first()
        )
        return self._subscription_to_entity(model) if model else None

    def get_subscription_by_id(self, subscription_id: int, organization_id: int) -> Optional[MemberSubscription]:
        try:
            model = MemberSubscriptionModel.objects.select_related('plan', 'member').get(
                pk=subscription_id, organization_id=organization_id,
            )
        except MemberSubscriptionModel.DoesNotExist:
            return None
        return self._subscription_to_entity(model)

    def save_subscription(self, subscription: MemberSubscription) -> MemberSubscription:
        if subscription.id is not None:
            model = MemberSubscriptionModel.objects.select_related('plan', 'member').get(
                pk=subscription.id, organization_id=subscription.organization_id,
            )
            model.start_date = subscription.start_date
            model.end_date = subscription.end_date
            model.status = subscription.status
            model.frozen_since = subscription.frozen_since
            model.save()
        else:
            model = MemberSubscriptionModel.objects.create(
                organization_id=subscription.organization_id,
                member_id=subscription.member_id,
                plan_id=subscription.plan_id,
                start_date=subscription.start_date,
                end_date=subscription.end_date,
                status=subscription.status,
                frozen_since=subscription.frozen_since,
            )
            model = MemberSubscriptionModel.objects.select_related('plan', 'member').get(pk=model.pk)
        return self._subscription_to_entity(model)

    def cancel_subscription(self, subscription_id: int, organization_id: int) -> None:
        MemberSubscriptionModel.objects.filter(
            pk=subscription_id, organization_id=organization_id,
        ).update(status='cancelled')

    def list_subscriptions_for_member(
        self, member_id: int, organization_id: int
    ) -> Sequence[MemberSubscription]:
        qs = (
            MemberSubscriptionModel.objects
            .select_related('plan', 'member')
            .filter(member_id=member_id, organization_id=organization_id)
        )
        return [self._subscription_to_entity(m) for m in qs]

    # ------------------------------------------------------------------ #
    # Payments                                                             #
    # ------------------------------------------------------------------ #

    def save_payment(self, payment: DuesPayment) -> DuesPayment:
        model = DuesPaymentModel.objects.create(
            organization_id=payment.organization_id,
            member_id=payment.member_id,
            subscription_id=payment.subscription_id,
            amount=payment.amount,
            method=payment.method,
            paid_at=payment.paid_at,
            notes=payment.notes,
            registered_by_id=payment.registered_by_id,
        )
        model = DuesPaymentModel.objects.select_related('member', 'registered_by').get(pk=model.pk)
        return self._payment_to_entity(model)

    def list_payments_for_member(self, member_id: int, organization_id: int) -> Sequence[DuesPayment]:
        qs = (
            DuesPaymentModel.objects
            .select_related('member', 'registered_by')
            .filter(member_id=member_id, organization_id=organization_id)
        )
        return [self._payment_to_entity(m) for m in qs]

    def list_payments(
        self,
        organization_id: int,
        *,
        date_from=None,
        date_to=None,
        member_id=None,
        method=None,
    ) -> Sequence[DuesPayment]:
        qs = (
            DuesPaymentModel.objects
            .select_related('member', 'registered_by')
            .filter(organization_id=organization_id)
        )
        if date_from is not None:
            qs = qs.filter(paid_at__gte=date_from)
        if date_to is not None:
            qs = qs.filter(paid_at__lte=date_to)
        if member_id is not None:
            qs = qs.filter(member_id=member_id)
        if method is not None:
            qs = qs.filter(method=method)
        return [self._payment_to_entity(m) for m in qs]

    # ------------------------------------------------------------------ #
    # Dashboard                                                            #
    # ------------------------------------------------------------------ #

    def list_expiring(self, organization_id: int, *, within_days: int) -> Sequence[MemberSubscription]:
        cutoff = timezone.localdate() + timedelta(days=within_days)
        qs = (
            MemberSubscriptionModel.objects
            .select_related('plan', 'member')
            .filter(organization_id=organization_id, status='active', end_date__lte=cutoff)
            .order_by('end_date')
        )
        return [self._subscription_to_entity(m) for m in qs]
