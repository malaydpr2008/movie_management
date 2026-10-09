import re

def slugify_title(title: str) -> str:
    """Pure domain function that converts a project title to a URL-safe base slug."""
    s = title.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[-\s]+', '-', s)
    return s or "untitled-project"
