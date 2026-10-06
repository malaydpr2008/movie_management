import uuid
from django.db import models
from simple_history.models import HistoricalRecords

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class ProductionUnit(TimeStampedModel):
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='production_units')
    name = models.CharField(max_length=255, default='Main Unit')

    def __str__(self):
        return f"{self.project.title} - {self.name}"

class ShootDay(TimeStampedModel):
    unit = models.ForeignKey(ProductionUnit, on_delete=models.CASCADE, related_name='shoot_days')
    day_number = models.PositiveIntegerField(default=1)
    calendar_date = models.DateField()
    general_crew_call = models.TimeField(blank=True, null=True)
    shooting_call = models.TimeField(blank=True, null=True)
    hospital_address = models.TextField(blank=True, default='')
    history = HistoricalRecords()

    class Meta:
        ordering = ['day_number']

    def __str__(self):
        return f"Day {self.day_number} ({self.calendar_date}) - {self.unit.name}"

class StripboardItem(TimeStampedModel):
    ITEM_TYPE_CHOICES = [
        ('SCENE', 'SCENE'),
        ('BANNER', 'BANNER'),
    ]

    shoot_day = models.ForeignKey(ShootDay, on_delete=models.CASCADE, related_name='stripboard_items')
    order_index = models.CharField(max_length=50, default='0|hzzzzz:')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='SCENE')
    scene = models.ForeignKey('narrative.Scene', on_delete=models.SET_NULL, null=True, blank=True, related_name='stripboard_items')
    banner_label = models.CharField(max_length=255, blank=True, default='')
    history = HistoricalRecords()

    class Meta:
        ordering = ['order_index', 'created_at']

    def __str__(self):
        if self.item_type == 'SCENE' and self.scene:
            return f"Strip: Scene {self.scene.scene_number}"
        return f"Banner: {self.banner_label}"

class DailyProductionReport(TimeStampedModel):
    shoot_day = models.OneToOneField(ShootDay, on_delete=models.CASCADE, related_name='dpr')
    actual_first_shot = models.TimeField(null=True, blank=True)
    actual_wrap = models.TimeField(null=True, blank=True)
    scenes_completed = models.PositiveIntegerField(default=0)
    pages_completed = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    camera_rolls_used = models.PositiveIntegerField(default=0)
    sound_rolls_used = models.PositiveIntegerField(default=0)
    delay_notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"DPR: {self.shoot_day}"

class CrewMember(TimeStampedModel):
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='crew')
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.role} ({self.department})"
