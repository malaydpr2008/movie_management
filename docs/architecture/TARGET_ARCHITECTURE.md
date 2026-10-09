# CineFlow Studio — Target Architecture Blueprint

**Document:** Evolutionary Architectural Rebuild Specification  
**Version:** 2.0 Target Architecture  
**Status:** Approved Reference Blueprint  
**Design Philosophy:** Pragmatic Clean Architecture (Inward-Pointing Dependencies, Vertical Slices, Zero Speculative Abstractions)

---

## 1. Executive Vision & Architectural Tenets

CineFlow Studio is transitioning from a monolithic, tightly-coupled Django/Next.js prototype into a modular, maintainable, and resilient enterprise film production platform.

### Core Architectural Tenets
1. **Evolutionary, Not Greenfield:** We build upon the working reference implementation. The domain models, business math, and UI paradigms are preserved and cleaned up.
2. **Inward-Pointing Dependencies:** Domain and application business rules must not depend on UI, database frameworks, object storage SDKs, vector databases, or AI model providers.
3. **Pragmatic Simplicity:** We do not force every simple CRUD table into an elaborate Domain-Driven Design (DDD) aggregate. We introduce domain services and value objects strictly where complex business logic exists (e.g., Day-Out-of-Days matrix calculations, LexoRank ordering, Page-Eighths arithmetic).
4. **No Speculative Abstractions:** We explicitly prohibit generic abstractions such as `BaseRepository[T]`, `BaseService`, `GenericCRUDService`, or `UniversalEventBus`. Every repository port, use case, and service must be concrete, narrow, and purposeful.
5. **Separation of Creative Narrative, Screenplay, and Production Logistics:** Narrative structure (Acts/Sequences/Scenes), Screenplay text/coverage, and Logistical execution (Units/ShootDays/Stripboards) are separable bounded contexts linked by explicit interfaces.

---

## 2. Bounded Contexts

The CineFlow platform is organized into 12 distinct bounded contexts. Each context has a single owner, clear invariants, and explicit integration contracts.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CINEFLOW STUDIO BOUNDED CONTEXTS                     │
│                                                                                  │
│  ┌──────────────────────────┐                      ┌──────────────────────────┐  │
│  │    Studio & Projects     │                      │    Identity & Access     │  │
│  │ (Project Lifecycle/Meta) │◄─────────────────────┤   (Users, Roles, RBAC)   │  │
│  └────────────┬─────────────┘                      └──────────────────────────┘  │
│               │                                                                  │
│  ┌────────────┴─────────────┐    Bridge Entity     ┌──────────────────────────┐  │
│  │   Narrative Structure    │─────────────────────►│   Production Logistics   │  │
│  │  (Acts, Sequences)       │       [SCENE]        │  (Units, Days, Strips,   │  │
│  └────────────┬─────────────┘         ▲   ▲        │   DOOD Matrix, DPR)      │  │
│               │                       │   │        └──────────────────────────┘  │
│  ┌────────────▼─────────────┐         │   │        ┌──────────────────────────┐  │
│  │    Screenplay Engine     │─────────┘   │        │     Shots & Coverage     │  │
│  │ (Fountain Parser, Blocks,│             └────────┤  (Camera Setups, Shots,  │  │
│  │  Lined Script Tracking)  │                      │   Takes, VFX Shots)      │  │
│  └────────────┬─────────────┘                      └──────────────────────────┘  │
│               │                                                                  │
│  ┌────────────▼─────────────┐                      ┌──────────────────────────┐  │
│  │    Breakdown Catalogs    │                      │   Budget & Financials    │  │
│  │ (Locations, Cast Bible,  │                      │ (Accounts, Line Items,   │  │
│  │  Wardrobe, Props, Items) │                      │  Estimated vs Actual)    │  │
│  └──────────────────────────┘                      └──────────────────────────┘  │
│                                                                                  │
│   SUPPORTING & INFRASTRUCTURE CONTEXTS:                                          │
│   ┌─────────────────────┬────────────────────┬───────────────────────────────┐   │
│   │ Media Storage (S3)  │  AI Studio Copilot │ Vector Search (Qdrant/Ollama) │   │
│   └─────────────────────┴────────────────────┴───────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Context Breakdown

