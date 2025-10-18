import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface JiraSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUserId: string;
}

export function JiraSettingsDialog({ open, onOpenChange, businessUserId }: JiraSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/jira/settings", businessUserId],
    enabled: open,
  });

  // Populate form fields when settings are loaded
  useEffect(() => {
    if (settings) {
      const settingsData = settings as any;
      if (settingsData?.jiraDomain) setJiraDomain(settingsData.jiraDomain);
      if (settingsData?.jiraEmail) setJiraEmail(settingsData.jiraEmail);
      // Don't populate API token for security - user must re-enter
    }
  }, [settings]);

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/jira/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessUserId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jira/settings", businessUserId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || "Failed to connect to Jira. Please check your credentials.",
      });
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      // Only include API token if provided (to preserve existing token)
      const payload: any = {
        businessUserId,
        jiraDomain,
        jiraEmail,
        connectionType: "manual",
        isConfigured: true,
      };
      
      if (jiraApiToken) {
        payload.jiraApiToken = jiraApiToken;
      }
      
      return await apiRequest("POST", `/api/jira/settings`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Jira configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jira/settings", businessUserId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings.",
      });
    },
  });

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleSave = () => {
    // Allow saving without API token if already configured (keep existing)
    const isConfigured = (settings as any)?.isConfigured;
    
    if (!jiraDomain || !jiraEmail) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide Jira domain and email.",
      });
      return;
    }
    
    if (!isConfigured && !jiraApiToken) {
      toast({
        variant: "destructive",
        title: "Missing API Token",
        description: "Please provide an API token for initial setup.",
      });
      return;
    }
    
    saveSettingsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-jira-settings">
        <DialogHeader>
          <DialogTitle className="text-2xl">Jira Configuration</DialogTitle>
          <DialogDescription>
            Configure your Jira credentials to sync projects and track milestones
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Jira integration uses Replit's secure connector system. 
                If you haven't connected Jira yet, you'll need to set it up through the Replit 
                integrations panel first, or manually configure your credentials below.
              </AlertDescription>
            </Alert>

            {(settings as any)?.isConfigured && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Connected!</strong> Last synced: {(settings as any).lastSyncedAt ? new Date((settings as any).lastSyncedAt).toLocaleString() : "Never"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="jira-domain" data-testid="label-jira-domain">Jira Domain</Label>
                <Input
                  id="jira-domain"
                  data-testid="input-jira-domain"
                  placeholder="company.atlassian.net"
                  value={jiraDomain}
                  onChange={(e) => setJiraDomain(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Your Jira cloud instance domain (without https://)
                </p>
              </div>

              <div>
                <Label htmlFor="jira-email" data-testid="label-jira-email">Jira Email</Label>
                <Input
                  id="jira-email"
                  data-testid="input-jira-email"
                  type="email"
                  placeholder="your-email@company.com"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Email address associated with your Jira account
                </p>
              </div>

              <div>
                <Label htmlFor="jira-api-token" data-testid="label-jira-token">API Token</Label>
                <Input
                  id="jira-api-token"
                  data-testid="input-jira-token"
                  type="password"
                  placeholder={(settings as any)?.isConfigured ? "••••••••••••••••" : "Enter API token"}
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {(settings as any)?.isConfigured ? "Leave blank to keep existing token. " : ""}
                  Generate an API token from{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Atlassian Account Settings
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-connection"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
