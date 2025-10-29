/**
 * Assignment Validation - Prevents candidate double-booking
 */

import { storage } from './storage';
import type { Candidate, Milestone } from '@shared/schema';

interface AssignmentValidationResult {
  valid: boolean;
  error?: string;
  activeAssignments?: Milestone[];
}

/**
 * Check if candidate has any active assignments
 */
export async function getCandidateActiveAssignments(candidateId: string): Promise<Milestone[]> {
  // Get all milestones where candidate is assigned
  const allMilestones = await storage.getMilestonesByProject(''); // This won't work, need better approach
  
  // Actually, let's query by checking all projects
  const allProjects = await storage.getAllProjects();
  const activeAssignments: Milestone[] = [];
  
  for (const project of allProjects) {
    const milestones = await storage.getMilestonesByProject(project.id);
    
    for (const milestone of milestones) {
      // Check if this candidate is actively assigned
      const isActivelyAssigned = 
        milestone.assignedCandidateId === candidateId &&
        ['confirmed', 'active'].includes(milestone.assignmentStatus || '');
      
      const isActiveBackup = 
        milestone.backupCandidateId === candidateId &&
        ['active'].includes(milestone.backupAssignmentStatus || '');
      
      if (isActivelyAssigned || isActiveBackup) {
        activeAssignments.push(milestone);
      }
    }
  }
  
  return activeAssignments;
}

/**
 * Validate if candidate can be assigned to a milestone
 * Prevents double-booking and checks availability
 */
export async function validateCandidateAssignment(
  candidateId: string,
  milestoneId: string
): Promise<AssignmentValidationResult> {
  // Get candidate
  const candidate = await storage.getCandidate(candidateId);
  if (!candidate) {
    return {
      valid: false,
      error: 'Candidate not found'
    };
  }
  
  // Check if candidate is available
  if (candidate.isAvailable === false) {
    return {
      valid: false,
      error: `${candidate.name} is currently marked as unavailable. Please ask them to update their availability status.`
    };
  }
  
  // Check for active assignments
  const activeAssignments = await getCandidateActiveAssignments(candidateId);
  
  if (activeAssignments.length > 0) {
    const projectNames = await Promise.all(
      activeAssignments.map(async (m) => {
        const project = await storage.getProject(m.projectId);
        return project?.name || 'Unknown Project';
      })
    );
    
    return {
      valid: false,
      error: `${candidate.name} is already assigned to ${activeAssignments.length} active project(s): ${projectNames.join(', ')}. Complete or reassign existing work before adding new assignments.`,
      activeAssignments
    };
  }
  
  // All checks passed
  return {
    valid: true
  };
}

/**
 * Validate backup candidate assignment
 * Backup can be assigned even if primary is active (they're on standby)
 */
export async function validateBackupAssignment(
  candidateId: string,
  milestoneId: string
): Promise<AssignmentValidationResult> {
  const candidate = await storage.getCandidate(candidateId);
  if (!candidate) {
    return {
      valid: false,
      error: 'Candidate not found'
    };
  }
  
  // Backup candidates can be on standby even with other assignments
  // But they should still be generally available
  if (candidate.isAvailable === false) {
    return {
      valid: false,
      error: `${candidate.name} is currently unavailable. Please confirm their availability before assigning as backup.`
    };
  }
  
  return {
    valid: true
  };
}

/**
 * Confirm candidate assignment (candidate accepts the offer)
 */
export async function confirmCandidateAssignment(
  milestoneId: string,
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  const milestone = await storage.getMilestone(milestoneId);
  if (!milestone) {
    return { success: false, error: 'Milestone not found' };
  }
  
  if (milestone.assignedCandidateId !== candidateId) {
    return { success: false, error: 'You are not assigned to this milestone' };
  }
  
  if (milestone.assignmentStatus === 'confirmed' || milestone.assignmentStatus === 'active') {
    return { success: false, error: 'Assignment already confirmed' };
  }
  
  // Validate still available (in case status changed)
  const validation = await validateCandidateAssignment(candidateId, milestoneId);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // Confirm assignment
  await storage.updateMilestone(milestoneId, {
    assignmentStatus: 'confirmed',
    assignmentConfirmedAt: new Date(),
  });
  
  // Mark candidate as unavailable (they're now committed)
  await storage.updateCandidate(candidateId, {
    isAvailable: false
  });
  
  return { success: true };
}

/**
 * Reject candidate assignment (candidate declines the offer)
 */
export async function rejectCandidateAssignment(
  milestoneId: string,
  candidateId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const milestone = await storage.getMilestone(milestoneId);
  if (!milestone) {
    return { success: false, error: 'Milestone not found' };
  }
  
  if (milestone.assignedCandidateId !== candidateId) {
    return { success: false, error: 'You are not assigned to this milestone' };
  }
  
  // Clear assignment
  await storage.updateMilestone(milestoneId, {
    assignedCandidateId: null,
    assignmentStatus: 'unassigned',
    assignmentConfirmedAt: null,
  });
  
  console.log(`Candidate ${candidateId} rejected assignment to milestone ${milestoneId}. Reason: ${reason || 'Not provided'}`);
  
  return { success: true };
}
