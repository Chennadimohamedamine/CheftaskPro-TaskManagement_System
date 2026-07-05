# TaskFlow Pro - Ultimate Full-Stack Project Management Platform

TaskFlow Pro is a highly polished, robust, enterprise-grade project management application designed for seamless team collaboration, dynamic Kanban workflows, real-time reactive notifications, and absolute administrative control. 

This repository features a modern, secure, full-stack architecture built from the ground up to support containerized workflows and relational performance.

---

##  Visual Identity & UI Design Overhaul

TaskFlow Pro has received a comprehensive **aesthetic redesign** focusing on elite visual hierarchy, balanced typography, and responsive modern components:
- **The Obsidian Accent Theme**: Replaced generic components with deep-space elements. Featuring **Indigo and Violet gradients** (`from-indigo-600 to-violet-600`) as primary action colors, coupled with high-contrast slate backgrounds and subtle emerald indicator highlights.
- **Premium Glassmorphism**: Overlays, modal backdrops, and navigation panels feature custom-tuned backdrop-blurs (`backdrop-blur-md bg-white/30`) for premium spatial depth.
- **Dynamic Micro-Interactions**: Smooth entrance translations, card drag-and-drop animations, and active state indicators (utilizing `motion/react`) guide users through work states intuitively.
- **Refined Data Densities**: Beautiful, custom-spaced rounded corner cards (`rounded-2xl`), premium shadow elevations, and strict typography pairings using *Inter* and *Space Grotesk*.

---

## Core Technical Architecture

The platform is structured into clean, isolated layers engineered for high scaling, low memory footprints, and instant user feedback:

```
                  ┌──────────────────────────────┐
                  │      React 18 / Vite SPA     │
                  └──────────────┬───────────────┘
                                 │
                     (HTTP / SSE Streaming)
                                 │
                     ┌───────────▼───────────┐
                     │     NestJS Engine     │
                     └───────────┬───────────┘
                                 │
                         (TypeORM Queries)
                                 │
                    ┌────────────▼────────────┐
                    │ PostgreSQL (Production) │
                    └─────────────────────────┘
```

1. **Frontend Workspace (React 18, Vite, Tailwind CSS, TypeScript)**: Single-Page Application optimized for client efficiency, custom Axios security interceptors, active state management, and real-time streaming connections.
2. **Backend Engine (NestJS, Express, TypeORM, TypeScript)**: Fully modular, typed server implementing security guards, transactional decorators, circular-dependency mitigation (`forwardRef`), and streaming pipelines.
3. **Relational Layer (PostgreSQL)**: Fully persistent relational schema containing:
   - `User` entity (hashed credentials, activation locks, RBAC statuses).
   - `Project` & `Team` (squad containment, leader definitions).
   - `Task` & `Comment` (hierarchical roadmaps, execution logs).
   - `Notification` & `AuditLog` (real-time stream queue, system telemetry compliance).

---

## Key Operational Features

### 1. Dual-Token Authentication Lifecycle (A to Z)
TaskFlow Pro employs an industry-standard security handshake to isolate user identities:
- **Short-Lived Access Token**: Transmitted as JSON on successful authentication and saved strictly in-memory by the browser. Appended to all outgoing API calls inside custom headers (`Authorization: Bearer <token>`).
- **Secure Refresh Cookie**: Sent to the browser as an `HttpOnly`, `SameSite=Lax`, secure cookie, inaccessible to malicious client-side scripts.
- **Seamless Token Rotation**: If the React app receives a `401 Unauthorized` response due to access token expiration, an automatic Axios interceptor intercepts the failure, requests a token update from `/api/v1/auth/refresh`, and transparently replays the original user query.

### 2. Real-Time Push Stream (Server-Sent Events)
Say goodbye to costly, heavy database polling intervals:
- **RxJS Subject Hub**: Inside the NestJS backend, an internal event stream broker watches for task assignments, comment additions, and administrative actions.
- **Server-Sent Events (SSE)**: The server pushes lightweight updates down to client connections securely.
- **Dynamic Badge Counter**: The React client maintains an active `EventSource` connection, updating notification counters instantly with an elegant in-app toast sound and micro-badges.

### 3. Compliant Administrative Audits
- Privileged actions (such as project deletions or account locks) automatically dispatch asynchronous telemetry tasks to commit entries to the `AuditLog` table. This logs the executor's identity, timestamps, target entities, and operation metrics permanently.

---

## Quickstart: Run Everything with Docker Compose

TaskFlow Pro is fully configured to run with **a single command**. The Docker infrastructure builds the frontend React bundles, spins up a PostgreSQL 15 database instance, applies all TypeORM schemas, runs seeding routines, and provisions the NestJS application server.

### Prerequisites
- [Docker](https://www.docker.com/get-started) installed.
- [Docker Compose](https://docs.docker.com/compose/) installed.

### Execution
Run the following command at the project root directory:
```bash
docker compose up --build
```

This starts:
1. **PostgreSQL Database Container (`taskflow-db`)** listening on port `5432` with an isolated Docker volume for persistent database storage.
2. **NestJS Application Container (`taskflow-app`)** listening on port `3000`, containing both backend API routes and the fully built production React client.

---

## Local Development (Manual Configuration)

If you prefer to run the components independently outside of Docker containers:

### 1. Database Provisioning
Configure your local PostgreSQL server or target Cloud DB and establish the following environment configurations in a `.env` file at the root:

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_pg_user
DB_PASSWORD=your_secure_password
DB_DATABASE=taskflow_prod_db

# Application Configuration
JWT_SECRET=your_highly_secure_token_secret_here
NODE_ENV=development
```

### 2. Install Project Dependencies
Run dependency installations from the root:
```bash
npm install
```

### 3. Run Development Commands
- **Lint Codebase & Type Check**:
  ```bash
  npm run lint
  ```
- **Compile Production Builds**:
  ```bash
  npm run build
  ```
- **Boot Active Dev Server**:
  ```bash
  npm run dev
  ```

---

## Automated Admin Seeding

On initial system startup, an idempotent database seed hook runs automatically. If no administrator account exists in the relational user registry, it registers the default admin console login credentials safely:

- **Admin Email**: `admin@taskflow.local`
- **Password**: `admin_secure_pass` *(or configured via `.env`)*

Use this account to access the `/admin` registry, manage Project Managers, audit security logs, and provision new user workspaces.

---

## Repository Map

```
├── .env.example              # Template containing all environment requirements
├── Dockerfile                # Production multi-stage build instructions
├── docker-compose.yml        # Orchestration containing app and pg db services
├── HOW_IT_WORKS.md           # Extensive internal operations guide for teams
├── package.json              # Shared package scripts and workspace configurations
├── server.ts                 # Full-Stack entry-point routing to NestJS / Vite fallback
├── src/                      # Client-Side React SPA Code
│   ├── App.tsx               # Primary Client routing and Context mounting
│   ├── components/           # Reusable UI component modules and layouts
│   ├── pages/                # Workspace views (Admin, Chef de Projet, Developer panels)
│   └── index.css             # Tailwind imports and Obsidian typography themes
└── backend/                  # NestJS TypeScript API engine
    └── src/
        ├── config/           # PostgreSQL TypeORM connections
        └── modules/          # Encapsulated feature controllers, services, and entities
```

---

*Crafted for secure operations, lightning-fast execution, and gorgeous visual experiences.*