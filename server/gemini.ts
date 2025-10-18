import { GoogleGenAI } from "@google/genai";

// Gemini AI integration for AI Workforce OS
// Reference: javascript_gemini blueprint

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SkillMap {
  milestone: string;
  required_skills: string[];
  experience_level: string;
  soft_skills: string[];
}

export interface CVAnalysis {
  name: string;
  email?: string;
  skills: string[];
  experience: string;
  education: string;
  soft_skills?: string[];
  domain_expertise?: string[];
}

export interface FitScoreAnalysis {
  score: number;
  skillOverlap: number;
  experienceMatch: number;
  softSkillRelevance: number;
  reasoning: string;
}

export interface RiskAnalysis {
  risk_level: "low" | "medium" | "high";
  delay_percentage: number;
  predicted_issues: string[];
  recommendations: string[];
  backup_required: boolean;
}

// Generate AI skill map from milestone description
export async function generateSkillMap(milestoneName: string, milestoneDescription: string): Promise<SkillMap> {
  try {
    const prompt = `Analyze this project milestone and extract structured skill requirements:

Milestone: ${milestoneName}
Description: ${milestoneDescription}

Extract and return:
1. Required technical skills (programming languages, frameworks, tools)
2. Experience level needed (Entry, Intermediate, Advanced, Expert)
3. Soft skills required (communication, problem-solving, etc.)

Return ONLY valid JSON in this exact format:
{
  "milestone": "${milestoneName}",
  "required_skills": ["skill1", "skill2", "skill3"],
  "experience_level": "Intermediate",
  "soft_skills": ["soft_skill1", "soft_skill2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            milestone: { type: "string" },
            required_skills: { 
              type: "array",
              items: { type: "string" }
            },
            experience_level: { type: "string" },
            soft_skills: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["milestone", "required_skills", "experience_level", "soft_skills"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    return result as SkillMap;
  } catch (error) {
    console.error("Error generating skill map:", error);
    throw new Error("Failed to generate skill map with AI");
  }
}

// Analyze CV text and extract candidate profile
export async function analyzeCVText(cvText: string): Promise<CVAnalysis> {
  try {
    const prompt = `Analyze this CV/resume text and extract the candidate's profile:

${cvText}

Extract and return:
1. Full name
2. Email address (if present)
3. Technical skills (programming languages, frameworks, tools)
4. Work experience summary
5. Education background
6. Soft skills
7. Domain expertise areas

Return ONLY valid JSON in this exact format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": "Brief summary of work experience",
  "education": "Education background",
  "soft_skills": ["soft_skill1", "soft_skill2"],
  "domain_expertise": ["domain1", "domain2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            skills: {
              type: "array",
              items: { type: "string" }
            },
            experience: { type: "string" },
            education: { type: "string" },
            soft_skills: {
              type: "array",
              items: { type: "string" }
            },
            domain_expertise: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["name", "skills", "experience", "education"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    return result as CVAnalysis;
  } catch (error) {
    console.error("Error analyzing CV:", error);
    throw new Error("Failed to analyze CV with AI");
  }
}

// Calculate fit score between candidate and milestone
export async function calculateFitScore(
  candidateSkills: string[],
  candidateExperience: string,
  skillMap: SkillMap
): Promise<FitScoreAnalysis> {
  try {
    const prompt = `Analyze the fit between this candidate and milestone requirements:

Candidate Skills: ${candidateSkills.join(", ")}
Candidate Experience: ${candidateExperience}

Milestone Requirements:
- Required Skills: ${skillMap.required_skills.join(", ")}
- Experience Level: ${skillMap.experience_level}
- Soft Skills: ${skillMap.soft_skills.join(", ")}

Calculate:
1. Skill Overlap (0-100): How many required skills does the candidate have?
2. Experience Match (0-100): Does their experience level match?
3. Soft Skill Relevance (0-100): Do they have relevant soft skills?
4. Overall Fit Score (0-100): Weighted average (60% skills, 30% experience, 10% soft skills)
5. Brief reasoning for the score

Return ONLY valid JSON:
{
  "score": 85,
  "skillOverlap": 90,
  "experienceMatch": 80,
  "softSkillRelevance": 75,
  "reasoning": "Brief explanation of why this score was given"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            score: { type: "number" },
            skillOverlap: { type: "number" },
            experienceMatch: { type: "number" },
            softSkillRelevance: { type: "number" },
            reasoning: { type: "string" }
          },
          required: ["score", "skillOverlap", "experienceMatch", "softSkillRelevance", "reasoning"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    return result as FitScoreAnalysis;
  } catch (error) {
    console.error("Error calculating fit score:", error);
    throw new Error("Failed to calculate fit score with AI");
  }
}

// Predict project risk based on delay
export async function predictRisk(
  milestoneName: string,
  milestoneDescription: string,
  delayPercentage: number,
  estimatedHours: number
): Promise<RiskAnalysis> {
  try {
    const prompt = `Analyze this project milestone for risk:

Milestone: ${milestoneName}
Description: ${milestoneDescription}
Estimated Hours: ${estimatedHours}
Current Delay: ${delayPercentage}%

Analyze the risk and provide:
1. Risk Level (low, medium, high)
2. Predicted Issues (what could go wrong)
3. Recommendations (how to mitigate)
4. Whether backup talent should be activated (true/false)

Risk criteria:
- Delay <10%: Low risk
- Delay 10-20%: Medium risk
- Delay >20%: High risk

Return ONLY valid JSON:
{
  "risk_level": "high",
  "delay_percentage": ${delayPercentage},
  "predicted_issues": ["issue1", "issue2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "backup_required": true
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            risk_level: { 
              type: "string",
              enum: ["low", "medium", "high"]
            },
            delay_percentage: { type: "number" },
            predicted_issues: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            backup_required: { type: "boolean" }
          },
          required: ["risk_level", "delay_percentage", "predicted_issues", "recommendations", "backup_required"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    return result as RiskAnalysis;
  } catch (error) {
    console.error("Error predicting risk:", error);
    throw new Error("Failed to predict risk with AI");
  }
}
