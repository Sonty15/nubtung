import { NextResponse } from 'next/server';
import { executeFullSync } from '@/lib/sync/runner';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    // Optional secret verification if CRON_SECRET is configured
    if (secret && authHeader !== `Bearer ${secret}`) {
      const url = new URL(req.url);
      const queryKey = url.searchParams.get('key');
      if (queryKey !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await executeFullSync();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron Sync Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron sync failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
