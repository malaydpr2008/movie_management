import json
import uuid
from unittest.mock import patch, MagicMock
from celery.exceptions import MaxRetriesExceededError
from django.core.cache import cache
from django.test import TestCase, Client
from apps.narrative.models import Project, Act, Sequence, Scene
from apps.shots.models import CameraSetup, Shot, Take
from apps.core.models import BackgroundJob
from apps.narrative.tasks import batch_script_breakdown
from apps.narrative.application.use_cases.batch_script_breakdown import BatchScriptBreakdownUseCase
from apps.narrative.application.ports.script_breakdown_service import IScriptBreakdownService

class NarrativeCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Narrative behavior:
    - Project tree hierarchy and rollups
    - Scene lifecycle (create, update, delete, reorder)
    - Fountain screenplay script import
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(
            title="Baseline Movie",
            slug="baseline-movie",
            aspect_ratio="2.39:1",
            target_runtime_minutes=110
        )
        self.act = Act.objects.create(
            project=self.project,
            title="Act I",
            order_index="0|hzzzzz:",
            target_page_length=25.0
        )
        self.sequence_1 = Sequence.objects.create(
            act=self.act,
            title="Sequence 1 - Opening",
            order_index="0|hzzzzz:",
            color_tag="#3B82F6"
        )
        self.sequence_2 = Sequence.objects.create(
            act=self.act,
            title="Sequence 2 - Inciting Incident",
            order_index="0|hzzzzz:m",
            color_tag="#10B981"
        )
        self.scene = Scene.objects.create(
            sequence=self.sequence_1,
            scene_number="1",
            order_index="0|hzzzzz:",
            int_ext="INT",
            set_name="CONTROL ROOM",
            time_of_day="NIGHT",
            pages_eighths=12,
            estimated_shoot_minutes=90,
            synopsis="The alarm sounds."
        )

    def test_get_project_tree(self):
        """
        Behavior Protected: GET /api/narrative/projects/{id}/tree returns complete dual-tree narrative hierarchy.
        Why it matters: The left narrative navigator and dashboard rely on this endpoint for all navigation.
        Level: API-level integration test.
        """
        # Add coverage to test count rollups
        setup = CameraSetup.objects.create(scene=self.scene, setup_code="A")
        shot = Shot.objects.create(setup=setup, shot_code="A1")
        Take.objects.create(shot=shot, take_number=1, is_circle_take=True)

        response = self.client.get(f"/api/narrative/projects/{self.project.id}/tree")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["id"], str(self.project.id))
        self.assertEqual(data["title"], "Baseline Movie")
        self.assertEqual(len(data["acts"]), 1)

        act_data = data["acts"][0]
        self.assertEqual(act_data["title"], "Act I")
        self.assertEqual(len(act_data["sequences"]), 2)

        # Verify scenes inside sequence 1
        seq1_data = next(s for s in act_data["sequences"] if s["id"] == str(self.sequence_1.id))
        self.assertEqual(len(seq1_data["scenes"]), 1)

        scene_node = seq1_data["scenes"][0]
        self.assertEqual(scene_node["scene_number"], "1")
        self.assertEqual(scene_node["int_ext"], "INT")
        self.assertEqual(scene_node["set_name"], "CONTROL ROOM")
        self.assertEqual(scene_node["pages_display"], "1 4/8")
        self.assertEqual(scene_node["setup_count"], 1)
        self.assertEqual(scene_node["shot_count"], 1)
        self.assertEqual(scene_node["take_count"], 1)
        self.assertEqual(scene_node["circle_take_count"], 1)

    def test_create_scene(self):
        """
        Behavior Protected: POST /api/narrative/scenes creates a new scene attached to a sequence.
        Why it matters: Script writers and outline builders use this to add new scenes to sequences.
        Level: API-level integration test.
        """
        payload = {
            "sequence_id": str(self.sequence_1.id),
            "scene_number": "2",
            "order_index": "0|hzzzzz:n",
            "int_ext": "EXT",
            "set_name": "ROOFTOP HELIPAD",
            "time_of_day": "DAY",
            "pages_eighths": 8,
            "estimated_shoot_minutes": 120,
            "synopsis": "A helicopter lands in high wind."
        }
        response = self.client.post(
            "/api/narrative/scenes",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["scene_number"], "2")
        self.assertEqual(data["set_name"], "ROOFTOP HELIPAD")
        self.assertEqual(data["pages_display"], "1")

        # Confirm persisted in database
        self.assertTrue(Scene.objects.filter(set_name="ROOFTOP HELIPAD").exists())

    def test_update_scene(self):
        """
        Behavior Protected: PATCH /api/narrative/scenes/{id} applies partial updates to a scene.
        Why it matters: Inline edits in the script editor and outliner card details rely on this.
        Level: API-level integration test.
        """
        payload = {
            "set_name": "COMMAND CENTER - UPPER DECK",
            "synopsis": "Updated synopsis for security breach.",
            "pages_eighths": 16
        }
        response = self.client.patch(
            f"/api/narrative/scenes/{self.scene.id}",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        self.scene.refresh_from_db()
        self.assertEqual(self.scene.set_name, "COMMAND CENTER - UPPER DECK")
        self.assertEqual(self.scene.synopsis, "Updated synopsis for security breach.")
        self.assertEqual(self.scene.pages_eighths, 16)
        self.assertEqual(self.scene.pages_display, "2")

    def test_delete_scene(self):
        """
        Behavior Protected: DELETE /api/narrative/scenes/{id} removes the scene record.
        Why it matters: Scene deletion in outliner boards must cleanly remove the scene.
        Level: API-level integration test.
        """
        response = self.client.delete(f"/api/narrative/scenes/{self.scene.id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Scene.objects.filter(id=self.scene.id).exists())

    def test_reorder_scene(self):
        """
        Behavior Protected: POST /api/narrative/scenes/reorder moves scene and updates order_index.
        Why it matters: Drag-and-drop kanban boards move scenes across sequences and re-index them.
        Level: API-level integration test.
        """
        payload = {
            "scene_id": str(self.scene.id),
            "target_sequence_id": str(self.sequence_2.id),
            "new_order_index": "0|iaaaaa:"
        }
        response = self.client.post(
            "/api/narrative/scenes/reorder",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        self.scene.refresh_from_db()
        self.assertEqual(self.scene.sequence_id, self.sequence_2.id)
        self.assertEqual(self.scene.order_index, "0|iaaaaa:")

    def test_import_fountain_script(self):
        """
        Behavior Protected: POST /api/narrative/projects/{id}/import-script parses sluglines into scenes.
        Why it matters: Screenplay ingestion automatically creates narrative scene graphs from text.
        Level: API-level integration test.
        """
        fountain_text = """
INT. BUNKER CORRIDOR - NIGHT
Red emergency lights pulse down the long hallway.

EXT. DESERT HIGHWAY - DAY
Dust storms roll across the cracked pavement.
"""
        payload = {"script_text": fountain_text}
        response = self.client.post(
            f"/api/narrative/projects/{self.project.id}/import-script",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["scene_count"], 2)

        # Verify scenes created
        self.assertTrue(Scene.objects.filter(set_name="BUNKER CORRIDOR").exists())
        self.assertTrue(Scene.objects.filter(set_name="DESERT HIGHWAY").exists())

    def test_get_scene_detail(self):
        """
        Behavior Protected: GET /api/narrative/scenes/{id} returns complete scene detail with parent hierarchy and coverage.
        Why it matters: Detailed scene inspections, drawer inspectors, and lined script editor rely on this.
        Level: API-level integration test.
        """
        setup = CameraSetup.objects.create(scene=self.scene, setup_code="B")
        Shot.objects.create(setup=setup, shot_code="B1")

        response = self.client.get(f"/api/narrative/scenes/{self.scene.id}")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["id"], str(self.scene.id))
        self.assertEqual(data["scene_number"], "1")
        self.assertEqual(data["sequence_id"], str(self.sequence_1.id))
        self.assertEqual(data["sequence_title"], "Sequence 1 - Opening")
        self.assertEqual(data["act_id"], str(self.act.id))
        self.assertEqual(data["act_title"], "Act I")
        self.assertEqual(data["project_id"], str(self.project.id))
        self.assertEqual(data["set_name"], "CONTROL ROOM")
        self.assertEqual(data["pages_eighths"], 12)
        self.assertEqual(data["pages_display"], "1 4/8")
        self.assertEqual(data["shot_count"], 1)
        self.assertEqual(data["take_count"], 0)


class NarrativeDomainAndUseCaseUnitTests(TestCase):
    """
    Unit tests validating pure domain value objects and application use cases in isolation.
    """

    def test_page_eighths_value_object(self):
        """Validates standard industry fractional screenplay page arithmetic and formatting."""
        from apps.narrative.domain import PageEighths

        # Mixed whole and fractional
        pe12 = PageEighths(12)
        self.assertEqual(pe12.to_display_string(), "1 4/8")
        self.assertEqual(pe12.to_pages_float(), 1.5)

        # Whole pages
        pe8 = PageEighths(8)
        self.assertEqual(pe8.to_display_string(), "1")
        self.assertEqual(pe8.to_pages_float(), 1.0)

        # Fraction only
        pe3 = PageEighths(3)
        self.assertEqual(pe3.to_display_string(), "3/8")
        self.assertEqual(pe3.to_pages_float(), 0.38)

        # Zero
        pe0 = PageEighths(0)
        self.assertEqual(pe0.to_display_string(), "0")
        self.assertEqual(pe0.to_pages_float(), 0.0)

        # Invariant: non-negative
        with self.assertRaises(ValueError):
            PageEighths(-1)

    def test_create_scene_use_case_validation(self):
        """Validates CreateSceneUseCase business invariants without hitting database."""
        from unittest.mock import MagicMock
        from apps.narrative.application.use_cases import CreateSceneUseCase
        from apps.narrative.application.dtos import CreateSceneCommand
        from apps.narrative.domain.exceptions import InvalidSceneDataError

        mock_repo = MagicMock()
        use_case = CreateSceneUseCase(mock_repo)

        # Empty scene number
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(CreateSceneCommand(scene_number="", set_name="BANK VAULT"))

        # Negative eighths
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(CreateSceneCommand(scene_number="1", set_name="BANK VAULT", pages_eighths=-1))

        # Negative shoot minutes
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(CreateSceneCommand(scene_number="1", set_name="BANK VAULT", estimated_shoot_minutes=-10))

        # Valid command delegates to repository
        valid_cmd = CreateSceneCommand(scene_number="1", set_name="BANK VAULT", pages_eighths=8)
        use_case.execute(valid_cmd)
        mock_repo.create.assert_called_once_with(valid_cmd)

    def test_update_scene_use_case_validation(self):
        """Validates UpdateSceneUseCase invariants."""
        from unittest.mock import MagicMock
        from apps.narrative.application.use_cases import UpdateSceneUseCase
        from apps.narrative.application.dtos import UpdateSceneCommand
        from apps.narrative.domain.exceptions import InvalidSceneDataError

        mock_repo = MagicMock()
        use_case = UpdateSceneUseCase(mock_repo)

        # Negative eighths
        cmd_invalid_eighths = UpdateSceneCommand(
            scene_id=uuid.uuid4(),
            pages_eighths=-4,
            updated_fields={"pages_eighths"}
        )
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(cmd_invalid_eighths)

        # Blank scene number
        cmd_blank_num = UpdateSceneCommand(
            scene_id=uuid.uuid4(),
            scene_number="   ",
            updated_fields={"scene_number"}
        )
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(cmd_blank_num)

        # Valid command delegates to repository
        valid_cmd = UpdateSceneCommand(
            scene_id=uuid.uuid4(),
            set_name="SAFE HOUSE",
            updated_fields={"set_name"}
        )
        use_case.execute(valid_cmd)
        mock_repo.update.assert_called_once_with(valid_cmd)

    def test_reorder_scene_use_case_validation(self):
        """Validates ReorderSceneUseCase invariants."""
        from unittest.mock import MagicMock
        from apps.narrative.application.use_cases import ReorderSceneUseCase
        from apps.narrative.application.dtos import ReorderSceneCommand
        from apps.narrative.domain.exceptions import InvalidSceneDataError

        mock_repo = MagicMock()
        use_case = ReorderSceneUseCase(mock_repo)

        # Blank order index
        with self.assertRaises(InvalidSceneDataError):
            use_case.execute(ReorderSceneCommand(scene_id=uuid.uuid4(), new_order_index="  "))

        # Valid command delegates
        valid_cmd = ReorderSceneCommand(scene_id=uuid.uuid4(), new_order_index="0|iaaaaa:")
        use_case.execute(valid_cmd)
        mock_repo.reorder.assert_called_once_with(valid_cmd)


class NarrativeSceneApiContractTests(TestCase):
    """
    API integration tests validating HTTP status code contracts and domain error translations.
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(
            title="Contract Movie",
            slug="contract-movie",
        )
        self.act = Act.objects.create(
            project=self.project,
            title="Act I",
        )
        self.sequence = Sequence.objects.create(
            act=self.act,
            title="Sequence 1",
        )
        self.scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="1",
            set_name="MAIN LAB",
            pages_eighths=8,
        )

    def test_get_scene_not_found_returns_404(self):
        missing_id = uuid.uuid4()
        response = self.client.get(f"/api/narrative/scenes/{missing_id}")
        self.assertEqual(response.status_code, 404)

    def test_create_scene_with_invalid_sequence_returns_404(self):
        missing_seq_id = uuid.uuid4()
        payload = {
            "sequence_id": str(missing_seq_id),
            "scene_number": "2",
            "set_name": "SUBWAY STATION",
            "int_ext": "INT",
            "time_of_day": "NIGHT"
        }
        response = self.client.post(
            "/api/narrative/scenes",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_update_scene_not_found_returns_404(self):
        missing_id = uuid.uuid4()
        payload = {"set_name": "NEW LOCATION"}
        response = self.client.patch(
            f"/api/narrative/scenes/{missing_id}",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_update_scene_with_invalid_sequence_returns_404(self):
        missing_seq_id = uuid.uuid4()
        payload = {"sequence_id": str(missing_seq_id)}
        response = self.client.patch(
            f"/api/narrative/scenes/{self.scene.id}",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_reorder_scene_not_found_returns_404(self):
        missing_id = uuid.uuid4()
        payload = {
            "scene_id": str(missing_id),
            "new_order_index": "0|iaaaaa:"
        }
        response = self.client.post(
            "/api/narrative/scenes/reorder",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_reorder_scene_with_invalid_target_sequence_returns_404(self):
        missing_seq_id = uuid.uuid4()
        payload = {
            "scene_id": str(self.scene.id),
            "target_sequence_id": str(missing_seq_id),
            "new_order_index": "0|iaaaaa:"
        }
        response = self.client.post(
            "/api/narrative/scenes/reorder",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_create_scene_negative_eighths_returns_400(self):
        payload = {
            "sequence_id": str(self.sequence.id),
            "scene_number": "3",
            "set_name": "ABANDONED MINE",
            "pages_eighths": -5
        }
        response = self.client.post(
            "/api/narrative/scenes",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)


class NarrativeCeleryTaskTests(TestCase):
    """
    Integration/Characterization tests for Narrative Celery task and application use cases:
    - BatchScriptBreakdownUseCase execution (AI parsing, caching, notifications)
    - batch_script_breakdown Celery adapter lifecycle (BackgroundJob RUNNING -> SUCCESS)
    - Retry semantics and failure handling (MaxRetriesExceededError -> BackgroundJob FAILED)
    - Cache idempotency across repeat breakdown runs
    """

    def setUp(self):
        self.project = Project.objects.create(
            title="AI Breakdown Movie",
            slug="ai-breakdown-movie",
            aspect_ratio="16:9",
            target_runtime_minutes=90
        )

    def test_batch_script_breakdown_use_case_execution(self):
        mock_service = MagicMock(spec=IScriptBreakdownService)
        mock_service.extract_scenes.return_value = {
            "scenes": [
                {"scene_number": "1", "int_ext": "INT", "set_name": "BRIDGE"},
                {"scene_number": "2", "int_ext": "EXT", "set_name": "SPACE"}
            ]
        }
        with patch("apps.narrative.application.use_cases.batch_script_breakdown.broadcast_studio_notification") as mock_notif:
            use_case = BatchScriptBreakdownUseCase(
                breakdown_service=mock_service,
                cache_client=cache,
                notification_service=mock_notif
            )
            result = use_case.execute(project_id=str(self.project.id), document_text="INT. BRIDGE\nEXT. SPACE")

            self.assertEqual(result["scenes_extracted"], 2)
            cached_data = cache.get(f"pending_breakdown_{self.project.id}")
            self.assertIsNotNone(cached_data)
            self.assertEqual(len(cached_data["scenes"]), 2)
            mock_notif.assert_called_once_with(
                message="Script Breakdown ready for human review!",
                level="info",
                action="review_breakdown"
            )

    def test_batch_script_breakdown_task_success_and_job_lifecycle(self):
        with patch.object(
            BatchScriptBreakdownUseCase,
            "execute",
            return_value={"scenes_extracted": 5, "data": {"scenes": []}}
        ):
            res = batch_script_breakdown.apply(args=[str(self.project.id), "INT. LAB - DAY"])

            job = BackgroundJob.objects.filter(task_name="batch_script_breakdown").latest("created_at")
            self.assertEqual(job.status, "SUCCESS")
            self.assertEqual(job.result["scenes_extracted"], 5)
            self.assertEqual(job.result["info"], "Task finished successfully")

    def test_batch_script_breakdown_task_retry_and_failure(self):
        with patch.object(BatchScriptBreakdownUseCase, "execute", side_effect=Exception("Ollama LLM connection timeout")), \
             patch.object(batch_script_breakdown, "retry", side_effect=MaxRetriesExceededError("Max retries")), \
             patch("apps.narrative.tasks.broadcast_studio_notification") as mock_notif:

            with self.assertRaises(Exception):
                batch_script_breakdown.apply(args=[str(self.project.id), "INT. LAB - DAY"], throw=True)

            job = BackgroundJob.objects.filter(task_name="batch_script_breakdown").latest("created_at")
            self.assertEqual(job.status, "FAILED")
            self.assertIn("Ollama LLM connection timeout", job.error_message)
            mock_notif.assert_called_with(message="Task Failed: Ollama LLM connection timeout", level="error")

    def test_batch_script_breakdown_idempotency_cache(self):
        mock_service = MagicMock(spec=IScriptBreakdownService)
        mock_service.extract_scenes.side_effect = [
            {"scenes": [{"scene_number": "1"}]},
            {"scenes": [{"scene_number": "1"}, {"scene_number": "2"}]}
        ]
        with patch("apps.narrative.application.use_cases.batch_script_breakdown.broadcast_studio_notification"):
            use_case = BatchScriptBreakdownUseCase(breakdown_service=mock_service)
            res1 = use_case.execute(project_id=str(self.project.id), document_text="First pass")
            self.assertEqual(res1["scenes_extracted"], 1)

            res2 = use_case.execute(project_id=str(self.project.id), document_text="Second pass")
            self.assertEqual(res2["scenes_extracted"], 2)

            cached = cache.get(f"pending_breakdown_{self.project.id}")
            self.assertEqual(len(cached["scenes"]), 2)

    def test_batch_script_breakdown_with_pure_fakes(self):
        class FakeMemoryCache:
            def __init__(self):
                self.store = {}
            def get(self, key):
                return self.store.get(key)
            def set(self, key, value, timeout=None):
                self.store[key] = value
            def delete(self, key):
                if key in self.store:
                    del self.store[key]
                    return True
                return False
            def exists(self, key):
                return key in self.store

        class FakePublisher:
            def __init__(self):
                self.events = []
            def publish_notification(self, message, level="info", action=None):
                self.events.append({"message": message, "level": level, "action": action})

        class FakeBreakdownService:
            def extract_scenes(self, script_text: str):
                return {
                    "scenes": [
                        {"scene_number": "1", "int_ext": "INT", "set_name": "VAULT"},
                    ]
                }

        fake_cache = FakeMemoryCache()
        fake_publisher = FakePublisher()
        fake_service = FakeBreakdownService()

        use_case = BatchScriptBreakdownUseCase(
            breakdown_service=fake_service,
            cache_client=fake_cache,
            event_publisher=fake_publisher,
        )

        res = use_case.execute(project_id="test-pure-fakes", document_text="INT. VAULT - NIGHT")
        self.assertEqual(res["scenes_extracted"], 1)
        self.assertTrue(fake_cache.exists("pending_breakdown_test-pure-fakes"))
        cached = fake_cache.get("pending_breakdown_test-pure-fakes")
        self.assertEqual(cached["scenes"][0]["set_name"], "VAULT")
        self.assertEqual(len(fake_publisher.events), 1)
        self.assertEqual(fake_publisher.events[0]["action"], "review_breakdown")



