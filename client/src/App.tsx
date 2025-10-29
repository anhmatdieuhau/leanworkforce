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
import BusinessLogin from "@/pages/BusinessLogin";
import CandidateLogin from "@/pages/CandidateLogin";
import VerifyMagicLink from "@/pages/VerifyMagicLink";
import CandidateUpload from "@/pages/CandidateUpload";
import CandidateLanding from "@/pages/CandidateLanding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/business-login" component={BusinessLogin} />
      <Route path="/candidate-login" component={CandidateLogin} />
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
        <ProtectedRoute requireBusiness>
          <ProjectDetail />
        </ProtectedRoute>
      </Route>
      
      {/* Candidate routes - /candidate landing page, dashboard requires auth */}
      <Route path="/candidate" component={CandidateLanding} />
      <Route path="/candidate/upload" component={CandidateUpload} />
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
