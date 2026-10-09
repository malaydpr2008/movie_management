import uuid
from typing import List, Dict, Any
from apps.financials.application.ports import IBudgetRepository
from apps.financials.application.dtos import (
    BudgetAccountDTO,
    LineItemDTO,
    CreateBudgetAccountCommand,
    UpdateBudgetAccountCommand,
    CreateLineItemCommand,
    UpdateLineItemCommand,
)
from apps.financials.domain import calculate_budget_summary

class GetBudgetSummaryUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, project_id: uuid.UUID) -> Dict[str, Any]:
        accounts_data = self.repository.get_project_accounts_with_items(project_id)
        return calculate_budget_summary(accounts_data)

class CreateBudgetAccountUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, project_id: uuid.UUID, command: CreateBudgetAccountCommand) -> BudgetAccountDTO:
        return self.repository.create_account(project_id, command)

class UpdateBudgetAccountUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, account_id: uuid.UUID, command: UpdateBudgetAccountCommand) -> BudgetAccountDTO:
        return self.repository.update_account(account_id, command)

class DeleteBudgetAccountUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, account_id: uuid.UUID) -> None:
        self.repository.delete_account(account_id)

class ListLineItemsQuery:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, account_id: uuid.UUID) -> List[LineItemDTO]:
        return self.repository.list_items(account_id)

class CreateLineItemUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, account_id: uuid.UUID, command: CreateLineItemCommand) -> LineItemDTO:
        return self.repository.create_item(account_id, command)

class UpdateLineItemUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, item_id: uuid.UUID, command: UpdateLineItemCommand) -> LineItemDTO:
        return self.repository.update_item(item_id, command)

class DeleteLineItemUseCase:
    def __init__(self, repository: IBudgetRepository):
        self.repository = repository

    def execute(self, item_id: uuid.UUID) -> None:
        self.repository.delete_item(item_id)
