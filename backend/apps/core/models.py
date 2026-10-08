import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class User(AbstractUser):
    pass

class ProjectMembership(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Owner'),
        ('ADMIN', 'Admin'),
        ('EDITOR', 'Editor'),
        ('VIEWER', 'Viewer'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    project = models.ForeignKey('narrative.Project', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VIEWER')

    class Meta:
        unique_together = ('user', 'project')

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def all_with_deleted(self):
        return super().get_queryset()

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

    def soft_delete(self):
        self.delete()

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()

class BackgroundJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_name = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='RUNNING') # RUNNING, SUCCESS, FAILED
    result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class MediaAsset(models.Model):
    class FileTypeChoices(models.TextChoices):
        IMAGE = 'IMAGE', 'Image'
        AUDIO = 'AUDIO', 'Audio'
        PDF = 'PDF', 'PDF'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=10, choices=FileTypeChoices.choices, default=FileTypeChoices.IMAGE)
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=50) # To handle UUIDs cleanly
    content_object = GenericForeignKey('content_type', 'object_id')
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"MediaAsset [{self.file_type}] for {self.content_type.model} {self.object_id}"
