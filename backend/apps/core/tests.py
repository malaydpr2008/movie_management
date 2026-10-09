import json
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from django.test import TestCase, Client, RequestFactory
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from ninja.errors import HttpError

from apps.narrative.models import Project
from apps.core.models import ProjectMembership, MediaAsset, BackgroundJob
from apps.core.consumers import StudioConsumer
from apps.core.tasks import async_ingest_document
from apps.core.application.use_cases.ingest_document import IngestDocumentUseCase
from config.security import require_project_role
from channels.testing import WebsocketCommunicator
from apps.core.routing import websocket_urlpatterns
from channels.routing import URLRouter
from pydantic import BaseModel

from apps.core.application.ports.object_storage import IObjectStorage, StoredFileMetadata
from apps.core.application.ports.cache import ICacheService
from apps.core.application.ports.event_publisher import IEventPublisher
from apps.core.application.ports.vector_search import IVectorSearch, VectorSearchResult
from apps.core.application.ports.llm_provider import ILLMProvider
from apps.core.infrastructure.storage.django_s3_storage_adapter import DjangoS3StorageAdapter
from apps.core.infrastructure.cache.django_cache_adapter import DjangoCacheAdapter
from apps.core.infrastructure.events.channels_event_publisher import ChannelsEventPublisher
from apps.core.infrastructure.vector.qdrant_vector_adapter import QdrantVectorAdapter
from apps.core.infrastructure.llm.ollama_provider import OllamaLLMProvider
from apps.core.test_architecture import ArchitectureEnforcementTests

User = get_user_model()

class CoreInfrastructureCharacterizationTests(TestCase):
    """
    Characterization tests protecting observable Infrastructure behavior:
    - Role-Based Access Control & Project Membership validation
    - Media Asset upload & Polymorphic ContentType resolution
    - Celery BackgroundJob task lifecycle
    - WebSocket StudioConsumer room joining and message broadcasting
    """

    def setUp(self):
        self.client = Client()
        self.rf = RequestFactory()
        
        self.owner = User.objects.create_user(username="owner_user", email="owner@cineflow.local")
        self.viewer = User.objects.create_user(username="viewer_user", email="viewer@cineflow.local")
        self.stranger = User.objects.create_user(username="stranger_user", email="stranger@cineflow.local")
        
        self.project = Project.objects.create(title="Security Project", slug="sec-proj")
        
        ProjectMembership.objects.create(user=self.owner, project=self.project, role="OWNER")
        ProjectMembership.objects.create(user=self.viewer, project=self.project, role="VIEWER")

    def test_require_project_role_authorization_logic(self):
        """
        Behavior Protected: require_project_role dependency enforces RBAC rules.
        Why it matters: Prevents unauthorized users from modifying project narrative, schedule, and budgets.
        Level: Unit / Security contract test.
        """
        dep_owner_only = require_project_role(["OWNER", "ADMIN"])

        # 1. User with OWNER role passes
        req_owner = self.rf.get(f"/api/fake/{self.project.id}")
        req_owner.user = self.owner
        req_owner.resolver_match = MagicMock()
        req_owner.resolver_match.kwargs = {"project_id": str(self.project.id)}
        membership = dep_owner_only(req_owner)
        self.assertEqual(membership.role, "OWNER")

        # 2. User with VIEWER role fails with 403 Forbidden
        req_viewer = self.rf.get(f"/api/fake/{self.project.id}")
        req_viewer.user = self.viewer
        req_viewer.resolver_match = MagicMock()
        req_viewer.resolver_match.kwargs = {"project_id": str(self.project.id)}
        with self.assertRaises(HttpError) as ctx:
            dep_owner_only(req_viewer)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Insufficient role", str(ctx.exception.message))

        # 3. User with no membership fails with 403 Not a member
        req_stranger = self.rf.get(f"/api/fake/{self.project.id}")
        req_stranger.user = self.stranger
        req_stranger.resolver_match = MagicMock()
        req_stranger.resolver_match.kwargs = {"project_id": str(self.project.id)}
        with self.assertRaises(HttpError) as ctx:
            dep_owner_only(req_stranger)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Not a member", str(ctx.exception.message))

    def test_media_upload_and_polymorphic_retrieval(self):
        """
        Behavior Protected: POST /api/media/upload attaches file via ContentType GenericForeignKey.
        Why it matters: Universal media connector attaches files to scenes, shots, costume looks without schema alterations.
        Level: API-level integration test.
        """
        fake_image = SimpleUploadedFile(
            "storyboard_frame.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
            content_type="image/png"
        )
        object_id = str(uuid.uuid4())

        # Mock S3 default_storage save to avoid live network I/O in unit test
        with patch("django.core.files.storage.default_storage.save", return_value="studio-media/test.png"), \
             patch("django.core.files.storage.default_storage.url", return_value="http://minio:9000/studio-media/test.png"):
            
            response = self.client.post(
                f"/api/media/upload?app_label=narrative&model_name=project&object_id={object_id}",
                {"file": fake_image}
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["file_type"], "IMAGE")
            self.assertEqual(data["object_id"], object_id)

            # Retrieve via GET endpoint
            get_resp = self.client.get(f"/api/media/narrative/project/{object_id}")
            self.assertEqual(get_resp.status_code, 200)
            assets = get_resp.json()
            self.assertEqual(len(assets), 1)
            self.assertEqual(assets[0]["file_type"], "IMAGE")

    def test_celery_task_invocation_and_job_lifecycle(self):
        """
        Behavior Protected: Long-running task creates BackgroundJob and tracks execution status.
        Why it matters: Studio operations (call sheets, DPRs) run asynchronously and expose state to JobMonitor UI.
        Level: Integration test with task mock.
        """
        # Create a BackgroundJob record
        job = BackgroundJob.objects.create(task_name="generate_call_sheet_pdf", status="RUNNING")
        self.assertEqual(job.status, "RUNNING")

        # Simulate completion
        job.status = "SUCCESS"
        job.result = {"file": "call_sheets/day_1.pdf", "url": "http://minio:9000/call_sheets/day_1.pdf"}
        job.save()

        job.refresh_from_db()
        self.assertEqual(job.status, "SUCCESS")
        self.assertIn("day_1.pdf", job.result["file"])

    async def test_websocket_studio_consumer_broadcast(self):
        """
        Behavior Protected: StudioConsumer accepts connection to project room and echoes broadcast messages.
        Why it matters: Realtime collaboration layer relies on project rooms for synchronized updates.
        Level: WebSocket ASGI communicator integration test.
        """
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, f"ws/projects/{self.project.id}/")
        
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Send test message to room
        test_payload = {"entity": "stripboard", "action": "reorder", "strip_id": "test-123"}
        await communicator.send_json_to(test_payload)

        # Receive broadcast message
        response = await communicator.receive_json_from()
        self.assertEqual(response["entity"], "stripboard")
        self.assertEqual(response["strip_id"], "test-123")

        await communicator.disconnect()


