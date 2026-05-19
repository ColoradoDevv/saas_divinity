"""
Signal handlers para audit logging.

Registrados en AuditConfig.ready() — no importar directamente desde modelos.

Modelos auditados:
  - apps.clients.ClientModel   → post_save (created/updated) + post_delete
  - apps.organizations.MembershipModel → post_save + post_delete

El contexto (user_id, org_id) proviene de los thread-locals escritos por
TenantMiddleware en cada request. Si no hay contexto (e.g. shell, celery),
los campos quedan como None — el log se registra igual.
"""

import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from infrastructure.audit.thread_locals import get_audit_org_id, get_audit_user_id

logger = logging.getLogger(__name__)


def _log(action: str, model_name: str, object_id: int | None, org_id: int | None = None) -> None:
    try:
        from apps.audit.models import AuditLogModel
        AuditLogModel.objects.create(
            user_id=get_audit_user_id(),
            organization_id=org_id if org_id is not None else get_audit_org_id(),
            action=action,
            model_name=model_name,
            object_id=object_id,
        )
    except Exception:
        logger.exception('Error al escribir audit log: action=%s model=%s id=%s', action, model_name, object_id)


# ── ClientModel ──────────────────────────────────────────────────────────────

@receiver(post_save, sender='clients.ClientModel')
def _client_saved(sender, instance, created: bool, **kwargs) -> None:
    _log(
        action='created' if created else 'updated',
        model_name='ClientModel',
        object_id=instance.pk,
        org_id=instance.organization_id,
    )


@receiver(post_delete, sender='clients.ClientModel')
def _client_deleted(sender, instance, **kwargs) -> None:
    _log(
        action='deleted',
        model_name='ClientModel',
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
