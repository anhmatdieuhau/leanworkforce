import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkillMap } from "@shared/schema";

interface SkillMapDisplayProps {
  skillMap: SkillMap;
}

export function SkillMapDisplay({ skillMap }: SkillMapDisplayProps) {
  return (
    <Card data-testid="skill-map-display">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{skillMap.milestone}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Required Skills</div>
          <div className="flex flex-wrap gap-2">
            {skillMap.required_skills.map((skill, idx) => (
              <Badge 
                key={idx} 
                className="bg-black text-white" 
                data-testid={`skill-${idx}`}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Experience Level</div>
            <Badge variant="outline" data-testid="experience-level">
              {skillMap.experience_level}
            </Badge>
          </div>
          
          {skillMap.soft_skills && skillMap.soft_skills.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Soft Skills</div>
              <div className="flex flex-wrap gap-2">
                {skillMap.soft_skills.map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs"
                    data-testid={`soft-skill-${idx}`}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
