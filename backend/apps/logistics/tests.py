import json
import datetime
from decimal import Decimal
from django.test import TestCase, Client
from apps.narrative.models import Project, Act, Sequence, Scene
from apps.breakdown.models import Character, CostumeLook, SceneBreakdownItem
from apps.logistics.models import ProductionUnit, ShootDay, StripboardItem, DailyProductionReport

class LogisticsCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Logistics & Production behavior:
    - Shoot day creation & schedule hierarchy
    - Stripboard card lifecycle (schedule scene, add banner, reorder strip)
    - Day-Out-of-Days (DOOD) calculation rules (SW, SWF, W, H, WF status)
    - Daily Production Report (DPR) updates
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(
            title="Logistics Movie",
            slug="logistics-movie"
        )
        self.act = Act.objects.create(project=self.project, title="Act 1")
        self.sequence = Sequence.objects.create(act=self.act, title="Seq 1")
        
        # Scenes
        self.scene_1 = Scene.objects.create(
            sequence=self.sequence,
            scene_number="1",
            set_name="INT. LAB - DAY",
            pages_eighths=8
        )
        self.scene_2 = Scene.objects.create(
            sequence=self.sequence,
            scene_number="2",
            set_name="EXT. ALLEY - NIGHT",
            pages_eighths=16
        )
        self.scene_3 = Scene.objects.create(
            sequence=self.sequence,
            scene_number="3",
            set_name="INT. VAULT - NIGHT",
            pages_eighths=8
        )

        # Characters for DOOD calculation
        self.char_lead = Character.objects.create(
            project=self.project,
            name="John Doe",
            cast_id_number=1,
            actor_name="Actor One"
        )
        self.char_cameo = Character.objects.create(
            project=self.project,
            name="The Informant",
            cast_id_number=2,
            actor_name="Actor Two"
        )
        self.look_lead = CostumeLook.objects.create(
            character=self.char_lead,
            look_number="Look 1",
            continuity_photo_url="costumes/sample.jpg"
        )
        self.look_cameo = CostumeLook.objects.create(
            character=self.char_cameo,
            look_number="Look 1",
            continuity_photo_url="costumes/sample.jpg"
        )

        # Tag characters to scenes via CostumeLook breakdown items
        SceneBreakdownItem.objects.create(
            scene=self.scene_1,
            element_type="WARDROBE",
            costume=self.look_lead
        )
        SceneBreakdownItem.objects.create(
            scene=self.scene_2,
            element_type="WARDROBE",
            costume=self.look_cameo
        )
        SceneBreakdownItem.objects.create(
            scene=self.scene_3,
            element_type="WARDROBE",
            costume=self.look_lead
        )

        # Production Unit & Shoot Days
        self.unit = ProductionUnit.objects.create(
            project=self.project,
            name="Main Unit"
        )
        self.day_1 = ShootDay.objects.create(
            unit=self.unit,
            day_number=1,
            calendar_date=datetime.date(2026, 11, 1),
            hospital_address="Mercy General"
        )
        self.day_2 = ShootDay.objects.create(
            unit=self.unit,
            day_number=2,
            calendar_date=datetime.date(2026, 11, 2),
            hospital_address="Mercy General"
        )
        self.day_3 = ShootDay.objects.create(
            unit=self.unit,
            day_number=3,
            calendar_date=datetime.date(2026, 11, 3),
            hospital_address="Mercy General"
        )

    def test_schedule_scene_strip(self):
        """
        Behavior Protected: POST /api/logistics/strips/schedule-scene schedules a scene on a shoot day.
        Why it matters: Strips represent scheduled scene cards on the production stripboard.
        Level: API-level integration test.
        """
        payload = {
            "shoot_day_id": str(self.day_1.id),
            "scene_id": str(self.scene_1.id),
            "order_index": "0|hzzzzz:"
        }
        response = self.client.post(
            "/api/logistics/strips/schedule-scene",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["item_type"], "SCENE")
        self.assertEqual(data["shoot_day_id"], str(self.day_1.id))
        self.assertEqual(data["scene_id"], str(self.scene_1.id))
        self.assertEqual(data["scene_number"], "1")
        self.assertTrue(StripboardItem.objects.filter(shoot_day=self.day_1, scene=self.scene_1).exists())

    def test_add_banner_strip(self):
        """
        Behavior Protected: POST /api/logistics/strips/banner inserts logistical banners (e.g. LUNCH, COMPANY MOVE).
        Why it matters: Assistant Directors structure the shooting day with time and meal dividers.
        Level: API-level integration test.
        """
        payload = {
            "shoot_day_id": str(self.day_1.id),
            "banner_label": "COMPANY MOVE TO LOCATION B",
            "order_index": "0|hzzzzz:m"
        }
        response = self.client.post(
            "/api/logistics/strips/banner",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["item_type"], "BANNER")
        self.assertEqual(data["banner_label"], "COMPANY MOVE TO LOCATION B")
        self.assertIsNone(data["scene_id"])
        self.assertTrue(StripboardItem.objects.filter(shoot_day=self.day_1, banner_label="COMPANY MOVE TO LOCATION B").exists())

    def test_reorder_strip_across_days(self):
        """
        Behavior Protected: POST /api/logistics/strips/reorder moves strip to target day with new index.
        Why it matters: Kanban and stripboard drag-and-drop depends on moving strips between shoot days.
        Level: API-level integration test.
        """
        strip = StripboardItem.objects.create(
            shoot_day=self.day_1,
            item_type="SCENE",
            scene=self.scene_1,
            order_index="0|10:"
        )

        payload = {
            "strip_id": str(strip.id),
            "target_shoot_day_id": str(self.day_2.id),
            "new_order_index": "0|20:"
        }
        response = self.client.post(
            "/api/logistics/strips/reorder",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        strip.refresh_from_db()
        self.assertEqual(strip.shoot_day_id, self.day_2.id)
        self.assertEqual(strip.order_index, "0|20:")

    def test_dood_matrix_calculation(self):
        """
        Behavior Protected: GET /api/logistics/projects/{id}/dood calculates SAG Day-Out-of-Days matrix.
        Why it matters: Critical business rule: Cast work days (SW, W, WF), hold days (H), single days (SWF).
        Lead works Day 1 & Day 3 -> Day 1: SW, Day 2: H (Hold), Day 3: WF.
        Cameo works Day 2 only -> Day 2: SWF (Start-Work-Finish).
        Level: API-level integration test.
        """
        # Day 1: Scene 1 (Lead works)
        StripboardItem.objects.create(
            shoot_day=self.day_1,
            item_type="SCENE",
            scene=self.scene_1,
            order_index="0|a:"
        )
        # Day 2: Scene 2 (Cameo works)
        StripboardItem.objects.create(
            shoot_day=self.day_2,
            item_type="SCENE",
            scene=self.scene_2,
            order_index="0|b:"
        )
        # Day 3: Scene 3 (Lead works)
        StripboardItem.objects.create(
            shoot_day=self.day_3,
            item_type="SCENE",
            scene=self.scene_3,
            order_index="0|c:"
        )

        response = self.client.get(f"/api/logistics/projects/{self.project.id}/dood")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        characters = data["characters"]
        self.assertEqual(len(characters), 2)

        lead_dood = next(c for c in characters if c["cast_id_number"] == 1)
        self.assertEqual(lead_dood["name"], "John Doe")
        self.assertEqual(lead_dood["total_work_days"], 2)
        self.assertEqual(lead_dood["total_hold_days"], 1)

        # Assert industry SAG status codes
        self.assertEqual(lead_dood["daily_status"][str(self.day_1.id)], "SW")  # Start Work
        self.assertEqual(lead_dood["daily_status"][str(self.day_2.id)], "H")   # Hold
        self.assertEqual(lead_dood["daily_status"][str(self.day_3.id)], "WF")  # Work Finish

        cameo_dood = next(c for c in characters if c["cast_id_number"] == 2)
        self.assertEqual(cameo_dood["name"], "The Informant")
        self.assertEqual(cameo_dood["total_work_days"], 1)
        self.assertEqual(cameo_dood["total_hold_days"], 0)
        self.assertEqual(cameo_dood["daily_status"][str(self.day_1.id)], "")
        self.assertEqual(cameo_dood["daily_status"][str(self.day_2.id)], "SWF") # Single Day SWF
        self.assertEqual(cameo_dood["daily_status"][str(self.day_3.id)], "")

    def test_daily_production_report_crud(self):
        """
        Behavior Protected: GET and POST /api/logistics/shoot-days/{id}/dpr manages DPR wrap records.
        Why it matters: Production wrap reports record actuals (rolls, scenes, pages, wrap times).
        Level: API-level integration test.
        """
        # GET on day with no DPR returns blank default DPR schema
        get_resp = self.client.get(f"/api/logistics/shoot-days/{self.day_1.id}/dpr")
        self.assertEqual(get_resp.status_code, 200)
        dpr_data = get_resp.json()
        self.assertEqual(dpr_data["scenes_completed"], 0)

        # POST updates or creates the DPR
        payload = {
            "scenes_completed": 4,
            "pages_completed": 3.75,
            "camera_rolls_used": 5,
            "sound_rolls_used": 2,
            "delay_notes": "Weather hold 20 minutes for rain.",
            "actual_first_shot": "09:15:00",
            "actual_wrap": "19:45:00"
        }
        post_resp = self.client.post(
            f"/api/logistics/shoot-days/{self.day_1.id}/dpr",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(post_resp.status_code, 200)

        dpr = DailyProductionReport.objects.get(shoot_day=self.day_1)
        self.assertEqual(dpr.scenes_completed, 4)
        self.assertEqual(dpr.pages_completed, Decimal("3.75"))
        self.assertEqual(dpr.camera_rolls_used, 5)
        self.assertEqual(dpr.sound_rolls_used, 2)
        self.assertEqual(dpr.delay_notes, "Weather hold 20 minutes for rain.")


from unittest.mock import patch, MagicMock
from celery.exceptions import MaxRetriesExceededError
from django.core.files.storage import default_storage
from apps.core.models import BackgroundJob
from apps.logistics.tasks import generate_call_sheet_pdf, finalize_dpr
from apps.logistics.application.call_sheet_use_case import GenerateCallSheetPdfUseCase
from apps.logistics.application.finalize_dpr_use_case import FinalizeDprUseCase
from apps.logistics.infrastructure.pdf.reportlab_call_sheet_renderer import ReportLabCallSheetRenderer


class LogisticsCeleryTaskTests(TestCase):
    """
    Tests for Celery task adapters and application use cases in Logistics context:
    - Task invocation & BackgroundJob lifecycle tracking
    - Application use case execution
    - Idempotent PDF regeneration and storage persistence
    - Retry exhaustion handling and failure notifications
    """

    def setUp(self):
        self.project = Project.objects.create(title="Celery Movie", slug="celery-movie")
        self.unit = ProductionUnit.objects.create(project=self.project, name="First Unit")
        self.day = ShootDay.objects.create(
            unit=self.unit,
            day_number=1,
            calendar_date=datetime.date(2026, 12, 1),
            general_crew_call=datetime.time(6, 0),
            hospital_address="Cedar Sinai"
        )

    def test_generate_call_sheet_use_case_execution(self):
        with patch("apps.logistics.application.call_sheet_use_case.broadcast_studio_notification") as mock_notif:
            use_case = GenerateCallSheetPdfUseCase()
            result = use_case.execute(str(self.day.id))
            self.assertIn("call_sheets/call_sheet_day_1.pdf", result["saved_path"])
            self.assertTrue(default_storage.exists(result["saved_path"]))
            mock_notif.assert_called_once()
            self.assertIn("Day 1", mock_notif.call_args[1]["message"])

    def test_generate_call_sheet_pdf_task_success_and_job_lifecycle(self):
        with patch("apps.logistics.application.call_sheet_use_case.broadcast_studio_notification"):
            res = generate_call_sheet_pdf.apply(args=[str(self.day.id)])
            self.assertIn("Saved to", res.result)

            job = BackgroundJob.objects.filter(task_name="generate_call_sheet_pdf").latest("created_at")
            self.assertEqual(job.status, "SUCCESS")
            self.assertIn("call_sheet_day_1.pdf", job.result["file"])

    def test_generate_call_sheet_pdf_idempotency(self):
        with patch("apps.logistics.application.call_sheet_use_case.broadcast_studio_notification"):
            res1 = generate_call_sheet_pdf.apply(args=[str(self.day.id)])
            res2 = generate_call_sheet_pdf.apply(args=[str(self.day.id)])
            self.assertEqual(res1.status, "SUCCESS")
            self.assertEqual(res2.status, "SUCCESS")
            self.assertTrue(default_storage.exists("call_sheets/call_sheet_day_1.pdf"))

    def test_generate_call_sheet_pdf_task_retry_and_failure(self):
        with patch.object(GenerateCallSheetPdfUseCase, "execute", side_effect=Exception("Storage outage")), \
             patch.object(generate_call_sheet_pdf, "retry", side_effect=MaxRetriesExceededError("Max retries")), \
             patch("apps.logistics.tasks.broadcast_studio_notification") as mock_notif:

            with self.assertRaises(Exception):
                generate_call_sheet_pdf.apply(args=[str(self.day.id)], throw=True)

            job = BackgroundJob.objects.filter(task_name="generate_call_sheet_pdf").latest("created_at")
            self.assertEqual(job.status, "FAILED")
            self.assertIn("Storage outage", job.error_message)
            mock_notif.assert_called_with(message="Task Failed: Storage outage", level="error")

    def test_finalize_dpr_task_lifecycle(self):
        with patch("apps.logistics.application.finalize_dpr_use_case.broadcast_studio_notification") as mock_notif:
            res = finalize_dpr.apply(args=[str(self.day.id)])
            self.assertTrue(res.result)

            job = BackgroundJob.objects.filter(task_name="finalize_dpr").latest("created_at")
            self.assertEqual(job.status, "SUCCESS")
            mock_notif.assert_called_once()

    def test_reportlab_call_sheet_renderer_adapter(self):
        renderer = ReportLabCallSheetRenderer()
        pdf_bytes = renderer.render(
            day_number=1,
            calendar_date=datetime.date(2026, 12, 1),
            general_crew_call=datetime.time(6, 0),
            hospital_address="Cedar Sinai"
        )
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 100)

    def test_call_sheet_use_case_pure_memory_fake_ports(self):
        class FakeMemStorage:
            def __init__(self):
                self.files = {}
            def save_file(self, path, content):
                self.files[path] = content
                return path
            def get_url(self, path):
                return f"http://memory-storage/{path}"
            def exists(self, path):
                return path in self.files
            def delete(self, path):
                if path in self.files:
                    del self.files[path]
                    return True
                return False

        class FakePdfRenderer:
            def render(self, day_number, calendar_date, general_crew_call, hospital_address=""):
                return b"%PDF-1.4 Fake Call Sheet Content"

        class FakePublisher:
            def __init__(self):
                self.events = []
            def publish_notification(self, message, level="info", action=None):
                self.events.append({"message": message, "level": level, "action": action})

        fake_storage = FakeMemStorage()
        fake_renderer = FakePdfRenderer()
        fake_publisher = FakePublisher()

        use_case = GenerateCallSheetPdfUseCase(
            storage=fake_storage,
            pdf_renderer=fake_renderer,
            event_publisher=fake_publisher,
        )
        result = use_case.execute(str(self.day.id))
        self.assertIn("call_sheets/call_sheet_day_1.pdf", result["saved_path"])
        self.assertTrue(fake_storage.exists("call_sheets/call_sheet_day_1.pdf"))
        self.assertEqual(fake_storage.files["call_sheets/call_sheet_day_1.pdf"], b"%PDF-1.4 Fake Call Sheet Content")
        self.assertEqual(len(fake_publisher.events), 1)
        self.assertIn("Day 1", fake_publisher.events[0]["message"])


