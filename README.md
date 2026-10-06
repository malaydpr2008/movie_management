# CineFlow Studio

An enterprise-grade film production and screenplay breakdown system.

## Getting Started

### Prerequisites
- Docker and Docker Compose

### Running Locally
1. Start the services:
   ```bash
   docker-compose up -d --build
   ```
2. Apply database migrations:
   ```bash
   docker-compose exec backend python manage.py migrate
   ```
3. Create a superuser:
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```
4. Access the applications:
   - **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs (Swagger):** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
   - **MinIO Console:** [http://localhost:9001](http://localhost:9001)
