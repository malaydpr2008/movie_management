from dataclasses import dataclass
from typing import Optional
import uuid

@dataclass(frozen=True)
class CreateBudgetAccountCommand:
    account_number: str
    category: str
    description: str

@dataclass(frozen=True)
class UpdateBudgetAccountCommand:
    account_number: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

@dataclass(frozen=True)
class BudgetAccountDTO:
    id: uuid.UUID
    project_id: uuid.UUID
    account_number: str
    category: str
    description: str

@dataclass(frozen=True)
class CreateLineItemCommand:
    description: str
    amount: float
    currency: str = "USD"
    is_actual: bool = False

@dataclass(frozen=True)
class UpdateLineItemCommand:
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    is_actual: Optional[bool] = None

@dataclass(frozen=True)
class LineItemDTO:
    id: uuid.UUID
    account_id: uuid.UUID
    description: str
    amount: float
    currency: str
    is_actual: bool
