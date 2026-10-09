"""
CineFlow Studio - Automated Architecture Boundary Tests.

Verifies that the backend codebase complies with dependency rules:
- Domain must not import Django HTTP, Celery, Qdrant, boto3, Redis, Channels, ReportLab, or Infrastructure.
- Application must not directly depend on concrete infrastructure implementations unless explicitly approved.
- Demonstrates detection of prohibited dependencies.
"""

import ast
import os
import tempfile
from django.test import SimpleTestCase

from apps.core.architecture_checker import (
    check_all_backend_dependencies,
    check_domain_file,
    check_application_file,
)


class ArchitectureEnforcementTests(SimpleTestCase):
    """
    Automated architectural boundary tests enforcing clean dependency directions.
    """

    def test_production_codebase_obeys_architecture_rules(self):
        """
        Scans all domain and application files in the repository.
        Fails if any prohibited or unapproved dependency is found.
        """
        # Determine backend root directory
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        violations = check_all_backend_dependencies(base_dir=base_dir)

        if violations:
            msg = "\n".join(["Architectural violations detected:"] + [f" - {v}" for v in violations])
            self.fail(msg)

    def test_prohibited_domain_dependencies_are_detected(self):
        """
        Demonstrates that prohibited imports in Domain are strictly detected and rejected.
        Tests: Django HTTP, Celery, Qdrant, boto3, Redis, Channels, ReportLab, and Concrete Infrastructure.
        """
        prohibited_snippets = [
            ("import boto3", "boto3"),
            ("from django.http import HttpResponse, JsonResponse", "django.http"),
            ("import celery", "celery"),
            ("from apps.logistics.tasks import generate_call_sheet_pdf", "tasks"),
            ("from qdrant_client import QdrantClient", "qdrant_client"),
            ("import redis", "redis"),
            ("from django.core.cache import cache", "django.core.cache"),
            ("from channels.layers import get_channel_layer", "channels"),
            ("from reportlab.pdfgen import canvas", "reportlab"),
            ("from apps.core.infrastructure.storage.django_s3_storage_adapter import DjangoS3StorageAdapter", "infrastructure"),
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, "fake_domain.py")

            for snippet, expected_symbol in prohibited_snippets:
                with open(test_file, "w", encoding="utf-8") as f:
                    f.write(f"\"\"\"Fake domain module.\"\"\"\n{snippet}\n")

                violations = check_domain_file(test_file, base_dir=temp_dir)
                self.assertTrue(
                    len(violations) > 0,
                    f"Architecture checker failed to detect prohibited domain dependency: '{snippet}'",
                )
                self.assertTrue(
                    any(expected_symbol in v for v in violations),
                    f"Expected violation message to mention '{expected_symbol}', got: {violations}",
                )

    def test_prohibited_application_vendor_sdks_are_detected(self):
        """
        Demonstrates that direct vendor SDK dependencies in Application layer are detected.
        """
        prohibited_application_snippets = [
            ("import boto3", "boto3"),
            ("from qdrant_client import QdrantClient", "qdrant_client"),
            ("import redis", "redis"),
            ("from channels.layers import get_channel_layer", "channels.layers"),
            ("from reportlab.pdfgen import canvas", "reportlab"),
            ("from django.http import HttpResponse", "django.http"),
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, "fake_use_case.py")

            for snippet, expected_symbol in prohibited_application_snippets:
                with open(test_file, "w", encoding="utf-8") as f:
                    f.write(f"\"\"\"Fake use case module.\"\"\"\n{snippet}\n")

                violations = check_application_file(test_file, base_dir=temp_dir)
                self.assertTrue(
                    len(violations) > 0,
                    f"Architecture checker failed to detect vendor SDK in application: '{snippet}'",
                )
                self.assertTrue(
                    any(expected_symbol in v for v in violations),
                    f"Expected violation message to mention '{expected_symbol}', got: {violations}",
                )

    def test_unapproved_application_concrete_infrastructure_is_detected(self):
        """
        Demonstrates that concrete infrastructure imports in Application layer are rejected
        unless explicitly registered in the approved allowlist.
        """
        unapproved_infra = (
            "from apps.narrative.infrastructure.django_scene_repository import DjangoSceneRepository"
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, "unapproved_use_case.py")
            with open(test_file, "w", encoding="utf-8") as f:
                f.write(f"\"\"\"Unapproved infra use case.\"\"\"\n{unapproved_infra}\n")

            violations = check_application_file(test_file, base_dir=temp_dir)
            self.assertTrue(
                len(violations) > 0,
                "Checker should reject unapproved concrete infrastructure in application layer",
            )
            self.assertTrue(
                any("unapproved concrete infrastructure" in v for v in violations),
                f"Expected unapproved infrastructure violation, got: {violations}",
            )
