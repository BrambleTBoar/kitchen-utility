# Deployment Platform Design (Phase 1)

**Date:** 2026-06-17
**Status:** Approved
**Scope:** Core deployment platform — CI/CD pipeline, container management, API, CLI interface

---

## 1. Architecture Overview

The platform is a **self-hosted tool** — each company deploys their own instance. The platform orchestrates builds and deployments to the company's own cloud (AWS, GCP, Azure). It does **not** host applications or infrastructure for other companies.

```
                    ┌─────────────┐
                    │   CLI Tool  │  (Go)
                    │  vibe CLI   │
                    └──────┬──────┘
                           │ REST
                    ┌──────▼──────┐
                    │  API Server │  (Go)
                    │  Fastify    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Auth    │ │ Project  │ │  Build   │
        │ Service  │ │ Service  │ │ Service  │
        └──────────┘ └──────────┘ └────┬─────┘
                                      │
                              ┌───────▼───────┐
                              │  Deploy       │
                              │  Service      │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  Cloud   │    │  Cloud   │    │  Cloud   │
              │  (AWS)   │    │  (GCP)   │    │  (Azure) │
              └──────────┘    └──────────┘    └──────────┘

        ┌─────────────────────────────────────────────┐
        │           Next.js Web App                   │
        │         (Dashboard + Auth)                  │
        └─────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────┐
        │         PostgreSQL + Redis                  │
        └─────────────────────────────────────────────┘
```

### Key Flows

1. **CLI → API:** `vibe deploy` calls the API, which triggers the build service, which deploys to the company's cloud
2. **Web App → API:** Dashboard calls the same API (shared endpoints)
3. **Git webhook → API:** GitHub push triggers a build automatically
4. **DWH proxy:** Projects query through the API, which forwards to the company's data warehouse

---

## 2. Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **CLI tool** | Go | Sub-10ms startup, single binary, cross-platform |
| **API server** | Go (Fastify) | High concurrency, compiled, fast |
| **Build/Deploy service** | Go | CPU-heavy work, container management |
| **Web app / dashboard** | TypeScript / Next.js | Best-in-class for interactive UIs |
| **Database** | PostgreSQL | Structured data, ACID, row-level security |
| **Cache/Sessions** | Redis | Fast lookups, session storage |

---

## 3. Components

### Core Services (Go)

| Service | Responsibility | Key Endpoints |
|---------|---------------|---------------|
| **API Server** | Request routing, auth middleware, rate limiting | `/api/*` (all routes) |
| **Auth Service** | SSO/SAML integration, session management, token validation | `/auth/sso`, `/auth/refresh` |
| **Project Service** | CRUD for projects, environments, team assignments | `/projects`, `/projects/:id` |
| **Build Service** | CI/CD pipeline orchestration: detect → build → test → containerize | `/builds`, `/builds/:id/logs` |
| **Deploy Service** | Container deployment to company's cloud (ECS, GKE, AKS) | `/deployments`, `/deployments/:id/status` |
| **DWH Proxy** | Reverse proxy for data warehouse queries, validates viewer credentials | `/dwh/query` |

### Web App (Next.js)

| Page | Purpose |
|------|---------|
| `/dashboard` | List all projects, filter by status |
| `/projects/:id` | Project details: status, environments, team, logs |
| `/projects/:id/deployments` | Deployment history, rollback |
| `/projects/:id/settings` | Team management, env vars, custom domains |

### CLI (Go)

| Command | Purpose |
|---------|---------|
| `vibe login` | Authenticate via SSO |
| `vibe init <name>` | Scaffold a new project with vibe.yaml |
| `vibe deploy` | Build and deploy current project |
| `vibe status` | Check deployment status |
| `vibe logs` | Stream deployment logs |
| `vibe teams` | Manage project team access |
| `vibe domains` | Manage custom domains |

---

## 4. Data Model (PostgreSQL)

Each platform instance serves one company. No cross-organization isolation.

