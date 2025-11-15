import { useEffect, useMemo, useState } from "react";

/* -------------------- 通用 JSON fetch -------------------- */
async function jfetch(url, opts) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  const ct = r.headers.get("content-type") || "";
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  if (!ct.includes("application/json")) throw new Error(`${url} 回傳 ${ct}`);
  return t ? JSON.parse(t) : null;
}
const jget = (u) => jfetch(u);
const jpost = (u, b) => jfetch(u, { method: "POST", body: JSON.stringify(b) });
const jput = (u, b) => jfetch(u, { method: "PUT", body: JSON.stringify(b) });
const jdel = (u) => jfetch(u, { method: "DELETE" });

/* -------------------- 小元件 -------------------- */
function Field({ label, children }) {
  return (
    <label className="block mb-2">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
function Txt({ value, onChange, ...rest }) {
  return (
    <input
      type="text"
      className="w-full border rounded px-2 py-1"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    />
  );
}
function Num({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      className="w-full border rounded px-2 py-1"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value === "" ? "" : Number(e.target.value))}
      {...rest}
    />
  );
}
function Sel({ value, onChange, children, ...rest }) {
  return (
    <select
      className="w-full border rounded px-2 py-1"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    >
      {children}
    </select>
  );
}

/* =========================================================
   AdminVehicles with CSV Import
   ========================================================= */
