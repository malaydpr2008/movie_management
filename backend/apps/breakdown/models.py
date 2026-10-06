import uuid
from django.db import models

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class MasterLocation(TimeStampedModel):
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='master_locations')
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, default='')
    gps_coordinates = models.CharField(max_length=100, blank=True, default='')
    sun_path_notes = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.project.title} - {self.name}"

class Character(TimeStampedModel):
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='characters')
    name = models.CharField(max_length=255)
    cast_id_number = models.PositiveIntegerField(default=1)
    actor_name = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['cast_id_number']

    def __str__(self):
        return f"#{self.cast_id_number} {self.name}"

class CostumeLook(TimeStampedModel):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='costume_looks')
    look_number = models.CharField(max_length=50, default='Look 1')
    description = models.TextField(blank=True, default='')
    continuity_photo_url = models.ImageField(upload_to='costumes/', null=True, blank=True)

    def __str__(self):
        return f"{self.character.name} - {self.look_number}"

class Prop(TimeStampedModel):
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='props')
    name = models.CharField(max_length=255)
    is_hero_prop = models.BooleanField(default=False)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        hero_tag = " [HERO]" if self.is_hero_prop else ""
        return f"{self.name} (x{self.quantity}){hero_tag}"

class SceneBreakdownItem(TimeStampedModel):
    ELEMENT_TYPE_CHOICES = [
        ('PROP', 'PROP'),
        ('WARDROBE', 'WARDROBE'),
        ('SOUND', 'SOUND'),
        ('SFX', 'SFX'),
        ('VFX', 'VFX'),
    ]

    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='breakdown_items')
    element_type = models.CharField(max_length=50, choices=ELEMENT_TYPE_CHOICES, default='PROP')
    prop = models.ForeignKey(Prop, on_delete=models.SET_NULL, null=True, blank=True, related_name='scene_items')
    costume = models.ForeignKey(CostumeLook, on_delete=models.SET_NULL, null=True, blank=True, related_name='scene_items')
    custom_notes = models.TextField(blank=True, default='')
    is_continuity_critical = models.BooleanField(default=False)

    class Meta:
        ordering = ['element_type', 'created_at']

    def __str__(self):
        target = self.prop.name if self.prop else (f"{self.costume}" if self.costume else self.custom_notes)
        return f"[{self.element_type}] {target}"
