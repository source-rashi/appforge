# 🔧 AppForge

> **Config-driven application generator** — define your app with JSON, generate production-ready code.

AppForge is a monorepo-powered platform that lets you describe applications through structured JSON configuration files and then generates fully functional web applications with an API backend, database, authentication, and UI.

---

## 📐 Architecture

```
appforge/
├── apps/
│   ├── web/              ← Next.js 14 (App Router, TypeScript, Tailwind CSS)
│   │                       Frontend dashboard for building & managing configs
│   └── api/              ← Node.js + Express + TypeScript
│                           REST API: config CRUD, code generation, auth
├── packages/
│   ├── config-types/     ← Shared TypeScript interfaces (AppConfig, etc.)
│   └── validators/       ← Zod schemas + validateConfig() utility
├── docker-compose.yml    ← PostgreSQL 15 for local development
├── .env.example          ← Environment variable template
└── package.json          ← npm workspaces root
```

### Data flow

```
┌─────────────────┐     JSON config      ┌─────────────────┐
│   Next.js Web   │ ──────────────────▶   │   Express API   │
│   (Dashboard)   │ ◀────────────────── │   (Generator)   │
└─────────────────┘     Generated app     └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │   PostgreSQL    │
                                          │   (Configs DB)  │
                                          └─────────────────┘
```

Both `web` and `api` import shared types from `@appforge/config-types` and use `@appforge/validators` to ensure configs are valid before processing.

---

## 🚀 Local Setup

### Prerequisites

| Tool       | Version  | Purpose                              |
| ---------- | -------- | ------------------------------------ |
| **Node.js**| `≥ 20.x` | Runtime for all JavaScript/TypeScript |
| **npm**    | `≥ 10.x` | Package manager (workspaces support) |
| **Docker** | Latest   | PostgreSQL via docker-compose        |

### 1. Clone & install

```bash
git clone https://github.com/your-org/appforge.git
cd appforge
npm install          # installs all workspace dependencies
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a random string:
#   openssl rand -base64 64
```

### 3. Start the database

```bash
docker compose up -d          # starts PostgreSQL on port 5432
docker compose ps             # verify it's healthy
```

### 4. Build shared packages

```bash
npm run build --workspace=packages/config-types
npm run build --workspace=packages/validators
```

### 5. Run dev servers

```bash
# Start both web + api concurrently:
npm run dev

# Or individually:
npm run dev --workspace=apps/api     # Express API → http://localhost:4000
npm run dev --workspace=apps/web     # Next.js    → http://localhost:3000
```

### 6. Verify

```bash
# API health check
curl http://localhost:4000/health
# → { "status": "ok", "timestamp": "...", "uptime": ... }

# Web
open http://localhost:3000
```

---

## 🧪 Running Tests

```bash
npm test                    # runs tests across all workspaces
npm test --workspace=apps/api   # run API tests only
```

---

## 📦 Available Scripts

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start all dev servers concurrently               |
| `npm run build`      | Build all workspaces                             |
| `npm test`           | Run tests across all workspaces                  |
| `npm run lint`       | Lint all workspaces                              |
| `npm run type-check` | TypeScript type checking across all workspaces   |
| `npm run clean`      | Remove node_modules, .next, dist, build dirs     |

---

## 🗂️ How Configs Work

AppForge uses a **declarative JSON configuration** to describe an entire application. A config file (`appforge.json`) contains all the metadata the generator needs:

### Config structure (simplified)

```jsonc
{
  "id": "my-saas-app",
  "name": "My SaaS App",
  "version": "1.0.0",
  "database": {
    "driver": "postgres",
    "url": "$DATABASE_URL",     // env-var reference
    "poolSize": 10
  },
  "auth": {
    "strategy": "jwt",
    "tokenExpiry": "7d",
    "providers": ["google", "github"]
  },
  "api": {
    "port": 4000,
    "corsOrigins": ["http://localhost:3000"]
  },
  "ui": {
    "appName": "My SaaS App",
    "primaryColor": "#6366f1",
    "defaultColorScheme": "dark"
  },
  "features": [
    { "name": "dark-mode", "enabled": true },
    { "name": "analytics", "enabled": false }
  ]
}
```

