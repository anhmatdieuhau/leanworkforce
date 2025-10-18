import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Calendar, ExternalLink } from "lucide-react";
import { FitScoreMeter } from "./FitScoreMeter";
import type { Candidate } from "@shared/schema";

interface CandidateCardProps {
  candidate: Candidate;
  fitScore?: number;
  onViewProfile?: (id: string) => void;
  onContact?: (id: string) => void;
  showFitScore?: boolean;
}

export function CandidateCard({ candidate, fitScore, onViewProfile, onContact, showFitScore = false }: CandidateCardProps) {
  const initials = candidate.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover-elevate transition-all duration-150" data-testid={`candidate-card-${candidate.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12 border border-border">
            <AvatarFallback className="bg-muted text-foreground font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate" data-testid={`candidate-name-${candidate.id}`}>
              {candidate.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{candidate.email}</span>
            </div>
          </div>
          {showFitScore && fitScore !== undefined && (
            <FitScoreMeter score={fitScore} size="sm" showLabel={false} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Skills</div>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.slice(0, 6).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs" data-testid={`candidate-skill-${idx}`}>
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}
        {candidate.availableFrom && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Available: </span>
            <span className="font-medium" data-testid={`candidate-availability-${candidate.id}`}>
              {new Date(candidate.availableFrom).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex gap-2">
        {onViewProfile && (
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => onViewProfile(candidate.id)}
            data-testid={`button-view-candidate-${candidate.id}`}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        )}
        {onContact && (
          <Button 
            className="flex-1" 
            onClick={() => onContact(candidate.id)}
            data-testid={`button-contact-candidate-${candidate.id}`}
          >
            Contact
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
