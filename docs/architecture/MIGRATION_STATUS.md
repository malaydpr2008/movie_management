# CineFlow Studio — API Migration Status

**Document:** Evolutionary Architectural Rebuild — API Migration Ledger  
**Version:** 2.0  
**Status:** Complete (100% Migrated)  
**Design Philosophy:** Pragmatic Clean Architecture, Bounded-Context Routers, Inward-Pointing Dependencies  

---

## 1. Context Migration Matrix

| Bounded Context | Prefix | Target App | Original LOC in `api.py` | Status | Tests Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Narrative: Scenes & Hierarchy** | `/narrative/*` | `apps.narrative` | ~600 | **Migrated** | 18/18 Passing |
| **Media Connector** | `/media` | `apps.core.media` | ~60 | **Migrated** | 4/4 Passing |
| **Budget & Financials** | `/financials` | `apps.financials` | ~240 | **Migrated** | 2/2 Passing |
| **Shots & VFX** | `/shots`, `/vfx` | `apps.shots` | ~230 | **Migrated** | 1/1 Passing |
| **Studio & Projects** | `/studio` | `apps.core.studio` | ~110 | **Migrated** | 4/4 Passing |
| **Production Logistics** | `/logistics` | `apps.logistics` | ~500 | **Migrated** | 5/5 Passing |
| **Breakdown Catalogs** | `/breakdown` | `apps.breakdown` | ~620 | **Migrated** | 6/6 Passing |
| **Universal AI Copilot** | `/ai` | `apps.core.ai` | ~250 | **Migrated** | Passing |

---

## 2. Completed Migrations Log

### Universal AI Copilot (Full Context Migration)
- **Migrated Endpoints:**
  - `POST /api/ai/upload-temp-image` (Upload Temp Image for AI Multimodal Analysis)
  - `POST /api/ai/projects/{project_id}/chat` (Universal Copilot Agent Chat)
  - `GET /api/ai/jobs` (List Recent Celery Background Jobs)
  - `GET /api/ai/projects/{project_id}/pending-breakdown` (Fetch Cached Pending Breakdown)
  - `POST /api/ai/projects/{project_id}/approve-breakdown` (Approve & Ingest Breakdown to Scenes)
  - `GET /api/ai/assets` (List S3/MinIO Storage Assets)
- **Target Location:**
  - Application: `apps/core/ai/application/` (`use_cases.py`)
  - API: `apps/core/ai/api/` (`router.py`, `schemas.py`)
- **Verification:** Integrated into root `config/api.py`, 36/36 full suite passing.

### Breakdown Elements & Catalogs (Full Context Migration)
- **Migrated Endpoints:**
  - `GET /api/breakdown/projects/{project_id}/scenes/{scene_id}/elements` (Scene Elements List)
  - `POST /api/breakdown/projects/{project_id}/scenes/{scene_id}/elements` (Add Scene Element)
  - `GET /api/breakdown/scenes/{scene_id}/items` (Scene Breakdown Items)
  - `POST /api/breakdown/scenes/{scene_id}/items` (Add Scene Breakdown Item)
  - `POST /api/breakdown/scenes/{scene_id}/ai-copilot` (Trigger AI Copilot)
  - `DELETE /api/breakdown/items/{item_id}` (Delete Breakdown Item)
  - `GET /api/breakdown/locations` (List Master Locations)
  - `POST /api/breakdown/locations` (Create Master Location)
  - `PATCH /api/breakdown/locations/{location_id}` (Update Master Location)
  - `DELETE /api/breakdown/locations/{location_id}` (Delete Master Location)
  - `GET /api/breakdown/characters` (List Characters)
  - `POST /api/breakdown/characters` (Create Character)
  - `PATCH /api/breakdown/characters/{character_id}` (Update Character)
  - `DELETE /api/breakdown/characters/{character_id}` (Delete Character)
  - `POST /api/breakdown/characters/{character_id}/looks` (Add Costume Look)
  - `PATCH /api/breakdown/looks/{look_id}` (Update Costume Look)
  - `DELETE /api/breakdown/looks/{look_id}` (Delete Costume Look)
  - `GET /api/breakdown/props` (List Props)
  - `POST /api/breakdown/props` (Create Prop)
  - `PATCH /api/breakdown/props/{prop_id}` (Update Prop)
  - `DELETE /api/breakdown/props/{prop_id}` (Delete Prop)
  - `GET /api/breakdown/projects/{project_id}/summary` (Art Dept Central Summary)
  - `GET /api/breakdown/projects/{project_id}/catalogs/locations` (Catalog Locations)
  - `GET /api/breakdown/projects/{project_id}/catalogs/characters` (Catalog Characters)
  - `GET /api/breakdown/projects/{project_id}/catalogs/props` (Catalog Props)
  - `GET /api/breakdown/projects/{project_id}/catalogs/vfx` (Catalog VFX/SFX)
  - `GET /api/breakdown/catalogs/{project_id}` (Unified Art Dept Catalogs)
