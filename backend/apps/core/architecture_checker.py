"""
CineFlow Studio - Automated Architecture Boundary & Dependency Checker.

Enforces Clean Architecture rules:
1. Domain layer must NOT import:
   - Django HTTP (django.http, django.shortcuts, django.views, ninja)
   - Celery (celery, apps.*.tasks)
   - Qdrant (qdrant_client)
   - Boto3 / MinIO (boto3, botocore)
   - Redis / Cache (redis, django.core.cache)
   - Channels / WebSockets (channels)
   - PDF rendering (reportlab)
   - Concrete infrastructure (apps.*.infrastructure)
   - API layer (apps.*.api)
   - Django ORM models (django.db, apps.*.models)

2. Application layer must NOT directly depend on:
   - Concrete vendor SDKs (boto3, botocore, qdrant_client, redis, channels.layers, reportlab, django.http)
   - Concrete infrastructure implementations (apps.*.infrastructure.*) UNLESS explicitly approved in APPROVED_APPLICATION_INFRA_IMPORTS.
"""

import ast
import glob
import os
from typing import Dict, List, Set, Tuple


PROHIBITED_DOMAIN_PREFIXES: Tuple[str, ...] = (
    "django.http",
    "django.shortcuts",
    "django.views",
    "django.urls",
    "ninja",
    "celery",
    "qdrant_client",
    "boto3",
    "botocore",
    "redis",
    "django.core.cache",
    "channels",
    "reportlab",
)

PROHIBITED_APPLICATION_PREFIXES: Tuple[str, ...] = (
    "boto3",
    "botocore",
    "qdrant_client",
    "redis",
    "channels.layers",
    "reportlab",
    "django.http",
    "django.shortcuts",
    "django.views",
)

# Explicitly approved concrete infrastructure imports in Application layer.
# These represent default dependency injection fallbacks in use cases.
APPROVED_APPLICATION_INFRA_IMPORTS: Dict[str, Set[str]] = {
    "apps/breakdown/application/use_cases.py": {
        "apps.breakdown.infrastructure.django_breakdown_repository.DjangoBreakdownRepository",
    },
    "apps/core/ai/application/use_cases.py": {
        "apps.core.infrastructure.storage.django_s3_storage_adapter.DjangoS3StorageAdapter",
        "apps.core.infrastructure.cache.django_cache_adapter.DjangoCacheAdapter",
    },
    "apps/core/application/use_cases/ingest_document.py": {
        "apps.core.infrastructure.vector.qdrant_vector_adapter.QdrantVectorAdapter",
        "apps.core.vector_store.ingest_document",
    },
    "apps/logistics/application/call_sheet_use_case.py": {
        "apps.core.infrastructure.storage.django_s3_storage_adapter.DjangoS3StorageAdapter",
        "apps.logistics.infrastructure.pdf.reportlab_call_sheet_renderer.ReportLabCallSheetRenderer",
        "apps.core.infrastructure.events.channels_event_publisher.ChannelsEventPublisher",
        "apps.core.infrastructure.notifications.broadcast_studio_notification",
    },
    "apps/logistics/application/finalize_dpr_use_case.py": {
        "apps.core.infrastructure.events.channels_event_publisher.ChannelsEventPublisher",
        "apps.core.infrastructure.notifications.broadcast_studio_notification",
    },
    "apps/logistics/application/use_cases.py": {
        "apps.logistics.infrastructure.django_logistics_repository.DjangoLogisticsRepository",
    },
    "apps/narrative/application/use_cases/batch_script_breakdown.py": {
        "apps.narrative.infrastructure.services.ollama_script_breakdown.OllamaScriptBreakdownService",
        "apps.core.infrastructure.cache.django_cache_adapter.DjangoCacheAdapter",
        "apps.core.infrastructure.events.channels_event_publisher.ChannelsEventPublisher",
        "apps.core.infrastructure.notifications.broadcast_studio_notification",
    },
}


