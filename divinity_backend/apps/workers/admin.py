from django.contrib import admin

from .models import TaskModel, WorkerModel


class TaskInline(admin.TabularInline):
    model = TaskModel
    extra = 0
    fields = ('title', 'status', 'priority', 'due_date')


@admin.register(WorkerModel)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'organization', 'position', 'has_account', 'is_active')
    list_filter = ('organization', 'is_active')
    search_fields = ('first_name', 'last_name', 'email')
    inlines = [TaskInline]


@admin.register(TaskModel)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'worker', 'organization', 'status', 'priority', 'due_date')
    list_filter = ('organization', 'status', 'priority')
    search_fields = ('title', 'worker__first_name', 'worker__last_name')
