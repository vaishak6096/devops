import { NextRequest, NextResponse } from 'next/server';
import { getProfileById, deleteProfile } from '@/lib/store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = getProfileById(id);

    if (!profile) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      category: profile.category,
      resumeName: profile.resumeName,
      targetDomains: profile.targetDomains,
      maxExperienceYears: profile.maxExperienceYears,
      workAuth: profile.workAuth,
      details: profile.details,
      updatedAt: profile.updatedAt,
      status: profile.status,
      applicationsSent: profile.applicationsSent
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = deleteProfile(id);

    if (!success) {
      return NextResponse.json({ error: 'Profile not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
