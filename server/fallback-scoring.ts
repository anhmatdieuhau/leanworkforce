/**
 * Rule-Based Fallback Scoring System
 * Used when Gemini AI is unavailable or fails
 */

export interface SkillMap {
  requiredSkills: string[];
  niceToHave?: string[];
  experienceLevel?: string;
  domain?: string;
}

export interface FitScoreResult {
  score: number;
  skillOverlap: number;
  experienceMatch: number;
  softSkillRelevance: number;
  reasoning: string;
}

/**
 * Calculate skill overlap using keyword matching
 */
function calculateSkillOverlap(candidateSkills: string[], requiredSkills: string[], niceToHave: string[] = []): number {
  if (!candidateSkills || candidateSkills.length === 0) return 0;
  if (!requiredSkills || requiredSkills.length === 0) return 50; // neutral score
  
  // Normalize skills to lowercase for comparison
  const candidateSkillsNorm = candidateSkills.map(s => s.toLowerCase().trim());
  const requiredSkillsNorm = requiredSkills.map(s => s.toLowerCase().trim());
  const niceToHaveNorm = niceToHave.map(s => s.toLowerCase().trim());
  
  // Count exact matches for required skills
  let requiredMatches = 0;
  for (const required of requiredSkillsNorm) {
    if (candidateSkillsNorm.some(cs => cs.includes(required) || required.includes(cs))) {
      requiredMatches++;
    }
  }
  
  // Count nice-to-have matches
  let niceToHaveMatches = 0;
  for (const nice of niceToHaveNorm) {
    if (candidateSkillsNorm.some(cs => cs.includes(nice) || nice.includes(cs))) {
      niceToHaveMatches++;
    }
  }
  
  // Calculate weighted score
  const requiredScore = requiredSkills.length > 0 
    ? (requiredMatches / requiredSkills.length) * 80 
    : 50;
  
  const niceToHaveScore = niceToHave.length > 0 
    ? (niceToHaveMatches / niceToHave.length) * 20 
    : 0;
  
  return Math.min(100, Math.round(requiredScore + niceToHaveScore));
}

/**
 * Calculate experience match based on text analysis
 */
function calculateExperienceMatch(candidateExperience: string, experienceLevel?: string): number {
  if (!candidateExperience) return 40; // neutral score for missing data
  if (!experienceLevel) return 60; // neutral-positive if no requirement
  
  const expText = candidateExperience.toLowerCase();
  const levelNorm = experienceLevel.toLowerCase();
  
  // Extract years of experience from text
  const yearsMatch = expText.match(/(\d+)\+?\s*(years?|yrs?)/i);
  const candidateYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;
  
  // Match experience level keywords
  if (levelNorm.includes('senior') || levelNorm.includes('lead') || levelNorm.includes('principal')) {
    if (candidateYears >= 5) return 90;
    if (candidateYears >= 3) return 70;
    if (expText.includes('senior') || expText.includes('lead')) return 85;
    return 50;
  }
  
  if (levelNorm.includes('mid') || levelNorm.includes('intermediate')) {
    if (candidateYears >= 2 && candidateYears < 6) return 90;
    if (candidateYears >= 1) return 75;
    return 60;
  }
  
  if (levelNorm.includes('junior') || levelNorm.includes('entry')) {
    if (candidateYears <= 2) return 90;
    if (candidateYears <= 4) return 70;
    return 50;
  }
  
  // Default: check if candidate has any experience
  return candidateYears > 0 ? 65 : 45;
}

/**
 * Calculate soft skill relevance using keyword analysis
 */
function calculateSoftSkillRelevance(candidateExperience: string, domain?: string): number {
  if (!candidateExperience) return 50; // neutral
  
  const expText = candidateExperience.toLowerCase();
  const softSkillKeywords = [
    'team', 'collaborate', 'communication', 'leadership', 'agile',
    'scrum', 'project management', 'problem solving', 'analytical'
  ];
  
  let matchCount = 0;
  for (const keyword of softSkillKeywords) {
    if (expText.includes(keyword)) {
      matchCount++;
    }
  }
  
  // Domain match bonus
  let domainBonus = 0;
  if (domain && expText.includes(domain.toLowerCase())) {
    domainBonus = 15;
  }
  
  const baseScore = Math.min(70, matchCount * 8);
  return Math.min(100, baseScore + domainBonus + 30); // +30 baseline
}

