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

class Shot(models.Model):
    class ShotSize(models.TextChoices):
        WIDE = 'WS', 'Wide Shot'
        MEDIUM = 'MS', 'Medium Shot'
        CLOSE_UP = 'CU', 'Close Up'
        EXTREME_CU = 'ECU', 'Extreme Close Up'
        INSERT = 'INS', 'Insert'
        POV = 'POV', 'Point of View'

    class CameraMovement(models.TextChoices):
        STATIC = 'STATIC', 'Static / Locked-off'
        PAN_TILT = 'PAN', 'Pan / Tilt'
        TRACKING = 'TRACK', 'Tracking / Dolly'
        STEADICAM = 'STEADI', 'Steadicam / Gimbal'
        HANDHELD = 'HH', 'Handheld'
        CRANE = 'CRANE', 'Crane / Jib'
        DRONE = 'DRONE', 'Drone / Aerial'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='shots')
    shot_size = models.CharField(max_length=5, choices=ShotSize.choices, default=ShotSize.MEDIUM)
    camera_movement = models.CharField(max_length=10, choices=CameraMovement.choices, default=CameraMovement.STATIC)
    lens = models.CharField(max_length=50, blank=True, null=True) # e.g., "35mm", "50mm"
    description = models.TextField()
    estimated_setup_time = models.IntegerField(default=15, help_text="Setup time in minutes")
    vfx_required = models.BooleanField(default=False) # Crucial for future AI indexing
    created_at = models.DateTimeField(auto_now_add=True)

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
