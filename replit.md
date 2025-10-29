# Lean Workforce

## Overview

Lean Workforce is an intelligent talent matching and project continuity platform that automates workforce allocation. It connects businesses with projects to candidates, using AI for skill extraction, candidate-project matching, and real-time risk prediction via Jira integration. The platform features dual Business and Candidate portals, automated skill mapping, fit score calculation, and proactive project risk management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Technology Stack**: React with TypeScript, Vite, shadcn/ui (Radix UI + Tailwind CSS).

**Design Philosophy**: Workflow-first, minimalist monochrome design with functional color accents. Inter font family with clear typographic hierarchy.

**State Management**: TanStack Query for server state and data fetching.

**Routing**: Wouter for client-side routing, distinguishing `/business/*` and `/candidate/*` paths.

**Key Features**:
- **CV Upload**: Multi-stage visual feedback and progress tracking.
- **Job Recommendations**: AI-powered matches (>70% fit score) with explainability (skill, experience, soft skill breakdown).
- **Project Detail View**: Grouped task view (defaulting to sprint), milestone list timeline, Jira description parsing (ADF).
- **Profile Management**: AI-extracted skills and experience displayed post-CV upload.

### Backend

**Runtime**: Node.js with Express.js, TypeScript, ES modules.

**API Design**: RESTful API with endpoints for projects, milestones, candidates, fit scores, and Jira integration.

**File Upload**: Multer middleware for PDF, DOC, DOCX, TXT with validation and 10MB limit.

**Document Processing**: Multi-format CV parser with retry logic and error recovery.

**Background Job Queue**: Async processing for CV analysis, fit score calculation, and skill map generation, with progress tracking and email notifications (SendGrid).

**AI Integration**: Google Gemini for skill mapping, CV analysis, fit score calculation, and risk prediction.

**Storage Layer**: Abstracted interface using Drizzle ORM with PostgreSQL.

### Data Storage

**Database**: PostgreSQL via Neon serverless driver.

**ORM**: Drizzle ORM for type-safe operations.

**Schema Design**: Tables for `projects`, `milestones`, `candidates`, `fitScores`, `riskAlerts`, `savedJobs`, `applications`, and `candidateActions`.

**Relationships**: One-to-many between projects and milestones; implicit many-to-many between candidates and milestones.

**Migrations**: Drizzle Kit for schema management.

### Authentication and Authorization

**Authentication**: Magic Link system with 10-minute TTL, single-use tokens, and rate limiting. Automatically detects user roles and creates shadow accounts for new candidates.

**Session Management**: Client-side localStorage for user data (future plans for server-side tokens).

**Authentication Guards**: Role-based access control for business and candidate routes; public access for guest CV upload.

## External Dependencies

**Google Gemini AI**: Primary AI service for NLP tasks (skill extraction, matching, risk analysis). Rate-limited with retries.

**Jira Cloud API**: Integration via `jira.js` with dual authentication (Replit OAuth Connector or manual credentials).

**Jira Integration Features**:
- Project import and issue synchronization (non-Epic issues as milestones).
- Epic & Sprint tracking for task organization.
- Progress monitoring and risk management.
- Uses enhanced JQL search API for issue fetching.

**Database**: Neon PostgreSQL serverless database.

**Third-party UI Libraries**: Radix UI primitives, react-hook-form (Zod validation), date-fns.