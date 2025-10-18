import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import BusinessDashboard from "@/pages/BusinessDashboard";
import CandidateDashboard from "@/pages/CandidateDashboard";
import CreateProject from "@/pages/CreateProject";
import ProjectDetail from "@/pages/ProjectDetail";
import CandidateProfile from "@/pages/CandidateProfile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/business" component={BusinessDashboard} />
      <Route path="/business/projects/new" component={CreateProject} />
      <Route path="/business/projects/:id" component={ProjectDetail} />
      <Route path="/candidate" component={CandidateDashboard} />
      <Route path="/candidate/profile" component={CandidateProfile} />
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
