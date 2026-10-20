// src/components/orders/IssueReportModal.jsx — 抽離自 src/pages/Orders.jsx
import { useState } from 'react';
import { consumerClient as api } from '../../api/client';
// ===== 🆕 售後問題回報 Modal (商品瑕疵/規格不符) =====
export default function IssueReportModal({ order, onClose, onSuccess }) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [issueType, setIssueType] = useState('DEFECT');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const submit = async () => {
    setError('');
    if (!selectedItemId) return setError('請選擇有問題的商品');
    if (!description.trim()) return setError('請簡單描述問題狀況');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('orderItemId', selectedItemId);
      formData.append('issueType', issueType);
      formData.append('description', description);
      files.forEach(file => formData.append('media', file));

      await api.post(`/consumer/orders/${order.id}/issues`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-md w-full p-6 text-white max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-1">🛠️ 售後服務與問題回報</h3>
        <p className="text-sm text-gray-400 mb-4">訂單 #{order.order_number}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">發生問題的商品 *</label>
            <select
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white"
            >
              <option value="">請選擇商品...</option>
              {order.items?.map(it => (
                <option key={it.id} value={it.id}>{it.name_snapshot || it.part?.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">問題類型 *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="issueType" value="DEFECT" checked={issueType === 'DEFECT'} onChange={() => setIssueType('DEFECT')} className="text-blue-500" />
                商品有瑕疵/損壞
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="issueType" value="MISMATCH" checked={issueType === 'MISMATCH'} onChange={() => setIssueType('MISMATCH')} className="text-blue-500" />
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

          <div>
            <label className="block text-xs text-gray-400 mb-1">上傳照片或影片 (可多選，每檔上限 20 MB)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800"
            />
            {files.length > 0 && (
              <p className="text-xs text-cyan-400 mt-2">已選擇 {files.length} 個檔案</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">取消</button>
          <button onClick={submit} disabled={submitting}
            className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold">
            {submitting ? '提交中…' : '送出回報'}
          </button>
        </div>
      </div>
    </div>
  );
}
