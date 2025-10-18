import { getUncachableJiraClient } from "./jira-client";

// Jira integration service for AI Workforce OS

export interface JiraIssue {
  key: string;
  summary: string;
  description?: string;
  status: string;
  timeEstimate?: number;
  timeSpent?: number;
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

// Sync milestones from Jira project
export async function syncJiraMilestones(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<JiraIssue[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const response = await client.issueSearch.searchForIssuesUsingJql({
      jql: `project = ${projectKey}`,
      fields: ["summary", "description", "status", "timeestimate", "timespent"],
    });

    const issues: JiraIssue[] = (response.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status?.name || "Unknown",
      timeEstimate: issue.fields.timeestimate,
      timeSpent: issue.fields.timespent,
    }));

    return issues;
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
