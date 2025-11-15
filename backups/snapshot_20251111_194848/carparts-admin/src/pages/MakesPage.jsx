import { useEffect, useState } from "react";
import axios from "axios";

function MakesPage() {
  const [makes, setMakes] = useState([]);
  const [newMake, setNewMake] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const fetchMakes = async () => {
    const res = await axios.get("http://localhost:3000/makes");
    setMakes(res.data);
  };

  const addMake = async () => {
    if (!newMake.trim()) return;
    await axios.post("http://localhost:3000/makes", { name: newMake });
    setNewMake("");
    fetchMakes();
  };

  const startEdit = (make) => {
    setEditId(make.id);
    setEditName(make.name);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await axios.put(`http://localhost:3000/makes/${editId}`, { name: editName });
    setEditId(null);
    setEditName("");
    fetchMakes();
  };

  const deleteMake = async (id) => {
    if (!window.confirm("確定要刪除嗎？")) return;
    await axios.delete(`http://localhost:3000/makes/${id}`);
    fetchMakes();
  };

  useEffect(() => {
    fetchMakes();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>品牌管理 (Makes)</h2>

      {/* 新增品牌 */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          value={newMake}
          onChange={(e) => setNewMake(e.target.value)}
          placeholder="輸入品牌名稱"
        />
        <button onClick={addMake}>新增</button>
      </div>

      {/* 品牌清單 */}
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>品牌名稱</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {makes.map((make) => (
            <tr key={make.id}>
              <td>{make.id}</td>
              <td>
                {editId === make.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  make.name
                )}
              </td>
              <td>
                {editId === make.id ? (
                  <>
                    <button onClick={saveEdit}>💾 儲存</button>
                    <button onClick={() => setEditId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(make)}>✏️ 編輯</button>
                    <button onClick={() => deleteMake(make.id)}>🗑️ 刪除</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MakesPage;
