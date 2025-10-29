import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== PROJECTS ==========
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessUserId: varchar("business_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // active, completed, on-hold
  jiraProjectKey: text("jira_project_key"),
  lastJiraSyncAt: timestamp("last_jira_sync_at"),
  lastJiraSyncStatus: text("last_jira_sync_status"), // success, failed, partial
  lastJiraSyncError: text("last_jira_sync_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  milestones: many(milestones),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ========== MILESTONES ==========
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, delayed
  estimatedHours: integer("estimated_hours"),
  assignedCandidateId: varchar("assigned_candidate_id"),
  assignmentStatus: text("assignment_status").default("unassigned"), // unassigned, offered, confirmed, active, completed
  assignmentConfirmedAt: timestamp("assignment_confirmed_at"),
  backupCandidateId: varchar("backup_candidate_id"),
  backupAssignmentStatus: text("backup_assignment_status").default("none"), // none, standby, offered, active
  jiraIssueKey: text("jira_issue_key"),
  jiraEpicKey: text("jira_epic_key"),
  jiraSprintId: text("jira_sprint_id"),
  jiraSprintName: text("jira_sprint_name"),
  delayPercentage: integer("delay_percentage").default(0),
  riskLevel: text("risk_level"), // low, medium, high
  skillMap: jsonb("skill_map"), // AI-generated skill requirements
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  fitScores: many(fitScores),
}));

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// ========== CANDIDATES ==========
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  cvFilePath: text("cv_file_path"),
  cvAnalysis: jsonb("cv_analysis"), // AI-parsed CV data
  skills: text("skills").array(),
  experience: text("experience"),
  education: text("education"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const candidatesRelations = relations(candidates, ({ many }) => ({
  fitScores: many(fitScores),
}));

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// ========== FIT SCORES ==========
export const fitScores = pgTable("fit_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  skillOverlap: integer("skill_overlap"),
  experienceMatch: integer("experience_match"),
  softSkillRelevance: integer("soft_skill_relevance"),
  reasoning: text("reasoning"), // AI reasoning for the score
  status: text("status").default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fitScoresRelations = relations(fitScores, ({ one }) => ({
  candidate: one(candidates, {
    fields: [fitScores.candidateId],
    references: [candidates.id],
  }),
  milestone: one(milestones, {
    fields: [fitScores.milestoneId],
    references: [milestones.id],
  }),
}));

export const insertFitScoreSchema = createInsertSchema(fitScores).omit({
  id: true,
  createdAt: true,
});

export type InsertFitScore = z.infer<typeof insertFitScoreSchema>;
export type FitScore = typeof fitScores.$inferSelect;

// ========== RISK ALERTS ==========
export const riskAlerts = pgTable("risk_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  riskLevel: text("risk_level").notNull(), // low, medium, high
  delayPercentage: integer("delay_percentage").notNull(),
  aiAnalysis: jsonb("ai_analysis"), // Gemini risk prediction
  backupActivated: boolean("backup_activated").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const riskAlertsRelations = relations(riskAlerts, ({ one }) => ({
  milestone: one(milestones, {
    fields: [riskAlerts.milestoneId],
    references: [milestones.id],
  }),
}));

export const insertRiskAlertSchema = createInsertSchema(riskAlerts).omit({
  id: true,
  createdAt: true,
});

export type InsertRiskAlert = z.infer<typeof insertRiskAlertSchema>;
export type RiskAlert = typeof riskAlerts.$inferSelect;

// ========== SAVED JOBS ==========
export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  candidate: one(candidates, {
    fields: [savedJobs.candidateId],
    references: [candidates.id],
  }),
  milestone: one(milestones, {
    fields: [savedJobs.milestoneId],
    references: [milestones.id],
  }),
}));

export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;

