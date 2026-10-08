import uuid
from django.db import models

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class CameraSetup(TimeStampedModel):
    class CameraMovement(models.TextChoices):
        STATIC = 'STATIC', 'Static / Locked-off'
        PAN = 'PAN', 'Pan / Tilt'
        TRACK = 'TRACK', 'Tracking / Dolly'
        STEADI = 'STEADI', 'Steadicam / Gimbal'
        CRANE = 'CRANE', 'Crane / Jib'
        DRONE = 'DRONE', 'Drone / Aerial'

    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='camera_setups')
    setup_code = models.CharField(max_length=20, default='A')
    camera_movement = models.CharField(max_length=10, choices=CameraMovement.choices, default=CameraMovement.STATIC)
    equipment_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['setup_code', 'created_at']

    def __str__(self):
        return f"Scene {self.scene.scene_number} - Setup {self.setup_code}"

class Shot(TimeStampedModel):
    class ShotSize(models.TextChoices):
        WS = 'WS', 'Wide Shot'
        MS = 'MS', 'Medium Shot'
        CU = 'CU', 'Close Up'
        ECU = 'ECU', 'Extreme Close Up'
        INS = 'INS', 'Insert'
        POV = 'POV', 'Point of View'

    setup = models.ForeignKey(CameraSetup, on_delete=models.CASCADE, related_name='shots')
    shot_code = models.CharField(max_length=20, default='A1')
    shot_size = models.CharField(max_length=5, choices=ShotSize.choices, default=ShotSize.MS)
    lens = models.CharField(max_length=50, blank=True, null=True) # e.g., "35mm", "50mm"
    description = models.TextField(blank=True, default='')
    vfx_required = models.BooleanField(default=False)

    class Meta:
        ordering = ['shot_code', 'created_at']

    def __str__(self):
        return f"Shot {self.shot_code} - {self.setup}"

class Take(TimeStampedModel):
    shot = models.ForeignKey(Shot, on_delete=models.CASCADE, related_name='takes')
    take_number = models.PositiveIntegerField(default=1)
    is_circle_take = models.BooleanField(default=False)
    duration_seconds = models.PositiveIntegerField(blank=True, null=True)
    director_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['take_number']

    def __str__(self):
        circle = " [CIRCLE]" if self.is_circle_take else ""
        return f"Take {self.take_number}{circle} - {self.shot}"

class VfxShot(TimeStampedModel):
    class StatusChoices(models.TextChoices):
        PRE_VIS = 'PRE_VIS', 'Pre-Vis'
        ROTO = 'ROTO', 'Roto & Prep'
        COMPOSITING = 'COMPOSITING', 'Compositing'
        FINAL = 'FINAL', 'Final'

    scene = models.ForeignKey('narrative.Scene', on_delete=models.CASCADE, related_name='vfx_shots')
    vfx_id = models.CharField(max_length=50)
    status = models.CharField(max_length=50, choices=StatusChoices.choices, default=StatusChoices.PRE_VIS)
    description = models.TextField()
    frame_count = models.PositiveIntegerField(default=0)
    vendor_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"VFX {self.vfx_id} - {self.status}"
