from django.conf import settings
from django.db import models
from django.db.models import Q

from domain.billing.duration import DURATION_UNIT_CHOICES


class MembershipPlanModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='membership_plans',
    )
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_value = models.PositiveIntegerField(default=1)
    duration_unit = models.CharField(max_length=10, choices=DURATION_UNIT_CHOICES, default='month')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'membership_plan'
        unique_together = [['organization', 'name']]
        ordering = ['name']

    def __str__(self) -> str:
        return f'{self.name} ({self.organization})'


class MemberSubscriptionModel(models.Model):
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('frozen', 'Congelada'),
        ('cancelled', 'Cancelada'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='member_subscriptions',
    )
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    plan = models.ForeignKey(
        MembershipPlanModel,
        on_delete=models.PROTECT,
        related_name='subscriptions',
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    frozen_since = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'member_subscription'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['member'],
                condition=Q(status__in=['active', 'frozen']),
                name='unique_active_subscription_per_member',
            ),
        ]

    def __str__(self) -> str:
        return f'{self.member} / {self.plan} ({self.status})'


class DuesPaymentModel(models.Model):
    METHOD_CHOICES = [
        ('cash', 'Efectivo'),
        ('card', 'Tarjeta'),
        ('transfer', 'Transferencia'),
        ('other', 'Otro'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='dues_payments',
    )
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='dues_payments',
    )
    subscription = models.ForeignKey(
        MemberSubscriptionModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    paid_at = models.DateField()
    notes = models.CharField(max_length=255, blank=True, default='')
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_dues_payments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dues_payment'
        ordering = ['-paid_at', '-created_at']

    def __str__(self) -> str:
        return f'{self.member} — {self.amount} ({self.paid_at})'


class DailyStatsSnapshotModel(models.Model):
    """
    Fotografía inmutable de un día ya cerrado (revenue/checkins/new_members
    de esa fecha exacta). El día de hoy nunca se guarda acá — sigue "vivo" y
    se calcula en caliente (ver DashboardSummaryView) hasta que termina.
    Se completa de forma perezosa (sync_daily_stats), no por un cron.
    """
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='daily_stats_snapshots',
    )
    date = models.DateField()
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    checkins = models.PositiveIntegerField(default=0)
    new_members = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_stats_snapshot'
        unique_together = [['organization', 'date']]
        ordering = ['date']

    def __str__(self) -> str:
        return f'{self.organization} / {self.date}'
