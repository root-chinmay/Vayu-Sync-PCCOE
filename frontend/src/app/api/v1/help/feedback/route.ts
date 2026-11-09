import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'success',
      message: 'Citizen feedback received successfully. Thank you for contributing to VayuSync accuracy.',
      submission_id: 'fb-' + Date.now(),
      data: body,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
