// src/components/PartImage.jsx — 商品圖統一元件
// 目的：任何 image_url 失效（404／壞檔）時都給一致的深色佔位塊，
//      不再出現瀏覽器破圖圖示或整片白塊。
import { useEffect, useState } from 'react';

export default function PartImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  eager = false,
  label = '圖片準備中',
  onClick,
}) {
  const [broken, setBroken] = useState(!src);

  useEffect(() => {
    setBroken(!src);
  }, [src]);

  if (broken) {
    return (
      <div
        role="img"
        aria-label={alt || label}
        className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[#1a232e] ${className}`}
        onClick={onClick}
      >
        <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
        </svg>
        <span className="px-1 text-center text-[10px] leading-tight text-slate-500">{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onClick={onClick}
      onError={() => setBroken(true)}
      className={`h-full w-full object-contain ${className} ${imgClassName}`}
    />
  );
}
