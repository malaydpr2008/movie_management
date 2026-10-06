"""
LexoRank helper module for between-rank calculations.
Provides simple, collision-resistant fractional indexing.
"""

BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def get_char_index(c: str) -> int:
    return BASE62.find(c)

def get_index_char(idx: int) -> str:
    return BASE62[idx % len(BASE62)]

def midpoint(prev_str: str, next_str: str) -> str:
    """Calculates a string lexicographically strictly between prev_str and next_str."""
    if not prev_str and not next_str:
        return "m"
    if not prev_str:
        # Before next_str
        first = next_str[0]
        idx = get_char_index(first)
        if idx > 0:
            return get_index_char(idx // 2) + next_str[1:]
        else:
            return "0" + next_str
    if not next_str:
        # After prev_str
        last = prev_str[0]
        idx = get_char_index(last)
        if idx < len(BASE62) - 1:
            return get_index_char(idx + (len(BASE62) - idx) // 2)
        else:
            return prev_str + "m"

    # Compare character by character
    result = []
    i = 0
    max_len = max(len(prev_str), len(next_str)) + 2
    while i < max_len:
        p = get_char_index(prev_str[i]) if i < len(prev_str) else 0
        n = get_char_index(next_str[i]) if i < len(next_str) else len(BASE62)

        if p == n:
            result.append(get_index_char(p))
            i += 1
            continue

        if n - p > 1:
            mid = (p + n) // 2
            result.append(get_index_char(mid))
            return "".join(result)
        else:
            result.append(get_index_char(p))
            # Next digit calculation
            i += 1
            p_next = get_char_index(prev_str[i]) if i < len(prev_str) else 0
            n_next = len(BASE62)
            mid = (p_next + n_next) // 2
            result.append(get_index_char(mid))
            return "".join(result)

    return "".join(result) + "m"