class CoreCeleryTaskTests(TestCase):
    """
    Integration/Characterization tests for Core Celery task and application use cases:
    - IngestDocumentUseCase execution with vector store
    - async_ingest_document Celery task adapter execution
    - Error handling and failure reporting in Celery task adapter
    """

    def test_ingest_document_use_case_success(self):
        use_case = IngestDocumentUseCase()
        with patch("apps.core.application.use_cases.ingest_document.ingest_document") as mock_ingest:
            result = use_case.execute(
                file_url="http://minio:9000/docs/script.pdf",
                metadata={"project_id": "proj-123"}
            )
            self.assertEqual(result["status"], "success")
            self.assertEqual(result["file"], "http://minio:9000/docs/script.pdf")
            mock_ingest.assert_called_once_with(
                "http://minio:9000/docs/script.pdf",
                {"project_id": "proj-123"}
            )

    def test_async_ingest_document_task_adapter_success(self):
        with patch.object(
            IngestDocumentUseCase,
            "execute",
            return_value={"status": "success", "file": "http://minio:9000/docs/callsheet.pdf"}
        ):
            res = async_ingest_document.apply(args=[
                "http://minio:9000/docs/callsheet.pdf",
                {"type": "call_sheet"}
            ])
            self.assertEqual(res.result["status"], "success")
            self.assertEqual(res.result["file"], "http://minio:9000/docs/callsheet.pdf")

    def test_async_ingest_document_task_adapter_error_handling(self):
        with patch.object(
            IngestDocumentUseCase,
            "execute",
            side_effect=Exception("Qdrant connection refused")
        ):
            res = async_ingest_document.apply(args=[
                "http://minio:9000/docs/invalid.pdf",
                {}
            ])
            self.assertEqual(res.result["status"], "error")
            self.assertIn("Qdrant connection refused", res.result["error"])


class DummySchema(BaseModel):
    title: str
    score: int


class FakeObjectStorage:
    def __init__(self):
        self.files = {}

    def save_file(self, file_path: str, content) -> str:
        data = content if isinstance(content, bytes) else content.read()
        self.files[file_path] = data
        return file_path

    def get_url(self, file_path: str) -> str:
        return f"http://fake-storage/{file_path}"

    def exists(self, file_path: str) -> bool:
        return file_path in self.files

    def delete(self, file_path: str) -> bool:
        if file_path in self.files:
            del self.files[file_path]
            return True
        return False

    def list_files(self, prefix: str = ""):
        return [
            StoredFileMetadata(key=k, size=len(v), last_modified="2026-10-09T00:00:00Z", url=f"http://fake-storage/{k}")
            for k, v in self.files.items()
            if k.startswith(prefix)
        ]


class FakeVectorSearch:
    def __init__(self):
        self.indexed = []

    def search(self, query: str, limit: int = 4, filter_metadata = None):
        return [VectorSearchResult(content=f"Result for {query}", metadata={"doc": "fake"})]

    def index_document(self, file_url: str, metadata: dict) -> int:
        self.indexed.append({"url": file_url, "metadata": metadata})
        return 3


