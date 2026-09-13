from django.contrib import admin

from .models import CheckInModel


@admin.register(CheckInModel)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('member', 'method', 'checked_in_at', 'organization')
    list_filter = ('method', 'organization')
    search_fields = ('member__first_name', 'member__last_name', 'member__email', 'member__member_code')