def resolve_import_nodes(
    node: ast.AST, filepath: str, base_dir: str = "."
) -> List[Tuple[int, str]]:
    """
    Extracts and resolves imported module symbols from an AST Import or ImportFrom node,
    handling relative imports accurately.
    """
    rel_path = os.path.relpath(filepath, base_dir).replace("\\", "/").replace(".py", "")
    parts = rel_path.split("/")
    package_parts = parts[:-1]
    resolved: List[Tuple[int, str]] = []

    if isinstance(node, ast.Import):
        for alias in node.names:
            resolved.append((node.lineno, alias.name))
    elif isinstance(node, ast.ImportFrom):
        if node.level > 0:
            pkg = ".".join(package_parts[: len(package_parts) - (node.level - 1)])
            mod = f"{pkg}.{node.module}" if node.module else pkg
        else:
            mod = node.module or ""
        for alias in node.names:
            full = f"{mod}.{alias.name}" if mod else alias.name
            resolved.append((node.lineno, full))

    return resolved


def check_domain_file(filepath: str, base_dir: str = ".") -> List[str]:
    """
    Checks a single domain module for disallowed architectural dependencies.
    """
    rel_f = os.path.relpath(filepath, base_dir).replace("\\", "/")
    violations: List[str] = []

    with open(filepath, "r", encoding="utf-8") as fp:
        try:
            tree = ast.parse(fp.read(), filename=filepath)
        except SyntaxError as e:
            return [f"Syntax error in {rel_f}: {e}"]

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for lineno, imp in resolve_import_nodes(node, filepath, base_dir):
                for prefix in PROHIBITED_DOMAIN_PREFIXES:
                    if imp == prefix or imp.startswith(prefix + "."):
                        violations.append(
                            f"[DOMAIN RULE VIOLATION] {rel_f}:{lineno} -> "
                            f"Domain must not import '{imp}' (prohibited framework/infrastructure: {prefix})"
                        )
                if ".infrastructure." in imp or imp.endswith(".infrastructure"):
                    violations.append(
                        f"[DOMAIN RULE VIOLATION] {rel_f}:{lineno} -> "
                        f"Domain must not import concrete infrastructure '{imp}'"
                    )
                if ".api." in imp or imp.endswith(".api"):
                    violations.append(
                        f"[DOMAIN RULE VIOLATION] {rel_f}:{lineno} -> "
                        f"Domain must not import API/transport layer '{imp}'"
                    )
                if ".tasks" in imp or imp == "celery":
                    violations.append(
                        f"[DOMAIN RULE VIOLATION] {rel_f}:{lineno} -> "
                        f"Domain must not import async task systems '{imp}'"
                    )
                if imp.startswith("django.db") or ".models" in imp:
                    violations.append(
                        f"[DOMAIN RULE VIOLATION] {rel_f}:{lineno} -> "
                        f"Domain must not import Django ORM models '{imp}'"
                    )

    return violations


def check_application_file(filepath: str, base_dir: str = ".") -> List[str]:
    """
    Checks a single application module for disallowed vendor SDKs or unapproved infrastructure.
    """
    rel_f = os.path.relpath(filepath, base_dir).replace("\\", "/")
    violations: List[str] = []

    with open(filepath, "r", encoding="utf-8") as fp:
        try:
            tree = ast.parse(fp.read(), filename=filepath)
        except SyntaxError as e:
            return [f"Syntax error in {rel_f}: {e}"]

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for lineno, imp in resolve_import_nodes(node, filepath, base_dir):
                for prefix in PROHIBITED_APPLICATION_PREFIXES:
                    if imp == prefix or imp.startswith(prefix + "."):
                        violations.append(
                            f"[APPLICATION RULE VIOLATION] {rel_f}:{lineno} -> "
                            f"Application layer must not directly depend on vendor SDK '{imp}' (use abstract port instead)"
                        )
                if ".infrastructure." in imp or imp.endswith(".infrastructure"):
                    approved_set = APPROVED_APPLICATION_INFRA_IMPORTS.get(rel_f, set())
                    if imp not in approved_set:
                        violations.append(
                            f"[APPLICATION RULE VIOLATION] {rel_f}:{lineno} -> "
                            f"Application layer must not directly import unapproved concrete infrastructure '{imp}'"
                        )

    return violations


def check_all_backend_dependencies(base_dir: str = ".") -> List[str]:
    """
    Inspects all domain and application files across the backend apps directory.
    """
    all_violations: List[str] = []

    domain_files = sorted(
        glob.glob(os.path.join(base_dir, "apps/**/domain/**/*.py"), recursive=True)
    )
    for f in domain_files:
        all_violations.extend(check_domain_file(f, base_dir))

    application_files = sorted(
        glob.glob(os.path.join(base_dir, "apps/**/application/**/*.py"), recursive=True)
    )
    for f in application_files:
        all_violations.extend(check_application_file(f, base_dir))

    return all_violations
