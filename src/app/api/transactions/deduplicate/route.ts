import { NextResponse } from 'next/server';
import { deduplicateSheetTransactions, getExistingDriveFileIds } from '@/lib/google/sheets';
import { markSlipsProcessedBatch } from '@/lib/db/sqlite';

export async function POST() {
  try {
    const result = await deduplicateSheetTransactions();

    // After deduplicating, ensure all existing drive file IDs in sheet are cached in SQLite
    const currentDriveIds = await getExistingDriveFileIds();
    if (currentDriveIds.size > 0) {
      markSlipsProcessedBatch(Array.from(currentDriveIds));
    }

    return NextResponse.json({
      success: true,
      message: `ลบรายการซ้ำเรียบร้อยแล้ว: ลบออก ${result.removedCount} รายการ (จากทั้งหมด ${result.beforeCount} เหลือ ${result.afterCount} รายการ)`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error deduplicating transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deduplicate transactions' },
      { status: 500 }
    );
  }
}
