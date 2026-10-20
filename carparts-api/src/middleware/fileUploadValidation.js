// src/middleware/fileUploadValidation.js
// 檔案上傳驗證中介軟體
const multer = require('multer');
const path = require('path');

// 允許的圖片 MIME 類型
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// 最大檔案大小：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 最大檔案數量
const MAX_FILES = 10;

// 檔案類型驗證
function fileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error(`不支援的檔案類型：${file.mimetype}，僅允許 JPEG、PNG、WebP、GIF`), false);
  }
  cb(null, true);
}

// Multer 設定（記憶體儲存，後續可上傳至 S3/雲端）
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

// 單檔上傳中介軟體
const uploadSingle = (fieldName) => upload.single(fieldName);

// 多檔上傳中介軟體
const uploadArray = (fieldName, maxCount = MAX_FILES) => upload.array(fieldName, maxCount);

// 多欄位上傳中介軟體
const uploadFields = (fields) => upload.fields(fields);

// 錯誤處理包裝
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        code: 'FILE_TOO_LARGE',
        message: `檔案大小超過限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        requestId: req.requestId
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        code: 'TOO_MANY_FILES',
        message: `檔案數量超過限制 (${MAX_FILES} 個)`,
        requestId: req.requestId
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        code: 'UNEXPECTED_FIELD',
        message: `未預期的檔案欄位：${err.field}`,
        requestId: req.requestId
      });
    }
  }
  if (err.message && err.message.includes('不支援的檔案類型')) {
    return res.status(400).json({
      code: 'INVALID_FILE_TYPE',
      message: err.message,
      requestId: req.requestId
    });
  }
  next(err);
}

// 檔案上傳後的驗證（可選：病毒掃描、圖片處理等）
async function processUploadedFiles(req, res, next) {
  if (!req.files && !req.file) return next();

  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

  // 這裡可以加入：
  // 1. 病毒掃描 (ClamAV)
  // 2. 圖片最佳化 (Sharp 轉 WebP、縮圖)
  // 3. 上傳至 S3/雲端儲存
  // 4. 產生安全的檔案名稱

  // 暫時只驗證檔案緩衝區存在
  for (const file of files) {
    if (!file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        code: 'EMPTY_FILE',
        message: '上傳檔案為空',
        requestId: req.requestId
      });
    }
  }

  next();
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  handleUploadError,
  processUploadedFiles,
};