import json
import uuid
from django.test import TestCase, Client
from apps.narrative.models import Project, Act, Sequence, Scene
from apps.shots.models import CameraSetup, Shot, Take

class ShotsCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Shots & Coverage behavior:
    - Camera Setup, Shot, and Take creation hierarchy
    - Scene coverage rollup endpoint (setups, shots, takes, circle takes)
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(title="Shots Movie", slug="shots-movie")
        self.act = Act.objects.create(project=self.project, title="Act 1")
        self.sequence = Sequence.objects.create(act=self.act, title="Seq 1")
        self.scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="10",
            set_name="BRIDGE",
            int_ext="INT",
            time_of_day="NIGHT"
        )

    def test_create_camera_setup_shot_and_take(self):
        """
        Behavior Protected: Creating CameraSetup, Shot, and Take through API.
        Why it matters: Script coverage and shot lists require the camera hierarchy.
        Level: API-level integration test.
        """
        # 1. Create Camera Setup
        setup_payload = {
            "scene_id": str(self.scene.id),
            "setup_code": "A",
            "camera_movement": "STATIC",
            "equipment_notes": "Tripod on dolly track"
        }
        setup_resp = self.client.post(
            "/api/shots/setups",
            data=json.dumps(setup_payload),
            content_type="application/json"
        )
        self.assertEqual(setup_resp.status_code, 200)
        setup_data = setup_resp.json()
        setup_id = setup_data["id"]
        self.assertEqual(setup_data["setup_code"], "A")

        # 2. Create Shot under Setup
        shot_payload = {
            "setup_id": setup_id,
            "shot_code": "A1",
            "shot_size": "CU",
            "lens": "50mm",
            "description": "Close up on hero's eyes",
            "vfx_required": False
        }
        shot_resp = self.client.post(
            "/api/shots/shots",
            data=json.dumps(shot_payload),
            content_type="application/json"
        )
        self.assertEqual(shot_resp.status_code, 200)
        shot_data = shot_resp.json()
        shot_id = shot_data["id"]
        self.assertEqual(shot_data["shot_code"], "A1")

        # 3. Create Take under Shot
        take_payload = {
            "shot_id": shot_id,
            "take_number": 1,
            "is_circle_take": True,
            "duration_seconds": 45,
            "director_notes": "Print this take"
        }
        take_resp = self.client.post(
            "/api/shots/takes",
            data=json.dumps(take_payload),
            content_type="application/json"
        )
        self.assertEqual(take_resp.status_code, 200)
        take_data = take_resp.json()
        self.assertEqual(take_data["take_number"], 1)
        self.assertTrue(take_data["is_circle_take"])

        # 4. Verify Scene Coverage endpoint returns the full hierarchy
        coverage_resp = self.client.get(f"/api/shots/scenes/{self.scene.id}/coverage")
        self.assertEqual(coverage_resp.status_code, 200)
        coverage_data = coverage_resp.json()
        self.assertEqual(len(coverage_data["setups"]), 1)
        self.assertEqual(coverage_data["setups"][0]["setup_code"], "A")
        self.assertEqual(len(coverage_data["setups"][0]["shots"]), 1)
        self.assertEqual(coverage_data["setups"][0]["shots"][0]["shot_code"], "A1")
        self.assertEqual(len(coverage_data["setups"][0]["shots"][0]["takes"]), 1)
        self.assertTrue(coverage_data["setups"][0]["shots"][0]["takes"][0]["is_circle_take"])
