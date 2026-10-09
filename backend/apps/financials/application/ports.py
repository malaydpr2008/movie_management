from typing import Protocol, List, Dict, Any
import uuid
from apps.financials.application.dtos import (
    BudgetAccountDTO,
    LineItemDTO,
    CreateBudgetAccountCommand,
    UpdateBudgetAccountCommand,
    CreateLineItemCommand,
    UpdateLineItemCommand,
)

class IBudgetRepository(Protocol):
    """Port for budget persistence operations."""

    def get_project_accounts_with_items(self, project_id: uuid.UUID) -> List[Dict[str, Any]]:
        ...

    def create_account(self, project_id: uuid.UUID, command: CreateBudgetAccountCommand) -> BudgetAccountDTO:
        ...

    def update_account(self, account_id: uuid.UUID, command: UpdateBudgetAccountCommand) -> BudgetAccountDTO:
        ...

    def delete_account(self, account_id: uuid.UUID) -> None:
        ...

    def list_items(self, account_id: uuid.UUID) -> List[LineItemDTO]:
        ...

    def create_item(self, account_id: uuid.UUID, command: CreateLineItemCommand) -> LineItemDTO:
        ...

    def update_item(self, item_id: uuid.UUID, command: UpdateLineItemCommand) -> LineItemDTO:
        ...

    def delete_item(self, item_id: uuid.UUID) -> None:
        ...
