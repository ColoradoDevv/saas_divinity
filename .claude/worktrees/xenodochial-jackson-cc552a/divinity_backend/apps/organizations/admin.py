from django.contrib import admin

from .models import MembershipModel, OrganizationModel


class MembershipInline(admin.TabularInline):
    model = MembershipModel
    extra = 1
    fields = ('user', 'role', 'is_active', 'joined_at')
    readonly_fields = ('joined_at',)


@admin.register(OrganizationModel)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'plan', 'is_active', 'created_at')
    list_filter = ('plan', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [MembershipInline]


@admin.register(MembershipModel)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'is_active', 'joined_at')
    list_filter = ('role', 'is_active', 'organization')
    search_fields = ('user__email', 'organization__name')
