import { NextResponse } from 'next/server';
import { syncMortgageReceiptsFromEmail } from '@/lib/ghb/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncMortgageReceiptsFromEmail();

    if (result.errors && result.errors.length > 0 && result.added === 0) {
      return NextResponse.json(
        {
          success: false,
          addedCount: 0,
          error: result.errors.join(', '),
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      addedCount: result.added,
      ...(result.errors && result.errors.length > 0 ? { errors: result.errors } : {}),
    });
  } catch (error: unknown) {
    console.error('[API /api/mortgage/sync] Error during mortgage sync:', error);
    return NextResponse.json(
      {
        success: false,
        addedCount: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
