import fs from 'fs';
import path from 'path';
import { CandidateProfile } from './types';

// In-memory candidate storage (persists across requests in the server/serverless process)
const initialCandidates: CandidateProfile[] = [
  {
    id: '1',
    name: 'Mohammad Abdul Safi',
    category: 'Backend / Java',
    resumeName: 'Abdul-Safi_Resume.docx',
    targetDomains: [
      'Java', 'Spring', 'Cloud', 'DevOps', 'Backend', 'Full Stack', 'Software', 'IT', 'Engineering'
    ],
    maxExperienceYears: 10,
    workAuth: 'H1B',
    details: 'Name: Mohammad Abdul Safi\nE-Mail: itsabdulsafi@gmail.com\nPhone: +1 (636) 368-0908\nLinkedIn: www.linkedin.com/in/mohammedabdulsafi\nLocation: Ballwin, MO\nExperience: 7+ years\nExpected Salary: C2C only (negotiable)\nCertifications: Microsoft Azure Developer Associate',
    updatedAt: new Date().toISOString(),
    status: 'active',
    applicationsSent: 18,
  },
  {
    id: '2',
    name: 'Vijay Kumar',
    category: 'DevOps / Cloud',
    resumeName: 'Vijay_Resume.docx',
    targetDomains: ['Networks', 'AWS', 'Azure', 'Security', 'DevOps', 'Cloud'],
    maxExperienceYears: 5,
    workAuth: 'F-1 STEM OPT',
    details: 'Name: Vijay Kumar\nPhone: (469) 215-1815\nEmail: vijaykumar07it@gmail.com\nVisa: F-1 STEM OPT\nSpecialization: AWS, Azure, Cloud Infrastructure',
    updatedAt: new Date().toISOString(),
    status: 'ready',
    applicationsSent: 12,
  },
  {
    id: '3',
    name: 'Reju Karkee',
    category: 'Data Engineering / Analytics',
    resumeName: 'Reju-Karkee_Resume.docx',
    targetDomains: [
      'Data Engineer', 'Senior Data Engineer', 'Analytics', 'ETL Developer', 'ETL Engineer', 'Cloud Data Engineer', 'Big Data Engineer', 'Snowflake Data Engineer'
    ],
    maxExperienceYears: 5,
    workAuth: 'F-1 STEM OPT',
    details: 'Name: Reju Karkee\nEmail: rejukarkee@gmail.com\nPhone: +1 (469) 555-0199\nVisa: F-1 STEM OPT\nSpecialization: Snowflake, Data Warehousing, Big Data Pipelines',
    updatedAt: new Date().toISOString(),
    status: 'ready',
    applicationsSent: 9,
  }
];

// Global cache to maintain profiles in memory
declare global {
  // eslint-disable-next-line no-var
  var __candidateProfilesStore: CandidateProfile[] | undefined;
  // eslint-disable-next-line no-var
  var __resumeFilesCache: Map<string, { buffer: Buffer; filename: string; mimeType: string }> | undefined;
}

if (!global.__candidateProfilesStore) {
  global.__candidateProfilesStore = [...initialCandidates];
}

if (!global.__resumeFilesCache) {
  global.__resumeFilesCache = new Map();
}

const store = global.__candidateProfilesStore;
const resumeCache = global.__resumeFilesCache;

function getStorageDirectory(): string {
  // On Vercel / AWS Lambda, use /tmp which is the only writable directory
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'resumes');
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch {
      return '/tmp';
    }
  }

  // Local development storage inside app data
  const localDir = path.join(process.cwd(), '.data', 'resumes');
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ localDir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ localDir, { recursive: true });
    }
    return localDir;
  } catch {
    return process.cwd();
  }
}

export function getAllProfiles(): CandidateProfile[] {
  return store;
}

export function getProfileById(id: string): CandidateProfile | undefined {
  return store.find(p => p.id === id);
}