// ========== APPLICATIONS ==========
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("submitted"), // submitted, under_review, interview, accepted, rejected
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applicationsRelations = relations(applications, ({ one }) => ({
  candidate: one(candidates, {
    fields: [applications.candidateId],
    references: [candidates.id],
  }),
  milestone: one(milestones, {
    fields: [applications.milestoneId],
    references: [milestones.id],
  }),
  project: one(projects, {
    fields: [applications.projectId],
    references: [projects.id],
  }),
}));

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// ========== CANDIDATE ACTIONS (Save/Skip) ==========
export const candidateActions = pgTable("candidate_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // save, skip, view
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const candidateActionsRelations = relations(candidateActions, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateActions.candidateId],
    references: [candidates.id],
  }),
  milestone: one(milestones, {
    fields: [candidateActions.milestoneId],
    references: [milestones.id],
  }),
}));

export const insertCandidateActionSchema = createInsertSchema(candidateActions).omit({
  id: true,
  createdAt: true,
});

export type InsertCandidateAction = z.infer<typeof insertCandidateActionSchema>;
export type CandidateAction = typeof candidateActions.$inferSelect;

// ========== SKILL MAP TYPE ==========
export const skillMapSchema = z.object({
  milestone: z.string(),
  required_skills: z.array(z.string()),
  experience_level: z.string(),
  soft_skills: z.array(z.string()),
});

export type SkillMap = z.infer<typeof skillMapSchema>;

// ========== CV ANALYSIS TYPE ==========
export const cvAnalysisSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.string(),
  education: z.string(),
  soft_skills: z.array(z.string()).optional(),
  domain_expertise: z.array(z.string()).optional(),
});

export type CVAnalysis = z.infer<typeof cvAnalysisSchema>;

// ========== JIRA SETTINGS ==========
export const jiraSettings = pgTable("jira_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessUserId: varchar("business_user_id").notNull().unique(),
  jiraDomain: text("jira_domain"), // e.g., "company.atlassian.net"
  jiraEmail: text("jira_email"),
  jiraApiToken: text("jira_api_token"), // Encrypted API token
  connectionType: text("connection_type").default("replit_connector"), // replit_connector or manual
  isConfigured: boolean("is_configured").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJiraSettingsSchema = createInsertSchema(jiraSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  jiraApiToken: z.string().optional(), // Make optional for updates - existing token will be preserved
});

export type InsertJiraSettings = z.infer<typeof insertJiraSettingsSchema>;
export type JiraSettings = typeof jiraSettings.$inferSelect;

// ========== MAGIC LINKS ==========
export const magicLinks = pgTable("magic_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: text("email").notNull(),
  userId: varchar("user_id"), // Null if shadow account
  role: text("role").default("candidate"), // candidate or business
  used: boolean("used").default(false).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMagicLinkSchema = createInsertSchema(magicLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertMagicLink = z.infer<typeof insertMagicLinkSchema>;
export type MagicLink = typeof magicLinks.$inferSelect;

// ========== BACKGROUND JOBS ==========
export const backgroundJobs = pgTable("background_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(), // cv_processing, fit_score_calculation, jira_sync
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  userId: varchar("user_id").notNull(), // candidate or business user id
  userEmail: text("user_email"), // for email notifications
  payload: jsonb("payload"), // job-specific data
  result: jsonb("result"), // job output
  error: text("error"), // error message if failed
  progress: integer("progress").default(0), // 0-100
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;

// ========== JIRA SYNC LOGS ==========
export const jiraSyncLogs = pgTable("jira_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessUserId: varchar("business_user_id").notNull(),
  syncType: text("sync_type").notNull(), // import_projects, sync_project, sync_milestone
  status: text("status").notNull(), // success, failed, partial
  projectId: varchar("project_id"),
  jiraProjectKey: text("jira_project_key"),
  milestonesCreated: integer("milestones_created").default(0),
  milestonesUpdated: integer("milestones_updated").default(0),
  error: text("error"), // Error message if failed
  errorDetails: jsonb("error_details"), // Detailed error stack/context
  canRetry: boolean("can_retry").default(true),
  retryCount: integer("retry_count").default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertJiraSyncLogSchema = createInsertSchema(jiraSyncLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertJiraSyncLog = z.infer<typeof insertJiraSyncLogSchema>;
export type JiraSyncLog = typeof jiraSyncLogs.$inferSelect;
