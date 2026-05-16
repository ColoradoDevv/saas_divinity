from django.contrib.auth import get_user_model
from django.db import models


class OrganizationModel(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]

    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, max_length=80)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    # Lista de módulos activos: ['clients', 'payments', 'attendance', 'reports']
    enabled_modules = models.JSONField(
        default=list,
        help_text='Claves de módulos habilitados para esta organización.',
    )
    is_active = models.BooleanField(default=True)
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
