# CineFlow Architecture

## 1. System Overview
CineFlow is an enterprise-grade film production management system. The stack comprises:
- **Frontend:** Next.js App Router providing a dynamic, client-heavy interface using React Query and Zustand.
- **Backend:** Django with Django Ninja for fast, type-safe REST APIs.
- **Database:** PostgreSQL for robust relational data storage and integrity.
- **Cache & Message Broker:** Redis.
- **Background Processing:** Celery for asynchronous tasks (e.g., script parsing, PDF generation, email notifications).
- **Asset Storage:** MinIO (S3-compatible) for secure, scalable object storage.

## 2. The Dual-Tree Domain Model
CineFlow maps the creative vision to physical logistics via two intersecting graphs:
- **Narrative Graph:** Acts -> Sequences -> Scenes
- **Production Graph:** Production Units -> Shoot Days -> Stripboard Items
- **Pivot:** The `Scene` acts as the critical pivot. It originates in the Narrative Graph but can be linked to a `StripboardItem` in the Production Graph, tying creative pages to physical schedule days.

## 3. LexoRank Reordering
To facilitate performant drag-and-drop operations on the Stripboard and Narrative Outliner, CineFlow uses fractional indexing (LexoRank algorithm). Instead of recalculating integer indices (which causes O(N) database locks), LexoRank assigns lexicographical strings (e.g., `0|hzzzzz:`). Moving an item between two others simply calculates a string midway between the two, requiring only an O(1) update.

## 4. Directory Structure
```
movie_management/
├── backend/
│   ├── apps/
│   │   ├── core/       # Security, User, Roles, Soft Delete utilities
│   │   ├── narrative/  # Acts, Sequences, Scenes, Projects
│   │   ├── breakdown/  # Props, Cast, Wardrobe, Locations
│   │   ├── shots/      # Camera Setups, Takes, Coverage
│   │   └── logistics/  # Shoot Days, Stripboard, DooD
│   └── config/         # Django settings, API routing
└── frontend/
    └── src/
        ├── app/        # Next.js Pages and Layouts
        ├── components/ # Reusable UI pieces
        ├── lib/        # API clients and utilities
        └── stores/     # Zustand state management
```
