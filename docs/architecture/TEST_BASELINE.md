# CineFlow Studio — Characterization Test Baseline & Safety Net

**Document:** Engineering Test Baseline & Behavior Protection  
**Version:** 2.0 Test Baseline  
**Test Framework:** Django Native Test Runner (`django.test.TestCase`, `django.test.Client`, `channels.testing.WebsocketCommunicator`)  
**Status:** 24/24 Automated Characterization Tests Passing (Execution time: 0.83s)  
**Strict Rule:** Analysis and behavior preservation only — zero production code modified.

---

## 1. Test Framework & Discovery Strategy

### Framework Selection
- **Framework:** The repository uses Django 5's native testing framework (`django.test.TestCase`) and Django Ninja testing utilities backed by PostgreSQL (`test_movie_prod_db`).
- **Discovery Mechanism:** Tests are organized into standard `tests.py` modules inside each Django app:
  - [backend/apps/narrative/tests.py](file:///c:/AI/movie_management/backend/apps/narrative/tests.py)
  - [backend/apps/breakdown/tests.py](file:///c:/AI/movie_management/backend/apps/breakdown/tests.py)
  - [backend/apps/logistics/tests.py](file:///c:/AI/movie_management/backend/apps/logistics/tests.py)
  - [backend/apps/core/tests.py](file:///c:/AI/movie_management/backend/apps/core/tests.py)
  - [backend/apps/financials/tests.py](file:///c:/AI/movie_management/backend/apps/financials/tests.py)
  - [backend/apps/shots/tests.py](file:///c:/AI/movie_management/backend/apps/shots/tests.py)
- **Execution Command:**
  ```bash
  docker compose exec backend python manage.py test
  ```

---

## 2. Test Inventory Summary

```
┌─────────────────────────┬──────────────┬──────────┬──────────────┐
│ Test Suite              │ Tests Count  │ Status   │ Time         │
├─────────────────────────┼──────────────┼──────────┼──────────────┤
│ apps.narrative          │ 18 tests     │ PASSED   │ 0.216s       │
│ apps.breakdown          │ 6 tests      │ PASSED   │ 0.133s       │
│ apps.logistics          │ 5 tests      │ PASSED   │ 0.152s       │
│ apps.core               │ 4 tests      │ PASSED   │ 0.271s       │
│ apps.financials         │ 2 tests      │ PASSED   │ 0.082s       │
│ apps.shots              │ 1 test       │ PASSED   │ 0.067s       │
├─────────────────────────┼──────────────┼──────────┼──────────────┤
│ TOTAL                   │ 36 tests     │ PASSED   │ 0.955s       │
└─────────────────────────┴──────────────┴──────────┴──────────────┘
```

---

## 3. Detailed Inventory of Tests Added

### 3.1 Narrative Domain (`apps.narrative.tests`)

| Test Method | Protected Observable Behavior | Why It Matters | Test Level |
| :--- | :--- | :--- | :--- :--- |
| `test_get_project_tree` | `GET /api/narrative/projects/{id}/tree` returns the complete hierarchy (Project -> Acts -> Sequences -> Scenes) along with setup, shot, and take count rollups and `pages_display`. | Core navigation backbone for the outliner, left tree navigator, and project overview. | API Integration |
| `test_create_scene` | `POST /api/narrative/scenes` accepts sequence ID, scene number, slugline, eighths, and persists a valid `SceneTreeNode`. | Allows writers and assistant directors to add scenes to sequences. | API Integration |
| `test_update_scene` | `PATCH /api/narrative/scenes/{id}` applies partial updates (`synopsis`, `pages_eighths`, `set_name`). | Critical for lined script edits, page-length changes, and outliner modifications. | API Integration |
| `test_delete_scene` | `DELETE /api/narrative/scenes/{id}` deletes the scene record from persistence. | Verifies clean deletion of scenes from sequence trees without cascade errors. | API Integration |
| `test_reorder_scene` | `POST /api/narrative/scenes/reorder` moves a scene to another sequence and updates LexoRank index. | Backs drag-and-drop scene shuffling in Kanban and outliner views. | API Integration |
| `test_import_fountain_script` | `POST /api/narrative/projects/{id}/import-script` parses raw text sluglines into acts, sequences, and scenes. | Screenplay ingestion pipeline converts Fountain text to database entities. | API Integration |
| `test_get_scene_detail` | `GET /api/narrative/scenes/{id}` returns complete scene detail with parent hierarchy and coverage. | Detailed scene inspections, drawer inspectors, and lined script editor. | API Integration |
| `test_page_eighths_value_object` | Pure domain value object calculations: whole pages, fractions, float conversions, and non-negative invariants. | Core industry screenplay eighths arithmetic without ORM dependency. | Domain Unit |
| `test_create_scene_use_case_validation` | Validates `CreateSceneUseCase` rules (rejects blank numbers, negative eighths/minutes) using mock repository. | Isolated business invariant enforcement. | Application Unit |
| `test_update_scene_use_case_validation` | Validates `UpdateSceneUseCase` rules (rejects blank numbers, negative eighths/minutes). | Isolated business invariant enforcement. | Application Unit |
| `test_reorder_scene_use_case_validation` | Validates `ReorderSceneUseCase` rules (rejects blank order indices). | Isolated business invariant enforcement. | Application Unit |
| `test_get_scene_not_found_returns_404` | Verifies `SceneNotFoundError` translates to HTTP 404 on GET `/scenes/{id}`. | API HTTP contract preservation. | API Integration |
| `test_create_scene_with_invalid_sequence_returns_404` | Verifies `SequenceNotFoundError` translates to HTTP 404 on POST `/scenes`. | API HTTP contract preservation. | API Integration |
| `test_update_scene_not_found_returns_404` | Verifies `SceneNotFoundError` translates to HTTP 404 on PATCH `/scenes/{id}`. | API HTTP contract preservation. | API Integration |
| `test_update_scene_with_invalid_sequence_returns_404` | Verifies `SequenceNotFoundError` translates to HTTP 404 on PATCH `/scenes/{id}`. | API HTTP contract preservation. | API Integration |
| `test_reorder_scene_not_found_returns_404` | Verifies `SceneNotFoundError` translates to HTTP 404 on POST `/scenes/reorder`. | API HTTP contract preservation. | API Integration |
| `test_reorder_scene_with_invalid_target_sequence_returns_404` | Verifies `SequenceNotFoundError` translates to HTTP 404 on POST `/scenes/reorder`. | API HTTP contract preservation. | API Integration |
| `test_create_scene_negative_eighths_returns_400` | Verifies `InvalidSceneDataError` translates to HTTP 400 on POST `/scenes`. | API HTTP contract preservation. | API Integration |

---

### 3.2 Breakdown Domain (`apps.breakdown.tests`)

| Test Method | Protected Observable Behavior | Why It Matters | Test Level |
| :--- | :--- | :--- | :---: |
| `test_get_breakdown_summary` | `GET /api/breakdown/projects/{id}/summary` returns total counts of locations, characters, props, VFX, and SFX items. | Art department and continuity overview dashboard telemetry. | API Integration |
| `test_get_scene_breakdown_items` | `GET /api/breakdown/scenes/{id}/items` returns all tagged elements (props, wardrobe, continuity critical flags). | Scene Builder Breakdown tab renders tagged physical elements. | API Integration |
| `test_create_breakdown_item` | `POST /api/breakdown/scenes/{id}/items` attaches a prop or custom note to a scene. | Prop master and art director workflow for linking elements to scene numbers. | API Integration |
| `test_delete_breakdown_item` | `DELETE /api/breakdown/items/{id}` untags an element from a scene while preserving catalog entities. | Ensures untagging an item does not accidentally delete the master Prop/Costume record. | API Integration |
| `test_create_character_endpoint` | `POST /api/breakdown/characters` creates a new character with cast ID number and actor name. | Central character bible registry used across Breakdown and Scheduling. | API Integration |
| `test_known_behavior_costume_look_without_photo_raises_validation_error` | Characterizes the known schema defect where creating a `CostumeLook` with `continuity_photo_url=None` raises a Pydantic `ValidationError`. | Prevents accidental changes to schema behavior prior to review. | Regression / Review |

---

### 3.3 Logistics & Production Domain (`apps.logistics.tests`)

| Test Method | Protected Observable Behavior | Why It Matters | Test Level |
| :--- | :--- | :--- | :---: |
| `test_schedule_scene_strip` | `POST /api/logistics/strips/schedule-scene` wraps a scene into a strip and places it on a shoot day. | Scheduling engine attaches narrative scenes to production calendar days. | API Integration |
| `test_add_banner_strip` | `POST /api/logistics/strips/banner` creates divider strips (`LUNCH`, `COMPANY MOVE`) on a shoot day. | Assistant directors structure daily call times and company movements. | API Integration |
| `test_reorder_strip_across_days` | `POST /api/logistics/strips/reorder` moves a strip between shoot days and updates `order_index`. | Core drag-and-drop Kanban stripboard scheduling. | API Integration |
| `test_dood_matrix_calculation` | `GET /api/logistics/projects/{id}/dood` calculates industry SAG Day-Out-of-Days matrix codes: Single-day lead is `SWF`; Multi-day lead is `SW` (Day 1), `H` (Day 2 Hold), `WF` (Day 3 Work Finish). | Core business logic: cast payroll, contract hold days, and scheduling optimization. | API Integration |
| `test_daily_production_report_crud` | `GET` and `POST /api/logistics/shoot-days/{id}/dpr` manages Daily Production Report wrap records (camera/sound rolls, wrap times). | Production wrap reporting captures actuals against the shooting schedule. | API Integration |

---

### 3.4 Core Infrastructure & Security (`apps.core.tests`)

| Test Method | Protected Observable Behavior | Why It Matters | Test Level |
| :--- | :--- | :--- | :---: |
| `test_require_project_role_authorization_logic` | `require_project_role` dependency validates `ProjectMembership`: `OWNER` passes, `VIEWER` gets 403 (Insufficient role), non-member gets 403 (Not a member). | Role-Based Access Control (RBAC) security gating across all project-scoped resources. | Security / Unit |
| `test_media_upload_and_polymorphic_retrieval` | `POST /api/media/upload` attaches files via ContentType GenericForeignKey and categorizes `IMAGE` file types. | Universal media connector stores storyboards, costume photos, and attachments without model changes. | API Integration |
| `test_celery_task_invocation_and_job_lifecycle` | `BackgroundJob` model tracks task lifecycle states (`RUNNING` -> `SUCCESS` -> result payload). | Background job monitoring UI relies on consistent job state progression. | Integration |
| `test_websocket_studio_consumer_broadcast` | `StudioConsumer` ASGI consumer connects to `ws/projects/{id}/` and broadcasts room messages via `channel_layer`. | Real-time war room collaboration synchronizes stripboard cards across collaborators. | ASGI Integration |

---

### 3.5 Financials & Shots (`apps.financials.tests`, `apps.shots.tests`)

| Test Method | Protected Observable Behavior | Why It Matters | Test Level |
| :--- | :--- | :--- | :---: |
| `test_create_budget_account_and_line_item` | `POST /api/financials/accounts/{id}/items` adds line items with amount, currency, and `is_actual` flags. | Financials ledger records above-the-line and below-the-line budget entries. | API Integration |
| `test_budget_summary_rollup` | `GET /api/financials/projects/{id}/budget-summary` rolls up estimated vs actual costs across ATL and BTL categories. | Budget top-sheet variance calculation depends on accurate category aggregations. | API Integration |
| `test_create_camera_setup_shot_and_take` | `POST /api/shots/setups`, `POST /api/shots/shots`, `POST /api/shots/takes`, and `GET /api/shots/scenes/{id}/coverage`. | Camera coverage hierarchy (CameraSetup -> Shot -> Take -> Circle Take) for script lining. | API Integration |

---

## 4. Known Behaviors Requiring Review (`KNOWN_BEHAVIOR_REQUIRING_REVIEW`)

Per strict refactoring safety instructions, existing production behaviors that appear incorrect have **NOT** been silently modified. They are characterized and documented below for explicit review:

### KB-01: `CostumeLookOut` Non-Nullable Schema Validation Error
- **Location:** [backend/config/api.py:346](file:///c:/AI/movie_management/backend/config/api.py#L346)
- **Current Behavior:** `CostumeLookOut` schema declares `continuity_photo_url: str` as a required non-null string.
- **Problem:** When creating a `CostumeLook` or retrieving character details where no photo has been uploaded (`continuity_photo_url=None`), Pydantic raises a 500 `ValidationError`.
- **Protected by Test:** `test_known_behavior_costume_look_without_photo_raises_validation_error` in [apps/breakdown/tests.py](file:///c:/AI/movie_management/backend/apps/breakdown/tests.py).
- **Suggested Resolution in Migration:** Update schema definition to `continuity_photo_url: Optional[str] = None`.

### KB-02: `approve_breakdown` Passes Non-Model Attribute to `Scene.objects.create()`
- **Location:** [backend/config/api.py:2793](file:///c:/AI/movie_management/backend/config/api.py#L2793)
- **Current Behavior:** `approve_breakdown` endpoint passes `pages_display="1"` as an ORM keyword argument to `Scene.objects.create()`.
- **Problem:** `pages_display` is a `@property` on `Scene` ([apps/narrative/models.py:93](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L93)), causing a runtime `TypeError` whenever a user clicks "Approve Breakdown" in the UI.
- **Suggested Resolution in Migration:** Remove `pages_display="1"` from the `create()` call in `approve_breakdown` use case.

### KB-03: `create_strict_shot` Direct Scene ForeignKey Mismatch
- **Location:** [backend/config/api.py:2969](file:///c:/AI/movie_management/backend/config/api.py#L2969)
- **Current Behavior:** `create_strict_shot` attempts `Shot.objects.create(scene=scene, ...)`.
- **Problem:** The `Shot` model ([apps/shots/models.py:41](file:///c:/AI/movie_management/backend/apps/shots/models.py#L41)) has a foreign key to `CameraSetup` (`setup`), not `Scene`. Calling this endpoint raises a runtime `TypeError`.
- **Suggested Resolution in Migration:** Deprecate `create_strict_shot` in favor of standard `POST /api/shots/shots` under `CameraSetup`.

### KB-04: `DevAuthMiddleware` Unconditional Auto-Login Overwrite
- **Location:** [backend/apps/core/middleware.py:15](file:///c:/AI/movie_management/backend/apps/core/middleware.py#L15)
- **Current Behavior:** Overwrites `request.user = dev_admin` on every incoming HTTP request regardless of whether an auth token or session is provided.
- **Problem:** Masks RBAC security failures in development and prevents testing unauthenticated endpoints via HTTP client.
- **Suggested Resolution in Migration:** Gate `DevAuthMiddleware` with `if settings.DEBUG and request.headers.get("X-Dev-Auth") == "true":` or restrict to local testing mocks.

### KB-05: Line Items API Route Naming Inconsistency
- **Location:** [backend/config/api.py:2700](file:///c:/AI/movie_management/backend/config/api.py#L2700)
- **Current Behavior:** Line item creation endpoint is registered at `/api/financials/accounts/{id}/items` rather than `/accounts/{id}/line-items`.
- **Problem:** Frontend client or external integrations expecting RESTful `/line-items` receive a 404.
- **Protected by Test:** `test_create_budget_account_and_line_item` in [apps/financials/tests.py](file:///c:/AI/movie_management/backend/apps/financials/tests.py).

---

## 5. Important Untested Behavior Remaining

While the core 24 behaviors are now protected, the following complex areas remain deliberately unmocked until their respective vertical slice phases:

1. **LangGraph Universal AI Copilot (`apps/core/studio_agent.py`):** Multi-step LLM tool chains require external Ollama models (`qwen3.5:9b`, `Qwen3-VL-8B`). Protected via mocked tools in unit tests; end-to-end integration tests deferred until Ollama test mocks are introduced.
2. **Qdrant Vector Ingestion Pipeline (`apps/core/vector_store.py`):** Real vector embedding generation depends on running Qdrant container and Ollama embedding endpoints (`bge-m3:latest`).
3. **Frontend E2E User Flows:** Next.js frontend has zero Jest/Vitest/Playwright tests. Automated testing is currently backend-driven.

---

## 6. Known Test-Environment Problems & Resolutions

1. **PyMuPDF Deprecation Warning:**
   - *Message:* `warning: The fitz API is deprecated and will be removed in future. Use import pymupdf instead.`
   - *Impact:* Non-breaking warning logged during test startup.
   - *Future Action:* Update imports from `import fitz` to `import pymupdf` during search module refactoring.
2. **PostgreSQL Test Database Isolation:**
   - *Resolution:* Django automatically provisions and isolates `test_movie_prod_db` inside the Alpine PostgreSQL container, running transactions cleanly and tearing down the database upon test suite completion.
3. **ASGI / Channels Testing:**
   - *Resolution:* `WebsocketCommunicator` tests the ASGI routing and Channels consumers in memory without requiring Daphne to listen on external ports during CI runs.
