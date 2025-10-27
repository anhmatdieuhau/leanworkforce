import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CandidateProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStage, setParseStage] = useState<'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete'>('idle');

  const { data: candidate, isLoading: isCandidateLoading } = useQuery({
    queryKey: ["/api/candidate/profile"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      githubUrl: "",
      availableFrom: "",
      availableUntil: "",
    },
  });

  // Reset form when candidate data loads (handle both null and populated responses)
  useEffect(() => {
    if (candidate !== undefined) {
      form.reset({
        name: candidate?.name || "",
        email: candidate?.email || "",
        phone: candidate?.phone || "",
        linkedinUrl: candidate?.linkedinUrl || "",
        githubUrl: candidate?.githubUrl || "",
        availableFrom: candidate?.availableFrom ? new Date(candidate.availableFrom).toISOString().split('T')[0] : "",
        availableUntil: candidate?.availableUntil ? new Date(candidate.availableUntil).toISOString().split('T')[0] : "",
      });
    }
  }, [candidate, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PUT", "/api/candidate/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const uploadCVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("cv", file);
      const response = await fetch("/api/candidate/upload-cv", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      setIsAnalyzing(false);
      toast({
        title: "Success",
        description: "CV uploaded and analyzed successfully!",
      });
    },
    onError: () => {
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: "Failed to upload CV",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOC file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadCV = () => {
    if (selectedFile) {
      setIsAnalyzing(true);
      setUploadProgress(0);
      setParseStage('uploading');
      
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 30) {
            clearInterval(uploadInterval);
            return 30;
          }
          return prev + 10;
        });
      }, 200);
      
      uploadCVMutation.mutate(selectedFile);
    }
  };
  
  // Update progress as stages complete
  useEffect(() => {
    if (uploadCVMutation.isPending && parseStage === 'uploading') {
      const timer = setTimeout(() => {
        setUploadProgress(40);
        setParseStage('parsing');
      }, 800);
      return () => clearTimeout(timer);
    }
    if (uploadCVMutation.isPending && parseStage === 'parsing') {
      const timer = setTimeout(() => {
        setUploadProgress(70);
        setParseStage('analyzing');
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (uploadCVMutation.isSuccess && parseStage !== 'complete') {
      setUploadProgress(100);
      setParseStage('complete');
      setTimeout(() => {
        setParseStage('idle');
        setUploadProgress(0);
      }, 2000);
    }
  }, [uploadCVMutation.isPending, uploadCVMutation.isSuccess, parseStage]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Show loading state while candidate data is being fetched
  if (isCandidateLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/candidate")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold" data-testid="page-title">Manage Profile</h1>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading profile...</span>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/candidate")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="page-title">Manage Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              CV Upload & AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidate?.cvFilePath ? (
              <div className="flex items-center gap-3 p-4 border border-[hsl(142,76%,36%)] rounded-md bg-[hsl(142,76%,36%)]/5">
                <CheckCircle2 className="w-5 h-5 text-[hsl(142,76%,36%)]" />
                <div className="flex-1">
                  <div className="font-medium">CV Uploaded Successfully</div>
                  <div className="text-sm text-muted-foreground">Your profile has been analyzed by AI</div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                {!isAnalyzing ? (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <div className="mb-4">
                      <p className="font-medium mb-1">Drag & drop or click to upload</p>
                      <p className="text-sm text-muted-foreground">PDF or DOC files only (max 10MB)</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="cv-upload"
                      data-testid="input-cv-upload"
                    />
                    <label htmlFor="cv-upload">
                      <Button type="button" variant="outline" asChild>
                        <span>Select File</span>
                      </Button>
                    </label>
                    {selectedFile && (
                      <div className="mt-4">
                        <p className="text-sm mb-3">Selected: {selectedFile.name}</p>
                        <Button onClick={handleUploadCV} disabled={isAnalyzing} data-testid="button-upload-cv">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Upload & Analyze
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <div>
                      <p className="font-medium mb-2">
                        {parseStage === 'uploading' && '📤 Uploading your CV...'}
                        {parseStage === 'parsing' && '📄 Extracting text...'}
                        {parseStage === 'analyzing' && '🤖 AI analyzing your profile...'}
                        {parseStage === 'complete' && '✅ Complete!'}
                      </p>
                      <Progress value={uploadProgress} className="w-full max-w-md mx-auto" data-testid="upload-progress" />
                      <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {candidate?.cvAnalysis && (
              <div className="p-4 border border-border rounded-md bg-muted/30">
                <div className="text-sm font-medium mb-2">AI Analysis Results</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div><strong>Skills:</strong> {candidate.skills.slice(0, 10).join(", ")}</div>
                  )}
                  {candidate.experience && (
                    <div><strong>Experience:</strong> {candidate.experience}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} disabled data-testid="input-email" />
                      </FormControl>
                      <FormDescription>
                        Email cannot be changed as it's used as your account identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Professional Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/johndoe" {...field} data-testid="input-linkedin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/johndoe" {...field} data-testid="input-github" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availableFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-available-from" />
                      </FormControl>
                      <FormDescription>When are you available to start?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availableUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-available-until" />
                      </FormControl>
                      <FormDescription>How long are you available?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/candidate")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