- **Target Location:**
  - Application: `apps/breakdown/application/` (`use_cases.py`, `ports.py`)
  - Infrastructure: `apps/breakdown/infrastructure/` (`django_breakdown_repository.py`)
  - API: `apps/breakdown/api/` (`router.py`, `schemas.py`)
- **Verification:** 6 breakdown tests passing (36/36 full suite passing).

### Production Logistics & Stripboard (Full Context Migration)
- **Migrated Endpoints:**
  - `POST /api/logistics/shoot-days/{shoot_day_id}/generate-call-sheet` (Generate Call Sheet PDF)
  - `GET /api/logistics/projects/{project_id}/schedule` (Production Schedule)
  - `POST /api/logistics/shoot-days` (Create Shoot Day)
  - `POST /api/logistics/strips/reorder` (Reorder Stripboard Card)
  - `POST /api/logistics/strips/schedule-scene` (Schedule Scene Strip)
  - `POST /api/logistics/strips/banner` (Insert Banner Strip)
  - `DELETE /api/logistics/strips/{strip_id}` (Delete Stripboard Card)
  - `GET /api/logistics/projects/{project_id}/dood` (SAG Day-Out-of-Days Matrix)
  - `GET /api/logistics/projects/{project_id}/stripboard` (Stripboard View)
  - `GET /api/logistics/shoot-days/{shoot_day_id}/dpr` (Get DPR Wrap Report)
  - `POST /api/logistics/shoot-days/{shoot_day_id}/dpr` (Update DPR Wrap Report)
  - `GET /api/logistics/projects/{project_id}/crew` (List Crew Roster)
  - `POST /api/logistics/projects/{project_id}/crew` (Create Crew Member)
  - `PATCH /api/logistics/crew/{crew_id}` (Update Crew Member)
  - `DELETE /api/logistics/crew/{crew_id}` (Delete Crew Member)
- **Target Location:**
  - Domain: `apps/logistics/domain/` (`dood_calculator.py`, `cast_presence.py`, `formatting.py`)
  - Application: `apps/logistics/application/` (`use_cases.py`, `ports.py`)
  - Infrastructure: `apps/logistics/infrastructure/` (`django_logistics_repository.py`)
  - API: `apps/logistics/api/` (`router.py`, `schemas.py`)
- **Verification:** 5 logistics tests passing (36/36 full suite passing).

