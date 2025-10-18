# AI Workforce OS - Design Guidelines

## Design Approach

**System-Based Approach**: Given the utility-focused, data-dense nature of this workforce automation platform, we're using a **minimalist monochrome design system** inspired by the user's reference, prioritizing clarity, workflow visualization, and professional enterprise aesthetics.

## Core Design Principles

1. **Workflow-First Visualization**: Every major feature is represented as a clear, linear process flow
2. **Data Clarity**: Information hierarchy through typography and spacing, not color
3. **Minimalist Enterprise**: Clean, professional, distraction-free interface
4. **Dual-Context Design**: Consistent patterns across Business and Candidate portals with role-appropriate emphasis

---

## Color Palette

### Monochrome Foundation
- **Primary Black**: 0 0% 0% - Headers, primary text, workflow titles, CTAs
- **Pure White**: 0 0% 100% - Backgrounds, card fills, modal surfaces
- **Border Gray**: 0 0% 88% - Card borders, dividers, input outlines
- **Muted Gray**: 0 0% 74% - Secondary text, disabled states, subtle elements
- **Background Gray**: 0 0% 96% - Page backgrounds, alternate row colors

### Functional Accents (Minimal Use)
- **Success**: 142 76% 36% - Backup activation, high fit scores (>80%)
- **Warning**: 38 92% 50% - Medium risk alerts, delays detected
- **Danger**: 0 84% 60% - High risk predictions, critical issues
- **Info**: 221 83% 53% - AI processing states, new recommendations

*Use color sparingly - only for status indicators and alerts. Default to grayscale for 95% of the interface.*

---

## Typography

**Font Family**: Inter (Google Fonts)
- Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Type Scale
- **Hero/Display**: text-4xl (2.25rem) / font-bold - Portal landing pages, empty states
- **Page Headers**: text-3xl (1.875rem) / font-semibold - Dashboard titles, section headers
- **Card Titles**: text-xl (1.25rem) / font-semibold - Workflow steps, milestone names
- **Body Text**: text-base (1rem) / font-normal - Descriptions, form labels, content
- **Secondary**: text-sm (0.875rem) / font-normal - Metadata, timestamps, helper text
- **Micro**: text-xs (0.75rem) / font-medium - Tags, status badges, fit scores

### Text Colors
- Primary text: black (0 0% 0%)
- Secondary text: muted gray (0 0% 45%)
- Disabled: border gray (0 0% 74%)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 8, 12, 16, 24** for consistency
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-24
- Grid gaps: gap-4, gap-6, gap-8
- Margins: m-4, m-8, m-12

### Container Structure
- **Full-width sections**: w-full with max-w-7xl mx-auto
- **Dashboard grids**: max-w-6xl for content-heavy layouts
- **Form containers**: max-w-2xl for focused input flows
- **Workflow columns**: 3-column grid (grid-cols-3) on desktop, stack on mobile

### Responsive Breakpoints
- Mobile: Base (single column, stacked workflows)
- Tablet: md: (2-column grids, condensed navigation)
- Desktop: lg: (3-column workflows, full sidebar navigation)

---

## Component Library

### Navigation
**Business Portal Header**
- White background, subtle bottom border (border-gray)
- Logo left-aligned (black text or simple icon)
- Main nav center: Projects, Candidates, Analytics, Settings
- Right: Notification bell + User avatar dropdown
- Height: h-16

**Candidate Portal Header**
- Same structure, different menu items
- Main nav: Dashboard, Opportunities, My Profile, Calendar
- Badge on "Opportunities" for new recommendations (>70% fit)

### Workflow Visualization Cards
**Three-Column Flow Layout** (inspired by reference image)
```
Structure:
- Black header box with white text (workflow title)
- Vertical stack of gray-bordered cards (steps)
- Thin vertical line connectors between steps
- Clean spacing: gap-8 between columns, gap-2 between steps

Visual Specs:
- Header: bg-black text-white px-4 py-2 rounded-md font-semibold
- Step cards: border border-gray-300 px-4 py-3 rounded-md bg-white
- Connector lines: h-6 w-px bg-gray-300
- Hover state: border-black transition (subtle interaction)
```

**Example Workflows**:
1. **Talent Pool Automation**: Signup → CV Parse → Skill Extract → Pool Save
2. **AI Matching**: Project Create → Skill Map → Fit Score → Ranking
3. **Continuity AI**: Jira Sync → Delay Detect → Risk Assess → Backup Activate

### Data Display Cards

**Candidate Profile Card**
- White background, subtle border
- Header: Name (text-xl bold) + Availability tag (text-xs border px-2 py-1)
- Skills section: Horizontal chip list (border pills, no background color)
- Fit score: Large percentage number (text-3xl) with "Match" label
- Footer: CTA buttons (outlined black border, white fill)

**Project Dashboard Card**
- Timeline visualization: Horizontal progress bars (black fill, gray background)
- Milestone list: Collapsible accordion, chevron indicators
- Risk indicator: Color-coded badge (top-right corner) - only when needed
- Candidate slots: Avatar placeholders + "Assign" button

