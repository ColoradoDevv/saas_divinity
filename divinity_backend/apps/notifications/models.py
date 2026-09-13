from django.db import models


class NotificationModel(models.Model):
    TYPE_CHOICES = [
        ('new_member', 'Nuevo miembro'),
        ('payment_received', 'Pago registrado'),
        ('subscription_expiring', 'Membresía por vencer'),
        ('subscription_expired', 'Membresía vencida'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=140)
    body = models.CharField(max_length=255, blank=True, default='')
    # Ruta del frontend a la que navegar al hacer click, ej. '/members/5'
    link = models.CharField(max_length=200, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'[{self.organization}] {self.title}'
