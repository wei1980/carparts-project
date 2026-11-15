// src/components/ConfirmDialog.jsx — Promise 化確認對話框（共用 ui Dialog）
// 規範：改用 ui/Dialog（open + onClose + title + children + footer；ESC／遮罩關閉、dialog 語意）
// 用法：const ok = await confirmDialog({ message, confirmText, cancelText, danger, title });
// 不自動關閉；確認=true / 取消或關閉=false；必定 settle（卸載前未結束時 resolve(false)）。
import { useEffect, useState } from 'react';
import Dialog from './ui/Dialog';
import Button from './ui/Button';

let pendingRequest = null;
// pub/sub：confirmDialog 可能是「Host 掛載之後」才被呼叫（使用者點按鈕），
// 所以不能只靠 Host 掛載時讀一次 module 變數——那樣 Promise 永遠不會 resolve。
const listeners = new Set();

function notify() {
  for (const l of listeners) l(pendingRequest);
}

export function confirmDialog({ message, confirmText = '確定', cancelText = '取消', danger = true, title = '確認操作' }) {
  return new Promise((resolve) => {
    pendingRequest = { message, confirmText, cancelText, danger, title, resolve };
    notify();
  });
}

export function ConfirmDialogHost() {
  const [req, setReq] = useState(pendingRequest);

  useEffect(() => {
    const sync = (r) => setReq(r);
    listeners.add(sync);
    sync(pendingRequest); // 掛載時若已有待處理請求
    return () => {
      listeners.delete(sync);
      // Host 卸載時收掉未處理的請求，避免呼叫端永久 pending
      if (pendingRequest) {
        const r = pendingRequest;
        pendingRequest = null;
        r.resolve(false);
      }
    };
  }, []);

  const settle = (value) => {
    const r = pendingRequest;
    pendingRequest = null;
    setReq(null);
    notify();
    if (r) r.resolve(value);
  };

  if (!req) return null;
  const { message, confirmText, cancelText, danger, title } = req;

  return (
    <Dialog
      open
      onClose={() => settle(false)}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => settle(false)}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={() => settle(true)}>{confirmText}</Button>
        </div>
      }
    >
      <p className="text-sm text-surface-200">{message}</p>
    </Dialog>
  );
}
