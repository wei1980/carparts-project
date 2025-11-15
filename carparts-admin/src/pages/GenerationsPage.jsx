import { useState } from "react";
import axios from "axios";

function GenerationsPage() {
  const [generations, setGenerations] = useState([]);
  const [modelId, setModelId] = useState("");
  const [newGen, setNewGen] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const fetchGenerations = async () => {
    if (!modelId) return;
    const res = await axios.get("http://localhost:3000/generations?modelId=" + modelId);
    setGenerations(res.data);
  };

  const addGeneration = async () => {
    if (!newGen.trim() || !modelId) return;
    await axios.post("http://localhost:3000/generations", {
      name: newGen,
      model_id: parseInt(modelId),
      year_from: 2000,
      year_to: 2025,
    });
    setNewGen("");
    fetchGenerations();
  };

  const startEdit = (gen) => {
    setEditId(gen.id);
    setEditName(gen.name);
  };

  const saveEdit = async () => {
    await axios.put(`http://localhost:3000/generations/${editId}`, {
      name: editName,
    });
    setEditId(null);
    setEditName("");
    fetchGenerations();
  };

  const deleteGeneration = async (id) => {
    if (!window.confirm("確定要刪除嗎？")) return;
    await axios.delete(`http://localhost:3000/generations/${id}`);
    fetchGenerations();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>世代管理 (Generations)</h2>
      <input
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        placeholder="車系 ID"
      />
      <button onClick={fetchGenerations}>查詢</button>
      <br /><br />
      <input
        value={newGen}
        onChange={(e) => setNewGen(e.target.value)}
        placeholder="輸入世代名稱"
      />
      <button onClick={addGeneration}>新增</button>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>名稱</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {generations.map((g) => (
            <tr key={g.id}>
              <td>{g.id}</td>
              <td>
                {editId === g.id ? (
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                ) : (
                  g.name
                )}
              </td>
              <td>
                {editId === g.id ? (
                  <>
                    <button onClick={saveEdit}>💾 儲存</button>
                    <button onClick={() => setEditId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(g)}>✏️ 編輯</button>
                    <button onClick={() => deleteGeneration(g.id)}>🗑️ 刪除</button>
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

export default GenerationsPage;
