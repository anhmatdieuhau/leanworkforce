import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SkillMapDisplay } from "@/components/SkillMapDisplay";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  businessUserId: z.string().default("demo-user"),
  jiraProjectKey: z.string().optional(),
  milestones: z.array(z.object({
    name: z.string().min(1, "Milestone name is required"),
    description: z.string().min(1, "Description is required"),
    estimatedHours: z.number().min(1).optional(),
  })).min(1, "At least one milestone is required"),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function CreateProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedSkillMaps, setGeneratedSkillMaps] = useState<any[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      businessUserId: "demo-user",
      jiraProjectKey: "",
      milestones: [{ name: "", description: "", estimatedHours: undefined }],
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const result = await apiRequest("POST", "/api/projects", data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully with AI-generated skill maps!",
      });
      setLocation("/business");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const generateSkillMapMutation = useMutation({
    mutationFn: async (milestone: { name: string; description: string }) => {
      const result = await apiRequest("POST", "/api/ai/generate-skill-map", milestone);
      return result;
    },
    onSuccess: (data, variables, context) => {
      const newMaps = [...generatedSkillMaps];
      newMaps[generatingIndex!] = data.skillMap;
      setGeneratedSkillMaps(newMaps);
      setGeneratingIndex(null);
      toast({
        title: "AI Generated",
        description: "Skill map created successfully!",
      });
    },
    onError: () => {
      setGeneratingIndex(null);
      toast({
        title: "Error",
        description: "Failed to generate skill map",
        variant: "destructive",
      });
    },
  });

  const milestones = form.watch("milestones");

  const addMilestone = () => {
    const current = form.getValues("milestones");
    form.setValue("milestones", [...current, { name: "", description: "", estimatedHours: undefined }]);
  };

  const removeMilestone = (index: number) => {
    const current = form.getValues("milestones");
    form.setValue("milestones", current.filter((_, i) => i !== index));
    const newMaps = generatedSkillMaps.filter((_, i) => i !== index);
    setGeneratedSkillMaps(newMaps);
  };

  const generateSkillMap = (index: number) => {
    const milestone = milestones[index];
    if (milestone.name && milestone.description) {
      setGeneratingIndex(index);
      generateSkillMapMutation.mutate(milestone);
    }
  };

  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/business")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="page-title">Create New Project</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Data Analytics Dashboard" {...field} data-testid="input-project-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the project goals, requirements, and key deliverables..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="input-project-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jiraProjectKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jira Project Key (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PROJ-123" {...field} data-testid="input-jira-key" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Milestones</h2>
                <Button type="button" variant="outline" onClick={addMilestone} data-testid="button-add-milestone">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>

              <div className="space-y-6">
                {milestones.map((_, index) => (
                  <Card key={index} data-testid={`milestone-card-${index}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Milestone {index + 1}</CardTitle>
                        {milestones.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMilestone(index)}
                            data-testid={`button-remove-milestone-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-[hsl(0,84%,60%)]" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`milestones.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Milestone Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Backend API Development" {...field} data-testid={`input-milestone-name-${index}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`milestones.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the milestone deliverables and requirements..." 
                                {...field} 
                                data-testid={`input-milestone-description-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`milestones.${index}.estimatedHours`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="40" 
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid={`input-milestone-hours-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => generateSkillMap(index)}
                        disabled={generatingIndex === index || !milestones[index].name || !milestones[index].description}
                        data-testid={`button-generate-skillmap-${index}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {generatingIndex === index ? "Generating..." : "Generate AI Skill Map"}
                      </Button>

                      {generatedSkillMaps[index] && (
                        <div className="mt-4">
                          <SkillMapDisplay skillMap={generatedSkillMaps[index]} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/business")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createProjectMutation.isPending}
                data-testid="button-create-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
