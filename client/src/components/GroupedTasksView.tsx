import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Milestone } from "@shared/schema";

interface GroupedTasksViewProps {
  milestones: Milestone[];
  groupBy: "epic" | "sprint" | "none";
}

interface TaskGroup {
  key: string;
  name: string;
  tasks: Milestone[];
}

export function GroupedTasksView({ milestones, groupBy }: GroupedTasksViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[hsl(142,76%,36%)] text-white";
      case "in-progress": return "bg-foreground text-background";
      case "delayed": return "bg-[hsl(0,84%,60%)] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const groupTasks = (): TaskGroup[] => {
    if (groupBy === "none") {
      return [{
        key: "all",
        name: "All Tasks",
        tasks: milestones,
      }];
    }

    const groups: { [key: string]: TaskGroup } = {};

    milestones.forEach((milestone) => {
      let groupKey: string;
      let groupName: string;

      if (groupBy === "epic") {
        groupKey = milestone.jiraEpicKey || "no-epic";
        groupName = milestone.jiraEpicKey || "No Epic";
      } else {
        groupKey = milestone.jiraSprintId || "no-sprint";
        groupName = milestone.jiraSprintName || "No Sprint";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          name: groupName,
          tasks: [],
        };
      }

      groups[groupKey].tasks.push(milestone);
    });

    return Object.values(groups).sort((a, b) => {
      // Put "No Epic/Sprint" group at the end
      if (a.key.startsWith("no-")) return 1;
      if (b.key.startsWith("no-")) return -1;
      return a.name.localeCompare(b.name);
    });
  };

  const groups = groupTasks();

  if (groupBy === "none") {
    return (
      <div className="space-y-3">
        {milestones.map((task) => (
          <Card key={task.id} className="hover-elevate" data-testid={`task-card-${task.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base font-medium">{task.name}</CardTitle>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <Badge className={getStatusColor(task.status)} data-testid={`task-status-${task.id}`}>
                  {task.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {task.estimatedHours && (
                  <span data-testid={`task-hours-${task.id}`}>
                    {task.estimatedHours}h estimated
                  </span>
                )}
                {task.jiraIssueKey && (
                  <span className="font-mono text-xs" data-testid={`task-jira-key-${task.id}`}>
                    {task.jiraIssueKey}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.key);
        const totalHours = group.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        
        return (
          <Card key={group.key} data-testid={`group-${group.key}`}>
            <CardHeader
              className="cursor-pointer hover-elevate pb-3"
              onClick={() => toggleGroup(group.key)}
              data-testid={`group-header-${group.key}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="outline" data-testid={`group-count-${group.key}`}>
                    {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                  </Badge>
                </div>
                {totalHours > 0 && (
                  <span className="text-sm text-muted-foreground" data-testid={`group-hours-${group.key}`}>
                    {totalHours}h total
                  </span>
                )}
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="space-y-2">
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border border-border rounded-md hover-elevate"
                    data-testid={`task-${task.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.name}</div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.estimatedHours && (
                            <span>{task.estimatedHours}h</span>
                          )}
                          {task.jiraIssueKey && (
                            <span className="font-mono">{task.jiraIssueKey}</span>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(task.status)} data-testid={`status-${task.id}`}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
