/**
 * Client-side LexoRank calculation for optimistic drag & drop reordering.
 */

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function getCharIndex(c: string): number {
  return BASE62.indexOf(c);
}

function getIndexChar(idx: number): string {
  return BASE62[((idx % BASE62.length) + BASE62.length) % BASE62.length];
}

export function calculateLexoRankMidpoint(prevRank?: string | null, nextRank?: string | null): string {
  if (!prevRank && !nextRank) {
    return "0|hzzzzz:";
  }

  if (!prevRank) {
    // Insert before nextRank
    const cleanNext = nextRank?.replace(/^0\|/, "").replace(/:$/, "") || "h";
    const firstChar = cleanNext[0];
    const idx = getCharIndex(firstChar);
    if (idx > 1) {
      return `0|${getIndexChar(Math.floor(idx / 2))}${cleanNext.slice(1)}:`;
    }
    return `0|0${cleanNext}:`;
  }

  if (!nextRank) {
    // Insert after prevRank
    const cleanPrev = prevRank?.replace(/^0\|/, "").replace(/:$/, "") || "h";
    const firstChar = cleanPrev[0];
    const idx = getCharIndex(firstChar);
    if (idx < BASE62.length - 2) {
      return `0|${getIndexChar(idx + Math.floor((BASE62.length - idx) / 2))}:`;
    }
    return `0|${cleanPrev}m:`;
  }

  // Calculate between two ranks
  const pStr = prevRank.replace(/^0\|/, "").replace(/:$/, "");
  const nStr = nextRank.replace(/^0\|/, "").replace(/:$/, "");

  let result = "";
  let i = 0;
  const maxLen = Math.max(pStr.length, nStr.length) + 2;

  while (i < maxLen) {
    const p = i < pStr.length ? getCharIndex(pStr[i]) : 0;
    const n = i < nStr.length ? getCharIndex(nStr[i]) : BASE62.length;

    if (p === n) {
      result += getIndexChar(p);
      i++;
      continue;
    }

    if (n - p > 1) {
      const mid = Math.floor((p + n) / 2);
      result += getIndexChar(mid);
      return `0|${result}:`;
    } else {
      result += getIndexChar(p);
      i++;
      const pNext = i < pStr.length ? getCharIndex(pStr[i]) : 0;
      const nNext = BASE62.length;
      const mid = Math.floor((pNext + nNext) / 2);
      result += getIndexChar(mid);
      return `0|${result}:`;
    }
  }

  return `0|${result}m:`;
}
