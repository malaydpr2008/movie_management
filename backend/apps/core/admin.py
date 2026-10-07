from django.contrib import admin
from .models import BackgroundJob

@admin.register(BackgroundJob)
class BackgroundJobAdmin(admin.ModelAdmin):
    list_display = ('task_name', 'status', 'created_at')
    list_filter = ('status',)
