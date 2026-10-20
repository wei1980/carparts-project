// src/components/orders/IssueEditModal.jsx — 抽離自 src/pages/Orders.jsx
import { useState } from 'react';
import { consumerClient as api } from '../../api/client';
// ===== 🆕 售後回報編輯 Modal =====
export default function IssueEditModal({ order, issue, onClose, onSuccess }) {
  const [issueType, setIssueType] = useState(issue.issueType || 'DEFECT');
  const [description, setDescription] = useState(issue.description || '');
  const [newFiles, setNewFiles] = useState([]);
  const [removedUrls, setRemovedUrls] = useState([]); // 要移除的既有附件 URL
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resolveUrl = (url) => url.startsWith('http') ? url : `http://localhost:3000${url}`;

  const handleFileChange = (e) => {
    if (e.target.files) setNewFiles(Array.from(e.target.files));
  };

  // 切換某個既有附件的「移除」狀態
  const toggleRemove = (url) => {
    setRemovedUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const submit = async () => {
    setError('');
    if (!description.trim()) return setError('請填寫問題描述');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('issueType', issueType);
      formData.append('description', description);
      // 傳送要移除的既有附件（JSON 陣列）
      if (removedUrls.length > 0) {
        formData.append('removeMediaUrls', JSON.stringify(removedUrls));
      }
      newFiles.forEach(file => formData.append('media', file));

      await api.patch(
        `/consumer/orders/${order.id}/issues/${issue.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const keptCount = (issue.mediaUrls || []).filter(u => !removedUrls.includes(u)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-md w-full p-6 text-white max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-1">✏️ 修改售後回報</h3>
        <p className="text-sm text-gray-400 mb-4">訂單 #{order.order_number}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">問題類型 *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="editIssueType" value="DEFECT" checked={issueType === 'DEFECT'} onChange={() => setIssueType('DEFECT')} className="text-blue-500" />
                商品有瑕疵/損壞
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="editIssueType" value="MISMATCH" checked={issueType === 'MISMATCH'} onChange={() => setIssueType('MISMATCH')} className="text-blue-500" />
                規格/型號不符合
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">問題描述 *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="請詳細描述商品損壞情況或規格不符的地方..."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm min-h-[100px]"
            />
          </div>

          {/* 既有附件：可勾選移除 */}
          {issue.mediaUrls && issue.mediaUrls.length > 0 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                現有附件（點選縮圖可切換「移除」；保留 {keptCount} 個）
              </label>
              <div className="flex flex-wrap gap-2">
                {issue.mediaUrls.map((url, idx) => {
                  const fullUrl = resolveUrl(url);
                  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                  const willRemove = removedUrls.includes(url);
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => toggleRemove(url)}
                      className={`relative block w-20 h-20 rounded-lg overflow-hidden border-2 transition group ${
                        willRemove ? 'border-red-500 opacity-40' : 'border-slate-600 hover:border-cyan-400'
                      }`}
                      title={willRemove ? '點擊取消移除' : '點擊標記移除'}
                    >
                      {isImage ? (
                        <img src={fullUrl} alt={`附件 ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : isVideo ? (
                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                          <span className="text-2xl">🎬</span>
                          <span className="text-xs mt-0.5">影片</span>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl">📎</div>
                      )}
                      {/* 狀態標籤 */}
                      <div className={`absolute inset-x-0 bottom-0 text-xs text-center py-0.5 font-bold ${
                        willRemove ? 'bg-red-600/90 text-white' : 'bg-black/60 text-cyan-200'
                      }`}>
                        {willRemove ? '✕ 將移除' : '保留'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 上傳新附件 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">新增照片或影片 (可多選，每檔上限 20 MB)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800"
            />
            {newFiles.length > 0 && (
              <p className="text-xs text-cyan-400 mt-2">已選擇 {newFiles.length} 個新檔案</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">取消</button>
          <button onClick={submit} disabled={submitting}
            className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold">
            {submitting ? '儲存中…' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  );
}