```sql
-- Users (local to this platform instance)
users (
  id UUID PK,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  sso_identity TEXT,        -- From SSO/SAML
  created_at TIMESTAMPTZ
)

-- Projects
projects (
  id UUID PK,
  name TEXT,
  type TEXT,                -- 'static' | 'serverless' | 'container'
  git_repo TEXT,            -- GitHub repo URL
  git_branch TEXT,
  vibe_config JSONB,        -- vibe.yaml parsed config
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Project Team Memberships
project_members (
  project_id UUID FK → projects,
  user_id UUID FK → users,
  role TEXT,                -- 'owner' | 'editor' | 'viewer'
  granted_at TIMESTAMPTZ,
  PRIMARY KEY (project_id, user_id)
)

-- Deployments
deployments (
  id UUID PK,
  project_id UUID FK → projects,
  commit_sha TEXT,
  pr_number INTEGER,        -- NULL for production deploys
  environment TEXT,         -- 'production' | 'preview'
  status TEXT,              -- 'building' | 'testing' | 'deploying' | 'success' | 'failed'
  url TEXT,                 -- Deployed URL
  cloud_resource_id TEXT,   -- ECS task ID, GKE pod name, etc.
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)

-- Build Artifacts (metadata, actual files in company's S3/GCS)
build_artifacts (
  id UUID PK,
  deployment_id UUID FK → deployments,
  storage_key TEXT,         -- Company's S3/GCS key
  size_bytes BIGINT,
  created_at TIMESTAMPTZ
)

-- DWH Connectors (per platform instance)
dwh_connectors (
  id UUID PK,
  type TEXT,                -- 'bigquery' | 'snowflake' | 'redshift'
  config JSONB,             -- Connection config
  is_active BOOLEAN DEFAULT true
)

-- Audit Log
audit_logs (
  id UUID PK,
  user_id UUID FK → users,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

### Design Decisions

- **No `organizations` table** — each platform instance serves one company
- **No `org_id` on any table** — simpler queries, no multi-tenancy overhead
- **Platform config** is set at deployment time (env vars or a single config row)
- **Cloud credentials, DWH connectors, storage buckets** — all configured per platform instance

---

## 5. CI/CD Pipeline

### Pipeline Stages

```
Git Push (GitHub)
       │
       ▼
