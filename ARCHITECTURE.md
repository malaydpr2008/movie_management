# CineFlow Studio Architecture
**Developer Handbook & System Blueprint**

## 1. System Overview & Tech Stack

CineFlow is an enterprise-grade, dual-tree film production platform. It utilizes a highly scalable and resilient modern technology stack:

- **Frontend:** Next.js 14 (App Router) + React 18, utilizing Tailwind CSS for styling and TanStack Query (React Query) for data-fetching and cache invalidation.
- **Backend API:** Django 5 with Django Ninja for fully typed, asynchronous, and Pydantic-validated REST API endpoints.
- **Real-Time Layer:** Django Channels via Daphne (ASGI), routing WebSocket events backed by Redis.
- **Database:** PostgreSQL (Relational persistence) + Redis (In-memory broker for Celery and Channels).
- **Asynchronous Processing:** Celery workers for long-running tasks like generating Daily Production Report (DPR) PDFs via WeasyPrint.
- **Asset Storage:** MinIO (S3-compatible object storage) accessed via `boto3` and `django-storages` for media uploads (Location photos, Storyboards, Costumes).
- **Containerization:** Fully containerized via Docker and Docker Compose.

## 2. Dual-Tree Architecture Pattern

The system architecture cleanly separates the creative writing process from the logistical scheduling process to match how actual film studios operate. This is achieved via a **Dual-Tree Graph**:

### The Narrative Graph (The Script)
- Hierarchy: `Project` -> `Act` -> `Sequence` -> `Scene`.
- Represents the story chronologically.
- Writers edit Acts and Sequences without impacting the shooting schedule.

### The Production Graph (The Schedule)
- Hierarchy: `Project` -> `ProductionUnit` -> `ShootDay` -> `StripboardItem`.
- Represents the logistical reality of how the movie is physically shot (e.g., grouping all "Ext. Desert" scenes regardless of when they happen in the story).

### The Bridge Entity
- The `Scene` entity acts as the absolute source of truth linking the two graphs.
- A `SceneBreakdownItem` attaches physical elements (Actors, Props, VFX) to the Scene.
- A `StripboardItem` wraps a Scene and places it onto a specific `ShootDay`.

## 3. LexoRank & Drag-and-Drop Ordering

Modern film production requires constant reshuffling of the Stripboard and the Outline. Doing `O(N)` updates to shift array indexes is inefficient and error-prone in a collaborative environment.

We implemented **LexoRank** (Fractional Indexing) for absolute ordering:
- Each item (Act, Sequence, Scene, StripboardItem) has an alphanumeric `order_index` (e.g., `a`, `b`, `c`).
- To place an item between `b` and `c`, the system assigns it `bm`.
- Drag-and-drop operations in the Kanban boards or Outliners execute an `O(1)` database update.
- Example payload:
  ```json
  {
    "order_index": "bm"
  }
  ```

## 4. Security & Role-Based Access Control (RBAC)

Global user access is tightly restricted to specific projects via the `ProjectMembership` table. 

- **Roles:** `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`.
- **API Gating:** Django Ninja uses injected dependencies to verify access dynamically before a view is executed.

**Example Implementation:**
```python
def get_project_member(request: HttpRequest, project_id: uuid.UUID):
    membership = get_object_or_404(ProjectMembership, user=request.user, project_id=project_id)
    if membership.role not in ['OWNER', 'ADMIN', 'EDITOR']:
        raise HttpError(403, "Insufficient privileges.")
    return membership

@router.patch("/scenes/{scene_id}")
def update_scene(request, scene_id: uuid.UUID, payload: SceneIn, member: ProjectMembership = Depends(get_project_member)):
    # Execution implies the user is authorized to edit the project containing this scene.
    pass
```

## 5. Real-Time Collaboration

To emulate the "War Room" experience where multiple Assistant Directors and Producers are updating the board simultaneously, CineFlow uses **Django Channels (WebSockets)**.

1. **Backend Broadcasting:** 
   When a user moves a Stripboard card via a `PATCH` request, the Django view fires an event into a Redis channel (`project_{project_id}`). 
2. **WebSocket Consumer:**
   The `StudioConsumer` pushes the event down to all connected clients in that room.
3. **Frontend Invalidation:**
   The Next.js client listens via the `WebSocketProvider`. Upon receiving `{ "entity": "stripboard" }`, it triggers `queryClient.invalidateQueries(['stripboard', projectId])`.
4. **Result:**
   React Query instantly (and silently) refetches the delta, updating the UI for all collaborators without manual page reloads.
