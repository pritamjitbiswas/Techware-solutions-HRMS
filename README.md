# HRMS & Attendance

Internal, single-tenant HRMS and attendance system. See [Techware solution.md](Techware%20solution.md) for the full spec.

## Stack

FastAPI (async SQLAlchemy 2.0 + Alembic) · PostgreSQL 16 · Redis 7 · Celery + Beat · React 18/TS/Vite · Tailwind + shadcn/ui · MinIO · nginx — all wired through Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with WSL2 backend on Windows)

Everything else (Python, Node, Postgres, Redis, MinIO) runs inside containers — nothing else to install on the host.

## Setup (4 commands)

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

Then open:

- API docs: http://localhost:8000/docs
- Web app: http://localhost:5173
- Everything via nginx: http://localhost:8080
- MinIO console: http://localhost:9001
- SQLAdmin (ADMIN escape hatch, added in Phase 1): http://localhost:8000/admin

Seeded logins (password for all: `ChangeMe123!`, forced change on first login):

| Role | Email |
|---|---|
| ADMIN | admin@company.local |
| HR | hr@company.local |
| MANAGER | manager@company.local |
| EMPLOYEE | employee4@company.local, employee5@company.local, employee6@company.local |

## Running tests

```bash
docker compose exec api pytest --cov=app
```

## Project layout

```
api/        FastAPI app, SQLAlchemy models, Alembic migrations, Celery tasks, tests
web/        React + TypeScript + Vite frontend (employee/manager/HR + mobile PWA)
nginx/      Reverse proxy config
docker-compose.yml
.env.example
```

## Build status

Following the phased build order in the spec:

- [x] **Phase 0** — repo layout, Docker Compose, models, initial Alembic migration, seed script, `/healthz` + `/readyz`
- [x] **Phase 1** — auth, RBAC, employee CRUD with field-ownership split, profile pictures, SQLAdmin, audit log
- [x] **Phase 2** — punch endpoint, attendance compute engine, Celery recompute, nightly jobs
- [x] **Phase 3** — leave and regularisation
- [x] **Phase 4** — web frontend (employee self-service, manager approvals, HR/Admin dashboard, web punch)
- [x] Phase 5 — mobile app (skipped/optional — web application handles responsive mobile views & web punch)
- [x] **Phase 6** — reports and polish