┌─────────────┐
│  1. DETECT  │  Auto-detect project type from vibe.yaml,
│  PROJECT    │  package.json, Dockerfile, or framework
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. BUILD   │  Run build command (npm run build, go build,
│             │  docker build, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. TEST    │  Run test suite (npm test, pytest, go test, etc.)
│             │  Fail fast — skip deploy on test failure
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  4. CONTAIN │  Generate Dockerfile (or use existing),
│  ERIZE    │  tag image, push to company's container registry
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  5. DEPLOY  │  Deploy to company's cloud:
│             │  - Static → S3/CloudFront (or equivalent)
│             │  - Serverless → Lambda/Cloud Functions
│             │  - Container → ECS/GKE/AKS
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  6. HEALTH  │  Ping the deployed URL, check 200 OK,
│  CHECK    │  mark deployment as 'success' or 'failed'
└─────────────┘
```

### Project Configuration (`vibe.yaml`)

```yaml
# vibe.yaml — per project
name: my-app
type: serverless              # or 'static' | 'container'
framework: nextjs             # or 'react' | 'vue' | 'go' | 'node'
build:
  command: npm run build
  output: .next/
test:
  command: npm test
deploy:
  target: ecs                 # or 'cloudflare' | 'gke' | 'aks'
  region: us-east-1
```

### Preview Environments

- Every PR gets a unique subdomain: `pr-42.myapp.vibe.company.com`
- Preview URLs are created when the PR is opened, destroyed when closed
- Production deploys only from `main`/`master` branch

### Build Artifacts

- Build output stored in the company's S3/GCS bucket
- Platform stores only the storage key (metadata), not the actual files
- Artifacts are cleaned up after N days (configurable)

---

## 6. API Design (REST)

### Authentication

All endpoints require a Bearer token (JWT from SSO session). The CLI obtains a token via `vibe login` (SSO redirect). The web app uses Next.js auth middleware.

### Endpoints

**Projects**
```
GET    /api/projects              List projects (paginated)
GET    /api/projects/:id          Get project details
POST   /api/projects              Create project (from git repo)
PUT    /api/projects/:id          Update project (vibe.yaml, settings)
DELETE /api/projects/:id          Delete project
GET    /api/projects/:id/members  Get team members
POST   /api/projects/:id/members  Add team member
DELETE /api/projects/:id/members/:userId  Remove team member
```

**Deployments**
```
GET    /api/projects/:id/deployments          List deployments
GET    /api/projects/:id/deployments/:did     Get deployment details
GET    /api/projects/:id/deployments/:did/logs  Stream logs
POST   /api/projects/:id/deploy               Trigger manual deploy
POST   /api/projects/:id/deployments/:did/rollback  Rollback
```

**DWH Proxy**
```
POST   /api/dwh/query              Query the data warehouse
GET    /api/dwh/connectors         List configured connectors
POST   /api/dwh/connectors         Add a connector (admin only)
```

**Platform Config (Admin)**
```
GET    /api/config                 Get platform config
PUT    /api/config                 Update platform config (admin only)
GET    /api/config/dwh             Manage DWH connectors (admin only)
```

### CLI API Mapping

| CLI Command | API Endpoint |
|-------------|-------------|
| `vibe login` | `POST /auth/sso` |
| `vibe init <name>` | `POST /api/projects` |
| `vibe deploy` | `POST /api/projects/:id/deploy` |
| `vibe status` | `GET /api/projects/:id/deployments/:did` |
| `vibe logs` | `GET /api/projects/:id/deployments/:did/logs` |
| `vibe teams` | `GET/POST/DELETE /api/projects/:id/members` |
| `vibe domains` | `PUT /api/projects/:id` (custom domain field) |

---

## 7. Security & Access Control

### Authentication Flow

```
CLI: vibe login
  → Opens browser to SSO provider (Okta, Azure AD, etc.)
  → User authenticates with company credentials
  → SSO redirects back with auth code
  → Platform exchanges code for JWT
  → JWT stored in CLI config (~/.vibe/config.json)
  → All subsequent CLI commands include: Authorization: Bearer <JWT>

Web: /login
  → Redirect to SSO provider
  → Same flow, JWT stored in httpOnly cookie
```

### Authorization (Per-Project Roles)

| Role | Can View | Can Deploy | Can Manage Team | Can Delete |
|------|----------|------------|-----------------|------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |

### DWH Access Model

- **No platform-managed credentials** — the platform doesn't store DWH credentials
- **Viewer's credentials pass through** — when a deployed project queries the DWH, it uses the viewer's credentials (passed in the request)
- **If the viewer lacks DWH access, the query fails** — the platform doesn't bypass this
- **Platform only proxies** — it validates the request, forwards it, returns the result

### Security Checklist

- [x] JWT-based auth (SSO-issued, short-lived, refreshable)
- [x] Per-project role enforcement at API layer
- [x] DWH proxy validates viewer has access (no platform-level bypass)
- [x] Audit log for all actions (who did what, when)
- [x] Cloud credentials encrypted at rest (AES-256)
- [x] API rate limiting (per user, per IP)
- [x] CORS configured for web app domain only

---

## 8. Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "DEPLOYMENT_FAILED",
    "message": "Container deployment to ECS failed: task definition not found",
    "details": {
      "cluster": "my-cluster",
      "service": "my-app",
      "cloud_error_code": "ResourceNotFoundException"
    },
    "request_id": "abc-123"
  }
}
```

### Key Error Codes

| Code | When | Action |
|------|------|--------|
| `AUTH_REQUIRED` | No valid token | Retry with `vibe login` |
| `PROJECT_NOT_FOUND` | Invalid project ID | Check project name/ID |
| `DEPLOYMENT_FAILED` | Build/deploy step failed | Check logs, fix and re-deploy |
| `INSUFFICIENT_PERMISSIONS` | User lacks role | Contact project owner |
| `DWH_ACCESS_DENIED` | Viewer lacks DWH access | Viewer needs DWH permissions |
| `CLOUD_API_ERROR` | Company's cloud API failed | Retry, or check cloud status |

---

## 9. Testing Strategy

| Layer | Tools | What to Test |
|-------|-------|-------------|
| **Unit** | Go test, Vitest | Service logic, parsers, validators |
| **Integration** | Testcontainers, Supertest | API endpoints, DB interactions |
| **E2E** | Playwright (web), CLI integration tests | Full deploy flow, auth flow |
| **Cloud** | Localstack (AWS), local Docker | Container build/deploy simulation |

### CLI Testing

```bash
# Mock API server for CLI tests
vibe test --mock-api http://localhost:8081

# Test a real deploy (against company's test cloud)
vibe deploy --environment preview
```

---

## 10. Out of Scope (Future Phases)

| Phase | Scope |
|-------|-------|
| **Phase 2** | CLI tool — Go CLI with all commands |
| **Phase 3** | Agent plugin — AI agent integration via CLI subcommands |
| **Phase 4** | Web app / dashboard — Next.js dashboard with partial custom branding |
| **Phase 5** | Data warehouse connectors — Proxy layer for read-only queries |

---

## Summary

This design covers the **Deployment Platform (Phase 1)** — the core CI/CD engine, API, and infrastructure orchestration layer. It is a self-hosted tool that each company deploys to manage their own projects and deploy to their own cloud. The platform does not host any infrastructure for other companies.
