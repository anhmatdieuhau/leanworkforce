import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, Users, Lightbulb } from "lucide-react";

interface JobMatchExplainerProps {
  fitScore: {
    score: number;
    skillOverlap: number;
    experienceMatch: number;
    softSkillRelevance: number;
    reasoning?: string;
  };
  className?: string;
}

export function JobMatchExplainer({ fitScore, className }: JobMatchExplainerProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[hsl(142,76%,36%)]";
    if (score >= 60) return "text-foreground";
    return "text-muted-foreground";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-[hsl(142,76%,36%)]/10";
    if (score >= 60) return "bg-muted/50";
    return "bg-muted/30";
  };

  return (
    <Card className={className} data-testid="job-match-explainer">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Why this job?</h4>
        </div>

        <div className="space-y-2">
          {/* Skill Overlap */}
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${getScoreColor(fitScore.skillOverlap)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Skills Match</span>
                <Badge variant="outline" className={`${getScoreBgColor(fitScore.skillOverlap)} border-0`}>
                  {fitScore.skillOverlap}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your technical skills align with project requirements
              </p>
            </div>
          </div>

          {/* Experience Match */}
          <div className="flex items-start gap-3">
            <TrendingUp className={`w-4 h-4 mt-0.5 shrink-0 ${getScoreColor(fitScore.experienceMatch)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Experience Level</span>
                <Badge variant="outline" className={`${getScoreBgColor(fitScore.experienceMatch)} border-0`}>
                  {fitScore.experienceMatch}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your background matches the complexity needed
              </p>
            </div>
          </div>

          {/* Soft Skills */}
          <div className="flex items-start gap-3">
            <Users className={`w-4 h-4 mt-0.5 shrink-0 ${getScoreColor(fitScore.softSkillRelevance)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Soft Skills</span>
                <Badge variant="outline" className={`${getScoreBgColor(fitScore.softSkillRelevance)} border-0`}>
                  {fitScore.softSkillRelevance}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Communication and teamwork alignment
              </p>
            </div>
          </div>
        </div>

        {fitScore.reasoning && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              {fitScore.reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
