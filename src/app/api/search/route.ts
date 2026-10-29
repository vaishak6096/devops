import { NextRequest, NextResponse } from 'next/server';
import { getProfileById } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, settings } = body;

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const profile = getProfileById(profileId);
    if (!profile) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    const targetApplications = settings?.targetApplicationsCount || 5;

    return NextResponse.json({
      success: true,
      message: `Outreach search initialized for ${profile.name} (Target: ${targetApplications} applications)`,
      candidate: {
        id: profile.id,
        name: profile.name,
        category: profile.category,
        domains: profile.targetDomains,
        resume: profile.resumeName
      },
      searchId: `job_search_${Date.now()}`,
      status: 'active',
      startedAt: new Date().toISOString()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error initiating outreach search';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
