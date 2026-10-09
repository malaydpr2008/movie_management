# CineFlow Studio — Architectural Dependency Rules & Boundaries

**Document:** Enforceable Architectural Dependency Matrix  
**Version:** 2.0  
**Status:** Mandatory Engineering Standard  
**Goal:** Prevent architectural rot, circular imports, and infrastructure leakage into business logic.

---

## 1. The Core Inward-Pointing Dependency Rule

Dependencies must point inward toward the Domain:

```
┌────────────────────────────────────────────────────────┐
│                   INTERFACES / API                     │
│       (Django Ninja Routers, Channels, Celery)         │
└───────────────────────────┬────────────────────────────┘
                            │ imports
                            ▼
┌────────────────────────────────────────────────────────┐
│                     APPLICATION                        │
│          (Use Cases, Commands, Queries, Ports)         │
└─────────────┬──────────────────────────▲───────────────┘
              │ imports                  │ implements ports
              ▼                          │
┌───────────────────────────┐  ┌─────────┴───────────────┐
│          DOMAIN           │  │     INFRASTRUCTURE      │
│  (Entities, Value Objects,│  │   (ORM, Redis, MinIO,   │
│      Domain Services)     │  │    Qdrant, Ollama)      │
└───────────────────────────┘  └─────────────────────────┘
```

---

## 2. Layer-by-Layer Allowed & Disallowed Rules

### 2.1 Domain Layer (`apps.<context>.domain.*`)

The Domain contains pure business rules and data models. It has zero knowledge of frameworks, databases, or third-party SDKs.

#### ALLOWED:
- `domain` → Python Standard Library (`math`, `re`, `uuid`, `datetime`, `dataclasses`, `typing`)
- `domain` → Other pure domain value objects / domain models within the same context
- `domain.logistics.services.dood_calculator` → `domain.logistics.models.ShootDaySummary`

#### DISALLOWED:
- ❌ `domain` → `django.*` (No Django ORM, no `models.Model`, no `HttpRequest`)
- ❌ `domain` → `ninja.*` or `pydantic.*` (No HTTP schema frameworks in domain core)
- ❌ `domain` → `celery.*` or `channels.*` (Zero async broker knowledge)
- ❌ `domain` → `boto3`, `qdrant_client`, `langchain.*` (Zero external infrastructure SDKs)
- ❌ `domain` → `apps.<context>.application.*` or `apps.<context>.infrastructure.*` (No outward dependencies)

```python
# ✅ ALLOWED: Pure Python domain service
# apps/logistics/domain/services/dood_calculator.py
from dataclasses import dataclass
from typing import List, Dict, Set

class DoodCalculator:
    @staticmethod
    def calculate(shoot_days: List[str], cast_presence: Dict[int, Set[int]]) -> dict:
        ...

# ❌ DISALLOWED: Importing Django ORM in Domain
# apps/logistics/domain/services/dood_calculator.py
from django.db import models  # VIOLATION!
from apps.logistics.models import ShootDay  # VIOLATION!
```

---

### 2.2 Application Layer (`apps.<context>.application.*`)

The Application layer coordinates business use cases. It depends on the Domain and defines Ports (abstract interfaces) for external systems.

#### ALLOWED:
- `application` → `domain.*` (Invoking domain calculations and entities)
- `application` → `application.ports.*` (Using repository, storage, and event interfaces)
- `application` → `dataclasses`, `typing.Protocol`, standard library
- `application.logistics.use_cases` → `application.logistics.ports.IScheduleRepository`
- `application.logistics.use_cases` → `domain.logistics.services.DoodCalculator`

#### DISALLOWED:
- ❌ `application` → `apps.<context>.infrastructure.*` (Must not import concrete adapters directly)
- ❌ `application` → `django.db.models` (Must not execute raw ORM queries; must use ports)
- ❌ `application` → `boto3`, `qdrant_client`, `langchain.*` (Must use storage/AI ports)
- ❌ `application` → `ninja.*` (Must not depend on HTTP framework or API schemas)
- ❌ `application` → `channels.layers` (Must use event broadcaster port)

```python
# ✅ ALLOWED: Use Case depends on Port
# apps/logistics/application/use_cases/reorder_strip.py
from apps.logistics.application.ports.stripboard_repository import IStripboardRepository

class ReorderStripUseCase:
    def __init__(self, repo: IStripboardRepository):
        self.repo = repo

# ❌ DISALLOWED: Use Case directly importing Django ORM
# apps/logistics/application/use_cases/reorder_strip.py
from apps.logistics.models import StripboardItem  # VIOLATION!
StripboardItem.objects.filter(id=strip_id).update(...)  # VIOLATION!
```

---

### 2.3 Interface / API Layer (`apps.<context>.api.*`)

