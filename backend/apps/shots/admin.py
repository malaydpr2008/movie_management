from django.contrib import admin
from .models import CameraSetup, Shot, Take

class ShotInline(admin.TabularInline):
    model = Shot
    extra = 1

class TakeInline(admin.TabularInline):
    model = Take
    extra = 1

@admin.register(CameraSetup)
class CameraSetupAdmin(admin.ModelAdmin):
    list_display = ('setup_code', 'scene', 'lighting_package_notes', 'created_at')
    list_filter = ('setup_code', 'scene__sequence__act__project')
    search_fields = ('setup_code', 'lighting_package_notes')
    inlines = [ShotInline]

@admin.register(Shot)
class ShotAdmin(admin.ModelAdmin):
    list_display = ('shot_code', 'setup', 'shot_size', 'focal_length', 'camera_movement', 'order_index')
    list_filter = ('shot_size', 'camera_movement', 'setup__scene')
    search_fields = ('shot_code', 'framing_description', 'focal_length')
    inlines = [TakeInline]

@admin.register(Take)
class TakeAdmin(admin.ModelAdmin):
    list_display = ('take_number', 'shot', 'is_circle_take', 'camera_card', 'sound_roll', 'timecode_in', 'timecode_out')
    list_filter = ('is_circle_take', 'shot__setup__scene')
    search_fields = ('camera_card', 'sound_roll', 'script_supervisor_notes')
