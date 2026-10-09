import json
from decimal import Decimal
from django.test import TestCase, Client
from apps.narrative.models import Project
from apps.financials.models import BudgetAccount, LineItem

class FinancialsCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Financials & Budget behavior:
    - Budget account & line item creation
    - Budget summary ledger rollup (ATL, BTL Production, BTL Post, Other)
    - Estimated budget vs Actual cost separation
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(
            title="Budget Movie",
            slug="budget-movie"
        )
        self.atl_account = BudgetAccount.objects.create(
            project=self.project,
            account_number="1100",
            category="ATL",
            description="Director & Producers"
        )
        self.btl_account = BudgetAccount.objects.create(
            project=self.project,
            account_number="2100",
            category="BTL_PRODUCTION",
            description="Camera Department"
        )

    def test_create_budget_account_and_line_item(self):
        """
        Behavior Protected: POST accounts and line items via API.
        Why it matters: Financials top-sheet ledger records budget items here.
        Level: API-level integration test.
        """
        item_payload = {
            "description": "Camera Package Rental (Arri Alexa 35)",
            "amount": 25000.00,
            "currency": "USD",
            "is_actual": False
        }
        response = self.client.post(
            f"/api/financials/accounts/{self.btl_account.id}/items",
            data=json.dumps(item_payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["description"], "Camera Package Rental (Arri Alexa 35)")
        self.assertEqual(data["amount"], 25000.00)
        self.assertFalse(data["is_actual"])
        self.assertTrue(LineItem.objects.filter(account=self.btl_account, description="Camera Package Rental (Arri Alexa 35)").exists())

    def test_budget_summary_rollup(self):
        """
        Behavior Protected: GET /api/financials/projects/{id}/budget-summary aggregates estimated and actual costs.
        Why it matters: Budget top-sheet variance calculation depends on accurate category sum rollups.
        Level: API-level integration test.
        """
        # ATL Estimated: $100,000, Actual: $95,000
        LineItem.objects.create(account=self.atl_account, description="Director Fee", amount=Decimal("100000.00"), is_actual=False)
        LineItem.objects.create(account=self.atl_account, description="Director Paid", amount=Decimal("95000.00"), is_actual=True)

        # BTL Production Estimated: $50,000, Actual: $55,000
        LineItem.objects.create(account=self.btl_account, description="Grip Rental Est", amount=Decimal("50000.00"), is_actual=False)
        LineItem.objects.create(account=self.btl_account, description="Grip Rental Paid", amount=Decimal("55000.00"), is_actual=True)

        response = self.client.get(f"/api/financials/projects/{self.project.id}/budget-summary")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["ATL"]["estimated"], 100000.00)
        self.assertEqual(data["ATL"]["actual"], 95000.00)
        self.assertEqual(data["BTL_PRODUCTION"]["estimated"], 50000.00)
        self.assertEqual(data["BTL_PRODUCTION"]["actual"], 55000.00)
        self.assertEqual(len(data["accounts"]), 2)