The Interface layer translates HTTP requests and WebSocket messages into Application Use Cases.

#### ALLOWED:
- `api` → `application.use_cases.*` (Instantiating and executing commands/queries)
- `api` → `ninja.*`, `pydantic.*` (HTTP routing, parameter validation, schema serialization)
- `api` → `domain.exceptions.*` (Handling domain exceptions and mapping status codes)
- `api` → Injected security dependencies (`require_project_role`)

#### DISALLOWED:
- ❌ `api` → Direct database querying (`Model.objects.filter()`, `select_related()`, raw SQL)
- ❌ `api` → Direct infrastructure calls (`boto3.client('s3')`, `qdrant_client.QdrantClient`)
- ❌ `api` → Complicated business calculations (DOOD matrix loops, budget rollups)
- ❌ `api` → Direct Redis cache manipulations (`cache.get()`, `cache.set()`)
- ❌ `api` → Direct Celery task triggering (`task.delay()`; task triggering belongs in application services)

```python
# ✅ ALLOWED: Thin API endpoint invoking application use case
# apps/logistics/api.py
@router.post("/strips/reorder", response=StripboardItemOut)
def reorder_strip_endpoint(request, payload: StripReorderIn, user: User = Depends(get_current_user)):
    cmd = ReorderStripCommand(strip_id=payload.strip_id, new_order_index=payload.new_order_index)
    result = reorder_strip_use_case.execute(cmd)
    return StripboardItemOut.from_domain(result)

# ❌ DISALLOWED: Fat API endpoint doing inline queries, storage, and broadcasting
# apps/logistics/api.py
@router.post("/strips/reorder")
def reorder_strip_endpoint(request, payload: StripReorderIn):
    item = StripboardItem.objects.get(id=payload.strip_id)  # VIOLATION!
    item.order_index = payload.new_order_index  # VIOLATION!
    item.save()  # VIOLATION!
    s3 = boto3.client('s3')  # VIOLATION!
```

---

### 2.4 Infrastructure Layer (`apps.<context>.infrastructure.*`)

Infrastructure contains concrete implementations of ports (ORM models, S3 clients, vector databases).

#### ALLOWED:
- `infrastructure` → `application.ports.*` (Implementing port interfaces)
- `infrastructure` → `domain.*` (Constructing and returning domain entities)
- `infrastructure` → External SDKs (`boto3`, `qdrant_client`, `langchain_ollama`, `channels`)
- `infrastructure` → `django.db.models`, `django.conf.settings`

#### DISALLOWED:
- ❌ `infrastructure` → `api.*` (Must never depend on HTTP presentation or router code)
- ❌ `infrastructure` → Holding core business logic (DOOD calculations must not live inside ORM models or Celery tasks)

```python
# ✅ ALLOWED: Adapter implements application port
# apps/logistics/infrastructure/repositories/django_stripboard_repository.py
from apps.logistics.application.ports.stripboard_repository import IStripboardRepository
from apps.logistics.models import StripboardItem

class DjangoStripboardRepository(IStripboardRepository):
    def get_strip(self, strip_id: uuid.UUID):
        return StripboardItem.objects.filter(id=strip_id).first()
```

---

## 3. Cross-Context Dependency Matrix

To maintain clean boundaries between domains, cross-context dependencies must follow strict rules:

| Source Context | Target Context | Allowed? | Approved Integration Channel |
| :--- | :--- | :---: | :--- |
| **Logistics** | **Narrative** | ⚠️ Limited | Logistics references Scene via `scene_id` UUID; loads scene data through a read-only Scene port. |
| **Narrative** | **Logistics** | ❌ NO | Narrative structure (Acts/Sequences) must never import or depend on Production logistics. |
| **Screenplay** | **Narrative** | ⚠️ Future | Screenplay attaches to Scenes via `scene_id`; Narrative does not depend on text block formatting. |
| **Breakdown** | **Narrative** | ⚠️ Preserved | `SceneBreakdownItem` links to `Scene` via foreign key during current phase; no circular imports. |
| **Narrative** | **Breakdown** | ❌ NO | `Scene.master_location` circular FK must be decoupled via ID reference. |
| **Shots** | **Narrative** | ⚠️ Limited | `CameraSetup` attaches to `Scene` via `scene_id`. `Shot` has no direct scene FK. |
| **AI Copilot** | **PostgreSQL (Direct SQL)**| ❌ NO | AI tools must NOT execute arbitrary SQL via `cursor.execute()`. Must use typed read queries. |
| **AI Copilot** | **Application Services** | ✅ YES | AI tools invoke read-only Application Queries (e.g. `GetSceneBreakdownQuery`). |
| **All Contexts**| **Studio & Projects** | ✅ YES | All contexts may reference `Project.id` as tenant root. |

---

## 4. Async & Infrastructure Dependency Boundaries

