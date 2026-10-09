import json
import uuid
from django.test import TestCase, Client
from pydantic import ValidationError
from unittest.mock import patch
from apps.narrative.models import Project, Act, Sequence, Scene
from apps.breakdown.models import MasterLocation, Character, CostumeLook, Prop, SceneBreakdownItem
from apps.breakdown.ai_copilot import (
    ExtractedCharacter, ExtractedProp, ExtractedVFX, ExtractedWardrobe,
    OllamaLLMProvider, SceneExtraction, run_scene_breakdown,
)

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

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_tags_props_cast_and_wardrobe_using_supported_fields(self, generate_structured):
        generate_structured.return_value = SceneExtraction(
            props=[ExtractedProp(name="Signal Flare", description="Red emergency flare")],
            characters=[ExtractedCharacter(name="Mara")],
            wardrobe=[ExtractedWardrobe(character_name="Mara", description="Weathered coat")],
            vfx=[ExtractedVFX(description="Distant explosion")],
        )

        summary = run_scene_breakdown(str(self.scene.id))

        self.assertEqual(summary, {
            "props_added": 1,
            "wardrobe_added": 1,
            "vfx_added": 1,
            "characters_added": 1,
        })
        flare = Prop.objects.get(project=self.project, name="Signal Flare")
        mara = Character.objects.get(project=self.project, name="Mara")
        look = CostumeLook.objects.get(character=mara, description="Weathered coat")
        self.assertTrue(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="PROPS", prop=flare,
            custom_notes="Red emergency flare",
        ).exists())
        self.assertTrue(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="CAST", custom_notes="Mara",
        ).exists())
        self.assertTrue(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="WARDROBE", costume=look,
        ).exists())

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_is_idempotent_for_existing_catalog_tags(self, generate_structured):
        generate_structured.return_value = SceneExtraction(
            props=[ExtractedProp(name="Signal Flare", description="Red emergency flare")],
            characters=[ExtractedCharacter(name="Mara")],
            wardrobe=[ExtractedWardrobe(character_name="Mara", description="Weathered coat")],
        )

        first_summary = run_scene_breakdown(str(self.scene.id))
        second_summary = run_scene_breakdown(str(self.scene.id))

        self.assertEqual(first_summary["props_added"], 1)
        self.assertEqual(second_summary["props_added"], 0)
        self.assertEqual(second_summary["characters_added"], 0)
        self.assertEqual(second_summary["wardrobe_added"], 0)
        self.assertEqual(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="PROPS",
            prop__name="Signal Flare",
        ).count(), 1)
        self.assertEqual(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="CAST", custom_notes="Mara",
        ).count(), 1)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured", side_effect=RuntimeError("LLM unavailable"))
    def test_ai_copilot_llm_failure_returns_empty_summary(self, _generate_structured):
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary, {
            "props_added": 0,
            "wardrobe_added": 0,
            "vfx_added": 0,
            "characters_added": 0,
        })

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_empty_llm_output_returns_zero_summary(self, generate_structured):
        """
        Behavior Protected: Empty LLM output returns a zero-count summary without errors.
        Level: Unit / regression test.
        """
        generate_structured.return_value = SceneExtraction(
            props=[], characters=[], wardrobe=[], vfx=[]
        )
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary, {
            "props_added": 0,
            "wardrobe_added": 0,
            "vfx_added": 0,
            "characters_added": 0,
        })
        self.assertEqual(SceneBreakdownItem.objects.filter(scene=self.scene).count(), 0)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_none_llm_output_handled_safely(self, generate_structured):
        """
        Behavior Protected: When LLM provider returns None, copilot defaults safely.
        Level: Unit / regression test.
        """
        generate_structured.return_value = None
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary, {
            "props_added": 0,
            "wardrobe_added": 0,
            "vfx_added": 0,
            "characters_added": 0,
        })

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_wardrobe_auto_creates_missing_character(self, generate_structured):
        """
        Behavior Protected: If wardrobe references a character not present in extracted.characters,
        the character is automatically created and counted.
        Level: Integration test.
        """
        generate_structured.return_value = SceneExtraction(
            props=[],
            characters=[],
            wardrobe=[ExtractedWardrobe(character_name="Commander Vance", description="Armored flight suit")],
            vfx=[],
        )
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary["characters_added"], 1)
        self.assertEqual(summary["wardrobe_added"], 1)
        self.assertTrue(Character.objects.filter(project=self.project, name="Commander Vance").exists())
        vance = Character.objects.get(project=self.project, name="Commander Vance")
        look = CostumeLook.objects.get(character=vance, description="Armored flight suit")
        self.assertTrue(SceneBreakdownItem.objects.filter(
            scene=self.scene, element_type="WARDROBE", costume=look
        ).exists())

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_wardrobe_duplicate_prevention_on_repeated_runs(self, generate_structured):
        """
        Behavior Protected: Running copilot twice does not create duplicate wardrobe tags.
        Level: Regression test.
        """
        generate_structured.return_value = SceneExtraction(
            wardrobe=[ExtractedWardrobe(character_name="Dr. Aris Thorne", description="Hazmat suit")]
        )
        first_summary = run_scene_breakdown(str(self.scene.id))
        second_summary = run_scene_breakdown(str(self.scene.id))

        self.assertEqual(first_summary["wardrobe_added"], 1)
        self.assertEqual(second_summary["wardrobe_added"], 0)
        self.assertEqual(
            SceneBreakdownItem.objects.filter(scene=self.scene, element_type="WARDROBE").count(),
            1
        )

    def test_ai_copilot_scene_without_project_raises_value_error(self):
        """
        Behavior Protected: Running copilot on an unlinked scene without project raises ValueError.
        Level: Unit test for missing related records.
        """
        unlinked_scene = Scene.objects.create(
            scene_number="99X",
            set_name="VOID"
        )
        with self.assertRaises(ValueError) as ctx:
            run_scene_breakdown(str(unlinked_scene.id))
        self.assertIn("not associated with any project", str(ctx.exception))

    def test_ai_copilot_non_existent_scene_raises_404(self):
        """
        Behavior Protected: Passing non-existent scene ID raises Http404.
        Level: Unit test.
        """
        from django.http import Http404
        with self.assertRaises(Http404):
            run_scene_breakdown(str(uuid.uuid4()))

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_extracts_script_blocks(self, generate_structured):
        """
        Behavior Protected: Structured screenplay blocks in scene.script_data are passed to prompt.
        Level: Regression test.
        """
        generate_structured.return_value = SceneExtraction()
        block_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="2",
            set_name="CORRIDOR",
            script_data={
                "blocks": [
                    {"type": "action", "content": "Elena picks up the silver keycard."},
                    {"type": "dialogue", "content": "We need to move now."}
                ]
            }
        )
        run_scene_breakdown(str(block_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("Elena picks up the silver keycard.", call_prompt)
        self.assertIn("We need to move now.", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_script_blocks_empty_list_falls_back_to_heading(self, generate_structured):
        """
        Behavior Protected: An empty blocks list falls back to scene heading and default message.
        Level: Regression test for malformed script data.
        """
        generate_structured.return_value = SceneExtraction()
        empty_blocks_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="3",
            set_name="HANGAR",
            script_data={"blocks": []}
        )
        run_scene_breakdown(str(empty_blocks_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("INT HANGAR - DAY", call_prompt)
        self.assertIn("(No script text available)", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_script_blocks_none_falls_back_to_heading(self, generate_structured):
        """
        Behavior Protected: blocks=None does not raise TypeError and falls back to heading.
        Level: Regression test for non-iterable blocks.
        """
        generate_structured.return_value = SceneExtraction()
        none_blocks_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="4",
            set_name="CONTROL_ROOM",
            script_data={"blocks": None}
        )
        run_scene_breakdown(str(none_blocks_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("INT CONTROL_ROOM - DAY", call_prompt)
        self.assertIn("(No script text available)", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_script_blocks_mixed_malformed_extracts_only_valid_content(self, generate_structured):
        """
        Behavior Protected: Mixed malformed blocks (strings, None, numbers, non-content dicts)
        do not raise errors and only valid string content is extracted.
        Level: Regression test for malformed block elements.
        """
        generate_structured.return_value = SceneExtraction()
        malformed_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="5",
            set_name="VAULT",
            script_data={
                "blocks": [
                    "invalid string block",
                    None,
                    42,
                    {"other": "value without content key"},
                    {"content": None},
                    {"content": 100},
                    {"content": "  "},
                    {"type": "action", "content": "Laser cutter ignites against the titanium vault."}
                ]
            }
        )
        run_scene_breakdown(str(malformed_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("Laser cutter ignites against the titanium vault.", call_prompt)
        self.assertNotIn("invalid string block", call_prompt)
        self.assertNotIn("(No script text available)", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_script_blocks_empty_content_falls_back_to_heading(self, generate_structured):
        """
        Behavior Protected: Blocks containing only empty or whitespace content fall back to heading.
        Level: Regression test.
        """
        generate_structured.return_value = SceneExtraction()
        whitespace_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="6",
            set_name="ROOFTOP",
            script_data={
                "blocks": [
                    {"content": ""},
                    {"content": "   "},
                    {"content": None}
                ]
            }
        )
        run_scene_breakdown(str(whitespace_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("INT ROOFTOP - DAY", call_prompt)
        self.assertIn("(No script text available)", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_script_blocks_fallback_to_script_data_text(self, generate_structured):
        """
        Behavior Protected: When blocks contain no usable content, falls back to non-empty script_data['text'].
        Level: Regression test for text fallback.
        """
        generate_structured.return_value = SceneExtraction()
        text_fallback_scene = Scene.objects.create(
            sequence=self.sequence,
            scene_number="7",
            set_name="BUNKER",
            script_data={
                "blocks": [],
                "text": "Fallback text: Sirens wail in the background."
            }
        )
        run_scene_breakdown(str(text_fallback_scene.id))
        call_prompt = generate_structured.call_args[0][0]
        self.assertIn("Fallback text: Sirens wail in the background.", call_prompt)
        self.assertNotIn("(No script text available)", call_prompt)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_ignores_blank_or_whitespace_names(self, generate_structured):
        """
        Behavior Protected: Extracted entities with empty or whitespace names are ignored.
        Level: Robustness test.
        """
        generate_structured.return_value = SceneExtraction(
            props=[ExtractedProp(name="   ", description="empty name")],
            characters=[ExtractedCharacter(name="  ")],
            wardrobe=[ExtractedWardrobe(character_name="  ", description="  ")],
        )
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary, {
            "props_added": 0,
            "wardrobe_added": 0,
            "vfx_added": 0,
            "characters_added": 0,
        })
        self.assertEqual(SceneBreakdownItem.objects.filter(scene=self.scene).count(), 0)

    @patch("apps.breakdown.ai_copilot.OllamaLLMProvider.generate_structured")
    def test_ai_copilot_vfx_unsupported_not_persisted_to_db(self, generate_structured):
        """
        Behavior Protected: VFX is not persisted to database (schema has no VFX catalog),
        but extracted count is reported in summary telemetry.
        Level: Characterization test.
        """
        generate_structured.return_value = SceneExtraction(
            vfx=[ExtractedVFX(description="Orbital bombardment explosion")]
        )
        summary = run_scene_breakdown(str(self.scene.id))
        self.assertEqual(summary["vfx_added"], 1)
        self.assertFalse(SceneBreakdownItem.objects.filter(scene=self.scene, element_type="VFX").exists())

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
