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

## Recent Production Enhancements (P0/P1 Features)

### P0: Critical Production Features

**Jira Sync Error Handling** (October 2025):
- Added `jiraSyncLogs` table to track all Jira synchronization attempts with full error details and retry capability.
- Added sync status tracking fields to projects: `lastJiraSyncAt`, `lastJiraSyncStatus`, `lastJiraSyncError`.
- Created `jira-error-handler.ts` utility for error categorization (auth, network, rate-limit, validation).
- Added API endpoints: `/api/jira/sync-logs` (all logs) and `/api/jira/failed-syncs` (failed only).
- Storage methods: `createJiraSyncLog`, `getJiraSyncLogsByProject`, `getAllJiraSyncLogs`.

**Encryption Key Production Requirement** (October 2025):
- `ENCRYPTION_KEY` now mandatory in production environments (fails hard on startup if missing).
- Development mode allows temporary key with console warning for developer convenience.
- Prevents production deployments without proper encryption security.

**Candidate Double-Booking Prevention** (October 2025):
- Added assignment lifecycle fields to milestones: `assignmentStatus`, `assignmentConfirmedAt`, `backupAssignmentStatus`.
- Created `assignment-validator.ts` utility with validation functions:
  - `validateCandidateAssignment`: Prevents assigning candidates to overlapping projects.
  - `validateBackupAssignment`: Ensures backups don't conflict with primary assignments.
  - `confirmCandidateAssignment`: Marks assignment as confirmed (locks it in).
  - `rejectCandidateAssignment`: Frees up candidate for other opportunities.
- **Integration pending**: Validator functions created but not yet wired into assignment API endpoints.

### P1: High Priority Features

**Application Status Workflow** (October 2025):
- Leverages existing `applications` table with comprehensive status tracking.
- Status values: pending, under_review, interview_scheduled, accepted, rejected, withdrawn.
- Business can track candidate application lifecycle through existing infrastructure.

**4-Tier Risk Escalation System** (October 2025):
- Updated AI risk analysis from 3-tier to 4-tier escalation:
  - **Low** (10-20% delay): Monitor only, notify business.
  - **Medium** (20-30% delay): Notify + prepare backup candidate list.
  - **High** (30-40% delay): Notify + backup ready, require business decision within 24h.
  - **Critical** (>40% delay): Auto-activate backup + escalate to management.
- Updated `RiskAnalysis` type and Gemini AI prompt to support all four tiers.
- **Integration pending**: Downstream logic in `monitorProjectDelays` needs updates to implement tier-specific escalation behaviors.

**Multi-Business Competition** (October 2025):
- Added `businessInterests` table to track multiple businesses competing for same candidate.
- Priority scoring algorithm: 40% fit score + 30% budget + 30% candidate preference.
- Normalizes budgets across competing offers for fair comparison.
- API endpoints for creating interests, adjusting offers, rating opportunities, viewing top 3.
- **UI pending**: Candidate dashboard integration to display competing offers.

**Business Review Workflow** (October 2025):
- Added human-in-the-loop validation to prevent spam notifications.
- Schema: `skillMapApproved` and `candidatesNotified` flags on milestones.
- Workflow enforces:
  1. Business reviews/edits AI-generated skill map → Approve
  2. System recalculates fit scores with approved skill map
  3. Business reviews top candidates → Selects who to notify
  4. Notification requires both skill map approval and candidate selection
- API endpoints: PATCH `/api/milestones/:id/approve-skillmap`, POST `/api/milestones/:id/notify-candidates`.
- **UI pending**: Business dashboard integration for skill map review and candidate selection.