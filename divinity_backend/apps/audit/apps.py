from django.apps import AppConfig


class AuditConfig(AppConfig):
    name = 'apps.audit'
    default_auto_field = 'django.db.models.BigAutoField'
    label = 'audit'

    def ready(self) -> None:
        import infrastructure.audit.signals  # noqa: F401 — registra los receivers via @receiver
