# CineFlow Studio — Engineering Refactor Audit & Repository Archaeology

**Target Version:** CineFlow Studio 1.0 -> 2.0 Refactor Architecture  
**Audit Date:** October 2026  
**Auditor:** DeepMind Antigravity Architecture Team  
**Scope:** Repository-wide architecture inspection (Backend, Frontend, Infrastructure, Async, AI, Persistence)  
**Safety Constraint:** Analysis only — no code modifications performed.

---

## Executive Summary

CineFlow Studio is a film production management platform built on a "Dual-Tree" architecture linking a chronological Narrative Graph (Project -> Act -> Sequence -> Scene) with a logistical Production Graph (ProductionUnit -> ShootDay -> StripboardItem).

While the repository implements domain features (Day-Out-of-Days matrix, LexoRank ordering, lined script editors, WeasyPrint/ReportLab call sheet generation, and LangGraph-powered AI copilot tooling), it exhibits severe architectural friction:
1. **Monolithic API Hotspot:** [backend/config/api.py](file:///c:/AI/movie_management/backend/config/api.py) contains **2,989 lines** and over 105 KB of code, implementing almost all endpoints, schemas, database queries, S3 client setup, Redis cache access, and raw SQL execution.
2. **Zero Test Coverage:** Across the entire repository, there are **0 test files** and **0 unit/integration tests**.
3. **Broken Runtime Paths:** Critical business flows (e.g. Script Breakdown approval, Shot creation, and AI Copilot entity extraction) contain fatal bugs (calling `@property` attributes as ORM kwargs, missing model fields, and schema definition overwrites).
4. **Frontend Contract Drift:** The frontend TypeScript suite fails with **30 compilation errors** in [frontend/src/](file:///c:/AI/movie_management/frontend/src/), driven by mismatched API client signatures and hallucinated model attributes.
5. **Architectural Divergence:** Key documented capabilities (such as LexoRank fractional indexing and real-time WebSocket state broadcasting on HTTP mutations) are either bypassed or completely missing in the actual code.

---

## 1. Current Architecture & Actual Dependency Flow

### 1.1 High-Level Component Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Frontend                             │
│  (React 18, TanStack Query, Zustand, dnd-kit, Tailwind CSS)            │
└──────────────────┬─────────────────────────────▲───────────────────────┘
                   │ HTTP REST (JSON)            │ WebSockets (ASGI)
                   ▼                             │
┌────────────────────────────────────────────────┴───────────────────────┐
│                     Django 5 / Daphne ASGI Server                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ backend/config/api.py (Monolithic Ninja Router: 2,989 lines)     │  │
│  │   - Direct ORM queries & transactions                            │  │
│  │   - Inline DOOD calculation & statistics aggregation             │  │
│  │   - Raw Boto3 S3 bucket configuration & object uploads           │  │
│  │   - Direct Redis cache read/write (pending breakdowns)           │  │
│  │   - Celery task triggering (.delay())                            │  │
│  └──────┬──────────────┬───────────────┬────────────────┬───────────┘  │
│         │              │               │                │              │
│         ▼              ▼               ▼                ▼              │
│    PostgreSQL 16    Redis 7         MinIO S3       Celery Worker       │
│    (Django ORM)   (Cache/Broker)  (studio-media)  (PDFs & AI Tasks)    │
│                        │                                │              │
│                        └────────► Channels Layer ◄──────┘              │
│                                        │                               │
│  ┌─────────────────────────────────────┴────────────────────────────┐  │
│  │ Ollama (qwen3.5:9b, bge-m3) & Qdrant (studio_documents)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Actual vs Documented Dependency Flow

| Dimension | Documented Architecture ([ARCHITECTURE.md](file:///c:/AI/movie_management/ARCHITECTURE.md)) | Actual Implementation in Code |
| :--- | :--- | :--- |
| **Layering** | Layered Clean Architecture (API -> App -> Domain -> Adapters) | **Zero layering:** All presentation, domain logic, and infrastructure adapters are collapsed into [backend/config/api.py](file:///c:/AI/movie_management/backend/config/api.py). |
| **Realtime** | "Backend views fire events into Redis channels (`project_{project_id}`) on PATCH" | **No backend view broadcasts:** [backend/config/api.py](file:///c:/AI/movie_management/backend/config/api.py) has 0 calls to `group_send`. Only background Celery tasks broadcast to a global `"studio_notifications"` room. |
| **Ordering** | "O(1) LexoRank fractional indexing (e.g. assigning `bm` between `b` and `c`)" | Frontend [StripboardView.tsx:313](file:///c:/AI/movie_management/frontend/src/components/schedule/StripboardView.tsx#L313) hardcodes integer strings: `new_order_index: `${(newIndex + 1) * 10}``. [lexorank.ts](file:///c:/AI/movie_management/frontend/src/lib/lexorank.ts) is never called. |
| **Authorization** | "Ninja uses injected dependencies (`require_project_role`) to verify access dynamically" | Only 1 route uses auth checks. Global routes `/studio/projects`, `/logistics/schedule`, `/narrative/scenes/{id}` have **no authorization dependency**, and [DevAuthMiddleware](file:///c:/AI/movie_management/backend/apps/core/middleware.py#L5) auto-authenticates all requests as `dev_admin`. |
| **Storage** | Abstracted media uploads via `django-storages` | Inline raw `boto3.client('s3')` creation in views ([api.py:2840](file:///c:/AI/movie_management/backend/config/api.py#L2840)), hardcoded credentials, and broad public bucket policies pushed on HTTP GET requests. |

---

## 2. Bounded-Context Candidates

The domain concepts should be organized into coherent bounded contexts with explicit interfaces. Not all bounded contexts require separate Django apps; some should be cohesive domain modules within existing apps to prevent premature over-fragmentation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STUDIO PLATFORM BOUNDARY                        │
│                                                                        │
│   ┌─────────────────────┐                    ┌─────────────────────┐   │
│   │  Studio & Projects  │◄───────────────────┤ Identity & Access   │   │
│   │  (narrative.Project)│                    │ (core.User/Member)  │   │
│   └──────────▲──────────┘                    └─────────────────────┘   │
│              │                                                         │
│   ┌──────────┴──────────┐   Bridge Entity    ┌─────────────────────┐   │
│   │ Narrative Structure │───────────────────►│ Production Logistics│   │
│   │ (Act, Sequence)     │      [SCENE]       │ (Unit, ShootDay,    │   │
│   └──────────┬──────────┘        ▲   ▲       │  Stripboard, DOOD)  │   │
│              │                   │   │       └─────────────────────┘   │
│   ┌──────────▼──────────┐        │   │       ┌─────────────────────┐   │
│   │ Screenplay Engine   │────────┘   │       │ Shots & Coverage    │   │
│   │ (Parsing, Blocks,   │            └───────┤ (CameraSetup, Shot, │   │
│   │  Lined Coverage)    │                    │  Take, VFX Shot)    │   │
│   └─────────────────────┘                    └─────────────────────┘   │
│              │                                                         │
│   ┌──────────▼──────────┐                    ┌─────────────────────┐   │
│   │ Breakdown Catalogs  │                    │ Budget & Financials │   │
│   │ (Chars, Props, Locs,│                    │ (BudgetAccount,     │   │
│   │  Costume Looks)     │                    │  LineItem, Variance)│   │
│   └─────────────────────┘                    └─────────────────────┘   │
│                                                                        │
│  INFRASTRUCTURE SERVICES: Media (S3), AI Copilot, Search/RAG, Notify  │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Context Boundaries

| Candidate Context | Current Location | Recommended Target | Responsibilities & Extraction Guidance |
| :--- | :--- | :--- | :--- |
| **1. Studio & Projects** | [apps/narrative/models.py](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L14) (`Project`) | `apps.core` or `apps.projects` | Project root tenant, metadata, slug generation, project status lifecycle, telemetry aggregation. **Note:** `Project` is currently misplaced in `narrative`. |
| **2. Identity & Access** | [apps/core/models.py](file:///c:/AI/movie_management/backend/apps/core/models.py#L8), [security.py](file:///c:/AI/movie_management/backend/config/security.py) | `apps.core.auth` | User account, ProjectMembership, RBAC role permissions (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`), session/token validation. Remove auto-login middleware in production. |
| **3. Narrative** | [apps/narrative/models.py](file:///c:/AI/movie_management/backend/apps/narrative/models.py) | `apps.narrative` | Macro story structure: Acts, Sequences, dramatic milestones, target runtimes, pacing statistics. |
| **4. Screenplay** | Inline in [narrative/services.py](file:///c:/AI/movie_management/backend/apps/narrative/services.py) & `Scene.script_data` | `apps.screenplay` (Domain module) | Script import (Fountain/FDX), screenplay text blocks, slugline parsing, page-eighth calculations, lined script track annotations. *Keep separable from Narrative.* |
| **5. Breakdown** | [apps/breakdown/models.py](file:///c:/AI/movie_management/backend/apps/breakdown/models.py) | `apps.breakdown` | Element tagging, Master Locations, Character bible, Costume Looks, Props catalog, continuity notes. Must decouple circular foreign keys to `Scene`. |
| **6. Production & Logistics**| [apps/logistics/models.py](file:///c:/AI/movie_management/backend/apps/logistics/models.py) | `apps.logistics` | Production Units, Shoot Days, Stripboard ordering, Day-Out-of-Days (DOOD) calculation, Daily Production Reports (DPR), Crew roster. |
| **7. Shots & Coverage** | [apps/shots/models.py](file:///c:/AI/movie_management/backend/apps/shots/models.py) | `apps.shots` | Camera Setups, Shot lists, Takes, circle takes, camera movement, slate/lens logs, VFX shots tracking. |
| **8. Budgeting** | [apps/financials/models.py](file:///c:/AI/movie_management/backend/apps/financials/models.py) | `apps.financials` | Chart of accounts (ATL, BTL Production, BTL Post, Other), line items, estimated vs. actual variance calculations. |
| **9. Media Assets** | [apps/core/models.py](file:///c:/AI/movie_management/backend/apps/core/models.py#L68) (`MediaAsset`) | `apps.media` (Infrastructure adapter) | Polymorphic asset storage via ContentType, MinIO/S3 bucket handling, presigned URLs, MIME-type classification. |
| **10. AI Copilot** | [apps/core/studio_agent.py](file:///c:/AI/movie_management/backend/apps/core/studio_agent.py), [apps/breakdown/ai_copilot.py](file:///c:/AI/movie_management/backend/apps/breakdown/ai_copilot.py) | `apps.ai` (Application service) | LangGraph state workflows, LLM prompt templates, tool node bindings, script entity extraction. Must not run raw arbitrary SQL. |
| **11. Search & Vector** | [apps/core/vector_store.py](file:///c:/AI/movie_management/backend/apps/core/vector_store.py) | `apps.search` (Infrastructure adapter) | Qdrant client connection, embedding generation, text chunking, document ingestion. |
| **12. Realtime & Notifications**| [apps/core/consumers.py](file:///c:/AI/movie_management/backend/apps/core/consumers.py) | `apps.notifications` | WebSocket connection handling, room authentication, channel layer pub/sub message formatting, toast dispatching. |

---

## 3. God Modules & Architectural Hotspots

### 3.1 `backend/config/api.py`
- **Path:** [backend/config/api.py](file:///c:/AI/movie_management/backend/config/api.py)
- **Size / Responsibilities:** **2,989 lines**, ~106 KB. Contains **45+ endpoints**, **60+ Pydantic schemas**, 8 router declarations, raw S3 management, raw SQL execution, Redis cache access, WeasyPrint/ReportLab dispatches, and inline business logic.
- **Callers:** Entire Next.js frontend via [frontend/src/lib/api.ts](file:///c:/AI/movie_management/frontend/src/lib/api.ts).
- **Dependencies:** Directly imports models and utilities from all 6 Django apps (`apps.narrative`, `apps.breakdown`, `apps.shots`, `apps.logistics`, `apps.financials`, `apps.core`), plus `boto3`, `django.core.cache`, `django.core.files.storage`, and `channels`.
- **Why Problematic:**
  - Violates SRP entirely; a change to any subsystem requires editing this file.
  - Contains duplicate schema declarations (`CameraSetupIn` defined at line 265 and overwritten at line 1313 with conflicting fields).
  - Contains catastrophic N+1 queries (e.g. `get_project_tree` at lines 760–829 executes 4 SQL COUNT queries per scene in nested Python loops).
  - Exposes unauthenticated endpoints that leak project data.
- **Suggested Extraction Boundary:** Deconstruct into app-level API router modules (`apps/narrative/api.py`, `apps/logistics/api.py`, etc.) registered onto the central `NinjaAPI` instance via `api.add_router()`. Move business calculations to application services.

### 3.2 `frontend/src/lib/api.ts`
- **Path:** [frontend/src/lib/api.ts](file:///c:/AI/movie_management/frontend/src/lib/api.ts)
- **Size / Responsibilities:** **926 lines**, 28.8 KB. Contains 570 lines of TypeScript type definitions and a monolithic `api` object with 80+ methods.
- **Callers:** Every React component and page in [frontend/src/](file:///c:/AI/movie_management/frontend/src/).
- **Dependencies:** Global `fetch` API, `process.env.NEXT_PUBLIC_API_URL`.
- **Why Problematic:**
  - Tight coupling hub for the entire frontend; modifying an endpoint signature breaks components across all routes.
  - Signature drift: Component calls pass wrong argument counts (e.g. [ShotsSetupsDrawer.tsx:90](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx#L90) calls `api.createShot` with 1 argument, while [api.ts:662](file:///c:/AI/movie_management/frontend/src/lib/api.ts#L662) requires 4 arguments).
  - Missing methods referenced by components (`createSetup`, `deleteShot`, `getSceneCoverage`).
- **Suggested Extraction Boundary:** Split into modular feature clients: `lib/api/narrative.ts`, `lib/api/logistics.ts`, `lib/api/breakdown.ts`, `lib/api/shots.ts`, and `lib/types/`.

### 3.3 `backend/apps/core/agent_tools.py`
- **Path:** [backend/apps/core/agent_tools.py](file:///c:/AI/movie_management/backend/apps/core/agent_tools.py)
- **Size / Responsibilities:** **265 lines**, 10.3 KB. 9 tools bound to LangGraph Universal Studio Agent.
- **Callers:** [apps/core/studio_agent.py](file:///c:/AI/movie_management/backend/apps/core/studio_agent.py).
- **Dependencies:** `django.db.connection`, `qdrant_client`, `langchain_ollama`, `boto3`, `apps.narrative.tasks`, `apps.logistics.tasks`.
- **Why Problematic:**
  - Tool `execute_read_only_sql` (lines 56–87) uses a trivial keyword blocklist (`['INSERT', 'UPDATE', 'DELETE', ...]`) on uppercase text. It is vulnerable to SQL execution through lower-case commands, subqueries, and table cross-reads across projects.
  - Model embedding mismatch: Line 96 uses `bge-m3:latest` (1024 dims), while line 243 uses `bge-base-en-v1.5-gguf` (768 dims). Triggering this deletes or corrupts Qdrant collections.
  - Buggy ORM access: Line 176 accesses `item.costume_look.description`, but `SceneBreakdownItem` has field `costume`, crashing with `AttributeError`.
- **Suggested Extraction Boundary:** Encapsulate database reads inside typed read-only domain queries with mandatory `project_id` tenant filters; eliminate raw SQL tool access.

### 3.4 `frontend/src/components/studio/ShotsSetupsDrawer.tsx`
- **Path:** [frontend/src/components/studio/ShotsSetupsDrawer.tsx](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx)
- **Size / Responsibilities:** **724 lines**, 31.6 KB. Monolithic UI managing Camera Setups, Shot creation, Take logging, Circle take toggling, Storyboard previews, and script block associations.
- **Callers:** [frontend/src/app/projects/[projectId]/scenes/[sceneId]/page.tsx](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/scenes/%5BsceneId%5D/page.tsx).
- **Why Problematic:**
  - 18 separate local state variables (`useState`).
  - Calls non-existent API client methods (`api.createSetup`, `api.deleteShot`).
  - Accesses non-existent fields on types (`CameraSetup.lighting_package_notes`, `Shot.storyboard_frame_url`, `Take.camera_card`, `Take.sound_roll`).
  - Causes 15+ TypeScript compilation errors.
- **Suggested Extraction Boundary:** Decompose into `SetupList`, `ShotItemCard`, `TakeLogModal`, and extract state logic into a custom hook `useSceneCoverage(sceneId)`.

### 3.5 `frontend/src/components/schedule/StripboardView.tsx`
- **Path:** [frontend/src/components/schedule/StripboardView.tsx](file:///c:/AI/movie_management/frontend/src/components/schedule/StripboardView.tsx)
- **Size / Responsibilities:** **604 lines**, 22.8 KB. Stripboard Kanban scheduling, dnd-kit drag-and-drop between shoot days, Banner strip creation, Call Sheet dispatching, and DPR drawer integration.
- **Callers:** [frontend/src/app/projects/[projectId]/schedule/page.tsx](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/schedule/page.tsx).
- **Why Problematic:**
  - Bypasses LexoRank fractional indexing; hardcodes integer multipliers (`(newIndex + 1) * 10`) for order index updates.
  - Mixes complex local optimistic array mutations with server refetching on drop.
- **Suggested Extraction Boundary:** Extract dnd-kit drag-and-drop logic into a custom hook `useStripboardDnd()`, separate strip rendering into `StripItem` and `ShootDayColumn`.

### 3.6 `backend/apps/breakdown/ai_copilot.py`
- **Path:** [backend/apps/breakdown/ai_copilot.py](file:///c:/AI/movie_management/backend/apps/breakdown/ai_copilot.py)
- **Size / Responsibilities:** **157 lines**, 5.8 KB. LangGraph workflow for LLM extraction and catalog matching.
- **Why Problematic:**
  - Entirely broken / dead code.
  - Line 79 passes `defaults={"description": ...}` to `Prop.objects.get_or_create()`, but `Prop` has no `description` field.
  - Lines 81–85 pass `item_type='PROP', item_id=prop.id` to `SceneBreakdownItem.objects.get_or_create()`, but `SceneBreakdownItem` has fields `element_type` and `prop` (foreign key).
  - Lines 145 and 149 access `scene.heading` and `scene.project_id`, neither of which exists on `Scene`.
- **Suggested Extraction Boundary:** Rebuild within `apps.breakdown.services` as a validated service using the actual model schema.

---

## 4. SOLID Violations (Supported by Concrete Code)

### 4.1 Single Responsibility Principle (SRP)
- **[backend/config/api.py](file:///c:/AI/movie_management/backend/config/api.py):** One module serves as router, serializer, database query engine, statistical calculator (DOOD matrix calculation lines 2316–2421), object storage provisioner (lines 2813–2836), and Celery dispatcher (line 2059).
- **[backend/apps/logistics/tasks.py:95-145](file:///c:/AI/movie_management/backend/apps/logistics/tasks.py#L95-L145):** `generate_call_sheet_pdf` handles PDF generation, S3 I/O, Channels WebSocket pub/sub broadcasting, and `BackgroundJob` status updates.
- **[backend/apps/narrative/services.py:6-77](file:///c:/AI/movie_management/backend/apps/narrative/services.py#L6-L77):** `parse_fountain_script` mixes text parsing (regex slugline matching) with database write operations (`Act.objects.get_or_create`, `Scene.objects.create`).

### 4.2 Open/Closed Principle (OCP)
- **[backend/config/api.py:1489-1505](file:///c:/AI/movie_management/backend/config/api.py#L1489-L1505) (`_scene_flags`):** Hardcoded string matches on `sc.time_of_day.lower()` and `sc.int_ext`. Supporting new scene conditions requires modifying core functions across multiple files.
- **[backend/apps/core/signals.py:11-46](file:///c:/AI/movie_management/backend/apps/core/signals.py#L11-L46):** Signal receivers inspect `hasattr(instance, 'poster')`, `hasattr(instance, 'continuity_photo')`, `hasattr(instance, 'storyboard_frame')`. Adding new document-producing entities requires modifying global signal handlers.
- **[frontend/src/providers/WebSocketProvider.tsx:44-55](file:///c:/AI/movie_management/frontend/src/providers/WebSocketProvider.tsx#L44-L55):** An `if/else` ladder checks `data.entity === 'stripboard' | 'narrative' | 'budget' | 'vfx'`, falling back to a blanket `queryClient.invalidateQueries()` that flushes the entire app cache on unknown events.

### 4.3 Liskov Substitution Principle (LSP)
- **[backend/apps/core/models.py:32-57](file:///c:/AI/movie_management/backend/apps/core/models.py#L32-L57) (`SoftDeleteModel`):** Overrides `delete()` to set `is_deleted = True`. However, child entities (`Project.acts`, `Project.production_units`) define `on_delete=models.CASCADE`. When a project is deleted, Django ORM does NOT trigger CASCADE soft-deletions on related children, leaving orphaned active records in child tables. Furthermore, standard queries like `Project.objects.all()` in [api.py:639](file:///c:/AI/movie_management/backend/config/api.py#L639) bypass soft-delete filtering.
- **[backend/config/api.py:2786-2796](file:///c:/AI/movie_management/backend/config/api.py#L2786-L2796) (`approve_breakdown`):** Instantiates `Scene.objects.create(pages_display="1", ...)` treating a computed `@property` ([narrative/models.py:93](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L93)) as a persistable database column, breaking the model substitution contract.

### 4.4 Interface Segregation Principle (ISP)
- **[frontend/src/lib/api.ts:579-926](file:///c:/AI/movie_management/frontend/src/lib/api.ts#L579-L926):** Monolithic `api` object forces every consuming component to depend on 80+ methods across all 8 domains.
- **[backend/config/api.py:759-830](file:///c:/AI/movie_management/backend/config/api.py#L759-L830) (`ProjectTreeOut`):** Mega-endpoint returns the entire tree hierarchy (Acts -> Sequences -> Scenes -> Setup Counts -> Shot Counts -> Take Counts). Any client needing a scene list or act title must load and invalidate the entire graph.
- **Duplicate Schemas ([api.py:265](file:///c:/AI/movie_management/backend/config/api.py#L265) vs [api.py:1313](file:///c:/AI/movie_management/backend/config/api.py#L1313)):** Two conflicting `CameraSetupIn` definitions force clients into runtime 422 errors due to mismatched fields (`camera_movement` required in second definition).

### 4.5 Dependency Inversion Principle (DIP)
- **Presentation Depends Directly on Infrastructure:** [backend/config/api.py:2840](file:///c:/AI/movie_management/backend/config/api.py#L2840) instantiates a concrete `boto3.client('s3')` directly inside an API route.
- **High-Level Logic Depends on Low-Level Hardware/Endpoints:** [backend/apps/core/studio_agent.py:42](file:///c:/AI/movie_management/backend/apps/core/studio_agent.py#L42) hardcodes `http://host.docker.internal:11434` and `http://qdrant:6333` rather than injecting an abstract LLM / VectorStore interface.
- **Tasks Depend on Concrete Channels & Storage:** [apps/logistics/tasks.py:113-118](file:///c:/AI/movie_management/backend/apps/logistics/tasks.py#L113-L118) hardcodes direct calls to `default_storage.save()` and `get_channel_layer()`.

---

## 5. Dependency Violations

### 5.1 Inappropriate Boundary Crossings Inventory

```
┌────────────────────────────────────────────────────────────────────────┐
│                      BOUNDARY VIOLATION AUDIT                          │
├──────────────────────┬────────────────────────┬────────────────────────┤
│ Inappropriate Path   │ Source Location        │ Violation Description  │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ API ──► ORM          │ api.py (every route)   │ Direct SQL queries and │
│                      │                        │ ORM filtering in views │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ API ──► Celery       │ api.py:2059, 1627      │ Direct .delay() task   │
│                      │                        │ invocation from views  │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ API ──► Redis Cache  │ api.py:2767, 2805      │ Direct cache.get/set   │
│                      │                        │ of pending breakdowns  │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ API ──► MinIO / S3   │ api.py:2840-2858       │ Raw boto3 client       │
│                      │                        │ configuration in views │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ Domain ──► Infra     │ narrative/services.py  │ Regex parsing directly │
│                      │ breakdown/ai_copilot.py│ creates DB records;    │
│                      │                        │ calls Ollama directly  │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ AI ──► Persistence   │ core/agent_tools.py:68 │ Raw connection.cursor()│
│                      │                        │ executes dynamic SQL   │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ Cross-App Models     │ narrative.models.Scene │ Circular ForeignKeys   │
│                      │ breakdown.MasterLoc    │ between narrative and  │
│                      │                        │ breakdown models       │
└──────────────────────┴────────────────────────┴────────────────────────┘
```

### 5.2 Circular Model Dependencies Detailed
- [apps/narrative/models.py:74](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L74): `Scene.master_location` -> `ForeignKey('breakdown.MasterLocation')`
- [apps/breakdown/models.py:13](file:///c:/AI/movie_management/backend/apps/breakdown/models.py#L13): `MasterLocation.project` -> `ForeignKey('narrative.Project')`
- [apps/breakdown/models.py:65](file:///c:/AI/movie_management/backend/apps/breakdown/models.py#L65): `SceneBreakdownItem.scene` -> `ForeignKey('narrative.Scene')`
- **Result:** `narrative` cannot be decoupled or loaded without `breakdown`, and `breakdown` cannot function without `narrative`.

---

## 6. Business Logic Locations & Extraction Targets

| Business Rule / Calculation | Current File & Line | Current Symbol | Current Domain | Proposed Future Layer |
| :--- | :--- | :--- | :--- | :--- |
| **Day-Out-of-Days (DOOD) Matrix Calculation** | [backend/config/api.py:2316-2421](file:///c:/AI/movie_management/backend/config/api.py#L2316-L2421) | `get_project_dood_matrix` | Logistics | `apps.logistics.domain.services.DoodCalculator` |
| **Scene Cast Presence Extraction** | [backend/config/api.py:1468-1488](file:///c:/AI/movie_management/backend/config/api.py#L1468-L1488) | `_get_scene_cast_ids` | Breakdown / Script | `apps.breakdown.domain.services.CastPresenceService` |
| **Page-Eighths Display Formatting** | [backend/config/api.py:1445-1456](file:///c:/AI/movie_management/backend/config/api.py#L1445-L1456) & [narrative/models.py:93](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L93) | `_format_pages_eighths` / `pages_display` | Screenplay / Narrative | `apps.screenplay.domain.value_objects.PageEighths` |
| **Budget Variance & Totals Rollup** | [backend/config/api.py:2647-2675](file:///c:/AI/movie_management/backend/config/api.py#L2647-L2675) | `get_budget_summary` | Financials | `apps.financials.domain.services.BudgetRollupService` |
| **Fountain Script Parsing** | [apps/narrative/services.py:6-77](file:///c:/AI/movie_management/backend/apps/narrative/services.py#L6-L77) | `parse_fountain_script` | Screenplay | `apps.screenplay.infrastructure.parsers.FountainParser` |
| **LexoRank Midpoint Calculation** | [apps/common/lexorank.py:14-63](file:///c:/AI/movie_management/backend/apps/common/lexorank.py#L14-L63) | `midpoint` | Common / Ordering | `apps.common.domain.ordering.LexoRank` |
| **Script Breakdown Approval & Entity Creation** | [backend/config/api.py:2774-2810](file:///c:/AI/movie_management/backend/config/api.py#L2774-L2810) | `approve_breakdown` | AI / Breakdown | `apps.breakdown.application.use_cases.ApproveScriptBreakdown` |
| **Stripboard Item Reordering** | [backend/config/api.py:2209-2244](file:///c:/AI/movie_management/backend/config/api.py#L2209-L2244) | `reorder_strip` | Logistics | `apps.logistics.application.use_cases.ReorderStripboardItem` |
| **Scene Reordering & Tree Rebalancing** | [backend/config/api.py:831-862](file:///c:/AI/movie_management/backend/config/api.py#L831-L862) | `reorder_scene` | Narrative | `apps.narrative.application.use_cases.ReorderScene` |

---

## 7. Async Architecture & Realtime Coupling

### 7.1 Async Task Flows (HTTP -> Celery -> DB/Storage/Events)

#### Flow A: Call Sheet PDF Generation
```
Client (POST /api/logistics/shoot-days/{id}/generate-call-sheet)
  │
  ▼
[backend/config/api.py:2058] calls generate_call_sheet_pdf.delay(str(shoot_day_id))
  │
  ▼ [Celery Worker: apps/logistics/tasks.py:95]
  ├─► Creates apps.core.models.BackgroundJob (status="RUNNING")
  ├─► Generates PDF via ReportLab canvas (HTML_TEMPLATE is ignored)
  ├─► Writes PDF buffer to MinIO via default_storage.save("call_sheets/...")
  ├─► Updates BackgroundJob (status="SUCCESS", file=saved_path)
  └─► Emits Channels event: async_to_sync(channel_layer.group_send)(
         "studio_notifications", 
         {"type": "send_notification", "message": "Call Sheet PDF generated..."}
      )
```

#### Flow B: Batch Script Breakdown
```
Client / Agent Tool (dispatch_script_breakdown)
  │
  ▼
[apps/narrative/tasks.py:10] batch_script_breakdown.delay(project_id, document_text)
  │
  ▼ [Celery Worker: apps/narrative/tasks.py]
  ├─► Creates BackgroundJob (status="RUNNING")
  ├─► Calls ChatOllama(model="qwen3.5:9b") directly
  ├─► Writes extracted JSON to Redis cache: cache.set(f"pending_breakdown_{project_id}", data, timeout=86400)
  ├─► Updates BackgroundJob (status="SUCCESS")
  └─► Emits Channels event to "studio_notifications"
```

### 7.2 Realtime WebSocket Flow (HTTP -> WebSocket -> Redis/Channels)

```
Next.js Client (WebSocketProvider.tsx)
  │
  ├─► Connects to ws://localhost:8000/ws/projects/{projectId}/
  │     └─► Handled by StudioConsumer (joins group `project_{projectId}`)
  │         * CRITICAL FLAW: Never receives backend mutation events.
  │           Django views never call group_send on project rooms.
  │
  └─► Connects to ws://localhost:8000/ws/notifications/
        └─► Handled by NotificationConsumer (joins group `studio_notifications`)
            * CRITICAL FLAW: Global unpartitioned room. All users in all projects
              receive all Celery notifications across the entire platform.
```

### 7.3 Realtime Coupling Defects
1. **Unauthenticated WebSockets:** [apps/core/consumers.py](file:///c:/AI/movie_management/backend/apps/core/consumers.py) contains zero authentication or `ProjectMembership` validation. Any client can connect to any project's WebSocket room.
2. **Global Notification Pollution:** Celery tasks broadcast to `"studio_notifications"`. Every connected studio user receives pop-up toast notifications for actions executed in unrelated projects.
3. **Missing State Mutation Events:** The documented multi-user collaborative experience does not exist because views do not broadcast card movements.

---

## 8. Frontend Architecture

### 8.1 State Ownership & API Coupling
- **Server State (TanStack Query):** Caches `projectTree`, `sceneDetail`, `sceneCoverage`, `sceneBreakdown`, `budget`, `vfx`, and `pendingBreakdown`.
- **Client State (Zustand `useProjectStore`):** Manages `activeProjectId`, `selectedSceneId`, `activeShotId`, drawer collapsed states, and search queries.
- **API Coupling:** All 18 feature components depend directly on the single monolithic [frontend/src/lib/api.ts](file:///c:/AI/movie_management/frontend/src/lib/api.ts) file.

### 8.2 Frontend TypeScript Compilation Errors (30 Failures)
Running `npx tsc --noEmit` in [frontend/](file:///c:/AI/movie_management/frontend/) fails with 30 compile-time errors:
1. **[src/app/projects/[projectId]/scenes/[sceneId]/page.tsx:64](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/scenes/%5BsceneId%5D/page.tsx#L64):** `Property 'getSceneCoverage' does not exist on type 'api'` (method is named `getCameraTree` in `api.ts`).
2. **[src/components/studio/ShotsSetupsDrawer.tsx:64](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx#L64):** `Property 'createSetup' does not exist on type 'api'` (method is named `createCameraSetup` in `api.ts`).
3. **[src/components/studio/ShotsSetupsDrawer.tsx:90, 123](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx#L90):** `Expected 4 arguments, but got 1` (`createShot` and `createTake` call signatures mismatch).
4. **[src/components/studio/ShotsSetupsDrawer.tsx:156](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx#L156):** `Property 'deleteShot' does not exist on type 'api'`.
5. **[src/components/studio/ShotsSetupsDrawer.tsx:250, 291, 313, 406](file:///c:/AI/movie_management/frontend/src/components/studio/ShotsSetupsDrawer.tsx#L250):** Accesses non-existent properties on types: `lighting_package_notes`, `storyboard_frame_url`, `focal_length`, `camera_movement`, `camera_card`, `sound_roll`, `timecode_in`.
6. **[src/app/projects/[projectId]/assets/page.tsx:70](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/assets/page.tsx#L70):** `Property 'camera_setups' does not exist on type 'SceneTreeNode'`.
7. **[src/components/studio/LinedScriptEditor.tsx:155, 197](file:///c:/AI/movie_management/frontend/src/components/studio/LinedScriptEditor.tsx#L155):** `Property 'setup_code' and 'covered_script_blocks' do not exist on type 'Shot'`.

### 8.3 Duplicated Client Transformations
- **Page Eighths Formatting:** Computed in Python ([narrative/models.py:93](file:///c:/AI/movie_management/backend/apps/narrative/models.py#L93), [api.py:1445](file:///c:/AI/movie_management/backend/config/api.py#L1445)), and duplicated in client components ([page.tsx:42](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/page.tsx#L42), [acts/[actId]/page.tsx](file:///c:/AI/movie_management/frontend/src/app/projects/%5BprojectId%5D/acts/%5BactId%5D/page.tsx)).
- **Custom Notes Delimiter Packing:** [api.py:1519](file:///c:/AI/movie_management/backend/config/api.py#L1519) and [ElementTaggingPanel.tsx](file:///c:/AI/movie_management/frontend/src/components/breakdown/ElementTaggingPanel.tsx) pack custom notes using `" | "` strings instead of structured data.

---

## 9. Testing Coverage Inventory

### 9.1 Existing Tests Inventory
```
Total Test Files in Repository: 0
Total Unit Tests:               0
Total Integration Tests:        0
Django Test Suite Output:       "Found 0 test(s). Ran 0 tests in 0.000s. OK"
Frontend Test Suite Output:     No test runner configured (Jest/Vitest missing from package.json)
```

### 9.2 Critical Untested Business Flows
1. **Day-Out-of-Days (DOOD) Matrix Generation:** Complex status algorithm (SW, SWF, W, H, WF) is completely untested.
2. **LexoRank Midpoint Calculations:** Edge cases (insert at head, insert at tail, string collisions) have zero tests.
3. **Screenplay Script Parsing:** Fountain regex parser behavior on non-standard sluglines is untested.
4. **Project Hierarchy Tree Aggregation:** Prefetching logic, page sum calculations, and shot counters have zero tests.
5. **Stripboard Scheduling & Reordering:** Moving strips across shoot days has no validation tests.
6. **Budget Ledger Calculations:** Above-the-line / below-the-line variance math is untested.
7. **AI Script Breakdown Approval:** The database persistence pipeline has zero tests (causing the unnoticed runtime crash).
8. **Role-Based Access Control (RBAC):** Permission gating across project membership roles has zero test coverage.
9. **Polymorphic Media Asset Uploads:** GenericForeignKey resolution and S3 file operations are untested.
10. **Celery Background PDF Generation:** ReportLab generation and error handling have zero tests.

---

## 10. Migration Candidates & Prioritization

- **P0 = Must fix before substantial architecture work**
- **P1 = High value architectural refactoring**
- **P2 = Useful cleanup & debt retirement**
- **P3 = Defer to future phases**

| Candidate | Rank | Area | Description & Rationale |
| :--- | :---: | :--- | :--- |
| **Characterization Test Harness** | **P0** | Backend/Testing | Write pytest/Django tests capturing current behavior for DOOD matrix, project tree, budget rollup, and LexoRank before modifying any code. |
| **Fix Broken Runtime Endpoints** | **P0** | Backend/Bugs | Fix `approve_breakdown` (`pages_display="1"` error), fix `create_strict_shot` invalid model kwargs, fix `signals.py` AttributeError risks. |
| **Resolve Frontend TypeScript Errors** | **P0** | Frontend/Types | Fix 30 type errors in [frontend/src/](file:///c:/AI/movie_management/frontend/src/) so the frontend builds cleanly and types match backend schemas. |
| **Secure WebSocket Layer** | **P0** | Realtime/Security | Add auth token / session validation to Daphne consumers and partition notification rooms by `project_id`. |
| **Modularize `config/api.py`** | **P1** | Backend/Architecture | Decompose monolithic 3,000-line router into per-app routers (`apps/<domain>/api.py`) attached to `NinjaAPI`. |
| **Extract Application Services** | **P1** | Backend/Layering | Move DOOD matrix, script import, and breakdown approval logic out of API endpoints into dedicated application use cases. |
| **Eliminate N+1 Database Queries** | **P1** | Backend/Performance | Replace nested loop queries in `get_project_tree` and `get_act_detail` with Django ORM `annotate(Count(...))` expressions. |
| **Implement Realtime Mutation Broadcasts** | **P1** | Backend/Realtime | Emit `group_send` events on stripboard and narrative updates to enable actual collaborative multi-user editing. |
| **Decouple `Project` from `narrative`** | **P1** | Backend/Models | Move `Project` to `apps.core` or `apps.projects` to resolve the root tenant dependency inversion. |
| **Decompose `frontend/src/lib/api.ts`** | **P2** | Frontend/Architecture | Split monolithic 926-line client into domain-scoped API modules. |
| **Component Deconstruction** | **P2** | Frontend/Components | Split `ShotsSetupsDrawer.tsx` (724 lines) and `StripboardView.tsx` (604 lines) into smaller, reusable UI components and custom hooks. |
| **Align Drag-and-Drop with LexoRank** | **P2** | Fullstack/Ordering | Update frontend drag-and-drop to actually call `calculateLexoRankMidpoint` instead of hardcoding integer multipliers. |
| **Unify Duplicate Breakdowns & Schemas** | **P2** | Backend/Schemas | Merge duplicate `CameraSetupIn` definitions and unify diverging `/elements` vs `/items` breakdown endpoints. |
| **Breakdown Schema Redesign** | **P3** | Database/Domain | **DEFER.** Explicit user constraint: do not redesign Breakdown schema in this refactor. |
| **Screenplay Engine Overhaul** | **P3** | Screenplay/Domain | **DEFER.** Explicit user constraint: do not redesign screenplay engine in this refactor. |
| **Externalize Hardcoded AI/Storage Config** | **P3** | Infrastructure/Config | Move hardcoded Ollama, Qdrant, and MinIO endpoints from Python files into `.env` settings. |

---

## 11. Recommended Target Architecture

### 11.1 Proposed Dependency Inversion Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACE / ADAPTER LAYER                       │
│  Django Ninja Routers, Daphne WebSocket Consumers, Celery Task Triggers│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ invokes
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                              │
│  Use Cases & Commands (e.g. CalculateDoodMatrix, ReorderStripboardItem, │
│  ApproveScriptBreakdown, IngestDocument, GenerateCallSheet)            │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ coordinates                     │ uses ports
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│            DOMAIN LAYER              │  │      REPOSITORY PORTS        │
│  Pure business rules & entities:     │  │  Abstract Repository &       │
│  - DOOD state machine rules          │  │  Storage Interfaces          │
│  - Page-eighths value objects        │  │  (IProjectRepo, IStorage)    │
│  - LexoRank midpoint calculations    │  └──────────────▲───────────────┘
│  - Script block structure rules      │                 │ implements
└──────────────────────────────────────┘  ┌──────────────┴───────────────┐
                                          │    INFRASTRUCTURE ADAPTERS   │
                                          │  - Django ORM Models         │
                                          │  - PostgreSQL Engine         │
                                          │  - MinIO / S3 Adapter        │
                                          │  - Redis Channel Layer       │
                                          │  - Qdrant Vector Client      │
                                          │  - Ollama LLM Client         │
                                          └──────────────────────────────┘
```

---

## 12. Incremental Migration Order

To guarantee zero regression in existing behavior, the migration must follow an incremental "characterize -> extract -> swap -> test" workflow.

```
PHASE 0: SAFETY HARNESS & RUNTIME STABILIZATION
  ├── Step 0.1: Write Django characterization tests for DOOD matrix calculation.
  ├── Step 0.2: Write characterization tests for Project Tree & Scene queries.
  ├── Step 0.3: Fix runtime bugs (approve_breakdown, create_strict_shot).
  └── Step 0.4: Resolve 30 frontend TypeScript compilation errors.

PHASE 1: API ROUTER DECOMPOSITION (BEHAVIOR PRESERVED)
  ├── Step 1.1: Extract narrative routes from api.py to apps/narrative/api.py.
  ├── Step 1.2: Extract logistics routes from api.py to apps/logistics/api.py.
  ├── Step 1.3: Extract breakdown routes from api.py to apps/breakdown/api.py.
  ├── Step 1.4: Extract shots routes from api.py to apps/shots/api.py.
  ├── Step 1.5: Extract financials routes from api.py to apps/financials/api.py.
  ├── Step 1.6: Extract AI, media, and studio hub routes to respective apps.
  └── Step 1.7: Run characterization tests to verify zero endpoint regressions.

PHASE 2: FIRST VERTICAL SLICE — LOGISTICS & DOOD CALCULATION
  ├── Step 2.1: Extract DoodCalculator service to apps/logistics/services/dood.py.
  ├── Step 2.2: Extract StripboardReorderCommand use case.
  ├── Step 2.3: Wire logistics router to invoke application use cases.
  ├── Step 2.4: Implement WebSocket event broadcasting on stripboard moves.
  └── Step 2.5: Verify with unit tests.

PHASE 3: QUERY OPTIMIZATION & N+1 REMOVAL
  ├── Step 3.1: Refactor ProjectTree query using ORM Count annotations.
  ├── Step 3.2: Refactor ActDetail query using ORM Count annotations.
  └── Step 3.3: Benchmark query reduction (from ~600 queries down to < 5 queries).

PHASE 4: FRONTEND CLIENT & COMPONENT DECOMPOSITION
  ├── Step 4.1: Split frontend/src/lib/api.ts into feature-specific clients.
  ├── Step 4.2: Decompose ShotsSetupsDrawer into subcomponents.
  ├── Step 4.3: Decompose StripboardView into subcomponents.
  └── Step 4.4: Connect frontend drag-and-drop to calculateLexoRankMidpoint.
```

---

## Top 10 Architectural Risks

1. **Catastrophic N+1 Query Explosion:** `get_project_tree` and `get_act_detail` execute up to 4 raw count queries per scene in nested Python loops ([api.py:772-777](file:///c:/AI/movie_management/backend/config/api.py#L772-L777)), resulting in 600+ database hits for standard feature film projects.
2. **Zero Automated Safety Net:** Complete absence of unit or integration tests across backend and frontend means any architectural refactor risks undetected production regression.
3. **Broken Script Breakdown Approval Path:** `approve_breakdown` ([api.py:2786](file:///c:/AI/movie_management/backend/config/api.py#L2786)) crashes with 500 errors because `pages_display` is passed as a column to `Scene.objects.create()`.
4. **Arbitrary SQL Execution Tool in AI Agent:** `execute_read_only_sql` ([agent_tools.py:56](file:///c:/AI/movie_management/backend/apps/core/agent_tools.py#L56)) uses a naive blocklist allowing prompt injection or cross-tenant project data exfiltration.
5. **Collection Deletion on Embedding Dimension Mismatch:** In `vector_store.py:36` and `agent_tools.py:243`, conflicting embedding models (`bge-m3` vs `bge-base`) trigger automated collection deletion, wiping out all vector embeddings without warning.
6. **Hardcoded Dev Auto-Login in Production Pipeline:** `DevAuthMiddleware` ([core/middleware.py:5](file:///c:/AI/movie_management/backend/apps/core/middleware.py#L5)) unconditionally logs every client in as `dev_admin` on all HTTP requests.
7. **Unauthenticated Realtime WebSocket Access:** `StudioConsumer` ([core/consumers.py:4](file:///c:/AI/movie_management/backend/apps/core/consumers.py#L4)) allows anyone to join any project WebSocket room without membership checks.
8. **Broken Frontend TypeScript Build:** 30 compilation errors block production bundle compilation and CI verification.
9. **Circular App Foreign Key Coupling:** Direct cross-dependencies between `narrative` and `breakdown` prevent clean bounded-context modularization.
10. **Synchronous Long-Running AI Chat Blocks Workers:** `universal_agent_chat` ([api.py:2742](file:///c:/AI/movie_management/backend/config/api.py#L2742)) runs a multi-step LangGraph workflow synchronously within an HTTP POST request, exhausting web worker threads.

---

## Top 10 Recommended Refactors

1. **Establish Pytest Test Suite & Characterization Tests:** Add tests for DOOD calculation, project tree queries, and LexoRank before modifying application code.
2. **Decompose `backend/config/api.py` into Per-App Routers:** Break the 3,000-line monolith into focused routers within each Django app.
3. **Fix Broken Runtime Endpoints:** Correct kwargs in `approve_breakdown`, `create_strict_shot`, and clean up `apps/breakdown/ai_copilot.py`.
4. **Fix Frontend TypeScript Errors & API Method Alignment:** Align method names and signatures in [frontend/src/lib/api.ts](file:///c:/AI/movie_management/frontend/src/lib/api.ts) with backend Ninja schemas.
5. **Optimize Tree Queries with ORM Annotations:** Replace loops in `get_project_tree` with single query annotations (`Count('sequences__scenes__camera_setups')`).
6. **Extract DOOD Matrix into a Domain Service:** Move the 100-line calculation out of `api.py` into `apps.logistics.domain.services.DoodCalculator`.
7. **Secure WebSockets & Scope Notifications:** Add auth verification to Daphne consumers and partition notification rooms by project.
8. **Decompose Monolithic Frontend Components:** Break `ShotsSetupsDrawer.tsx` (724 lines) and `StripboardView.tsx` (604 lines) into modular subcomponents and hooks.
9. **Implement Realtime Mutation Broadcasts:** Emit `group_send` events on stripboard and scene updates to achieve actual multi-user real-time collaboration.
10. **Relocate `Project` Model to `apps.core`:** Move the core tenant entity to eliminate the inverted dependency between `core` and `narrative`.

---

## Recommended First Vertical Slice

### **Vertical Slice: Production Logistics & Stripboard Scheduling**

**Why this slice first:**
1. **High Value, High Risk:** Scheduling is the core operational engine of film production; stripboard and DOOD calculation are heavily used.
2. **Self-Contained Domain Rules:** The DOOD matrix logic is mathematically self-contained with well-defined inputs (ShootDays, StripboardItems, Scene cast IDs) and outputs (SW, W, H, WF status matrix).
3. **Validates the Refactoring Architecture:** Successfully moving DOOD calculation, stripboard reordering, and call sheet dispatching through Clean Architecture (API -> Application Use Case -> Domain Service -> Infrastructure) establishes the design pattern for the rest of the repository without risking the Screenplay or Breakdown schemas.

---

## Files That Must NOT Be Touched Yet

In accordance with strict safety rules and user constraints, the following files must remain untouched during initial refactoring:

1. **[backend/apps/breakdown/models.py](file:///c:/AI/movie_management/backend/apps/breakdown/models.py):** Explicit user constraint: *DO NOT redesign the Breakdown database schema.*
2. **[backend/apps/narrative/services.py](file:///c:/AI/movie_management/backend/apps/narrative/services.py) (Fountain Parser logic):** Explicit user constraint: *DO NOT redesign the screenplay engine yet.*
3. **[backend/apps/narrative/models.py](file:///c:/AI/movie_management/backend/apps/narrative/models.py) (Lines 66–102: `Scene` & `script_data`):** Holds active screenplay blocks and historical records; must not be altered until a dedicated screenplay module is introduced.
4. **[docker-compose.yml](file:///c:/AI/movie_management/docker-compose.yml) & Infrastructure Definitions:** Working containers for Postgres, Redis, MinIO, Celery, and Qdrant must remain intact while application boundaries are clarified.
5. **[frontend/src/components/studio/LinedScriptEditor.tsx](file:///c:/AI/movie_management/frontend/src/components/studio/LinedScriptEditor.tsx):** High-friction screenplay editing UX component; must not be touched until backend screenplay API contracts are stabilized.

---

## Out-of-Scope Findings

| File | Problem | Risk | Suggested Future Action |
| :--- | :--- | :--- | :--- |
| [backend/apps/core/signals.py:23-46](file:///c:/AI/movie_management/backend/apps/core/signals.py#L23-L46) | Signal checks for non-existent attributes `continuity_photo` and `storyboard_frame`, and navigates invalid relation `instance.camera_setup.scene.project_id`. | If triggered, raises unhandled `AttributeError` crashing model save transactions. | Refactor document ingestion to explicit application events rather than implicit Django signals. |
| [backend/apps/core/vector_store.py:33-43](file:///c:/AI/movie_management/backend/apps/core/vector_store.py#L33-L43) | Auto-deletes Qdrant collection if vector dimensions differ from 1024. | Silent data loss of all studio vector embeddings if model configuration is changed. | Replace collection auto-deletion with a migration check and explicit warning log. |
| [backend/apps/logistics/tasks.py:15-92](file:///c:/AI/movie_management/backend/apps/logistics/tasks.py#L15-L92) | 80 lines of elaborate `HTML_TEMPLATE` are defined but completely ignored; WeasyPrint was abandoned for a 3-line ReportLab canvas mock. | Incomplete feature; call sheet PDFs contain placeholder canvas text instead of real call sheet tables. | When ready, connect `HTML_TEMPLATE` to WeasyPrint or properly populate ReportLab tables in a dedicated PDF adapter. |
| [backend/config/settings.py:136-151](file:///c:/AI/movie_management/backend/config/settings.py#L136-L151) | AWS/MinIO access keys (`studio_admin`, `studio_password`) are hardcoded in `settings.py` instead of being read from environment variables. | Security risk if repository is published to public version control. | Move MinIO credentials to `.env` with secure environment variable loading. |
| [backend/apps/core/agent_tools.py:120-153](file:///c:/AI/movie_management/backend/apps/core/agent_tools.py#L120-L153) | `analyze_production_image` reads files from local disk path `MEDIA_ROOT/temp_ai_uploads/` while other media assets are stored in MinIO object storage. | Vision tool fails in distributed multi-container deployments where Celery/Agent runs on a different host than the web server. | Stream images directly from S3/MinIO via presigned URLs or storage adapters. |
