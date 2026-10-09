from typing import List, Dict, Any

def calculate_budget_summary(accounts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Pure domain function that aggregates estimated and actual costs across
    standard film production categories (ATL, BTL_PRODUCTION, BTL_POST, OTHER).
    """
    summary = {
        'ATL': {'estimated': 0.0, 'actual': 0.0},
        'BTL_PRODUCTION': {'estimated': 0.0, 'actual': 0.0},
        'BTL_POST': {'estimated': 0.0, 'actual': 0.0},
        'OTHER': {'estimated': 0.0, 'actual': 0.0},
        'accounts': []
    }

    for acc in accounts_data:
        estimated = float(acc.get('estimated', 0.0))
        actual = float(acc.get('actual', 0.0))
        category = acc.get('category', 'OTHER')

        if category in summary:
            summary[category]['estimated'] += estimated
            summary[category]['actual'] += actual

        summary['accounts'].append({
            'id': str(acc['id']),
            'account_number': acc['account_number'],
            'category': category,
            'description': acc['description'],
            'estimated': estimated,
            'actual': actual,
        })

    return summary
