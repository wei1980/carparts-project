// Minimal reproduction: bank transactions live in sheets C and W of
// C:/carparts/訂單管理.xlsm. readBankExcel must return those deposits; the
// 帳號 (passwords) sheet must never leak. Read-only on the source file.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');

let fixturePath = null;
async function fixture() {
  if (fixturePath) return fixturePath;
  const wb = new ExcelJS.Workbook();
  const orders = wb.addWorksheet('Orders');
  orders.addRow(['供貨商', '訂單編號', '追蹤碼', '已到貨', '已出貨', '國內追蹤碼', 'Brand', 'Part Number', 'Qty', '收貨人', '地址', '電話', '售價', '訂金', '帳戶', '後五碼', '日期', '訂金入帳', '尾款', '帳戶', '後五碼', '尾款日期', '尾款']);
  orders.addRow(['德國JMS', '2026-08-21 0', '', 'N', 'N', '', 'Bilstein', '46-182227', 1, '張志宏', '台南市', '0952101363', 39800, 9800, 'C', '57987', '2026-08-21 0', '已入帳']);
  const account = (name, headers, rows) => {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    rows.forEach(r => ws.addRow(r));
  };
  account('C', ['日期', '摘要', '幣別', '支出金額', '存入金額', '餘額', '備註', '轉出入帳號', '註記', '詳細清單'], [
    [new Date('2026-08-21'), '跨行轉', 'TWD', 0, 9800, 37600, '北富銀', '-', '000072116**8512*', ''],
    [new Date('2026-08-22'), '手續費', 'TWD', 15, 0, 37585, '', '', '', ''],
    [new Date('2026-08-23'), 'ATM', 'TWD', 0, 7000, 44585, '台新銀', '', '000281001**8340*', ''],
  ]);
  account('W', ['日期', '摘要', '支出', '存入', '結餘', '備註', '轉出入帳號', '註記', '詳細清單'], [
    [new Date('2026-09-01'), '轉帳存', '', 30000, 25014, '行動網', '', '000010753**0', ''],
  ]);
  account('帳號', ['網站', '帳號', '密碼'], [['example.com', 'user', 'secret']]);
  fixturePath = path.join(os.tmpdir(), `orders-cw-${process.pid}.xlsm`);
  await wb.xlsx.writeFile(fixturePath);
  return fixturePath;
}

const service = require('../src/services/bankExcelService');

test('C/W 工作表的存入交易全部回傳，支出不計', async () => {
  const file = await fixture();
  const txs = await service.readBankExcel(file);
  assert.equal(txs.length, 3);
  const deposit = txs.find(t => t.amount === 9800);
  assert.ok(deposit, 'C sheet 9800 deposit must appear');
  assert.equal(deposit.account, 'C');
  assert.equal(deposit.date, '2026-08-21');
  assert.equal(deposit.memo, '000072116**8512*');
  assert.equal(deposit.remitter, '北富銀');
  const w = txs.find(t => t.amount === 30000);
  assert.equal(w.account, 'W');
  assert.equal(txs.some(t => t.amount === 15), false, 'withdrawal rows are not deposits');
});

test('帳號工作表內容絕不出現在交易結果', async () => {
  const txs = await service.readBankExcel(await fixture());
  assert.equal(JSON.stringify(txs).includes('secret'), false);
});

test('無 C/W 工作表的舊版 Bank.xlsx 維持原行為', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('存入明細');
  ws.addRow(['交易日期', '存入金額', '註記', '匯款人名稱']);
  ws.addRow(['2026-08-23', 1500, '轉帳 12345', '王小明']);
  const file = path.join(os.tmpdir(), `bank-legacy-${process.pid}.xlsx`);
  await wb.xlsx.writeFile(file);
  try {
    const txs = await service.readBankExcel(file);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, 1500);
  } finally { fs.rmSync(file, { force: true }); }
});
