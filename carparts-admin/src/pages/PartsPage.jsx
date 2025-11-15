import { useEffect, useState } from "react";
import axios from "axios";

function PartsPage() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  // 假設車型 ID 先存在 localStorage
  const variantId = localStorage.getItem("selectedVariantId");

  useEffect(() => {
    if (variantId) {
      axios
        .get(`http://localhost:3000/parts?variantId=${variantId}`)
        .then((res) => {
          setParts(res.data);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [variantId]);

  const addToCart = (part) => {
    setCart([...cart, part]);
    alert(`${part.name} 已加入購物車！`);
  };

  if (loading) return <p>載入中...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>🚗 零件列表</h2>
      {!variantId && <p>⚠️ 請先回首頁選擇車型</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {parts.map((part) => (
          <div
            key={part.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "15px",
              textAlign: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={part.image_url || "https://via.placeholder.com/200x150"}
              alt={part.name}
              style={{ width: "100%", borderRadius: "8px" }}
            />
            <h3 style={{ margin: "10px 0" }}>{part.name}</h3>
            <p style={{ color: "#666", fontSize: "14px" }}>
              {part.description || "尚無描述"}
            </p>
            <p style={{ fontWeight: "bold", fontSize: "18px", color: "#c00" }}>
              NT$ {part.price || "0"}
            </p>
            <button
              onClick={() => addToCart(part)}
              style={{
                background: "#c00",
                color: "#fff",
                padding: "8px 16px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              🛒 加入購物車
            </button>
          </div>
        ))}
      </div>

      {/* 假設右側簡單顯示購物車 */}
      {cart.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h2>🛒 購物車</h2>
          <ul>
            {cart.map((c, idx) => (
              <li key={idx}>
                {c.name} - NT$ {c.price}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PartsPage;
