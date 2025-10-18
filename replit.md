# AI Workforce OS

## Overview

AI Workforce OS is an intelligent talent matching and project continuity platform that leverages Google Gemini AI to automate workforce allocation. The system connects businesses creating projects with milestones to candidates uploading CVs, using AI for skill extraction, candidate-project matching, and real-time risk prediction through Jira API integration.

The platform operates as a dual-portal system with distinct Business and Candidate interfaces, featuring automated skill mapping, fit score calculation, and proactive project risk management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, using Vite as the build tool and bundler.

**UI Framework**: shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS following a minimalist monochrome design system.

**Design Philosophy**: Workflow-first visualization with a system-based approach emphasizing data clarity over decorative elements. The interface uses a monochrome foundation (black, white, grays) with functional color accents only for status indicators and alerts. Typography uses Inter font family with a clear hierarchy from hero text (2.25rem) down to micro text (0.75rem).

**State Management**: TanStack Query (React Query) for server state management and data fetching, with a custom query client configured for API requests.

**Routing**: Wouter for lightweight client-side routing with distinct paths for business portal (`/business/*`) and candidate portal (`/candidate/*`).

**Key Pages**:
- Landing page with workflow visualization
- Business dashboard with project management and Jira import
- Candidate dashboard with profile management and job recommendations
- Project detail view with milestone tracking and candidate matching
- Profile creation/editing with CV upload and AI parsing

### Backend Architecture

**Runtime**: Node.js with Express.js server framework using TypeScript and ES modules.

**API Design**: RESTful API with endpoints organized by domain:
- `/api/projects` - Project CRUD operations
- `/api/milestones` - Milestone management
- `/api/candidates` - Candidate profiles and CV uploads
- `/api/fit-scores` - AI-powered matching calculations
- `/api/jira/*` - Jira integration endpoints including:
  - `POST /api/jira/import-projects` - Import all Jira projects with automatic skill map generation and candidate matching
  - `/api/jira/sync-milestones` - Sync issues from specific Jira project
  - `/api/jira/monitor-delays` - Monitor project delays and risk levels

**File Upload**: Multer middleware for handling CV file uploads to local filesystem (`uploads/` directory).

**AI Integration**: Google Gemini AI service layer (`server/gemini.ts`) providing:
- Skill map generation from project descriptions
- CV text analysis and skill extraction
- Candidate fit score calculation with multi-factor analysis
- Risk prediction for milestone delays

**Storage Layer**: Abstracted storage interface (`IStorage`) with database implementation supporting CRUD operations for all entities. Database queries use Drizzle ORM with relationship mapping.

**Development Environment**: Vite dev server with HMR, runtime error overlay, and Replit-specific plugins for development tooling and banner display.

### Data Storage Solutions

**Database**: PostgreSQL via Neon serverless driver with WebSocket support for connection pooling.

**ORM**: Drizzle ORM configured with schema-first approach. Schema definitions in `shared/schema.ts` enable type-safe database operations with automatic TypeScript inference.

**Schema Design**:
- **projects**: Core project entities with business user ownership, Jira integration key, and status tracking
- **milestones**: Project breakdown with skill maps (JSONB), assigned candidates, risk levels, and Jira issue keys
- **candidates**: User profiles with skills arrays, availability windows, CV text storage, and AI-parsed metadata
- **fitScores**: Calculated matching scores linking candidates to milestones with detailed breakdown (skillOverlap, experienceMatch, softSkillRelevance)
- **riskAlerts**: Automated alerts for milestone delays with AI-generated recommendations and backup candidate suggestions

**Relationships**: One-to-many between projects and milestones; many-to-many implicit relationship between candidates and milestones via fit scores.

**Migrations**: Drizzle Kit manages schema migrations in `migrations/` directory with push-based deployment strategy.

### Authentication and Authorization

**Current State**: Demo mode with hardcoded user identifiers (`demo-user`, `demo-business-user`) for development.

**Session Management**: Express session infrastructure present with connect-pg-simple for PostgreSQL session storage (configured but not actively enforcing authentication).

**Future Considerations**: Architecture supports adding authentication middleware, with separate business and candidate user contexts already established in the data model.

### External Dependencies

**Google Gemini AI**: Primary AI service for natural language processing tasks including skill extraction, semantic matching, and risk analysis. Configured via `@google/genai` SDK with API key authentication.

**Jira Cloud API**: Integration via `jira.js` Version3Client for:
- **Project Import**: One-click import of all Jira projects from connected workspace (`fetchAllJiraProjects`)
- **Issue Synchronization**: Automatic conversion of Jira issues to milestones with AI skill map generation (`syncJiraMilestones`)
- **Progress Monitoring**: Real-time delay detection using time tracking data (`getIssueProgress`)
- **Risk Management**: Automated risk level calculation and backup candidate activation (`monitorProjectDelays`)

Jira authentication uses OAuth with Replit Connectors infrastructure, requiring dynamic token refresh on each client instantiation (clients are never cached due to token expiration).

**Import Workflow**: 
1. User clicks "Import from Jira" button on Business Dashboard
2. System fetches all accessible Jira projects via API
3. For each project: creates database record, syncs issues as milestones, generates AI skill maps
4. Auto-matches existing candidates to imported milestones using fit score calculation
5. Dashboard refreshes with newly imported projects

**Database**: Neon PostgreSQL serverless database accessed via connection string environment variable. WebSocket constructor override enables serverless compatibility.

**Third-party UI Libraries**: Extensive use of Radix UI primitives (@radix-ui/*) for accessible, unstyled components. Additional dependencies include react-hook-form with Zod validation, date-fns for date handling, and class-variance-authority for component variants.

**Development Tools**: TypeScript for type safety, ESBuild for server bundling, PostCSS with Autoprefixer for CSS processing.