/**
 * Rule-based fit score calculation (fallback when AI fails)
 */
export function calculateFallbackFitScore(
  candidateSkills: string[],
  candidateExperience: string,
  skillMap: SkillMap
): FitScoreResult {
  console.log('[Fallback Scoring] Using rule-based scoring system');
  
  const skillOverlap = calculateSkillOverlap(
    candidateSkills,
    skillMap.requiredSkills,
    skillMap.niceToHave
  );
  
  const experienceMatch = calculateExperienceMatch(
    candidateExperience,
    skillMap.experienceLevel
  );
  
  const softSkillRelevance = calculateSoftSkillRelevance(
    candidateExperience,
    skillMap.domain
  );
  
  // Weighted average: skills 50%, experience 30%, soft skills 20%
  const score = Math.round(
    skillOverlap * 0.5 +
    experienceMatch * 0.3 +
    softSkillRelevance * 0.2
  );
  
  const reasoning = generateFallbackReasoning(
    skillOverlap,
    experienceMatch,
    softSkillRelevance,
    candidateSkills,
    skillMap
  );
  
  return {
    score,
    skillOverlap,
    experienceMatch,
    softSkillRelevance,
    reasoning
  };
}

/**
 * Generate human-readable reasoning for fallback scores
 */
function generateFallbackReasoning(
  skillOverlap: number,
  experienceMatch: number,
  softSkillRelevance: number,
  candidateSkills: string[],
  skillMap: SkillMap
): string {
  const parts: string[] = [];
  
  // Skill assessment
  if (skillOverlap >= 80) {
    parts.push('Strong skill match with most required competencies.');
  } else if (skillOverlap >= 60) {
    parts.push('Good skill alignment with key requirements.');
  } else if (skillOverlap >= 40) {
    parts.push('Partial skill match - some gaps in required skills.');
  } else {
    parts.push('Limited skill overlap - significant training may be needed.');
  }
  
  // Experience assessment
  if (experienceMatch >= 80) {
    parts.push('Experience level aligns well with position requirements.');
  } else if (experienceMatch >= 60) {
    parts.push('Adequate experience for the role.');
  } else {
    parts.push('Experience level may not fully match requirements.');
  }
  
  // Soft skills
  if (softSkillRelevance >= 70) {
    parts.push('Profile demonstrates relevant soft skills and domain knowledge.');
  } else {
    parts.push('Additional soft skill development may be beneficial.');
  }
  
  parts.push('[Note: Score calculated using rule-based system]');
  
  return parts.join(' ');
}

/**
 * Extract skill map from text using simple keyword extraction
 * Used when AI skill map generation fails
 */
export function extractFallbackSkillMap(text: string, description: string = ''): SkillMap {
  console.log('[Fallback Skill Map] Using keyword extraction');
  
  const combinedText = `${text} ${description}`.toLowerCase();
  
  // Common technology keywords
  const techKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'nodejs',
    'angular', 'vue', 'sql', 'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes',
    'git', 'rest api', 'graphql', 'html', 'css', 'tailwind', 'bootstrap',
    'express', 'django', 'spring', 'flask', 'redis', 'elasticsearch'
  ];
  
  const requiredSkills: string[] = [];
  for (const keyword of techKeywords) {
    if (combinedText.includes(keyword)) {
      requiredSkills.push(keyword);
    }
  }
  
  // Extract experience level
  let experienceLevel = 'mid-level';
  if (combinedText.includes('senior') || combinedText.includes('lead')) {
    experienceLevel = 'senior';
  } else if (combinedText.includes('junior') || combinedText.includes('entry')) {
    experienceLevel = 'junior';
  }
  
  return {
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ['general programming'],
    niceToHave: [],
    experienceLevel,
    domain: 'software development'
  };
}
