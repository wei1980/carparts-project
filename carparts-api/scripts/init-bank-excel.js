// 初始化 Bank.xlsx 測試檔案
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'C:/carparts/Update/Bank.xlsx';

async function createBankExcel() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('存入明細');
  
  // 標題列
  ws.addRow(['交易日期', '存入金額', '註記', '匯款人名稱']);
  
  // 測試資料
  ws.addRow(['2026-09-26', 15000, 'ATM 轉帳 12345', '王小明']);
  ws.addRow(['2026-09-26', 4400, '匯款 67890', '李大華']);
  ws.addRow(['2026-09-25', 8800, '公司匯款 11111', '陳中華']);
  
  // 建立目錄
  fs.mkdirSync(path.dirname(EXCEL_PATH), { recursive: true });
  
  await wb.xlsx.writeFile(EXCEL_PATH);
  console.log(`✅ 已建立 Bank.xlsx: ${EXCEL_PATH}`);
}

createBankExcel().catch(console.error);