from django.contrib.auth import get_user_model
from django.db import models


class WorkerModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='workers',
    )
    # Cuenta de sistema opcional — si es None, el trabajador no puede iniciar sesión
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='worker_profile',
    )
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    position = models.CharField(max_length=80, blank=True)  # "Barbero", "Cajero", etc.
    # Módulos del sistema que el trabajador puede ver (subconjunto de org.enabled_modules)
    allowed_modules = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'worker'
        ordering = ['first_name', 'last_name']

    def __str__(self) -> str:
        return f'{self.first_name} {self.last_name}'

    @property
    def full_name(self) -> str:
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def has_account(self) -> bool:
        return self.user_id is not None


class TaskModel(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('in_progress', 'En progreso'),
        ('done', 'Completada'),
        ('cancelled', 'Cancelada'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='tasks',
    )
    worker = models.ForeignKey(
        WorkerModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return self.title
