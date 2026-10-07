# ReachInbox Email Job Scheduler

[![Project Status: 100% Completed](https://img.shields.io/badge/Project_Status-100%25_Completed-00B050?style=for-the-badge&logo=checkmarx)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.18-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue_Scheduler-DC382D?style=for-the-badge&logo=redis)](https://docs.bullmq.io/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-Search_Index-005571?style=for-the-badge&logo=elasticsearch)](https://www.elastic.co/)

> A production-grade Email Scheduler service and interactive dashboard built for high-scale, reliable delayed job processing, provider rate-limiting, live queue visibility, Elasticsearch indexing, and Slack notifications.

---

## 📋 Table of Contents
- [🎯 Project Completion Summary](#-project-completion-summary)
- [🏗️ System Architecture & Workflow](#️-system-architecture--workflow)
- [✨ Key Requirements & Feature Coverage](#-key-requirements--feature-coverage)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start: How to Run Locally](#-quick-start-how-to-run-locally)
- [🐳 Running via Docker Compose](#-running-via-docker-compose)
- [🧪 Testing & Verification Walkthrough](#-testing--verification-walkthrough)

---

## 🎯 Project Completion Summary

**Completion Status:** `100% Fully Implemented & Production-Ready`

All requirements from the ReachInbox Full-Stack Email Job Scheduler have been built, integrated, and verified:

| Requirement Category | Implementation Details | Status |
| :--- | :--- | :---: |
| **BullMQ Delayed Jobs** | Relies strictly on BullMQ delayed jobs backed by Redis (No cron jobs). | ✅ **100%** |
| **Server Restart Resilience** | Restores state from database on startup to re-queue un-sent emails with remaining delays. | ✅ **100%** |
| **Idempotency** | Prevents duplicate sends by verifying `SENT` state prior to execution. | ✅ **100%** |
| **Fake SMTP Sending** | Dispatches emails via Ethereal Email test accounts and stores live web preview URLs. | ✅ **100%** |
| **Elasticsearch Search** | Indexes all emails into Elasticsearch index `emails` for instant full-text search with DB fallback. | ✅ **100%** |
| **BullMQ Live Board** | Mounts `@bull-board/express` dashboard at `/admin/queues` for real-time queue visibility. | ✅ **100%** |
| **Throttling & Concurrency** | Configurable worker concurrency (`CONCURRENCY=5`) & provider delay (`delaySeconds`). | ✅ **100%** |
| **Hourly Rate Limiting** | Redis atomic sliding window counter (`email_rate:{sender}:{hourKey}`). Reschedules excess jobs cleanly. | ✅ **100%** |
| **Slack Alert Integration** | Dispatches live Slack warning messages on rate limit triggers via Webhooks or OAuth. | ✅ **100%** |
| **Figma Matched Frontend** | 5 pixel-perfect screens: Login, Scheduled Emails, Sent Emails, Email Detail, Compose Modal. | ✅ **100%** |
| **Universal Attachments** | Supports attaching any file format (`.pdf`, `.png`, `.zip`, `.docx`, etc.) via Paperclip icon. | ✅ **100%** |
| **Lead File Parser** | Parses email addresses from CSV/text files and auto-populates recipient fields. | ✅ **100%** |

---

## 🏗️ System Architecture & Workflow

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ React Frontend (Vite)  │ ───> │   Express API Server    │ ───> │ Prisma ORM (SQLite/PG)  │
│  http://localhost:3000 │ <─── │  http://localhost:5000  │ <─── │   State & Email Logs    │
└────────────────────────┘      └────────────┬────────────┘      └─────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
         ┌─────────────────────────┐                 ┌─────────────────────────┐
         │  BullMQ Queue (Redis)   │                 │  Elasticsearch Service  │
         │   Delayed Jobs Manager  │                 │   Full-Text Indexing    │
         └─────────────┬───────────┘                 └─────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐                 ┌─────────────────────────┐
         │  BullMQ Worker Loop     │ ──────────────> │   Slack Alerts Service  │
         │  (Concurrency = 5)      │ (On Rate Limit) │  OAuth & Webhook Calls  │
         └─────────────┬───────────┘                 └─────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   Ethereal Fake SMTP    │
         │ Live Preview Generation │
         └─────────────────────────┘
```

---

## ✨ Key Requirements & Feature Coverage

### 1. Core Scheduling & Persistence Engine
- **No Cron Jobs:** Uses BullMQ delayed jobs (`{ delay: initialDelayMs }`) backed by Redis.
- **State Recovery Across Server Restarts:** On startup, `src/index.ts` fetches pending email jobs from the database and re-adds them to BullMQ using deterministic job IDs (`email-{emailLogId}`). Scheduled emails send at the correct time without starting from scratch.
- **Idempotency:** Email state is tracked in the DB before dispatch. Jobs marked as `SENT` are safely skipped.

### 2. Rate Limiting, Throttling & Worker Concurrency
- **Worker Concurrency:** Configurable concurrency level (`CONCURRENCY` env var, default: `5` workers).
- **Provider Throttling Delay:** Configurable minimum delay between individual email sends (`delaySeconds`, e.g. 2s minimum).
- **Hourly Rate Limiting:**
  - Redis atomic counter: `email_rate:{senderEmail}:{YYYYMMDDHH}`.
  - **No Dropped Jobs:** When a sender's quota is reached, jobs are delayed and rescheduled to the start of the next hour window (`nextWindowStart`) while preserving job order.

### 3. Real-Time Slack Notifications
- **Live Slack Alerts:** Dispatches a formatted warning message to Slack when a sender hits their hourly limit.
- **Disconnect / Reconnect Safety:** Disconnected states log gracefully without crashing; reconnecting resumes alerts instantly without server redeployments.
- Includes a dedicated **"Test Live Slack Alert"** button in the dashboard modal.

### 4. Elasticsearch Search Integration
- Indexes all scheduled and sent emails into Elasticsearch (`emails` index).
- Multi-match text search across `subject`, `body`, `recipient`, and `sender` with fuzzy matching.
- Automatic database query fallback if Elasticsearch service is starting or offline.

### 5. BullMQ Live Board UI
- Accessible at `http://localhost:5000/admin/queues` via `@bull-board/express`.

### 6. Pixel-Perfect Figma Matched Dashboard
- **Login Screen:** Google OAuth & Quick Demo Login modal.
- **Scheduled Emails View:** Orange schedule badges (`Tue 9:15:12 AM - Scheduled`).
- **Sent Emails View:** Grey sent badges (`Sent`) with Ethereal preview links.
- **Email Detail View:** Subject reference IDs, sender avatar, callout box, and attachment previews.
- **Compose Email Modal:** Universal file attachment support (`📎`), CSV lead uploader, Subject, Body, Delay seconds, Hourly limit, text toolbar, and **Send Later** popover with dropdown presets.

---

## 🛠️ Tech Stack

- **Backend:** TypeScript, Express.js, BullMQ, ioredis, Prisma (SQLite / PostgreSQL), Nodemailer (Ethereal Email), Elasticsearch Client, `@bull-board/express`, Multer, `csv-parse`.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Date-fns, Axios.
- **Infra / DevOps:** Docker, Docker Compose, Redis, PostgreSQL, Elasticsearch.

---

## 🚀 Quick Start: How to Run Locally

### Prerequisites
- **Node.js:** v18+ or v20+ installed.
- **Redis Server:** Running locally on `127.0.0.1:6379` (or via Docker).

---

### Step 1: Clone the Repository
```bash
git clone <your-github-repo-url>
cd "Email Job Scheduler"
```

### Step 2: Start the Backend Server
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
*Backend runs on `http://localhost:5000`*  
*BullMQ Board is live at `http://localhost:5000/admin/queues`*

### Step 3: Start the Frontend Application
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🐳 Running via Docker Compose

Run the entire full-stack application (PostgreSQL, Redis, Elasticsearch, Backend, Frontend) with a single command:

```bash
docker-compose up --build
```

### Access Points:
- 🌐 **Frontend Application:** `http://localhost:3000`
- ⚙️ **Backend API:** `http://localhost:5000`
- 📊 **BullMQ Live Board:** `http://localhost:5000/admin/queues`
- 🔍 **Elasticsearch Node:** `http://localhost:9200`

---

## 🧪 Testing & Verification Walkthrough

1. **Login:** Open `http://localhost:3000` and click **"Login with Google"** or **"Quick Demo Login"**.
2. **Schedule Emails:** Click the green **"Compose"** button.
   - Click **"Upload CSV"** and select [`sample_leads.csv`](file:///d:/projects/Email%20Job%20Scheduler/sample_leads.csv) (loads 5 lead emails).
   - Set **Delay between 2 emails** (e.g. `2` seconds).
   - Set **Hourly Limit** (e.g. `5` emails/hr to test rate limiting).
   - Click the **Paperclip (`📎`)** icon to attach any file format (`.pdf`, `.png`, `.doc`, etc.).
   - Click **Schedule**.
3. **Observe Live Dispatch:**
   - Watch emails transition from **Scheduled** (orange badge) to **Sent** (grey badge).
   - Click **"Preview"** on sent emails to view the Ethereal fake SMTP email in your browser!
   - Open `http://localhost:5000/admin/queues` to see BullMQ workers processing jobs.
4. **Test Elasticsearch Search:** Type any keyword (e.g. `Meeting`, `Project`, `John`) in the search bar.
5. **Test Slack Alerts:** Click **"Connect Slack"** in the sidebar, input a Slack Webhook or Bot Token, and click **"Test Live Slack Alert"**.

---

## 📦 How to Push & Share to GitHub

Follow these steps to initialize Git and push the project to your GitHub repository:

```bash
# 1. Initialize Git repository
git init

# 2. Add all project files
git add .

# 3. Create initial commit
git commit -m "feat: complete production-grade Email Job Scheduler & Dashboard"

# 4. Create a new repository on GitHub (https://github.com/new) and link remote:
git remote add origin https://github.com/YOUR_USERNAME/email-job-scheduler.git

# 5. Push to GitHub main branch
git branch -M main
git push -u origin main
```

Now share your GitHub repository link with your friend or reviewer! 🚀

---

## 📄 License
Distributed under the MIT License. Built for ReachInbox Hiring Assignment.