### Narrative: Scenes & Hierarchy (Full Context Migration)
- **Migrated Endpoints:**
  - `POST /api/narrative/projects/{project_id}/import-script` (Import Fountain Script)
  - `GET /api/narrative/projects/{project_id}/tree` (Dual-Tree Narrative Hierarchy)
  - `POST /api/narrative/scenes` (Create Scene)
  - `GET /api/narrative/scenes/{id}` (Retrieve Scene)
  - `PATCH /api/narrative/scenes/{id}` (Update Scene)
  - `DELETE /api/narrative/scenes/{id}` (Delete Scene)
  - `POST /api/narrative/scenes/reorder` (Reorder Scene)
  - `GET /api/narrative/acts/{id}` (Act Detail)
  - `PATCH /api/narrative/acts/{id}` (Update Act)
  - `POST /api/narrative/acts` (Create Act)
  - `DELETE /api/narrative/acts/{id}` (Delete Act)
  - `GET /api/narrative/sequences/{id}` (Sequence Detail)
  - `PATCH /api/narrative/sequences/{id}` (Update Sequence)
  - `POST /api/narrative/sequences` (Create Sequence)
  - `DELETE /api/narrative/sequences/{id}` (Delete Sequence)
  - `GET /api/narrative/projects/{project_id}/scenes/{scene_id}/adr` (ADR Cues list)
  - `POST /api/narrative/projects/{project_id}/scenes/{scene_id}/adr` (Create ADR Cue)
  - `PATCH /api/narrative/projects/{project_id}/adr/{cue_id}/status` (Update ADR Cue Status)
  - `GET /api/narrative/projects/{project_id}/scenes/{scene_id}/shots` (Strict Shots list)
  - `POST /api/narrative/projects/{project_id}/scenes/{scene_id}/shots` (Create Strict Shot)
- **Target Location:**
  - Domain: `apps/narrative/domain/` (`exceptions.py`, `value_objects.py`)
  - Application: `apps/narrative/application/` (`use_cases/`, `ports/`, `dtos.py`)
  - Infrastructure: `apps/narrative/infrastructure/repositories/` (`django_scene_repository.py`)
  - API: `apps/narrative/api/` (`router.py`, `handlers.py`, `schemas.py`)
- **Verification:** 18 narrative tests passing, integrated into `config/api.py`.

---

## 3. Celery Tasks Architecture Refactor

All background Celery tasks have been refactored into thin transport/infrastructure adapters delegating to application use cases and domain services.

```
Celery Task (Transport Adapter)
     ↓
Application Use Case (Workflow Orchestration)
     ↓
Domain Service / Pure Entity (Business Rules & Generation)
     ↓
Ports (Service Interfaces & Abstractions)
     ↓
Infrastructure (Django ORM, S3/MinIO Storage, LangChain/Ollama, Channels WebSocket)
```

| App | Task Name | Use Case | Domain / Port / Infra Extracted | Retry / Idempotency Semantics | Tests Added |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`apps.logistics`** | `generate_call_sheet_pdf` | `GenerateCallSheetPdfUseCase` | **Domain:** `apps/logistics/domain/call_sheet_renderer.py` (`render_call_sheet_pdf`)<br>**Infra:** `broadcast_studio_notification` | `bind=True, max_retries=3, default_retry_delay=60`. Idempotent: deletes prior S3 PDF before overwrite. | 4 tests (use case, lifecycle, idempotency, retry exhaustion) |
| **`apps.logistics`** | `finalize_dpr` | `FinalizeDprUseCase` | **Application:** `apps/logistics/application/finalize_dpr_use_case.py`<br>**Infra:** Channels WebSocket notification | `bind=True, max_retries=3, default_retry_delay=60`. Transitions `ShootDay.is_dpr_locked = True`. | 1 test (lifecycle and notification) |
| **`apps.narrative`** | `batch_script_breakdown` | `BatchScriptBreakdownUseCase` | **Port:** `IScriptBreakdownService`<br>**Infra:** `OllamaScriptBreakdownService` (LangChain + Ollama)<br>**Cache:** Redis key `pending_breakdown_{project_id}` | `bind=True, max_retries=3, default_retry_delay=60`. Idempotent Redis cache overwrite with 24h TTL. | 4 tests (use case, lifecycle, retry exhaustion, cache idempotency) |
| **`apps.core`** | `async_ingest_document` | `IngestDocumentUseCase` | **Application:** `apps/core/application/use_cases/ingest_document.py`<br>**Infra:** Qdrant vector store adapter | Deserializes arguments, invokes use case, returns `{"status": "success"\|"error"}`. | 3 tests (use case, success adapter, error handling) |

