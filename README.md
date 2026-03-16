# Distributed Task Processing System (DTS)

A full-stack real-time task queue management system built with **React**, **Node.js**, **BullMQ**, **Redis**, and **MongoDB**. Submit batches of tasks, watch them get processed live, monitor metrics with charts, and manage workers — all from a single dashboard.

---

## Live Demo

- **Frontend:** [https://dts-phi.vercel.app/](https://dts-phi.vercel.app)
- **Backend:** [https://dts-6k61.onrender.com](https://dts-6k61.onrender.com)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Socket.IO Events](#socketio-events)
- [How It Works](#how-it-works)
- [Deployment](#deployment)

---

## Features

- **Submit Tasks** — create 1–100 tasks at once with priority (high/medium/low), task type, and optional delay
- **Real-Time Updates** — task status changes (queued → processing → completed/failed) pushed live via Socket.IO
- **Progress Tracking** — each task reports step-by-step progress (0% → 100%) while processing
- **Queue Control** — pause and resume the queue at any time
- **Cancel & Retry** — cancel queued tasks or retry failed ones
- **Worker Monitor** — see which workers are active, idle, and how many tasks they've processed
- **Metrics Dashboard** — live charts for task distribution, throughput, latency, and completion rate
- **CSV Export** — download the task list as a CSV file
- **Dark Mode** — toggle between light and dark theme (persisted in localStorage)
- **Toast Notifications** — success/error feedback on every action

---

## Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| Node.js (ESM) | Runtime |
| Express 5 | REST API server |
| Socket.IO | Real-time bidirectional events |
| BullMQ | Redis-backed job queue |
| IORedis | Redis client |
| Mongoose | MongoDB ODM |
| dotenv | Environment variable management |

### Frontend
| Package | Purpose |
|---------|---------|
| React 19 | UI library |
| Vite | Build tool and dev server |
| Axios | HTTP client for API calls |
| Socket.IO Client | Real-time event listener |
| Recharts | Chart components |
| Tailwind CSS | Utility-first styling |

### Infrastructure
| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Task data persistence |
| Redis (Upstash / Redis Cloud) | BullMQ queue storage |
| Render | Backend hosting |
| Vercel | Frontend hosting |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                                                                 │
│  TaskForm → POST /api/tasks         Socket.IO ← taskUpdate     │
│  TaskTable → GET /api/tasks                  ← taskCreated     │
│  Dashboard → POST /api/queue/pause           ← queueState      │
│  MetricsDashboard → GET /api/tasks/stats     ← stats           │
│  WorkerStatus                                ← workerStatus    │
└────────────────────┬────────────────────────────┬──────────────┘
                     │ HTTP REST                  │ WebSocket
                     ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node.js Server (Render)                     │
│                                                                 │
│   Express App          Socket.IO Server       BullMQ Worker     │
│   ├── /api/tasks       ├── emits: taskUpdate  ├── picks jobs    │
│   ├── /api/tasks/stats ├── emits: stats       ├── updates DB    │
│   └── /api/queue       └── emits: workerStatus└── reports done │
│                                                                 │
│   QueueEvents (listens to Redis for job lifecycle events)       │
└──────────────┬──────────────────────────────────┬──────────────┘
               │                                  │
               ▼                                  ▼
     ┌─────────────────┐               ┌─────────────────────┐
     │  MongoDB Atlas  │               │   Redis (BullMQ)    │
     │                 │               │                     │
     │  Task documents │               │  Job queue storage  │
     │  (full history) │               │  (priority queues)  │
     └─────────────────┘               └─────────────────────┘
```

### Request Flow

1. User fills the **TaskForm** and clicks Submit
2. Frontend sends `POST /api/tasks` to the backend
3. Backend creates **Task documents** in MongoDB (status: `queued`)
4. Backend adds **jobs to the BullMQ queue** in Redis with priority ordering
5. Backend emits `taskCreated` via Socket.IO so the table updates instantly
6. The **BullMQ Worker** (running in the same Node process) picks up the job
7. Worker updates MongoDB status → `processing`, reports progress in 5 steps
8. **QueueEvents** (Redis pub/sub) triggers Socket.IO broadcasts for every lifecycle change
9. Worker finishes, updates MongoDB → `completed` (or `failed` with 20% chance)
10. Frontend receives all updates in real time — no polling needed

---

## Project Structure

```
DTS/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection (singleton)
│   │   └── redis.js           # Redis connection (singleton)
│   ├── controllers/
│   │   └── taskController.js  # All route handler logic
│   ├── models/
│   │   └── task.js            # Mongoose Task schema
│   ├── queues/
│   │   └── taskQueue.js       # BullMQ Queue instance
│   ├── routes/
│   │   └── taskRoute.js       # Express route definitions
│   ├── worker/
│   │   └── worker.js          # BullMQ Worker (job processor)
│   ├── app.js                 # Express app + CORS setup
│   ├── server.js              # Entry point: HTTP + Socket.IO + Worker
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskForm.jsx          # Task submission form
│   │   │   ├── TaskTable.jsx         # Task list with filters + actions
│   │   │   ├── MetricsDashboard.jsx  # Charts and stats cards
│   │   │   ├── WorkerStatus.jsx      # Worker monitor panel
│   │   │   ├── TaskDetailModal.jsx   # Full task detail popup
│   │   │   └── ToastProvider.jsx     # Global toast notifications
│   │   ├── context/
│   │   │   └── DarkModeContext.jsx   # Dark mode toggle + localStorage
│   │   ├── pages/
│   │   │   └── Dashboard.jsx         # Main page layout
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance
│   │   │   └── socket.js            # Socket.IO client instance
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── render.yaml                # Render deployment config
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running Redis instance (local or cloud)
- A MongoDB instance (local or Atlas)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/DTS.git
cd DTS
```

### 2. Setup the backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/dts
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
```

Start the backend (server + worker together):

```bash
npm start
```

### 3. Setup the frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:4000
```

Start the frontend dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Port to run the server on | `4000` |
| `MONGO_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `REDIS_URL` | No* | Full Redis URL (used by cloud providers) | `rediss://...` |
| `REDIS_HOST` | No* | Redis hostname (if not using REDIS_URL) | `localhost` |
| `REDIS_PORT` | No* | Redis port | `6379` |
| `REDIS_USERNAME` | No | Redis username (if auth enabled) | `default` |
| `REDIS_PASSWORD` | No | Redis password | `yourpassword` |
| `REDIS_TLS` | No | Enable TLS for Redis connection | `true` |
| `FRONTEND_URL` | No | Allowed CORS origin for production | `https://yourapp.vercel.app` |

> *Either `REDIS_URL` **or** `REDIS_HOST`/`REDIS_PORT` must be provided.

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | No | Backend URL (no trailing slash) | `https://yourapp.onrender.com` |

---

## API Reference

All endpoints are prefixed with `/api`.

### Tasks

#### `POST /api/tasks`
Create and enqueue one or more tasks.

**Request Body:**
```json
{
  "user": "john",
  "taskType": "data-processing",
  "numberOfTasks": 5,
  "priority": "high",
  "delay": 0
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `user` | string | Yes | any string |
| `taskType` | string | Yes | `data-processing`, `image-processing`, `email-sender` |
| `numberOfTasks` | number | Yes | 1–100 |
| `priority` | string | No | `high`, `medium` (default), `low` |
| `delay` | number | No | milliseconds to delay processing |

**Response:** `201` with array of created task objects

---

#### `GET /api/tasks`
Get the latest 100 tasks (newest first).

**Response:**
```json
[
  {
    "_id": "...",
    "taskId": "uuid-...",
    "user": "john",
    "type": "data-processing",
    "priority": "high",
    "status": "completed",
    "progress": 100,
    "latency": 843,
    "workerId": "98026",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "completedAt": "2025-01-01T00:00:01.000Z"
  }
]
```

---

#### `GET /api/tasks/stats`
Get aggregated task statistics.

**Query Params:** `?type=data-processing` (optional)

**Response:**
```json
{
  "total": 50,
  "queued": 5,
  "processing": 2,
  "completed": 38,
  "failed": 4,
  "cancelled": 1,
  "avgLatency": 743,
  "completedCount": 38
}
```

---

#### `DELETE /api/tasks/:id`
Cancel a queued task. Only works if the task status is `queued`.

**Response:** `200` with updated task object

---

#### `POST /api/tasks/:id/retry`
Retry a failed task. Only works if the task status is `failed`.

**Response:** `200` with updated task object

---

### Queue

#### `POST /api/queue/pause`
Pause the task queue. Workers will finish the current job but won't pick up new ones.

#### `POST /api/queue/resume`
Resume a paused queue.

---

## Socket.IO Events

The backend emits these events to all connected clients in real time.

| Event | Payload | Description |
|-------|---------|-------------|
| `taskCreated` | Task object | A new task was added to the queue |
| `taskUpdate` | Partial task object | A task's status, progress, or data changed |
| `queueState` | `{ paused: boolean }` | Queue was paused or resumed |
| `stats` | Stats object | Emitted every second with latest stats |
| `workerUpdate` | Worker object | A single worker's status changed |
| `workerStatus` | Array of workers | Full worker list refresh |

---

## How It Works

### Task Priority

BullMQ processes jobs with lower priority numbers first. The app maps:

| User Priority | BullMQ Priority |
|---------------|-----------------|
| `high` | `1` (processed first) |
| `medium` | `2` |
| `low` | `3` (processed last) |

### Task Processing Simulation

Each task simulates real work:

- **Duration:** `(inputNumber / 200 + Math.random()) * 1000` ms
- **Progress:** Reported in 5 equal steps (20% increments)
- **Failure rate:** 20% chance of random failure (for testing error handling)
- **Latency:** Total execution time is recorded in milliseconds

### Worker and Server in One Process

The BullMQ Worker runs **inside the same Node.js process** as the HTTP server. When `server.js` starts:

1. MongoDB connects
2. `worker.js` is dynamically imported (`await import(...)`) so it starts after the DB is ready
3. HTTP server starts listening
4. Socket.IO and QueueEvents begin watching Redis for job lifecycle changes

This means a single `npm start` command runs everything.

### Real-Time Events Pipeline

```
Redis (BullMQ job lifecycle)
    → QueueEvents (in server.js)
        → Socket.IO emit
            → All connected browser clients
                → React state update
                    → UI re-renders
```

---

## Deployment

### Frontend → Vercel

1. Import the repo in [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash)

### Backend → Render

1. Connect repo at [render.com](https://render.com) → New Web Service
2. Set **Root Directory** to `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add environment variables:
   - `MONGO_URI` = MongoDB Atlas connection string
   - `REDIS_URL` = Redis connection string (Upstash or Redis Cloud)
   - `FRONTEND_URL` = your Vercel frontend URL
   - `REDIS_TLS` = `true` (if your Redis provider requires TLS)

> **Free Redis options:** [Upstash](https://upstash.com) (10k requests/day free) or [Redis Cloud](https://redis.com/try-free/) (30MB free)
> **Free MongoDB:** [MongoDB Atlas](https://www.mongodb.com/atlas) (512MB free M0 cluster)

---

## Screenshots

> *(Add screenshots of the dashboard, task table, and metrics here)*

---

## License

MIT
