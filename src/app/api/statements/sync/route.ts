import { NextResponse } from 'next/server';
import { syncStatementsFromEmail } from '@/lib/statement/email-sync';

export async function POST(req: Request) {
  try {
    let forceRefresh = false;
    try {
      const url = new URL(req.url);
      forceRefresh = url.searchParams.get('force') === 'true';
      if (!forceRefresh) {
        const body = await req.json().catch(() => ({}));
        forceRefresh = Boolean(body?.force);
      }
    } catch {
      // ignore
    }

    const result = await syncStatementsFromEmail(forceRefresh);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Statement sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync statements from email' },
      { status: 500 }
    );
  }
}
