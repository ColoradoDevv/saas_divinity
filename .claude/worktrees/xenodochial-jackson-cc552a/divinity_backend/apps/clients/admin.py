from django.contrib import admin
from .models import ClientModel


@admin.register(ClientModel)
class ClientModelAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'is_active', 'created_at')
    search_fields = ('first_name', 'last_name', 'email')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
