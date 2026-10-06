from django.contrib import admin
from .models import ProductionUnit, ShootDay, StripboardItem

class StripboardItemInline(admin.TabularInline):
    model = StripboardItem
    extra = 1

@admin.register(ProductionUnit)
class ProductionUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'created_at')
    list_filter = ('project',)
    search_fields = ('name',)

@admin.register(ShootDay)
class ShootDayAdmin(admin.ModelAdmin):
    list_display = ('day_number', 'unit', 'calendar_date', 'general_crew_call', 'shooting_call')
    list_filter = ('unit__project', 'unit')
    search_fields = ('hospital_address',)
    inlines = [StripboardItemInline]

@admin.register(StripboardItem)
class StripboardItemAdmin(admin.ModelAdmin):
    list_display = ('shoot_day', 'order_index', 'item_type', 'scene', 'banner_label')
    list_filter = ('item_type', 'shoot_day__unit__project')
    search_fields = ('banner_label', 'scene__scene_number')
