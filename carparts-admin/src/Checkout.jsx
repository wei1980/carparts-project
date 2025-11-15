import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function readCart() {
  try {
    const raw = localStorage.getItem("cart.v1");
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.items)) return { items: [] };
    return data;
  } catch {
    return { items: [] };
  }
}
function writeCart(next) {
  localStorage.setItem("cart.v1", JSON.stringify(next));
}
const currency = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;

export default function Checkout() {
  const nav = useNavigate();
  const [cart, setCart] = useState(readCart());
  const items = cart.items || [];

  const [form, setForm] = useState({
    company_name: "",
    buyer_name: "",
    phone: "",
    email: "",
    tax_id: "",
    shipping_address: "",
    note: "",
  });
  const [shippingFee, setShippingFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price_twd || 0), 0),
    [items]
  );
  const total = subtotal + Number(shippingFee || 0);

  async function submitOrder() {
    if (!items.length) return alert("購物車是空的");
    if (!form.buyer_name?.trim()) return alert("請輸入聯絡人");
    if (!form.phone?.trim()) return alert("請輸入電話");
    try {
      setSubmitting(true);
      const r = await fetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          buyer: form,
          shipping_twd: Number(shippingFee || 0),
          items: items.map((it) => ({
            sku: it.sku,
            name: it.name,
            qty: Number(it.qty || 1),
            unit_price_twd: Number(it.unit_price_twd || 0),
            msrp_twd: it.msrp_twd ?? null,
            wholesale_twd: it.wholesale_twd ?? null,
            image_url: it.image_url || null,
            part_id: it.part_id ?? null,
          })),
        }),
      });
      const ct = r.headers.get("content-type") || "";
      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
      if (!ct.includes("application/json")) throw new Error("回傳不是 JSON：" + ct);
      const json = JSON.parse(txt);
      setResult(json);
      writeCart({ items: [] });
      setCart({ items: [] });
    } catch (e) {
      alert("下單失敗：" + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <h1 className="text-xl font-semibold mb-4">訂單建立完成</h1>
        <div className="border rounded p-4 bg-white">
          <div className="text-lg">
            訂單編號：<span className="font-mono font-bold">{result.order_no}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">我們會盡快與您聯繫確認。</div>
          <button className="mt-4 border rounded px-4 py-2 hover:bg-gray-50" onClick={() => nav("/shop")}>
            返回商店
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">結帳</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <section className="border rounded bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="公司名稱（選填）"><Input value={form.company_name} onChange={(v)=>setForm(s=>({...s, company_name:v}))} /></Field>
            <Field label="統一編號（選填）"><Input value={form.tax_id} onChange={(v)=>setForm(s=>({...s, tax_id:v}))} /></Field>
            <Field label="聯絡人"><Input value={form.buyer_name} onChange={(v)=>setForm(s=>({...s, buyer_name:v}))} /></Field>
            <Field label="電話"><Input value={form.phone} onChange={(v)=>setForm(s=>({...s, phone:v}))} /></Field>
            <Field label="Email（選填）"><Input value={form.email} onChange={(v)=>setForm(s=>({...s, email:v}))} /></Field>
            <Field label="收貨地址（選填）"><Input value={form.shipping_address} onChange={(v)=>setForm(s=>({...s, shipping_address:v}))} /></Field>
            <div className="md:col-span-2">
              <Field label="備註（選填）">
                <textarea className="w-full border rounded px-2 py-1 min-h-[80px]" value={form.note}
                  onChange={(e)=>setForm(s=>({...s, note:e.target.value}))}/>
              </Field>
            </div>
          </div>
        </section>

        <aside className="border rounded bg-white p-4">
          <div className="font-medium mb-2">訂單摘要</div>
          {!items.length ? (
            <div className="text-sm text-gray-500">購物車是空的</div>
          ) : (
            <ul className="divide-y">
              {items.map((it, idx) => (
                <li key={idx} className="py-2 flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-50 flex items-center justify-center overflow-hidden rounded">
                    {it.image_url ? <img src={it.image_url} alt={it.name} className="max-w-full max-h-full object-contain"/> : <span className="text-xs text-gray-400">No Image</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium line-clamp-2">{it.name}</div>
                    <div className="text-xs text-gray-500">數量 x {it.qty}</div>
                  </div>
                  <div className="text-sm whitespace-nowrap">{currency(Number(it.unit_price_twd) * Number(it.qty))}</div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t mt-3 pt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>小計</span><span>{currency(subtotal)}</span></div>
            <div className="flex items-center justify-between">
              <span>運費</span>
              <input type="number" value={shippingFee} onChange={(e)=>setShippingFee(Number(e.target.value||0))}
                className="w-28 border rounded px-2 py-1 text-right"/>
            </div>
            <div className="flex justify-between text-base font-semibold"><span>總計</span><span>{currency(total)}</span></div>
            <button className="w-full mt-2 border rounded px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
              disabled={!items.length || submitting} onClick={submitOrder}>
              {submitting ? "送出中…" : "提交訂單"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (<label className="block"><div className="text-xs text-gray-500 mb-1">{label}</div>{children}</label>);
}
function Input({ value, onChange, ...rest }) {
  return (<input className="w-full border rounded px-2 py-1" value={value || ""} onChange={(e)=>onChange?.(e.target.value)} {...rest} />);
}
