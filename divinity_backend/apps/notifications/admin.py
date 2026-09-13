from django.contrib import admin

from .models import NotificationModel


@admin.register(NotificationModel)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'organization', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'organization')
    search_fields = ('title', 'body')
