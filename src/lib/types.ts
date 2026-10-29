export interface CandidateProfile {
  id: string;
  name: string;
  category: string;
  resumeName: string;
  resumePath?: string;
  resumeBase64?: string;
  resumeMimeType?: string;
  targetDomains: string[];
  maxExperienceYears: number;
  workAuth: string;
  details?: string;
  updatedAt: string;
  status?: 'active' | 'ready' | 'idle';
  applicationsSent?: number;
}

export interface CreateProfileInput {
  name: string;
  category: string;
  targetDomains?: string[];
  maxExperienceYears?: number;
  workAuth?: string;
  details?: string;
}