| Bounded Context | Scope & Responsibilities | Core Entities & Value Objects | Target Location |
| :--- | :--- | :--- | :--- |
| **1. Studio & Projects** | Project root tenant, metadata, slug lifecycle, target runtime, telemetry metrics. | `Project`, `ProjectStatus`, `ProjectMetrics` | `apps.core` or `apps.projects` |
| **2. Identity & Access** | Authentication, user credentials, project membership, role gating (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`). | `User`, `ProjectMembership`, `Role` | `apps.core.auth` |
| **3. Narrative Structure** | Macro narrative hierarchy: Acts, Sequences, dramatic milestones, target page lengths. | `Act`, `Sequence`, `DramaticMilestone` | `apps.narrative` |
| **4. Screenplay Engine** | *Future Boundary.* Fountain parsing, screenplay text blocks (slugline, action, character, dialogue), lined script coverage mapping. | `Screenplay`, `ScriptBlock`, `PageEighths` | `apps.screenplay` |
| **5. Breakdown Catalogs** | *Preserved Schema.* Scene breakdown elements, Master Locations, Character bible, Costume Looks, Props inventory. | `MasterLocation`, `Character`, `CostumeLook`, `Prop`, `SceneBreakdownItem` | `apps.breakdown` |
| **6. Production Logistics** | Logistical execution: Production Units, Shoot Days, Stripboard ordering, DOOD matrix calculation, Daily Production Reports (DPR), Crew roster. | `ProductionUnit`, `ShootDay`, `StripboardItem`, `DoodReport`, `CrewMember` | `apps.logistics` |
| **7. Shots & Coverage** | Camera setups, shot lists, takes, circle takes, camera movement, slate/lens logs, VFX pipeline tracking. | `CameraSetup`, `Shot`, `Take`, `VfxShot` | `apps.shots` |
| **8. Budget & Financials** | Chart of accounts (ATL, BTL Production, BTL Post, Other), line items, budget vs actual variance analysis. | `BudgetAccount`, `LineItem`, `BudgetSummary` | `apps.financials` |
| **9. Media Storage** | Asset upload pipeline, MinIO S3 object storage, presigned URLs, MIME-type classification, polymorphic ContentType attachment. | `MediaAsset`, `StorageObject` | `apps.media` |
| **10. AI Studio Copilot** | LangGraph agent workflows, prompt management, tool execution, multimodal vision analysis, script breakdown auditor. | `AgentState`, `AgentTool`, `CopilotMessage` | `apps.ai` |
| **11. Search & Vector** | Qdrant vector store connection, Ollama embedding generation, text chunking, studio document indexing. | `VectorCollection`, `DocumentChunk` | `apps.search` |
| **12. Realtime Events** | WebSocket connection management, room membership validation, Channels pub/sub broadcasting, push notifications. | `RealtimeEvent`, `ProjectChannel` | `apps.notifications` |

---

## 3. Layer Responsibilities & Dependency Direction

The architecture enforces an inward-pointing dependency rule:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACE / API LAYER                           │
│  - Django Ninja Routers & Pydantic Schemas                             │
│  - Daphne WebSocket Consumers                                          │
│  - Celery Task Triggers (HTTP dispatch adapters)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (calls use cases)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                              │
│  - Application Services / Use Cases (e.g. CalculateDoodMatrixQuery)    │
│  - Command & Query DTOs                                                │
│  - Transaction Management (`transaction.atomic`)                       │
│  - Port Declarations (Interfaces for repositories, storage, events)   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ (coordinates)                   │ (uses ports)
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│            DOMAIN LAYER              │  │      REPOSITORY PORTS        │
│  - Pure Domain Entities              │  │  Abstract repository &       │
│  - Value Objects (PageEighths, etc.) │  │  gateway interfaces          │
│  - Domain Services (DoodCalculator)  │  │  (IShootDayRepository, etc.) │
│  - Business Invariants & Rules       │  └──────────────▲───────────────┘
└──────────────────────────────────────┘                 │ (implements)
                                          ┌──────────────┴───────────────┐
                                          │    INFRASTRUCTURE ADAPTERS   │
                                          │  - Django ORM Models & SQL   │
                                          │  - MinIO / Boto3 S3 Storage  │
                                          │  - Redis Channels Layer      │
                                          │  - Qdrant Vector Client      │
                                          │  - Ollama LLM HTTP Client    │
                                          │  - ReportLab / WeasyPrint    │
                                          └──────────────────────────────┘
```

### Strict Direction Rules
1. **Interfaces** depend ONLY on **Application** (via use cases) and **Domain** (read-only types).
2. **Application** depends ONLY on **Domain** and **Application Ports**. It NEVER imports Django ORM models directly.
3. **Domain** depends on NOTHING outside itself. It contains pure Python data structures, calculations, and invariants.
4. **Infrastructure** implements **Application Ports** and depends on **Domain** models.

---

## 4. Application-Service Conventions

Application services encapsulate distinct business use cases. They represent what the system *does*.

### Structure & Conventions
- **Cohesive Use Cases:** Use cases are single-purpose classes or functions located in `apps/<context>/application/use_cases/`.
- **Naming Pattern:** `<Verb><Noun><Command/Query/UseCase>` (e.g., `CalculateDoodMatrixQuery`, `ReorderStripboardItemCommand`, `ApproveScriptBreakdownUseCase`).
- **Input & Output:** Input is a plain Python dataclass or validated Pydantic model (`Command`/`Query`). Output is a typed result or domain entity. Never accept raw HTTP request objects.
- **Port Usage:** Use cases access persistence, storage, and events solely via injected ports or port interfaces.
- **Transaction Boundaries:** Database transactions (`@transaction.atomic`) are controlled at the application use case layer.

### Concrete Example: Stripboard Reordering Use Case
```python
# apps/logistics/application/use_cases/reorder_strip.py
from dataclasses import dataclass
import uuid
from apps.logistics.application.ports.stripboard_repository import IStripboardRepository
from apps.logistics.application.ports.event_broadcaster import IEventBroadcaster

@dataclass(frozen=True)
class ReorderStripCommand:
    strip_id: uuid.UUID
    target_shoot_day_id: uuid.UUID
    new_order_index: str
    user_id: uuid.UUID

class ReorderStripUseCase:
    def __init__(self, repo: IStripboardRepository, broadcaster: IEventBroadcaster):
        self.repo = repo
        self.broadcaster = broadcaster

    def execute(self, cmd: ReorderStripCommand) -> None:
        strip = self.repo.get_strip(cmd.strip_id)
        if not strip:
            raise StripboardItemNotFoundError(f"Strip {cmd.strip_id} not found")

        strip.shoot_day_id = cmd.target_shoot_day_id
        strip.order_index = cmd.new_order_index
        self.repo.save(strip)

        # Broadcast real-time update to project room
        self.broadcaster.broadcast_project_event(
            project_id=strip.project_id,
            event_type="STRIPBOARD_UPDATED",
            payload={"strip_id": str(strip.id), "day_id": str(cmd.target_shoot_day_id)}
        )
```

---

## 5. Domain Conventions

The domain layer encapsulates critical business logic, calculations, and rules.

### Guidelines
1. **Pragmatic Scope:** Do NOT create domain entities for simple CRUD tables (e.g., updating a crew member's phone number). Continue using Django models via repository adapters for simple record keeping.
2. **Pure Domain Services:** Where rich business rules exist, extract them into pure Python domain services:
   - `DoodCalculator`: Film Day-Out-of-Days matrix logic (determining SW, SWF, W, H, WF status).
   - `LexoRankCalculator`: Fractional indexing midpoint generator.
   - `BudgetVarianceCalculator`: Financial ledger aggregations and variance analysis.
3. **Value Objects:** Encapsulate primitive film production domain concepts into immutable value objects:
   - `PageEighths`: Represents script length in 1/8ths of a page; validates `1 <= eighths <= 800`; provides fractional string representations (`"1 3/8"`, `"2 5/8"`).
   - `SceneHeading`: Validates `INT`, `EXT`, `INT/EXT` slugline formats and time-of-day.

### Concrete Example: Day-Out-of-Days (DOOD) Domain Service
```python
# apps/logistics/domain/services/dood_calculator.py
from dataclasses import dataclass
from typing import Dict, List, Set
import uuid

@dataclass(frozen=True)
class CharacterSchedule:
    cast_id: int
    name: str
    actor_name: str
    daily_status: Dict[str, str]  # shoot_day_id -> "SW" | "W" | "H" | "WF" | "SWF" | ""
    total_work_days: int
    total_hold_days: int

class DoodCalculator:
    """Pure domain service calculating Day-Out-of-Days matrix according to SAG/industry standards."""

    @staticmethod
    def calculate(
        shoot_day_ids: List[str],
        character_cast_ids: List[int],
        daily_cast_presence: Dict[int, Set[int]]  # day_idx -> set of cast_ids
    ) -> Dict[int, CharacterSchedule]:
        # Pure mathematical calculation, zero database queries, zero framework imports
        results = {}
        for cast_id in character_cast_ids:
            work_day_indices = [
                idx for idx, present_ids in daily_cast_presence.items()
                if cast_id in present_ids
            ]
            # Calculate SW, SWF, W, H, WF
            status_map = {}
            total_work = 0
            total_hold = 0
            if not work_day_indices:
                for sday in shoot_day_ids:
                    status_map[sday] = ""
            elif len(work_day_indices) == 1:
                first_idx = work_day_indices[0]
                for idx, sday in enumerate(shoot_day_ids):
                    status_map[sday] = "SWF" if idx == first_idx else ""
                total_work = 1
            else:
                first_idx = work_day_indices[0]
                last_idx = work_day_indices[-1]
                for idx, sday in enumerate(shoot_day_ids):
                    if idx < first_idx or idx > last_idx:
                        status_map[sday] = ""
                    elif idx == first_idx:
                        status_map[sday] = "SW"
                        total_work += 1
                    elif idx == last_idx:
                        status_map[sday] = "WF"
                        total_work += 1
                    elif idx in work_day_indices:
                        status_map[sday] = "W"
                        total_work += 1
                    else:
                        status_map[sday] = "H"
                        total_hold += 1

            results[cast_id] = (status_map, total_work, total_hold)
        return results
```

---

## 6. Repository & Port Conventions

Ports define the contracts through which the Application layer accesses persistence and external systems.

### Rules
1. **No Generic Base Repositories:** Do NOT create `BaseRepository[T]`, `GenericCRUDRepository`, or generic query abstractions.
2. **Capability-Specific Ports:** Repositories are declared as narrow `typing.Protocol` interfaces in `apps/<context>/application/ports/`.
3. **Domain Return Types:** Methods return domain models, typed dataclasses, or domain entities—never raw Django QuerySets or ORM model instances leaking internal relations.

### Example Port Definition
```python
# apps/logistics/application/ports/schedule_repository.py
from typing import Protocol, List, Optional
import uuid
from apps.logistics.domain.models import ShootDaySummary, StripboardItemRecord

class IScheduleRepository(Protocol):
    def get_project_shoot_days(self, project_id: uuid.UUID) -> List[ShootDaySummary]: ...
    def get_shoot_day(self, shoot_day_id: uuid.UUID) -> Optional[ShootDaySummary]: ...
    def get_stripboard_item(self, strip_id: uuid.UUID) -> Optional[StripboardItemRecord]: ...
    def save_stripboard_item(self, item: StripboardItemRecord) -> None: ...
```

---

## 7. Infrastructure Adapter Conventions

Infrastructure adapters live in `apps/<context>/infrastructure/` and implement the application ports.

### Adapter Types & Responsibilities
- **ORM Repositories (`infrastructure/repositories/`):** Translate between Django ORM queries and application/domain data structures. Use Django's query optimizer features (`select_related`, `prefetch_related`, `annotate(Count(...))`) to eliminate N+1 queries.
- **Storage Adapters (`infrastructure/storage/`):** Wrap `boto3` and `django-storages`. Manage S3 bucket policies, presigned upload URLs, and MIME-type validation.
- **Realtime Event Adapters (`infrastructure/realtime/`):** Wrap `channels.layers.get_channel_layer()` to dispatch WebSocket group messages.
- **AI & Vector Adapters (`infrastructure/ai/`):** Wrap LangGraph, LangChain, Ollama, and Qdrant. Inject configuration from environment settings.

---

## 8. API & Router Conventions

The API layer is deconstructed from the 2,989-line monolithic `backend/config/api.py` into modular, domain-scoped routers.

### Router Organization
- Each app defines its own router in `apps/<context>/api.py` (e.g., `apps.narrative.api.router`, `apps.logistics.api.router`).
- Routers are mounted in [backend/config/urls.py](file:///c:/AI/movie_management/backend/config/urls.py) / central `NinjaAPI` using clear URL prefixes:
  - `/api/narrative` -> `apps.narrative.api.router`
  - `/api/logistics` -> `apps.logistics.api.router`
  - `/api/shots` -> `apps.shots.api.router`
  - `/api/breakdown` -> `apps.breakdown.api.router`
  - `/api/financials` -> `apps.financials.api.router`
  - `/api/media` -> `apps.media.api.router`
  - `/api/ai` -> `apps.ai.api.router`

### Router Guidelines
- **Thin Endpoints:** Router functions must contain ZERO business math, ZERO raw S3 calls, and ZERO raw SQL queries. They parse input schemas, invoke application use cases, and return output schemas.
- **Strict Authorization:** Endpoints accessing project resources MUST declare `auth=require_project_role(['OWNER', 'ADMIN', ...])`.
- **Pydantic Schemas:** Schemas are collocated with routers in `apps/<context>/schemas.py`. Duplicate schema declarations are eliminated.

---

## 9. Celery Task Conventions

Celery background workers process long-running, asynchronous, or I/O-intensive jobs.

### Conventions
1. **Thin Task Triggers:** Celery tasks in `apps/<context>/tasks.py` are thin adapters that instantiate and execute Application Use Cases.
2. **Primitive Arguments Only:** Tasks must only accept JSON-serializable primitives (e.g. `shoot_day_id: str`, `project_id: str`). Never pass Django model instances or complex objects.
3. **Lifecycle Tracking:** Every long-running task updates a `BackgroundJob` record with `RUNNING`, `SUCCESS`, or `FAILED` status, along with error messages and execution metadata.
4. **Project-Scoped Notifications:** Upon completion or failure, tasks emit real-time notifications to the specific `project_{project_id}` room, not a global unpartitioned room.

---

## 10. WebSocket & Real-Time Event Conventions

### WebSocket Architecture
- **Authenticated Consumers:** [apps/core/consumers.py](file:///c:/AI/movie_management/backend/apps/core/consumers.py) must validate user authentication and verify `ProjectMembership` during the WebSocket handshake (`connect()`).
- **Project-Scoped Rooms:** Clients join `project_{project_id}`. Global notification rooms are eliminated in favor of tenant-scoped events.
- **Mutation Broadcasting:** When HTTP PATCH/POST actions modify stripboards, scenes, or shot setups, the application use case broadcasts a structured event to `project_{project_id}`.

### Standardized Event Envelope
```json
{
  "event": "STRIPBOARD_UPDATED",
  "entity": "stripboard",
  "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "payload": {
    "strip_id": "98765432-10fe-dcba-0987-6543210fedcb",
    "target_day_id": "11223344-5566-7788-99aa-bbccddeeff00"
  },
  "timestamp": "2026-10-08T22:30:00Z"
}
```

---

## 11. Frontend Architecture Conventions

The Next.js 14 frontend transitions from monolithic API files and 700-line god components to a feature-sliced, modular architecture.

### Directory Structure
```
frontend/src/
├── app/                      # Next.js App Router (Page routes & layouts)
├── components/
│   ├── ui/                   # Reusable atomic UI (Button, Modal, Drawer, Toast)
│   ├── navigation/           # Sidebar, Header, SubHeaderBar
│   └── <feature>/            # Feature-scoped components (logistics, shots, etc.)
│       ├── components/       # Subcomponents (< 250 lines each)
│       └── hooks/            # Custom feature hooks
├── lib/
│   ├── api/                  # Feature-specific API clients
│   │   ├── client.ts         # Shared typed fetch wrapper with error handling
│   │   ├── logistics.ts      # Logistics endpoints
│   │   ├── narrative.ts      # Narrative endpoints
│   │   ├── shots.ts          # Shots & coverage endpoints
│   │   └── breakdown.ts      # Breakdown catalog endpoints
│   ├── types/                # Collocated TypeScript interfaces & schemas
│   └── lexorank.ts           # Client-side LexoRank ordering helper
├── stores/                   # Zustand stores (UI state only)
└── providers/                # React Query & WebSocket Providers
```

### State Ownership Separation
- **Server State (TanStack Query):** All entity data, lists, and server calculations are managed by React Query. Queries are partitioned by `queryKey: ['<entity>', projectId]`.
- **Client State (Zustand):** Zustand is reserved exclusively for volatile UI state: drawer expansion, active modal tabs, sidebar collapse, search filters.
- **Component Decomposition:** Components must not exceed 250–300 lines. Monoliths like `ShotsSetupsDrawer.tsx` (724 lines) and `StripboardView.tsx` (604 lines) are deconstructed into focused child components with dedicated custom hooks (e.g. `useSceneCoverage`, `useStripboardDnd`).

---

## 12. Error-Handling Conventions

### Domain & Application Exceptions
Define explicit, typed domain exceptions instead of returning error strings or generic 500 crashes:
```python
class CineFlowError(Exception): """Base exception for CineFlow application."""
class EntityNotFoundError(CineFlowError): """Requested domain entity does not exist."""
class BusinessRuleViolationError(CineFlowError): """Operation violates domain invariants."""
class UnauthorizedProjectAccessError(CineFlowError): """User lacks required project permissions."""
```

### API Layer Exception Mapping
Django Ninja registers global exception handlers that translate domain exceptions into standard HTTP error responses:
- `EntityNotFoundError` -> HTTP 404 `{ "detail": "...", "code": "NOT_FOUND" }`
- `BusinessRuleViolationError` -> HTTP 422 `{ "detail": "...", "code": "UNPROCESSABLE_ENTITY" }`
- `UnauthorizedProjectAccessError` -> HTTP 403 `{ "detail": "...", "code": "FORBIDDEN" }`

---

## 13. Testing Strategy

With 0 existing tests in the repository, establishing automated testing is a prerequisite for safe refactoring.

### Test Pyramid & Priority
```
         /  E2E Playwright Tests  \          P2: Critical user flows
        /   Integration / API     \         P1: Ninja endpoint contract tests
       /  Application Use Cases    \        P1: Service orchestration tests
      / Pure Domain Unit Tests (Pytest) \    P0: DOOD, LexoRank, PageEighths math
```

1. **Phase 0 — Characterization Safety Harness:** Write tests for existing calculations (DOOD matrix, project tree counts, budget totals, LexoRank) before modifying implementation code.
2. **Domain Unit Tests:** Fast, isolated unit tests running in milliseconds with zero database or network dependencies.
3. **Application & Repository Integration Tests:** Validate that repository queries execute correctly without N+1 query regressions (`django.test.utils.CaptureQueriesContext`).
4. **API Contract Tests:** Validate request/response schemas, status codes, and authorization gating.

---

## 14. Naming Conventions

| Concept | Python / Backend Convention | TypeScript / Frontend Convention | Example |
| :--- | :--- | :--- | :--- |
| **Domain Service** | `class <Noun>Service:` / `<Noun>Calculator:` | N/A | `DoodCalculator` |
| **Use Case / Command** | `class <Verb><Noun>UseCase:` / `<Verb><Noun>Command:` | N/A | `ReorderStripUseCase` |
| **Repository Port** | `class I<Entity>Repository(Protocol):` | N/A | `IScheduleRepository` |
| **Adapter Class** | `class Django<Entity>Repository:` | N/A | `DjangoScheduleRepository` |
| **API Schema (In)** | `class <Entity><Action>In(Schema):` | `interface <Entity><Action>Payload` | `ShootDayCreateIn` |
| **API Schema (Out)** | `class <Entity>Out(Schema):` | `interface <Entity>` | `ShootDayDetailOut` |
| **Custom Hook** | N/A | `use<Feature><Action>` | `useStripboardDnd` |
| **Component** | N/A | PascalCase `.tsx` | `StripItem.tsx` |

---

## 15. Migration Strategy & Vertical Slices

The refactor follows an incremental, non-breaking migration strategy:

```
PHASE 0: Characterization Safety Harness & Runtime Stabilization
  ├── 0.1 Write characterization tests for DOOD calculation & ProjectTree queries.
  ├── 0.2 Fix runtime crash in approve_breakdown (pages_display kwarg).
  ├── 0.3 Fix runtime crash in create_strict_shot (invalid Shot kwargs).
  └── 0.4 Resolve 30 frontend TypeScript compilation errors.

PHASE 1: Deconstruct backend/config/api.py into App-Level Routers
  ├── 1.1 Move narrative routes to apps/narrative/api.py.
  ├── 1.2 Move logistics routes to apps/logistics/api.py.
  ├── 1.3 Move shots routes to apps/shots/api.py.
  ├── 1.4 Move breakdown routes to apps/breakdown/api.py.
  ├── 1.5 Move financials routes to apps/financials/api.py.
  └── 1.6 Verify zero API regressions using characterization tests.

PHASE 2: First Vertical Slice — Production Logistics (DOOD & Stripboard)
  ├── 2.1 Extract DoodCalculator pure domain service.
  ├── 2.2 Extract ReorderStripUseCase and IScheduleRepository port.
  ├── 2.3 Implement real-time WebSocket event broadcasting on strip moves.
  └── 2.4 Decompose StripboardView.tsx on the frontend.

PHASE 3: Query Optimization & N+1 Elimination
  ├── 3.1 Refactor get_project_tree with Django ORM Count() annotations.
  └── 3.2 Refactor get_act_detail with Django ORM Count() annotations.

PHASE 4: Frontend API Client & Component Modernization
  ├── 4.1 Split frontend/src/lib/api.ts into domain clients.
  ├── 4.2 Decompose ShotsSetupsDrawer.tsx into subcomponents and hooks.
  └── 4.3 Connect drag-and-drop to calculateLexoRankMidpoint.
```