export default function AdminVehicles() {
  // 左 → 右：Make → Model → Generation → Variant
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [gens, setGens] = useState([]);
  const [vars, setVars] = useState([]);

  const [selMakeId, setSelMakeId] = useState("");
  const [selModelId, setSelModelId] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 新增 / 編輯表單
  const [makeForm, setMakeForm] = useState({ name: "" });
  const [modelForm, setModelForm] = useState({ name: "" });
  const [genForm, setGenForm] = useState({ name: "", year_from: "", year_to: "" });
  const [varForm, setVarForm] = useState({
    name: "", engine_code: "", year_from: "", year_to: "", fuel_type: "", generation_id: ""
  });

  // ===== CSV 匯入狀態 =====
  const [csvRows, setCsvRows] = useState([]);       // 解析後列
  const [csvErrors, setCsvErrors] = useState([]);   // 解析錯誤
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);   // 每列結果

  const selectedMake = useMemo(
    () => makes.find(m => String(m.id) === String(selMakeId)),
    [makes, selMakeId]
  );
  const selectedModel = useMemo(
    () => models.find(m => String(m.id) === String(selModelId)),
    [models, selModelId]
  );

  /* ---------------- 初始載入 makes ---------------- */
  useEffect(() => {
    (async () => {
      setErr("");
      try {
        setLoading(true);
        const mks = await jget("/makes");
        setMakes(Array.isArray(mks) ? mks : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally { setLoading(false); }
    })();
  }, []);

  /* --------- 選 make → 讀 models --------- */
  useEffect(() => {
    (async () => {
      setModels([]); setGens([]); setVars([]); setSelModelId(""); setYearFilter("");
      if (!selMakeId) return;
      try {
        setLoading(true);
        const ms = await jget(`/models?makeId=${selMakeId}`);
        setModels(Array.isArray(ms) ? ms : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally { setLoading(false); }
    })();
  }, [selMakeId]);

  /* --------- 選 model → 讀 gens + variants --------- */
  useEffect(() => {
    (async () => {
      setGens([]); setVars([]); setYearFilter("");
      if (!selModelId) return;
      try {
        setLoading(true);
        const [gs, vs] = await Promise.all([
          jget(`/generations?modelId=${selModelId}`),
          jget(`/variants?modelId=${selModelId}`),
        ]);
        setGens(Array.isArray(gs) ? gs : []);
        setVars(Array.isArray(vs) ? vs : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally { setLoading(false); }
    })();
  }, [selModelId]);

  /* --------- 年份過濾變體 --------- */
  const filteredVars = useMemo(() => {
    if (!yearFilter) return vars;
    const y = Number(yearFilter);
    return vars.filter(v => {
      const from = v.year_from ?? -Infinity;
      const to = v.year_to ?? Infinity;
      return (from <= y) && (to >= y);
    });
  }, [vars, yearFilter]);

  /* ---------------- CRUD: Makes ---------------- */
  async function createMake() {
    if (!makeForm.name?.trim()) return alert("請輸入廠牌名稱");
    const r = await jpost("/makes", { name: makeForm.name.trim() });
    setMakes(m => [...m, r]);
    setMakeForm({ name: "" });
  }
  async function updateMake(mk) {
    const name = prompt("新名稱：", mk.name);
    if (name == null) return;
    const r = await jput(`/makes/${mk.id}`, { name });
    setMakes(m => m.map(x => x.id === mk.id ? r : x));
  }
  async function deleteMake(mk) {
    if (!confirm(`刪除廠牌「${mk.name}」？`)) return;
    await jdel(`/makes/${mk.id}`);
    setMakes(m => m.filter(x => x.id !== mk.id));
    if (String(selMakeId) === String(mk.id)) setSelMakeId("");
  }

  /* ---------------- CRUD: Models ---------------- */
  async function createModel() {
    if (!selMakeId) return alert("請先選擇廠牌");
    if (!modelForm.name?.trim()) return alert("請輸入車系名稱");
    const r = await jpost("/models", { name: modelForm.name.trim(), make_id: Number(selMakeId) });
    setModels(m => [...m, r]);
    setModelForm({ name: "" });
  }
  async function updateModel(md) {
    const name = prompt("新名稱：", md.name);
    if (name == null) return;
    const r = await jput(`/models/${md.id}`, { name });
    setModels(m => m.map(x => x.id === md.id ? r : x));
  }
  async function deleteModel(md) {
    if (!confirm(`刪除車系「${md.name}」？`)) return;
    await jdel(`/models/${md.id}`);
    setModels(m => m.filter(x => x.id !== md.id));
    if (String(selModelId) === String(md.id)) setSelModelId("");
  }

  /* ------------- CRUD: Generations ------------- */
  async function createGen() {
    if (!selModelId) return alert("請先選擇車系");
    if (!genForm.name?.trim()) return alert("請輸入世代名稱");
    const body = {
      model_id: Number(selModelId),
      name: genForm.name.trim(),
      year_from: genForm.year_from === "" ? null : Number(genForm.year_from),
      year_to: genForm.year_to === "" ? null : Number(genForm.year_to),
    };
    const r = await jpost("/generations", body);
    setGens(g => [...g, r]);
    setGenForm({ name: "", year_from: "", year_to: "" });
  }
  async function updateGen(g) {
    const name = prompt("世代名稱：", g.name ?? "");
    if (name == null) return;
    const year_from = prompt("起始年（可留空）：", g.year_from ?? "");
    if (year_from === null) return;
    const year_to = prompt("結束年（可留空）：", g.year_to ?? "");
    if (year_to === null) return;
    const body = {
      name,
      year_from: year_from === "" ? null : Number(year_from),
      year_to: year_to === "" ? null : Number(year_to),
    };
    const r = await jput(`/generations/${g.id}`, body);
    setGens(list => list.map(x => x.id === g.id ? r : x));
  }
  async function deleteGen(g) {
    if (!confirm(`刪除世代「${g.name ?? "#"+g.id}」？`)) return;
    await jdel(`/generations/${g.id}`);
    setGens(list => list.filter(x => x.id !== g.id));
  }

  /* ------------- CRUD: Variants ------------- */
  async function createVar() {
    if (!selModelId) return alert("請先選擇車系");
    const body = {
      model_id: Number(selModelId),
      generation_id: varForm.generation_id ? Number(varForm.generation_id) : null,
      name: varForm.name?.trim() || null,
      engine_code: varForm.engine_code?.trim() || null,
      year_from: varForm.year_from === "" ? null : Number(varForm.year_from),
      year_to: varForm.year_to === "" ? null : Number(varForm.year_to),
      fuel_type: varForm.fuel_type || null
    };
    const r = await jpost("/variants", body);
    setVars(v => [...v, r]);
    setVarForm({ name:"", engine_code:"", year_from:"", year_to:"", fuel_type:"", generation_id:"" });
  }
  async function updateVar(vr) {
    const name = prompt("變體名稱（顯示文字，可留空）：", vr.name ?? "");
    if (name === null) return;
    const engine_code = prompt("引擎代號（可留空）：", vr.engine_code ?? "");
    if (engine_code === null) return;
    const year_from = prompt("起始年（可留空）：", vr.year_from ?? "");
    if (year_from === null) return;
    const year_to = prompt("結束年（可留空）：", vr.year_to ?? "");
    if (year_to === null) return;
    const fuel_type = prompt("燃料類型（gasoline/diesel/… 可留空）：", vr.fuel_type ?? "");
    if (fuel_type === null) return;

    const body = {
      name: name || null,
      engine_code: engine_code || null,
      year_from: year_from === "" ? null : Number(year_from),
      year_to: year_to === "" ? null : Number(year_to),
      fuel_type: fuel_type || null,
    };
    const r = await jput(`/variants/${vr.id}`, body);
    setVars(list => list.map(x => x.id === vr.id ? r : x));
  }
  async function deleteVar(vr) {
    if (!confirm("刪除此引擎/變體？")) return;
    await jdel(`/variants/${vr.id}`);
    setVars(list => list.filter(x => x.id !== vr.id));
  }

  /* ---------------- CSV：簡易解析器 ----------------
     支援含標題列；逗號 , 分隔；雙引號包覆；忽略空行。
     欄位：
      make,model,generation,gen_year_from,gen_year_to,
      variant_name,engine_code,year_from,year_to,fuel_type
  -------------------------------------------------- */
  function parseCSV(text) {
    const rows = [];
    const errs = [];
    // 簡易 CSV：split 行，逐行解析
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) return { rows, errs };

    // 取標題
    const header = splitCSVLine(lines[0]);
    const idx = (name) => header.findIndex(h => (h || "").trim().toLowerCase() === name);

    const iMake = idx("make");
    const iModel = idx("model");
    const iGen = idx("generation");
    const iGF = idx("gen_year_from");
    const iGT = idx("gen_year_to");
    const iVn = idx("variant_name");
    const iEc = idx("engine_code");
    const iYF = idx("year_from");
    const iYT = idx("year_to");
    const iFt = idx("fuel_type");

    for (let li = 1; li < lines.length; li++) {
      const cols = splitCSVLine(lines[li]);
      try {
        const get = (i) => i >= 0 ? (cols[i] ?? "").trim() : "";
        const r = {
          make: get(iMake),
          model: get(iModel),
          generation: get(iGen),
          gen_year_from: toNumOrEmpty(get(iGF)),
          gen_year_to: toNumOrEmpty(get(iGT)),
          variant_name: get(iVn),
          engine_code: get(iEc),
          year_from: toNumOrEmpty(get(iYF)),
          year_to: toNumOrEmpty(get(iYT)),
          fuel_type: get(iFt),
          __line: li + 1
        };
        // 至少要 make+model 有值
        if (!r.make || !r.model) throw new Error("缺少 make 或 model");
        rows.push(r);
      } catch (e) {
        errs.push(`第 ${li + 1} 行：${e.message || e}`);
      }
    }
    return { rows, errs };
  }

  function splitCSVLine(line) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } // 轉義
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }
  function toNumOrEmpty(s) {
    if (s === "" || s == null) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  }

  /* ---------------- 匯入：確保/建立各層 ---------------- */
  function findByNameCase(list, name) {
    const key = (name || "").trim().toLowerCase();
    return list.find(x => (x.name || "").trim().toLowerCase() === key);
  }

  async function ensureMake(name) {
    const ex = findByNameCase(makes, name);
    if (ex) return ex;
    const created = await jpost("/makes", { name });
    setMakes(prev => [...prev, created]);
    return created;
  }

  async function ensureModel(makeId, name) {
    // 先看 state models（若不是同一個 make，要 GET 一次）
    let pool = models;
    if (!pool.length || String(selMakeId) !== String(makeId)) {
      pool = await jget(`/models?makeId=${makeId}`);
    }
    const ex = findByNameCase(pool, name);
    if (ex) return ex;
    const created = await jpost("/models", { make_id: Number(makeId), name });
    // 若是當前選擇的 make，就放進 state
    if (String(selMakeId) === String(makeId)) setModels(prev => [...prev, created]);
    return created;
  }

  async function ensureGeneration(modelId, name, yf, yt) {
    // 以名稱 + 年分比對（粗略）
    const gs = await jget(`/generations?modelId=${modelId}`);
    const ex = gs.find(g =>
      (g.name || "").trim().toLowerCase() === (name || "").trim().toLowerCase() &&
      String(g.year_from ?? "") === String(yf ?? "") &&
      String(g.year_to ?? "") === String(yt ?? "")
    );
    if (ex) return ex;
    const created = await jpost("/generations", {
      model_id: Number(modelId),
      name: name || null,
      year_from: yf === "" ? null : Number(yf),
      year_to: yt === "" ? null : Number(yt),
    });
    if (String(selModelId) === String(modelId)) setGens(prev => [...prev, created]);
    return created;
  }

  async function createVariant(modelId, generationId, vrow) {
    const body = {
      model_id: Number(modelId),
      generation_id: generationId ? Number(generationId) : null,
      name: vrow.variant_name || null,
      engine_code: vrow.engine_code || null,
      year_from: vrow.year_from === "" ? null : Number(vrow.year_from),
      year_to: vrow.year_to === "" ? null : Number(vrow.year_to),
      fuel_type: vrow.fuel_type || null
    };
    const created = await jpost("/variants", body);
    if (String(selModelId) === String(modelId)) setVars(prev => [...prev, created]);
    return created;
  }

  /* ---------------- 事件：選檔 & 解析 ---------------- */
  async function onPickCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, errs } = parseCSV(text);
    setCsvRows(rows);
    setCsvErrors(errs);
    setImportLog([]);
  }

  /* ---------------- 執行匯入 ---------------- */
  async function runImport() {
    if (!csvRows.length) return alert("沒有可匯入的資料。");
    setImporting(true);
    setImportLog([]);
    try {
      for (let i = 0; i < csvRows.length; i++) {
        const r = csvRows[i];
        const lineInfo = `第${r.__line}行`;
        try {
          // 1) Make
          const mk = await ensureMake(r.make);
          // 2) Model
          const md = await ensureModel(mk.id, r.model);
          // 3) Generation（可選）
          let gen = null;
          if (r.generation || r.gen_year_from !== "" || r.gen_year_to !== "") {
            gen = await ensureGeneration(md.id, r.generation, r.gen_year_from, r.gen_year_to);
          }
          // 4) Variant（可選；若有 variant_name/engine_code/year_from/year_to 任一）
          if (r.variant_name || r.engine_code || r.year_from !== "" || r.year_to !== "" || r.fuel_type) {
            await createVariant(md.id, gen?.id ?? null, r);
          }
          setImportLog(log => [...log, { ok: true, msg: `${lineInfo}：完成（${r.make} / ${r.model}${r.generation ? " / "+r.generation : ""}）` }]);
        } catch (e) {
          setImportLog(log => [...log, { ok: false, msg: `${lineInfo}：${e.message || e}` }]);
        }
      }
      // 重新載入當前選擇的 models/gens/vars（避免並發狀態不同步）
      if (selMakeId) {
        const ms = await jget(`/models?makeId=${selMakeId}`);
        setModels(Array.isArray(ms) ? ms : []);
      }
      if (selModelId) {
        const [gs, vs] = await Promise.all([
          jget(`/generations?modelId=${selModelId}`),
          jget(`/variants?modelId=${selModelId}`),
        ]);
        setGens(Array.isArray(gs) ? gs : []);
        setVars(Array.isArray(vs) ? vs : []);
      }
      alert("匯入完成！");
    } finally {
      setImporting(false);
    }
  }

  /* ---------------- 年份快速選 ---------------- */
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const arr = [];
    for (let y = now; y >= 1980; y--) arr.push(y);
    return arr;
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">車型管理</h1>
      {err && <div className="mb-3 p-2 border border-red-200 bg-red-50 text-red-700 text-sm whitespace-pre-wrap">{err}</div>}
      {loading && <div className="mb-2 text-sm text-gray-500">載入中…</div>}

      {/* ===== CSV 匯入區 ===== */}
      <section className="border rounded-lg p-3 bg-white mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-medium">批次匯入（CSV）</div>
          <div className="text-xs text-gray-500">
            欄位：make, model, generation, gen_year_from, gen_year_to, variant_name, engine_code, year_from, year_to, fuel_type
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input type="file" accept=".csv,text/csv" onChange={onPickCSV} />
          <button
            className="px-3 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-50"
            disabled={!csvRows.length || importing}
            onClick={runImport}
          >
            {importing ? "匯入中…" : "開始匯入"}
          </button>
        </div>

        {!!csvErrors.length && (
          <div className="mt-2 p-2 text-sm border border-amber-300 bg-amber-50 text-amber-700 whitespace-pre-wrap">
            解析警告：{csvErrors.join("\n")}
          </div>
        )}

        {!!csvRows.length && (
          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-1">預覽前 10 筆（共 {csvRows.length} 筆）：</div>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["line","make","model","generation","gen_year_from","gen_year_to","variant_name","engine_code","year_from","year_to","fuel_type"].map(h=>(
                      <th key={h} className="px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0,10).map((r, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="px-2 py-1">{r.__line}</td>
                      <td className="px-2 py-1">{r.make}</td>
                      <td className="px-2 py-1">{r.model}</td>
                      <td className="px-2 py-1">{r.generation}</td>
                      <td className="px-2 py-1">{r.gen_year_from}</td>
                      <td className="px-2 py-1">{r.gen_year_to}</td>
                      <td className="px-2 py-1">{r.variant_name}</td>
                      <td className="px-2 py-1">{r.engine_code}</td>
                      <td className="px-2 py-1">{r.year_from}</td>
                      <td className="px-2 py-1">{r.year_to}</td>
                      <td className="px-2 py-1">{r.fuel_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!!importLog.length && (
              <div className="mt-3 p-2 text-sm border rounded bg-gray-50 whitespace-pre-wrap max-h-64 overflow-auto">
                {importLog.map((l, i) => (
                  <div key={i} className={l.ok ? "text-emerald-700" : "text-red-700"}>• {l.msg}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 三欄：Makes / Models / Generations+Variants ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 左：廠牌 */}
        <section className="border rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">廠牌</h2>
            <span className="text-xs text-gray-500">{makes.length} 筆</span>
          </div>

          <div className="space-y-2">
            {makes.map(mk => (
              <div key={mk.id} className={`flex items-center gap-2 p-2 rounded border ${String(selMakeId)===String(mk.id)?'border-blue-500 bg-blue-50':''}`}>
                <button className="text-left flex-1" onClick={() => setSelMakeId(mk.id)}>{mk.name}</button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => updateMake(mk)}>改</button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => deleteMake(mk)}>刪</button>
              </div>
            ))}
            {!makes.length && <div className="text-sm text-gray-500">尚無資料</div>}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-sm font-medium mb-2">新增廠牌</div>
            <Field label="名稱"><Txt value={makeForm.name} onChange={(v)=>setMakeForm(s=>({...s, name:v}))} placeholder="e.g. Volkswagen" /></Field>
            <button className="px-3 py-1.5 border rounded hover:bg-gray-50" onClick={createMake}>新增</button>
          </div>
        </section>

        {/* 中：車系 */}
        <section className="border rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">車系 {selectedMake ? `（${selectedMake.name}）` : ""}</h2>
            <span className="text-xs text-gray-500">{models.length} 筆</span>
          </div>

          <div className="space-y-2">
            {models.map(md => (
              <div key={md.id} className={`flex items-center gap-2 p-2 rounded border ${String(selModelId)===String(md.id)?'border-blue-500 bg-blue-50':''}`}>
                <button className="text-left flex-1" onClick={() => setSelModelId(md.id)}>{md.name}</button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => updateModel(md)}>改</button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => deleteModel(md)}>刪</button>
              </div>
            ))}
            {!selMakeId && <div className="text-sm text-gray-500">先選左邊廠牌</div>}
            {selMakeId && !models.length && <div className="text-sm text-gray-500">尚無資料</div>}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-sm font-medium mb-2">新增車系</div>
            <Field label="名稱"><Txt value={modelForm.name} onChange={(v)=>setModelForm(s=>({...s, name:v}))} placeholder="e.g. Golf" /></Field>
            <button className="px-3 py-1.5 border rounded hover:bg-gray-50" onClick={createModel} disabled={!selMakeId}>新增</button>
          </div>
        </section>

        {/* 右：世代 + 變體 */}
        <section className="border rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">世代與引擎 {selectedModel ? `（${selectedModel.name}）` : ""}</h2>
          </div>

          {/* Generations */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">世代（Generations）</div>
              <span className="text-xs text-gray-500">{gens.length} 筆</span>
            </div>
            <div className="mt-2 space-y-2">
              {gens.map(g => (
                <div key={g.id} className="p-2 rounded border flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-medium">{g.name || `#${g.id}`}</div>
                    <div className="text-xs text-gray-500">年分：{g.year_from ?? "-"} ~ {g.year_to ?? "-"}</div>
                  </div>
                  <button className="text-xs px-2 py-1 border rounded" onClick={() => updateGen(g)}>改</button>
                  <button className="text-xs px-2 py-1 border rounded" onClick={() => deleteGen(g)}>刪</button>
                </div>
              ))}
              {!selModelId && <div className="text-sm text-gray-500">先選中間車系</div>}
              {selModelId && !gens.length && <div className="text-sm text-gray-500">尚無資料</div>}
            </div>

            <div className="mt-3 border-t pt-3">
              <div className="text-sm font-medium mb-2">新增世代</div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="名稱"><Txt value={genForm.name} onChange={(v)=>setGenForm(s=>({...s, name:v}))} placeholder="e.g. MK7.5" /></Field>
                <Field label="起始年"><Num value={genForm.year_from} onChange={(v)=>setGenForm(s=>({...s, year_from:v}))} placeholder="YYYY" /></Field>
                <Field label="結束年"><Num value={genForm.year_to} onChange={(v)=>setGenForm(s=>({...s, year_to:v}))} placeholder="YYYY" /></Field>
              </div>
              <button className="mt-2 px-3 py-1.5 border rounded hover:bg-gray-50" onClick={createGen} disabled={!selModelId}>新增世代</button>
            </div>
          </div>

          {/* Variants */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">引擎／變體（Variants）</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">年份過濾</span>
              <Sel value={yearFilter} onChange={setYearFilter} disabled={!selModelId}>
                <option value="">全部</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </Sel>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {filteredVars.map(v => (
              <div key={v.id} className="p-2 rounded border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {v.name || "(未命名)"} {v.engine_code ? `・${v.engine_code}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-2 py-1 border rounded" onClick={() => updateVar(v)}>改</button>
                    <button className="text-xs px-2 py-1 border rounded" onClick={() => deleteVar(v)}>刪</button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  年分：{v.year_from ?? "-"} ~ {v.year_to ?? "-"}　燃料：{v.fuel_type ?? "-"}　世代ID：{v.generation_id ?? "-"}
                </div>
              </div>
            ))}
            {!selModelId && <div className="text-sm text-gray-500">先選中間車系</div>}
            {selModelId && !filteredVars.length && <div className="text-sm text-gray-500">尚無資料</div>}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-sm font-medium mb-2">新增引擎／變體</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Field label="顯示名稱（可留空）"><Txt value={varForm.name} onChange={(v)=>setVarForm(s=>({...s, name:v}))} placeholder="e.g. GTI 2.0T" /></Field>
              <Field label="引擎代號（可留空）"><Txt value={varForm.engine_code} onChange={(v)=>setVarForm(s=>({...s, engine_code:v}))} placeholder="e.g. EA888" /></Field>
              <Field label="燃料（可留空）"><Txt value={varForm.fuel_type} onChange={(v)=>setVarForm(s=>({...s, fuel_type:v}))} placeholder="gasoline / diesel ..." /></Field>
              <Field label="起始年（可留空）"><Num value={varForm.year_from} onChange={(v)=>setVarForm(s=>({...s, year_from:v}))} placeholder="YYYY" /></Field>
              <Field label="結束年（可留空）"><Num value={varForm.year_to} onChange={(v)=>setVarForm(s=>({...s, year_to:v}))} placeholder="YYYY" /></Field>
              <Field label="世代（可留空）">
                <Sel value={varForm.generation_id} onChange={(v)=>setVarForm(s=>({...s, generation_id:v}))} disabled={!gens.length}>
                  <option value="">（不指定）</option>
                  {gens.map(g => <option key={g.id} value={g.id}>{g.name || `#${g.id}`}</option>)}
                </Sel>
              </Field>
            </div>
            <button className="mt-2 px-3 py-1.5 border rounded hover:bg-gray-50" onClick={createVar} disabled={!selModelId}>新增變體</button>
          </div>
        </section>
      </div>
    </div>
  );
}
