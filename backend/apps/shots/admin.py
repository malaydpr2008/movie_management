from django.contrib import admin
from .models import CameraSetup, Shot, Take

class TakeInline(admin.TabularInline):
    model = Take
    extra = 1

@admin.register(CameraSetup)
class CameraSetupAdmin(admin.ModelAdmin):
    list_display = ('setup_code', 'scene', 'camera_movement', 'created_at')
    list_filter = ('camera_movement', 'scene__sequence__act__project')
    search_fields = ('setup_code', 'equipment_notes')

@admin.register(Shot)
class ShotAdmin(admin.ModelAdmin):
    list_display = ('id', 'setup', 'shot_size', 'lens', 'vfx_required')
    list_filter = ('shot_size', 'vfx_required', 'setup__scene')
    search_fields = ('description', 'lens')
    inlines = [TakeInline]

@admin.register(Take)
class TakeAdmin(admin.ModelAdmin):
    list_display = ('take_number', 'shot', 'is_circle_take', 'duration_seconds')
    list_filter = ('is_circle_take', 'shot__setup__scene')
    search_fields = ('director_notes',)
