import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

export default function AdminCompatibility() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, MATCH, UNMATCHED

  useEffect(() => {
    loadCSV();
  }, []);

  function loadCSV() {
    setLoading(true);
    // 直接從靜態資源路徑讀取 CSV
    fetch('/media/compatibility_check.csv')
      .then(response => {
        if (!response.ok) throw new Error("File not found (404)");
        return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLoading(false);
          },
          error: (err) => {
            throw new Error("CSV Parse Error: " + err.message);
          }
        });
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }

  // 篩選資料
  const filteredData = data.filter(row => {
    if (filter === "ALL") return true;
    if (filter === "MATCH") return row['對應狀態'] === 'MATCH';
    if (filter === "UNMATCHED") return row['對應狀態'] === 'UNMATCHED';
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Compatibility Report</h1>
        <div className="flex gap-2">
           <a 
            href="/media/compatibility_check.csv" 
            download="compatibility_check.csv"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm flex items-center"
          >
            📥 Download CSV
          </a>
          <button 
            onClick={loadCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1 rounded text-sm ${filter==="ALL" ? "bg-gray-800 text-white" : "bg-white border text-gray-600"}`}
        >
          All ({data.length})
        </button>
        <button 
          onClick={() => setFilter("UNMATCHED")}
          className={`px-3 py-1 rounded text-sm ${filter==="UNMATCHED" ? "bg-red-600 text-white" : "bg-white border text-red-600"}`}
        >
          ❌ Unmatched ({data.filter(r => r['對應狀態'] === 'UNMATCHED').length})
        </button>
        <button 
          onClick={() => setFilter("MATCH")}
          className={`px-3 py-1 rounded text-sm ${filter==="MATCH" ? "bg-green-600 text-white" : "bg-white border text-green-600"}`}
        >
          ✅ Matched ({data.filter(r => r['對應狀態'] === 'MATCH').length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-4 border border-red-200">
          <strong>Error:</strong> {error}
          <p className="text-sm mt-1 text-red-600">Please check if <code>carparts-api/media/compatibility_check.csv</code> exists.</p>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white shadow rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Brand</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Filter Raw</th>
                <th className="p-3">DB Match</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 500).map((row, index) => {
                const isMatch = row['對應狀態'] === 'MATCH';
                return (
                  <tr key={index} className={`border-b hover:bg-gray-50 ${!isMatch ? 'bg-red-50' : ''}`}>
                    <td className="p-3">
                      {isMatch ? 
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">MATCH</span> : 
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">FAIL</span>
                      }
                    </td>
                    <td className="p-3 font-bold text-gray-700">{row['品牌']}</td>
                    <td className="p-3 font-mono text-blue-600">{row['料號']}</td>
                    <td className="p-3 text-gray-500 max-w-xs truncate" title={row['Filter_Raw']}>
                        {row['Filter_Raw'] || `${row['Filter_Makes']} ${row['Filter_Model']}`}
                    </td>
                    <td className="p-3">
                      {isMatch ? (
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                                {row['DB_Makes']} {row['DB_Model']}
                            </span>
                            <span className="text-xs text-gray-500">
                                {row['DB_Generation']} | {row['DB_Engine']} | {row['DB_Horsepower']}hp | {row['DB_Year']}
                            </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No Match</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No Data</td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredData.length > 500 && (
              <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t">
                  Showing first 500 rows only. Download CSV for full data.
              </div>
          )}
        </div>
      )}
    </div>
  );
}