import { NextRequest, NextResponse } from 'next/server';
import { getResumeFile } from '@/lib/store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const resumeData = getResumeFile(id);

    if (!resumeData) {
      return NextResponse.json({ error: 'Resume file not found for this candidate' }, { status: 404 });
    }

    return new NextResponse(resumeData.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': resumeData.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(resumeData.filename)}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error downloading resume file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
