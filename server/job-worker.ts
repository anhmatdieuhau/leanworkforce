import { storage } from "./storage";
import { parseDocument } from "./document-parser";
import { analyzeCVText, calculateFitScore, generateSkillMap } from "./gemini";
import { calculateFallbackFitScore, extractFallbackSkillMap } from "./fallback-scoring";
import { sendJobCompletionEmail } from "./sendgrid";
import type { BackgroundJob } from "@shared/schema";

/**
 * Background Job Worker - processes async jobs
 */

let isWorkerRunning = false;
const POLL_INTERVAL = 5000; // Check for new jobs every 5 seconds
const MAX_CONCURRENT_JOBS = 3;

/**
 * Start the background job worker
 */
export function startJobWorker() {
  if (isWorkerRunning) {
    console.log('[Job Worker] Already running');
    return;
  }
  
  isWorkerRunning = true;
  console.log('[Job Worker] Starting background job processor...');
  
  // Start polling for jobs
  processJobQueue();
}

/**
 * Stop the job worker
 */
export function stopJobWorker() {
  isWorkerRunning = false;
  console.log('[Job Worker] Stopped');
}

/**
 * Main job queue processing loop
 */
async function processJobQueue() {
  while (isWorkerRunning) {
    try {
      // Get pending jobs
      const pendingJobs = await storage.getPendingJobs(MAX_CONCURRENT_JOBS);
      
      if (pendingJobs.length > 0) {
        console.log(`[Job Worker] Processing ${pendingJobs.length} jobs...`);
        
        // Process jobs in parallel
        await Promise.all(pendingJobs.map(job => processJob(job)));
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error: any) {
      console.error('[Job Worker] Queue processing error:', error.message);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

/**
 * Process a single background job
 */
async function processJob(job: BackgroundJob) {
  const jobId = job.id;
  
  try {
    console.log(`[Job Worker] Processing ${job.jobType} job ${jobId}`);
    
    // Mark job as processing
    await storage.updateJob(jobId, {
      status: "processing",
      startedAt: new Date(),
      attempts: (job.attempts || 0) + 1,
    });
    
    // Execute job based on type
    let result: any;
    switch (job.jobType) {
      case "cv_processing":
        result = await processCVJob(job);
        break;
      case "fit_score_calculation":
        result = await processFitScoreJob(job);
        break;
      case "skill_map_generation":
        result = await processSkillMapJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
    
    // Mark job as completed
    await storage.updateJob(jobId, {
      status: "completed",
      result: result as any,
      progress: 100,
      completedAt: new Date(),
    });
    
    console.log(`[Job Worker] ✓ Completed ${job.jobType} job ${jobId}`);
    
    // Send email notification
    if (job.userEmail) {
      try {
        await sendJobCompletionEmail(job.userEmail, job.jobType, "success");
      } catch (error) {
        console.error('[Job Worker] Email notification failed:', error);
      }
    }
    
  } catch (error: any) {
    console.error(`[Job Worker] ✗ Failed ${job.jobType} job ${jobId}:`, error.message);
    
    // Check if we should retry
    const shouldRetry = (job.attempts || 0) < (job.maxAttempts || 3);
    
    await storage.updateJob(jobId, {
      status: shouldRetry ? "pending" : "failed",
      error: error.message,
    });
    
    // Send failure email if max attempts reached
    if (!shouldRetry && job.userEmail) {
      try {
        await sendJobCompletionEmail(job.userEmail, job.jobType, "failed", error.message);
      } catch (emailError) {
        console.error('[Job Worker] Email notification failed:', emailError);
      }
    }
  }
}

/**
 * Process CV upload job
 */
async function processCVJob(job: BackgroundJob) {
  const { candidateId, filePath, mimeType } = job.payload as any;
  
  console.log(`[CV Processing] Parsing document for candidate ${candidateId}`);
  
  // Step 1: Parse document (10%)
  await storage.updateJob(job.id, { progress: 10 });
  const parseResult = await parseDocument(filePath, mimeType);
  
  if (parseResult.error || !parseResult.text) {
    throw new Error(parseResult.error || "Failed to extract text from CV");
  }
  
  // Step 2: Analyze with AI (50%)
  await storage.updateJob(job.id, { progress: 50 });
  let cvAnalysis;
  let usedFallback = false;
  
  try {
    cvAnalysis = await analyzeCVText(parseResult.text);
  } catch (error: any) {
    console.error('[CV Processing] AI analysis failed, using fallback:', error.message);
    usedFallback = true;
    
    // Fallback: extract basic info from text
    cvAnalysis = {
      name: "Candidate",
      skills: extractKeywords(parseResult.text, ["javascript", "python", "react", "node"]),
      experience: parseResult.text.substring(0, 500),
      education: "Not specified",
    };
  }
  
  // Step 3: Update candidate (70%)
  await storage.updateJob(job.id, { progress: 70 });
  await storage.updateCandidate(candidateId, {
    cvAnalysis: cvAnalysis as any,
    skills: cvAnalysis.skills,
    experience: cvAnalysis.experience,
    education: cvAnalysis.education,
  });
  
  // Step 4: Calculate fit scores (100%)
  await storage.updateJob(job.id, { progress: 90 });
  const matchCount = await calculateAllFitScores(candidateId);
  
  return {
    candidateId,
    cvAnalyzed: true,
    usedAI: !usedFallback,
    matchesFound: matchCount,
    skills: cvAnalysis.skills,
  };
}

/**
 * Process fit score calculation job
 */
async function processFitScoreJob(job: BackgroundJob) {
  const { candidateId, milestoneId } = job.payload as any;
  
  const candidate = await storage.getCandidate(candidateId);
  const milestone = await storage.getMilestone(milestoneId);
  
  if (!candidate || !milestone) {
    throw new Error("Candidate or milestone not found");
  }
  
  if (!milestone.skillMap || !candidate.skills) {
    throw new Error("Missing skill data for fit score calculation");
  }
  
  let fitAnalysis;
  let usedFallback = false;
  
  try {
    fitAnalysis = await calculateFitScore(
      candidate.skills,
      candidate.experience || "",
      milestone.skillMap as any
    );
  } catch (error: any) {
    console.error('[Fit Score] AI calculation failed, using fallback:', error.message);
    usedFallback = true;
    
    fitAnalysis = calculateFallbackFitScore(
      candidate.skills,
      candidate.experience || "",
      milestone.skillMap as any
    );
  }
  
  await storage.createFitScore({
    candidateId,
    milestoneId,
    score: Math.round(fitAnalysis.score),
    skillOverlap: Math.round(fitAnalysis.skillOverlap),
    experienceMatch: Math.round(fitAnalysis.experienceMatch),
    softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
    reasoning: fitAnalysis.reasoning,
  });
  
  return {
    candidateId,
    milestoneId,
    score: Math.round(fitAnalysis.score),
    usedAI: !usedFallback,
  };
}

/**
 * Process skill map generation job
 */
async function processSkillMapJob(job: BackgroundJob) {
  const { milestoneId, name, description } = job.payload as any;
  
  let skillMap;
  let usedFallback = false;
  
  try {
    skillMap = await generateSkillMap(name, description);
  } catch (error: any) {
    console.error('[Skill Map] AI generation failed, using fallback:', error.message);
    usedFallback = true;
    
    skillMap = extractFallbackSkillMap(name, description);
  }
  
  await storage.updateMilestone(milestoneId, {
    skillMap: skillMap as any,
  });
  
  return {
    milestoneId,
    skillMap,
    usedAI: !usedFallback,
  };
}

/**
 * Helper: Calculate fit scores for candidate against all milestones
 */
async function calculateAllFitScores(candidateId: string): Promise<number> {
  const candidate = await storage.getCandidate(candidateId);
  if (!candidate || !candidate.skills || candidate.skills.length === 0) {
    return 0;
  }
  
  const projects = await storage.getAllProjects();
  let matchCount = 0;
  
  for (const project of projects) {
    const milestones = await storage.getMilestonesByProject(project.id);
    
    for (const milestone of milestones) {
      if (!milestone.skillMap) continue;
      
      try {
        let fitAnalysis;
        try {
          fitAnalysis = await calculateFitScore(
            candidate.skills,
            candidate.experience || "",
            milestone.skillMap as any
          );
        } catch (error) {
          // Fallback if AI fails
          fitAnalysis = calculateFallbackFitScore(
            candidate.skills,
            candidate.experience || "",
            milestone.skillMap as any
          );
        }
        
        await storage.createFitScore({
          candidateId,
          milestoneId: milestone.id,
          score: Math.round(fitAnalysis.score),
          skillOverlap: Math.round(fitAnalysis.skillOverlap),
          experienceMatch: Math.round(fitAnalysis.experienceMatch),
          softSkillRelevance: Math.round(fitAnalysis.softSkillRelevance),
          reasoning: fitAnalysis.reasoning,
        });
        
        matchCount++;
      } catch (error) {
        console.error(`[Fit Score] Failed for milestone ${milestone.id}:`, error);
      }
    }
  }
  
  return matchCount;
}

/**
 * Helper: Extract keywords from text
 */
function extractKeywords(text: string, keywords: string[]): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }
  
  return found;
}
