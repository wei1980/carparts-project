// src/components/ConfirmDialog.jsx — Promise 化確認對話框（共用 ui Dialog）
// 規範：改用 ui/Dialog（open + onClose + title + children + footer；ESC／遮罩關閉、dialog 語意）
// 用法：const ok = await confirmDialog({ message, confirmText, cancelText, danger, title });
// 不自動關閉；確認=true / 取消或關閉=false；必定 settle（卸載前未結束時 resolve(false)）。
import { useEffect, useRef, useState } from 'react';
import Dialog from './ui/Dialog';
import Button from './ui/Button';

let pendingRequest = null;

export function confirmDialog({ message, confirmText = '確定', cancelText = '取消', danger = true, title = '確認操作' }) {
  return new Promise((resolve) => {
    pendingRequest = { message, confirmText, cancelText, danger, title, resolve };
  });
}

export function ConfirmDialogHost() {
  const [req, setReq] = useState(null);
  const settledRef = useRef(false);
  const reqRef = useRef(null);

  useEffect(() => {
    if (pendingRequest) {
      reqRef.current = pendingRequest;
      setReq(pendingRequest);
      pendingRequest = null;
    }
  }, []);

  const settle = (value) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const r = reqRef.current;
    setReq(null);
    if (r) {
      r.resolve(value);
      reqRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      const r = reqRef.current;
      if (r && !settledRef.current) {
        settledRef.current = true;
        setReq(null);
        r.resolve(false);
      }
    };
  }, []);

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