**Skill Map Graph**
- Node-based visualization
- Black nodes with white text for primary skills
- Gray outline nodes for secondary skills
- Simple connecting lines (not arrows)
- Clean, grid-aligned layout

### Forms & Inputs

**Input Fields**
- Border: border border-gray-300 focus:border-black
- Background: bg-white
- Padding: px-4 py-2
- Rounded: rounded-md
- Label: text-sm font-medium mb-2 above input
- Helper text: text-xs text-gray-500 mt-1

**Buttons**
- **Primary CTA**: bg-black text-white px-6 py-2 rounded-md font-medium
- **Secondary**: border border-black text-black bg-white px-6 py-2 rounded-md
- **Ghost**: text-black hover:bg-gray-50 px-4 py-2
- Size: Base height h-10, large h-12 for heroes

**File Upload (CV)**
- Dashed border dropzone (border-2 border-dashed border-gray-300)
- Upload icon (simple outline, gray)
- "Drag & drop or click to upload" text
- Accepted formats shown: text-xs text-gray-500

### Dashboards

**Business Portal Dashboard**
- Top stats row: 4-column grid (Active Projects, Candidates, Avg Fit Score, Risk Alerts)
- Main content: 2-column layout (left: Recent Projects list, right: Top Candidates)
- Each stat card: Large number (text-4xl), small label below
- White cards with subtle shadows (shadow-sm)

**Candidate Portal Dashboard**
- Hero section: "Welcome back, [Name]" + Quick stats (Applications, Matches, Availability)
- Recommended projects section: Scrollable horizontal card row
- Calendar widget: Month view with availability marked (simple black dots)

### Modals & Overlays

**Standard Modal**
- White surface, max-w-2xl
- Black close button (top-right X)
- Title: text-2xl font-semibold mb-4
- Content area: Clean spacing, scrollable if needed
- Footer: Right-aligned button group (Cancel outline + Confirm black)

**Risk Alert Modal**
- Warning icon (simple exclamation triangle, black outline)
- Bold headline: "Delay Detected - Backup Required?"
- Details section: Project name, milestone, delay percentage
- Recommended backup candidate card preview
- Actions: "Activate Backup" (black) + "Monitor" (outline)

### Data Visualization

**Fit Score Meter**
- Circular progress indicator (0-100%)
- Black stroke for progress, gray for remainder
- Center: Large number + "Fit" label
- Color coding: >80% green accent, 50-80% neutral, <50% red accent

**Timeline Chart**
- Horizontal Gantt-style bars
- Black for completed, gray outline for upcoming
- Today marker: Vertical dashed line
- Milestone markers: Small black dots with labels

---

## Animations & Interactions

**Minimal Motion Philosophy**: Use only when adding clarity

**Permitted Animations**:
- Hover states: Border color transitions (150ms)
- Modal entry: Fade in + scale from 0.95 (200ms)
- Loading states: Simple spinner (black stroke on white)
- Accordion expand: Height transition (300ms ease)
- Notification toasts: Slide from top (250ms)

**Forbidden**:
- No gradient animations
- No parallax effects
- No carousel auto-advance
- No decorative animations

---

## Images

**Minimal Image Usage**: This is a data-driven enterprise tool, not a marketing site

**Allowed Images**:
1. **User Avatars**: Circular, grayscale filter applied for visual consistency
2. **Empty State Illustrations**: Simple line art (black outline on white), e.g., "No projects yet" screen
3. **Company Logos**: In candidate profiles (if pulled from LinkedIn), displayed small in grayscale

**No Hero Images**: Dashboards and portals skip traditional heroes in favor of immediate data display and workflow access.

---

## Portal-Specific Considerations

### Business Portal Emphasis
- Project creation flow is prominent (sticky "New Project" button)
- Risk dashboard gets priority position
- Candidate rankings use tabular layout with sortable columns
- Bulk actions available (e.g., "Notify All Top Matches")

### Candidate Portal Emphasis
- Calendar availability is always visible (sidebar widget)
- Fit score displayed prominently on every opportunity card
- Application history with status tracking (Applied → Under Review → Matched)
- Profile completion progress bar (top of dashboard)

---

## Accessibility

- Maintain 4.5:1 contrast ratio (black on white easily achieves this)
- All interactive elements minimum 44px touch target
- Focus indicators: 2px black outline offset by 2px
- Screen reader labels for all icon-only buttons
- Keyboard navigation: Tab order follows visual hierarchy
- ARIA labels for dynamic content (fit scores, risk alerts)

---

## Design Quality Standards

- Every card has consistent border-radius (rounded-md = 6px)
- Shadows used sparingly: shadow-sm for cards, shadow-md for modals only
- No arbitrary values - stick to Tailwind spacing scale
- White space is intentional - never cramped layouts
- Grid alignment: All elements snap to 4px grid
- Loading states for all async operations (Gemini AI calls, Jira syncs)
- Empty states designed for every list/table view