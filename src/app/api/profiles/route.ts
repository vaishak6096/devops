import { NextRequest, NextResponse } from 'next/server';
import { getAllProfiles, addProfile } from '@/lib/store';

export async function GET() {
  try {
    const profiles = getAllProfiles().map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      resumeName: p.resumeName,
      targetDomains: p.targetDomains,
      maxExperienceYears: p.maxExperienceYears,
      workAuth: p.workAuth,
      details: p.details,
      updatedAt: p.updatedAt,
      status: p.status,
      applicationsSent: p.applicationsSent
    }));

    return NextResponse.json(profiles);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profiles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string | null;
    const category = formData.get('category') as string | null;
    const workAuth = (formData.get('workAuth') as string | null) || 'Any';
    const maxExperienceYears = formData.get('maxExperienceYears')
      ? parseInt(formData.get('maxExperienceYears') as string, 10)
      : 5;
    const details = (formData.get('details') as string | null) || '';
    const rawDomains = formData.get('targetDomains') as string | null;
    const targetDomains = rawDomains
      ? rawDomains.split(',').map(s => s.trim()).filter(Boolean)
      : [category || 'General'];

    const file = formData.get('resume') as File | null;

    if (!name || !category || !file) {
      return NextResponse.json(
        { error: 'Candidate name, job profile category, and resume file are required.' },
        { status: 400 }
      );
    }

    const filename = file.name || 'resume.docx';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx'].includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Resume file size exceeds the 10MB limit.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || (ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    const created = await addProfile(
      {
        name,
        category,
        targetDomains,
        maxExperienceYears,
        workAuth,
        details
      },
      buffer,
      filename,
      mimeType
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process resume upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
