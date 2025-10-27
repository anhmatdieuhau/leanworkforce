import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import BusinessDashboard from "@/pages/BusinessDashboard";
import CandidateDashboard from "@/pages/CandidateDashboard";
import CreateProject from "@/pages/CreateProject";
import ProjectDetail from "@/pages/ProjectDetail";
import CandidateProfile from "@/pages/CandidateProfile";
import Login from "@/pages/Login";
import VerifyMagicLink from "@/pages/VerifyMagicLink";
import CandidateUpload from "@/pages/CandidateUpload";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/auth/verify" component={VerifyMagicLink} />
      
      {/* Business routes - require authentication */}
      <Route path="/business">
        <ProtectedRoute requireBusiness>
          <BusinessDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/business/projects/new">
        <ProtectedRoute requireBusiness>
          <CreateProject />
        </ProtectedRoute>
      </Route>
      <Route path="/business/projects/:id">
        {(params) => (
          <ProtectedRoute requireBusiness>
            <ProjectDetail params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Candidate routes - /candidate open for CV upload, dashboard requires auth */}
      <Route path="/candidate" component={CandidateUpload} />
      <Route path="/candidate/dashboard">
        <ProtectedRoute>
          <CandidateDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/profile">
        <ProtectedRoute>
          <CandidateProfile />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