### 4.1 Celery Tasks (`apps.<context>.tasks.py`)
- **ALLOWED:**
  - Tasks accept JSON-serializable primitives (`str`, `int`, `uuid.UUID`).
  - Tasks instantiate and execute Application Use Cases.
  - Tasks catch domain exceptions and update `BackgroundJob` status.
- **DISALLOWED:**
  - ❌ Tasks accepting Django model instances as arguments.
  - ❌ Tasks containing inline business logic (e.g. inline script parsing inside Celery).
  - ❌ Tasks triggering HTTP API endpoints.

### 4.2 WebSockets & Real-Time Events (`apps.notifications`)
- **ALLOWED:**
  - Event broadcaster port (`IEventBroadcaster`) defined in Application layer.
  - Event broadcaster implemented by Redis Channels adapter in Infrastructure layer.
  - Application use cases emitting structured events to `project_{project_id}`.
- **DISALLOWED:**
  - ❌ Django Ninja API views directly calling `async_to_sync(channel_layer.group_send)()`.
  - ❌ Unpartitioned global broadcasts to `"studio_notifications"` for tenant-specific actions.
  - ❌ WebSocket consumers mutating database state directly without application use cases.

### 4.3 Object Storage / MinIO (`apps.media`)
- **ALLOWED:**
  - Application ports defining storage operations (`save_file`, `get_presigned_url`).
  - Storage adapter wrapping `boto3` and reading credentials from `settings.py`.
- **DISALLOWED:**
  - ❌ API views creating `boto3.client('s3')` inline.
  - ❌ Hardcoding AWS access keys or endpoint URLs in Python files.
  - ❌ Writing files directly to local server disk paths in production workflows.

### 4.4 Vector Store / Qdrant (`apps.search`)
- **ALLOWED:**
  - Search adapter wrapping `QdrantClient` and `OllamaEmbeddings`.
  - Application layer querying `ISearchIndexPort`.
- **DISALLOWED:**
  - ❌ Screenplay or Breakdown modules importing `qdrant_client` directly.
  - ❌ Automatically dropping/deleting collections on dimension changes.

---

## 5. Frontend Architecture Dependency Rules

```
┌────────────────────────────────────────────────────────┐
│                      APP ROUTES                        │
│          (src/app/projects/[projectId]/...)            │
└───────────────────────────┬────────────────────────────┘
                            │ imports
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FEATURE COMPONENTS                   │
│         (src/components/schedule, shots, etc.)         │
└─────────────┬──────────────────────────┬───────────────┘
              │ imports                  │ uses
              ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│       UI ATOMS / BASE     │  │   FEATURE CUSTOM HOOKS  │
│   (src/components/ui/*)   │  │ (useStripboardDnd, etc.)│
└───────────────────────────┘  └─────────┬───────────────┘
                                         │ calls
                                         ▼
                               ┌─────────────────────────┐
                               │   MODULAR API CLIENTS   │
                               │  (src/lib/api/<feat>.ts)│
                               └─────────────────────────┘
```

#### ALLOWED:
- App page routes import feature components.
- Feature components use collocated custom hooks for data fetching (`useQuery`, `useMutation`).
- Custom hooks call modular API functions in `src/lib/api/<feature>.ts`.
- Components use `useProjectStore` strictly for client-side UI state (modals, drawer tabs).
- Drag-and-drop components call `calculateLexoRankMidpoint` for fractional indexing updates.

#### DISALLOWED:
- ❌ Feature components directly calling `fetch()` or raw HTTP endpoints.
- ❌ Feature components exceeding 300 lines of code (must decompose).
- ❌ Storing server entity state (scenes, shoot days, budget accounts) in Zustand stores.
- ❌ Hallucinating model attributes not present in backend schemas.
- ❌ Importing from a monolithic 900-line `lib/api.ts` file (must use modular clients).

---

## 6. Automated Enforcement Mechanisms

The architecture rules are strictly and automatically enforced in both local development and CI pipelines via zero-overhead, native tooling.

### 6.1 Backend Architecture Enforcement

