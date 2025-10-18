import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateSkillMap, analyzeCVText, calculateFitScore, predictRisk } from "./gemini";
import { syncJiraMilestones, getIssueProgress, monitorProjectDelays, fetchAllJiraProjects, fetchProjectSprints, fetchSprintIssues } from "./jira-service";
import { insertProjectSchema, insertMilestoneSchema, insertCandidateSchema, insertFitScoreSchema, insertJiraSettingsSchema, type Milestone } from "@shared/schema";

const upload = multer({ dest: "uploads/" });

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
                    score: fitAnalysis.score,
                    skillOverlap: fitAnalysis.skillOverlap,
                    experienceMatch: fitAnalysis.experienceMatch,
                    softSkillRelevance: fitAnalysis.softSkillRelevance,
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

  // Save Jira settings
  app.post("/api/jira/settings", async (req, res) => {
    try {
      const validated = insertJiraSettingsSchema.parse(req.body);
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
    try {
      const businessUserId = req.body.businessUserId || "demo-business-user";

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
                        score: fitAnalysis.score,
                        skillOverlap: fitAnalysis.skillOverlap,
                        experienceMatch: fitAnalysis.experienceMatch,
                        softSkillRelevance: fitAnalysis.softSkillRelevance,
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
      res.status(500).json({ error: error.message });
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
        score: fitAnalysis.score,
        skillOverlap: fitAnalysis.skillOverlap,
        experienceMatch: fitAnalysis.experienceMatch,
        softSkillRelevance: fitAnalysis.softSkillRelevance,
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

  // Upload and analyze CV with AI and auto-match to projects
  app.post("/api/candidate/upload-cv", upload.single("cv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const email = req.query.email as string || "demo@example.com";
      let candidate = await storage.getCandidateByEmail(email);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // For demo purposes, we'll read the file as text
      const cvText = readFileSync(req.file.path, "utf-8");

      // Analyze CV with Gemini AI
      let cvAnalysis;
      try {
        cvAnalysis = await analyzeCVText(cvText);
      } catch (error) {
        console.error("AI CV analysis failed:", error);
        return res.status(500).json({ error: "Failed to analyze CV with AI. Please check your Gemini API key." });
      }

      // Update candidate with analysis
      candidate = await storage.updateCandidate(candidate.id, {
        cvFilePath: req.file.path,
        cvAnalysis: cvAnalysis as any,
        skills: cvAnalysis.skills,
        experience: cvAnalysis.experience,
        education: cvAnalysis.education,
        name: cvAnalysis.name || candidate.name,
      });

      // Auto-match candidate to all existing milestones
      const projects = await storage.getAllProjects();
      for (const project of projects) {
        const milestones = await storage.getMilestonesByProject(project.id);
        for (const milestone of milestones) {
          if (milestone.skillMap && candidate!.skills && candidate!.skills.length > 0) {
            try {
              const fitAnalysis = await calculateFitScore(
                candidate!.skills,
                candidate!.experience || "",
                milestone.skillMap as any
              );

              await storage.createFitScore({
                candidateId: candidate!.id,
                milestoneId: milestone.id,
                score: fitAnalysis.score,
                skillOverlap: fitAnalysis.skillOverlap,
                experienceMatch: fitAnalysis.experienceMatch,
                softSkillRelevance: fitAnalysis.softSkillRelevance,
                reasoning: fitAnalysis.reasoning,
              });
            } catch (error) {
              console.error(`Failed to calculate fit score for milestone ${milestone.id}:`, error);
            }
          }
        }
      }

      res.json({ success: true, candidate });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

      for (const score of fitScores) {
        if (score.score >= 70) {
          const milestone = await storage.getMilestone(score.milestoneId);
          if (milestone) {
            const project = await storage.getProject(milestone.projectId);
            recommendations.push({
              id: score.id,
              projectName: project?.name,
              milestoneName: milestone.name,
              description: milestone.description,
              fitScore: score.score,
            });
          }
        }
      }

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
      const matches = fitScores.filter(s => s.score >= 70).length;
      const avgFitScore = fitScores.length > 0
        ? Math.round(fitScores.reduce((sum, s) => sum + s.score, 0) / fitScores.length)
        : 0;

      res.json({
        applications: fitScores.length,
        matches,
        avgFitScore,
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
