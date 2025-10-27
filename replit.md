# Lean Workforce

## Overview

Lean Workforce is an intelligent talent matching and project continuity platform powered by LeanfounderSpace that automates workforce allocation. The system connects businesses creating projects with milestones to candidates uploading CVs, using AI for skill extraction, candidate-project matching, and real-time risk prediction through Jira API integration.

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
  - **CV Upload Progress**: Multi-stage visual feedback (uploading → parsing → analyzing → complete) with progress bar
  - **Job Recommendations**: AI-powered matches with >70% fit score, sorted by relevance
  - **Explainability**: Collapsible "Why this job?" component showing fit score breakdown (Skills Match, Experience Level, Soft Skills percentages)
  - **Job Actions**: Save for later, Skip (filters from future recommendations), Apply (one-click submission)
  - **Stats Dashboard**: Real-time tracking of applications count, total matches, and average fit score
- Project detail view with milestone tracking, candidate matching, and grouped task view
  - **Default view**: Grouped by sprint (user preference)
  - Timeline view for milestone list visualization
  - Grouped view with epic/sprint organization (defaults to sprint grouping)
  - Toggle between view modes and grouping options
  - **Task Display**: Each task shows description (ADF-parsed to readable text) and "Original Estimate" from Jira
- Profile creation/editing with CV upload and AI parsing
  - **Form Repopulation**: Async data loading with loading guard prevents empty field flash
  - **Email Field**: Read-only as it serves as account identifier in demo mode
  - **CV Analysis Results**: AI-extracted skills and experience displayed after upload

**Jira Description Parsing**: Frontend uses ADF (Atlassian Document Format) parser (`client/src/lib/adf-parser.ts`) to convert structured JSON descriptions from Jira into readable plain text with proper formatting (bullet points as •, paragraphs, etc.).

### Backend Architecture

**Runtime**: Node.js with Express.js server framework using TypeScript and ES modules.

**API Design**: RESTful API with endpoints organized by domain:
- `/api/projects` - Project CRUD operations
- `/api/milestones` - Milestone management
- `/api/candidates` - Candidate profiles and CV uploads
  - `GET /api/candidate/profile` - Get candidate profile
  - `PUT /api/candidate/profile` - Update candidate profile (email is read-only)
  - `POST /api/candidate/upload-cv` - Upload and analyze CV with multipart/form-data
  - `GET /api/candidate/recommendations` - Get AI-powered job matches (>70% fit, filters skipped jobs)
  - `POST /api/candidate/save-job` - Save job for later
  - `POST /api/candidate/skip-job` - Skip job (removes from future recommendations)
  - `POST /api/candidate/apply` - Submit job application
  - `GET /api/candidate/stats` - Get applications count, matches, and average fit score
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
- **milestones**: Project breakdown with skill maps (JSONB), assigned candidates, risk levels, Jira issue keys, epic keys, sprint IDs, and sprint names for organizational grouping
- **candidates**: User profiles with skills arrays, availability windows, CV text storage, and AI-parsed metadata
- **fitScores**: Calculated matching scores linking candidates to milestones with detailed breakdown (skillOverlap, experienceMatch, softSkillRelevance)
- **riskAlerts**: Automated alerts for milestone delays with AI-generated recommendations and backup candidate suggestions
- **savedJobs**: Candidate-saved job opportunities (candidateId, milestoneId, timestamps)
- **applications**: Job applications submitted by candidates (candidateId, milestoneId, projectId, status, timestamps)
- **candidateActions**: Tracking system for all candidate interactions (save, skip, view actions)

**Relationships**: One-to-many between projects and milestones; many-to-many implicit relationship between candidates and milestones via fit scores.

**Migrations**: Drizzle Kit manages schema migrations in `migrations/` directory with push-based deployment strategy.

### Authentication and Authorization

**Current State**: Magic Link authentication system implemented for passwordless login.

**Magic Link Authentication**:
- **Token Generation**: Cryptographically secure 32-character base64url tokens
- **Expiry**: 10-minute TTL (time-to-live) for security
- **Single-Use**: Tokens marked as used after verification
- **Rate Limiting**: Maximum 5 requests per hour per email address
- **Database Table**: `magicLinks` stores token, email, expiry, IP address, user agent
- **API Endpoints**: 
  - `POST /api/auth/request-magic-link` - Request login link
  - `GET /api/auth/verify-magic-link` - Verify token and create session
- **Role Detection**: Automatically determines candidate vs business user role
- **Shadow Accounts**: Creates candidate account on first login if email not registered

