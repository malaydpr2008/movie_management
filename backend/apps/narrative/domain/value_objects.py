from dataclasses import dataclass

@dataclass(frozen=True)
class PageEighths:
    """
    Pure domain value object representing screenplay page length in 1/8 page increments.
    Encapsulates industry standard fractional page arithmetic and display formatting.
    """
    eighths: int

    def __post_init__(self):
        if self.eighths < 0:
            raise ValueError("Page eighths cannot be negative.")

    def to_display_string(self) -> str:
        """
        Formats eighths into standard industry display:
        e.g. 12 -> "1 4/8", 8 -> "1", 4 -> "4/8", 0 -> "0".
        """
        whole = self.eighths // 8
        remainder = self.eighths % 8
        if whole > 0 and remainder > 0:
            return f"{whole} {remainder}/8"
        elif remainder > 0:
            return f"{remainder}/8"
        else:
            return f"{whole}"

    def to_pages_float(self) -> float:
        """Converts eighths to decimal pages rounded to two decimal places."""
        return round(self.eighths / 8.0, 2)