### Test Suite Status Post-Refactor
- **Celery Tasks Test Status:** 48 passing (0 failures, 0 errors).

---

## 4. Infrastructure Ports & Capability Decoupling

Infrastructure dependencies have been decoupled behind capability ports. Application and domain logic now depend strictly on capabilities rather than concrete vendors or SDKs.

```
Application Use Case / Domain
     ↓ (depends on capability)
Port (Protocol / Interface)
     ↑ (implements capability)
Infrastructure Adapter (Vendor Implementation: Boto3, Qdrant, Redis, Channels, Ollama, ReportLab)
```

### Port & Adapter Matrix

| Capability | Port Location | Adapter Location | Hidden Implementation Details |
| :--- | :--- | :--- | :--- |
| **Object Storage** | `apps/core/application/ports/object_storage.py` (`IObjectStorage`) | `apps/core/infrastructure/storage/django_s3_storage_adapter.py` (`DjangoS3StorageAdapter`) | `boto3`, bucket names (`cineflow-media`), S3 keys, `ClientError`, endpoint URLs, bucket policies. |
| **Key-Value Cache** | `apps/core/application/ports/cache.py` (`ICacheService`) | `apps/core/infrastructure/cache/django_cache_adapter.py` (`DjangoCacheAdapter`) | Direct `django.core.cache.cache` calls, TTL management, decoupled from broker/pubsub. |
| **Event Publisher** | `apps/core/application/ports/event_publisher.py` (`IEventPublisher`) | `apps/core/infrastructure/events/channels_event_publisher.py` (`ChannelsEventPublisher`) | `channels.layers.get_channel_layer()`, `async_to_sync`, group naming, payload envelopes. |
| **Vector Search** | `apps/core/application/ports/vector_search.py` (`IVectorSearch`) | `apps/core/infrastructure/vector/qdrant_vector_adapter.py` (`QdrantVectorAdapter`) | `QdrantClient`, collection name (`studio_documents`), vector dimension (`1024`), distance (`COSINE`), `OllamaEmbeddings`, PyMuPDF text extraction, LangChain text splitters. |
| **LLM Provider** | `apps/core/application/ports/llm_provider.py` (`ILLMProvider`) | `apps/core/infrastructure/llm/ollama_provider.py` (`OllamaLLMProvider`) | `langchain_ollama.ChatOllama`, model names (`qwen3.5:9b`, `Qwen3-VL-8B`), temperature, structured output binding, vision message formatting. |
| **PDF Rendering** | `apps/logistics/application/ports.py` (`ICallSheetPdfRenderer`) | `apps/logistics/infrastructure/pdf/reportlab_call_sheet_renderer.py` (`ReportLabCallSheetRenderer`) | ReportLab canvas, Platypus flowables, table styles, fonts, PDF binary streaming. |

### Decoupled Components & Use Cases
- **`apps/core/ai/application/use_cases.py`**: Completely eliminated `boto3`, `ClientError`, raw bucket policies, and direct `cache` imports. Uses `IObjectStorage` and `ICacheService`.
- **`apps/core/agent_tools.py`**: Removed direct `qdrant_client`, `langchain_qdrant`, and `langchain_ollama` imports. Delegated search and vision to `QdrantVectorAdapter` and `OllamaLLMProvider`.
- **`apps/breakdown/ai_copilot.py`**: Removed direct `ChatOllama` dependency; structured extraction delegates to `OllamaLLMProvider`.
- **`apps/core/application/use_cases/ingest_document.py`**: Injected `IVectorSearch` port.
- **`apps/logistics/application/call_sheet_use_case.py`**: Injected `IObjectStorage`, `ICallSheetPdfRenderer`, and `IEventPublisher`.
- **`apps/logistics/application/finalize_dpr_use_case.py`**: Injected `IEventPublisher`.
- **`apps/narrative/application/use_cases/batch_script_breakdown.py`**: Injected `ICacheService` and `IEventPublisher`.
- **`apps/core/media/infrastructure/django_media_repository.py`**: Delegated file storage to `DjangoS3StorageAdapter`.

