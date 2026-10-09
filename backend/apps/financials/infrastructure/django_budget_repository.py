import uuid
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404

from apps.financials.models import BudgetAccount, LineItem
from apps.narrative.models import Project
from apps.financials.application.ports import IBudgetRepository
from apps.financials.application.dtos import (
    BudgetAccountDTO,
    LineItemDTO,
    CreateBudgetAccountCommand,
    UpdateBudgetAccountCommand,
    CreateLineItemCommand,
    UpdateLineItemCommand,
)

class DjangoBudgetRepository(IBudgetRepository):
    """Django ORM implementation of IBudgetRepository port."""

    def get_project_accounts_with_items(self, project_id: uuid.UUID) -> List[Dict[str, Any]]:
        accounts = BudgetAccount.objects.filter(project_id=project_id).prefetch_related('line_items')
        results = []
        for account in accounts:
            items = list(account.line_items.all())
            est = sum(item.amount for item in items if not item.is_actual)
            act = sum(item.amount for item in items if item.is_actual)
            results.append({
                'id': account.id,
                'account_number': account.account_number,
                'category': account.category,
                'description': account.description,
                'estimated': float(est),
                'actual': float(act),
            })
        return results

    def create_account(self, project_id: uuid.UUID, command: CreateBudgetAccountCommand) -> BudgetAccountDTO:
        project = get_object_or_404(Project, id=project_id)
        account = BudgetAccount.objects.create(
            project=project,
            account_number=command.account_number,
            category=command.category,
            description=command.description,
        )
        return BudgetAccountDTO(
            id=account.id,
            project_id=account.project_id,
            account_number=account.account_number,
            category=account.category,
            description=account.description,
        )

    def update_account(self, account_id: uuid.UUID, command: UpdateBudgetAccountCommand) -> BudgetAccountDTO:
        account = get_object_or_404(BudgetAccount, id=account_id)
        if command.account_number is not None:
            account.account_number = command.account_number
        if command.category is not None:
            account.category = command.category
        if command.description is not None:
            account.description = command.description
        account.save()
        return BudgetAccountDTO(
            id=account.id,
            project_id=account.project_id,
            account_number=account.account_number,
            category=account.category,
            description=account.description,
        )

    def delete_account(self, account_id: uuid.UUID) -> None:
        account = get_object_or_404(BudgetAccount, id=account_id)
        account.delete()

    def list_items(self, account_id: uuid.UUID) -> List[LineItemDTO]:
        items = LineItem.objects.filter(account_id=account_id)
        return [
            LineItemDTO(
                id=item.id,
                account_id=item.account_id,
                description=item.description,
                amount=float(item.amount),
                currency=item.currency,
                is_actual=item.is_actual,
            )
            for item in items
        ]

    def create_item(self, account_id: uuid.UUID, command: CreateLineItemCommand) -> LineItemDTO:
        account = get_object_or_404(BudgetAccount, id=account_id)
        item = LineItem.objects.create(
            account=account,
            description=command.description,
            amount=command.amount,
            currency=command.currency,
            is_actual=command.is_actual,
        )
        return LineItemDTO(
            id=item.id,
            account_id=item.account_id,
            description=item.description,
            amount=float(item.amount),
            currency=item.currency,
            is_actual=item.is_actual,
        )

    def update_item(self, item_id: uuid.UUID, command: UpdateLineItemCommand) -> LineItemDTO:
        item = get_object_or_404(LineItem, id=item_id)
        if command.description is not None:
            item.description = command.description
        if command.amount is not None:
            item.amount = command.amount
        if command.currency is not None:
            item.currency = command.currency
        if command.is_actual is not None:
            item.is_actual = command.is_actual
        item.save()
        return LineItemDTO(
            id=item.id,
            account_id=item.account_id,
            description=item.description,
            amount=float(item.amount),
            currency=item.currency,
            is_actual=item.is_actual,
        )

    def delete_item(self, item_id: uuid.UUID) -> None:
        item = get_object_or_404(LineItem, id=item_id)
        item.delete()
