# CineFlow Studio — Engineering Constitution

You are working on the CineFlow Studio movie-management platform.

## Technology stack

Backend:
- Django 5
- Django Ninja
- PostgreSQL
- Django Channels / WebSockets
- Celery
- Redis
- MinIO / S3
- Qdrant
- LangChain / LLM integrations

Frontend:
- Next.js 14
- React 18
- TypeScript
- TanStack Query
- Zustand
- Tailwind CSS
- dnd-kit

## Current architectural situation

The existing repository is a working product/reference implementation, but several modules have accumulated too many responsibilities.

Important existing hotspots include:
- backend/config/api.py
- backend application service modules
- Celery tasks
- AI/vector/storage integrations
- frontend/src/lib/api.ts
- large React feature components

The existing implementation contains valuable domain knowledge and working behavior.

DO NOT treat the existing code as disposable.

We are performing an evolutionary architectural rebuild.

## Primary strategy

Use the existing system as the behavioral reference implementation.

Refactor toward:

    Interface / API
          ↓
    Application
          ↓
    Domain
          ↓
    Infrastructure adapters

Dependencies must point inward.

The domain/application layer must not become directly dependent on:
- Django Ninja
- Django ORM where avoidable
- Redis
- Celery
- Qdrant
- MinIO
- boto3
- Channels
- concrete LLM providers
- HTTP transport

Infrastructure may depend on application/domain abstractions.

## Architectural principles

Follow SOLID, but do not introduce abstractions mechanically.

### Single Responsibility
A module/class/function should have one coherent reason to change.

### Open/Closed
Prefer extending behavior through use cases, strategies, policies, and adapters rather than modifying giant conditional functions.

### Liskov Substitution
Implementations of ports must honor the behavioral contract of the abstraction.

### Interface Segregation
Prefer small capability-specific interfaces over giant repository/service interfaces.

### Dependency Inversion
Business logic depends on abstractions; infrastructure implements them.

## Application layer

Application services represent business use cases.

Examples:

- CreateScene
- UpdateScene
- ReorderScene
- ImportScreenplay
- ApproveBreakdown
- ScheduleScene
- GenerateCallSheet
- GenerateDPR

HTTP endpoints should be thin adapters that invoke application use cases.

Celery tasks should also be thin adapters that invoke application use cases.

## Domain

The domain contains business concepts and rules.

Do not make the domain depend on HTTP, Celery, Redis, Qdrant, MinIO, or React.

Do not prematurely create an elaborate DDD framework.

Introduce domain objects where they provide meaningful business behavior.

Simple CRUD may initially continue using Django models behind repositories.

## Infrastructure

Infrastructure contains implementations for:

- PostgreSQL/Django ORM
- Redis
- Celery
- MinIO
- Qdrant
- LLM providers
- WebSockets/Channels
- PDF generation
- external services

Infrastructure details must not leak upward unnecessarily.

## Critical strategic constraint

DO NOT redesign the Breakdown database schema during this architectural refactor.

DO NOT redesign the screenplay engine yet.

DO NOT redesign the product's core domain model merely for architectural purity.

Those are later phases.

First establish clean boundaries.

## Screenplay strategy

Eventually the screenplay engine will become a major domain capability.

Do not assume that:
- Narrative = Screenplay
- Breakdown = Screenplay
- Production = Screenplay

Keep those concepts separable.

The eventual conceptual relationship is approximately:

    Screenplay
       ↓
    Narrative meaning
       ↓
    Breakdown requirements
       ↓
    Production execution

Do not implement the future screenplay engine unless explicitly requested.

## Behavioral preservation

During refactoring:
- preserve existing API contracts unless explicitly instructed otherwise
- preserve database behavior
- preserve frontend behavior
- preserve authorization behavior
- preserve realtime behavior
- preserve Celery behavior
- preserve existing business rules

When behavior is ambiguous, inspect the existing implementation and tests before changing it.

## Migration rule

Prefer:

    characterize behavior
        ↓
    introduce boundary
        ↓
    migrate implementation
        ↓
    test
        ↓
    remove old implementation

Avoid:

    create giant new architecture
        ↓
    rewrite everything

## Testing requirement

Every meaningful refactoring step should have tests.

Prioritize:
- application service tests
- domain rule tests
- repository integration tests
- API contract tests
- Celery task tests where applicable

Do not make tests depend unnecessarily on infrastructure.

## Code quality

Prefer:
- explicit types
- small cohesive functions
- meaningful names
- dependency injection
- explicit error types
- narrow interfaces
- deterministic behavior

Avoid:
- god classes
- god modules
- generic utils dumping grounds
- generic service dumping grounds
- deep inheritance
- unnecessary factories
- unnecessary interfaces
- hidden global state
- broad `except Exception`
- duplicated business rules

## Important workflow rule

Before modifying code:

1. Inspect the relevant implementation.
2. Trace callers and dependencies.
3. Identify current behavior.
4. Identify tests or lack of tests.
5. Propose the smallest safe change.
6. Implement.
7. Run relevant tests/type checks/lint.
8. Report exactly what changed.

Never make speculative architectural changes outside the requested scope.

## Definition of success

The architecture should become easier to:
- test
- understand
- change
- extend
- replace infrastructure components
- evolve the screenplay engine
- redesign Breakdown later

without requiring a wholesale rewrite of the product.