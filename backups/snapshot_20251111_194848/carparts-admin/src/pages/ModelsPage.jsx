import { useState } from "react";
import axios from "axios";

function ModelsPage() {
  const [models, setModels] = useState([]);
  const [makeId, setMakeId] = useState("");
  const [newModel, setNewModel] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const fetchModels = async () => {
    if (!makeId) return;
    const res = await axios.get("http://localhost:3000/models?makeId=" + makeId);
    setModels(res.data);
  };

  const addModel = async () => {
    if (!newModel.trim() || !makeId) return;
    await axios.post("http://localhost:3000/models", {
      name: newModel,
      make_id: parseInt(makeId),
    });
    setNewModel("");
    fetchModels();
  };

  const startEdit = (model) => {
    setEditId(model.id);
    setEditName(model.name);
  };

  const saveEdit = async () => {
    await axios.put(`http://localhost:3000/models/${editId}`, { name: editName });
    setEditId(null);
    setEditName("");
    fetchModels();
  };

  const deleteModel = async (id) => {
    if (!window.confirm("確定要刪除嗎？")) return;
    await axios.delete(`http://localhost:3000/models/${id}`);
    fetchModels();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>車系管理 (Models)</h2>
      <input
        value={makeId}
        onChange={(e) => setMakeId(e.target.value)}
        placeholder="品牌 ID"
      />
      <button onClick={fetchModels}>查詢</button>
      <br /><br />
      <input
        value={newModel}
        onChange={(e) => setNewModel(e.target.value)}
        placeholder="輸入車系名稱"
      />
      <button onClick={addModel}>新增</button>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>名稱</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>
                {editId === m.id ? (
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                ) : (
                  m.name
                )}
              </td>
              <td>
                {editId === m.id ? (
                  <>
                    <button onClick={saveEdit}>💾 儲存</button>
                    <button onClick={() => setEditId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(m)}>✏️ 編輯</button>
                    <button onClick={() => deleteModel(m.id)}>🗑️ 刪除</button>
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

export default ModelsPage;
