from django.contrib import admin
from .models import CameraSetup, Shot, Take

class TakeInline(admin.TabularInline):
    model = Take
    extra = 1

@admin.register(CameraSetup)
class CameraSetupAdmin(admin.ModelAdmin):
    list_display = ('setup_code', 'scene', 'lighting_package_notes', 'created_at')
    list_filter = ('setup_code', 'scene__sequence__act__project')
    search_fields = ('setup_code', 'lighting_package_notes')

@admin.register(Shot)
class ShotAdmin(admin.ModelAdmin):
    list_display = ('id', 'scene', 'shot_size', 'lens', 'camera_movement', 'vfx_required')
    list_filter = ('shot_size', 'camera_movement', 'vfx_required', 'scene')
    search_fields = ('description', 'lens')
    inlines = [TakeInline]

@admin.register(Take)
class TakeAdmin(admin.ModelAdmin):
    list_display = ('take_number', 'shot', 'is_circle_take', 'camera_card', 'sound_roll', 'timecode_in', 'timecode_out')
    list_filter = ('is_circle_take', 'shot__scene')
    search_fields = ('camera_card', 'sound_roll', 'script_supervisor_notes')