**Session Management**: 
- **Current**: Simple localStorage-based session (client-side user data storage)
- **Email Delivery**: Mock implementation (console.log in development)

**Production Considerations** (not yet implemented):
- Server-side session tokens with httpOnly cookies for security
- Real email service integration (SendGrid, Mailgun, AWS SES)
- Business user account validation and role verification
- Enhanced email validation with schema enforcement
- Transactional guarantees for magic link lifecycle
- CSRF protection and secure session handling

### External Dependencies

**Google Gemini AI**: Primary AI service for natural language processing tasks including skill extraction, semantic matching, and risk analysis. Configured via `@google/genai` SDK with API key authentication.

**Rate Limiting**: All Gemini AI functions protected by rate limiter (`server/rate-limiter.ts`) with 30-second delays and 3 retry attempts to respect free tier quota (2 requests/min). Applied to:
- `generateSkillMap()` - Skill extraction from project descriptions
- `analyzeCVText()` - CV parsing and candidate profile extraction
- `calculateFitScore()` - Multi-factor candidate-project matching (skill overlap, experience match, soft skill relevance)
- `predictRisk()` - Risk prediction for milestone delays

**Data Validation**: All AI-generated fit scores (skillOverlap, experienceMatch, softSkillRelevance) are rounded to integers using `Math.round()` before database insertion to ensure type compatibility with PostgreSQL integer columns.

**Jira Cloud API**: Integration via `jira.js` Version3Client with dual authentication approach:

**Authentication Methods**:
- **Primary**: Replit OAuth Connector - Seamless OAuth flow managed by Replit platform
- **Fallback**: Manual Credentials - Business users can configure custom Jira domain, email, and API token via settings dialog

**Jira Settings Management**:
- Database table `jiraSettings` stores per-business-user configuration (domain, email, encrypted API token, connection type)
- Settings dialog accessible via header button in Business Dashboard (`JiraSettingsDialog.tsx`)
- API token preservation: Updates to domain/email don't require re-entering API token - existing token automatically preserved
- businessUserId parameter threaded through all Jira service functions to fetch correct credentials per user

**Jira Integration Features**:
- **Project Import**: One-click import of all Jira projects from connected workspace (`fetchAllJiraProjects`)
- **Issue Synchronization**: All non-Epic issues imported as milestones with AI skill map generation using enhanced JQL search API (`syncJiraMilestones`)
- **Task Filtering**: Automatically excludes Epic-type issues, imports Stories, Tasks, and Bugs
- **Epic & Sprint Tracking**: Captures epic keys and sprint IDs/names for task organization
- **Progress Monitoring**: Real-time delay detection using time tracking data (`getIssueProgress`)
- **Risk Management**: Automated risk level calculation and backup candidate activation (`monitorProjectDelays`)
- **API Migration**: Uses new enhanced JQL search endpoint (`/rest/api/3/search/jql`) with cursor-based pagination to comply with Atlassian's API deprecation (October 2024)

**Client Management**: OAuth tokens require dynamic refresh on each client instantiation (clients never cached). Manual credentials fetched from database per businessUserId. Client automatically selects OAuth connector or manual credentials based on availability.

**Import Workflow**: 
1. User clicks "Import from Jira" button on Business Dashboard
2. System fetches all accessible Jira projects via API
3. For each project:
   - If project already exists in database: Re-syncs all issues/milestones with latest Jira data
   - If project is new: Creates database record
   - Fetches all non-Epic issues (Stories, Tasks, Bugs) from the project
   - Each issue becomes a milestone:
     - Uses issue summary as milestone name
     - Preserves full issue description
     - Converts time estimates from seconds to hours
     - Generates AI skill map from issue summary and description
     - Updates existing milestones (matched by name) or creates new ones
   - Fetches up to 1000 most recent issues per project
4. Auto-matches candidates to milestones using fit score calculation (updates existing or creates new)
5. Dashboard refreshes with imported/updated projects

**Database**: Neon PostgreSQL serverless database accessed via connection string environment variable. WebSocket constructor override enables serverless compatibility.

**Third-party UI Libraries**: Extensive use of Radix UI primitives (@radix-ui/*) for accessible, unstyled components. Additional dependencies include react-hook-form with Zod validation, date-fns for date handling, and class-variance-authority for component variants.

**Development Tools**: TypeScript for type safety, ESBuild for server bundling, PostCSS with Autoprefixer for CSS processing.