import { getUncachableJiraClient } from "./jira-client";

// Jira integration service for Lean Workforce

export interface JiraIssue {
  key: string;
  summary: string;
  description?: string;
  status: string;
  timeEstimate?: number;
  timeSpent?: number;
  epicKey?: string;
  epicName?: string;
  sprintId?: string;
  sprintName?: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface JiraProject {
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead?: {
    displayName: string;
    emailAddress: string;
  };
}

// Fetch all Jira projects
export async function fetchAllJiraProjects(businessUserId: string = 'demo-business-user'): Promise<JiraProject[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const response = await client.projects.searchProjects({});
    
    const projects: JiraProject[] = ((response as any).values || []).map((project: any) => ({
      key: project.key,
      name: project.name,
      description: project.description || "",
      projectTypeKey: project.projectTypeKey || "software",
      lead: project.lead ? {
        displayName: project.lead.displayName,
        emailAddress: project.lead.emailAddress,
      } : undefined,
    }));

    return projects;
  } catch (error) {
    console.error("Error fetching Jira projects:", error);
    throw new Error("Failed to fetch projects from Jira. Please check your Jira credentials.");
  }
}

// Fetch all sprints for a project (sprint field deprecated - returns empty for now)
export async function fetchProjectSprints(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<JiraSprint[]> {
  // NOTE: Sprint field has been deprecated in Jira API v3
  // For now, return empty array and let system fallback to issue-based import
  // Future enhancement: Use Jira Agile API board endpoints for sprint detection
  console.log(`Sprint detection skipped for ${projectKey} - using issue-based import instead`);
  return [];
}

// Fetch issues for a specific sprint (not used since sprint detection is disabled)
export async function fetchSprintIssues(sprintId: number, businessUserId: string = 'demo-business-user'): Promise<JiraIssue[]> {
  return [];
}

// Sync all issues from Jira project using pagination
export async function syncJiraMilestones(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<JiraIssue[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 50;
    let total = 0;

    // Use pagination to fetch all issues
    do {
      try {
        // Simple JQL without quotes or complex syntax
        const response = await client.issueSearch.searchForIssuesUsingJql({
          jql: `project=${projectKey}`,
          startAt,
          maxResults,
        });

        total = response.total || 0;
        console.log(`Fetched ${response.issues?.length || 0} issues for project ${projectKey} (${startAt + 1}-${startAt + (response.issues?.length || 0)} of ${total})`);

        if (response.issues && response.issues.length > 0) {
          // Filter and map issues
          const batchIssues = response.issues
            .filter((issue: any) => {
              const issueType = issue.fields?.issuetype?.name || "";
              return issueType.toLowerCase() !== "epic";
            })
            .map((issue: any) => {
              // Extract epic information
              const epicKey = issue.fields?.parent?.key || issue.fields?.epic?.key || null;
              const epicName = issue.fields?.parent?.fields?.summary || issue.fields?.epic?.name || null;
              
              // Extract sprint information (from sprint field or customfield)
              let sprintId = null;
              let sprintName = null;
              
              // Try to get sprint from various possible fields
              const sprintField = issue.fields?.sprint || 
                                 issue.fields?.customfield_10020 || 
                                 issue.fields?.customfield_10010;
              
              if (sprintField) {
                if (Array.isArray(sprintField) && sprintField.length > 0) {
                  // Take the latest sprint
                  const latestSprint = sprintField[sprintField.length - 1];
                  sprintId = latestSprint.id?.toString() || null;
                  sprintName = latestSprint.name || null;
                } else if (typeof sprintField === 'object' && sprintField.id) {
                  sprintId = sprintField.id.toString();
                  sprintName = sprintField.name || null;
                }
              }
              
              return {
                key: issue.key,
                summary: issue.fields?.summary || "Untitled",
                description: issue.fields?.description || "",
                status: issue.fields?.status?.name || "To Do",
                timeEstimate: issue.fields?.timeestimate,
                timeSpent: issue.fields?.timespent,
                epicKey,
                epicName,
                sprintId,
                sprintName,
              };
            });

          allIssues.push(...batchIssues);
        }

        startAt += maxResults;

        // Safety check to avoid infinite loops
        if (startAt >= total || startAt >= 1000) {
          break;
        }
      } catch (batchError) {
        console.error(`Error fetching batch at ${startAt}:`, batchError);
        break;
      }
    } while (startAt < total);

    console.log(`Total fetched: ${allIssues.length} non-Epic issues from project ${projectKey}`);
    return allIssues;
  } catch (error) {
    console.error("Error syncing Jira milestones:", error);
    return [];
  }
}

// Get issue status and calculate delay
export async function getIssueProgress(issueKey: string, businessUserId: string = 'demo-business-user'): Promise<{
  status: string;
  delayPercentage: number;
  timeEstimate: number;
  timeSpent: number;
}> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const issue = await client.issues.getIssue({
      issueIdOrKey: issueKey,
      fields: ["status", "timeestimate", "timespent"],
    });

    const timeEstimate = issue.fields.timeestimate || 0;
    const timeSpent = issue.fields.timespent || 0;
    
    let delayPercentage = 0;
    if (timeEstimate > 0 && timeSpent > timeEstimate) {
      delayPercentage = Math.round(((timeSpent - timeEstimate) / timeEstimate) * 100);
    }

    return {
      status: issue.fields.status?.name || "Unknown",
      delayPercentage,
      timeEstimate,
      timeSpent,
    };
  } catch (error) {
    console.error("Error getting issue progress:", error);
    return {
      status: "Unknown",
      delayPercentage: 0,
      timeEstimate: 0,
      timeSpent: 0,
    };
  }
}

// Monitor all issues in a project for delays
export async function monitorProjectDelays(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<Array<{
  issueKey: string;
  delayPercentage: number;
  riskLevel: string;
}>> {
  try {
    const issues = await syncJiraMilestones(projectKey, businessUserId);
    const delayedIssues = [];

    for (const issue of issues) {
      const progress = await getIssueProgress(issue.key, businessUserId);
      
      if (progress.delayPercentage > 0) {
        let riskLevel = "low";
        if (progress.delayPercentage > 20) {
          riskLevel = "high";
        } else if (progress.delayPercentage >= 10) {
          riskLevel = "medium";
        }

        delayedIssues.push({
          issueKey: issue.key,
          delayPercentage: progress.delayPercentage,
          riskLevel,
        });
      }
    }

    return delayedIssues;
  } catch (error) {
    console.error("Error monitoring project delays:", error);
    return [];
  }
}
