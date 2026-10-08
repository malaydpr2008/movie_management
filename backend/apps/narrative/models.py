import uuid
from django.db import models
from apps.core.models import SoftDeleteModel
from simple_history.models import HistoricalRecords

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Project(TimeStampedModel, SoftDeleteModel):
    STATUS_CHOICES = [
        ('PRE_PRODUCTION', 'Pre-Production'),
        ('PRODUCTION', 'Production'),
        ('POST_PRODUCTION', 'Post-Production'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PRE_PRODUCTION')
    aspect_ratio = models.CharField(max_length=20, default='2.39:1')
    target_runtime_minutes = models.PositiveIntegerField(default=120)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    poster = models.ImageField(upload_to='posters/', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class Act(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='acts')
    title = models.CharField(max_length=255)
    order_index = models.CharField(max_length=50, default='0|hzzzzz:')
    target_page_length = models.FloatField(default=30.0)
    dramatic_milestone = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['order_index', 'created_at']

    def __str__(self):
        return f"{self.project.title} - {self.title}"

class Sequence(TimeStampedModel):
    act = models.ForeignKey(Act, on_delete=models.CASCADE, related_name='sequences')
    title = models.CharField(max_length=255)
    order_index = models.CharField(max_length=50, default='0|hzzzzz:')
    color_tag = models.CharField(max_length=50, default='#3B82F6')
    dramatic_question = models.TextField(blank=True, default='')
    temp_score_reference = models.CharField(max_length=255, blank=True, default='')
    continuity_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['order_index', 'created_at']

    def __str__(self):
        return f"{self.act.title} -> {self.title}"

class Scene(TimeStampedModel):
    INT_EXT_CHOICES = [
        ('INT', 'INT'),
        ('EXT', 'EXT'),
        ('INT/EXT', 'INT/EXT'),
    ]

    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, null=True, blank=True, related_name='scenes')
    master_location = models.ForeignKey('breakdown.MasterLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='scenes')
    scene_number = models.CharField(max_length=20)
    order_index = models.CharField(max_length=50, default='0|hzzzzz:')
    int_ext = models.CharField(max_length=10, choices=INT_EXT_CHOICES, default='INT')
    set_name = models.CharField(max_length=255)
    time_of_day = models.CharField(max_length=50, default='DAY')
    pages_eighths = models.PositiveSmallIntegerField(default=8)
    estimated_shoot_minutes = models.PositiveIntegerField(default=120)
    script_data = models.JSONField(default=dict, blank=True)
    synopsis = models.TextField(blank=True, default='')
    history = HistoricalRecords()

    class Meta:
        ordering = ['order_index', 'created_at']

    def __str__(self):
        return f"SCENE {self.scene_number} - {self.int_ext} {self.set_name} - {self.time_of_day}"

    @property
    def pages_display(self):
        whole = self.pages_eighths // 8
        remainder = self.pages_eighths % 8
        if whole > 0 and remainder > 0:
            return f"{whole} {remainder}/8"
        elif remainder > 0:
            return f"{remainder}/8"
        else:
            return f"{whole}"

class ADRCue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scene = models.ForeignKey('Scene', on_delete=models.CASCADE, related_name='adr_cues')
    character_name = models.CharField(max_length=255)
    line_text = models.TextField()
    timecode = models.CharField(max_length=50, blank=True, null=True)
    reason = models.CharField(max_length=255) # e.g., "Airplane noise", "Mumbled", "Line change"
    status = models.CharField(max_length=50, default='PENDING') # PENDING, RECORDED, APPROVED
    created_at = models.DateTimeField(auto_now_add=True)