### Lifecycle

1. **Author** — Create or edit `appforge.json` in the web dashboard.
2. **Validate** — The `@appforge/validators` package checks the config against Zod schemas at both the client (before submit) and server (before generation).
3. **Generate** — The API reads the validated config and generates the target application code, database migrations, and deployment manifests.
4. **Deploy** — Output is a ready-to-run project (or Docker image) you can deploy anywhere.

### Type safety

Both the frontend and backend import `AppConfig` from `@appforge/config-types`, ensuring the config shape is consistent across the entire stack. If you add a new field, TypeScript will surface every location that needs updating.

---

## 🐳 Docker Services

| Service      | Image         | Port   | Credentials                     |
| ------------ | ------------- | ------ | ------------------------------- |
| **postgres** | `postgres:15` | `5432` | `appforge` / `appforge` / `appforge` |

```bash
docker compose up -d       # start
docker compose down        # stop
docker compose down -v     # stop + delete volume (reset data)
```

---

## 📁 Workspace Structure

| Workspace                  | Path                       | Description                        |
| -------------------------- | -------------------------- | ---------------------------------- |
| `@appforge/web`            | `apps/web`                 | Next.js 14 frontend                |
| `@appforge/api`            | `apps/api`                 | Express REST API                   |
| `@appforge/config-types`   | `packages/config-types`    | Shared TypeScript types            |
| `@appforge/validators`     | `packages/validators`      | Zod-based config validation        |

## 🚀 Deployment

AppForge can be deployed seamlessly to [Railway](https://railway.app/).

### Prerequisites
- A Railway account
- Railway CLI (`npm install -g @railway/cli`)

### Step-by-step

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Railway Project** (Run once)
   ```bash
   railway init
   ```
   *Follow the prompts to create a new project.*

3. **Add PostgreSQL Plugin**
   In the Railway Dashboard for your project, click **New** -> **Database** -> **Add PostgreSQL**. Railway will automatically inject the `DATABASE_URL` into your services.

4. **Set Environment Variables**
   Set the required variables in the Railway Dashboard before deploying.
   See [docs/deployment.md](docs/deployment.md) for a full reference of all required and optional environment variables.

5. **Deploy!**
   Run the deployment script from the root directory:
   ```bash
   ./deploy.sh
   ```

## 📝 Track A Submission Details (AI App Generator)

This monorepo fulfills the requirements of **Track A: AI App Generator**. 

### 🌟 Core Capabilities
- **Dynamic Application Runtime**: Uses `@appforge/validators` to parse JSON configurations and dynamically maps them to API endpoints and UI components.
- **Graceful Degradation**: If an incomplete or incorrect JSON config is passed (e.g., unknown components or missing required fields), the system validates it, creates a partial valid configuration, and returns warnings rather than crashing. 
- **Extensible Architecture**: Adding new UI components or database schemas only requires updating the Zod validators and frontend component mapper.

### ✨ Implemented Features (End-to-End)
1. **Authentication System**: JWT-based login and registration endpoints. API endpoints automatically protect themselves if the config specifies `"auth": true` or similar requirements.
2. **CSV Import System**: A robust backend service that parses uploaded CSV files, maps them to dynamic tables based on the JSON configuration, and processes them asynchronously with a job tracking status API (`/api/apps/:appId/import/:jobId/status`).
3. **Dynamic CRUD APIs**: Fully functional endpoints that automatically adapt to the provided JSON schema to read and write from PostgreSQL, supporting pagination.
4. **Mobile-Ready Frontend**: The Next.js frontend uses Tailwind CSS to ensure the dynamically generated UI is completely responsive.

---

## 📝 License

Private — All rights reserved.