### Testing & In-Memory Fakes
- In-memory fake ports (`FakeObjectStorage`, `FakeVectorSearch`, `FakeMemoryCache`, `FakePublisher`, `FakePdfRenderer`) allow testing application use cases with zero external database, MinIO, Qdrant, or Redis dependencies.
- **Total Backend Tests:** 57 passing (0 failures, 0 errors).
  - Core: 13/13 passing
  - Logistics: 12/12 passing
  - Narrative: 23/23 passing
  - Breakdown: 6/6 passing
  - Financials: 2/2 passing
  - Shots: 1/1 passing

---

## 4. Frontend Architectural Refactoring (Next.js & React Query)

### Conceptual Flow Implemented
```
components (UI & presentation)
    ↓
feature hooks (@/hooks)
    ↓
React Query (@tanstack/react-query)
    ↓
API clients (@/lib/api/*)
    ↓
HTTP Transport (@/lib/api/client)
```

### 1. Transport & API Layer Decoupling
- **Shared Transport Client (`frontend/src/lib/api/client.ts`):** Single source of truth for `apiFetch` and `apiUpload` with uniform headers, error normalization, and credential handling. Zero duplicate HTTP logic.
- **Bounded-Context Feature Clients (`frontend/src/lib/api/`):**
  - `studioApi` (`studio.ts`): Project creation, workspace listing, background job telemetry.
  - `narrativeApi` (`narrative.ts`): Acts, sequences, scene tree hierarchy, script import, and reordering.
  - `shotsApi` (`shots.ts`): Setups, shots, takes, coverage trees, circle takes, and VFX shots.
  - `breakdownApi` (`breakdown.ts`): Master locations, characters, props, costume looks, continuity photos, and AI copilot.
  - `productionApi` (`production.ts`): Shoot days, stripboard reordering, unassigned scene strips, banner strips, DOOD matrix, DPR wrap reports, call sheet generation.
  - `budgetingApi` (`budgeting.ts`): Accounts top sheet, line items, and financial summary.
  - `mediaApi` (`media.ts`): Generic asset uploads and attachments.
  - `aiApi` (`ai.ts`): Chat copilot, multimodal vision uploads, pending breakdown approvals.
- **Backward Compatibility Facade (`frontend/src/lib/api.ts`):** Re-exports all centralized types and clients to preserve legacy imports seamlessly.

### 2. Centralized Domain Types Layer (`frontend/src/lib/types/`)
- Consolidated conflicting, duplicate, or loose backend/frontend representations into strong TypeScript interfaces:
  - `common.ts`: `MediaAsset`, `ApiResponse`
  - `studio.ts`: `Project`, `BackgroundJob`, `ProjectMembership`
  - `narrative.ts`: `ProjectTree`, `ActDetail`, `SequenceDetail`, `SceneDetail`, `SceneTreeNode`, `ScriptBlock`
  - `shots.ts`: `CameraSetup`, `Shot`, `Take`, `SceneCoverage`, `VfxShotOut`, `VfxShotIn`
  - `breakdown.ts`: `MasterLocationDetail`, `CharacterDetail`, `PropDetail`, `CostumeLookCatalogItem`, `SceneBreakdownItem`, `BreakdownSummary`, `CatalogsResponse`, `ContinuityPhoto`
  - `production.ts`: `ProductionUnit`, `StripboardItemDetail`, `ShootDayDetail`, `UnassignedScene`, `ScheduleData`, `DoodData`, `CharacterDood`, `DPROut`, `DPRIn`
  - `budgeting.ts`: `BudgetSummary`, `BudgetAccountOut`, `BudgetAccountIn`, `LineItemOut`, `LineItemIn`
  - `ai.ts`: `ChatMessage`, `PendingBreakdown`, `AssetFile`

