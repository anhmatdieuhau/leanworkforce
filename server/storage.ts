import {
  projects, milestones, candidates, fitScores, riskAlerts, jiraSettings,
  savedJobs, applications, candidateActions, magicLinks,
  type Project, type InsertProject,
  type Milestone, type InsertMilestone,
  type Candidate, type InsertCandidate,
  type FitScore, type InsertFitScore,
  type RiskAlert, type InsertRiskAlert,
  type JiraSettings, type InsertJiraSettings,
  type SavedJob, type InsertSavedJob,
  type Application, type InsertApplication,
  type CandidateAction, type InsertCandidateAction,
  type MagicLink, type InsertMagicLink
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

// Storage interface for Lean Workforce
export interface IStorage {
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  
  // Milestones
  getMilestone(id: string): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: string): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  
  // Candidates
  getCandidate(id: string): Promise<Candidate | undefined>;
  getCandidateByEmail(email: string): Promise<Candidate | undefined>;
  getAllCandidates(): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  
  // Fit Scores
  getFitScore(id: string): Promise<FitScore | undefined>;
  getFitScoresByMilestone(milestoneId: string): Promise<FitScore[]>;
  getFitScoresByCandidate(candidateId: string): Promise<FitScore[]>;
  createFitScore(fitScore: InsertFitScore): Promise<FitScore>;
  updateFitScore(id: string, data: Partial<InsertFitScore>): Promise<FitScore | undefined>;
  getTopCandidatesForMilestone(milestoneId: string, limit: number): Promise<Array<FitScore & { candidate: Candidate }>>;
  
  // Risk Alerts
  getRiskAlert(id: string): Promise<RiskAlert | undefined>;
  getRiskAlertsByMilestone(milestoneId: string): Promise<RiskAlert[]>;
  createRiskAlert(riskAlert: InsertRiskAlert): Promise<RiskAlert>;
  
  // Jira Settings
  getJiraSettings(businessUserId: string): Promise<JiraSettings | undefined>;
  saveJiraSettings(settings: InsertJiraSettings): Promise<JiraSettings>;
  updateJiraSettings(businessUserId: string, data: Partial<InsertJiraSettings>): Promise<JiraSettings | undefined>;
  
  // Saved Jobs
  saveJob(candidateId: string, milestoneId: string): Promise<SavedJob>;
  unsaveJob(candidateId: string, milestoneId: string): Promise<void>;
  getSavedJobs(candidateId: string): Promise<SavedJob[]>;
  isJobSaved(candidateId: string, milestoneId: string): Promise<boolean>;
  
  // Applications
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCandidate(candidateId: string): Promise<Application[]>;
  getApplicationsByMilestone(milestoneId: string): Promise<Application[]>;
  updateApplicationStatus(id: string, status: string): Promise<Application | undefined>;
  
  // Candidate Actions (Save/Skip/View tracking)
  recordAction(candidateId: string, milestoneId: string, action: string): Promise<CandidateAction>;
  getActions(candidateId: string): Promise<CandidateAction[]>;
  hasAction(candidateId: string, milestoneId: string, action: string): Promise<boolean>;
  
  // Magic Links
  createMagicLink(magicLink: InsertMagicLink): Promise<MagicLink>;
  getMagicLinkByToken(token: string): Promise<MagicLink | undefined>;
  markMagicLinkAsUsed(token: string): Promise<MagicLink | undefined>;
  invalidateOldMagicLinks(email: string): Promise<void>;
  getRecentMagicLinksByEmail(email: string, sinceMinutes: number): Promise<MagicLink[]>;
}

