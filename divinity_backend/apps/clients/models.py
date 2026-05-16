from django.db import models


class ClientModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='clients',
    )
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client'
        ordering = ['-created_at']
        # Email único por organización
        unique_together = [['organization', 'email']]

    def __str__(self) -> str:
        return f'{self.first_name} {self.last_name} <{self.email}>'
