#!/usr/bin/env python3
"""
CineFlow Studio - Architecture Dependency Verification CLI.

Usage:
    python scripts/check_architecture.py

Exits with:
    0 - All architectural rules passed without violations.
    1 - Architectural boundary violations detected.
"""

import os
import sys

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from apps.core.architecture_checker import (
    check_all_backend_dependencies,
    PROHIBITED_DOMAIN_PREFIXES,
    PROHIBITED_APPLICATION_PREFIXES,
    APPROVED_APPLICATION_INFRA_IMPORTS,
)


def main() -> int:
    print("=" * 70)
    print("CineFlow Studio - Backend Architecture Dependency Linter")
    print("=" * 70)
    print(f"Scanning backend apps in: {BACKEND_ROOT}")
    print("\n[ENFORCED RULES]")
    print(f" 1. Domain Layer: Zero framework/infrastructure imports.")
    print(f"    Disallowed prefixes: {', '.join(PROHIBITED_DOMAIN_PREFIXES)}")
    print(f" 2. Application Layer: Zero concrete vendor SDKs.")
    print(f"    Disallowed prefixes: {', '.join(PROHIBITED_APPLICATION_PREFIXES)}")
    print(f" 3. Application Layer: Concrete infrastructure adapters allowed ONLY if registered in approved allowlist.")
    print("=" * 70)

    violations = check_all_backend_dependencies(base_dir=BACKEND_ROOT)

    if violations:
        print(f"\n❌ FAILED: {len(violations)} architectural boundary violation(s) found:\n")
        for v in violations:
            print(f"  • {v}")
        print("\nFix the above violations by adhering to the dependency inversion rule.")
        print("See docs/architecture/DEPENDENCY_RULES.md for architectural guidelines.\n")
        return 1

    print("\n✅ PASSED: All domain and application modules obey architectural boundaries!")
    print(f"   • Domain purity: 100% verified.")
    print(f"   • Application dependency inversion: 100% verified.")
    print(f"   • Concrete infrastructure approvals: {len(APPROVED_APPLICATION_INFRA_IMPORTS)} files registered.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