export class DatabaseStorage implements IStorage {
  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return project || undefined;
  }

  // Milestones
  async getMilestone(id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone || undefined;
  }

  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(desc(milestones.createdAt));
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db.insert(milestones).values(insertMilestone).returning();
    return milestone;
  }

  async updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [milestone] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return milestone || undefined;
  }

  // Candidates
  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async getCandidateByEmail(email: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.email, email));
    return candidate || undefined;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db.insert(candidates).values(insertCandidate).returning();
    return candidate;
  }

  async updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db.update(candidates).set(data).where(eq(candidates.id, id)).returning();
    return candidate || undefined;
  }

  // Fit Scores
  async getFitScore(id: string): Promise<FitScore | undefined> {
    const [fitScore] = await db.select().from(fitScores).where(eq(fitScores.id, id));
    return fitScore || undefined;
  }

  async getFitScoresByMilestone(milestoneId: string): Promise<FitScore[]> {
    return await db.select().from(fitScores).where(eq(fitScores.milestoneId, milestoneId)).orderBy(desc(fitScores.score));
  }

  async getFitScoresByCandidate(candidateId: string): Promise<FitScore[]> {
    return await db.select().from(fitScores).where(eq(fitScores.candidateId, candidateId)).orderBy(desc(fitScores.score));
  }

  async createFitScore(insertFitScore: InsertFitScore): Promise<FitScore> {
    const [fitScore] = await db.insert(fitScores).values(insertFitScore).returning();
    return fitScore;
  }

  async updateFitScore(id: string, data: Partial<InsertFitScore>): Promise<FitScore | undefined> {
    const [fitScore] = await db.update(fitScores).set(data).where(eq(fitScores.id, id)).returning();
    return fitScore || undefined;
  }

  async getTopCandidatesForMilestone(milestoneId: string, limit: number = 10): Promise<Array<FitScore & { candidate: Candidate }>> {
    const scores = await db
      .select()
      .from(fitScores)
      .where(and(eq(fitScores.milestoneId, milestoneId), gte(fitScores.score, 50)))
      .orderBy(desc(fitScores.score))
      .limit(limit);

    const results = [];
    for (const score of scores) {
      const candidate = await this.getCandidate(score.candidateId);
      if (candidate) {
        results.push({ ...score, candidate });
      }
    }

    return results;
  }

  // Risk Alerts
  async getRiskAlert(id: string): Promise<RiskAlert | undefined> {
    const [riskAlert] = await db.select().from(riskAlerts).where(eq(riskAlerts.id, id));
    return riskAlert || undefined;
  }

  async getRiskAlertsByMilestone(milestoneId: string): Promise<RiskAlert[]> {
    return await db.select().from(riskAlerts).where(eq(riskAlerts.milestoneId, milestoneId)).orderBy(desc(riskAlerts.createdAt));
  }

  async createRiskAlert(insertRiskAlert: InsertRiskAlert): Promise<RiskAlert> {
    const [riskAlert] = await db.insert(riskAlerts).values(insertRiskAlert).returning();
    return riskAlert;
  }

  // Jira Settings
  async getJiraSettings(businessUserId: string): Promise<JiraSettings | undefined> {
    const [settings] = await db.select().from(jiraSettings).where(eq(jiraSettings.businessUserId, businessUserId));
    return settings || undefined;
  }

  async saveJiraSettings(insertSettings: InsertJiraSettings): Promise<JiraSettings> {
    const existing = await this.getJiraSettings(insertSettings.businessUserId);
    
    if (existing) {
      // Preserve existing API token if new one is not provided
      const updateData: any = { ...insertSettings, updatedAt: new Date() };
      if (!insertSettings.jiraApiToken && existing.jiraApiToken) {
        updateData.jiraApiToken = existing.jiraApiToken;
      }
      
      const [updated] = await db
        .update(jiraSettings)
        .set(updateData)
        .where(eq(jiraSettings.businessUserId, insertSettings.businessUserId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(jiraSettings).values(insertSettings).returning();
      return created;
    }
  }

  async updateJiraSettings(businessUserId: string, data: Partial<InsertJiraSettings>): Promise<JiraSettings | undefined> {
    const [settings] = await db
      .update(jiraSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jiraSettings.businessUserId, businessUserId))
      .returning();
    return settings || undefined;
  }

  // Saved Jobs
  async saveJob(candidateId: string, milestoneId: string): Promise<SavedJob> {
    const [savedJob] = await db.insert(savedJobs).values({ candidateId, milestoneId }).returning();
    return savedJob;
  }

  async unsaveJob(candidateId: string, milestoneId: string): Promise<void> {
    await db.delete(savedJobs).where(
      and(
        eq(savedJobs.candidateId, candidateId),
        eq(savedJobs.milestoneId, milestoneId)
      )
    );
  }

  async getSavedJobs(candidateId: string): Promise<SavedJob[]> {
    return await db.select().from(savedJobs).where(eq(savedJobs.candidateId, candidateId)).orderBy(desc(savedJobs.createdAt));
  }

  async isJobSaved(candidateId: string, milestoneId: string): Promise<boolean> {
    const [saved] = await db.select().from(savedJobs).where(
      and(
        eq(savedJobs.candidateId, candidateId),
        eq(savedJobs.milestoneId, milestoneId)
      )
    );
    return !!saved;
  }

  // Applications
  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values(insertApplication).returning();
    return application;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.candidateId, candidateId)).orderBy(desc(applications.createdAt));
  }

  async getApplicationsByMilestone(milestoneId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.milestoneId, milestoneId)).orderBy(desc(applications.createdAt));
  }

  async updateApplicationStatus(id: string, status: string): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application || undefined;
  }

  // Candidate Actions
  async recordAction(candidateId: string, milestoneId: string, action: string): Promise<CandidateAction> {
    const [candidateAction] = await db.insert(candidateActions).values({ candidateId, milestoneId, action }).returning();
    return candidateAction;
  }

  async getActions(candidateId: string): Promise<CandidateAction[]> {
    return await db.select().from(candidateActions).where(eq(candidateActions.candidateId, candidateId)).orderBy(desc(candidateActions.createdAt));
  }

  async hasAction(candidateId: string, milestoneId: string, action: string): Promise<boolean> {
    const [candidateAction] = await db.select().from(candidateActions).where(
      and(
        eq(candidateActions.candidateId, candidateId),
        eq(candidateActions.milestoneId, milestoneId),
        eq(candidateActions.action, action)
      )
    );
    return !!candidateAction;
  }

  // Magic Links
  async createMagicLink(insertMagicLink: InsertMagicLink): Promise<MagicLink> {
    const [magicLink] = await db.insert(magicLinks).values(insertMagicLink).returning();
    return magicLink;
  }

  async getMagicLinkByToken(token: string): Promise<MagicLink | undefined> {
    const [magicLink] = await db.select().from(magicLinks).where(eq(magicLinks.token, token));
    return magicLink || undefined;
  }

  async markMagicLinkAsUsed(token: string): Promise<MagicLink | undefined> {
    const [magicLink] = await db
      .update(magicLinks)
      .set({ used: true, usedAt: new Date() })
      .where(eq(magicLinks.token, token))
      .returning();
    return magicLink || undefined;
  }

  async invalidateOldMagicLinks(email: string): Promise<void> {
    await db
      .update(magicLinks)
      .set({ used: true, usedAt: new Date() })
      .where(
        and(
          eq(magicLinks.email, email),
          eq(magicLinks.used, false)
        )
      );
  }

  async getRecentMagicLinksByEmail(email: string, sinceMinutes: number): Promise<MagicLink[]> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.email, email),
          gte(magicLinks.createdAt, since)
        )
      )
      .orderBy(desc(magicLinks.createdAt));
  }
}

export const storage = new DatabaseStorage();
