"""
Almacenamiento de contexto de auditoría por hilo.

TenantMiddleware escribe al inicio de cada request y limpia al final.
Los signal handlers leen de aquí para registrar quién disparó el evento.
"""

import threading

_local = threading.local()


def set_audit_context(*, user_id: int | None, org_id: int | None) -> None:
    _local.user_id = user_id
    _local.org_id = org_id


def get_audit_user_id() -> int | None:
    return getattr(_local, 'user_id', None)


def get_audit_org_id() -> int | None:
    return getattr(_local, 'org_id', None)


def clear_audit_context() -> None:
    _local.user_id = None
    _local.org_id = None
    _local.deleting_org_ids = set()


def mark_organization_deleting(org_id: int) -> None:
    """Marca una organización como 'borrándose en esta operación' — se llama
    desde pre_delete de OrganizationModel, antes de que el collector de Django
    borre en cascada sus filas relacionadas (memberships, miembros, etc.)."""
    ids = getattr(_local, 'deleting_org_ids', None)
    if ids is None:
        ids = set()
        _local.deleting_org_ids = ids
    ids.add(org_id)


def unmark_organization_deleting(org_id: int) -> None:
    ids = getattr(_local, 'deleting_org_ids', None)
    if ids:
        ids.discard(org_id)


def is_organization_deleting(org_id: int | None) -> bool:
    if org_id is None:
        return False
    return org_id in getattr(_local, 'deleting_org_ids', ())
