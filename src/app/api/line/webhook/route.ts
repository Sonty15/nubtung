import { NextResponse } from 'next/server';
import { handleLineEvent } from '@/lib/line/bot';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      await handleLineEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LINE Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process LINE webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'LINE Webhook is active' });
}