### 3. Server State vs. Client/UI State Separation
- **React Query (`frontend/src/hooks/`):** Exclusively owns all server data, query caches, mutation invalidation, and refetching:
  - `useStudio.ts`: `useProjects`, `useCreateProject`, `useBackgroundJobs`
  - `useNarrative.ts`: `useProjectTree`, `useActDetail`, `useSequenceDetail`, `useSceneDetail`, `useCreateScene`, `useUpdateScene`, `useReorderScene`
  - `useShots.ts`: `useSceneCoverage`, `useCreateSetup`, `useCreateShot`, `useDeleteShot`, `useCreateTake`, `useToggleCircleTake`, `useVfxShots`
  - `useBreakdown.ts`: `useCatalogs`, `useBreakdownSummary`, `useSceneBreakdownItems`, `useContinuityPhotos`, `useAddBreakdownItem`, `useDeleteBreakdownItem`
  - `useProduction.ts`: `useSchedule`, `useDoodMatrix`, `useDPR`, `useCreateShootDay`, `useReorderStrip`, `useScheduleSceneStrip`, `useAddBannerStrip`, `useDeleteStrip`
  - `useBudgeting.ts`: `useBudgetSummary`, `useCreateBudgetAccount`, `useLineItems`, `useCreateLineItem`
  - `useMedia.ts`: `useMediaAssets`, `useUploadMedia`
  - `useAi.ts`: `usePendingBreakdown`, `useApproveBreakdown`, `useSendChatMessage`
- **Zustand (`frontend/src/stores/useProjectStore.ts`):** Strictly reserved for volatile, local client/UI interaction state:
  - Drawer collapse (`sidebarCollapsed`, `rightDrawerCollapsed`, `toggleRightDrawer`)
  - Drawer tab selection (`rightDrawerTab: 'shots' | 'breakdown' | 'logistics'`)
  - Active selection pointers (`selectedSceneId`, `activeShotId`)
  - Search & filter preferences (`searchQuery`, `filterIntExt`)

### 4. Decomposition of Large "God Components"
- **`ShotsSetupsDrawer.tsx` (formerly 724 LOC):**
  - Extracted `CameraSetupCard.tsx`: Dedicated setup card and header presentation.
  - Extracted `ShotRowItem.tsx`: Cohesive shot row with take history tray and circle take toggle.
  - Extracted `AddShotModal.tsx`: Isolated modal form for focal length, framing, lens movement, and script block coverage.
  - Extracted `TakeLoggerModal.tsx`: Slate recording modal for roll numbers, card IDs, and timecodes.
  - Integrated `useCreateSetup`, `useCreateShot`, `useDeleteShot`, `useCreateTake`, `useToggleCircleTake`.
- **`StripboardView.tsx` (formerly 604 LOC):**
  - Extracted `ShootDayCard.tsx`: Hollywood call sheet day header, production math, and sortable strip list.
  - Extracted `SortableStripItem.tsx`: Drag-and-drop banner strips (Lunch, Move) and color-coded scene strips.
  - Extracted `UnassignedScenesPool.tsx`: Collapsible unscheduled pool tray with shoot-day assignment.
  - Integrated `useReorderStrip`, `useDeleteStrip`, `useScheduleSceneStrip`.
- **`DepartmentBreakdownDrawer.tsx`:**
  - Migrated to `useCatalogs`, `useSceneDetail`, `useSequenceDetail`, `useAddBreakdownItem`, `useDeleteBreakdownItem`.
- **`VFXPipelineBoard.tsx`:**
  - Replaced inline raw `fetch()` calls with `useVfxShots` and React Query mutation hooks.

### 5. Verification & Health
- **TypeScript Compiler Check (`npx tsc --noEmit`):** 0 errors across entire frontend.
- **Backend Tests:** 57/57 passing.
- **UX & Visual Integrity:** 100% preserved (all styles, transitions, modals, call sheets, and keyboard interactions intact).



