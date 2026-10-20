// src/components/AsyncOperationFeedback.jsx
// 統一的非同步操作回饋元件：Loading / Success / Error / Retry
import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { confirmDialog } from './ConfirmDialog';
import { getUserFriendlyError, createErrorActionHandler, ERROR_ACTION_TYPES } from '../utils/userFriendlyErrors';

/**
 * 通用非同步操作包裝元件
 * 用法：
 * <AsyncOperationFeedback
 *   apiCall={async (data) => await api.post('/xxx', data)}
 *   renderTrigger={({ execute, loading }) => <Button onClick={() => execute(formData)} loading={loading}>送出</Button>}
 *   successMessage="儲存成功"
 *   errorPrefix="儲存失敗："
 *   requireConfirm
 *   confirmMessage="確定要送出嗎？"
 *   onSuccess={(result) => console.log('Done:', result)}
 * />
 */
export function AsyncOperationFeedback({
  apiCall,
  children, // render prop: ({ execute, loading, error, retry }) => ReactNode
  renderTrigger, // 替代 children: ({ execute, loading }) => ReactNode
  successMessage = '操作成功',
  errorPrefix = '操作失敗：',
  requireConfirm = false,
  confirmOptions = {},
  onSuccess,
  onError,
  showSuccessToast = true,
  showErrorToast = true,
  navigate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const lastArgsRef = useRef(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const execute = useCallback(async (...args) => {
    lastArgsRef.current = args;

    // 二次確認
    if (requireConfirm) {
      const confirmed = await confirmDialog({
        message: confirmOptions.message || '確定要執行此操作嗎？此操作不可復原。',
        confirmText: confirmOptions.confirmText || '確定執行',
        danger: confirmOptions.danger !== false,
      });
      if (!confirmed) return { cancelled: true };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(...args);
      setLastResult(result);
      
      if (showSuccessToast && successMessage) {
        toast.success(successMessage, { duration: 3000 });
      }
      
      onSuccess?.(result, ...args);
      return { success: true, data: result };
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, errorPrefix);
      setError(friendlyError);
      
      if (showErrorToast) {
        toast.error(friendlyError.message, { duration: 5000 });
      }
      
      onError?.(err, ...args);
      return { success: false, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [apiCall, successMessage, errorPrefix, requireConfirm, confirmOptions, onSuccess, onError, showSuccessToast, showErrorToast]);

  const retry = useCallback(() => {
    if (lastArgsRef.current) {
      return execute(...lastArgsRef.current);
    }
  }, [execute]);

  // 處理錯誤動作
  const handleErrorAction = useCallback((friendlyError) => {
    const handler = createErrorActionHandler(navigateRef.current);
    handler({
      actionType: friendlyError.actionType,
      actionTarget: friendlyError.actionTarget,
      onRetry: retry,
    });
  }, [retry]);

  const ctx = {
    execute,
    loading,
    error,
    lastResult,
    retry,
    handleErrorAction,
    isSuccess: !loading && !error && lastResult,
  };

  if (renderTrigger) {
    return renderTrigger(ctx);
  }

  if (typeof children === 'function') {
    return children(ctx);
  }

  return children;
}

/**
 * 高風險操作專用元件（刪除、取消、對帳等）
 * 內建二次確認 + 結果摘要
 */
export function DestructiveOperationFeedback({
  apiCall,
  itemName = '項目',
  children, // render prop: ({ execute, loading, confirmOpen, confirmMessage, onConfirm, onCancel }) => ReactNode
  onSuccess,
  onError,
  showResultSummary = true,
  navigate,
}) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const pendingArgsRef = useRef(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const openConfirm = useCallback((...args) => {
    pendingArgsRef.current = args;
    setConfirmOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    pendingArgsRef.current = null;
  }, []);

  const executeConfirmed = useCallback(async () => {
    const args = pendingArgsRef.current;
    if (!args) return;

    setConfirmOpen(false);
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(...args);
      setLastResult(result);
      toast.success(`${itemName} 已${confirmOptions?.actionText || '刪除'}`, { duration: 3000 });
      onSuccess?.(result, ...args);
      return { success: true, data: result };
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, `${confirmOptions?.actionText || '刪除'}${itemName}失敗：`);
      setError(friendlyError);
      toast.error(friendlyError.message, { duration: 5000 });
      onError?.(err, ...args);
      return { success: false, error: friendlyError };
    } finally {
      setLoading(false);
      pendingArgsRef.current = null;
    }
  }, [apiCall, itemName, onSuccess, onError]);

  // 結果摘要
  const resultSummary = lastResult && showResultSummary ? (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-2xl animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 flex-shrink-0 mt-0.5 bg-green-500/20 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{itemName} 已{confirmOptions?.actionText || '刪除'}</p>
          <p className="text-xs text-slate-400 mt-1">操作已完成，資料已更新</p>
        </div>
        <button onClick={() => setLastResult(null)} className="text-slate-400 hover:text-slate-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  ) : null;

  // 自動清除結果摘要
  useEffect(() => {
    if (lastResult) {
      const timer = setTimeout(() => setLastResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastResult]);

  const ctx = {
    execute: openConfirm,
    loading,
    confirmOpen,
    confirmMessage: confirmOptions?.message || `確定要${confirmOptions?.actionText || '刪除'}此 ${itemName} 嗎？此操作不可復原。`,
    confirmText: confirmOptions?.confirmText || `確定${confirmOptions?.actionText || '刪除'}`,
    onConfirm: executeConfirmed,
    onCancel: closeConfirm,
    error,
    lastResult,
  };

  return (
    <>
      {typeof children === 'function' ? children(ctx) : children}
      {resultSummary}
    </>
  );
}

/**
 * 表單提交專用元件（含驗證錯誤顯示）
 */
export function FormSubmitFeedback({
  apiCall,
  children, // render prop: ({ execute, loading, errors, setFieldError, clearErrors }) => ReactNode
  successMessage = '儲存成功',
  errorPrefix = '儲存失敗：',
  validate,
  onSuccess,
  onError,
  navigate,
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [lastResult, setLastResult] = useState(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const setFieldError = useCallback((field, message) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const execute = useCallback(async (formData) => {
    // 前端驗證
    if (validate) {
      const validationErrors = validate(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast.error('請檢查表單填寫', { duration: 3000 });
        return { success: false, errors: validationErrors };
      }
    }
    clearErrors();

    setLoading(true);
    try {
      const result = await apiCall(formData);
      setLastResult(result);
      toast.success(successMessage, { duration: 3000 });
      onSuccess?.(result);
      return { success: true, data: result };
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, errorPrefix);
      setError(friendlyError);
      
      // 後端驗證錯誤
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      
      toast.error(friendlyError.message, { duration: 5000 });
      onError?.(err);
      return { success: false, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [apiCall, successMessage, errorPrefix, validate, onSuccess, onError, clearErrors]);

  const retry = useCallback(() => {
    // 表單重試需要外部管理 formData
  }, []);

  const ctx = {
    execute,
    loading,
    errors,
    setFieldError,
    clearErrors,
    lastResult,
    retry,
  };

  return typeof children === 'function' ? children(ctx) : children;
}

/**
 * 批次操作回饋（如批次刪除、批次匯入）
 */
export function BatchOperationFeedback({
  apiCall,
  items, // 要操作的項目陣列
  itemName = '項目',
  children, // render prop: ({ execute, loading, progress, completed, failed, results }) => ReactNode
  onComplete,
  navigate,
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: items.length });
  const [completed, setCompleted] = useState([]);
  const [failed, setFailed] = useState([]);
  const [results, setResults] = useState([]);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const execute = useCallback(async (options = {}) => {
    const { onItemSuccess, onItemError } = options;
    setLoading(true);
    setProgress({ current: 0, total: items.length });
    setCompleted([]);
    setFailed([]);
    setResults([]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress({ current: i + 1, total: items.length });
      
      try {
        const result = await apiCall(item);
        setCompleted(prev => [...prev, item]);
        setResults(prev => [...prev, { item, success: true, data: result }]);
        onItemSuccess?.(item, result);
      } catch (err) {
        const friendlyError = getUserFriendlyError(err, `${itemName}處理失敗：`);
        setFailed(prev => [...prev, { item, error: friendlyError }]);
        setResults(prev => [...prev, { item, success: false, error: friendlyError }]);
        onItemError?.(item, err);
      }
    }

    setLoading(false);
    toast.success(`批次操作完成：成功 ${completed.length}，失敗 ${failed.length}`, { duration: 4000 });
    onComplete?.({ completed, failed, results });
    
    return { completed, failed, results };
  }, [apiCall, items, itemName, onComplete]);

  const ctx = {
    execute,
    loading,
    progress,
    completed,
    failed,
    results,
    successCount: completed.length,
    failCount: failed.length,
    totalCount: items.length,
  };

  return typeof children === 'function' ? children(ctx) : children;
}

// CSS 動畫樣式（建議加到全域 CSS）
export const asyncOperationStyles = `
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slide-up 0.3s ease-out; }
`;