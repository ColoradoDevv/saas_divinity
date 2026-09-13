from __future__ import annotations

import dataclasses
from datetime import timedelta

from django.utils import timezone

from domain.billing.duration import VALID_DURATION_UNITS, add_duration
from domain.billing.entities import DuesPayment, MembershipPlan, MemberSubscription
from domain.billing.exceptions import (
    PlanNotFoundError,
    PlanValidationError,
    SubscriptionNotFoundError,
    SubscriptionValidationError,
)
from interfaces.repositories import BillingRepositoryInterface

from .dtos import (
    CreatePlanDTO,
    FreezeSubscriptionDTO,
    RenewMembershipDTO,
    ResumeSubscriptionDTO,
    UpdatePlanDTO,
)

_VALID_METHODS = ('cash', 'card', 'transfer', 'other')


def _validate_plan_fields(name: str, price, duration_value: int, duration_unit: str) -> None:
    if not name.strip():
        raise PlanValidationError('El nombre del plan no puede estar vacío.')
    if price < 0:
        raise PlanValidationError('El precio no puede ser negativo.')
    if duration_value <= 0:
        raise PlanValidationError('La duración debe ser mayor a cero.')
    if duration_unit not in VALID_DURATION_UNITS:
        raise PlanValidationError(
            f'Unidad de duración inválida: {duration_unit}. '
            f'Opciones: {", ".join(sorted(VALID_DURATION_UNITS))}'
        )


class CreatePlanService:
    def __init__(self, repository: BillingRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: CreatePlanDTO) -> MembershipPlan:
        _validate_plan_fields(dto.name, dto.price, dto.duration_value, dto.duration_unit)
        plan = MembershipPlan(
            id=None,
            organization_id=dto.organization_id,
            name=dto.name.strip(),
            description=dto.description.strip(),
            price=dto.price,
            duration_value=dto.duration_value,
            duration_unit=dto.duration_unit,
            is_active=True,
        )
        return self.repository.save_plan(plan)


class UpdatePlanService:
    def __init__(self, repository: BillingRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: UpdatePlanDTO) -> MembershipPlan:
        plan = self.repository.get_plan_by_id(dto.plan_id, dto.organization_id)
        if plan is None:
            raise PlanNotFoundError('Plan no encontrado.')

        name = dto.name.strip() if dto.name is not None else plan.name
        price = dto.price if dto.price is not None else plan.price
        duration_value = dto.duration_value if dto.duration_value is not None else plan.duration_value
        duration_unit = dto.duration_unit if dto.duration_unit is not None else plan.duration_unit
        _validate_plan_fields(name, price, duration_value, duration_unit)

        updated = dataclasses.replace(
            plan,
            name=name,
            description=(dto.description.strip() if dto.description is not None else plan.description),
            price=price,
            duration_value=duration_value,
            duration_unit=duration_unit,
            is_active=(dto.is_active if dto.is_active is not None else plan.is_active),
        )
        return self.repository.save_plan(updated)


class RenewMembershipService:
    """Acción principal de mostrador: cancela la suscripción activa/congelada
    previa del miembro (si hay), crea la nueva y registra el cobro — todo en
    una sola operación."""

    def __init__(self, repository: BillingRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: RenewMembershipDTO) -> tuple[MemberSubscription, DuesPayment]:
        plan = self.repository.get_plan_by_id(dto.plan_id, dto.organization_id)
        if plan is None or not plan.is_active:
            raise PlanNotFoundError('Plan no encontrado o inactivo.')
        if dto.method not in _VALID_METHODS:
            raise PlanValidationError(
                f'Método de pago inválido: {dto.method}. Opciones: {", ".join(_VALID_METHODS)}'
            )

        current = self.repository.get_current_subscription(dto.member_id, dto.organization_id)
        if current is not None:
            self.repository.cancel_subscription(current.id, dto.organization_id)

        start_date = dto.start_date or timezone.localdate()
        end_date = add_duration(start_date, plan.duration_value, plan.duration_unit)

        subscription = MemberSubscription(
            id=None,
            organization_id=dto.organization_id,
            member_id=dto.member_id,
            plan_id=plan.id,
            start_date=start_date,
            end_date=end_date,
            status='active',
            frozen_since=None,
            created_at=None,
            plan_name=plan.name,
        )
        saved_subscription = self.repository.save_subscription(subscription)

        payment = DuesPayment(
            id=None,
            organization_id=dto.organization_id,
            member_id=dto.member_id,
            subscription_id=saved_subscription.id,
            amount=dto.amount if dto.amount is not None else plan.price,
            method=dto.method,
            paid_at=dto.paid_at or timezone.localdate(),
            notes=dto.notes,
            registered_by_id=dto.registered_by_id,
            created_at=None,
        )
        saved_payment = self.repository.save_payment(payment)

        return saved_subscription, saved_payment


class FreezeSubscriptionService:
    def __init__(self, repository: BillingRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: FreezeSubscriptionDTO) -> MemberSubscription:
        subscription = self.repository.get_subscription_by_id(dto.subscription_id, dto.organization_id)
        if subscription is None:
            raise SubscriptionNotFoundError('Suscripción no encontrada.')
        if subscription.status != 'active':
            raise SubscriptionValidationError('Solo se puede congelar una suscripción activa.')

        updated = dataclasses.replace(subscription, status='frozen', frozen_since=timezone.localdate())
        return self.repository.save_subscription(updated)


class ResumeSubscriptionService:
    def __init__(self, repository: BillingRepositoryInterface) -> None:
        self.repository = repository

    def execute(self, dto: ResumeSubscriptionDTO) -> MemberSubscription:
        subscription = self.repository.get_subscription_by_id(dto.subscription_id, dto.organization_id)
        if subscription is None:
            raise SubscriptionNotFoundError('Suscripción no encontrada.')
        if subscription.status != 'frozen':
            raise SubscriptionValidationError('Solo se puede reanudar una suscripción congelada.')

        frozen_days = (timezone.localdate() - subscription.frozen_since).days if subscription.frozen_since else 0
        updated = dataclasses.replace(
            subscription,
            status='active',
            end_date=subscription.end_date + timedelta(days=max(frozen_days, 0)),
            frozen_since=None,
        )
        return self.repository.save_subscription(updated)
