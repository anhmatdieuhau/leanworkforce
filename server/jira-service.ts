import { getUncachableJiraClient } from "./jira-client";

// Jira integration service for Lean Workforce

export interface JiraIssue {
  key: string;
  summary: string;
  description?: string;
  status: string;
  timeEstimate?: number;
  timeSpent?: number;
  sprint?: {
    id: number;
    name: string;
    state: string;
  };
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

// Fetch all sprints for a project by querying issues and extracting unique sprints
export async function fetchProjectSprints(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<JiraSprint[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    // Query all issues in the project that have sprint information
    const response = await client.issueSearch.searchForIssuesUsingJql({
      jql: `project = ${projectKey} AND sprint is not EMPTY ORDER BY created DESC`,
      fields: ["sprint"],
      maxResults: 1000,
    });
    
    // Extract unique sprints from issues
    const sprintMap = new Map<number, JiraSprint>();
    
    for (const issue of (response.issues || [])) {
      const sprintData = (issue.fields as any).sprint;
      if (sprintData) {
        // Handle both single sprint and array of sprints
        const sprints = Array.isArray(sprintData) ? sprintData : [sprintData];
        
        for (const sprint of sprints) {
          if (sprint && sprint.id && !sprintMap.has(sprint.id)) {
            sprintMap.set(sprint.id, {
              id: sprint.id,
              name: sprint.name || `Sprint ${sprint.id}`,
              state: sprint.state || "active",
              startDate: sprint.startDate,
              endDate: sprint.endDate,
              goal: sprint.goal,
            });
          }
        }
      }
    }
    
    return Array.from(sprintMap.values()).sort((a, b) => {
      // Sort by state (active first, then future, then closed) and then by name
      const stateOrder = { active: 0, future: 1, closed: 2 };
      const stateCompare = (stateOrder[a.state as keyof typeof stateOrder] || 3) - 
                          (stateOrder[b.state as keyof typeof stateOrder] || 3);
      return stateCompare !== 0 ? stateCompare : a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return [];
  }
}

// Fetch issues for a specific sprint
export async function fetchSprintIssues(sprintId: number, businessUserId: string = 'demo-business-user'): Promise<JiraIssue[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const response = await client.issueSearch.searchForIssuesUsingJql({
      jql: `sprint = ${sprintId} AND type != Epic ORDER BY created DESC`,
      fields: ["summary", "description", "status", "timeestimate", "timespent", "sprint"],
    });

    const issues: JiraIssue[] = (response.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status?.name || "To Do",
      timeEstimate: issue.fields.timeestimate,
      timeSpent: issue.fields.timespent,
      sprint: issue.fields.sprint ? {
        id: issue.fields.sprint.id,
        name: issue.fields.sprint.name,
        state: issue.fields.sprint.state,
      } : undefined,
    }));

    return issues;
  } catch (error) {
    console.error("Error fetching sprint issues:", error);
    return [];
  }
}

// Sync milestones from Jira project (legacy support - still works for non-sprint projects)
export async function syncJiraMilestones(projectKey: string, businessUserId: string = 'demo-business-user'): Promise<JiraIssue[]> {
  try {
    const client = await getUncachableJiraClient(businessUserId);
    
    const response = await client.issueSearch.searchForIssuesUsingJql({
      jql: `project = ${projectKey}`,
      fields: ["summary", "description", "status", "timeestimate", "timespent", "sprint"],
    });

    const issues: JiraIssue[] = (response.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status?.name || "Unknown",
      timeEstimate: issue.fields.timeestimate,
      timeSpent: issue.fields.timespent,
      sprint: issue.fields.sprint ? {
        id: issue.fields.sprint.id,
        name: issue.fields.sprint.name,
        state: issue.fields.sprint.state,
      } : undefined,
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