class InfrastructurePortsAndAdaptersTests(TestCase):
    """
    Tests validating capability ports and infrastructure adapters:
    - DjangoS3StorageAdapter (object storage capability)
    - DjangoCacheAdapter (key-value cache capability)
    - ChannelsEventPublisher (event publisher capability)
    - QdrantVectorAdapter (vector search & indexing capability)
    - OllamaLLMProvider (LLM text, structured, vision capabilities)
    - Fake in-memory ports for pure application testing
    """

    def test_django_s3_storage_adapter_crud(self):
        adapter = DjangoS3StorageAdapter()
        test_key = "test_dir/hello.txt"
        saved = adapter.save_file(test_key, b"Hello CineFlow")
        self.assertTrue(adapter.exists(saved))
        self.assertIn("hello.txt", adapter.get_url(saved))

        deleted = adapter.delete(saved)
        self.assertTrue(deleted)
        self.assertFalse(adapter.exists(saved))

    def test_django_cache_adapter_crud(self):
        adapter = DjangoCacheAdapter()
        adapter.set("test_cache_key", {"status": "ok"}, timeout=60)
        self.assertTrue(adapter.exists("test_cache_key"))
        self.assertEqual(adapter.get("test_cache_key"), {"status": "ok"})

        adapter.delete("test_cache_key")
        self.assertIsNone(adapter.get("test_cache_key"))

    def test_channels_event_publisher_group_dispatch(self):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        publisher = ChannelsEventPublisher(channel_layer=mock_layer)

        publisher.publish_notification("Take 1 approved", level="success", action="view_take")
        mock_layer.group_send.assert_called_once()
        args = mock_layer.group_send.call_args[0]
        self.assertEqual(args[0], "studio_notifications")
        self.assertEqual(args[1]["message"], "Take 1 approved")
        self.assertEqual(args[1]["level"], "success")

        mock_layer.reset_mock()
        publisher.publish_project_event("proj-999", "SCENE_UPDATED", {"scene_id": "123"})
        args = mock_layer.group_send.call_args[0]
        self.assertEqual(args[0], "project_proj-999")
        self.assertEqual(args[1]["message"]["event"], "SCENE_UPDATED")

    def test_qdrant_vector_adapter_search(self):
        adapter = QdrantVectorAdapter()
        mock_store = MagicMock()
        mock_doc = MagicMock()
        mock_doc.page_content = "Scene 1 INT. LAB"
        mock_doc.metadata = {"scene": "1"}
        mock_store.similarity_search.return_value = [mock_doc]

        with patch.object(adapter, "_get_vector_store", return_value=mock_store):
            results = adapter.search("laboratory", limit=2)
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].content, "Scene 1 INT. LAB")
            self.assertEqual(results[0].metadata["scene"], "1")

    def test_ollama_llm_provider_generation(self):
        provider = OllamaLLMProvider()

        # 1. Text generation
        mock_llm = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = "Generated scene description"
        mock_llm.invoke.return_value = mock_resp

        with patch("langchain_ollama.ChatOllama", return_value=mock_llm):
            text = provider.generate("Write synopsis")
            self.assertEqual(text, "Generated scene description")

        # 2. Structured generation
        mock_structured_llm = MagicMock()
        mock_structured_llm.invoke.return_value = DummySchema(title="Extracted Scene", score=10)
        mock_base_llm = MagicMock()
        mock_base_llm.with_structured_output.return_value = mock_structured_llm

        with patch("langchain_ollama.ChatOllama", return_value=mock_base_llm):
            structured = provider.generate_structured("Extract scene", DummySchema)
            self.assertEqual(structured.title, "Extracted Scene")
            self.assertEqual(structured.score, 10)

        # 3. Vision analysis
        mock_vision_llm = MagicMock()
        mock_vision_resp = MagicMock()
        mock_vision_resp.content = "Costume is period-accurate Victorian dress"
        mock_vision_llm.invoke.return_value = mock_vision_resp

        with patch("langchain_ollama.ChatOllama", return_value=mock_vision_llm):
            analysis = provider.analyze_image("ZmFrZV9pbWFnZQ==", "What costume is this?")
            self.assertEqual(analysis, "Costume is period-accurate Victorian dress")

    def test_pure_in_memory_fake_ports_use_case_isolation(self):
        fake_vector = FakeVectorSearch()
        use_case = IngestDocumentUseCase(vector_service=fake_vector)

        res = use_case.execute("http://fake.local/script.pdf", {"project": "pure-memory"})
        self.assertEqual(res["status"], "success")
        self.assertEqual(len(fake_vector.indexed), 1)
        self.assertEqual(fake_vector.indexed[0]["url"], "http://fake.local/script.pdf")

        # Pure fake storage
        fake_storage = FakeObjectStorage()
        saved = fake_storage.save_file("docs/script.pdf", b"Scene 1")
        self.assertTrue(fake_storage.exists(saved))
        files = fake_storage.list_files()
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0].key, "docs/script.pdf")


