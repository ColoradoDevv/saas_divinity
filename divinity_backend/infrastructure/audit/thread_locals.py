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
