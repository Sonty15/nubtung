import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner import
import { parseGhbReceiptText, syncMortgageReceiptsFromEmail } from './sync.ts';

describe('GHB Receipt Parser', () => {
  it('parses receipt with insurance fee, interest, and principal', () => {
    const sampleText = `
      ธนาคารอาคารสงเคราะห์
      ใบเสร็จรับเงินอิเล็กทรอนิกส์
      เลขที่บัญชี 011690010482
      วันที่ 27 กรกฎาคม 2569
      จำนวนเงินที่ชำระ *****600.00 บาท
      ค่าประกันอัคคีภัย   ดอกเบี้ย   เงินต้น
      180.74   0.00   419.26
      เงินต้นคงเหลือ 99,603.74 บาท
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010482');
    assert.strictEqual(result.totalPaid, 600.00);
    assert.strictEqual(result.fee, 180.74);
    assert.strictEqual(result.principal, 419.26);
    assert.strictEqual(result.remainingBalance, 99603.74);
  });

  it('parses receipt with alternative keyword ยอดคงเหลือ and house account', () => {
    const sampleText = `
      ธนาคารอาคารสงเคราะห์ (ghbank)
      ใบเสร็จรับเงินอิเล็กทรอนิกส์
      เลขที่บัญชี 011690010474
      วันที่ 25 สิงหาคม 2569
      จำนวนเงินที่ชำระ *****8,500.00 บาท
      ค่าประกันอัคคีภัย   ดอกเบี้ย   เงินต้น
      0.00   3,850.00   4,650.00
      ยอดคงเหลือ 2,095,350.00 บาท
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010474');
    assert.strictEqual(result.totalPaid, 8500.00);
    assert.strictEqual(result.fee, 0.00);
    assert.strictEqual(result.interest, 3850.00);
    assert.strictEqual(result.principal, 4650.00);
    assert.strictEqual(result.remainingBalance, 2095350.00);
  });

  it('handles receipt without remaining balance gracefully', () => {
    const sampleText = `
      ธนาคารอาคารสงเคราะห์
      ใบเสร็จรับเงินอิเล็กทรอนิกส์
      เลขที่บัญชี 011690010474
      วันที่ 25 สิงหาคม 2569
      จำนวนเงินที่ชำระ 8,500.00 บาท
      ค่าประกันอัคคีภัย   ดอกเบี้ย   เงินต้น
      0.00   3,850.00   4,650.00
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010474');
    assert.strictEqual(result.remainingBalance, undefined);
  });

  it('returns null for non-GHB text', () => {
    const sampleText = 'Some random bank statement without GHB header';
    const result = parseGhbReceiptText(sampleText);
    assert.strictEqual(result, null);
  });

  it('syncMortgageReceiptsFromEmail returns error when GHB_EMAIL_APP_PASSWORD is missing', async () => {
    const prevPass = process.env.GHB_EMAIL_APP_PASSWORD;
    delete process.env.GHB_EMAIL_APP_PASSWORD;
    try {
      const result = await syncMortgageReceiptsFromEmail();
      assert.strictEqual(result.added, 0);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('GHB_EMAIL_APP_PASSWORD'));
    } finally {
      if (prevPass !== undefined) {
        process.env.GHB_EMAIL_APP_PASSWORD = prevPass;
      }
    }
  });
});