Backend enforcement is implemented via Python AST analysis in [architecture_checker.py](file:///c:/AI/movie_management/backend/apps/core/architecture_checker.py) and integrated directly into the test suite via [test_architecture.py](file:///c:/AI/movie_management/backend/apps/core/test_architecture.py) and the CLI [check_architecture.py](file:///c:/AI/movie_management/backend/scripts/check_architecture.py).

#### A. Domain Purity Contract
The Domain layer (`apps/**/domain/**/*.py`) must have zero framework, storage, or transport dependencies:
- ❌ **Django HTTP / Web Presentation:** `django.http`, `django.shortcuts`, `django.views`, `django.urls`, `ninja`
- ❌ **Celery / Async Task Systems:** `celery`, `apps.*.tasks`
- ❌ **Vector Stores:** `qdrant_client`
- ❌ **Object Storage:** `boto3`, `botocore`
- ❌ **Cache / Key-Value Stores:** `redis`, `django.core.cache`
- ❌ **Real-Time / WebSockets:** `channels`
- ❌ **Document Generation:** `reportlab`
- ❌ **Concrete Infrastructure:** `apps.*.infrastructure`
- ❌ **Transport API:** `apps.*.api`
- ❌ **Database ORM:** `django.db`, `apps.*.models`

#### B. Application Dependency Inversion Contract
The Application layer (`apps/**/application/**/*.py`) coordinates use cases and must depend on Ports (abstract interfaces) rather than concrete vendor SDKs or implementations:
- ❌ **Direct Vendor SDKs Prohibited:** `boto3`, `botocore`, `qdrant_client`, `redis`, `channels.layers`, `reportlab`, `django.http`, `django.shortcuts`, `django.views`
- ⚠️ **Concrete Infrastructure Implementations:** Disallowed by default. Concrete adapters (`apps.*.infrastructure.*`) are permitted strictly as default constructor fallbacks when registered in `APPROVED_APPLICATION_INFRA_IMPORTS`.

#### Approved Concrete Infrastructure Registry:
| Application Module | Approved Concrete Infrastructure Imports | Architectural Rationale |
| :--- | :--- | :--- |
| `apps/breakdown/application/use_cases.py` | `DjangoBreakdownRepository` | Default repository fallback for breakdown persistence queries |
| `apps/core/ai/application/use_cases.py` | `DjangoS3StorageAdapter`, `DjangoCacheAdapter` | Default storage and cache adapters for AI copilot tools |
| `apps/core/application/use_cases/ingest_document.py` | `QdrantVectorAdapter`, `ingest_document` | Default vector search indexing fallback |
| `apps/logistics/application/call_sheet_use_case.py` | `DjangoS3StorageAdapter`, `ReportLabCallSheetRenderer`, `ChannelsEventPublisher`, `broadcast_studio_notification` | Default adapters for PDF generation, S3 upload, and event broadcast |
| `apps/logistics/application/finalize_dpr_use_case.py` | `ChannelsEventPublisher`, `broadcast_studio_notification` | Default event publishing adapter for DPR finalization |
| `apps/logistics/application/use_cases.py` | `DjangoLogisticsRepository` | Default repository fallback for logistics and stripboard queries |
| `apps/narrative/application/use_cases/batch_script_breakdown.py` | `OllamaScriptBreakdownService`, `DjangoCacheAdapter`, `ChannelsEventPublisher`, `broadcast_studio_notification` | Default AI extraction service and event notification adapters |

#### Running Backend Checks:
```bash
# Standalone CLI checker (fast, prints detailed violation reports)
python scripts/check_architecture.py

# Via Django Test Runner (executes ArchitectureEnforcementTests)
python manage.py test apps.core
python manage.py test
```

---

### 6.2 Frontend Architecture Enforcement

Frontend enforcement is implemented via static code analysis in [check-architecture.mjs](file:///c:/AI/movie_management/frontend/scripts/check-architecture.mjs) and registered in `package.json`.

#### Enforced Boundaries:
- **Enforced Directories:** `src/components/**`, `src/app/**`, `src/hooks/**`, `src/stores/**`
- **Prohibited Server Communication:** Direct `fetch()`, `window.fetch()`, `XMLHttpRequest`, or `axios`
- **Allowed Transport File:** `src/lib/api/client.ts` (`apiFetch` / `uploadFile`)
- **Required Architecture:** All feature components and page routes must consume data via modular API clients in `src/lib/api/*` or React Query hooks.

#### Running Frontend Checks:
```bash
# Run architecture dependency checker
npm run check:architecture

# Run detector self-test (verifies detection of prohibited patterns and acceptance of legitimate ones)
node scripts/check-architecture.mjs --test-detector

# Full frontend quality gate
npm run check:architecture && npm run lint && npx tsc --noEmit
```

---

### 6.3 Continuous Integration (CI) Quality Gates

Automated verification is configured in [.github/workflows/ci.yml](file:///c:/AI/movie_management/.github/workflows/ci.yml) to run on every push and pull request:

1. **`backend-verification` Job:**
   - Runs `python scripts/check_architecture.py` to prevent any dependency violations or unapproved infrastructure leakage.
   - Runs `python manage.py test` to verify full unit, integration, and characterization test suites.
2. **`frontend-verification` Job:**
   - Runs `npm run check:architecture` to ensure feature components never bypass the API/query layer.
   - Runs `npx tsc --noEmit` to verify TypeScript compile-time type safety.
   - Runs `npm run lint` for ESLint conformance.

