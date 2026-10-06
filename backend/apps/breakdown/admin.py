from django.contrib import admin
from .models import MasterLocation, Character, CostumeLook, Prop, SceneBreakdownItem

@admin.register(MasterLocation)
class MasterLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'address', 'gps_coordinates')
    list_filter = ('project',)
    search_fields = ('name', 'address', 'sun_path_notes')

@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('cast_id_number', 'name', 'actor_name', 'project')
    list_filter = ('project',)
    search_fields = ('name', 'actor_name')

@admin.register(CostumeLook)
class CostumeLookAdmin(admin.ModelAdmin):
    list_display = ('look_number', 'character', 'description')
    list_filter = ('character__project', 'character')
    search_fields = ('look_number', 'description')

@admin.register(Prop)
class PropAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'is_hero_prop', 'quantity')
    list_filter = ('project', 'is_hero_prop')
    search_fields = ('name',)

@admin.register(SceneBreakdownItem)
class SceneBreakdownItemAdmin(admin.ModelAdmin):
    list_display = ('scene', 'element_type', 'prop', 'costume', 'is_continuity_critical')
    list_filter = ('element_type', 'is_continuity_critical', 'scene__sequence__act__project')
    search_fields = ('custom_notes', 'prop__name', 'costume__description')
