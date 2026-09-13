from django.contrib import admin

from .models import DuesPaymentModel, MembershipPlanModel, MemberSubscriptionModel


@admin.register(MembershipPlanModel)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'price', 'duration_value', 'duration_unit', 'is_active')
    list_filter = ('is_active', 'duration_unit', 'organization')
    search_fields = ('name', 'organization__name')


@admin.register(MemberSubscriptionModel)
class MemberSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('member', 'plan', 'status', 'start_date', 'end_date', 'organization')
    list_filter = ('status', 'organization')
    search_fields = ('member__first_name', 'member__last_name', 'member__email')


@admin.register(DuesPaymentModel)
class DuesPaymentAdmin(admin.ModelAdmin):
    list_display = ('member', 'amount', 'method', 'paid_at', 'organization')
    list_filter = ('method', 'organization')
    search_fields = ('member__first_name', 'member__last_name', 'member__email')
