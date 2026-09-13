"""
Signal handlers para audit logging.

Registrados en AuditConfig.ready() — no importar directamente desde modelos.

Modelos auditados:
  - apps.members.MemberModel   → post_save (created/updated) + post_delete
  - apps.organizations.MembershipModel → post_save + post_delete
  - apps.billing.MemberSubscriptionModel → post_save + post_delete
  - apps.billing.DuesPaymentModel → post_save (los pagos no se borran)

El contexto (user_id, org_id) proviene de los thread-locals escritos por
TenantMiddleware en cada request. Si no hay contexto (e.g. shell, celery),
los campos quedan como None — el log se registra igual.
"""

import logging

from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver

from infrastructure.audit.thread_locals import (
    get_audit_org_id,
    get_audit_user_id,
    is_organization_deleting,
    mark_organization_deleting,
    unmark_organization_deleting,
)

logger = logging.getLogger(__name__)


def _log(action: str, model_name: str, object_id: int | None, org_id: int | None = None) -> None:
    try:
        from apps.audit.models import AuditLogModel

        resolved_org_id = org_id if org_id is not None else get_audit_org_id()
        if is_organization_deleting(resolved_org_id):
            # Esta organización se está borrando en la misma operación (ver
            # _organization_pre_delete más abajo) — si el post_delete de un
            # modelo hijo (membership, miembro, etc.) que cae en cascada
            # intentara loguear esta organization_id, quedaría un audit_log
            # apuntando a un id que ya no va a existir cuando termine la
            # transacción. Se registra sin organización en vez de eso.
            resolved_org_id = None

        AuditLogModel.objects.create(
            user_id=get_audit_user_id(),
            organization_id=resolved_org_id,
            action=action,
            model_name=model_name,
            object_id=object_id,
        )
    except Exception:
        logger.exception('Error al escribir audit log: action=%s model=%s id=%s', action, model_name, object_id)


# ── OrganizationModel ─────────────────────────────────────────────────────────
# No se audita el alta/baja de la organización en sí (no tiene sentido
# loguear "se creó/borró la organización X" con organization_id=X), pero hay
# que marcar cuándo empieza y termina un borrado para que _log() sepa que no
# debe referenciar esta organización desde los post_delete de sus hijos.

@receiver(pre_delete, sender='organizations.OrganizationModel')
def _organization_pre_delete(sender, instance, **kwargs) -> None:
    mark_organization_deleting(instance.pk)


@receiver(post_delete, sender='organizations.OrganizationModel')
def _organization_post_delete(sender, instance, **kwargs) -> None:
    unmark_organization_deleting(instance.pk)


# ── MemberModel ──────────────────────────────────────────────────────────────

@receiver(post_save, sender='members.MemberModel')
def _member_saved(sender, instance, created: bool, **kwargs) -> None:
    _log(
        action='created' if created else 'updated',
        model_name='MemberModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


@receiver(post_delete, sender='members.MemberModel')
def _member_deleted(sender, instance, **kwargs) -> None:
    _log(
        action='deleted',
        model_name='MemberModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


# ── MembershipModel ──────────────────────────────────────────────────────────

@receiver(post_save, sender='organizations.MembershipModel')
def _membership_saved(sender, instance, created: bool, **kwargs) -> None:
    _log(
        action='created' if created else 'updated',
        model_name='MembershipModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


@receiver(post_delete, sender='organizations.MembershipModel')
def _membership_deleted(sender, instance, **kwargs) -> None:
    _log(
        action='deleted',
        model_name='MembershipModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


# ── MemberSubscriptionModel / DuesPaymentModel ────────────────────────────────

@receiver(post_save, sender='billing.MemberSubscriptionModel')
def _subscription_saved(sender, instance, created: bool, **kwargs) -> None:
    _log(
        action='created' if created else 'updated',
        model_name='MemberSubscriptionModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


@receiver(post_delete, sender='billing.MemberSubscriptionModel')
def _subscription_deleted(sender, instance, **kwargs) -> None:
    _log(
        action='deleted',
        model_name='MemberSubscriptionModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


@receiver(post_save, sender='billing.DuesPaymentModel')
def _dues_payment_saved(sender, instance, created: bool, **kwargs) -> None:
    _log(
        action='created' if created else 'updated',
        model_name='DuesPaymentModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )
