from django.contrib import admin
from .models import Project, Act, Sequence, Scene

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'aspect_ratio', 'target_runtime_minutes', 'created_at')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Act)
class ActAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'order_index', 'target_page_length', 'dramatic_milestone')
    list_filter = ('project',)
    search_fields = ('title', 'dramatic_milestone')

@admin.register(Sequence)
class SequenceAdmin(admin.ModelAdmin):
    list_display = ('title', 'act', 'order_index', 'color_tag')
    list_filter = ('act__project', 'act')
    search_fields = ('title', 'dramatic_question', 'temp_score_reference')

@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('scene_number', 'sequence', 'int_ext', 'set_name', 'time_of_day', 'pages_eighths', 'estimated_shoot_minutes')
    list_filter = ('int_ext', 'time_of_day', 'sequence__act__project', 'sequence')
    search_fields = ('scene_number', 'set_name', 'synopsis')
