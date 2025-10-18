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
  backupCandidateId: varchar("backup_candidate_id"),
  jiraIssueKey: text("jira_issue_key"),
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
});

export type InsertJiraSettings = z.infer<typeof insertJiraSettingsSchema>;
export type JiraSettings = typeof jiraSettings.$inferSelect;