export async function addProfile(
  input: {
    name: string;
    category: string;
    targetDomains?: string[];
    maxExperienceYears?: number;
    workAuth?: string;
    details?: string;
  },
  resumeBuffer: Buffer,
  resumeFilename: string,
  mimeType: string
): Promise<CandidateProfile> {
  const newId = String(store.length > 0 ? Math.max(...store.map(p => Number(p.id) || 0)) + 1 : 1);
  const targetDir = getStorageDirectory();
  const safeFilename = `${Date.now()}-${resumeFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const diskPath = path.join(targetDir, safeFilename);

  try {
    fs.writeFileSync(/*turbopackIgnore: true*/ diskPath, resumeBuffer);
  } catch (err) {
    console.warn('Could not write resume to disk, caching in memory:', err);
  }

  // Also if in local environment with workspace resumes folder, mirror it to root resumes folder
  const workspaceResumesDir = path.resolve(process.cwd(), '../../resumes');
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ workspaceResumesDir)) {
      fs.writeFileSync(/*turbopackIgnore: true*/ path.join(workspaceResumesDir, resumeFilename), resumeBuffer);
    }
  } catch {
    // Non-fatal
  }

  // Cache binary resume in memory for instant retrieval and download on Vercel
  resumeCache.set(newId, {
    buffer: resumeBuffer,
    filename: resumeFilename,
    mimeType
  });

  const newProfile: CandidateProfile = {
    id: newId,
    name: input.name,
    category: input.category,
    resumeName: resumeFilename,
    resumePath: diskPath,
    resumeMimeType: mimeType,
    targetDomains: input.targetDomains && input.targetDomains.length > 0
      ? input.targetDomains
      : [input.category],
    maxExperienceYears: input.maxExperienceYears ?? 5,
    workAuth: input.workAuth ?? 'Any',
    details: input.details ?? `Name: ${input.name}\nRole: ${input.category}`,
    updatedAt: new Date().toISOString(),
    status: 'ready',
    applicationsSent: 0
  };

  store.unshift(newProfile);

  // If running in local project workspace, attempt to sync with candidate_details folder
  const candidateDetailsDir = path.resolve(process.cwd(), '../../candidate_details');
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidateDetailsDir)) {
      const sanitizedName = input.name.replace(/[^a-zA-Z0-9]/g, '_');
      const detailFilePath = path.join(candidateDetailsDir, `${sanitizedName}.txt`);
      fs.writeFileSync(/*turbopackIgnore: true*/ detailFilePath, newProfile.details || '', 'utf8');
    }
  } catch {
    // Non-fatal
  }

  return newProfile;
}

export function deleteProfile(id: string): boolean {
  const index = store.findIndex(p => p.id === id);
  if (index === -1) return false;

  const [removed] = store.splice(index, 1);
  resumeCache.delete(id);

  if (removed?.resumePath) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ removed.resumePath)) {
        fs.unlinkSync(/*turbopackIgnore: true*/ removed.resumePath);
      }
    } catch {
      // Ignore unlink failure
    }
  }

  return true;
}

export function getResumeFile(id: string): { buffer: Buffer; filename: string; mimeType: string } | null {
  // Check memory cache first (guaranteed to work in Vercel serverless)
  if (resumeCache.has(id)) {
    return resumeCache.get(id)!;
  }

  const profile = getProfileById(id);
  if (!profile) return null;

  // Check stored disk path
  if (profile.resumePath) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ profile.resumePath)) {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ profile.resumePath);
        const mimeType = profile.resumeName.endsWith('.pdf')
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return { buffer, filename: profile.resumeName, mimeType };
      }
    } catch {
      // Continue
    }
  }

  // Check workspace resumes directory if running locally
  const workspaceResumesDir = path.resolve(process.cwd(), '../../resumes');
  const candidatePath = path.join(workspaceResumesDir, profile.resumeName);
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
      const buffer = fs.readFileSync(/*turbopackIgnore: true*/ candidatePath);
      const mimeType = profile.resumeName.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return { buffer, filename: profile.resumeName, mimeType };
    }
  } catch {
    // Continue
  }

  return null;
}
