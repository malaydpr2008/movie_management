"""
Logistics Domain - Page eighth formatting.
"""

def format_pages_eighths(total_eighths: int) -> str:
    """Format total eighths of a page into screenplay page display string (e.g. '2 3/8 pgs')."""
    whole = total_eighths // 8
    rem = total_eighths % 8
    if whole > 0 and rem > 0:
        return f"{whole} {rem}/8 pgs"
    elif rem > 0:
        return f"{rem}/8 pgs"
    elif whole > 0:
        return f"{whole} pgs"
    else:
        return "0 pgs"
