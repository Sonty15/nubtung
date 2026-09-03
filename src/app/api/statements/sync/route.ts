import { NextResponse } from 'next/server';
import { syncStatementsFromDrive } from '@/lib/statement/parser';

export async function POST() {
  try {
    const result = await syncStatementsFromDrive();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Statement sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync statements from Google Drive' },
      { status: 500 }
    );
  }
}
