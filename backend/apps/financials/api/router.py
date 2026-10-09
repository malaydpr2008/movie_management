import uuid
from typing import List, Dict, Any
from ninja import Router, Schema

from apps.financials.application.use_cases import (
    GetBudgetSummaryUseCase,
    CreateBudgetAccountUseCase,
    UpdateBudgetAccountUseCase,
    DeleteBudgetAccountUseCase,
    ListLineItemsQuery,
    CreateLineItemUseCase,
    UpdateLineItemUseCase,
    DeleteLineItemUseCase,
)
from apps.financials.application.dtos import (
    CreateBudgetAccountCommand,
    UpdateBudgetAccountCommand,
    CreateLineItemCommand,
    UpdateLineItemCommand,
)
from apps.financials.infrastructure.django_budget_repository import DjangoBudgetRepository

financials_router = Router(tags=["Budgeting & Financials"])

class BudgetAccountOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    account_number: str
    category: str
    description: str

class BudgetAccountIn(Schema):
    account_number: str
    category: str
    description: str

class LineItemOut(Schema):
    id: uuid.UUID
    account_id: uuid.UUID
    description: str
    amount: float
    currency: str
    is_actual: bool

class LineItemIn(Schema):
    description: str
    amount: float
    currency: str = "USD"
    is_actual: bool = False

def _get_repo():
    return DjangoBudgetRepository()

@financials_router.get("/projects/{project_id}/budget-summary")
def get_budget_summary(request, project_id: uuid.UUID):
    uc = GetBudgetSummaryUseCase(_get_repo())
    return uc.execute(project_id)

@financials_router.post("/projects/{project_id}/accounts", response=BudgetAccountOut)
def create_budget_account(request, project_id: uuid.UUID, payload: BudgetAccountIn):
    uc = CreateBudgetAccountUseCase(_get_repo())
    cmd = CreateBudgetAccountCommand(
        account_number=payload.account_number,
        category=payload.category,
        description=payload.description,
    )
    dto = uc.execute(project_id, cmd)
    return BudgetAccountOut(
        id=dto.id,
        project_id=dto.project_id,
        account_number=dto.account_number,
        category=dto.category,
        description=dto.description,
    )

@financials_router.patch("/accounts/{account_id}", response=BudgetAccountOut)
def update_budget_account(request, account_id: uuid.UUID, payload: BudgetAccountIn):
    uc = UpdateBudgetAccountUseCase(_get_repo())
    cmd = UpdateBudgetAccountCommand(
        account_number=payload.account_number,
        category=payload.category,
        description=payload.description,
    )
    dto = uc.execute(account_id, cmd)
    return BudgetAccountOut(
        id=dto.id,
        project_id=dto.project_id,
        account_number=dto.account_number,
        category=dto.category,
        description=dto.description,
    )

@financials_router.delete("/accounts/{account_id}")
def delete_budget_account(request, account_id: uuid.UUID):
    uc = DeleteBudgetAccountUseCase(_get_repo())
    uc.execute(account_id)
    return {"success": True}

@financials_router.get("/accounts/{account_id}/items", response=List[LineItemOut])
def list_line_items(request, account_id: uuid.UUID):
    q = ListLineItemsQuery(_get_repo())
    dtos = q.execute(account_id)
    return [
        LineItemOut(
            id=d.id,
            account_id=d.account_id,
            description=d.description,
            amount=d.amount,
            currency=d.currency,
            is_actual=d.is_actual,
        )
        for d in dtos
    ]

@financials_router.post("/accounts/{account_id}/items", response=LineItemOut)
def create_line_item(request, account_id: uuid.UUID, payload: LineItemIn):
    uc = CreateLineItemUseCase(_get_repo())
    cmd = CreateLineItemCommand(
        description=payload.description,
        amount=payload.amount,
        currency=payload.currency,
        is_actual=payload.is_actual,
    )
    dto = uc.execute(account_id, cmd)
    return LineItemOut(
        id=dto.id,
        account_id=dto.account_id,
        description=dto.description,
        amount=dto.amount,
        currency=dto.currency,
        is_actual=dto.is_actual,
    )

@financials_router.patch("/items/{item_id}", response=LineItemOut)
def update_line_item(request, item_id: uuid.UUID, payload: LineItemIn):
    uc = UpdateLineItemUseCase(_get_repo())
    cmd = UpdateLineItemCommand(
        description=payload.description,
        amount=payload.amount,
        currency=payload.currency,
        is_actual=payload.is_actual,
    )
    dto = uc.execute(item_id, cmd)
    return LineItemOut(
        id=dto.id,
        account_id=dto.account_id,
        description=dto.description,
        amount=dto.amount,
        currency=dto.currency,
        is_actual=dto.is_actual,
    )

@financials_router.delete("/items/{item_id}")
def delete_line_item(request, item_id: uuid.UUID):
    uc = DeleteLineItemUseCase(_get_repo())
    uc.execute(item_id)
    return {"success": True}
