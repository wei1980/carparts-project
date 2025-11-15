import { useState, useEffect } from "react";
import axios from "axios";

function VariantsPage() {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGen, setSelectedGen] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);

  // 載入品牌
  useEffect(() => {
    axios.get("http://localhost:3000/makes").then((res) => setMakes(res.data));
  }, []);

  // 選品牌 → 載入車系
  const handleMakeChange = async (makeId) => {
    setSelectedMake(makeId);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedGen("");
    setSelectedVariant(null);
    if (makeId) {
      const res = await axios.get(`http://localhost:3000/models?makeId=${makeId}`);
      setModels(res.data);
      setGenerations([]);
      setVariants([]);
    }
  };

  // 選車系 → 載入世代
  const handleModelChange = async (modelId) => {
    setSelectedModel(modelId);
    setSelectedYear("");
    setSelectedGen("");
    setSelectedVariant(null);
    if (modelId) {
      const res = await axios.get(`http://localhost:3000/generations?modelId=${modelId}`);
      setGenerations(res.data);
      setVariants([]);
    }
  };

  // 選年份 → 過濾世代並載入車型
  const handleYearChange = async (year) => {
    setSelectedYear(year);
    setSelectedVariant(null);
    if (year && generations.length > 0) {
      const gen = generations.find(
        (g) => parseInt(year) >= g.year_from && parseInt(year) <= g.year_to
      );
      if (gen) {
        setSelectedGen(gen.id);
        const res = await axios.get(
          `http://localhost:3000/variants?generationId=${gen.id}`
        );
        setVariants(res.data);

        // ✅ 自動選擇唯一車型
        if (res.data.length === 1) {
          setSelectedVariant(res.data[0]);
        }
      }
    }
  };

  // 選擇車型 (如果多個才會出現)
  const handleVariantChange = (id) => {
    const v = variants.find((item) => item.id === parseInt(id));
    setSelectedVariant(v);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🔽 車型選擇</h2>

      {/* 製造商 */}
      <div>
        <label>製造商 (Make)：</label>
        <select value={selectedMake} onChange={(e) => handleMakeChange(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* 車系 */}
      <div>
        <label>車系 (Model)：</label>
        <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {models.map((mo) => (
            <option key={mo.id} value={mo.id}>
              {mo.name}
            </option>
          ))}
        </select>
      </div>

      {/* 年份 */}
      <div>
        <label>年份 (Year)：</label>
        <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {generations.flatMap((g) =>
            Array.from(
              { length: g.year_to - g.year_from + 1 },
              (_, i) => g.year_from + i
            ).map((y) => (
              <option key={`${g.id}-${y}`} value={y}>
                {y}
              </option>
            ))
          )}
        </select>
      </div>

      {/* 車型 / 排氣量 */}
      {variants.length > 1 && (
        <div>
          <label>車型 / 排氣量：</label>
          <select
            value={selectedVariant ? selectedVariant.id : ""}
            onChange={(e) => handleVariantChange(e.target.value)}
          >
            <option value="">-- 請選擇 --</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.variant_name} ({v.displacement_cc || "N/A"} cc)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 顯示詳細車型資料 */}
      {selectedVariant && (
        <div style={{ marginTop: "20px" }}>
          <h3>📋 已選擇車型：</h3>
          <ul>
            <li>車型名稱：{selectedVariant.variant_name}</li>
            <li>年份：{selectedVariant.year_from} - {selectedVariant.year_to}</li>
            <li>引擎代號：{selectedVariant.engine_code}</li>
            <li>排氣量：{selectedVariant.displacement_cc || "N/A"} cc</li>
            <li>馬力：{selectedVariant.power_ps || "N/A"} ps</li>
            <li>燃油：{selectedVariant.fuel_type || "N/A"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default VariantsPage;
