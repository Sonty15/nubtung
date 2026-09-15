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

  it('parses real GHB PDF table format with 3-column remaining balance header', () => {
    const sampleText = `
เลขที่บัญชี 011690010474                                                       ใบเสร็จรับเงินอิเล็กทรอนิกส์
วันที่      29 สิงหาคม 2569                               https://www.ghbank.co.th GHBank Call Center 02-6459000

  จำนวนเงินที่ชำระ                                                        ****************8,000.00 บาท

โดยเลขที่บัญชี
ค่าประกันอัคคีภัย /                 ดอกเบี้ย                         เงินต้น
ค่าธรรมเนียมอื่น
0.00                                3,901.31                         4,098.69
ค่าประกันอัคคีภัย /
ค่าธรรมเนียมอื่นคงเหลือ             ดอกเบี้ยคงเหลือ                  เงินต้นคงเหลือ
0.00                                0.00                             2,076,961.73
เงินงวด                             อัตราดอกเบี้ย                    เงินต้นค้างชำระ
6,100.00                            2.2000%                          0.00
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010474');
    assert.strictEqual(result.totalPaid, 8000.00);
    assert.strictEqual(result.fee, 0.00);
    assert.strictEqual(result.interest, 3901.31);
    assert.strictEqual(result.principal, 4098.69);
    assert.strictEqual(result.remainingBalance, 2076961.73);
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

  it('parses receipt with zero remaining balance correctly', () => {
    const sampleText = `
      ธนาคารอาคารสงเคราะห์
      ใบเสร็จรับเงินอิเล็กทรอนิกส์
      เลขที่บัญชี 011690010474
      วันที่ 25 ธันวาคม 2569
      จำนวนเงินที่ชำระ 5,000.00 บาท
      ค่าประกันอัคคีภัย   ดอกเบี้ย   เงินต้น
      0.00   0.00   5,000.00
      เงินต้นคงเหลือ 0.00 บาท
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010474');
    assert.strictEqual(result.remainingBalance, 0);
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
