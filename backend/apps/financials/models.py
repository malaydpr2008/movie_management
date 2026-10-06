import uuid
from django.db import models
from apps.narrative.models import Project

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class BudgetAccount(TimeStampedModel):
    CATEGORY_CHOICES = [
        ('ATL', 'ATL'),
        ('BTL_PRODUCTION', 'BTL_PRODUCTION'),
        ('BTL_POST', 'BTL_POST'),
        ('OTHER', 'OTHER'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='budget_accounts')
    account_number = models.CharField(max_length=10)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.account_number} - {self.description}"

class LineItem(TimeStampedModel):
    account = models.ForeignKey(BudgetAccount, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')
    is_actual = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.description} ({self.amount} {self.currency})"
