"""
Envía un email de recordatorio a los miembros cuya membresía vence dentro de
3 días, para todas las organizaciones gimnasio activas.

Este proyecto no tiene un scheduler (no Celery, no APScheduler) — este
comando hay que programarlo externamente para que corra una vez por día:
  - Windows: Task Scheduler ejecutando
      python manage.py send_expiring_reminders
  - Linux/producción: una entrada de cron, o el scheduler del proveedor de
    hosting (ej. Render Cron Jobs, Heroku Scheduler).

Las notificaciones INTERNAS (la campanita del panel) no dependen de este
comando — se sincronizan solas cada vez que alguien abre el centro de
notificaciones (ver apps/notifications/services.py::sync_expiring_notifications).
"""

from django.core.management.base import BaseCommand

from apps.members.models import MemberModel
from apps.organizations.models import OrganizationModel
from infrastructure.notifications.email_service import send_expiring_reminder_email
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository

WITHIN_DAYS = 3


class Command(BaseCommand):
    help = 'Envía recordatorios por email de membresías por vencer (correr diariamente vía cron/Task Scheduler).'

    def handle(self, *args, **options):
        repo = DjangoORMBillingRepository()
        orgs = OrganizationModel.objects.filter(is_active=True, business_type='gym')
        sent = 0

        for org in orgs:
            subscriptions = repo.list_expiring(org.id, within_days=WITHIN_DAYS)
            for sub in subscriptions:
                if sub.display_status != 'active' and sub.display_status != 'expired':
                    continue
                try:
                    member = MemberModel.objects.get(pk=sub.member_id, organization_id=org.id)
                except MemberModel.DoesNotExist:
                    continue
                send_expiring_reminder_email(
                    to_email=member.email,
                    first_name=member.first_name,
                    organization_name=org.name,
                    plan_name=sub.plan_name,
                    end_date=sub.end_date,
                )
                sent += 1

        self.stdout.write(self.style.SUCCESS(f'Recordatorios enviados: {sent}'))
