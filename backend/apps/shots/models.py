import uuid
from django.db import models

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class CameraSetup(TimeStampedModel):
    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='camera_setups')
    setup_code = models.CharField(max_length=20, default='A')
    lighting_package_notes = models.TextField(blank=True, default='')
    overhead_floorplan_url = models.URLField(max_length=500, blank=True, default='')

    class Meta:
        ordering = ['setup_code', 'created_at']

    def __str__(self):
        return f"Scene {self.scene.scene_number} - Setup {self.setup_code}"

class Shot(TimeStampedModel):
    setup = models.ForeignKey(CameraSetup, on_delete=models.CASCADE, related_name='shots')
    shot_code = models.CharField(max_length=20, default='1')
    order_index = models.CharField(max_length=50, default='0|hzzzzz:')
    shot_size = models.CharField(max_length=50, default='MCU')  # e.g., Wide, Medium, Close-Up, MCU, ECU
    focal_length = models.CharField(max_length=50, default='35mm')
    camera_movement = models.CharField(max_length=50, default='Static')  # Static, Pan, Dolly, Steadicam, Handheld, Crane
    framing_description = models.TextField(blank=True, default='')
    storyboard_frame_url = models.ImageField(upload_to='storyboards/', null=True, blank=True)
    covered_script_blocks = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['order_index', 'shot_code', 'created_at']

    def __str__(self):
        return f"Shot {self.setup.setup_code}{self.shot_code} ({self.shot_size}, {self.focal_length})"

class Take(TimeStampedModel):
    shot = models.ForeignKey(Shot, on_delete=models.CASCADE, related_name='takes')
    take_number = models.PositiveIntegerField(default=1)
    is_circle_take = models.BooleanField(default=False)
    camera_card = models.CharField(max_length=50, blank=True, default='A001')
    sound_roll = models.CharField(max_length=50, blank=True, default='SR01')
    timecode_in = models.CharField(max_length=20, blank=True, default='01:00:00:00')
    timecode_out = models.CharField(max_length=20, blank=True, default='01:01:15:12')
    script_supervisor_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['take_number']

    def __str__(self):
        circle = " [CIRCLE]" if self.is_circle_take else ""
        return f"Take {self.take_number}{circle} - {self.shot}"

class VfxShot(TimeStampedModel):
    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='vfx_shots')
    vfx_id = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    description = models.TextField()
    frame_count = models.PositiveIntegerField(default=0)
    vendor_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"VFX {self.vfx_id} - {self.status}"
