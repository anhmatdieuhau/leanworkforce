import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateSkillMap, analyzeCVText, calculateFitScore, predictRisk } from "./gemini";
import { syncJiraMilestones, getIssueProgress, monitorProjectDelays, fetchAllJiraProjects, fetchProjectSprints, fetchSprintIssues } from "./jira-service";
import { insertProjectSchema, insertMilestoneSchema, insertCandidateSchema, insertFitScoreSchema, insertJiraSettingsSchema, type Milestone } from "@shared/schema";
import { validateFileType } from "./document-parser";
import { calculateFallbackFitScore, extractFallbackSkillMap } from "./fallback-scoring";
import { encrypt, decrypt, safeEncrypt, safeDecrypt } from "./encryption";
import { startJobWorker } from "./job-worker";

// Configure multer to accept PDF, DOC, DOCX, TXT files
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const validation = validateFileType(file.originalname, file.mimetype);
    if (!validation.valid) {
      cb(new Error(validation.error || "Invalid file type"));
    } else {
      cb(null, true);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== PROJECTS ==========
  
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create project with milestones and AI skill map generation
  app.post("/api/projects", async (req, res) => {
    try {
      const validated = insertProjectSchema.parse({
        name: req.body.name,
        description: req.body.description,
        businessUserId: req.body.businessUserId,
        jiraProjectKey: req.body.jiraProjectKey,
      });

      const project = await storage.createProject(validated);

      // Create milestones with AI-generated skill maps
      if (req.body.milestones && Array.isArray(req.body.milestones)) {
        for (const m of req.body.milestones) {
          // Generate skill map using Gemini AI
          let skillMap = null;
          try {
            skillMap = await generateSkillMap(m.name, m.description);
          } catch (error) {
            console.error("Failed to generate skill map:", error);
          }

          const milestone = await storage.createMilestone({
            projectId: project.id,
            name: m.name,
            description: m.description,
            estimatedHours: m.estimatedHours,
            skillMap: skillMap as any,
          });

          // Auto-match candidates if skill map was generated
          if (skillMap) {
            const candidates = await storage.getAllCandidates();
            for (const candidate of candidates) {
              if (candidate.skills && candidate.skills.length > 0) {
                try {
                  const fitAnalysis = await calculateFitScore(
                    candidate.skills,
                    candidate.experience || "",
                    skillMap
                  );

                  await storage.createFitScore({
                    candidateId: candidate.id,
                    milestoneId: milestone.id,
                    score: Math.round(fitAnalysis.score),
                    skillOverlap: Math.round(fitAnalysis.skillOverlap),
                    experienceMatch: Math.round(fitAnalysis.experienceMatch),
                    softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
                    reasoning: fitAnalysis.reasoning,
                  });
                } catch (error) {
                  console.error(`Failed to calculate fit score for candidate ${candidate.id}:`, error);
                }
              }
            }
          }
        }
      }

      // Sync with Jira if project key is provided
      if (validated.jiraProjectKey) {
        try {
          await syncJiraMilestones(validated.jiraProjectKey, validated.businessUserId);
        } catch (error) {
          console.error("Failed to sync with Jira:", error);
        }
      }

      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get Jira settings for business user
  app.get("/api/jira/settings/:businessUserId", async (req, res) => {
    try {
      const { businessUserId } = req.params;
      const settings = await storage.getJiraSettings(businessUserId);
      
      if (!settings) {
        return res.json({ 
          isConfigured: false,
          connectionType: "replit_connector"
        });
      }
      
      // Don't send API token in response
      const { jiraApiToken, ...safeSettings } = settings;
      res.json(safeSettings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save Jira settings (with encryption for API token)
  app.post("/api/jira/settings", async (req, res) => {
    try {
      const validated = insertJiraSettingsSchema.parse(req.body);
      
      // Encrypt API token before saving
      if (validated.jiraApiToken) {
        validated.jiraApiToken = safeEncrypt(validated.jiraApiToken);
      }
      
      const settings = await storage.saveJiraSettings(validated);
      
      // Don't send API token in response
      const { jiraApiToken, ...safeSettings } = settings;
      res.json(safeSettings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Test Jira connection
  app.post("/api/jira/test-connection", async (req, res) => {
    try {
      const { businessUserId } = req.body;
      
      // Try to fetch projects to test connection
      const jiraProjects = await fetchAllJiraProjects(businessUserId);
      
      // Update last synced time
      await storage.updateJiraSettings(businessUserId, {
        isConfigured: true,
        lastSyncedAt: new Date()
      });
      
      res.json({ 
        success: true, 
        projectCount: jiraProjects.length,
        message: `Successfully connected! Found ${jiraProjects.length} Jira projects.`
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Import projects from Jira
  app.post("/api/jira/import-projects", async (req, res) => {
    const businessUserId = req.body.businessUserId || "demo-business-user";
    
    try {
      // Fetch all projects from Jira
      const jiraProjects = await fetchAllJiraProjects(businessUserId);

      const importedProjects = [];

      for (const jiraProject of jiraProjects) {
        // Check if project already exists
        const existingProjects = await storage.getAllProjects();
        let project = existingProjects.find(p => p.jiraProjectKey === jiraProject.key);

        if (project) {
          console.log(`Project ${jiraProject.key} already exists, re-syncing tasks...`);
        } else {
          // Create project in database
          project = await storage.createProject({
            name: jiraProject.name,
            description: jiraProject.description || `Imported from Jira project ${jiraProject.key}`,
            businessUserId,
            jiraProjectKey: jiraProject.key,
          });
        }

        // Fetch and create milestones from Jira sprints
        try {
          const sprints = await fetchProjectSprints(jiraProject.key, businessUserId);
          
          if (sprints.length === 0) {
            console.log(`No sprints found for project ${jiraProject.key}, falling back to issue-based import`);
            // Fallback: use legacy approach for projects without sprints
            const issues = await syncJiraMilestones(jiraProject.key, businessUserId);
            
            for (const issue of issues) {
              let skillMap = null;
              try {
                skillMap = await generateSkillMap(issue.summary, issue.description || "");
              } catch (error) {
                console.error(`Failed to generate skill map for issue ${issue.key}:`, error);
              }

              const milestone = await storage.createMilestone({
                projectId: project.id,
                name: issue.summary,
                description: issue.description || "",
                estimatedHours: issue.timeEstimate ? issue.timeEstimate / 3600 : 40,
                skillMap: skillMap as any,
              });

              if (skillMap) {
                const candidates = await storage.getAllCandidates();
                for (const candidate of candidates) {
                  if (candidate.skills && candidate.skills.length > 0) {
                    try {
                      const fitAnalysis = await calculateFitScore(
                        candidate.skills,
                        candidate.experience || "",
                        skillMap
                      );

                      await storage.createFitScore({
                        candidateId: candidate.id,
                        milestoneId: milestone.id,
                        score: Math.round(fitAnalysis.score),
                        skillOverlap: Math.round(fitAnalysis.skillOverlap),
                        experienceMatch: Math.round(fitAnalysis.experienceMatch),
                        softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
                        reasoning: fitAnalysis.reasoning,
                      });
                    } catch (error) {
                      console.error(`Failed to calculate fit score for candidate ${candidate.id}:`, error);
                    }
                  }
                }
              }
            }
          } else {
            // Sprint-based import: Each sprint becomes a milestone
            // Get existing milestones to check for duplicates
            const existingMilestones = await storage.getMilestonesByProject(project.id);
            
            for (const sprint of sprints) {
              // Fetch all issues in this sprint
              const sprintIssues = await fetchSprintIssues(sprint.id, businessUserId);
              
              if (sprintIssues.length === 0) {
                console.log(`No issues found in sprint ${sprint.name}`);
                continue;
              }
              
              // Calculate total estimated hours for the sprint
              const totalHours = sprintIssues.reduce((sum, issue) => {
                return sum + (issue.timeEstimate ? issue.timeEstimate / 3600 : 0);
              }, 0);
              
              // Create description with all tasks listed
              const tasksDescription = sprintIssues
                .map(issue => `- [${issue.status}] ${issue.key}: ${issue.summary}`)
                .join('\n');
              
              const sprintDescription = `${sprint.goal || 'Sprint tasks'}\n\n**Tasks (${sprintIssues.length}):**\n${tasksDescription}`;
              
              // Generate skill map from all sprint tasks combined
              const combinedTaskSummary = sprintIssues.map(i => i.summary).join('; ');
              let skillMap = null;
              try {
                skillMap = await generateSkillMap(sprint.name, combinedTaskSummary);
              } catch (error) {
                console.error(`Failed to generate skill map for sprint ${sprint.name}:`, error);
              }

              // Check if milestone for this sprint already exists
              const existingMilestone = existingMilestones.find(m => m.name === sprint.name);
              
              let milestone: Milestone;
              if (existingMilestone) {
                // Update existing milestone with latest data
                console.log(`Updating existing milestone: ${sprint.name}`);
                const updated = await storage.updateMilestone(existingMilestone.id, {
                  description: sprintDescription,
                  estimatedHours: totalHours || 80,
                  skillMap: skillMap as any,
                });
                milestone = updated || existingMilestone;
              } else {
                // Create new milestone
                milestone = await storage.createMilestone({
                  projectId: project.id,
                  name: sprint.name,
                  description: sprintDescription,
                  estimatedHours: totalHours || 80,
                  skillMap: skillMap as any,
                });
              }

              // Auto-match candidates if skill map was generated
              if (skillMap && milestone) {
                const candidates = await storage.getAllCandidates();
                for (const candidate of candidates) {
                  if (candidate.skills && candidate.skills.length > 0) {
                    try {
                      const fitAnalysis = await calculateFitScore(
                        candidate.skills,
                        candidate.experience || "",
                        skillMap
                      );

                      // Check if fit score already exists for this candidate-milestone pair
                      const existingFitScores = await storage.getTopCandidatesForMilestone(milestone.id, 1000);
                      const existingFitScore = existingFitScores.find(fs => fs.candidate.id === candidate.id);

                      if (existingFitScore) {
                        // Update existing fit score
                        await storage.updateFitScore(existingFitScore.id, {
                          score: Math.round(fitAnalysis.score),
                          skillOverlap: Math.round(fitAnalysis.skillOverlap),
                          experienceMatch: Math.round(fitAnalysis.experienceMatch),
                          softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
                          reasoning: fitAnalysis.reasoning,
                        });
                      } else {
                        // Create new fit score
                        await storage.createFitScore({
                          candidateId: candidate.id,
                          milestoneId: milestone.id,
                          score: fitAnalysis.score,
                          skillOverlap: fitAnalysis.skillOverlap,
                          experienceMatch: fitAnalysis.experienceMatch,
                          softSkillRelevance: fitAnalysis.softSkillRelevance,
                          reasoning: fitAnalysis.reasoning,
                        });
                      }
                    } catch (error) {
                      console.error(`Failed to calculate fit score for candidate ${candidate.id}:`, error);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to sync milestones for project ${jiraProject.key}:`, error);
        }

        importedProjects.push(project);
      }

      res.json({
        success: true,
        imported: importedProjects.length,
        projects: importedProjects,
      });
    } catch (error: any) {
      console.error("Error importing Jira projects:", error);
      
      // Log the failed sync
      await storage.createJiraSyncLog({
        businessUserId,
        syncType: 'import_projects',
        status: 'failed',
        error: error.message,
        errorDetails: {
          stack: error.stack,
          statusCode: error?.response?.status
        } as any,
        canRetry: true,
        startedAt: new Date(),
        completedAt: new Date(),
      });
      
      res.status(500).json({ 
        error: error.message,
        canRetry: true,
        message: 'Jira import failed. You can retry from the dashboard.'
      });
    }
  });

  // Get milestones for a project
  app.get("/api/projects/:id/milestones", async (req, res) => {
    try {
      const milestones = await storage.getMilestonesByProject(req.params.id);
      res.json(milestones);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get top candidates for a project
  app.get("/api/projects/:id/candidates", async (req, res) => {
    try {
      const milestones = await storage.getMilestonesByProject(req.params.id);
      const allCandidates: any[] = [];

      for (const milestone of milestones) {
        const topCandidates = await storage.getTopCandidatesForMilestone(milestone.id, 5);
        for (const tc of topCandidates) {
          if (!allCandidates.find(c => c.id === tc.candidate.id)) {
            allCandidates.push({
              ...tc.candidate,
              fitScore: tc.score,
            });
          }
        }
      }

      res.json(allCandidates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get risk alerts for a project
  app.get("/api/projects/:id/risks", async (req, res) => {
    try {
      const milestones = await storage.getMilestonesByProject(req.params.id);
      const allRisks = [];

      for (const milestone of milestones) {
        const risks = await storage.getRiskAlertsByMilestone(milestone.id);
        for (const risk of risks) {
          allRisks.push({
            ...risk,
            milestoneName: milestone.name,
          });
        }
      }

      res.json(allRisks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== BUSINESS REVIEW WORKFLOW (P1-7) ==========
  
  // Approve/edit skill map for a milestone
  app.patch("/api/milestones/:id/approve-skillmap", async (req, res) => {
    try {
      const { id } = req.params;
      const { skillMap, approved } = req.body;
      
      // Validate approved flag if provided
      if (approved !== undefined && typeof approved !== 'boolean') {
        return res.status(400).json({ error: "approved must be a boolean" });
      }
      
      const milestone = await storage.getMilestone(id);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      // Build update object - only update fields that are provided
      const updateData: any = {};
      if (skillMap !== undefined) {
        updateData.skillMap = skillMap;
      }
      if (approved !== undefined) {
        updateData.skillMapApproved = approved;
      }
      
      // Update milestone
      const updated = await storage.updateMilestone(id, updateData);
      
      // If approved, always recalculate fit scores using the current skill map
      const finalSkillMap = skillMap || milestone.skillMap;
      if (approved && finalSkillMap) {
        const candidates = await storage.getAllCandidates();
        for (const candidate of candidates) {
          if (candidate.skills && candidate.skills.length > 0) {
            try {
              const { calculateFitScore } = await import("./gemini.js");
              const fitAnalysis = await calculateFitScore(
                candidate.skills,
                candidate.experience || "",
                finalSkillMap // Use finalSkillMap, not skillMap!
              );
              
              // Check if fit score exists
              const existingFitScores = await storage.getTopCandidatesForMilestone(id, 1000);
              const existingFitScore = existingFitScores.find(fs => fs.candidate.id === candidate.id);
              
              if (existingFitScore) {
                await storage.updateFitScore(existingFitScore.id, {
                  score: Math.round(fitAnalysis.score),
                  skillOverlap: Math.round(fitAnalysis.skillOverlap),
                  experienceMatch: Math.round(fitAnalysis.experienceMatch),
                  softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
                  reasoning: fitAnalysis.reasoning,
                });
              } else {
                await storage.createFitScore({
                  candidateId: candidate.id,
                  milestoneId: id,
                  score: fitAnalysis.score,
                  skillOverlap: fitAnalysis.skillOverlap,
                  experienceMatch: fitAnalysis.experienceMatch,
                  softSkillRelevance: fitAnalysis.softSkillRelevance,
                  reasoning: fitAnalysis.reasoning,
                });
              }
            } catch (error) {
              console.error(`Failed to calculate fit score for candidate ${candidate.id}:`, error);
            }
          }
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Mark candidates as notified for a milestone
  app.post("/api/milestones/:id/notify-candidates", async (req, res) => {
    try {
      const { id } = req.params;
      const { candidateIds } = req.body; // Array of candidate IDs to notify
      
      if (!candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ error: "candidateIds array is required" });
      }
      
      const milestone = await storage.getMilestone(id);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      if (!milestone.skillMapApproved) {
        return res.status(400).json({ error: "Skill map must be approved before notifying candidates" });
      }
      
      // Mark as notified
      await storage.updateMilestone(id, {
        candidatesNotified: true,
      });
      
      // In a real system, this would send email notifications to selected candidates
      // For now, we just mark the milestone as having notified candidates
      
      res.json({ 
        success: true, 
        notifiedCount: candidateIds.length,
        message: `Notified ${candidateIds.length} candidates about this opportunity`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync Jira tasks for a specific project
  app.post("/api/projects/:id/sync-jira", async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!project.jiraProjectKey) {
        return res.status(400).json({ error: "Project is not linked to Jira" });
      }

      const businessUserId = project.businessUserId || "demo-business-user";

      // Fetch issues from Jira
      const issues = await syncJiraMilestones(project.jiraProjectKey, businessUserId);
      
      // Get existing milestones to check for duplicates
      const existingMilestones = await storage.getMilestonesByProject(projectId);
      let createdCount = 0;
      let updatedCount = 0;

      for (const issue of issues) {
        let skillMap = null;
        try {
          skillMap = await generateSkillMap(issue.summary, issue.description || "");
        } catch (error) {
          console.error(`Failed to generate skill map for issue ${issue.key}:`, error);
        }

        // Check if milestone already exists (by name)
        const existingMilestone = existingMilestones.find(m => m.name === issue.summary);

        let milestone: Milestone;
        if (existingMilestone) {
          // Update existing milestone
          console.log(`Updating existing milestone: ${issue.summary}`);
          const updated = await storage.updateMilestone(existingMilestone.id, {
            description: issue.description || "",
            estimatedHours: issue.timeEstimate ? issue.timeEstimate / 3600 : 40,
            skillMap: skillMap as any,
            jiraIssueKey: issue.key,
            jiraEpicKey: issue.epicKey || null,
            jiraSprintId: issue.sprintId || null,
            jiraSprintName: issue.sprintName || null,
          });
          milestone = updated || existingMilestone;
          updatedCount++;
        } else {
          // Create new milestone
          milestone = await storage.createMilestone({
            projectId: project.id,
            name: issue.summary,
            description: issue.description || "",
            estimatedHours: issue.timeEstimate ? issue.timeEstimate / 3600 : 40,
            skillMap: skillMap as any,
            jiraIssueKey: issue.key,
            jiraEpicKey: issue.epicKey || null,
            jiraSprintId: issue.sprintId || null,
            jiraSprintName: issue.sprintName || null,
          });
          createdCount++;
        }

        // Auto-match candidates if skill map was generated
        if (skillMap) {
          const candidates = await storage.getAllCandidates();
          for (const candidate of candidates) {
            if (candidate.skills && candidate.skills.length > 0) {
              try {
                const fitAnalysis = await calculateFitScore(
                  candidate.skills,
                  candidate.experience || "",
                  skillMap
                );

                // Check if fit score already exists
                const existingFitScores = await storage.getFitScoresByMilestone(milestone.id);
                const existingScore = existingFitScores.find(fs => fs.candidateId === candidate.id);

                if (existingScore) {
                  // Update existing fit score
                  await storage.updateFitScore(existingScore.id, {
                    score: fitAnalysis.score,
                    skillOverlap: fitAnalysis.skillOverlap,
                    experienceMatch: fitAnalysis.experienceMatch,
                    softSkillRelevance: fitAnalysis.softSkillRelevance,
                    reasoning: fitAnalysis.reasoning,
                  });
                } else {
                  // Create new fit score
                  await storage.createFitScore({
                    candidateId: candidate.id,
                    milestoneId: milestone.id,
                    score: Math.round(fitAnalysis.score),
                    skillOverlap: Math.round(fitAnalysis.skillOverlap),
                    experienceMatch: Math.round(fitAnalysis.experienceMatch),
                    softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
                    reasoning: fitAnalysis.reasoning,
                  });
                }
              } catch (error) {
                console.error(`Failed to calculate fit score for candidate ${candidate.id}:`, error);
              }
            }
          }
        }
      }

      res.json({
        success: true,
        synced: issues.length,
        created: createdCount,
        updated: updatedCount,
        message: `Synced ${issues.length} tasks from Jira (${createdCount} new, ${updatedCount} updated)`,
      });
    } catch (error: any) {
      console.error("Error syncing Jira tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI ENDPOINTS ==========

  // Generate skill map using Gemini AI
  app.post("/api/ai/generate-skill-map", async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const skillMap = await generateSkillMap(name, description);
      res.json({ skillMap });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate fit score between candidate and milestone
  app.post("/api/ai/calculate-fit-score", async (req, res) => {
    try {
      const { candidateId, milestoneId } = req.body;

      const candidate = await storage.getCandidate(candidateId);
      const milestone = await storage.getMilestone(milestoneId);

      if (!candidate || !milestone) {
        return res.status(404).json({ error: "Candidate or milestone not found" });
      }

      if (!milestone.skillMap || !candidate.skills) {
        return res.status(400).json({ error: "Missing skill data" });
      }

      const fitAnalysis = await calculateFitScore(
        candidate.skills,
        candidate.experience || "",
        milestone.skillMap as any
      );

      const fitScore = await storage.createFitScore({
        candidateId,
        milestoneId,
        score: Math.round(fitAnalysis.score),
        skillOverlap: Math.round(fitAnalysis.skillOverlap),
        experienceMatch: Math.round(fitAnalysis.experienceMatch),
        softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
        reasoning: fitAnalysis.reasoning,
      });

      res.json(fitScore);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Predict risk for a milestone
  app.post("/api/ai/predict-risk", async (req, res) => {
    try {
      const { milestoneId, delayPercentage } = req.body;

      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }

      const riskAnalysis = await predictRisk(
        milestone.name,
        milestone.description,
        delayPercentage || milestone.delayPercentage || 0,
        milestone.estimatedHours || 40
      );

      // Update milestone risk level
      await storage.updateMilestone(milestoneId, {
        riskLevel: riskAnalysis.risk_level,
        delayPercentage: riskAnalysis.delay_percentage,
        status: riskAnalysis.risk_level === "high" ? "delayed" : milestone.status,
      });

      // Create risk alert
      const riskAlert = await storage.createRiskAlert({
        milestoneId,
        riskLevel: riskAnalysis.risk_level,
        delayPercentage: riskAnalysis.delay_percentage,
        aiAnalysis: riskAnalysis as any,
        backupActivated: false,
      });

      res.json({ riskAlert, analysis: riskAnalysis });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CANDIDATES ==========

  // Get candidate profile (demo - using email param)
  app.get("/api/candidate/profile", async (req, res) => {
    try {
      const email = req.query.email as string || "demo@example.com";
      let candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        candidate = await storage.createCandidate({
          email,
          name: "Demo Candidate",
          isAvailable: true,
        });
      }

      res.json(candidate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update candidate profile
  app.put("/api/candidate/profile", async (req, res) => {
    try {
      const email = req.query.email as string || "demo@example.com";
      let candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        candidate = await storage.createCandidate({
          email,
          name: req.body.name,
        });
      } else {
        candidate = await storage.updateCandidate(candidate.id, {
          name: req.body.name,
          phone: req.body.phone,
          linkedinUrl: req.body.linkedinUrl,
          githubUrl: req.body.githubUrl,
          availableFrom: req.body.availableFrom ? new Date(req.body.availableFrom) : undefined,
          availableUntil: req.body.availableUntil ? new Date(req.body.availableUntil) : undefined,
        });
      }

      res.json(candidate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Upload and analyze CV with AI and auto-match to projects (Background Job)
  app.post("/api/candidate/upload-cv", upload.single("cv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const email = req.query.email as string || "demo@example.com";
      let candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found. Please create profile first." });
      }

      // Update candidate with file path immediately
      candidate = await storage.updateCandidate(candidate.id, {
        cvFilePath: req.file.path,
      });

      if (!candidate) {
        return res.status(500).json({ error: "Failed to update candidate" });
      }

      // Create background job for CV processing
      const job = await storage.createJob({
        jobType: "cv_processing",
        userId: candidate.id,
        userEmail: candidate.email,
        status: "pending",
        payload: {
          candidateId: candidate.id,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
        } as any,
        progress: 0,
        maxAttempts: 3,
      });

      console.log(`✓ CV upload job ${job.id} created for candidate ${candidate.id}`);

      // Return immediately - processing happens in background
      res.json({ 
        success: true, 
        candidate,
        jobId: job.id,
        message: "CV uploaded successfully. Processing in background..."
      });
    } catch (error: any) {
      console.error("CV upload error:", error);
      res.status(500).json({ 
        error: "Failed to upload CV. Please try again.",
        details: error.message 
      });
    }
  });

  // Get candidate recommendations (projects with >70% fit)
  app.get("/api/candidate/recommendations", async (req, res) => {
    try {
      const email = req.query.email as string || "demo@example.com";
      const candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.json([]);
      }

      const fitScores = await storage.getFitScoresByCandidate(candidate.id);
      const recommendations = [];

      // Get skipped jobs to filter them out
      const actions = await storage.getActions(candidate.id);
      const skippedMilestoneIds = actions
        .filter(a => a.action === "skip")
        .map(a => a.milestoneId);

      for (const score of fitScores) {
        // Filter out skipped jobs and only show high fit scores
        if (score.score >= 70 && !skippedMilestoneIds.includes(score.milestoneId)) {
          const milestone = await storage.getMilestone(score.milestoneId);
          if (milestone) {
            const project = await storage.getProject(milestone.projectId);
            recommendations.push({
              id: milestone.id,
              projectId: project?.id,
              projectName: project?.name,
              milestoneName: milestone.name,
              description: milestone.description,
              fitScore: score.score,
              skillOverlap: score.skillOverlap,
              experienceMatch: score.experienceMatch,
              softSkillRelevance: score.softSkillRelevance,
              reasoning: score.reasoning,
            });
          }
        }
      }

      // Sort by fit score descending
      recommendations.sort((a, b) => b.fitScore - a.fitScore);

      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get candidate stats
  app.get("/api/candidate/stats", async (req, res) => {
    try {
      const email = req.query.email as string || "demo@example.com";
      const candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.json({ applications: 0, matches: 0, avgFitScore: 0 });
      }

      const fitScores = await storage.getFitScoresByCandidate(candidate.id);
      const applications = await storage.getApplicationsByCandidate(candidate.id);
      const matches = fitScores.filter(s => s.score >= 70).length;
      const avgFitScore = fitScores.length > 0
        ? Math.round(fitScores.reduce((sum, s) => sum + s.score, 0) / fitScores.length)
        : 0;

      res.json({
        applications: applications.length,
        matches,
        avgFitScore,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save job for later
  app.post("/api/candidate/save-job", async (req, res) => {
    try {
      const { milestoneId } = req.body;
      const email = req.query.email as string || "demo@example.com";
      const candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate profile not found" });
      }

      // Check if already saved
      const isSaved = await storage.isJobSaved(candidate.id, milestoneId);
      if (isSaved) {
        return res.status(400).json({ error: "Job already saved" });
      }

      const savedJob = await storage.saveJob(candidate.id, milestoneId);
      await storage.recordAction(candidate.id, milestoneId, "save");

      res.json(savedJob);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Skip job
  app.post("/api/candidate/skip-job", async (req, res) => {
    try {
      const { milestoneId } = req.body;
      const email = req.query.email as string || "demo@example.com";
      const candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate profile not found" });
      }

      await storage.recordAction(candidate.id, milestoneId, "skip");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Apply to job
  app.post("/api/candidate/apply", async (req, res) => {
    try {
      const { milestoneId, projectId } = req.body;
      const email = req.query.email as string || "demo@example.com";
      const candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate profile not found" });
      }

      // Create application
      const application = await storage.createApplication({
        candidateId: candidate.id,
        milestoneId,
        projectId,
        status: "pending",
      });

      // Record action
      await storage.recordAction(candidate.id, milestoneId, "apply");

      res.json(application);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== BUSINESS STATS ==========
  
  app.get("/api/business/stats", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      const candidates = await storage.getAllCandidates();
      
      let totalScore = 0;
      let scoreCount = 0;
      let riskCount = 0;

      for (const project of projects) {
        const milestones = await storage.getMilestonesByProject(project.id);
        for (const milestone of milestones) {
          const scores = await storage.getFitScoresByMilestone(milestone.id);
          totalScore += scores.reduce((sum, s) => sum + s.score, 0);
          scoreCount += scores.length;

          const risks = await storage.getRiskAlertsByMilestone(milestone.id);
          riskCount += risks.filter(r => r.riskLevel === "high" || r.riskLevel === "medium").length;
        }
      }

      res.json({
        totalProjects: projects.length,
        totalCandidates: candidates.length,
        avgFitScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        riskAlerts: riskCount,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== JIRA INTEGRATION ==========

  // Sync Jira project
  app.post("/api/jira/sync/:projectKey", async (req, res) => {
    try {
      const businessUserId = req.body.businessUserId || "demo-business-user";
      const issues = await syncJiraMilestones(req.params.projectKey, businessUserId);
      res.json({ issues, count: issues.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Monitor project delays
  app.get("/api/jira/monitor/:projectKey", async (req, res) => {
    try {
      const delays = await monitorProjectDelays(req.params.projectKey);
      res.json(delays);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get Jira sync logs for business user
  app.get("/api/jira/sync-logs/:businessUserId", async (req, res) => {
    try {
      const { businessUserId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getJiraSyncLogs(businessUserId, limit);
      res.json({ logs, count: logs.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get failed Jira syncs (for retry UI)
  app.get("/api/jira/failed-syncs/:businessUserId", async (req, res) => {
    try {
      const { businessUserId } = req.params;
      const failedLogs = await storage.getFailedJiraSyncLogs(businessUserId);
      res.json({ logs: failedLogs, count: failedLogs.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MAGIC LINK AUTHENTICATION ==========
  
  const { generateMagicLinkToken, generateMagicLinkUrl, sendMagicLinkEmail } = await import("./magic-link-utils");
  
  // Request a magic link
  app.post("/api/auth/request-magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const emailLower = email.toLowerCase().trim();

      // Rate limiting: Check recent requests (max 5 per hour)
      const recentLinks = await storage.getRecentMagicLinksByEmail(emailLower, 60);
      if (recentLinks.length >= 5) {
        return res.status(429).json({ 
          error: "Too many requests. Please wait before requesting another link." 
        });
      }

      // Invalidate all previous unused magic links for this email
      await storage.invalidateOldMagicLinks(emailLower);

      // Check if user exists and determine role
      let role = "candidate"; // Default role
      let userId = null;
      
      const candidate = await storage.getCandidateByEmail(emailLower);
      if (candidate) {
        role = "candidate";
        userId = candidate.id;
        console.log(`🔍 Role detection for ${emailLower}: Found candidate → role = candidate`);
      } else {
        // Check if email belongs to a business user (check project ownership)
        const allProjects = await storage.getAllProjects();
        const userProjects = allProjects.filter(p => p.businessUserId === emailLower);
        
        console.log(`🔍 Role detection for ${emailLower}: Checking projects... found ${userProjects.length} projects`);
        
        if (userProjects.length > 0) {
          role = "business";
          userId = emailLower; // Use email as business user ID
          console.log(`🔍 Role detection for ${emailLower}: Has projects → role = business`);
        } else {
          // Default to candidate for new users (shadow accounts will be created)
          role = "candidate";
          console.log(`🔍 Role detection for ${emailLower}: No projects → role = candidate (default)`);
        }
      }

      // Generate cryptographically secure token
      const token = generateMagicLinkToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Get client info for tracking
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.get("user-agent") || "unknown";

      // Save magic link to database
      await storage.createMagicLink({
        token,
        email: emailLower,
        userId,
        role,
        used: false,
        ipAddress,
        userAgent,
        expiresAt,
      });

      // Generate magic link URL
      // Use REPLIT_DOMAINS for production deployment URL
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `http://localhost:5000`;
      const magicLinkUrl = generateMagicLinkUrl(token, baseUrl);
      
      console.log(`🔗 Magic link URL created: ${magicLinkUrl}`);

      // Send email (mock in development)
      await sendMagicLinkEmail(emailLower, magicLinkUrl);

      res.json({ 
        success: true, 
        message: "Magic link sent to your email. Please check your inbox." 
      });
    } catch (error: any) {
      console.error("Error requesting magic link:", error);
      res.status(500).json({ error: "Failed to send magic link. Please try again." });
    }
  });

  // Verify magic link token
  app.get("/api/auth/verify-magic-link", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Token is required" });
      }

      // Fetch magic link from database
      const magicLink = await storage.getMagicLinkByToken(token);

      if (!magicLink) {
        return res.status(404).json({ error: "Invalid link. This link is not valid." });
      }

      // Check if already used
      if (magicLink.used) {
        return res.status(400).json({ error: "This link has already been used." });
      }

      // Check if expired
      const now = new Date();
      if (now > magicLink.expiresAt) {
        return res.status(400).json({ error: "This link has expired. Please request a new one." });
      }

      // Mark as used
      await storage.markMagicLinkAsUsed(token);

      // Get or create user account
      let user;
      if (magicLink.role === "candidate") {
        user = await storage.getCandidateByEmail(magicLink.email);
        
        // Create shadow account if doesn't exist
        if (!user) {
          user = await storage.createCandidate({
            email: magicLink.email,
            name: magicLink.email.split("@")[0], // Default name from email
          });
        }
      } else {
        // Business user logic (simplified for now)
        user = { email: magicLink.email, role: "business" };
      }

      // Create session (for now, just return user data - you can implement express-session later)
      res.json({
        success: true,
        user: {
          id: user.id || "business-user",
          email: magicLink.email,
          role: magicLink.role,
          name: user.name || magicLink.email.split("@")[0],
        },
        redirectTo: magicLink.role === "business" ? "/business" : "/candidate/dashboard",
      });
    } catch (error: any) {
      console.error("Error verifying magic link:", error);
      res.status(500).json({ error: "Something went wrong. Please try again later." });
    }
  });

  // ========== BUSINESS INTERESTS (Multi-Business Competition) ==========
  
  // Business expresses interest in a candidate for a milestone
  app.post("/api/business-interests", async (req, res) => {
    try {
      const { businessUserId, candidateId, milestoneId, projectId, offerBudget, notes } = req.body;
      
      // Get fit score to calculate priority
      const fitScores = await storage.getFitScoresByCandidate(candidateId);
      const fitScore = fitScores.find(f => f.milestoneId === milestoneId);
      
      if (!fitScore) {
        return res.status(404).json({ error: "Fit score not found for this candidate" });
      }
      
      // Calculate initial priority score (no candidate preference yet)
      const { calculatePriorityScore } = await import("./priority-scorer.js");
      const { priorityScore } = calculatePriorityScore({
        fitScore: fitScore.score,
        offerBudget: offerBudget || 0,
      });
      
      const interest = await storage.createBusinessInterest({
        businessUserId,
        candidateId,
        milestoneId,
        projectId,
        status: "interested",
        offerBudget: offerBudget || null,
        priorityScore,
        notes: notes || null,
      });
      
      res.json(interest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get competing offers for a candidate (top 3)
  app.get("/api/business-interests/candidate/:candidateId/competing", async (req, res) => {
    try {
      const { candidateId } = req.params;
      const interests = await storage.getCompetingOffersForCandidate(candidateId);
      
      // Recalculate priority scores with normalized budgets
      const { calculateCompetingPriorityScores, getTopCompetingOffers } = await import("./priority-scorer.js");
      
      // Get fit scores for each interest
      const enrichedInterests = await Promise.all(
        interests.map(async (interest) => {
          const fitScores = await storage.getFitScoresByCandidate(interest.candidateId);
          const fitScore = fitScores.find(f => f.milestoneId === interest.milestoneId);
          const milestone = await storage.getMilestone(interest.milestoneId);
          const project = await storage.getProject(interest.projectId);
          
          return {
            ...interest,
            fitScore: fitScore?.score || 0,
            milestone,
            project,
          };
        })
      );
      
      // Recalculate scores
      const scoredInterests = calculateCompetingPriorityScores(
        enrichedInterests.map(i => ({
          id: i.id,
          fitScore: i.fitScore,
          offerBudget: i.offerBudget || 0,
          candidatePreference: i.candidatePreference || undefined,
        }))
      );
      
      // Merge scores back into interests
      const interestsWithScores = enrichedInterests.map(interest => {
        const scored = scoredInterests.find(s => s.id === interest.id);
        return {
          ...interest,
          priorityScore: scored?.priorityScore || interest.priorityScore || 0,
          breakdown: scored?.breakdown,
        };
      });
      
      // Get top 3
      const topOffers = getTopCompetingOffers(interestsWithScores, 3);
      
      res.json(topOffers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all business interests for a milestone
  app.get("/api/business-interests/milestone/:milestoneId", async (req, res) => {
    try {
      const { milestoneId } = req.params;
      const interests = await storage.getBusinessInterestsByMilestone(milestoneId);
      res.json(interests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update business interest (e.g., adjust offer)
  app.patch("/api/business-interests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { offerBudget, status, notes } = req.body;
      
      // Get existing interest
      const existing = await storage.getBusinessInterest(id);
      if (!existing) {
        return res.status(404).json({ error: "Business interest not found" });
      }
      
      // Recalculate priority score if budget changed
      let priorityScore = existing.priorityScore;
      if (offerBudget !== undefined) {
        const fitScores = await storage.getFitScoresByCandidate(existing.candidateId);
        const fitScore = fitScores.find(f => f.milestoneId === existing.milestoneId);
        
        if (fitScore) {
          const { calculatePriorityScore } = await import("./priority-scorer.js");
          const result = calculatePriorityScore({
            fitScore: fitScore.score,
            offerBudget,
            candidatePreference: existing.candidatePreference || undefined,
          });
          priorityScore = result.priorityScore;
        }
      }
      
      const updated = await storage.updateBusinessInterest(id, {
        offerBudget: offerBudget !== undefined ? offerBudget : existing.offerBudget,
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        priorityScore,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Candidate rates an opportunity
  app.post("/api/business-interests/:id/rate", async (req, res) => {
    try {
      const { id } = req.params;
      const { rating } = req.body; // 1-5 stars
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      
      const existing = await storage.getBusinessInterest(id);
      if (!existing) {
        return res.status(404).json({ error: "Business interest not found" });
      }
      
      // Recalculate priority score with candidate preference
      const fitScores = await storage.getFitScoresByCandidate(existing.candidateId);
      const fitScore = fitScores.find(f => f.milestoneId === existing.milestoneId);
      
      if (!fitScore) {
        return res.status(404).json({ error: "Fit score not found" });
      }
      
      const { calculatePriorityScore } = await import("./priority-scorer.js");
      const { priorityScore } = calculatePriorityScore({
        fitScore: fitScore.score,
        offerBudget: existing.offerBudget || 0,
        candidatePreference: rating,
      });
      
      const updated = await storage.updateBusinessInterest(id, {
        candidatePreference: rating,
        priorityScore,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== BACKGROUND JOBS ==========
  
  // Get job status
  app.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get user's jobs
  app.get("/api/jobs/user/:userId", async (req, res) => {
    try {
      const jobs = await storage.getJobsByUser(req.params.userId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start background job worker
  console.log('[Server] Starting background job worker...');
  startJobWorker();

  const httpServer = createServer(app);
  return httpServer;
}
