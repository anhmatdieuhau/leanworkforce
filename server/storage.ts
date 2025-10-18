import {
  projects, milestones, candidates, fitScores, riskAlerts,
  type Project, type InsertProject,
  type Milestone, type InsertMilestone,
  type Candidate, type InsertCandidate,
  type FitScore, type InsertFitScore,
  type RiskAlert, type InsertRiskAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

// Storage interface for AI Workforce OS
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
  getTopCandidatesForMilestone(milestoneId: string, limit: number): Promise<Array<FitScore & { candidate: Candidate }>>;
  
  // Risk Alerts
  getRiskAlert(id: string): Promise<RiskAlert | undefined>;
  getRiskAlertsByMilestone(milestoneId: string): Promise<RiskAlert[]>;
  createRiskAlert(riskAlert: InsertRiskAlert): Promise<RiskAlert>;
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
}

export const storage = new DatabaseStorage();
