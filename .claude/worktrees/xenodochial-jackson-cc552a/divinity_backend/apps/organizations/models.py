import uuid

from django.contrib.auth import get_user_model
from django.db import models


class OrganizationModel(models.Model):
    PLAN_CHOICES = [
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('trial', 'Prueba'),
        ('paid', 'Pagado'),
        ('unpaid', 'Pendiente'),
        ('overdue', 'Vencido'),
    ]

    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, max_length=80)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='pro')
    enabled_modules = models.JSONField(
        default=list,
        help_text='Claves de módulos habilitados: clients, payments, attendance, reports, workers',
    )
    is_active = models.BooleanField(default=True)

    # Facturación
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid'
    )
    last_payment_date = models.DateField(null=True, blank=True)
    next_payment_date = models.DateField(null=True, blank=True)

    # Onboarding y personalización de marca
    onboarding_completed = models.BooleanField(default=False)
    primary_color = models.CharField(max_length=7, blank=True, default='')
    logo_url = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class MembershipModel(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('staff', 'Staff'),
    ]

    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    organization = models.ForeignKey(
        OrganizationModel,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'membership'
        unique_together = [['user', 'organization']]
        ordering = ['joined_at']

    def __str__(self) -> str:
        return f'{self.user} @ {self.organization} ({self.role})'


class InvitationModel(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField()
    role = models.CharField(
        max_length=20, choices=MembershipModel.ROLE_CHOICES, default='staff'
    )
    organization = models.ForeignKey(
        OrganizationModel,
        on_delete=models.CASCADE,
        related_name='invitations',
    )
    created_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations',
    )
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invitation'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'Invitation({self.email} → {self.organization}, used={self.used})'
