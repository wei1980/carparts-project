// src/services/bankExcelService.js — 銀行 Excel 讀取 + Mock 產生
// 啟動時若 MOCK_BANK_EXCEL=true 且檔案不存在，自動建立測試用 Excel
// 2026-08-25：xlsx → exceljs（移除 SheetJS CVE-2023-30533 / GHSA-5pgg-2g8v-p4x9 攻擊面；
// exceljs 只解析真實 zip/xlsx 結構，不會對任意 XML 做原型合併）
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = process.env.BANK_EXCEL_PATH || 'C:/carparts/Update/Bank.xlsx';

/** 從 worksheet 抽出標題列之下的二維陣列（值皆轉字串） */
function excelDateToString(v) {
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return v;
}

function sheetRows(ws) {
  const out = [];
  ws.eachRow({ includeEmpty: false }, row => {
    out.push(Array.from({ length: ws.columnCount }, (_, c) => {
      const cell = row.getCell(c + 1);
      if (cell.value instanceof Date) return excelDateToString(cell.value);
      // Formula/rich cells stringify as [object Object]; cell.text holds their result.
      return String(cell.text ?? cell.value ?? '').trim();
    }));
  });
  return out;
}

/** 標題列索引（中英欄位相容：日期/交易日期、金額/存入金額、備註/註記/摘要、匯款人名稱） */
function headerMap(headers) {
  const find = (...names) => headers.findIndex(h => names.includes(h));
  return {
    date: find('交易日期', '日期'),
    amount: find('存入金額', '金額'),
    memo: find('註記', '備註', '摘要'),
    remitter: find('匯款人名稱'),
  };
}

/**
 * 確保 Bank.xlsx 存在。MOCK_BANK_EXCEL=true 時自動產生範例檔。
 * @param {Array<{date:string, amount:number, memo:string, remitter:string}>} mockRows 測試交易
 * @returns {Promise<{created:boolean, path:string, rows?:number, warning?:string}>}
 */
async function ensureBankExcel(mockRows = []) {
  if (fs.existsSync(EXCEL_PATH)) return { created: false, path: EXCEL_PATH };
  if (process.env.MOCK_BANK_EXCEL !== 'true') {
    return { created: false, path: EXCEL_PATH, warning: '檔案不存在且未開啟 MOCK_BANK_EXCEL' };
  }

  const ExcelJS = require('exceljs');
  // 建立目錄
  fs.mkdirSync(path.dirname(EXCEL_PATH), { recursive: true });

  // 預設測試資料（若呼叫端沒給）
  const rows = mockRows.length > 0 ? mockRows : [
    { date: '2026-08-23', amount: 1500, memo: '轉帳 12345', remitter: '王小明' },
    { date: '2026-08-23', amount: 3000, memo: 'ATM 轉帳 67890', remitter: '李大華' },
  ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('存入明細');
  ws.addRow(['交易日期', '存入金額', '註記', '匯款人名稱']);
  rows.forEach(r => ws.addRow([r.date, r.amount, r.memo, r.remitter]));
  await wb.xlsx.writeFile(EXCEL_PATH);

  console.debug(`📄 已產生 Mock 銀行 Excel: ${EXCEL_PATH}（${rows.length} 筆測試交易）`);
  return { created: true, path: EXCEL_PATH, rows: rows.length };
}

/**
 * 讀取 Bank.xlsx → 標準化交易陣列 [{row, date, amount, memo, remitter}]
 * 欄位相容：交易日期/日期、存入金額/金額、註記/備註/摘要、匯款人名稱
 */
async function readBankExcel(sourcePath) {
  const ExcelJS = require('exceljs');
  const source = sourcePath || EXCEL_PATH;
  if (!fs.existsSync(source)) throw new Error(`找不到銀行檔案: ${source}`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(source);

  // 訂單管理工作簿：入帳在 C（公司）與 W（個人）工作表；帳號工作表含密碼，永遠排除。
  const accountSheets = wb.worksheets.filter(ws => ws.name === 'C' || ws.name === 'W');
  if (accountSheets.length > 0) {
    const out = [];
    for (const ws of accountSheets) {
      const rows = sheetRows(ws);
      if (rows.length < 2) continue;
      const headers = rows[0];
      const find = (...names) => headers.findIndex(h => names.includes(h));
      // 兩張帳戶表語意一致：註記＝銀行參考（含末五碼線索），備註＝往來銀行標籤。
      // find() 由左至右掃描，memo 只比對 註記，避免被 摘要 搶走。
      const hm = {
        date: find('交易日期', '日期'),
        amount: find('存入金額', '存入'),
        memo: find('註記'),
        remitter: find('備註', '轉出入帳號', '匯款人名稱'),
      };
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i];
        const amount = parseFloat(String(cells[hm.amount] || '').replace(/,/g, '')) || 0;
        if (!(amount > 0)) continue; // 只回傳存入；支出（手續費等）不是收款候選
        out.push({
          account: ws.name,
          row: i + 1,
          date: String(cells[hm.date] ?? ''),
          amount,
          memo: String(cells[hm.memo] ?? ''),
          remitter: String(cells[hm.remitter] ?? ''),
        });
      }
    }
    return out;
  }

  // 舊版單表 Bank.xlsx
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows = sheetRows(ws);
  if (rows.length < 2) return [];

  const hm = headerMap(rows[0]);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const amount = parseFloat(String(cells[hm.amount] || '').replace(/,/g, '')) || 0;
    if (!(amount > 0)) continue; // 與舊版一致：只留有正金額的列
    out.push({
      row: i + 1, // Excel 實際列號（含標題列）
      date: String(cells[hm.date] ?? ''),
      amount,
      memo: String(cells[hm.memo] ?? ''),
      remitter: String(cells[hm.remitter] ?? ''),
    });
  }
  return out;
}

module.exports = { ensureBankExcel, readBankExcel, EXCEL_PATH };
