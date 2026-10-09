import json
import uuid
from django.test import TestCase, Client
from pydantic import ValidationError
from apps.narrative.models import Project, Act, Sequence, Scene
from apps.breakdown.models import MasterLocation, Character, CostumeLook, Prop, SceneBreakdownItem

class BreakdownCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Breakdown behavior:
    - Breakdown summary telemetry
    - Scene breakdown items lifecycle (list, create, delete)
    - Catalog entities (characters, costume looks, props, master locations)
    """

    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(
            title="Breakdown Movie",
            slug="breakdown-movie"
        )
        self.act = Act.objects.create(project=self.project, title="Act 1")
        self.sequence = Sequence.objects.create(act=self.act, title="Seq 1")
        self.scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="1",
            set_name="LABORATORY",
            int_ext="INT",
            time_of_day="DAY"
        )

        # Catalogs
        self.location = MasterLocation.objects.create(
            project=self.project,
            name="Abandoned Research Station",
            address="Sector 4B",
            gps_coordinates="34.0522 N, 118.2437 W"
        )
        self.character = Character.objects.create(
            project=self.project,
            name="Dr. Aris Thorne",
            cast_id_number=1,
            actor_name="Cillian Murphy"
        )
        # Note: In production api.py line 346, CostumeLookOut requires non-null continuity_photo_url
        self.look = CostumeLook.objects.create(
            character=self.character,
            look_number="Look 1 - Hazmat",
            description="Reinforced yellow biohazard suit",
            continuity_photo_url="costumes/sample_photo.jpg"
        )
        self.prop = Prop.objects.create(
            project=self.project,
            name="Cryo Container",
            is_hero_prop=True,
            quantity=2
        )

    def test_get_breakdown_summary(self):
        """
        Behavior Protected: GET /api/breakdown/projects/{id}/summary returns counts of art department assets.
        Why it matters: Breakdown overview dashboard and department counts depend on this summary.
        Level: API-level integration test.
        """
        # Create a breakdown item attached to scene
        SceneBreakdownItem.objects.create(
            scene=self.scene,
            element_type="PROPS",
            prop=self.prop,
            custom_notes="Hero container held by lead."
        )

        response = self.client.get(f"/api/breakdown/projects/{self.project.id}/summary")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["total_locations"], 1)
        self.assertEqual(data["total_characters"], 1)
        self.assertEqual(data["total_props"], 1)
        self.assertEqual(data["total_vfx"], 0)
        self.assertEqual(data["total_sfx"], 0)
        self.assertEqual(len(data["locations"]), 1)
        self.assertEqual(len(data["characters"]), 1)
        self.assertEqual(len(data["props"]), 1)

    def test_get_scene_breakdown_items(self):
        """
        Behavior Protected: GET /api/breakdown/scenes/{id}/items returns items tagged to the scene.
        Why it matters: Breakdown tab in Scene Builder renders tagged props, wardrobe, and elements.
        Level: API-level integration test.
        """
        item1 = SceneBreakdownItem.objects.create(
            scene=self.scene,
            element_type="PROPS",
            prop=self.prop,
            custom_notes="Handle with care.",
            is_continuity_critical=True
        )
        item2 = SceneBreakdownItem.objects.create(
            scene=self.scene,
            element_type="WARDROBE",
            costume=self.look,
            custom_notes="Bloodstain on left sleeve.",
            is_continuity_critical=False
        )

        response = self.client.get(f"/api/breakdown/scenes/{self.scene.id}/items")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data), 2)

        prop_item = next(i for i in data if i["id"] == str(item1.id))
        self.assertEqual(prop_item["element_type"], "PROPS")
        self.assertEqual(prop_item["prop_name"], "Cryo Container")
        self.assertTrue(prop_item["is_continuity_critical"])

        wardrobe_item = next(i for i in data if i["id"] == str(item2.id))
        self.assertEqual(wardrobe_item["element_type"], "WARDROBE")
        self.assertEqual(wardrobe_item["costume_name"], "Dr. Aris Thorne - Look 1 - Hazmat")
        self.assertFalse(wardrobe_item["is_continuity_critical"])

    def test_create_breakdown_item(self):
        """
        Behavior Protected: POST /api/breakdown/scenes/{id}/items attaches a catalog item or note to a scene.
        Why it matters: Art directors and script supervisors tag physical elements to scenes here.
        Level: API-level integration test.
        """
        payload = {
            "element_type": "PROPS",
            "prop_id": str(self.prop.id),
            "custom_notes": "Glowing green coolant tube.",
            "is_continuity_critical": True
        }
        response = self.client.post(
            f"/api/breakdown/scenes/{self.scene.id}/items",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["element_type"], "PROPS")
        self.assertEqual(data["prop_id"], str(self.prop.id))
        self.assertEqual(data["prop_name"], "Cryo Container")
        self.assertTrue(data["is_continuity_critical"])

        self.assertTrue(
            SceneBreakdownItem.objects.filter(
                scene=self.scene,
                prop=self.prop,
                custom_notes="Glowing green coolant tube."
            ).exists()
        )

    def test_delete_breakdown_item(self):
        """
        Behavior Protected: DELETE /api/breakdown/items/{id} removes a breakdown tag from a scene.
        Why it matters: Untagging elements from scenes must clean up without deleting the underlying catalog entity.
        Level: API-level integration test.
        """
        item = SceneBreakdownItem.objects.create(
            scene=self.scene,
            element_type="PROPS",
            prop=self.prop
        )
        response = self.client.delete(f"/api/breakdown/items/{item.id}")
        self.assertEqual(response.status_code, 200)

        # Breakdown item is deleted, but Prop still exists in project catalog
        self.assertFalse(SceneBreakdownItem.objects.filter(id=item.id).exists())
        self.assertTrue(Prop.objects.filter(id=self.prop.id).exists())

    def test_create_character_endpoint(self):
        """
        Behavior Protected: POST /api/breakdown/characters creates a new character.
        Why it matters: Casting and character bible registries use this endpoint.
        Level: API-level integration test.
        """
        char_payload = {
            "project_id": str(self.project.id),
            "name": "Sarah Connor",
            "cast_id_number": 2,
            "actor_name": "Linda Hamilton"
        }
        char_resp = self.client.post(
            "/api/breakdown/characters",
            data=json.dumps(char_payload),
            content_type="application/json"
        )
        self.assertEqual(char_resp.status_code, 200)
        char_data = char_resp.json()
        self.assertEqual(char_data["name"], "Sarah Connor")
        self.assertEqual(char_data["cast_id_number"], 2)
        self.assertTrue(Character.objects.filter(name="Sarah Connor").exists())

    def test_known_behavior_costume_look_without_photo_raises_validation_error(self):
        """
        KNOWN_BEHAVIOR_REQUIRING_REVIEW:
        CostumeLookOut schema (config/api.py:346) defines continuity_photo_url: str (required).
        When a CostumeLook has no continuity photo (the default for new looks),
        the endpoint raises a Pydantic ValidationError instead of returning None/empty.
        Level: Regression/Characterization test for known schema defect.
        """
        look_payload = {
            "look_number": "Look 1 - Tactical",
            "description": "Tactical vest without photo upload yet"
        }
        with self.assertRaises(ValidationError):
            self.client.post(
                f"/api/breakdown/characters/{self.character.id}/looks",
                data=json.dumps(look_payload),
                content_type="application/json"
            )
