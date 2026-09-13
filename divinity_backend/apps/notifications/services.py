"""
Helpers simples para crear notificaciones desde cualquier app — no hay capa
domain/application acá a propósito: es un feed de lectura, no un flujo de
negocio con reglas de validación (mismo criterio que apps/workers).
"""

from django.utils import timezone

from .models import NotificationModel


def notify(organization_id: int, type: str, title: str, body: str = '', link: str = '') -> NotificationModel:
    return NotificationModel.objects.create(
        organization_id=organization_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )


def sync_expiring_notifications(organization_id: int, within_days: int = 3) -> None:
    """
    Genera notificaciones de 'por vencer' para las suscripciones dentro de la
    ventana, sin duplicar si ya se generó una hoy para esa misma suscripción
    (dedupe por link + tipo + fecha). Se llama de forma perezosa (lazy) cada
    vez que se lista el feed — reemplaza la necesidad de un cron para esta
    parte específica, ya que no hay scheduler en el proyecto.
    """
    from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository

    subscriptions = DjangoORMBillingRepository().list_expiring(organization_id, within_days=within_days)
    today = timezone.localdate()

    for sub in subscriptions:
        link = f'/members/{sub.member_id}'
        already_notified = NotificationModel.objects.filter(
            organization_id=organization_id,
            type__in=['subscription_expiring', 'subscription_expired'],
            link=link,
            created_at__date=today,
        ).exists()
        if already_notified:
            continue

        if sub.display_status == 'expired':
            notify(
                organization_id, 'subscription_expired',
                f'Membresía vencida: {sub.member_name}',
                f'El plan {sub.plan_name} venció el {sub.end_date.strftime("%d/%m/%Y")}.',
                link=link,
            )
        else:
            notify(
                organization_id, 'subscription_expiring',
                f'Membresía por vencer: {sub.member_name}',
                f'El plan {sub.plan_name} vence el {sub.end_date.strftime("%d/%m/%Y")}.',
                link=link,
            )
