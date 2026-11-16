# Udyog Saarthi

AI-assisted employment intelligence and recruitment workflow platform. This MVP includes candidate/employer/admin role-aware screens, job discovery, explainable skills matching, applications with employer review SLAs, and an employer/admin operations dashboard.

## Requirements
- Node.js 20+
- MongoDB (local or MongoDB Atlas)

## Run locally
1. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. From this folder run `npm install`.
3. Run `npm run install:all` (or `npm install --prefix backend && npm install --prefix frontend`).
4. Run `npm run dev`.
5. Open http://localhost:5173. API runs at http://localhost:5000/api and health at `/api/health`.

The app can start without MongoDB in demo mode using in-memory seed data, but data will reset when the backend restarts. Configure MongoDB for persistence.

## Real job data
- Remotive public API is integrated for remote roles. Its feed is remote-focused and listings may be delayed; verify each vacancy on the source before applying.
- Adzuna India integration is enabled when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are configured. Obtain credentials from Adzuna and review its API terms/attribution requirements.
- Demo seed jobs are labelled `Demo data`; they are not live vacancies.

## AI
Set `OPENAI_API_KEY` to enable LLM-generated plain-language job explanations and skill-gap guidance. Without a key, deterministic matching still works. Do not expose API keys in frontend variables.

## SLA workflow
Applications receive a configurable review deadline (`REVIEW_SLA_DAYS`, default 7). A scheduled worker runs every hour, marks unanswered applications `overdue`, and records escalation events. It does not auto-reject candidates. In production, connect email/SMS delivery and use a persistent queue/worker service.

## Roles
Register as candidate or employer. Admin role is not publicly selectable; promote an account manually in MongoDB by setting `role: "admin"`.

## Before production
Add email verification, password reset, rate limiting, audit logging, malware scanning for uploads, privacy/consent flows, accessibility testing, real notification delivery, and proper monitoring. Do not use demo data as genuine job vacancies.
