import { describe, it } from 'node:test';
import assert from 'node:assert';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { resolveSlipTransaction, type RawSlipOcrResult } from './gemini-slip-ocr.ts';

describe('Slip Transaction Resolver', () => {
  it('correctly classifies user transferring to another person as EXPENSE, not TRANSFER', () => {
    const raw: RawSlipOcrResult = {
      isReceiveQrOrRequest: false,
      amount: 130,
      date: '2026-09-16',
      time: '19:30:00',
      senderName: 'นาย วรโชติ ว',
      receiverName: 'น.ส. อนัญญา สิงห์คา',
      receiverAccount: 'xxx-x-x7480-x',
      suggestedCategory: 'โอนระหว่างบัญชี',
      note: 'โอนระหว่างบัญชี',
    };

    const result = resolveSlipTransaction(raw, 'K PLUS');

    assert.strictEqual(result.type, 'EXPENSE');
    assert.strictEqual(result.isSelfTransfer, false);
    // Must NOT keep 'โอนระหว่างบัญชี' when transferring to someone else!
    assert.notStrictEqual(result.category, 'โอนระหว่างบัญชี');
    assert.strictEqual(result.category, 'อื่นๆ');
    // Note must use receiver's name, not generic 'โอนระหว่างบัญชี' or sender name
    assert.strictEqual(result.note, 'น.ส. อนัญญา สิงห์คา');
    assert.strictEqual(result.amount, 130);
  });

  it('does not treat user name in note as user being receiver', () => {
    const raw: RawSlipOcrResult = {
      isReceiveQrOrRequest: false,
      amount: 500,
      date: '2026-09-16',
      time: '12:00:00',
      senderName: 'นาย วรโชติ ว',
      receiverName: 'ร้านป้าใจดี',
      note: 'โอนจาก นาย วรโชติ ว',
    };

    const result = resolveSlipTransaction(raw, 'K PLUS');

    assert.strictEqual(result.type, 'EXPENSE');
    assert.strictEqual(result.isSelfTransfer, false);
    assert.strictEqual(result.note, 'ร้านป้าใจดี');
  });

  it('correctly identifies self-transfer to Paotang G-Wallet', () => {
    const raw: RawSlipOcrResult = {
      isReceiveQrOrRequest: false,
      amount: 150,
      date: '2026-09-15',
      time: '20:42:00',
      senderName: 'นาย วรโชติ ว',
      receiverName: 'KTB G-WALLET',
      receiverAccount: '006-xxx-9289',
      note: 'โอนเข้าเป๋าตัง (G-Wallet)',
    };

    const result = resolveSlipTransaction(raw, 'Make by KBank');

    assert.strictEqual(result.type, 'TRANSFER');
    assert.strictEqual(result.isSelfTransfer, true);
    assert.strictEqual(result.category, 'โอนระหว่างบัญชี');
    assert.strictEqual(result.note, 'โอนเข้าเป๋าตัง (G-Wallet)');
  });

  it('correctly identifies user transfer to himself between K PLUS and Make', () => {
    const raw: RawSlipOcrResult = {
      isReceiveQrOrRequest: false,
      amount: 1000,
      date: '2026-09-15',
      time: '10:00:00',
      senderName: 'นาย วรโชติ ว',
      receiverName: 'นาย วรโชติ ว',
      note: 'โอนเงิน',
    };

    const result = resolveSlipTransaction(raw, 'Make by KBank');

    assert.strictEqual(result.type, 'TRANSFER');
    assert.strictEqual(result.isSelfTransfer, true);
    assert.strictEqual(result.category, 'โอนระหว่างบัญชี');
  });

  it('correctly identifies incoming transfer from another person as INCOME', () => {
    const raw: RawSlipOcrResult = {
      isReceiveQrOrRequest: false,
      amount: 2000,
      date: '2026-09-15',
      time: '09:00:00',
      senderName: 'นาย สมชาย ใจดี',
      receiverName: 'นาย วรโชติ ว',
      note: 'คืนเงิน',
    };

    const result = resolveSlipTransaction(raw, 'K PLUS');

    assert.strictEqual(result.type, 'INCOME');
    assert.strictEqual(result.isSelfTransfer, false);
    assert.strictEqual(result.category, 'เงินเดือน/รายรับ');
  });
});
