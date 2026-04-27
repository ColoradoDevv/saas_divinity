from django.db import models


class ClientModel(models.Model):
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.first_name} {self.last_name} <{self.email}>'
